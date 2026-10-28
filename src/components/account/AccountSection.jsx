import React, { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { useTimerActions } from '../../context/useTimer';
import { Cloud, LogIn, LogOut, RefreshCw, UserPlus, Mail, CheckCircle2 } from 'lucide-react';
import { isAdminEmail, ADMIN_PASSWORD } from '../../services/analyticsService';
import AdminAnalyticsPanel from './AdminAnalyticsPanel';

const USER_EMAIL_KEY = 'atlera_user_email';
const ADMIN_AUTH_KEY = 'atlera_admin_auth_v2';

export default function AccountSection() {
  const { isConfigured, isSignedIn, user, signUp, signIn, signOut } = useAuth();
  const { pullFromCloud } = useTimerActions();

  // Retrieve stored email and admin auth state
  const [savedEmail, setSavedEmail] = useState(() => {
    try {
      return localStorage.getItem(USER_EMAIL_KEY) || '';
    } catch {
      return '';
    }
  });

  const [adminAuthKey, setAdminAuthKey] = useState(() => {
    try {
      return sessionStorage.getItem(ADMIN_AUTH_KEY) || '';
    } catch {
      return '';
    }
  });

  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error' | 'success' | 'info', text }
  const [lastSynced, setLastSynced] = useState(null);
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  // Active email is either the locally saved email or the Supabase authenticated user's email
  const currentEmail = savedEmail || user?.email || '';

  // If saved email is the designated admin email AND correct password is provided, render the Admin Panel
  if (currentEmail && isAdminEmail(currentEmail) && adminAuthKey === ADMIN_PASSWORD) {
    const handleDisconnectAdmin = () => {
      try {
        localStorage.removeItem(USER_EMAIL_KEY);
        sessionStorage.removeItem(ADMIN_AUTH_KEY);
      } catch {
        // Silently handle
      }
      setSavedEmail('');
      setAdminAuthKey('');
      setEmailInput('');
      setPassword('');
      setMessage(null);
    };

    return (
      <AdminAnalyticsPanel
        email={currentEmail}
        adminKey={adminAuthKey}
        onSignOut={handleDisconnectAdmin}
      />
    );
  }

  // Handle email & password submission
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setMessage(null);

    const cleanEmail = emailInput.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    // Check if this is the admin email
    if (isAdminEmail(cleanEmail)) {
      if (password !== ADMIN_PASSWORD) {
        setMessage({ type: 'error', text: 'Incorrect password for this account.' });
        return;
      }
      try {
        localStorage.setItem(USER_EMAIL_KEY, cleanEmail);
        sessionStorage.setItem(ADMIN_AUTH_KEY, password);
      } catch {
        // Ignore storage failure
      }
      setSavedEmail(cleanEmail);
      setAdminAuthKey(password);
      setPassword('');
      setMessage(null);
      return;
    }

    // Normal user flow:
    // If Supabase is configured and a password is provided, perform auth
    if (isConfigured && password) {
      if (password.length < 6) {
        setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
        return;
      }
      setBusy(true);
      try {
        if (mode === 'signup') {
          const data = await signUp(cleanEmail, password);
          if (!data?.session) {
            setMessage({ type: 'success', text: 'Account created! Check your inbox to confirm your email, then sign in.' });
          } else {
            setMessage({ type: 'success', text: 'Account created and signed in. Your sessions will now sync.' });
            try {
              localStorage.setItem(USER_EMAIL_KEY, cleanEmail);
            } catch {}
            setSavedEmail(cleanEmail);
            setIsEditingEmail(false);
          }
        } else {
          await signIn(cleanEmail, password);
          setMessage({ type: 'success', text: 'Signed in. Syncing your session history…' });
          setLastSynced(new Date());
          try {
            localStorage.setItem(USER_EMAIL_KEY, cleanEmail);
          } catch {}
          setSavedEmail(cleanEmail);
          setIsEditingEmail(false);
        }
        setPassword('');
      } catch (err) {
        setMessage({ type: 'error', text: err.message || 'Authentication failed.' });
      } finally {
        setBusy(false);
      }
      return;
    }

    // Normal user local workspace linking (safe fallback when cloud sync is not active or no password given)
    try {
      localStorage.setItem(USER_EMAIL_KEY, cleanEmail);
    } catch {
      // Ignore
    }
    setSavedEmail(cleanEmail);
    setIsEditingEmail(false);
    setMessage({ type: 'success', text: `Workspace preferences linked to ${cleanEmail}.` });
  };

  const handleClearSavedEmail = () => {
    try {
      localStorage.removeItem(USER_EMAIL_KEY);
      sessionStorage.removeItem(ADMIN_AUTH_KEY);
    } catch {
      // Ignore
    }
    setSavedEmail('');
    setAdminAuthKey('');
    setEmailInput('');
    setPassword('');
    setIsEditingEmail(true);
    setMessage({ type: 'info', text: 'Email unlinked from this workspace.' });
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      if (isConfigured && signOut) {
        await signOut();
      }
      handleClearSavedEmail();
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
        <h2 className="view-card-title" style={{ margin: 0 }}>Account & Workspace</h2>
      </div>

      {currentEmail && !isEditingEmail && (!isAdminEmail(currentEmail) || adminAuthKey === ADMIN_PASSWORD) ? (
        <>
          <p className="view-card-desc">
            Your workspace preferences and focus sessions are linked to <strong>{currentEmail}</strong>.
            All session data remains securely stored in this browser.
          </p>

          {isConfigured && isSignedIn && (
            <div className="setting-row">
              <div>
                <div className="setting-label">Cloud Sync Status</div>
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
          )}

          <div className="setting-row">
            <div>
              <div className="setting-label">Linked Account</div>
              <div className="setting-help" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <CheckCircle2 size={13} color="var(--accent-teal, #2dd4bf)" />
                <span>Active on this browser</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEmailInput(currentEmail);
                  setIsEditingEmail(true);
                  setMessage(null);
                }}
              >
                Change Email
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleSignOut}
                disabled={busy}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <LogOut size={14} />
                <span>Unlink</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        <form onSubmit={handleEmailSubmit}>
          <p className="view-card-desc">
            Enter your email to link your focus sessions and workspace preferences on this device.
            Anonymous local mode keeps working either way.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420 }}>
            <div>
              <div className="setting-label">Email</div>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-input"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <div className="setting-label">Password</div>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="submit"
                className="btn-primary-action"
                disabled={busy}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {isConfigured && password && mode === 'signup' ? (
                  <UserPlus size={14} />
                ) : isConfigured && password ? (
                  <LogIn size={14} />
                ) : (
                  <Mail size={14} />
                )}
                <span>
                  {isConfigured && password
                    ? mode === 'signup' ? 'Create Account' : 'Sign In'
                    : 'Save & Link'}
                </span>
              </button>

              {currentEmail && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsEditingEmail(false)}
                >
                  Cancel
                </button>
              )}

              {isConfigured && (
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
              )}
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
                  ? 'var(--accent-teal, #2dd4bf)'
                  : 'var(--text-secondary, #94a3b8)',
          }}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
