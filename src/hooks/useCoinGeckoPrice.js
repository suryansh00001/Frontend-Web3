import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

/**
 * useCoinGeckoPrice(tokenId)
 * - tokenId: 'ethereum' | 'matic-network' | 'bitcoin' | 'tether' | 'chainlink' | ...
 * - Returns { livePrice, prices24h, prices7d, loading, error }
 * - Live price updates every 10s
 */
export default function useCoinGeckoPrice(tokenId, options = {}) {
  const id = (tokenId || '').trim();
  const { liveIntervalMs = 10000, autoFetchHistory = false } = options;
  const API_BASE =  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_CG_BASE) || 'https://api.coingecko.com';

  const [livePrice, setLivePrice] = useState(null);
  const [prices24h, setPrices24h] = useState([]);
  const [prices7d, setPrices7d] = useState([]);
  const [prices30d, setPrices30d] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  const abortRef = useRef({ live: null, h24: null, h7: null });

  const extractError = (e, fallbackPrefix) => {
    // Prefer proxy-provided helpful message
    const status = e?.response?.status;
    const dataMsg = e?.response?.data?.message || e?.response?.data?.error_description || e?.response?.data?.error;
    if (status === 401 || status === 403) {
      return dataMsg || `${fallbackPrefix || 'Request'} unauthorized (401/403). Add CG_API_KEY or CG_PRO_API_KEY in .env and restart the proxy.`;
    }
    if (dataMsg) return `${fallbackPrefix ? `${fallbackPrefix}: ` : ''}${dataMsg}`;
    if (status) return `${fallbackPrefix ? `${fallbackPrefix} ` : ''}failed (${status})`;
    return e?.message || String(e);
  };

  const mapHistory = (prices, is7d) => {
    return (prices || []).map(([ms, value]) => {
      const d = new Date(ms);
      const time = is7d
        ? d.toLocaleDateString()
        : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return { time, value };
    });
  };

  const fetchLive = async () => {
    if (!id) return;
    try {
      abortRef.current.live?.abort?.();
      const controller = new AbortController();
      abortRef.current.live = controller;
      const resp = await axios.get(
        `${API_BASE}/api/v3/simple/price`,
        { params: { ids: id, vs_currencies: 'usd' }, signal: controller.signal, timeout: 10000 }
      );
      const p = resp?.data?.[id]?.usd;
      if (typeof p === 'number') setLivePrice(p);
    } catch (e) {
      setError(prev => prev || extractError(e, 'Live price'));
    }
  };

  const fetchHistories = async () => {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      abortRef.current.h24?.abort?.();
      abortRef.current.h7?.abort?.();
      const c24 = new AbortController();
      const c7 = new AbortController();
      abortRef.current.h24 = c24;
      abortRef.current.h7 = c7;

      const makeUrl = (days, interval) => `${API_BASE}/api/v3/coins/${encodeURIComponent(id)}/market_chart`;
      const params24 = { vs_currency: 'usd', days: 1, interval: 'hourly' };
      const params7 = { vs_currency: 'usd', days: 7, interval: 'daily' };

      const req24 = () => axios.get(makeUrl(1, 'hourly'), { params: params24, signal: c24.signal, timeout: 15000 });
      const req7 = () => axios.get(makeUrl(7, 'daily'), { params: params7, signal: c7.signal, timeout: 15000 });

      let [r24, r7] = await Promise.all([req24().catch(e => e), req7().catch(e => e)]);
      // simple retry once on 429
      if (r24 instanceof Error && r24?.response?.status === 429) {
        await new Promise(r => setTimeout(r, 1500));
        r24 = await req24();
      }
      if (r7 instanceof Error && r7?.response?.status === 429) {
        await new Promise(r => setTimeout(r, 1500));
        r7 = await req7();
      }
  if (r24 instanceof Error) throw r24;
  if (r7 instanceof Error) throw r7;

      setPrices24h(mapHistory(r24?.data?.prices || [], false));
      setPrices7d(mapHistory(r7?.data?.prices || [], true));
    } catch (e) {
      setError(extractError(e, 'History'));
      setPrices24h([]);
      setPrices7d([]);
    } finally {
      setLoading(false);
    }
  };

  // Patient on-demand fetch with retry helpers
  const fetchWithRetry = async (days, tries = 2, delayMs = 2000) => {
    const controller = new AbortController();
    const url = `${API_BASE}/api/v3/coins/${encodeURIComponent(id)}/market_chart`;
    const params = { vs_currency: 'usd', days, interval: days === 7 ? 'daily' : 'hourly' };
    let lastErr = null;
    for (let attempt = 0; attempt < Math.max(1, tries); attempt++) {
      try {
        const resp = await axios.get(url, { params, signal: controller.signal, timeout: 15000 });
        return resp?.data?.prices || [];
      } catch (e) {
        // For 401/403, do not keep retrying; surface immediately
        if (e?.response?.status === 401 || e?.response?.status === 403) {
          throw new Error(extractError(e, `Fetch ${days === 7 ? '7D' : '24H'}`));
        }
        lastErr = e;
        if (attempt < Math.max(1, tries) - 1) await new Promise(r => setTimeout(r, delayMs));
      }
    }
    throw lastErr || new Error('Failed to fetch history');
  };

  // More flexible fetcher that allows interval override and omitting it entirely
  const fetchFlexible = async ({ days, interval, tries = 2, delayMs = 1500 }) => {
    const controller = new AbortController();
    const url = `${API_BASE}/api/v3/coins/${encodeURIComponent(id)}/market_chart`;
    const params = { vs_currency: 'usd', days };
    if (interval) params.interval = interval; // omit interval by default
    let lastErr = null;
    for (let attempt = 0; attempt < Math.max(1, tries); attempt++) {
      try {
        const resp = await axios.get(url, { params, signal: controller.signal, timeout: 15000 });
        const arr = resp?.data?.prices || [];
        return arr;
      } catch (e) {
        // Fail fast on explicit auth errors
        if (e?.response?.status === 401 || e?.response?.status === 403) {
          throw e;
        }
        lastErr = e;
        if (attempt < Math.max(1, tries) - 1) await new Promise(r => setTimeout(r, delayMs));
      }
    }
    if (lastErr) throw lastErr;
    return [];
  };

  const load24h = async () => {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      // Strategy: try without interval first (some keys restrict hourly), then daily, then 2-day daily as coarse fallback
      let prices = [];
      try {
        prices = await fetchFlexible({ days: 1 }); // no interval
      } catch (e1) {
        if (e1?.response?.status === 401 || e1?.response?.status === 403) {
          // try daily interval explicitly
          try {
            prices = await fetchFlexible({ days: 1, interval: 'daily' });
          } catch (e2) {
            // last resort: 2-day daily to approximate a 24h trend with 2 points
            prices = await fetchFlexible({ days: 2, interval: 'daily' });
          }
        } else {
          // network/other: try once more without interval
          prices = await fetchFlexible({ days: 1 });
        }
      }

      // If we still have too few points, attempt daily fallback
      if (!Array.isArray(prices) || prices.length < 3) {
        try {
          const daily = await fetchFlexible({ days: 1, interval: 'daily' });
          if (daily?.length) prices = daily;
        } catch {
          // ignore, keep whatever we have
        }
      }
      setPrices24h(mapHistory(prices, false));
      if (prices.length < 3) {
        // eslint-disable-next-line no-console
        console.warn('24H data fell back to coarse daily approximation (limited by API plan).');
      }
    } catch (e) {
      setError(extractError(e, '24H fetch'));
      setPrices24h([]);
    } finally {
      setLoading(false);
    }
  };

  const load7d = async () => {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      const prices = await fetchWithRetry(7, 2, 2000);
      setPrices7d(mapHistory(prices, true));
    } catch (e) {
      setError(extractError(e, '7D fetch'));
      setPrices7d([]);
    } finally {
      setLoading(false);
    }
  };

  const load30d = async () => {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      // For 30D, daily interval is fine (hourly is restricted)
      const controller = new AbortController();
      const url = `${API_BASE}/api/v3/coins/${encodeURIComponent(id)}/market_chart`;
      const resp = await axios.get(url, {
        params: { vs_currency: 'usd', days: 30, interval: 'daily' },
        signal: controller.signal,
        timeout: 20000,
      });
      const prices = resp?.data?.prices || [];
      setPrices30d(mapHistory(prices, true));
    } catch (e) {
      setError(extractError(e, '30D fetch'));
      setPrices30d([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLivePrice(null); setPrices24h([]); setPrices7d([]); setPrices30d([]); setError(null);
    if (autoFetchHistory) fetchHistories();
    fetchLive();
    return () => {
      abortRef.current.live?.abort?.();
      abortRef.current.h24?.abort?.();
      abortRef.current.h7?.abort?.();
    };
  }, [id]);

  useEffect(() => {
    const ms = Math.max(liveIntervalMs, 10000);
    if (!id || ms <= 0) return;
    timerRef.current = setInterval(fetchLive, ms);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [id, liveIntervalMs]);

  return { livePrice, prices24h, prices7d, prices30d, loading, error, load24h, load7d, load30d };
}
