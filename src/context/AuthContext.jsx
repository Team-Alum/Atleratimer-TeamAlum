import React, { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './AuthContextInstance';
import { syncService } from '../services/syncService';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!syncService.isConfigured);

  useEffect(() => {
    if (!syncService.isConfigured) return undefined;

    let cancelled = false;
    syncService
      .getSession()
      .then((session) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
        setAuthReady(true);
      })
      .catch(() => {
        if (!cancelled) setAuthReady(true);
      });

    const { data } = syncService.onAuthStateChange((session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      data?.subscription?.unsubscribe?.();
    };
  }, []);

  const signUp = useCallback(async (email, password) => {
    const data = await syncService.signUpWithEmail(email, password);
    setUser(data?.session?.user ?? null);
    return data;
  }, []);

  const signIn = useCallback(async (email, password) => {
    const data = await syncService.signInWithEmail(email, password);
    setUser(data?.session?.user ?? null);
    return data;
  }, []);

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
