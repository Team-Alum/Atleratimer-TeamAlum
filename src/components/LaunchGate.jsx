import React, { useEffect, useState } from 'react';

function getTargetTime() {
  try {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    if (params && params.get('barricade') === 'hide') {
      return null;
    }
  } catch (e) {
    // ignore
  }
  const now = new Date();
  const target = new Date(now);
  target.setHours(9, 0, 0, 0);
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}

function formatTime(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function LaunchGate({ children }) {
  const [target, setTarget] = useState(() => getTargetTime());
  const [now, setNow] = useState(() => Date.now());
  const [hidden, setHidden] = useState(() => {
    try {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      if (params && params.get('barricade') === 'hide') return true;
    } catch {}
    const t = getTargetTime();
    if (!t) return true;
    return Date.now() >= t;
  });

  useEffect(() => {
    if (hidden) return;
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (target && current >= target) {
        setHidden(true);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [target, hidden]);

  if (hidden) {
    return <>{children}</>;
  }

  const remaining = target ? target - now : 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'radial-gradient(1200px 800px at 50% 50%, #0b1026 0%, #05070f 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        color: '#e6edf3',
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        textAlign: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          fontSize: 'clamp(32px, 8vw, 72px)',
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}
      >
        Atlera Timer
      </div>
      <div
        style={{
          fontSize: 'clamp(18px, 4vw, 28px)',
          opacity: 0.8,
          fontWeight: 500,
        }}
      >
        Launching at 9:00 AM
      </div>
      <div
        style={{
          marginTop: '16px',
          fontSize: 'clamp(48px, 12vw, 120px)',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.08em',
        }}
      >
        {formatTime(remaining)}
      </div>
      <div
        style={{
          marginTop: '12px',
          fontSize: 'clamp(14px, 2vw, 18px)',
          opacity: 0.6,
        }}
      >
        The application will be live automatically
      </div>
    </div>
  );
}
