// Minimal Ambient — slow gradient drift and a few soft particles. The
// lightest scene for lower-end machines.

import React, { useCallback } from 'react';
import { useCanvasScene, seededRandom } from '../useCanvasScene';

const PARTICLE_COUNT = 26;
let particleCache = null; // built once on first frame, reused across renders

export default function MinimalAmbient({ reducedMotion }) {
  const draw = useCallback((ctx, w, h, t) => {
    ctx.clearRect(0, 0, w, h);
    if (!particleCache) {
      const rand = seededRandom(303);
      particleCache = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: rand(), y: rand(), r: 1.5 + rand() * 3, speed: 0.004 + rand() * 0.008, drift: rand() * Math.PI * 2,
      }));
    }
    for (const p of particleCache) {
      const y = (p.y - t * p.speed) % 1;
      const x = p.x + Math.sin(t * 0.12 + p.drift) * 0.02;
      ctx.fillStyle = 'rgba(98, 220, 231, 0.08)';
      ctx.beginPath();
      ctx.arc(x * w, (y < 0 ? y + 1 : y) * h, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const canvasRef = useCanvasScene(draw, { staticFrame: reducedMotion });

  return (
    <div className="scene scene-minimal" aria-hidden="true">
      <div className="minimal-base" />
      <div className="minimal-blob blob-a" />
      <div className="minimal-blob blob-b" />
      <div className="minimal-blob blob-c" />
      <canvas ref={canvasRef} className="scene-canvas" />
    </div>
  );
}
