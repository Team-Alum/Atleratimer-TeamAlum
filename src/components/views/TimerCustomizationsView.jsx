import React from 'react';
import { useTimer } from '../../context/useTimer';
import { soundService } from '../../services/audioService';
import { notificationService } from '../../services/notificationService';
import { Volume2 } from 'lucide-react';

export default function TimerCustomizationsView() {
  const { data, setData, theme, toggleTheme, setActiveView } = useTimer();

  const handleTestChime = () => {
    soundService.playCompletionChime(data.chimeType || 'zen');
  };

  const handleToggleDesktopNotif = async () => {
    if (!notificationService.isSupported()) {
      alert('Desktop notifications are not supported by your browser.');
      return;
    }
    const perm = await notificationService.requestPermission();
    if (perm === 'granted') {
      setData((prev) => ({ ...prev, desktopNotifications: !prev.desktopNotifications }));
      notificationService.send('Notification Test', {
        body: 'Atleratimer notifications are working properly!',
      });
    } else {
      alert('Notification permission was not granted.');
    }
  };

  return (
    <div className="view-container">
      {/* Visual Appearance Card */}
      <div className="view-card">
        <h2 className="view-card-title">Appearance & Display</h2>
        <p className="view-card-desc">Personalize the visual aesthetics and responsiveness of your workspace.</p>

        <div className="setting-row">
          <div>
            <div className="setting-label">Interface Theme</div>
            <div className="setting-help">Select between crisp daylight mode or distraction-free obsidian dark</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => toggleTheme('light')}
              className={`preset-pill ${theme === 'light' ? 'active' : ''}`}
            >
              Light
            </button>
            <button
              onClick={() => toggleTheme('dark')}
              className={`preset-pill ${theme === 'dark' ? 'active' : ''}`}
            >
              Dark
            </button>
          </div>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Reduced Motion</div>
            <div className="setting-help">Disable animations and celebratory particle confetti effects</div>
          </div>
          <input
            type="checkbox"
            checked={data.reducedMotion || false}
            onChange={(e) =>
              setData((prev) => ({ ...prev, reducedMotion: e.target.checked }))
            }
            style={{ width: 18, height: 18, accentColor: 'var(--accent-teal)' }}
          />
        </div>
      </div>

      {/* Audio & Chimes Card */}
      <div className="view-card">
        <h2 className="view-card-title">Audio & Focus Acoustics</h2>
        <p className="view-card-desc">Configure completion alerts and synthesized ambient white noise.</p>

        <div className="setting-row">
          <div>
            <div className="setting-label">Completion Chime</div>
            <div className="setting-help">Play a harmonious alert sound when session reaches 00:00</div>
          </div>
          <input
            type="checkbox"
            checked={data.soundEnabled !== false}
            onChange={(e) =>
              setData((prev) => ({ ...prev, soundEnabled: e.target.checked }))
            }
            style={{ width: 18, height: 18, accentColor: 'var(--accent-teal)' }}
          />
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Chime Style</div>
            <div className="setting-help">Choose between acoustic harmonic chords or soft digital tone</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              value={data.chimeType || 'zen'}
              onChange={(e) => setData((prev) => ({ ...prev, chimeType: e.target.value }))}
              className="form-input"
              style={{ width: 150 }}
            >
              <option value="zen">Zen Harmonic Chime</option>
              <option value="beep">Digital Dual Beep</option>
            </select>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleTestChime}
              style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
              title="Test completion sound"
            >
              <Volume2 size={14} />
              <span>Test</span>
            </button>
          </div>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Ambient Focus Generator</div>
            <div className="setting-help">Generative synthesized sound to drown out distracting background noise</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['rain', 'whitenoise'].map((type) => (
              <button
                key={type}
                onClick={() => setData((prev) => ({ ...prev, ambientType: type }))}
                className={`preset-pill ${data.ambientType === type ? 'active' : ''}`}
                style={{ fontSize: 12, textTransform: 'capitalize' }}
              >
                {type === 'rain' ? 'Gentle Rain' : 'White Noise'}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Ambient Volume</div>
            <div className="setting-help">Adjust level of background acoustics</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="range"
              min="0.05"
              max="0.5"
              step="0.05"
              value={data.ambientVolume || 0.15}
              onChange={(e) =>
                setData((prev) => ({ ...prev, ambientVolume: parseFloat(e.target.value) }))
              }
              style={{ accentColor: 'var(--accent-teal)' }}
            />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', width: 36 }}>
              {Math.round((data.ambientVolume || 0.15) * 200)}%
            </span>
          </div>
        </div>
      </div>

      {/* Notifications Card */}
      <div className="view-card">
        <h2 className="view-card-title">System Notifications</h2>
        <p className="view-card-desc">Receive OS desktop banners even when your browser tab is inactive.</p>

        <div className="setting-row">
          <div>
            <div className="setting-label">Desktop Push Alerts</div>
            <div className="setting-help">Notifies you upon session and break completion</div>
          </div>
          <button
            type="button"
            className={`btn-secondary ${data.desktopNotifications ? 'btn-primary-action' : ''}`}
            onClick={handleToggleDesktopNotif}
            style={{ fontSize: 13, padding: '8px 18px' }}
          >
            {data.desktopNotifications ? 'Enabled' : 'Enable Notifications'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button
          type="button"
          className="btn-primary-action"
          onClick={() => setActiveView('focus')}
        >
          Return to Focus Dashboard
        </button>
      </div>
    </div>
  );
}
