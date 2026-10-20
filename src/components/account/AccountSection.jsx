import React, { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { useTimer } from '../../context/useTimer';
import { Cloud, CloudOff, LogIn, LogOut, RefreshCw, UserPlus } from 'lucide-react';

export default function AccountSection() {
  const { isConfigured, isSignedIn, user, signUp, signIn, signOut } = useAuth();
  const { pullFromCloud } = useTimer();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error' | 'success' | 'info', text }
  const [lastSynced, setLastSynced] = useState(null);

  if (!isConfigured) {
    return (
      <div className="view-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <CloudOff size={19} className="stat-card-icon" />
          <h2 className="view-card-title" style={{ margin: 0 }}>Account & Cloud Sync</h2>
        </div>
        <p className="view-card-desc">
          Cloud sync is not configured. Set <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> in your environment to enable cross-device history
          sync. Until then, all data stays safely in this browser.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setMessage(null);

    if (!email.includes('@') || password.length < 6) {
      setMessage({ type: 'error', text: 'Enter a valid email and a password of at least 6 characters.' });
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        const data = await signUp(email, password);
        if (!data?.session) {
          setMessage({ type: 'success', text: 'Account created! Check your inbox to confirm your email, then sign in.' });
        } else {
          setMessage({ type: 'success', text: 'Account created and signed in. Your sessions will now sync.' });
        }
      } else {
        await signIn(email, password);
        setMessage({ type: 'success', text: 'Signed in. Syncing your session history…' });
        setLastSynced(new Date());
      }
      setPassword('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Authentication failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
      setMessage({ type: 'info', text: 'Signed out. Your local history remains available on this device.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Sign out failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSyncNow = async () => {
    setBusy(true);
    try {
      const added = await pullFromCloud();
      setLastSynced(new Date());
      setMessage({
        type: 'success',
        text: added > 0 ? `Sync complete — ${added} new session(s) merged.` : 'Sync complete — everything is up to date.',
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Sync failed.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="view-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Cloud size={19} className="stat-card-icon" />
        <h2 className="view-card-title" style={{ margin: 0 }}>Account & Cloud Sync</h2>
      </div>

      {isSignedIn ? (
        <>
          <p className="view-card-desc">
            Signed in as <strong>{user?.email}</strong>. Completed focus sessions are backed up to
            Supabase and follow you across devices.
          </p>

          <div className="setting-row">
            <div>
              <div className="setting-label">Sync Status</div>
              <div className="setting-help">
                {lastSynced
                  ? `Last synced at ${lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'History was pulled automatically when you signed in'}
              </div>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleSyncNow}
              disabled={busy}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={14} style={busy ? { animation: 'spin 1s linear infinite' } : undefined} />
              <span>Sync Now</span>
            </button>
          </div>

          <div className="setting-row">
            <div>
              <div className="setting-label">Sign Out</div>
              <div className="setting-help">Stops cloud syncing; local history stays on this device</div>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleSignOut}
              disabled={busy}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <p className="view-card-desc">
            Create an account to back up your focus history to the cloud and access it from any
            device. Anonymous local mode keeps working either way.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420 }}>
            <div>
              <div className="setting-label">Email</div>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <div className="setting-label">Password</div>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button type="submit" className="btn-primary-action" disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {mode === 'signup' ? <UserPlus size={14} /> : <LogIn size={14} />}
                <span>{mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setMessage(null);
                }}
              >
                {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
              </button>
            </div>
          </div>
        </form>
      )}

      {message && (
        <p
          role="status"
          style={{
            marginTop: 14,
            fontSize: 13,
            fontWeight: 500,
            color:
              message.type === 'error'
                ? '#EF4444'
                : message.type === 'success'
                  ? 'var(--accent-teal)'
                  : 'var(--text-secondary)',
          }}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
