import React from 'react';
import { useTimer } from '../../context/useTimer';
import FocusTimerCard from '../timer/FocusTimerCard';
import TodayFocusCard from '../stats/TodayFocusCard';
import WeeklyRhythmCard from '../stats/WeeklyRhythmCard';
import SessionLogCard from '../stats/SessionLogCard';
import UpcomingSessionCards from '../cards/UpcomingSessionCards';

export default function FocusSessionView() {
  const { timerSettings } = useTimer();

  const footerCycleText = `${timerSettings.sessionsPerCycle} focus sessions per cycle · Long break ${timerSettings.longBreakDuration} min`;

  return (
    <>
      {/* 2-Column Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Left: Primary Focus Timer Card */}
        <FocusTimerCard />

        {/* Right: Productivity Statistics Column */}
        <div className="stats-column">
          <TodayFocusCard />
          <WeeklyRhythmCard />
          <SessionLogCard />
        </div>
      </div>

      {/* Bottom Row of 3 Session Cards */}
      <UpcomingSessionCards />

      {/* Dashboard Bottom Footer */}
      <footer className="workspace-footer">
        <div>{footerCycleText}</div>
        <div>Your focus continues, even when this window is in the background.</div>
      </footer>

      {/* Watermark */}
      <div className="app-watermark" aria-label="Application watermark">
        By &quot;TeamAlum - Sudarshan &amp; Soham&quot;
      </div>
    </>
  );
}
