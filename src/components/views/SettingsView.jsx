import React from 'react';
import { useTimer } from '../../context/useTimer';
import { storageService } from '../../services/storageService';
import { Download, Trash2, RotateCcw, Info, ShieldCheck } from 'lucide-react';

export default function SettingsView() {
  const { data, setData, setActiveView } = useTimer();

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
      {/* Data Management */}
      <div className="view-card">
        <h2 className="view-card-title">Data Storage & Portability</h2>
        <p className="view-card-desc">
          Atleratimer stores 100% of your data locally in your browser without telemetry or tracking cookies.
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
            <span>Atleratimer Focus Suite</span>
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
