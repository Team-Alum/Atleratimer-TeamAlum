import React from 'react';
import { useTimer } from '../../context/useTimer';

export default function WeeklyActivityChart() {
  const { last7DaysData } = useTimer();

  // Find maximum minutes to scale bars proportionately
  const maxMinutes = Math.max(...last7DaysData.map((d) => d.minutes), 90);

  return (
    <div className="weekly-chart-wrapper" role="region" aria-label="7-day focus activity chart">
      {last7DaysData.map((item, index) => {
        // Calculate height percentage, with a minimum 8% for visibility
        const heightPercent = item.minutes > 0 ? Math.max(10, Math.round((item.minutes / maxMinutes) * 100)) : 8;

        return (
          <div
            key={item.dateStr || index}
            className="chart-bar-col"
            title={`${item.dateStr}: ${item.minutes} minutes of focus`}
          >
            <div className="bar-track">
              <div
                className={`bar-pill ${item.isToday ? 'today' : ''}`}
                style={{ height: `${heightPercent}%` }}
              />
            </div>
            <span className={`bar-label ${item.isToday ? 'today' : ''}`}>
              {item.dayInitial}
            </span>
          </div>
        );
      })}
    </div>
  );
}
