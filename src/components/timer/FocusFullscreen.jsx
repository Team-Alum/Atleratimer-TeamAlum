import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTimerState, useTimerActions } from '../../context/useTimer';
import { useImmersiveMedia } from '../../music/useImmersiveMedia';
import CircularTimer from './CircularTimer';
import TimerControls from './TimerControls';
import { Minimize2, Sparkles } from 'lucide-react';

export default function FocusFullscreen({ onExit }) {
  const { timerState, timerSettings } = useTimerState();
  const { toggleImmersiveBackground } = useTimerActions();
  const { isImmersive, isVideoPlayable, resolvedThumb } = useImmersiveMedia();
  const { mode, cycleIndex } = timerState;
  const rootRef = useRef(null);
  const returnFocusRef = useRef(null);

  const modeLabel =
    mode === 'short_break'
      ? 'SHORT BREAK'
      : mode === 'long_break'
      ? 'LONG BREAK'
      : 'FOCUS SESSION';
  const cycleText = `Session ${Math.min(
    cycleIndex,
    timerSettings.sessionsPerCycle
  )} / ${timerSettings.sessionsPerCycle}`;

  // Manage fullscreen class on root elements
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    returnFocusRef.current = document.activeElement;
    root.classList.add('atlera-focus-fullscreen');
    body.classList.add('atlera-focus-fullscreen');
    body.style.overflow = 'hidden';

    // Focus the exit button for accessibility
    rootRef.current?.querySelector('.atlera-fs-exit')?.focus();

    return () => {
      root.classList.remove('atlera-focus-fullscreen');
      body.classList.remove('atlera-focus-fullscreen');
      body.style.overflow = '';
      // Return keyboard focus to the control that launched fullscreen
      returnFocusRef.current?.focus?.();
    };
  }, []);

  // Trap keyboard focus inside overlay
  const trapFocus = (event) => {
    if (event.key !== 'Tab' || !rootRef.current) return;
    const nodes = [
      ...rootRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ),
    ].filter((el) => el.offsetParent !== null);
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

  // Thumbnail fallback is active when immersive mode is ON, thumbnail exists, and video isn't playing
  const showThumbnail = isImmersive && !isVideoPlayable && Boolean(resolvedThumb);

  return createPortal(
    <div
      className={`atlera-fs-root${isImmersive ? ' has-immersive' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen focus mode"
      ref={rootRef}
      onKeyDown={trapFocus}
    >
      {/* Layer 1: Dark base background */}
      <div
        className={`atlera-fs-bg${isImmersive && isVideoPlayable ? ' is-video-transparent' : ''}`}
        aria-hidden="true"
      />

      {/* Layer 2: Optional thumbnail background when video is not playing */}
      {showThumbnail && (
        <div className="atlera-fs-media-layer" aria-hidden="true">
          <img src={resolvedThumb} alt="" className="atlera-fs-thumb" />
        </div>
      )}

      {/* Layer 3: Dark overlay / scrim + vignette */}
      <div
        className={`atlera-fs-scrim${isImmersive ? ' has-immersive' : ''}`}
        aria-hidden="true"
      />

      {/* Layer 4: Accessible topbar with Immersive Toggle & Exit Button */}
      <header className="atlera-fs-topbar">
        <button
          type="button"
          className={`atlera-fs-exit atlera-fs-immersive-btn${
            isImmersive ? ' active' : ''
          }`}
          onClick={toggleImmersiveBackground}
          title={`Immersive Music Background: ${isImmersive ? 'On' : 'Off'}`}
          aria-label="Toggle Immersive Music Background"
          aria-pressed={isImmersive}
        >
          <Sparkles size={15} strokeWidth={2.2} />
          <span>Immersive {isImmersive ? 'On' : 'Off'}</span>
        </button>
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

      {/* Layer 5: Complete Foreground Timer UI */}
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
