// DPR-aware canvas scene runner: single rAF loop, paused when the tab is
// hidden, cleaned up on unmount, static frame when motion is reduced.

import { useEffect, useRef } from 'react';

export function useCanvasScene(draw, { staticFrame = false } = {}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let raf = 0;
    let running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const start = performance.now();
    if (staticFrame) {
      draw(ctx, canvas.clientWidth, canvas.clientHeight, 6);
      return () => { running = false; observer.disconnect(); };
    }

    const loop = (now) => {
      if (!running) return;
      draw(ctx, canvas.clientWidth, canvas.clientHeight, (now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf && running) {
        raf = requestAnimationFrame((t) => loop(t));
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [draw, staticFrame]);

  return canvasRef;
}

// Deterministic pseudo-random generator so scenes look the same each mount
export function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
