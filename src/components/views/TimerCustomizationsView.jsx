import React from 'react';
import { useTimerState, useTimerActions } from '../../context/useTimer';
import { soundService } from '../../services/audioService';
import { notificationService } from '../../services/notificationService';
import { Volume2, Palette } from 'lucide-react';
import DialFace from '../timer/DialFace';
import {
  DIAL_SCHEMES,
  DIAL_MOODS,
  DIAL_COMFORT,
  DIAL_EFFECTS,
  DIAL_DEFAULTS,
  getDialLook,
  getSchemeSwatch,
} from '../timer/dialStyle';

export default function TimerCustomizationsView() {
  const { data, theme } = useTimerState();
  const { setData, toggleTheme, setActiveView } = useTimerActions();

  // Dial-only appearance. Merged with the defaults so a partial/legacy payload
  // still resolves to a complete style.
  const dialStyle = { ...DIAL_DEFAULTS, ...(data?.dialStyle || {}) };
  const dialLook = getDialLook(dialStyle);
  const moodName = DIAL_MOODS.find((mood) => mood.id === dialLook.mood)?.name || dialLook.mood;

  const updateDial = (patch) => {
    setData((prev) => ({
      ...prev,
      dialStyle: { ...DIAL_DEFAULTS, ...prev.dialStyle, ...patch },
    }));
  };

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
      {/* Dial Appearance Card — everything here is scoped to the circular dial */}
      <div className="view-card dial-card">
        <div className="dial-card-controls">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Palette size={18} className="stat-card-icon" />
            <h2 className="view-card-title" style={{ margin: 0 }}>Dial Appearance</h2>
          </div>
          <p className="view-card-desc">
            Colour scheme, mood, comfort and colour effects for the focus dial only — the rest of
            the workspace stays exactly as it is.
          </p>

          <div className="dial-control">
            <div className="dial-control-head">
              <span className="setting-label">Colour scheme</span>
              <span className="dial-control-value">{dialLook.schemeName}</span>
            </div>
            <div className="dial-swatches" role="group" aria-label="Dial colour scheme">
              {DIAL_SCHEMES.map((scheme) => (
                <button
                  key={scheme.id}
                  type="button"
                  className={`dial-swatch ${dialStyle.scheme === scheme.id ? 'active' : ''}`}
                  style={{ backgroundImage: getSchemeSwatch(scheme.id, dialStyle.mood) }}
                  aria-label={scheme.name}
                  aria-pressed={dialStyle.scheme === scheme.id}
                  title={scheme.name}
                  onClick={() => updateDial({ scheme: scheme.id })}
                />
              ))}
            </div>
          </div>

          <div className="dial-control">
            <span className="setting-label">Mood</span>
            <div className="dial-pills" role="group" aria-label="Dial mood">
              {DIAL_MOODS.map((mood) => (
                <button
                  key={mood.id}
                  type="button"
                  className={`preset-pill ${dialStyle.mood === mood.id ? 'active' : ''}`}
                  aria-pressed={dialStyle.mood === mood.id}
                  onClick={() => updateDial({ mood: mood.id })}
                >
                  {mood.name}
                </button>
              ))}
            </div>
          </div>

          <div className="dial-control">
            <span className="setting-label">Comfort</span>
            <div className="dial-pills" role="group" aria-label="Dial comfort">
              {DIAL_COMFORT.map((comfort) => (
                <button
                  key={comfort.id}
                  type="button"
                  className={`preset-pill ${dialStyle.comfort === comfort.id ? 'active' : ''}`}
                  aria-pressed={dialStyle.comfort === comfort.id}
                  onClick={() => updateDial({ comfort: comfort.id })}
                >
                  {comfort.name}
                </button>
              ))}
            </div>
          </div>

          <div className="dial-control">
            <span className="setting-label">Colour effect</span>
            <div className="dial-pills" role="group" aria-label="Dial colour effect">
              {DIAL_EFFECTS.map((effect) => (
                <button
                  key={effect.id}
                  type="button"
                  className={`preset-pill ${dialStyle.effect === effect.id ? 'active' : ''}`}
                  aria-pressed={dialStyle.effect === effect.id}
                  onClick={() => updateDial({ effect: effect.id })}
                >
                  {effect.name}
                </button>
              ))}
            </div>
            <div className="setting-help" style={{ marginTop: 8 }}>
              Effects are drawn on the dial ring only.
            </div>
          </div>
        </div>

        <div className="dial-preview" aria-hidden="true">
          <DialFace
            progress={0.68}
            strokeWidth={dialLook.strokeWidth}
            effect={dialLook.effect}
            comfort={dialLook.comfort}
            style={dialLook.vars}
          >
            <div className="timer-mode-tag">DEEP WORK</div>
            <div className="timer-countdown-text tabular-nums">25:00</div>
            <div className="timer-cycle-indicator">SESSION 01 / 04</div>
          </DialFace>
          <div className="dial-preview-label">
            <span
              className="dial-preview-dot"
              style={{ backgroundColor: dialLook.stops[1], color: dialLook.stops[1] }}
            />
            <span>{dialLook.schemeName} · {moodName} mood</span>
          </div>
        </div>
      </div>

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
