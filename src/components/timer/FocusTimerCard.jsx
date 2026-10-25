import React, { memo, useCallback, useEffect, useState } from 'react';
import { useTimerState, useTimerActions, useTimerCountdown } from '../../context/useTimer';
import CircularTimer from './CircularTimer';
import DurationEditor from './DurationEditor';
import TimerControls from './TimerControls';
import FocusFullscreen from './FocusFullscreen';
import { BookOpen, Pencil, Check, Maximize2 } from 'lucide-react';

function FocusTimerCard() {
  const { timerState, timerSettings } = useTimerState();
  const { setSessionTitle } = useTimerActions();
  const { isRunning, sessionTitle, mode, cycleIndex, totalSeconds } = timerState;
  const { remainingSeconds } = useTimerCountdown();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(sessionTitle);
  const [focusMode, setFocusMode] = useState(false);
  const [durationEditorOpen, setDurationEditorOpen] = useState(false);

  const openDurationEditor = useCallback(() => setDurationEditorOpen(true), []);
  const closeDurationEditor = useCallback(() => setDurationEditorOpen(false), []);

  // Browser fullscreen + app state (state lives in TimerContext; never reset)
  useEffect(() => {
    if (!focusMode) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setFocusMode(false); };
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        setFocusMode(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, [focusMode]);

  const enterFocusMode = () => {
    setFocusMode(true);
    try {
      const el = document.documentElement;
      el.requestFullscreen?.()?.catch?.(() => {});
    } catch { /* ignore */ }
  };

  const exitFocusMode = () => {
    setFocusMode(false);
    try {
      if (document.fullscreenElement) document.exitFullscreen?.()?.catch?.(() => {});
    } catch { /* ignore */ }
  };

  const handleSaveTitle = (e) => {
    e.preventDefault();
    if (tempTitle.trim()) {
      setSessionTitle(tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  // What comes after the session currently on the dial. Kept in sync with the
  // "Up next" row in TimerControls so the two never contradict each other.
  const nextMinutes = mode === 'focus'
    ? (cycleIndex >= timerSettings.sessionsPerCycle
      ? timerSettings.longBreakDuration
      : timerSettings.shortBreakDuration)
    : timerSettings.focusDuration;
  const nextDurationStr = `${String(nextMinutes).padStart(2, '0')}:00`;

  // Idle at the full duration means the session has not started yet.
  const isFresh = !isRunning && remainingSeconds >= totalSeconds;
  const statusLabel = isRunning ? 'In progress' : isFresh ? 'Ready' : 'Paused';
  const statusClass = isRunning ? 'in-progress' : isFresh ? 'is-ready' : 'is-paused';

  return (
    <div className="timer-card">
      {/* Card Header */}
      <div className="timer-card-header">
        <div className="session-title-group">
          <BookOpen size={19} className="session-icon" strokeWidth={2} />
          {isEditingTitle ? (
            <form className="session-title-form" onSubmit={handleSaveTitle}>
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    setTempTitle(sessionTitle);
                    setIsEditingTitle(false);
                  }
                }}
                onFocus={(e) => e.currentTarget.select()}
                maxLength={60}
                autoFocus
                aria-label="Session title"
                className="form-input session-title-input"
              />
              <button type="submit" className="edit-title-btn" title="Save title" aria-label="Save title">
                <Check size={16} />
              </button>
            </form>
          ) : (
            <>
              <span className="session-title-text">{sessionTitle}</span>
              <button
                className="edit-title-btn"
                onClick={() => {
                  setTempTitle(sessionTitle);
                  setIsEditingTitle(true);
                }}
                title="Edit session title"
                aria-label="Edit session title"
              >
                <Pencil size={15} strokeWidth={2} />
              </button>
            </>
          )}
        </div>

        <div className="timer-card-header-right">
          <div className="next-pill" title={`Next session: ${nextMinutes} minutes`}>
            <span className="next-pill-label">NEXT</span>
            <span>{nextDurationStr}</span>
          </div>

          <div className={`status-badge ${statusClass}`}>
            <span className="status-badge-dot" aria-hidden="true" />
            {statusLabel}
          </div>

          <button
            type="button"
            className="edit-title-btn focus-launch"
            onClick={enterFocusMode}
            title="Fullscreen timer"
            aria-label="Fullscreen timer"
          >
            <Maximize2 size={14} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* SVG Circular Countdown */}
      <CircularTimer onEditDuration={openDurationEditor} />

      {/* Timer Controls, Presets & Ambient info */}
      <TimerControls />

      {/* Compact inline duration editor (portal, uses the same timer state) */}
      {durationEditorOpen && <DurationEditor onClose={closeDurationEditor} />}

      {/* Dedicated fullscreen focus layout (single timer instance) */}
      {focusMode && <FocusFullscreen onExit={exitFocusMode} />}
    </div>
  );
}

// Memoised: this component only reads its own context subscriptions and its
// props, so a parent re-render can skip it entirely.
export default memo(FocusTimerCard);
