// AnimatedTime — configurable digit animation system with multiple modes
// Animations are presentation-only; the source of truth comes from props
import React, { memo, useEffect, useState } from 'react';

function getAnimationDurations(speed) {
  // Durations in ms
  if (speed === 'subtle') return { droplet: 140, slide: 140, bounce: 160, fade: 120 };
  if (speed === 'expressive') return { droplet: 320, slide: 320, bounce: 340, fade: 280 };
  // balanced
  return { droplet: 220, slide: 220, bounce: 240, fade: 200 };
}

function TickDigit({ char, mode, duration, reducedMotion }) {
  const [prevChar, setPrevChar] = useState(char);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState('in');

  useEffect(() => {
    if (prevChar === char) return;
    if (reducedMotion || mode === 'normal') {
      setPrevChar(char);
      return;
    }
    setDirection('out');
    setAnimating(true);
    const t = setTimeout(() => {
      setPrevChar(char);
      setDirection('in');
    }, duration * 0.6);
    const t2 = setTimeout(() => {
      setAnimating(false);
    }, duration + 50);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [char, prevChar, duration, reducedMotion, mode]);

  const effectiveMode = reducedMotion ? 'normal' : mode;

  if (effectiveMode === 'normal') {
    return (
      <span className="tdigit">
        <span className="tdigit-inner">{char}</span>
      </span>
    );
  }

  if (effectiveMode === 'fade') {
    return (
      <span className={`tdigit tmode-fade ${animating ? 'is-animating' : ''}`} style={{ '--tanim-dur': `${duration}ms` }}>
        <span className={`tdigit-inner tinner-prev ${animating && direction === 'out' ? 'fade-out' : ''}`}>{prevChar}</span>
        <span className={`tdigit-inner tinner-current ${animating && direction === 'in' ? 'fade-in' : ''}`}>{char}</span>
      </span>
    );
  }

  if (effectiveMode === 'slide') {
    return (
      <span className={`tdigit tmode-slide ${animating ? 'is-animating' : ''}`} style={{ '--tanim-dur': `${duration}ms` }}>
        <span className={`tdigit-inner tinner-stack tinner-prev ${animating && direction === 'out' ? 'slide-out' : ''}`}>{prevChar}</span>
        <span className={`tdigit-inner tinner-stack tinner-current ${animating && direction === 'in' ? 'slide-in' : ''}`}>{char}</span>
      </span>
    );
  }

  if (effectiveMode === 'bounce') {
    return (
      <span className={`tdigit tmode-bounce ${animating ? 'is-animating' : ''}`} style={{ '--tanim-dur': `${duration}ms` }}>
        <span className={`tdigit-inner tinner-stack tinner-prev ${animating && direction === 'out' ? 'bounce-out' : ''}`}>{prevChar}</span>
        <span className={`tdigit-inner tinner-stack tinner-current ${animating && direction === 'in' ? 'bounce-in' : ''}`}>{char}</span>
      </span>
    );
  }

  if (effectiveMode === 'droplet') {
    return (
      <span className={`tdigit tmode-droplet ${animating ? 'is-animating' : ''}`} style={{ '--tanim-dur': `${duration}ms` }}>
        <span className={`tdigit-inner tinner-stack tinner-prev ${animating && direction === 'out' ? 'droplet-out' : ''}`}>{prevChar}</span>
        <span className={`tdigit-inner tinner-stack tinner-current ${animating && direction === 'in' ? 'droplet-in' : ''}`}>{char}</span>
      </span>
    );
  }

  return (
    <span className="tdigit">
      <span className="tdigit-inner">{char}</span>
    </span>
  );
}

function AnimatedTime({ value, mode = 'normal', speed = 'balanced', reducedMotion = false }) {
  const durations = getAnimationDurations(speed);
  const modeDur = mode === 'droplet' ? durations.droplet : mode === 'slide' ? durations.slide : mode === 'bounce' ? durations.bounce : mode === 'fade' ? durations.fade : 0;

  return (
    <span className="animated-time" aria-hidden="true">
      {value.split('').map((ch, i) => {
        if (ch === ':') {
          return <span className="tdigit colon" key={`colon-${i}`}>:</span>;
        }
        return <TickDigit char={ch} key={`d-${i}`} mode={mode} duration={modeDur} reducedMotion={reducedMotion} />;
      })}
    </span>
  );
}

export default memo(AnimatedTime);
