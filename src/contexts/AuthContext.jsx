import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth, googleProvider, twitterProvider } from '../firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const ENABLE_GOOGLE = (import.meta.env.VITE_AUTH_GOOGLE_ENABLED ?? '1') !== '0';
  const ENABLE_TWITTER = (import.meta.env.VITE_AUTH_TWITTER_ENABLED ?? '0') === '1';
  // setting up twitter login is bit tedious, so disabled by default..

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    error,
    async loginWithGoogle() {
      if (!ENABLE_GOOGLE) {
        throw new Error('Google auth is disabled in this environment');
      }
      setError(null);
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (e) {
        if (e?.code === 'auth/configuration-not-found') {
          throw new Error('Google sign-in not configured. Enable Google provider in Firebase Authentication and add your app domain to Authorized domains.');
        }
        throw e;
      }
    },
    async loginWithTwitter() {
      if (!ENABLE_TWITTER) {
        throw new Error('Twitter auth is disabled. Set VITE_AUTH_TWITTER_ENABLED=1 and configure the provider in Firebase.');
      }
      setError(null);
      try {
        await signInWithPopup(auth, twitterProvider);
      } catch (e) {
        if (e?.code === 'auth/configuration-not-found') {
          throw new Error('Twitter sign-in not configured. Enable Twitter provider in Firebase Authentication, set API keys, and add your app domain to Authorized domains.');
        }
        throw e;
      }
    },
    async loginWithEmail(email, password) {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
    },
    async signupWithEmail(email, password) {
      setError(null);
      await createUserWithEmailAndPassword(auth, email, password);
    },
    async logout() {
      setError(null);
      await signOut(auth);
    }
  }), [user, loading, error]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
