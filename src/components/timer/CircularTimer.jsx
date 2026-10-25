import React from 'react';
import { Pencil } from 'lucide-react';
import { useTimerState, useTimerCountdown } from '../../context/useTimer';
import AnimatedTime from './AnimatedTime';
import DialFace from './DialFace';
import { getDialLook } from './dialStyle';
import { getAtmosphereRing } from '../../theme/atmospheres';
import { formatDurationLabel } from '../../constants/durations';

export default function CircularTimer({ onEditDuration }) {
  const { timerState, timerSettings, data, theme } = useTimerState();
  const { remainingSeconds } = useTimerCountdown();
  const { totalSeconds, isRunning, mode, cycleIndex } = timerState;

  // Dial-only appearance. The resolved palette is published as CSS custom
  // properties on this container, so no other part of the app is affected.
  // When the scheme is "Atmosphere", the active preset supplies the ring.
  const atmosphereRing = getAtmosphereRing(data?.atmosphere, theme);
  const look = getDialLook(data?.dialStyle, atmosphereRing);

  // Format time as HH:MM:SS if >= 1 hour, else MM:SS
  const totalHours = Math.floor(remainingSeconds / 3600);
  let timeString;
  if (totalHours >= 1) {
    const hours = totalHours;
    const minutesPart = Math.floor((remainingSeconds % 3600) / 60);
    const secondsPart = remainingSeconds % 60;
    timeString = `${String(hours).padStart(2, '0')}:${String(minutesPart).padStart(2, '0')}:${String(secondsPart).padStart(2, '0')}`;
  } else {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

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
  } else if (!isRunning) {
    subStatus = 'Focus paused';
  } else {
    subStatus = 'Focus in progress';
  }

  // Format session cycle e.g. SESSION 03 / 04
  const currentFormatted = String(cycleIndex).padStart(2, '0');
  const totalFormatted = String(timerSettings.sessionsPerCycle).padStart(2, '0');
  const sessionCycleText = `SESSION ${currentFormatted} / ${totalFormatted}`;

  const durationLabel = formatDurationLabel(Math.max(0, Math.ceil(remainingSeconds / 60)));
  const isHHMMSS = totalHours >= 1;
  const countdownClass = `timer-countdown-text${isHHMMSS ? ' is-hhmmss' : ''}`;
  const durationButtonClass = `timer-duration-button${isHHMMSS ? ' timer-duration-button--hhmmss' : ''}`;
  const animatedTime = (
    <AnimatedTime
      value={timeString}
      mode={data?.digitAnimation?.mode || 'normal'}
      speed={data?.digitAnimation?.speed || 'balanced'}
      reducedMotion={!!data?.reducedMotion}
    />
  );

  return (
    <div
      className="circular-timer-container"
      role="group"
      aria-label={`Timer countdown: ${durationLabel} remaining`}
    >
      <DialFace
        progress={progress}
        strokeWidth={look.strokeWidth}
        effect={look.effect}
        comfort={look.comfort}
        running={isRunning}
        style={look.vars}
      >
        <div className="timer-mode-tag">{modeTag}</div>
        {onEditDuration ? (
          <button
            type="button"
            className={`${countdownClass} ${durationButtonClass}`}
            onClick={onEditDuration}
            aria-label={`Edit timer duration. Current duration is ${durationLabel}.`}
            aria-haspopup="dialog"
            title="Edit timer duration"
          >
            {animatedTime}
            <Pencil className="timer-duration-edit-icon" size={13} strokeWidth={2.2} aria-hidden="true" />
          </button>
        ) : (
          <div className={countdownClass}>{animatedTime}</div>
        )}
        <div className={`timer-sub-status ${isRunning ? 'running' : ''}`}>
          <span className="status-dot-pulse" />
          <span>{subStatus}</span>
        </div>
        <div className="timer-cycle-indicator">{sessionCycleText}</div>
      </DialFace>
    </div>
  );
}
