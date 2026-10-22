import React, { memo } from 'react';
import { useTimerState, useTimerActions, useTimerCountdown } from '../../context/useTimer';
import { RotateCcw, Pause, Play, Coffee, VolumeX, Volume2 } from 'lucide-react';

function TimerControls() {
  const { timerState, timerSettings, data } = useTimerState();
  const { toggleTimer, resetTimer, switchPreset, toggleAmbientSound } = useTimerActions();
  const { remainingSeconds } = useTimerCountdown();

  const { isRunning, mode, totalSeconds } = timerState;

  // Calculate elapsed time
  const elapsedSeconds = Math.max(0, totalSeconds - remainingSeconds);
  const elapsedMins = Math.floor(elapsedSeconds / 60);
  const elapsedSecs = elapsedSeconds % 60;
  const elapsedText = `${elapsedMins}:${String(elapsedSecs).padStart(2, '0')} elapsed`;

  // Determine what is "Up next"
  let upNextText = `Up next · ${timerSettings.shortBreakDuration}-minute break`;
  if (mode === 'short_break' || mode === 'long_break') {
    upNextText = `Up next · ${timerSettings.focusDuration}-minute focus session`;
  } else if (timerState.cycleIndex >= timerSettings.sessionsPerCycle) {
    upNextText = `Up next · ${timerSettings.longBreakDuration}-minute long break`;
  }

  return (
    <div>
      {/* Reset & Play/Pause buttons */}
      <div className="timer-controls-row">
        <button
          className="btn-secondary"
          onClick={() => resetTimer()}
          title="Reset current session (Ctrl+R)"
        >
          <RotateCcw size={16} strokeWidth={2.2} />
          <span>Reset</span>
        </button>

        <button
          className="btn-primary-action"
          onClick={toggleTimer}
          title="Start / Pause session (Space)"
        >
          {isRunning ? (
            <>
              <Pause size={17} strokeWidth={2.4} fill="currentColor" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play size={17} strokeWidth={2.4} fill="currentColor" />
              <span>{remainingSeconds < totalSeconds ? 'Resume' : 'Start'}</span>
            </>
          )}
        </button>
      </div>

      {/* Presets Row */}
      <div className="presets-row" role="tablist" aria-label="Session presets">
        <button
          className={`preset-pill ${mode === 'focus' ? 'active' : ''}`}
          onClick={() => switchPreset('focus')}
          role="tab"
          aria-selected={mode === 'focus'}
        >
          Focus {timerSettings.focusDuration}m
        </button>

        <button
          className={`preset-pill ${mode === 'short_break' ? 'active' : ''}`}
          onClick={() => switchPreset('short_break')}
          role="tab"
          aria-selected={mode === 'short_break'}
        >
          Break {timerSettings.shortBreakDuration}m
        </button>

        <button
          className={`preset-pill ${mode === 'long_break' ? 'active' : ''}`}
          onClick={() => switchPreset('long_break')}
          role="tab"
          aria-selected={mode === 'long_break'}
        >
          Long {timerSettings.longBreakDuration}m
        </button>
      </div>

      {/* Up next break info row */}
      <div className="upcoming-info-row">
        <Coffee size={15} className="upcoming-info-icon" />
        <span>{upNextText} / {elapsedText}</span>
      </div>

      {/* Bottom hint row */}
      <div className="timer-card-footer">
        <button
          className={`ambient-toggle-btn ${data.ambientSoundEnabled ? 'active' : ''}`}
          onClick={toggleAmbientSound}
          title="Toggle ambient background focus sound"
        >
          {data.ambientSoundEnabled ? (
            <Volume2 size={15} strokeWidth={2.2} />
          ) : (
            <VolumeX size={15} strokeWidth={2.2} />
          )}
          <span>Ambient sound {data.ambientSoundEnabled ? 'on' : 'off'}</span>
        </button>

        <div className="shortcut-hint">
          Space to pause · Ctrl R to reset
        </div>
      </div>
    </div>
  );
}

// Memoised: this component only reads its own context subscriptions and its
// props, so a parent re-render can skip it entirely.
export default memo(TimerControls);
