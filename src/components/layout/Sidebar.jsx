import React, { memo, useEffect } from 'react';
import { useTimerState, useTimerActions } from '../../context/useTimer';
import { useAuth } from '../../context/useAuth';
import MusicBar from '../../music/MusicBar';
import { Timer, Sliders, Palette, Settings, Sprout, Hourglass, X } from 'lucide-react';

function Sidebar({ isOpen, onClose }) {
  const { activeView } = useTimerState();
  const { setActiveView } = useTimerActions();
  const { isSignedIn, user } = useAuth() || {};

  // The drawer is modal on small screens: lock the page behind it and let
  // Escape dismiss it, without affecting the always-visible desktop sidebar.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  const navItems = [
    { id: 'focus', label: 'Focus Study Session', icon: Timer },
    { id: 'customizable_time', label: 'Customizable Time', icon: Sliders },
    { id: 'customizations', label: 'Timer Customizations', icon: Palette },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id) => {
    setActiveView(id);
    if (onClose) onClose();
  };

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
      <aside id="app-sidebar" className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-icon-box">
            <Hourglass size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div className="brand-title">Atleratimer</div>
            <div className="brand-subtitle">FOCUS TIMER</div>
          </div>
          {onClose && (
            <button
              type="button"
              className="sidebar-close-btn"
              onClick={onClose}
              aria-label="Close menu"
              title="Close menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Workspace section */}
        <div className="sidebar-section-label">YOUR SPACE</div>
        <div
          className="workspace-badge-row clickable"
          onClick={() => handleNavClick('settings')}
          role="button"
          tabIndex={0}
          title="Account & sync settings"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleNavClick('settings');
            }
          }}
        >
          <div className="workspace-avatar">
            {isSignedIn ? (user?.email?.[0]?.toUpperCase() || 'U') : 'AT'}
          </div>
          <div>
            <div className="workspace-title">
              {isSignedIn ? (user?.email?.split('@')[0] || 'User workspace') : 'Personal workspace'}
            </div>
            <div className="workspace-subtitle">
              {isSignedIn ? 'Cloud sync active' : 'Local device only'}
            </div>
          </div>
        </div>

        {/* Inspirational card */}
        <div className="sidebar-quote-card">
          <div className="quote-icon">
            <Sprout size={20} strokeWidth={2.2} />
          </div>
          <div className="quote-headline">
            Less noise.<br />More presence.
          </div>
          <div className="quote-body">
            You're building a little more focus with every session.
          </div>
        </div>

        {/* Navigation items */}
        <nav className="sidebar-nav" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`nav-item ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={19} className="nav-icon" strokeWidth={isActive ? 2.2 : 1.8} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Music mini player — pinned above the footer by .sidebar-nav's auto margin */}
        <div className="sidebar-music">
          <MusicBar />
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <span className={`status-dot ${isSignedIn ? 'synced' : 'local'}`} />
          <span>{isSignedIn ? 'Cloud synced' : 'Saved locally'}</span>
        </div>
      </aside>
    </>
  );
}

// Memoised: this component only reads its own context subscriptions and its
// props, so a parent re-render can skip it entirely.
export default memo(Sidebar);
