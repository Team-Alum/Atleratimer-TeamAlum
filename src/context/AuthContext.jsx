import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthContext } from './AuthContextInstance';
import { syncService } from '../services/syncService';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!syncService.isConfigured);
  const subscriptionRef = useRef(null);

  // Subscribe to auth changes once the Supabase SDK is actually present.
  // syncService.onAuthStateChange() resolves immediately (no download) when
  // there is no stored session to observe.
  const ensureSubscription = useCallback(async () => {
    if (subscriptionRef.current) return;
    const result = await syncService.onAuthStateChange((session) => {
      setUser(session?.user ?? null);
    });
    subscriptionRef.current = result?.data?.subscription ?? null;
  }, []);

  useEffect(() => {
    if (!syncService.isConfigured) return undefined;

    let cancelled = false;

    (async () => {
      // getSession() is a no-op (and downloads nothing) when the browser holds
      // no Supabase session, so guests never pay for the SDK.
      const session = await syncService.getSession();
      if (cancelled) return;
      setUser(session?.user ?? null);
      setAuthReady(true);
      if (session) await ensureSubscription();
    })().catch(() => {
      if (!cancelled) setAuthReady(true);
    });

    return () => {
      cancelled = true;
      subscriptionRef.current?.unsubscribe?.();
      subscriptionRef.current = null;
    };
  }, [ensureSubscription]);

  const signUp = useCallback(async (email, password) => {
    const data = await syncService.signUpWithEmail(email, password);
    setUser(data?.session?.user ?? null);
    await ensureSubscription();
    return data;
  }, [ensureSubscription]);

  const signIn = useCallback(async (email, password) => {
    const data = await syncService.signInWithEmail(email, password);
    setUser(data?.session?.user ?? null);
    await ensureSubscription();
    return data;
  }, [ensureSubscription]);

  const signOut = useCallback(async () => {
    await syncService.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isConfigured: syncService.isConfigured,
        isSignedIn: Boolean(user),
        user,
        authReady,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
