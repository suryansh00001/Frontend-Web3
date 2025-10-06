import React from 'react';
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers';

const NETWORKS = {
  1: { name: 'Ethereum', hex: '0x1' },
  11155111: { name: 'Sepolia', hex: '0xaa36a7' }
};

function shorten(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// Initialize Web3Modal at module load so hooks have context
const W3M_READY = (() => {
  try {
    if (typeof window === 'undefined') return false;
    if (window.__W3M_INITIALIZED) return true;
    const projectId = import.meta.env.VITE_W3M_PROJECT_ID;
    if (!projectId) return false;
    const chains = [
      { chainId: 1, name: 'Ethereum', currency: 'ETH', explorerUrl: 'https://etherscan.io', rpcUrl: 'https://rpc.ankr.com/eth' },
      { chainId: 11155111, name: 'Sepolia', currency: 'ETH', explorerUrl: 'https://sepolia.etherscan.io', rpcUrl: 'https://rpc.sepolia.org' }
    ];
    const metadata = {
      name: 'TokenDash',
      description: 'Crypto dashboard with Chainlink & CoinGecko',
      url: window.location?.origin || 'http://localhost:5173',
      icons: ['https://www.svgrepo.com/show/362102/ethereum.svg']
    };
    const ethersConfig = defaultConfig({
      metadata,
      enableInjected: true,
      enableEIP6963: true,
      enableCoinbase: true,
      defaultChainId: 1,
      rpcUrl: 'https://rpc.ankr.com/eth'
    });
    createWeb3Modal({ ethersConfig, chains, projectId, themeMode: 'dark' });
    window.__W3M_INITIALIZED = true;
    return true;
  } catch (e) {
    return Boolean(typeof window !== 'undefined' && window.__W3M_INITIALIZED);
  }
})();


export default function WalletConnectButton() {
//my old button... (without w3m)
  if (!W3M_READY) {
    const hasMM = typeof window !== 'undefined' && window.ethereum && (window.ethereum.isMetaMask || (Array.isArray(window.ethereum.providers) && window.ethereum.providers.some(p => p.isMetaMask)));
    return (
      <button
        type="button"
        className="relative inline-flex items-center px-4 py-2 rounded-full font-semibold text-white bg-gradient-to-r from-indigo-700 via-blue-500 to-teal-400 hover:from-indigo-600 hover:via-blue-400 hover:to-teal-300 transition-all duration-200 shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
        onClick={() => {
          if (hasMM) {
            window.ethereum?.request?.({ method: 'eth_requestAccounts' });
          } else {
            window.open('https://metamask.io/', '_blank');
          }
        }}
        title={hasMM ? 'Connect with MetaMask' : 'Install MetaMask'}
      >
        Connect Wallet
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      {/* Network switch and connect button provided by Web3Modal */}
      <w3m-network-button></w3m-network-button>
      <w3m-button balance="show"></w3m-button>
    </div>
  );
}
