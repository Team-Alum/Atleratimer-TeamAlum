import React from 'react';
import { useTimer } from '../../context/useTimer';
import { Target } from 'lucide-react';

export default function TodayFocusCard() {
  const { todayFocusMinutes, completedFocusSessionsToday, timerSettings } = useTimer();

  const goalMinutes = timerSettings.dailyGoalMinutes || 100;
  const progressPercent = Math.min(100, Math.round((todayFocusMinutes / goalMinutes) * 100));

  let motivationalText = 'Halfway there. One session at a time.';
  if (progressPercent === 0) {
    motivationalText = 'Ready to begin? Take the first step today.';
  } else if (progressPercent < 40) {
    motivationalText = 'Great start. Every focused block builds momentum.';
  } else if (progressPercent >= 100) {
    motivationalText = 'Daily focus goal accomplished! Extraordinary work.';
  } else if (progressPercent >= 75) {
    motivationalText = 'Almost at the finish line for today. Keep going.';
  }

  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-card-title">Today's focus</span>
        <Target size={18} className="stat-card-icon" strokeWidth={2.2} />
      </div>

      <div className="today-metrics-row">
        <div>
          <span className="metric-big tabular-nums">{todayFocusMinutes}</span>
          <span className="metric-unit"> / {goalMinutes} min</span>
        </div>

        <div className="sessions-complete-block">
          <div className="sessions-number tabular-nums">{completedFocusSessionsToday}</div>
          <div className="sessions-label">sessions complete</div>
        </div>
      </div>

      <div className="progress-bar-container" title={`${progressPercent}% of daily goal`}>
        <div
          className="progress-bar-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="stat-card-subtext">{motivationalText}</div>
    </div>
  );
}
