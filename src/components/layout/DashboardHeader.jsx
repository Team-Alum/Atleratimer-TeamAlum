import React, { memo, useEffect, useState } from 'react';
import { useTimerState, useTimerActions } from '../../context/useTimer';
import { Bell, Sun, Moon, Menu } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import AmbientMenu from '../../ambient/AmbientMenu';

// Local uppercase date, e.g. "TUESDAY, OCTOBER 20".
function formatToday() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).toUpperCase();
}

function DashboardHeader({ onOpenMobileMenu }) {
  const { theme, activeView, data } = useTimerState();
  const { toggleTheme, setData } = useTimerActions();

  // The clock is read outside of render and refreshed once a minute, so the
  // header rolls over at midnight instead of staying on the day the app was
  // opened. Re-setting the same string is a no-op for React.
  const [dateStr, setDateStr] = useState(formatToday);

  useEffect(() => {
    const tick = () => setDateStr((prev) => {
      const next = formatToday();
      return prev === next ? prev : next;
    });
    const id = setInterval(tick, 60_000);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', tick);
    };
  }, []);

  const viewTitles = {
    focus: 'Focus Study Session',
    customizable_time: 'Customizable Time',
    customizations: 'Timer Customizations',
    settings: 'Settings',
  };

  const currentTitle = viewTitles[activeView] || 'Focus Study Session';

  const handleNotificationClick = async () => {
    if (!notificationService.isSupported()) {
      alert('Desktop notifications are not supported in this browser.');
      return;
    }
    const currentPermission = notificationService.getPermission();
    if (currentPermission !== 'granted') {
      const result = await notificationService.requestPermission();
      if (result === 'granted') {
        setData((prev) => ({ ...prev, desktopNotifications: true }));
        notificationService.send('Notifications Enabled', {
          body: 'Atleratimer will alert you when study sessions or breaks complete.',
        });
      }
    } else {
      const nextState = !data.desktopNotifications;
      setData((prev) => ({ ...prev, desktopNotifications: nextState }));
      if (nextState) {
        notificationService.send('Atleratimer Notifications Active', {
          body: 'You will receive focus completion alerts.',
        });
      }
    }
  };

  return (
    <header className="dashboard-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {onOpenMobileMenu && (
          <button
            className="icon-button mobile-menu-btn"
            onClick={onOpenMobileMenu}
            aria-label="Open sidebar navigation"
            style={{ display: 'none' }}
          >
            <Menu size={18} />
          </button>
        )}
        <div>
          <div className="header-date">{dateStr}</div>
          <h1 className="header-title">{currentTitle}</h1>
        </div>
      </div>

      <div className="header-actions">
        {/* Notification Button */}
        <button
          className={`icon-button ${data.desktopNotifications ? 'active' : ''}`}
          onClick={handleNotificationClick}
          title={data.desktopNotifications ? 'Notifications Enabled' : 'Enable Notifications'}
          aria-label="Toggle notifications"
        >
          <Bell size={18} strokeWidth={2} />
        </button>

        {/* Light / Dark Selector */}
        <div className="theme-toggle-pill" role="radiogroup" aria-label="Theme selector">
          <button
            className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
            onClick={() => toggleTheme('light')}
            role="radio"
            aria-checked={theme === 'light'}
          >
            <Sun size={14} strokeWidth={2.2} />
            <span>Light</span>
          </button>
          <button
            className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => toggleTheme('dark')}
            role="radio"
            aria-checked={theme === 'dark'}
          >
            <Moon size={14} strokeWidth={2.2} />
            <span>Dark</span>
          </button>
        </div>

        {/* Ambient background picker */}
        <AmbientMenu />
      </div>
    </header>
  );
}

// Memoised: this component only reads its own context subscriptions and its
// props, so a parent re-render can skip it entirely.
export default memo(DashboardHeader);
