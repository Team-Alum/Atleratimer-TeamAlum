import React from 'react';
import { useTimerState, useTimerCountdown } from '../../context/useTimer';
import AnimatedTime from './AnimatedTime';
import DialFace from './DialFace';
import { getDialLook } from './dialStyle';

export default function CircularTimer() {
  const { timerState, timerSettings, data } = useTimerState();
  const { remainingSeconds } = useTimerCountdown();
  const { totalSeconds, isRunning, mode, cycleIndex } = timerState;

  // Dial-only appearance. The resolved palette is published as CSS custom
  // properties on this container, so no other part of the app is affected.
  const look = getDialLook(data?.dialStyle);

  // Format time as mm:ss
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Clamp progress between 0 and 1
  const progress = totalSeconds > 0 ? Math.min(1, Math.max(0, remainingSeconds / totalSeconds)) : 0;

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
    <div
      className="circular-timer-container"
      role="group"
      aria-label={`Timer countdown: ${timeString}`}
    >
      <DialFace
        progress={progress}
        strokeWidth={look.strokeWidth}
        effect={look.effect}
        comfort={look.comfort}
        style={look.vars}
      >
        <div className="timer-mode-tag">{modeTag}</div>
        <div className="timer-countdown-text tabular-nums"><AnimatedTime value={timeString} /></div>
        <div className={`timer-sub-status ${isRunning ? 'running' : ''}`}>
          <span className="status-dot-pulse" />
          <span>{subStatus}</span>
        </div>
        <div className="timer-cycle-indicator">{sessionCycleText}</div>
      </DialFace>
    </div>
  );
}
