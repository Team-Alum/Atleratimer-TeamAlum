import React, { memo } from 'react';
import { useTimerState } from '../../context/useTimer';
import WeeklyActivityChart from './WeeklyActivityChart';

function WeeklyRhythmCard() {
  const { rhythmText, rhythmBadge } = useTimerState();

  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-card-title">Your rhythm</span>
        <span className="sidebar-section-label" style={{ margin: 0 }}>Last 7 days</span>
      </div>

      <div className="rhythm-metrics-row">
        <div className="rhythm-hours tabular-nums">{rhythmText}</div>
        {rhythmBadge && (
          <div className={`rhythm-badge ${rhythmBadge.type}`}>{rhythmBadge.text}</div>
        )}
      </div>

      {/* 7-Day Chart */}
      <WeeklyActivityChart />
    </div>
  );
}

// Memoised: this component only reads its own context subscriptions and its
// props, so a parent re-render can skip it entirely.
export default memo(WeeklyRhythmCard);
