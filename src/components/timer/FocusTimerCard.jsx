import React, { memo, useCallback, useEffect, useState } from 'react';
import { useTimerState, useTimerActions } from '../../context/useTimer';
import CircularTimer from './CircularTimer';
import DurationEditor from './DurationEditor';
import TimerControls from './TimerControls';
import FocusFullscreen from './FocusFullscreen';
import { BookOpen, Pencil, Check, Maximize2 } from 'lucide-react';

function FocusTimerCard() {
  const { timerState, timerSettings } = useTimerState();
  const { setSessionTitle } = useTimerActions();
  const { isRunning, sessionTitle } = timerState;

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

  // Format next session duration string, e.g. "NEXT 25 : 00"
  const nextDurationStr = `NEXT  ${String(timerSettings.focusDuration).padStart(2, '0')} : 00`;

  return (
    <div className="timer-card">
      {/* Card Header */}
      <div className="timer-card-header">
        <div className="session-title-group">
          <BookOpen size={19} className="session-icon" strokeWidth={2} />
          {isEditingTitle ? (
            <form onSubmit={handleSaveTitle} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                autoFocus
                className="form-input"
                style={{ padding: '4px 8px', fontSize: 15, width: 170 }}
              />
              <button type="submit" className="edit-title-btn" title="Save title">
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
          <div className="next-pill">
            <span>{nextDurationStr}</span>
            <Pencil size={12} strokeWidth={2.2} style={{ opacity: 0.6 }} />
          </div>

          <div className={`status-badge ${isRunning ? 'in-progress' : 'is-paused'}`}>
            <span className="status-badge-dot" aria-hidden="true" />
            {isRunning ? 'In progress' : 'Paused'}
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
