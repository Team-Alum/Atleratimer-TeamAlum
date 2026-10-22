import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTimerState } from '../../context/useTimer';
import CircularTimer from './CircularTimer';
import TimerControls from './TimerControls';
import { Minimize2 } from 'lucide-react';

export default function FocusFullscreen({ onExit }) {
  const { timerState, timerSettings } = useTimerState();
  const { mode, cycleIndex } = timerState;

  const modeLabel = mode === 'short_break' ? 'SHORT BREAK' : mode === 'long_break' ? 'LONG BREAK' : 'FOCUS SESSION';
  const cycleText = `Session ${Math.min(cycleIndex + 1, timerSettings.sessionsPerCycle)} / ${timerSettings.sessionsPerCycle}`;

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.add('atlera-focus-fullscreen');
    body.classList.add('atlera-focus-fullscreen');
    body.style.overflow = 'hidden';

    return () => {
      root.classList.remove('atlera-focus-fullscreen');
      body.classList.remove('atlera-focus-fullscreen');
      body.style.overflow = '';
    };
  }, []);

  return createPortal(
    <div className="atlera-fs-root" role="dialog" aria-modal="true" aria-label="Fullscreen focus mode">
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
