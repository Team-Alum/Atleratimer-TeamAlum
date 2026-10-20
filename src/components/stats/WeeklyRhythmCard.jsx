import React from 'react';
import { useTimer } from '../../context/useTimer';
import WeeklyActivityChart from './WeeklyActivityChart';

export default function WeeklyRhythmCard() {
  const { rhythmText } = useTimer();

  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-card-title">Your rhythm</span>
        <span className="sidebar-section-label" style={{ margin: 0 }}>Last 7 days</span>
      </div>

      <div className="rhythm-metrics-row">
        <div className="rhythm-hours tabular-nums">{rhythmText}</div>
        <div className="rhythm-badge">+18% this week</div>
      </div>

      {/* 7-Day Chart */}
      <WeeklyActivityChart />
    </div>
  );
}
