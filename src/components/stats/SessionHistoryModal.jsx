import React, { useState } from 'react';
import { useTimer } from '../../context/useTimer';
import { X, Download, Trash2, Check, Clock } from 'lucide-react';

export default function SessionHistoryModal({ isOpen, onClose }) {
  const { data, setData } = useTimer();
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
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

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleExportJSON}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: 12 }}
              title="Export session data to JSON"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
            <button
              onClick={handleClearHistory}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: 12, color: '#EF4444' }}
              title="Clear all session history"
            >
              <Trash2 size={14} />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* History items list */}
        <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No recorded sessions found.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 14,
                  backgroundColor: 'var(--surface-soft)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: item.completed ? 'var(--completed-bg)' : 'var(--accent-soft)',
                      color: item.completed ? 'var(--accent-teal)' : 'var(--accent-teal)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.completed ? <Check size={16} strokeWidth={2.5} /> : <Clock size={16} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                      {item.date} · {item.startTime} · {item.completed ? 'Completed' : 'In progress'}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
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
