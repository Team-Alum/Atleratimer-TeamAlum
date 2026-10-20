import React from 'react';
import { useTimer } from '../../context/useTimer';

export default function CircularTimer() {
  const { timerState, timerSettings } = useTimer();
  const { remainingSeconds, totalSeconds, isRunning, mode, cycleIndex } = timerState;

  // Format time as mm:ss
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Calculate SVG stroke parameters
  const size = 320;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2 - 10; // ~140px
  const circumference = 2 * Math.PI * radius;

  // Clamp progress between 0 and 1
  const progress = totalSeconds > 0 ? Math.min(1, Math.max(0, remainingSeconds / totalSeconds)) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  // Mode title label
  let modeTag = 'DEEP WORK';
  if (mode === 'short_break') modeTag = 'SHORT BREAK';
  if (mode === 'long_break') modeTag = 'LONG BREAK';

  // Sub-status string
  let subStatus = 'Focus in progress';
  if (mode === 'short_break' || mode === 'long_break') {
    subStatus = isRunning ? 'Break in progress' : 'Break paused';
  } else if (!isRunning && remainingSeconds === totalSeconds) {
    subStatus = 'Ready to focus';
  } else {
    subStatus = 'Focus in progress';
  }

  // Format session cycle e.g. SESSION 03 / 04
  const currentFormatted = String(cycleIndex).padStart(2, '0');
  const totalFormatted = String(timerSettings.sessionsPerCycle).padStart(2, '0');
  const sessionCycleText = `SESSION ${currentFormatted} / ${totalFormatted}`;

  return (
    <div className="circular-timer-container">
      <div className="svg-ring-wrapper">
        <svg
          className="timer-svg"
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          aria-label={`Timer countdown: ${timeString}`}
        >
          <defs>
            {/* Linear gradient matching the screenshot's cyan -> teal -> violet/blue ring */}
            <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#62DCE7" />
              <stop offset="45%" stopColor="#078596" />
              <stop offset="100%" stopColor="#A5B4FC" />
            </linearGradient>

            {/* Subtle glow filter */}
            <filter id="timerGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Subtle inner background gradient */}
            <radialGradient id="innerBgGradient" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="var(--bg-card)" />
              <stop offset="100%" stopColor="var(--surface-soft)" />
            </radialGradient>
          </defs>

          {/* Inner circle surface */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - strokeWidth / 2 - 4}
            fill="url(#innerBgGradient)"
            stroke="var(--border-subtle)"
            strokeWidth="1"
          />

          {/* Background circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--surface-soft)"
            strokeWidth={strokeWidth}
          />

          {/* Active progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="url(#timerGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter="url(#timerGlow)"
            style={{
              transition: isRunning ? 'stroke-dashoffset 0.25s linear' : 'stroke-dashoffset 0.4s ease',
            }}
          />
        </svg>

        {/* Center content placed on top of SVG */}
        <div className="timer-inner-content">
          <div className="timer-mode-tag">{modeTag}</div>
          <div className="timer-countdown-text tabular-nums">{timeString}</div>
          <div className={`timer-sub-status ${isRunning ? 'running' : ''}`}>
            <span className="status-dot-pulse" />
            <span>{subStatus}</span>
          </div>
          <div className="timer-cycle-indicator">{sessionCycleText}</div>
        </div>
      </div>
    </div>
  );
}
