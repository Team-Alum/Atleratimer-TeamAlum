import React, { useState, useEffect } from 'react';
import { useTimerState, useTimerActions } from '../../context/useTimer';
import { soundService } from '../../services/audioService';
import { notificationService } from '../../services/notificationService';
import AnimatedTime from '../timer/AnimatedTime';
import {
  Volume2,
  Palette,
  Sparkles,
  Check,
  CloudRain,
  Car,
  Moon,
  Lamp,
  Trees,
  Waves,
  Ban,
  Type,
} from 'lucide-react';
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
import {
  ATMOSPHERES,
  DEFAULT_ATMOSPHERE,
  getAtmosphere,
  getAtmosphereRing,
} from '../../theme/atmospheres';
import { AMBIENT_SCENES, DEFAULT_AMBIENT_SCENE } from '../../ambient/ambientScenes';

const AMBIENT_ICONS = {
  off: Ban,
  'rainy-city': CloudRain,
  'night-drive': Car,
  'starry-sky': Moon,
  'cozy-study': Lamp,
  'forest-rain': Trees,
  ocean: Waves,
};

export default function TimerCustomizationsView() {
  const { data, theme } = useTimerState();
  const { setData, toggleTheme, setActiveView } = useTimerActions();

  // Dial-only appearance. Merged with the defaults so a partial/legacy payload
  // still resolves to a complete style.
  const dialStyle = { ...DIAL_DEFAULTS, ...(data?.dialStyle || {}) };
  const atmosphereId = getAtmosphere(data?.atmosphere || DEFAULT_ATMOSPHERE).id;
  const atmosphere = getAtmosphere(atmosphereId);
  const atmosphereRing = getAtmosphereRing(atmosphereId, theme);
  const dialLook = getDialLook(dialStyle, atmosphereRing);
  const moodName = DIAL_MOODS.find((mood) => mood.id === dialLook.mood)?.name || dialLook.mood;
  const activeAmbient = data?.ambientScene || DEFAULT_AMBIENT_SCENE;

  const updateDial = (patch) => {
    setData((prev) => ({
      ...prev,
      dialStyle: { ...DIAL_DEFAULTS, ...prev.dialStyle, ...patch },
    }));
  };

  const updateAtmosphere = (id) => {
    setData((prev) => ({ ...prev, atmosphere: id }));
  };

  const updateAmbientScene = (id) => {
    setData((prev) => ({ ...prev, ambientScene: id }));
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
      {/* Atmosphere — app-wide palette, independent of light/dark */}
      <div className="view-card atmosphere-panel">
        <div className="section-heading">
          <span className="section-heading-icon" aria-hidden="true"><Sparkles size={18} /></span>
          <div className="section-heading-copy">
            <h2 className="view-card-title">Atmosphere</h2>
            <p className="view-card-desc">
              Ambient light, surface tint and timer ring for the whole workspace. Every preset is
              designed for both light and dark themes.
            </p>
          </div>
          <span className="atmosphere-current">{atmosphere.name}</span>
        </div>

        <div className="atmo-grid" role="radiogroup" aria-label="Atmosphere preset">
          {ATMOSPHERES.map((preset) => {
            const active = preset.id === atmosphereId;
            const palette = preset[theme === 'dark' ? 'dark' : 'light'];
            return (
              <label key={preset.id} className={`atmo-option${active ? ' is-active' : ''}`}>
                <input
                  className="sr-only"
                  type="radio"
                  name="atmosphere-preset"
                  value={preset.id}
                  checked={active}
                  onChange={() => updateAtmosphere(preset.id)}
                />
                <span className="atmo-swatch" aria-hidden="true">
                  <span
                    className="atmo-swatch-glow"
                    style={{ backgroundImage: `linear-gradient(135deg, ${palette.bg} 0%, ${palette.accent} 150%)` }}
                  />
                  <span
                    className="atmo-swatch-surface"
                    style={{ background: palette.surface }}
                  />
                  <span
                    className="atmo-swatch-ring"
                    style={{ backgroundImage: `conic-gradient(from 210deg, ${palette.ring.join(', ')})` }}
                  />
                </span>
                <span className="atmo-meta">
                  <span className="atmo-name">
                    {preset.name}
                    {active && <Check size={13} className="atmo-check" aria-hidden="true" />}
                  </span>
                  <span className="atmo-tagline">{preset.tagline}</span>
                </span>
              </label>
            );
          })}
        </div>

        <p className="atmo-note">
          Previews use the current theme. The timer ring follows the atmosphere while Dial
          Appearance is set to “Atmosphere”; choosing a custom dial palette overrides only the ring.
        </p>
      </div>

      {/* Ambient environment — optional licensed footage with tonal fallback */}
      <div className="view-card ambient-panel">
        <div className="section-heading">
          <span className="section-heading-icon" aria-hidden="true"><CloudRain size={18} /></span>
          <div className="section-heading-copy">
            <h2 className="view-card-title">Ambient environment</h2>
            <p className="view-card-desc">
              A single, subtle scene behind the workspace. Only the selected scene is loaded, and
              reduced motion always shows the still version.
            </p>
          </div>
        </div>

        <div className="ambient-grid" role="radiogroup" aria-label="Ambient scene">
          {AMBIENT_SCENES.map((scene) => {
            const Icon = AMBIENT_ICONS[scene.id] || Sparkles;
            const active = activeAmbient === scene.id;
            const thumbStyle = scene.fallback
              ? {
                backgroundImage: `radial-gradient(120% 100% at 18% 15%, ${scene.fallback.a}, transparent 62%), radial-gradient(100% 90% at 82% 22%, ${scene.fallback.b}, transparent 58%), radial-gradient(120% 110% at 55% 105%, ${scene.fallback.c}, transparent 68%), linear-gradient(160deg, ${scene.fallback.base}, ${scene.fallback.base})`,
              }
              : undefined;
            return (
              <label key={scene.id} className={`ambient-option${active ? ' is-active' : ''}`}>
                <input
                  className="sr-only"
                  type="radio"
                  name="ambient-scene"
                  value={scene.id}
                  checked={active}
                  onChange={() => updateAmbientScene(scene.id)}
                />
                <span
                  className={`ambient-thumb${scene.fallback ? '' : ' ambient-thumb--empty'}`}
                  style={thumbStyle}
                  aria-hidden="true"
                >
                  <Icon size={18} />
                  {active && <span className="ambient-selected-mark"><Check size={11} /></span>}
                </span>
                <span className="ambient-meta">
                  <span className="ambient-name">{scene.name}</span>
                  <span className="ambient-tagline">{scene.tagline}</span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="setting-row ambient-motion-row">
          <div>
            <div className="setting-label">Scene motion</div>
            <div className="setting-help">
              Slow video motion. Turn this off for a still scene; reduced motion disables it
              automatically.
            </div>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={data?.ambientMotion !== false}
              onChange={(e) => setData((prev) => ({ ...prev, ambientMotion: e.target.checked }))}
              aria-label="Play ambient scene motion"
            />
            <span className="toggle-slider" aria-hidden="true" />
          </label>
        </div>

        <p className="ambient-asset-note">
          Licensed clips live in <code>/assets/ambient/</code>. If a clip is not installed, a tonal
          fallback is shown instead of an empty frame.
        </p>
      </div>

      {/* Dial Appearance Card — everything here is scoped to the circular dial */}
      <div className="view-card dial-card">
        <div className="dial-card-controls">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Palette size={18} className="stat-card-icon" />
            <h2 className="view-card-title" style={{ margin: 0 }}>Dial Appearance</h2>
          </div>
          <p className="view-card-desc">
            Fine-tune the focus dial. “Atmosphere” follows the active preset; any other scheme
            overrides the ring without changing the workspace.
          </p>

          <div className="dial-control">
            <div className="dial-control-head">
              <span className="setting-label">Colour scheme</span>
              <span className="dial-control-value">
                {dialLook.schemeName}{dialLook.isAtmosphere ? ' · auto' : ''}
              </span>
            </div>
            <div className="dial-swatches" role="group" aria-label="Dial colour scheme">
              {DIAL_SCHEMES.map((scheme) => (
                <button
                  key={scheme.id}
                  type="button"
                  className={`dial-swatch ${dialStyle.scheme === scheme.id ? 'active' : ''}`}
                  style={{ backgroundImage: getSchemeSwatch(scheme.id, dialStyle.mood, atmosphereRing) }}
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
              aria-pressed={theme === 'light'}
            >
              Light
            </button>
            <button
              onClick={() => toggleTheme('dark')}
              className={`preset-pill ${theme === 'dark' ? 'active' : ''}`}
              aria-pressed={theme === 'dark'}
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

      {/* Digit Animation Card */}
      <div className="view-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Type size={18} className="stat-card-icon" />
          <h2 className="view-card-title" style={{ margin: 0 }}>Digit Animation</h2>
        </div>
        <p className="view-card-desc">
          Choose how time changes appear during your focus sessions. Normal is default.
        </p>

        <div className="dial-control">
          <div className="dial-control-head">
            <span className="setting-label">Animation mode</span>
            <span className="dial-control-value">
              {(data?.digitAnimation?.mode || 'normal').charAt(0).toUpperCase() + (data?.digitAnimation?.mode || 'normal').slice(1)}
            </span>
          </div>
          <div className="dial-pills" role="group" aria-label="Digit animation mode">
            {['normal', 'droplet', 'slide', 'bounce', 'fade'].map((mode) => (
              <button
                key={mode}
                type="button"
                className={`preset-pill ${(data?.digitAnimation?.mode || 'normal') === mode ? 'active' : ''}`}
                aria-pressed={(data?.digitAnimation?.mode || 'normal') === mode}
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    digitAnimation: { ...(prev.digitAnimation || {}), mode },
                  }))
                }
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="dial-control" style={{ marginTop: 14 }}>
          <div className="dial-control-head">
            <span className="setting-label">Animation speed</span>
            <span className="dial-control-value">
              {(data?.digitAnimation?.speed || 'balanced').charAt(0).toUpperCase() + (data?.digitAnimation?.speed || 'balanced').slice(1)}
            </span>
          </div>
          <div className="dial-pills" role="group" aria-label="Digit animation speed">
            {['subtle', 'balanced', 'expressive'].map((speed) => (
              <button
                key={speed}
                type="button"
                className={`preset-pill ${(data?.digitAnimation?.speed || 'balanced') === speed ? 'active' : ''}`}
                aria-pressed={(data?.digitAnimation?.speed || 'balanced') === speed}
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    digitAnimation: { ...(prev.digitAnimation || {}), speed },
                  }))
                }
              >
                {speed.charAt(0).toUpperCase() + speed.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Live preview</div>
            <DigitAnimationPreview
              mode={data?.digitAnimation?.mode || 'normal'}
              speed={data?.digitAnimation?.speed || 'balanced'}
              reducedMotion={!!data?.reducedMotion}
            />
          </div>
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

function DigitAnimationPreview({ mode, speed, reducedMotion }) {
  const [value, setValue] = useState('25:00');
  useEffect(() => {
    let count = 0;
    const id = setInterval(() => {
      count++;
      if (count % 3 === 1) setValue('24:59');
      else if (count % 3 === 2) setValue('24:58');
      else setValue('25:00');
    }, 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ fontSize: 42, fontWeight: 600, letterSpacing: '0.02em' }} className="tabular-nums">
      <AnimatedTime value={value} mode={mode} speed={speed} reducedMotion={reducedMotion} />
    </div>
  );
}
