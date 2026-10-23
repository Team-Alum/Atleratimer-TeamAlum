// AnimatedTime — configurable digit animation system with distinct modes
import React, { memo, useEffect, useRef, useState } from 'react';

function getAnimationDurations(speed) {
  if (speed === 'subtle') return { droplet: 140, slide: 140, bounce: 160, fade: 120 };
  if (speed === 'expressive') return { droplet: 320, slide: 300, bounce: 360, fade: 280 };
  return { droplet: 220, slide: 200, bounce: 240, fade: 200 };
}

function TickDigit({ char, mode, duration, reducedMotion }) {
  const [current, setCurrent] = useState(char);
  const [outgoing, setOutgoing] = useState(char);
  const [animKey, setAnimKey] = useState(0);
  const lastRef = useRef(char);

  useEffect(() => {
    if (lastRef.current === char) {
      setCurrent(char);
      return;
    }
    if (reducedMotion || mode === 'normal') {
      lastRef.current = char;
      setOutgoing(char);
      setCurrent(char);
      setAnimKey((k) => k + 1);
      return;
    }

    setOutgoing(lastRef.current);
    setCurrent(char);
    setAnimKey((k) => k + 1);

    const t = setTimeout(() => {
      lastRef.current = char;
    }, duration + 50);

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
      <span className="tdigit tmode-fade" style={{ '--tanim-dur': `${duration}ms` }}>
        <span className="tdigit-layer tprev" key={`fade-out-${animKey}`}>{outgoing}</span>
        <span className="tdigit-layer tcurr" key={`fade-in-${animKey}`}>{current}</span>
      </span>
    );
  }

  if (effectiveMode === 'slide') {
    return (
      <span className="tdigit tmode-slide" style={{ '--tanim-dur': `${duration}ms` }}>
        <span className="tdigit-layer tprev" key={`slide-out-${animKey}`}>{outgoing}</span>
        <span className="tdigit-layer tcurr" key={`slide-in-${animKey}`}>{current}</span>
      </span>
    );
  }

  if (effectiveMode === 'bounce') {
    return (
      <span className="tdigit tmode-bounce" style={{ '--tanim-dur': `${duration}ms` }}>
        <span className="tdigit-layer tprev" key={`bounce-out-${animKey}`}>{outgoing}</span>
        <span className="tdigit-layer tcurr" key={`bounce-in-${animKey}`}>{current}</span>
      </span>
    );
  }

  if (effectiveMode === 'droplet') {
    return (
      <span className="tdigit tmode-droplet" style={{ '--tanim-dur': `${duration}ms` }}>
        <span className="tdigit-layer tprev" key={`droplet-out-${animKey}`}>{outgoing}</span>
        <span className="tdigit-layer tcurr" key={`droplet-in-${animKey}`}>{current}</span>
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
