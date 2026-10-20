// Rainy Night — layered city skyline (CSS) + depth rain and gentle lightning.

import React, { useCallback, useMemo } from 'react';
import { useCanvasScene, seededRandom } from '../useCanvasScene';

const RAIN_LAYER_COUNT = 3;
let rainLayers = null; // built once on first frame, reused across renders

function makeRain(count, rand, { speed, width, opacity, len }) {
  return Array.from({ length: count }, () => ({
    x: rand(),
    y: rand(),
    speed: speed * (0.75 + rand() * 0.5),
    width,
    opacity,
    len: len * (0.7 + rand() * 0.6),
    drift: 0.02 + rand() * 0.02,
  }));
}

export default function RainyNight({ reducedMotion }) {
  // Buildings: deterministic silhouettes with soft window glow
  const buildings = useMemo(() => {
    const rand = seededRandom(42);
    let x = -2;
    const list = [];
    while (x < 102) {
      const w = 3 + rand() * 6;
      const h = 12 + rand() * 26;
      list.push({
        x, w, h,
        tone: 8 + Math.round(rand() * 6),
        lit: rand() > 0.35,
        glowX: 20 + rand() * 60,
        delay: rand() * 8,
      });
      x += w + 0.4 + rand() * 1.6;
    }
    return list;
  }, []);

  const draw = useCallback((ctx, w, h, t) => {
    ctx.clearRect(0, 0, w, h);
    // Pre-built rain layers on first frame
    if (!rainLayers) {
      const rand = seededRandom(7);
      rainLayers = Array.from({ length: RAIN_LAYER_COUNT }, (_, i) =>
        makeRain(60 - i * 14, rand, { speed: 0.55 + i * 0.35, width: 0.7 + i * 0.35, opacity: 0.1 + i * 0.09, len: 12 + i * 8 })
      );
    }
    for (const layer of rainLayers) {
      ctx.strokeStyle = `rgba(168, 200, 224, ${layer.opacity})`;
      ctx.lineWidth = layer.width;
      ctx.beginPath();
      for (const drop of layer) {
        const y = ((drop.y + t * drop.speed) % 1.15) * h - drop.len;
        const x = (drop.x + t * drop.drift * 0.2) * w;
        ctx.moveTo(x, y);
        ctx.lineTo(x - drop.len * 0.12, y + drop.len);
      }
      ctx.stroke();
    }
  }, []);

  const canvasRef = useCanvasScene(draw, { staticFrame: reducedMotion });

  return (
    <div className="scene scene-rainy" aria-hidden="true">
      <div className="scene-sky" />
      <div className="scene-skyline">
        {buildings.map((b, i) => (
          <div
            key={i}
            className="skyline-building"
            style={{
              left: `${b.x}%`,
              width: `${b.w}%`,
              height: `${b.h}%`,
              background: `linear-gradient(180deg, hsl(220, 24%, ${b.tone}%), hsl(222, 26%, ${Math.max(4, b.tone - 6)}%))`,
              boxShadow: b.lit ? `inset ${b.glowX}% 18% 24px -14px rgba(255, 214, 150, 0.5)` : 'none',
            }}
          >
            {b.lit && <div className="building-window" style={{ animationDelay: `${b.delay}s` }} />}
          </div>
        ))}
      </div>
      <div className="scene-glow streetglow" />
      <canvas ref={canvasRef} className="scene-canvas" />
      {!reducedMotion && <div className="lightning-flash" />}
    </div>
  );
}
