// Forest Rain — CSS layers (deep green gradient, drifting mist bands) with a
// gentle wind-blown rain canvas. Fallback scene for the licensed forest-rain
// video; also renders a static frame under reduced motion.

import React, { useCallback } from 'react';
import { useCanvasScene, seededRandom } from '../useCanvasScene';

let rainCache = null; // built once on first frame, reused across renders

export default function ForestRain({ reducedMotion }) {
  const draw = useCallback((ctx, w, h, t) => {
    ctx.clearRect(0, 0, w, h);
    if (!rainCache) {
      const rand = seededRandom(88);
      rainCache = Array.from({ length: 80 }, () => ({
        x: rand(), y: rand(), speed: 0.3 + rand() * 0.45, len: 8 + rand() * 12,
      }));
    }
    ctx.strokeStyle = 'rgba(188, 214, 198, 0.22)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (const drop of rainCache) {
      const y = ((drop.y + t * drop.speed) % 1.1) * h - drop.len;
      const x = drop.x * w;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2.2, y + drop.len);
    }
    ctx.stroke();
  }, []);

  const canvasRef = useCanvasScene(draw, { staticFrame: reducedMotion });

  return (
    <div className="scene scene-forest" aria-hidden="true">
      <div className="forest-sky" />
      <div className="forest-mist mist-a" />
      <div className="forest-mist mist-b" />
      <div className="forest-treeline" />
      <canvas ref={canvasRef} className="scene-canvas" />
    </div>
  );
}
