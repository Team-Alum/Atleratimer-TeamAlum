import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTimerState } from '../../context/useTimer';
import CircularTimer from './CircularTimer';
import TimerControls from './TimerControls';
import { Minimize2 } from 'lucide-react';

export default function FocusFullscreen({ onExit }) {
  const { timerState, timerSettings } = useTimerState();
  const { mode, cycleIndex } = timerState;
  const rootRef = useRef(null);
  const returnFocusRef = useRef(null);

  const modeLabel = mode === 'short_break' ? 'SHORT BREAK' : mode === 'long_break' ? 'LONG BREAK' : 'FOCUS SESSION';
  const cycleText = `Session ${Math.min(cycleIndex + 1, timerSettings.sessionsPerCycle)} / ${timerSettings.sessionsPerCycle}`;

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    returnFocusRef.current = document.activeElement;
    root.classList.add('atlera-focus-fullscreen');
    body.classList.add('atlera-focus-fullscreen');
    body.style.overflow = 'hidden';
    rootRef.current?.querySelector('.atlera-fs-exit')?.focus();

    return () => {
      root.classList.remove('atlera-focus-fullscreen');
      body.classList.remove('atlera-focus-fullscreen');
      body.style.overflow = '';
      // Return the keyboard to the control that opened the overlay.
      returnFocusRef.current?.focus?.();
    };
  }, []);

  // Keep focus inside the overlay while it is open.
  const trapFocus = (event) => {
    if (event.key !== 'Tab' || !rootRef.current) return;
    const nodes = [...rootRef.current.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter((el) => el.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      className="atlera-fs-root"
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen focus mode"
      ref={rootRef}
      onKeyDown={trapFocus}
    >
      <div className="atlera-fs-bg" aria-hidden="true" />
      <div className="atlera-fs-scrim" aria-hidden="true" />

      <header className="atlera-fs-topbar">
        <button
          type="button"
          className="atlera-fs-exit"
          onClick={onExit}
          title="Exit fullscreen"
          aria-label="Exit fullscreen"
        >
          <Minimize2 size={18} strokeWidth={2.2} />
          <span>Exit</span>
        </button>
      </header>

      <main className="atlera-fs-main">
        <div className="atlera-fs-timer-block">
          <div className="atlera-fs-label">{modeLabel}</div>
          <div className="atlera-fs-circle-wrap">
            <CircularTimer />
          </div>
          <div className="atlera-fs-subline">
            <span className="atlera-fs-cycle">{cycleText}</span>
          </div>
        </div>

        <section className="atlera-fs-controls" aria-label="Timer controls">
          <TimerControls />
        </section>
      </main>
    </div>,
    document.body
  );
}
