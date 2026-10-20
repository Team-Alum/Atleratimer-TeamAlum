// Starry Sky — twinkling stars and rare shooting stars over a quiet horizon.

import React, { useCallback, useMemo } from 'react';
import { useCanvasScene, seededRandom } from '../useCanvasScene';

export default function StarrySky({ reducedMotion }) {
  const stars = useMemo(() => {
    const rand = seededRandom(1234);
    return Array.from({ length: 160 }, () => ({
      x: rand(),
      y: rand() * 0.72,
      r: 0.4 + rand() * 1.1,
      base: 0.25 + rand() * 0.5,
      twinkle: rand() * Math.PI * 2,
      speed: 0.4 + rand() * 1.1,
    }));
  }, []);

  const shooters = useMemo(() => {
    const rand = seededRandom(99);
    // Sparse, gentle: one every ~25-45s
    return [
      { start: 14, x: 0.72, y: 0.18, len: 0.12 },
      { start: 41, x: 0.3, y: 0.28, len: 0.1 },
      { start: 73, x: 0.55, y: 0.12, len: 0.14 },
    ].map((s) => ({ ...s, period: 96 + rand() * 8 }));
  }, []);

  const draw = useCallback((ctx, w, h, t) => {
    ctx.clearRect(0, 0, w, h);
    for (const star of stars) {
      const twinkle = reducedMotion ? 1 : 0.65 + 0.35 * Math.sin(t * star.speed + star.twinkle);
      ctx.globalAlpha = star.base * twinkle;
      ctx.fillStyle = '#dfe9f5';
      ctx.beginPath();
      ctx.arc(star.x * w, star.y * h, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (!reducedMotion) {
      for (const s of shooters) {
        const local = (t - s.start) % s.period;
        if (local > 0 && local < 1.4) {
          const p = local / 1.4;
          const tail = Math.max(0, 1 - p * 1.4);
          const x = (s.x - s.len * p) * w;
          const y = (s.y + s.len * p * 0.45) * h;
          const grad = ctx.createLinearGradient(x, y, x + s.len * w * 0.4, y - s.len * h * 0.18);
          grad.addColorStop(0, `rgba(223, 233, 245, ${0.85 * tail})`);
          grad.addColorStop(1, 'rgba(223, 233, 245, 0)');
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + s.len * w * 0.4, y - s.len * h * 0.18);
          ctx.stroke();
        }
      }
    }
  }, [stars, shooters, reducedMotion]);

  const canvasRef = useCanvasScene(draw, { staticFrame: reducedMotion });

  return (
    <div className="scene scene-starry" aria-hidden="true">
      <div className="scene-sky" />
      {!reducedMotion && (
        <>
          <div className="star-cloud cloud-a" />
          <div className="star-cloud cloud-b" />
        </>
      )}
      <canvas ref={canvasRef} className="scene-canvas" />
      <div className="starry-horizon" />
    </div>
  );
}
