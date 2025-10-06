# TokenDash – Real‑Time Web3 Price Dashboard (React + Vite)

Premium, dark‑themed crypto dashboard built with React, Vite, Tailwind, Recharts, ethers v6, Web3Modal, and Firebase Auth. It fetches live prices from decentralized oracles (Chainlink) with CoinGecko integration for live fallback and historical ranges.

Demo video
- Local file: ./demo-video.mp4

## ✨ Features

- Real‑time token prices (ETH, BTC, LINK) from Chainlink (Mainnet) with CoinGecko for live fallback and historical ranges
- Interactive charts (Recharts): Live sampling + 7D + 30D
- Auto‑refresh every 10s, with smooth, flicker‑free updates (skeleton only on first load)
- Wallet connect modal (MetaMask, WalletConnect, Coinbase) with network switch and balance display
- Authentication (optional, extra): Google, Twitter, and Email/Password via Firebase; protected routes; logout
- Responsive, sleek dark UI with subtle micro‑interactions (tilt, shadows, focus rings)

Oracles used: Yes (Chainlink AggregatorV3 price feeds on Ethereum Mainnet)
Additional logins used: Yes (Google, Twitter, Email via Firebase Auth)

## 🖼️ Screens and flows

- Login: Glassy dark auth card with Google/Twitter/email sign‑in, then redirect to the dashboard
- Dashboard: Three cards (ETH, BTC, LINK) + range selector (Live/7D/30D) + price chart for selected token
- Navbar: Wallet connect button (network switch + address + balance) and logout when authenticated

## 🧩 Architecture

- UI: React + Vite + TailwindCSS
- State/Context: Lightweight React state plus contexts for Auth and Wallet
- Data:
	- Chainlink via ethers v6 (BrowserProvider preferred if MetaMask on Mainnet; otherwise RPC)
	- CoinGecko for live fallback + 7D/30D market charts (24H hourly is Enterprise-only per API policy)
- Wallet: Web3Modal (@web3modal/ethers) using web components (<w3m-button> and <w3m-network-button>)
- Charts: Recharts (dark‑theme axes, legend, tooltip)
- Auth: Firebase Auth (Google, Twitter, Email/Password)

## ⚙️ Environment

Create a `.env` in the project root. The most important variables:

- RPC / Oracles
	- VITE_INFURA_PROJECT_ID=your_infura_project_id
	- Optional alternative: VITE_MAINNET_RPC_URL=https://mainnet.infura.io/v3/<id>
	- Optional network select: VITE_CHAIN_NETWORK=mainnet (or sepolia)
	- Optional Sepolia: VITE_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<id>
	- Feed overrides (for extra tokens or non‑mainnet):
		- VITE_FEED_<SYMBOL>_ADDRESS=0xAggregator
		- VITE_FEED_<SYMBOL>_DECIMALS=8

- WalletConnect / Web3Modal
	- VITE_W3M_PROJECT_ID=your_project_id

- Firebase Auth
	- VITE_FIREBASE_API_KEY=...
	- VITE_FIREBASE_AUTH_DOMAIN=...
	- VITE_FIREBASE_PROJECT_ID=...
	- VITE_FIREBASE_STORAGE_BUCKET=...
	- VITE_FIREBASE_MESSAGING_SENDER_ID=...
	- VITE_FIREBASE_APP_ID=...
	- VITE_FIREBASE_MEASUREMENT_ID=...
	- Optional toggles: VITE_AUTH_TWITTER_ENABLED=1, VITE_AUTH_GOOGLE_ENABLED=1

Notes:
- Use only one of VITE_INFURA_PROJECT_ID or VITE_MAINNET_RPC_URL.
- After editing `.env`, restart the dev server.
- `.env` is ignored by git; share a sanitized `.env.example` if needed.

## 🚀 Run locally

1) Install deps
```
npm install
```

2) (Optional) Start local CoinGecko proxy to avoid CORS/rate limits during development
```
npm run proxy
```
Check status:
 - http://localhost:5000/ping
 - http://localhost:5000/_status (shows if API key is detected and which base URL is used)

3) Start dev server
```
npm run dev
```

Open the printed localhost URL.

## 🧪 How it works

- Real‑time updates: samples every 10s. On first load, cards show a skeleton; subsequent polls keep the last price visible to prevent flicker.
- Chainlink mainnet feeds embedded for ETH/BTC/LINK. For other tokens or non‑mainnet, set env overrides.
- Historical ranges (7D/30D) fetched from CoinGecko; Live uses in‑memory sampling of Chainlink/CoinGecko.
- Wallet connect provided by Web3Modal web components with balance and network switching.
- Auth wraps the app with protected routes; logout in the Navbar.

## ✅ Expectations mapping

- Real‑Time Price Data: Implemented with Chainlink (oracle) + auto refresh every 10s
- Charts: Implemented with Recharts (Live/7D/30D) and dark tooltips/legend
- 3–5 Tokens: 3 tokens (ETH, BTC, LINK) included by default; easy to extend via env
- Compare Options: Cards provide at‑a‑glance comparison; select a token to view its chart; extending to a dual‑axis compare chart is straightforward
- Connect Wallet: MetaMask supported; bonus WalletConnect/Coinbase via Web3Modal with balance
- Login Options: Google, Twitter (toggle), Email/Password (Firebase)
- Responsive Design: Tailwind dark UI, mobile‑friendly layout

## 🔧 Troubleshooting

- Provider/network errors: Ensure VITE_INFURA_PROJECT_ID or VITE_MAINNET_RPC_URL is set, and MetaMask (if used) is on Mainnet.
- Google sign‑in not configured: Enable Google in Firebase Authentication and add your dev origin to Authorized domains.
- Edge/Privacy extensions blocking RPC: Some browsers/extensions block third‑party RPC POSTs; ensure your privacy settings/extensions allow Infura.
- CoinGecko API:
	- 401/403 unauthorized: Add CG_API_KEY (demo) or CG_PRO_API_KEY in `.env` and restart `npm run proxy`.
	- Hourly interval is Enterprise-only. Use 7D/30D (daily) or upgrade your plan.
	- Port in use: set PORT in `.env` (e.g., `PORT=5001`) and update `VITE_CG_BASE` accordingly.

## 📁 Repository structure

```
Frontend-Web3/
├─ public/                     # Static assets
├─ server/                     # Express proxy for CoinGecko
│  └─ index.js
├─ src/
│  ├─ components/              # UI components (Navbar, Dashboard, PriceChart, TokenCard, Wallet)
│  ├─ contexts/                # Auth and Wallet contexts
│  ├─ hooks/                   # Data hooks (Chainlink, CoinGecko)
│  ├─ pages/                   # Auth and route pages
│  ├─ assets/                  # Images/icons if any
│  ├─ firebase.js              # Firebase initialization
│  ├─ main.jsx, App.jsx        # App entry
│  └─ index.css/App.css        # Styles
├─ demo-video.mp4              # Local demo video placeholder
├─ .env                        # Local environment (not committed)
├─ package.json                # Scripts and dependencies
├─ tailwind.config.js          # Tailwind setup
├─ vite.config.js              # Vite config
└─ README.md
```

## 🧰 Scripts

- Development: `npm run dev`
- Proxy server: `npm run proxy`
- Build: `npm run build`
- Preview build: `npm run preview`
- Lint: `npm run lint`

## 📜 License

MIT 
