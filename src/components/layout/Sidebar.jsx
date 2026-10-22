import React, { memo } from 'react';
import { useTimerState, useTimerActions } from '../../context/useTimer';
import MusicBar from '../../music/MusicBar';
import { Timer, Sliders, Palette, Settings, Sprout, Hourglass } from 'lucide-react';

function Sidebar({ isOpen, onClose }) {
  const { activeView } = useTimerState();
  const { setActiveView } = useTimerActions();

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
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-icon-box">
            <Hourglass size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div className="brand-title">Atleratimer</div>
            <div className="brand-subtitle">FOCUS TIMER</div>
          </div>
        </div>

        {/* Workspace section */}
        <div className="sidebar-section-label">YOUR SPACE</div>
        <div className="workspace-badge-row">
          <div className="workspace-avatar">AT</div>
          <div>
            <div className="workspace-title">Personal workspace</div>
            <div className="workspace-subtitle">All devices in sync</div>
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
        <nav className="sidebar-nav">
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
                <Icon size={19} className="nav-icon" strokeWidth={isActive ? 2.2 : 1.8} />
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
          <span className="status-dot" />
          <span>Saved locally · Synced just now</span>
        </div>
      </aside>
    </>
  );
}

// Memoised: this component only reads its own context subscriptions and its
// props, so a parent re-render can skip it entirely.
export default memo(Sidebar);
