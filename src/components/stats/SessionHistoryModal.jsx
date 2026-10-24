import React, { memo, useState } from 'react';
import { useTimerState, useTimerActions } from '../../context/useTimer';
import { X, Download, Trash2, Check, Clock } from 'lucide-react';

function SessionHistoryModal({ isOpen, onClose }) {
  const { data } = useTimerState();
  const { setData } = useTimerActions();
  const [filter, setFilter] = useState('all'); // 'all', 'focus', 'break'

  if (!isOpen) return null;

  const history = data.history || [];
  const filtered = history.filter((item) => {
    if (filter === 'focus') return item.type === 'focus';
    if (filter === 'break') return item.type !== 'focus';
    return true;
  });

  const handleExportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `atleratimer-export-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your session history? This action cannot be undone.')) {
      setData((prev) => ({
        ...prev,
        history: [],
      }));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Session History Log</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>

        {/* Filter & Export actions */}
        <div className="modal-toolbar">
          <div className="modal-filter-row">
            {['all', 'focus', 'break'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`preset-pill ${filter === f ? 'active' : ''}`}
                style={{ fontSize: 12, padding: '4px 12px' }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="modal-action-row">
            <button
              onClick={handleExportJSON}
              className="btn-secondary modal-action-btn"
              title="Export session data to JSON"
              aria-label="Export session data to JSON"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
            <button
              onClick={handleClearHistory}
              className="btn-secondary modal-action-btn danger"
              title="Clear all session history"
              aria-label="Clear all session history"
            >
              <Trash2 size={14} />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* History items list */}
        <div className="modal-list">
          {filtered.length === 0 ? (
            <div className="modal-empty">
              No recorded sessions found.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="modal-history-item"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    className={`modal-history-icon ${item.completed ? 'completed' : 'active'}`}
                  >
                    {item.completed ? <Check size={16} strokeWidth={2.5} /> : <Clock size={16} />}
                  </div>
                  <div>
                    <div className="modal-history-title">
                      {item.title}
                    </div>
                    <div className="modal-history-meta">
                      {item.date} · {item.startTime} · {item.completed ? 'Completed' : 'In progress'}
                    </div>
                  </div>
                </div>

                <div className="modal-history-duration">
                  {item.durationMinutes} min
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Memoised: this component only reads its own context subscriptions and its
// props, so a parent re-render can skip it entirely.
export default memo(SessionHistoryModal);
