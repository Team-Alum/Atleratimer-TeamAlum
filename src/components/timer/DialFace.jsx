import React, { useId } from 'react';

// The visible dial: gradient track, progress arc and optional aurora halo.
//
// Shared by the live timer and the customization preview so both always render
// exactly the same look. Colours come from the `--dial-*` custom properties set
// by the caller (see getDialLook in ./dialStyle), which is what keeps every
// colour effect scoped to the dial itself.
export default function DialFace({
  progress = 0,
  strokeWidth = 12,
  effect = 'glow',
  comfort = 'balanced',
  style,
  children,
}) {
  const idPrefix = `dial-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const size = 320;
  const radius = (size - strokeWidth) / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const strokeDashoffset = circumference * (1 - clamped);

  return (
    <div className={`svg-ring-wrapper dial-face dial-effect--${effect} dial-comfort--${comfort}`} style={style}>
      {effect === 'aurora' && <span className="dial-aurora" aria-hidden="true" />}

      <svg
        className="timer-svg"
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={`${idPrefix}-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'var(--dial-a)' }} />
            <stop offset="45%" style={{ stopColor: 'var(--dial-b)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--dial-c)' }} />
          </linearGradient>

          <radialGradient id={`${idPrefix}-bg`} cx="50%" cy="50%" r="50%">
            <stop offset="70%" style={{ stopColor: 'var(--bg-card)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--surface-soft)' }} />
          </radialGradient>
        </defs>

        {/* Inner circle surface */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius - strokeWidth / 2 - 4}
          fill={`url(#${idPrefix}-bg)`}
          stroke="var(--border-subtle)"
          strokeWidth="1"
        />

        {/* Background circle track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="var(--surface-soft)"
          strokeWidth={strokeWidth}
        />

        {/* Active progress ring */}
        <circle
          className="dial-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={`url(#${idPrefix}-ring)`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>

      {/* Center content placed on top of the SVG */}
      <div className="timer-inner-content">{children}</div>
    </div>
  );
}
