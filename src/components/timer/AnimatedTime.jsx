// AnimatedTime — configurable digit animation system with distinct modes
import React, { memo, useEffect, useRef, useState } from 'react';

function getAnimationDurations(speed) {
  if (speed === 'subtle') return { droplet: 150, slide: 150, bounce: 170, fade: 130 };
  if (speed === 'expressive') return { droplet: 340, slide: 320, bounce: 380, fade: 300 };
  return { droplet: 230, slide: 210, bounce: 260, fade: 220 };
}

function TickDigit({ char, mode, duration, reducedMotion }) {
  const [displayChar, setDisplayChar] = useState(char);
  const [prevChar, setPrevChar] = useState(char);
  const [animating, setAnimating] = useState(false);
  const lastCharRef = useRef(char);

  useEffect(() => {
    if (lastCharRef.current === char) {
      setDisplayChar(char);
      return;
    }
    if (reducedMotion || mode === 'normal') {
      lastCharRef.current = char;
      setPrevChar(char);
      setDisplayChar(char);
      setAnimating(false);
      return;
    }

    // Start animation: show previous char animating out, current char animating in
    setPrevChar(lastCharRef.current);
    setDisplayChar(char);
    setAnimating(true);

    const t = setTimeout(() => {
      setAnimating(false);
      lastCharRef.current = char;
    }, duration + 40);

    return () => clearTimeout(t);
  }, [char, duration, reducedMotion, mode]);

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
        <span className={`tdigit-layer tprev ${animating ? 'fade-out' : ''}`}>{prevChar}</span>
        <span className={`tdigit-layer tcurr ${animating ? 'fade-in' : ''}`}>{displayChar}</span>
      </span>
    );
  }

  if (effectiveMode === 'slide') {
    return (
      <span className={`tdigit tmode-slide ${animating ? 'is-animating' : ''}`} style={{ '--tanim-dur': `${duration}ms` }}>
        <span className={`tdigit-layer tprev ${animating ? 'slide-out' : ''}`}>{prevChar}</span>
        <span className={`tdigit-layer tcurr ${animating ? 'slide-in' : ''}`}>{displayChar}</span>
      </span>
    );
  }

  if (effectiveMode === 'bounce') {
    return (
      <span className={`tdigit tmode-bounce ${animating ? 'is-animating' : ''}`} style={{ '--tanim-dur': `${duration}ms` }}>
        <span className={`tdigit-layer tprev ${animating ? 'slide-out' : ''}`}>{prevChar}</span>
        <span className={`tdigit-layer tcurr ${animating ? 'bounce-in' : ''}`}>{displayChar}</span>
      </span>
    );
  }

  if (effectiveMode === 'droplet') {
    return (
      <span className={`tdigit tmode-droplet ${animating ? 'is-animating' : ''}`} style={{ '--tanim-dur': `${duration}ms` }}>
        <span className={`tdigit-layer tprev ${animating ? 'droplet-out' : ''}`}>{prevChar}</span>
        <span className={`tdigit-layer tcurr ${animating ? 'droplet-in' : ''}`}>{displayChar}</span>
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
  let modeDur = 0;
  if (mode === 'droplet') modeDur = durations.droplet;
  else if (mode === 'slide') modeDur = durations.slide;
  else if (mode === 'bounce') modeDur = durations.bounce;
  else if (mode === 'fade') modeDur = durations.fade;

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
