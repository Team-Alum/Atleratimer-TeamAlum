// Cozy Room — warm desk light, a rainy night window, soft shadows.
// Almost entirely CSS; only the rain behind the glass uses canvas.

import React, { useCallback } from 'react';
import { useCanvasScene, seededRandom } from '../useCanvasScene';

let rainCache = null; // built once on first frame, reused across renders

export default function CozyRoom({ reducedMotion }) {
  const draw = useCallback((ctx, w, h, t) => {
    ctx.clearRect(0, 0, w, h);
    if (!rainCache) {
      const rand = seededRandom(11);
      rainCache = Array.from({ length: 26 }, () => ({
        x: rand(), y: rand(), speed: 0.5 + rand() * 0.4, len: 6 + rand() * 6,
      }));
    }
    ctx.strokeStyle = 'rgba(170, 195, 220, 0.3)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (const drop of rainCache) {
      const y = ((drop.y + t * drop.speed) % 1.1) * h - drop.len;
      const x = drop.x * w;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 0.8, y + drop.len);
    }
    ctx.stroke();
  }, []);

  const canvasRef = useCanvasScene(draw, { staticFrame: reducedMotion });

  return (
    <div className="scene scene-cozy" aria-hidden="true">
      <div className="cozy-wall" />
      <div className="cozy-window">
        <div className="cozy-window-sky" />
        <canvas ref={canvasRef} className="scene-canvas cozy-window-rain" />
        <div className="cozy-window-frame" />
      </div>
      <div className="cozy-shelf">
        <div className="cozy-books" />
        <div className="cozy-plant" />
      </div>
      <div className="cozy-desk" />
      <div className="cozy-lamp">
        <div className="cozy-lamp-glow" />
        <div className="cozy-lamp-head" />
        <div className="cozy-lamp-arm" />
      </div>
      <div className="cozy-mug" />
    </div>
  );
}
