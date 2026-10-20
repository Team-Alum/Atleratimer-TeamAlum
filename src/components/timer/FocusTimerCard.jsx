import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTimer } from '../../context/useTimer';
import CircularTimer from './CircularTimer';
import TimerControls from './TimerControls';
import { BookOpen, Pencil, Check, Maximize2, Minimize2 } from 'lucide-react';

export default function FocusTimerCard() {
  const { timerState, timerSettings, setSessionTitle } = useTimer();
  const { isRunning, sessionTitle } = timerState;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(sessionTitle);
  const [focusMode, setFocusMode] = useState(false);

  // Fullscreen focus mode: Escape and native-fullscreen exit both close it.
  // Hides all dashboard chrome and keeps only the timer, ambient button and music player interactive/visible
  // so the ambient video stays unobstructed. The timer state lives in TimerContext,
  // so entering or exiting never resets or duplicates the countdown.
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (focusMode) {
      root.classList.add('timer-focus-active');
      body.classList.add('timer-focus-active');
      body.style.overflow = 'hidden';
    } else {
      root.classList.remove('timer-focus-active');
      body.classList.remove('timer-focus-active');
      body.style.overflow = '';
    }
    return () => {
      root.classList.remove('timer-focus-active');
      body.classList.remove('timer-focus-active');
      body.style.overflow = '';
    };
  }, [focusMode]);

  useEffect(() => {
    if (!focusMode) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setFocusMode(false); };
    const onFsChange = () => { if (!document.fullscreenElement) setFocusMode(false); };
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
      document.documentElement.requestFullscreen?.()?.catch?.(() => { /* CSS layout still applies */ });
    } catch { /* ignore — unsupported */ }
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

          <div className={`status-badge ${isRunning ? 'in-progress' : 'in-progress'}`}>
            {isRunning ? 'In progress' : 'In progress'}
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
      <CircularTimer />

      {/* Timer Controls, Presets & Ambient info */}
      <TimerControls />

      {/* Fullscreen focus mode — only timer + controls, ambient video visible. */}
      {focusMode && createPortal(
        <div className="timer-focus-overlay" role="dialog" aria-label="Fullscreen focus timer" aria-modal="false">
          <button type="button" className="focus-exit" onClick={exitFocusMode} title="Exit fullscreen" aria-label="Exit fullscreen timer">
            <Minimize2 size={18} strokeWidth={2.2} />
          </button>
          <div className="focus-timer-stack">
            <CircularTimer />
            <TimerControls />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
