import React, { useEffect, useRef, useState } from 'react';
import WalletConnectButton from './WalletConnectButton';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  return (
    <nav className="bg-black/30 backdrop-blur-xl px-4 sm:px-6 py-3 text-white shadow-soft border-b border-white/10 sticky top-0 z-40" ref={menuRef}>
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3 select-none">
          <img
            src="https://cdn-icons-png.flaticon.com/512/5106/5106070.png"
            alt="Logo"
            className="h-8 w-8 drop-shadow"
          />
          <span className="text-xl font-bold tracking-tight text-gray-100">TokenDash</span>
        </div>

        {/* Desktop actions */}
        <div className="hidden sm:flex items-center gap-3">
          {user && (
            <button
              onClick={logout}
              className="btn btn-muted text-sm"
            >
              Logout
            </button>
          )}
          <WalletConnectButton />
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="sm:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-300 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-controls="mobile-menu"
          aria-expanded={open ? 'true' : 'false'}
          onClick={() => setOpen((v) => !v)}
        >
          <svg className={`h-6 w-6 transition-transform ${open ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {open ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      <div
        id="mobile-menu"
        className={`sm:hidden origin-top overflow-hidden transition-[max-height,opacity] duration-300 ${open ? 'max-h-48 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}
        aria-hidden={!open}
      >
        <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-3 space-y-2">
          <WalletConnectButton className="w-full" />
          {user && (
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="w-full btn btn-muted text-sm"
            >
              Logout
            </button>
          )}
        </div>
      </div>
      
    </nav>
  );
};

export default Navbar;
