import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { loginWithGoogle, loginWithTwitter, loginWithEmail, signupWithEmail } = useAuth();
  const ENABLE_TWITTER = (import.meta.env.VITE_AUTH_TWITTER_ENABLED ?? '0') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const navigate = useNavigate();

  async function handleEmailAuth(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === 'login') await loginWithEmail(email, password);
      else await signupWithEmail(email, password);
      navigate('/');
    } catch (error) {
      setErr(error.message || 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleSocialAuth(kind) {
    setErr(null);
    setBusy(true);
    try {
      if (kind === 'google') await loginWithGoogle();
      else await loginWithTwitter();
      navigate('/');
    } catch (error) {
      setErr(error.message || 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {/* Auth card */}
      <div className="card w-full max-w-lg rounded-3xl p-8">
        <h1 className="text-3xl font-bold text-white text-center mb-3 tracking-tight">Welcome to TokenDash</h1>
        <p className="text-center text-gray-300 mb-8">
          Real-time token prices with Chainlink Oracles and CoinGecko. Track live and historical data in a clean, modern dashboard.
        </p>

        {err && (
          <div className="mb-4 text-sm text-red-200 bg-red-900/40 border border-red-700 rounded px-3 py-2 text-center">{err}</div>
        )}

        {/* Social Logins */}
        <div className="grid grid-cols-1 gap-3 mb-6">
          <button
            onClick={() => handleSocialAuth('google')}
            disabled={busy}
            className="btn btn-primary w-full h-12"
          >
            Continue with Google
          </button>
          {ENABLE_TWITTER && (
            <button
              onClick={() => handleSocialAuth('twitter')}
              disabled={busy}
              className="btn w-full h-12"
            >
              Continue with Twitter
            </button>
          )}
        </div>

        {/* Email Login */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="input"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="input"
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary w-full h-12"
          >
            {mode === 'login' ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center text-gray-300 text-sm">
          {mode === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button className="underline hover:text-white" onClick={() => setMode('signup')}>
                Sign Up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button className="underline hover:text-white" onClick={() => setMode('login')}>
                Login
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
