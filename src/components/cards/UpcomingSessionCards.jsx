import React, { memo } from 'react';
import { useTimerState, useTimerActions } from '../../context/useTimer';
import { Timer, Coffee, Flag } from 'lucide-react';

function UpcomingSessionCards() {
  const { timerState, timerSettings } = useTimerState();
  const { switchPreset } = useTimerActions();
  const { mode, sessionTitle, cycleIndex } = timerState;

  const isCurrentFocusActive = mode === 'focus';
  const isShortBreakActive = mode === 'short_break';
  const isLongBreakActive = mode === 'long_break';

  const isFinalSession = cycleIndex >= timerSettings.sessionsPerCycle;

  return (
    <div className="bottom-cards-row" role="region" aria-label="Current and upcoming cycle sessions">
      {/* Card 1: Current focus */}
      <div
        className={`upcoming-card ${isCurrentFocusActive ? 'active' : ''}`}
        onClick={() => switchPreset('focus')}
        title="Switch to focus session"
        tabIndex={0}
        role="button"
        aria-current={isCurrentFocusActive ? 'true' : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            switchPreset('focus');
          }
        }}
      >
        <div className="upcoming-card-left">
          <div className="upcoming-icon-box">
            <Timer size={19} strokeWidth={2.2} />
          </div>
          <div>
            <div className="upcoming-title">Current focus</div>
            <div className="upcoming-subtitle">{sessionTitle}</div>
          </div>
        </div>
        <div className="upcoming-duration">
          {isCurrentFocusActive && <span className="upcoming-active-flag">Active</span>}
          {timerSettings.focusDuration} min
        </div>
      </div>

      {/* Card 2: Short break */}
      <div
        className={`upcoming-card ${isShortBreakActive ? 'active' : ''}`}
        onClick={() => switchPreset('short_break')}
        title="Start or configure short break"
        tabIndex={0}
        role="button"
        aria-current={isShortBreakActive ? 'true' : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            switchPreset('short_break');
          }
        }}
      >
        <div className="upcoming-card-left">
          <div className="upcoming-icon-box" style={{ color: 'var(--text-secondary)' }}>
            <Coffee size={19} strokeWidth={2.2} />
          </div>
          <div>
            <div className="upcoming-title">Short break</div>
            <div className="upcoming-subtitle">Stretch. Breathe. Reset.</div>
          </div>
        </div>
        <div className="upcoming-duration">
          {isShortBreakActive && <span className="upcoming-active-flag">Active</span>}
          {timerSettings.shortBreakDuration} min
        </div>
      </div>

      {/* Card 3: Next focus */}
      <div
        className={`upcoming-card ${isLongBreakActive ? 'active' : ''}`}
        onClick={() => switchPreset(isFinalSession ? 'long_break' : 'focus')}
        title={isFinalSession ? 'Final session in this cycle' : `Session ${cycleIndex} of ${timerSettings.sessionsPerCycle}`}
        tabIndex={0}
        role="button"
        aria-current={isLongBreakActive ? 'true' : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            switchPreset(isFinalSession ? 'long_break' : 'focus');
          }
        }}
      >
        <div className="upcoming-card-left">
          <div className="upcoming-icon-box" style={{ color: 'var(--text-secondary)' }}>
            <Flag size={19} strokeWidth={2.2} />
          </div>
          <div>
            <div className="upcoming-title">
              {isFinalSession ? 'Long break' : 'Next focus'}
            </div>
            <div className="upcoming-subtitle">
              {isFinalSession
                ? 'Reward deep work cycle'
                : `Session ${Math.min(cycleIndex + 1, timerSettings.sessionsPerCycle)} of ${timerSettings.sessionsPerCycle}`}
            </div>
          </div>
        </div>
        <div className="upcoming-duration">
          {isLongBreakActive && <span className="upcoming-active-flag">Active</span>}
          {isFinalSession ? timerSettings.longBreakDuration : timerSettings.focusDuration} min
        </div>
      </div>
    </div>
  );
}

// Memoised: this component only reads its own context subscriptions and its
// props, so a parent re-render can skip it entirely.
export default memo(UpcomingSessionCards);
