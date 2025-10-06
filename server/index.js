import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());

// Simple health check
app.get('/ping', (_req, res) => res.json({ ok: true }));
// Status endpoint (shows whether keys are configured and which base is used)
app.get('/_status', (_req, res) => {
  const usingPro = Boolean(process.env.CG_PRO_API_KEY);
  const usingDemo = Boolean(process.env.CG_API_KEY);
  res.json({
    ok: true,
    base: usingPro ? 'https://pro-api.coingecko.com' : 'https://api.coingecko.com',
    apiKey: usingPro ? 'pro' : (usingDemo ? 'demo' : 'none'),
  });
});

// Basic in-memory cache and rate limiter to reduce 429s
const cache = new Map(); // key -> { ts, status, body, headers }
let lastFetchAt = 0;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const ttlFor = (url) => {
  if (/days=7/.test(url)) return 5 * 60 * 1000; // 5 minutes
  if (/days=1/.test(url) || /market_chart/.test(url)) return 60 * 1000; // 1 minute
  return 15 * 1000; // default
};

// Forward any CoinGecko v3 API path with caching/throttling
app.use('/api/v3', async (req, res) => {
  const cgBase = process.env.CG_PRO_API_KEY ? 'https://pro-api.coingecko.com' : 'https://api.coingecko.com';
  const target = `${cgBase}${req.originalUrl}`; // preserves /api/v3/...
  const key = target;
  const now = Date.now();

  // Serve fresh cache if valid
  const cached = cache.get(key);
  const ttl = ttlFor(target);
  if (cached && now - cached.ts < ttl) {
    res.status(cached.status);
    res.set('x-proxy-cache', 'HIT');
    res.set('cache-control', `public, max-age=${Math.floor(ttl / 1000)}`);
    try { res.json(cached.body); } catch { res.send(cached.body); }
    return;
  }

  // Simple rate limiting (1 request ~ per 1.2s)
  const since = now - lastFetchAt;
  if (since < 1200) await sleep(1200 - since);
  lastFetchAt = Date.now();

  const headers = { 'accept': 'application/json', 'user-agent': 'TokenDash/1.0 (+localhost)' };
  // Forward origin/referer if present (some API keys validate referer)
  const origin = req.headers['origin'] || undefined;
  const referer = req.headers['referer'] || undefined;
  if (origin) headers['origin'] = origin;
  if (referer) headers['referer'] = referer;
  // API key headers
  const demoKey = process.env.CG_API_KEY;
  const proKey = process.env.CG_PRO_API_KEY;
  if (demoKey) {
    headers['x-cg-demo-api-key'] = demoKey;
    // Compatibility header used by some gateways
    headers['x-cg-api-key'] = demoKey;
  }
  if (proKey) {
    headers['x-cg-pro-api-key'] = proKey;
    headers['x-cg-api-key'] = proKey;
  }

  const doFetch = async () => fetch(target, { headers });

  try {
    let upstream = await doFetch();
    // If rate limited, respect Retry-After once, else wait 2s and retry once
    if (upstream.status === 429) {
      const retryAfter = Number(upstream.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000);
      upstream = await doFetch();
    }

  const text = await upstream.text();
  const status = upstream.status;
  res.status(status);
  res.set('x-proxy-cache', 'MISS');
  res.set('cache-control', `public, max-age=${Math.floor(ttl / 1000)}`);

    // Try parse JSON for caching convenience
    let body = text;
    try { body = JSON.parse(text); } catch { /* keep text */ }

    // For 401/403, return a helpful message and do not cache
    if ((status === 401 || status === 403)) {
      const usingKey = Boolean(process.env.CG_API_KEY || process.env.CG_PRO_API_KEY);
      const msg = usingKey
        ? 'CoinGecko rejected the API key (401/403). Verify CG_API_KEY or CG_PRO_API_KEY.'
        : 'CoinGecko requires an API key (401/403). Add CG_API_KEY (demo) or CG_PRO_API_KEY in .env and restart the proxy.';
      try { res.json({ error: 'Unauthorized', message: msg, upstream: body }); } catch { res.send(text); }
      return;
    }

    // Cache only successful (2xx) responses
    if (status >= 200 && status < 300) {
      cache.set(key, { ts: Date.now(), status: upstream.status, body });
    }

    try { res.json(body); } catch { res.send(text); }
  } catch (e) {
    // On failure, serve stale cache if available
    const stale = cache.get(key);
    if (stale) {
      res.status(stale.status);
      res.set('x-proxy-cache', 'STALE');
      res.set('cache-control', `public, max-age=${Math.floor(ttl / 1000)}`);
      try { res.json(stale.body); } catch { res.send(stale.body); }
      return;
    }
    res.status(502).json({ error: 'Bad Gateway', message: e?.message || String(e) });
  }
});

const port = Number(process.env.PORT) || 5000;
const server = app.listen(port, () => {
  console.log(`Proxy running at http://localhost:${port}`);
});
server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Set PORT in .env (e.g., PORT=5001) and rerun: npm run proxy`);
  } else {
    console.error('Proxy failed to start:', err?.message || err);
  }
  process.exit(1);
});
