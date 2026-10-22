import React from 'react';
import { useTimerState, useTimerActions, useTimerCountdown } from '../../context/useTimer';
import { Timer, Check } from 'lucide-react';

export default function SessionLogCard() {
  const { data, timerState } = useTimerState();
  const { setShowHistoryModal } = useTimerActions();
  const { remainingSeconds } = useTimerCountdown();
  const { sessionTitle, isRunning } = timerState;

  // Format remaining time for live session
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const liveTimeString = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // Get completed sessions
  const completedHistory = (data.history || []).filter((h) => h.completed);

  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-card-title">Session log</span>
        <button
          className="view-all-btn"
          onClick={() => setShowHistoryModal(true)}
          aria-label="View all sessions in history"
        >
          View all
        </button>
      </div>

      <div className="session-log-list">
        {/* Active Session Entry */}
        <div className="log-item">
          <div className="log-item-left">
            <div className="log-icon-box active">
              <Timer size={16} strokeWidth={2.2} />
            </div>
            <div>
              <div className="log-title">{sessionTitle}</div>
              <div className="log-sub">
                09:35 · {isRunning ? 'In progress' : 'In progress'}
              </div>
            </div>
          </div>
          <div className="log-time-right active tabular-nums">
            {liveTimeString}
          </div>
        </div>

        {/* Recent Completed Sessions */}
        {completedHistory.slice(0, 2).map((item) => (
          <div key={item.id} className="log-item">
            <div className="log-item-left">
              <div className="log-icon-box completed">
                <Check size={16} strokeWidth={2.5} />
              </div>
              <div>
                <div className="log-title">{item.title}</div>
                <div className="log-sub">
                  {item.startTime} · Completed
                </div>
              </div>
            </div>
            <div className="log-time-right">
              {item.durationMinutes} min
            </div>
          </div>
        ))}

        {completedHistory.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '8px 0' }}>
            No past sessions logged today yet.
          </div>
        )}
      </div>
    </div>
  );
}
