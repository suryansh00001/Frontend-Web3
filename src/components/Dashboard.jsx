import React, { useEffect, useRef, useState } from 'react';
import TokenCard from './TokenCard';
import PriceChart from './PriceChart';
import { useWallet } from '../contexts/WalletContext';
import useChainlinkPrice from '../hooks/useChainlinkPrice';
import useCoinGeckoPrice from '../hooks/useCoinGeckoPrice';
import Tilt from 'react-parallax-tilt';

// Tokens backed by Chainlink feeds on Ethereum Mainnet
const TOKENS = [
  { name: 'ETH', symbol: 'ETH' },
  { name: 'BTC', symbol: 'BTC' },
  { name: 'LINK', symbol: 'LINK' },
];
// Live sampling cadence for building the on-screen history
const UPDATE_INTERVAL = 10000; // 10 seconds to match live refetch cadence

const Dashboard = () => {
  const { account, isConnected, shortenAddress } = useWallet();
  
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selected, setSelected] = useState('ETH');
  const [range, setRange] = useState('Live'); // 'Live' | '7D' | '30D'
  const [histories, setHistories] = useState({ ETH: [], BTC: [], LINK: [] });
  const latestPricesRef = useRef({ ETH: 0, BTC: 0, LINK: 0 });
  const latestCgPricesRef = useRef({ ETH: 0, BTC: 0, LINK: 0 });

  // Use mainnet Chainlink via Infura/MetaMask
  const eth = useChainlinkPrice('ETH', { intervalMs: UPDATE_INTERVAL, fallbackToApi: false });
  const btc = useChainlinkPrice('BTC', { intervalMs: UPDATE_INTERVAL, fallbackToApi: false });
  const link = useChainlinkPrice('LINK', { intervalMs: UPDATE_INTERVAL, fallbackToApi: false });

  // CoinGecko unified hooks per token (live + 24H + 7D)
  const cgEth = useCoinGeckoPrice('ethereum', { liveIntervalMs: 10000, autoFetchHistory: false });
  const cgBtc = useCoinGeckoPrice('bitcoin', { liveIntervalMs: 10000, autoFetchHistory: false });
  const cgLink = useCoinGeckoPrice('chainlink', { liveIntervalMs: 10000, autoFetchHistory: false });

  // Keep latest prices in a ref so our sampling interval always sees fresh values
  useEffect(() => {
    latestPricesRef.current = {
      ETH: typeof eth.price === 'number' ? eth.price : latestPricesRef.current.ETH,
      BTC: typeof btc.price === 'number' ? btc.price : latestPricesRef.current.BTC,
      LINK: typeof link.price === 'number' ? link.price : latestPricesRef.current.LINK,
    };
  }, [eth.price, btc.price, link.price]);

  useEffect(() => {
    latestCgPricesRef.current = {
      ETH: typeof cgEth.livePrice === 'number' ? cgEth.livePrice : latestCgPricesRef.current.ETH,
      BTC: typeof cgBtc.livePrice === 'number' ? cgBtc.livePrice : latestCgPricesRef.current.BTC,
      LINK: typeof cgLink.livePrice === 'number' ? cgLink.livePrice : latestCgPricesRef.current.LINK,
    };
  }, [cgEth.livePrice, cgBtc.livePrice, cgLink.livePrice]);

  // Sample prices at a fixed cadence to build chart history, regardless of feed updatedAt changes
  useEffect(() => {
    const sample = () => {
      const nowLabel = new Date().toLocaleTimeString();
      setHistories(prev => {
        const next = { ...prev };
        Object.keys(latestPricesRef.current).forEach(sym => {
          const pCl = latestPricesRef.current[sym];
          const pCg = latestCgPricesRef.current[sym];
          const hasCl = Number.isFinite(pCl) && pCl > 0;
          const hasCg = Number.isFinite(pCg) && pCg > 0;
          if (hasCl || hasCg) {
            const point = { time: nowLabel };
            if (hasCl) point.chainlink = pCl;
            if (hasCg) point.coingecko = pCg;
            next[sym] = [...(next[sym] || []), point].slice(-50);
          }
        });
        return next;
      });
      setLastUpdate(new Date());
    };

    // Take an immediate sample on mount, then at interval
    sample();
    const id = setInterval(sample, UPDATE_INTERVAL);
    return () => clearInterval(id);
  }, []);
  const rows = [
    { name: 'ETH', symbol: 'ETH', data: eth },
    { name: 'BTC', symbol: 'BTC', data: btc },
    { name: 'LINK', symbol: 'LINK', data: link },
  ];

  // Map for selecting the correct CG hook by token
  const cgBySymbol = { ETH: cgEth, BTC: cgBtc, LINK: cgLink };
  const selectedCg = cgBySymbol[selected] || {};

  // When switching tokens or ranges, fetch on demand if data missing
  useEffect(() => {
    const cg = cgBySymbol[selected];
    if (!cg) return;
    if (range === '7D' && (!cg.prices7d || cg.prices7d.length === 0) && !cg.loading) {
      cg.load7d?.();
    } else if (range === '30D' && (!cg.prices30d || cg.prices30d.length === 0) && !cg.loading) {
      cg.load30d?.();
    }
  }, [selected, range]);

  // Choose chart dataset based on selected range
  const chartData = (() => {
    if (range === 'Live') return histories[selected] || [];
    if (range === '7D') {
      const s = selected === 'ETH' ? cgEth.prices7d : selected === 'BTC' ? cgBtc.prices7d : cgLink.prices7d;
      return (s || []).map(d => ({ time: d.time, coingecko: Number(d.value) }));
    }
    if (range === '30D') {
      const s = selected === 'ETH' ? cgEth.prices30d : selected === 'BTC' ? cgBtc.prices30d : cgLink.prices30d;
      return (s || []).map(d => ({ time: d.time, coingecko: Number(d.value) }));
    }
    return [];
  })();



  return (
  <div className="min-h-screen p-4 md:p-6 lg:p-8 text-gray-100">

  {/* Header */}
  <div className="card flex flex-col items-center justify-center text-center mb-8 px-6 py-6">
    <h1 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">
      Real-Time Token Dashboard
    </h1>
    <p className="text-gray-300">
      Chainlink Oracles (Mainnet via Infura/MetaMask) + CoinGecko API (Integrated)
    </p>
    <p className="text-gray-300">
      Updates every {UPDATE_INTERVAL / 1000}s • Click any token to view its chart
    </p>
    {lastUpdate && (
      <p className="text-xs text-gray-400 mt-1">
        Last updated: {lastUpdate.toLocaleTimeString()}
      </p>
    )}
  </div>

<div className="flex justify-center">
  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-5 md:gap-6 mb-8">
    {rows.map(({ name, symbol, data }) => (
      <Tilt
        key={name}
        tiltMaxAngleX={10}
        tiltMaxAngleY={10}
        scale={1.05}
        transitionSpeed={400}
        className="w-full"
      >
        <div
        onClick={() => setSelected(name)}
        className={`transform transition-all duration-300 cursor-pointer group rounded-xl overflow-hidden
            ${selected === name
            ? "shadow-[0_0_24px_8px_rgba(59,130,246,0.45)] backdrop-blur-lg"
            : "hover:shadow-md hover:shadow-gray-700"
            }`}
        >

          {/* Token Card */}
          <TokenCard
            name={name}
            symbol={symbol}
            price={data.price || 0}
            change={0}
            isLoading={data.loading}
            refreshing={data.refreshing}
            className="bg-gray-800 text-gray-100 border-gray-700 rounded-lg"
          />

          {/* Error Message */}
          {data.error && (
            <div className="mt-2 text-xs flex items-center gap-2 text-amber-300 bg-amber-900/30 border border-amber-700 rounded-lg p-2 animate-fadeIn">
              <span>{data.error}</span>
            </div>
          )}
        </div>
      </Tilt>
    ))}
  </div>
</div>


  {/* Range Selector */}
  <div className="flex justify-center items-center gap-2 mb-4 flex-wrap">
    <span className="text-sm text-gray-300">Range:</span>
    {['Live','7D','30D'].map(r => (
      <button
        key={r}
        onClick={async () => {
          setRange(r);
          const cg = cgBySymbol[selected];
          if (r === '7D') await cg?.load7d?.();
          if (r === '30D') await cg?.load30d?.();
        }}
        className={`btn text-sm ${range === r ? 'btn-primary' : 'btn-muted'}`}
      >
        {r}
      </button>
    ))}
    {range !== 'Live' && selectedCg.loading && (
      <span className="text-xs text-gray-400 ml-2">Loading {range}…</span>
    )}
    {range !== 'Live' && selectedCg.error && (
      <span className="text-xs text-red-400 ml-2">{selectedCg.error}</span>
    )}
  </div>

  {/* Price Chart Section */}
  <div className="max-w-full">
    {range !== 'Live' && selectedCg.loading ? (
      <div className="card p-6 text-sm text-gray-300">
        Loading {range} data for {selected}…
      </div>
    ) : range !== 'Live' && selectedCg.error && (!chartData || chartData.length === 0) ? (
      <div className="card p-6 border border-red-700 text-sm text-red-400">
        Failed to load {range} data: {selectedCg.error}
      </div>
    ) : (
      <PriceChart
        data={chartData}
        token={selected}
        showChainlink={range === 'Live'}
      />
    )}
  </div>
</div>

  );
};

export default Dashboard;
