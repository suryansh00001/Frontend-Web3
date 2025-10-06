import { useEffect, useMemo, useRef, useState } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';

// Minimal Chainlink AggregatorV3 ABI
const AGGREGATOR_V3_INTERFACE_ABI = [
  { inputs: [], name: 'decimals', outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'description', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

const MAINNET_FEEDS = {
  // Confirmed from Chainlink Docs: https://docs.chain.link/data-feeds/price-feeds/addresses
  ETH: { address: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', decimals: 8, description: 'ETH / USD' },
  BTC: { address: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c', decimals: 8, description: 'BTC / USD' },
  LINK: { address: '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c', decimals: 8, description: 'LINK / USD' }
};

// Optional: mapping for CoinGecko fallback
const COINGECKO_IDS = {
  ETH: 'ethereum',
  BTC: 'bitcoin',
  LINK: 'chainlink',
  MATIC: 'matic-network',
  USDT: 'tether',
};

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * useChainlinkPrice
 * Fetches the latest USD price for a token from Chainlink on Ethereum Mainnet using Infura (or MetaMask as a fallback).
 * If the feed isn't configured, can optionally fallback to CoinGecko.
 *
 * @param {string} token - Token symbol (e.g., 'ETH', 'BTC', 'LINK', 'MATIC')
 * @param {object} options
 *  - intervalMs?: number (default 20000)
 *  - fallbackToApi?: boolean (default true)
 *  - mainnetRpcUrl?: string (override RPC URL; otherwise uses env)
 *  - infuraProjectId?: string (if provided, constructs https://mainnet.infura.io/v3/<id>)
 *
 * @returns {{ price: number|null, updatedAt: Date|null, isStale: boolean, loading: boolean, error: string|null, source: 'chainlink'|'coingecko'|null, refetch: () => Promise<void> }}
 */
export function useChainlinkPrice(token, options = {}) {
  const upper = (token || '').toUpperCase();
  const {
    intervalMs = 20000,
    fallbackToApi = true,
    mainnetRpcUrl,
    infuraProjectId
  } = options;

  const [price, setPrice] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const timerRef = useRef(null);
  const providerRef = useRef(null);
  const decimalsCacheRef = useRef({});
  const lastPriceRef = useRef(null);

  const rpcUrl = useMemo(() => {
    if (mainnetRpcUrl) return mainnetRpcUrl;
    const viteUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_MAINNET_RPC_URL) || '';
    if (viteUrl) return viteUrl;
    const viteInfuraId = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_INFURA_PROJECT_ID) || '';
    if (infuraProjectId) return `https://mainnet.infura.io/v3/${infuraProjectId}`;
    if (viteInfuraId) return `https://mainnet.infura.io/v3/${viteInfuraId}`;
    return '';
  }, [mainnetRpcUrl, infuraProjectId]);

  const getProvider = async () => {
    if (providerRef.current) return providerRef.current;
    // Prefer MetaMask on mainnet if available
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const net = await browserProvider.getNetwork();
        if (net && net.chainId === 1n) {
          providerRef.current = browserProvider;
          return providerRef.current;
        }
      } catch (_) { /* ignore */ }
    }
    // Fallback to RPC URL (Infura or custom)
    providerRef.current = rpcUrl ? new ethers.JsonRpcProvider(rpcUrl) : null;
    return providerRef.current;
  };

  // Resolve a feed for a token. First use built-in mapping; then env overrides.
  const getFeedForToken = () => {
    const builtIn = MAINNET_FEEDS[upper];
    if (builtIn) return builtIn;
    // Support env-based dynamic feeds: VITE_FEED_<TOKEN>_ADDRESS and VITE_FEED_<TOKEN>_DECIMALS
    const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
    const addr = env[`VITE_FEED_${upper}_ADDRESS`];
    const dec = env[`VITE_FEED_${upper}_DECIMALS`];
    if (addr && dec) {
      const decimalsNum = Number(dec);
      if (!Number.isNaN(decimalsNum) && decimalsNum >= 0) {
        return { address: addr, decimals: decimalsNum, description: `${upper} / USD` };
      }
    }
    return null;
  };

  const fetchFromChainlink = async (prov) => {
    const feed = getFeedForToken();
    if (!feed) return null;
    const contract = new ethers.Contract(feed.address, AGGREGATOR_V3_INTERFACE_ABI, prov);
    let decimals = decimalsCacheRef.current[feed.address];
    if (decimals === undefined) {
      decimals = await contract.decimals();
      decimalsCacheRef.current[feed.address] = decimals;
    }
    const round = await contract.latestRoundData();
    const priceNum = parseFloat(ethers.formatUnits(round.answer, decimals));
    const tsMs = Number(round.updatedAt) * 1000;
    const updated = new Date(tsMs);
    const stale = (Date.now() - tsMs) > ONE_HOUR_MS;
    return { price: priceNum, updatedAt: updated, isStale: stale };
  };

  const fetchFromCoinGecko = async () => {
    const id = COINGECKO_IDS[upper];
    if (!id) return null;
    try {
      const resp = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
        { timeout: 10000 }
      );
      const p = resp?.data?.[id]?.usd;
      if (typeof p !== 'number') return null;
      return { price: p, updatedAt: new Date(), isStale: false };
    } catch (e) {
      return null;
    }
  };

  const load = async () => {
    if (!upper) return;
  const hasInitial = lastPriceRef.current !== null;
  if (!hasInitial) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const provider = await getProvider();
      if (provider) {
        try {
          const cl = await fetchFromChainlink(provider);
          if (cl) {
            if (lastPriceRef.current !== cl.price) setPrice(cl.price);
            setUpdatedAt(cl.updatedAt);
            setIsStale(cl.isStale);
            setSource('chainlink');
            lastPriceRef.current = cl.price;
            return;
          }
        } catch (e) {
          // fall through to API if enabled
        }
      }

      if (fallbackToApi) {
        const api = await fetchFromCoinGecko();
        if (api) {
          if (lastPriceRef.current !== api.price) setPrice(api.price);
          setUpdatedAt(api.updatedAt);
          setIsStale(api.isStale);
          setSource('coingecko');
          lastPriceRef.current = api.price;
          return;
        }
      }

      throw new Error('No price source available (provider not ready, feed missing, or fallback disabled).');
    } catch (e) {
      setError(e?.message || String(e));
      // Preserve previous price on refresh errors; only clear on first-load failures
      if (lastPriceRef.current === null) {
        setPrice(null);
        setUpdatedAt(null);
        setIsStale(false);
        setSource(null);
      }
    } finally {
      if (!hasInitial) setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial + polling
  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await load(); })();
    if (intervalMs > 0) {
      timerRef.current = setInterval(load, intervalMs);
    }
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upper, rpcUrl, intervalMs]);

  return { price, updatedAt, isStale, loading, refreshing, error, source, refetch: load };
}

export default useChainlinkPrice;
