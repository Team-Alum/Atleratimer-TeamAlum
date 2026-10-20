import React from 'react';
import { useTimer } from '../../context/useTimer';
import { storageService } from '../../services/storageService';
import AccountSection from '../account/AccountSection';
import { AMBIENT_SCENES } from '../../ambient/AmbientStage';
import { Download, Trash2, RotateCcw, Info, ShieldCheck, Music, Waves } from 'lucide-react';

const YEAR = new Date().getFullYear();

export default function SettingsView() {
  const { data, setData, setActiveView } = useTimer();

  const musicSettings = data?.musicSettings || {};
  const ambientSettings = data?.ambientSettings || {};

  const updateMusic = (patch) => {
    setData((prev) => ({ ...prev, musicSettings: { ...prev.musicSettings, ...patch } }));
  };

  const updateAmbient = (patch) => {
    setData((prev) => ({ ...prev, ambientSettings: { ...prev.ambientSettings, ...patch } }));
  };

  const handleExportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `atleratimer-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear all session history records? Today’s focus stats and presets will remain.')) {
      setData((prev) => ({
        ...prev,
        history: [],
      }));
      alert('Session history cleared.');
    }
  };

  const handleResetEverything = () => {
    if (
      window.confirm(
        'WARNING: This will completely reset all timer settings, preferences, and session statistics back to default factory state. Proceed?'
      )
    ) {
      storageService.clearAllData();
      window.location.reload();
    }
  };

  return (
    <div className="view-container">
      {/* Account & Cloud Sync */}
      <AccountSection />

      {/* Music & Ambient */}
      <div className="view-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Music size={19} className="stat-card-icon" />
          <h2 className="view-card-title" style={{ margin: 0 }}>Music & Ambient</h2>
        </div>
        <p className="view-card-desc">
          Personalize the focus soundscape — music playback preferences and the ambient background behind the timer.
        </p>

        <div className="setting-row">
          <div>
            <div className="setting-label">Default music volume</div>
            <div className="setting-help">Applied when the music player starts</div>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((musicSettings.volume ?? 0.8) * 100)}
            onChange={(e) => updateMusic({ volume: Number(e.target.value) / 100 })}
            aria-label="Default music volume"
            style={{ width: 160 }}
          />
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Remember last playlist</div>
            <div className="setting-help">Reopens your queue on the next visit — music never starts by itself</div>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={musicSettings.rememberLastPlaylist !== false}
              onChange={(e) => updateMusic({ rememberLastPlaylist: e.target.checked })}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Start music when a focus session begins</div>
            <div className="setting-help">Browsers may still require one click before audio can start</div>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={Boolean(musicSettings.musicOnSessionStart)}
              onChange={(e) => updateMusic({ musicOnSessionStart: e.target.checked })}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label"><Waves size={13} style={{ verticalAlign: '-2px' }} /> Default ambient background</div>
            <div className="setting-help">The scene shown behind the focus dashboard</div>
          </div>
          <select
            className="form-input"
            style={{ width: 200 }}
            value={ambientSettings.enabled === false ? 'off' : (ambientSettings.scene || 'starry-sky')}
            onChange={(e) => {
              if (e.target.value === 'off') updateAmbient({ enabled: false });
              else updateAmbient({ scene: e.target.value, enabled: true });
            }}
            aria-label="Default ambient background"
          >
            {AMBIENT_SCENES.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
            <option value="off">Static background (no animation)</option>
          </select>
        </div>
      </div>

      {/* Data Management */}
      <div className="view-card">
        <h2 className="view-card-title">Data Storage & Portability</h2>
        <p className="view-card-desc">
          Atleratimer stores your data in your browser — and, when signed in, mirrors completed
          sessions to your private Supabase cloud account. No telemetry or tracking cookies.
        </p>

        <div className="setting-row">
          <div>
            <div className="setting-label">Export Data Backup</div>
            <div className="setting-help">Download all timer settings, session history, and weekly logs as JSON</div>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleExportJSON}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={14} />
            <span>Export JSON</span>
          </button>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Clear Session Logs</div>
            <div className="setting-help">Deletes historical entries while retaining cycle configurations</div>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleClearHistory}
            style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Trash2 size={14} />
            <span>Clear History</span>
          </button>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Factory Reset</div>
            <div className="setting-help">Reverts all settings, timers, and storage back to fresh initial state</div>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleResetEverything}
            style={{ color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RotateCcw size={14} />
            <span>Reset Everything</span>
          </button>
        </div>
      </div>

      {/* About Section */}
      <div className="view-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Info size={19} className="stat-card-icon" />
          <h2 className="view-card-title" style={{ margin: 0 }}>About Atleratimer</h2>
        </div>
        <p className="view-card-desc">
          A premium, minimalist, distraction-free productivity and deep-work study timer.
        </p>

        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <ShieldCheck size={18} style={{ color: 'var(--accent-teal)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Subsecond Timestamp-Based Architecture:</strong> Built using absolute timestamp offsets rather than fragile raw intervals, ensuring 100% timekeeping precision even when browser tabs are throttled or placed in the background.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <ShieldCheck size={18} style={{ color: 'var(--accent-teal)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Synthesized Acoustics:</strong> Built-in generative ambient sounds (rain, white noise) and harmonic Tibetan chimes generated directly through Web Audio API without requiring external MP3 streams.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <ShieldCheck size={18} style={{ color: 'var(--accent-teal)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Autonomous Persistence:</strong> Fast, non-blocking local storage serialization keeps all rhythm metrics and session cycles in sync across reloads.
            </div>
          </div>

          <div style={{ marginTop: 12, paddingTop: 14, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Version: <strong>1.0.0 (Release)</strong></span>
            <span>© {YEAR} Atlera by Team Alum · All Rights Reserved</span>
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
