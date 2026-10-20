// Night Drive — a distant wet street with slow headlight/taillight traffic,
// drawn entirely on one canvas so it stays cheap.

import React, { useCallback, useMemo } from 'react';
import { useCanvasScene, seededRandom } from '../useCanvasScene';

const HORIZON = 0.42;     // vanishing-point height (fraction)
const CAR_COUNT = 7;
let trafficCars = null;   // built once on first frame, reused across renders;

function makeCars(rand) {
  return Array.from({ length: CAR_COUNT }, (_, i) => ({
    toward: i % 2 === 0,                       // headlights (toward viewer) or taillights
    lane: i % 2 === 0 ? 0.35 + rand() * 0.2 : 0.55 + rand() * 0.2, // screen-x at horizon
    z: rand(),                                 // 0 = horizon, 1 = foreground
    speed: 0.028 + rand() * 0.03,
    sway: rand() * Math.PI * 2,
  }));
}

export default function NightDrive({ reducedMotion }) {
  const draw = useCallback((ctx, w, h, t) => {
    ctx.clearRect(0, 0, w, h);
    if (!trafficCars) trafficCars = makeCars(seededRandom(2024));
    const hz = h * HORIZON;

    // Road surface (wet asphalt)
    const road = ctx.createLinearGradient(0, hz, 0, h);
    road.addColorStop(0, 'rgba(16, 20, 30, 0.9)');
    road.addColorStop(1, 'rgba(9, 11, 17, 1)');
    ctx.fillStyle = road;
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - w * 0.045, hz);
    ctx.lineTo(w * 0.5 + w * 0.045, hz);
    ctx.lineTo(w * 1.05, h);
    ctx.lineTo(-w * 0.05, h);
    ctx.closePath();
    ctx.fill();

    // Dashed center line, slowly approaching
    ctx.strokeStyle = 'rgba(196, 208, 224, 0.22)';
    ctx.lineWidth = 1.5;
    const phase = reducedMotion ? 0.3 : (t * 0.12) % 1;
    for (let i = 0; i < 8; i += 1) {
      const z1 = (i / 8 + phase) % 1;
      const z2 = Math.min(1, z1 + 0.055);
      const p1 = hz + (h - hz) * z1 * z1;
      const p2 = hz + (h - hz) * z2 * z2;
      const x1 = w * 0.5 + (w * 0.5) * 0.04;
      ctx.beginPath();
      ctx.moveTo(x1, p1);
      ctx.lineTo(x1 + (p2 - p1) * 0.04, p2);
      ctx.lineWidth = 0.5 + z1 * 2;
      ctx.stroke();
    }

    // Cars: two points of light + wet-road reflection
    for (const car of trafficCars) {
      if (!reducedMotion) {
        car.z += car.speed * 0.016;
        if (car.z > 1.12) car.z = 0;
      }
      const z = car.z;
      const scale = 0.15 + z * 1.25;
      const spread = (w * 0.016 + z * w * 0.028);
      // Road widens toward the viewer
      const centerX = w * 0.5 + (car.lane - 0.5) * w * 0.7 * z;
      const y = hz + (h - hz) * z * z;

      const colorMain = car.toward ? 'rgba(255, 244, 214,' : 'rgba(255, 84, 74,';
      const colorGlow = car.toward ? 'rgba(255, 226, 160,' : 'rgba(255, 60, 50,';
      const alpha = 0.25 + z * 0.55;

      for (const side of [-1, 1]) {
        const x = centerX + side * spread;
        // glow
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 14 * scale);
        glow.addColorStop(0, `${colorGlow} ${alpha * 0.5})`);
        glow.addColorStop(1, `${colorGlow} 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, 14 * scale, 0, Math.PI * 2);
        ctx.fill();
        // core
        ctx.fillStyle = `${colorMain} ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, 2.1 * scale, 0, Math.PI * 2);
        ctx.fill();
        // wet reflection
        const refl = ctx.createLinearGradient(0, y, 0, y + 46 * scale);
        refl.addColorStop(0, `${colorMain} ${alpha * 0.28})`);
        refl.addColorStop(1, `${colorMain} 0)`);
        ctx.fillStyle = refl;
        ctx.fillRect(x - 1.2 * scale, y, 2.4 * scale, 46 * scale);
      }
    }

    // Soft streetlight pool near the horizon
    const lamp = ctx.createRadialGradient(w * 0.5, hz, 0, w * 0.5, hz, w * 0.2);
    lamp.addColorStop(0, 'rgba(255, 210, 150, 0.10)');
    lamp.addColorStop(1, 'rgba(255, 210, 150, 0)');
    ctx.fillStyle = lamp;
    ctx.fillRect(0, 0, w, h);
  }, [reducedMotion]);

  const canvasRef = useCanvasScene(draw, { staticFrame: reducedMotion });

  // Distant building silhouettes
  const skyline = useMemo(() => {
    const rand = seededRandom(5);
    let x = -1;
    const list = [];
    while (x < 101) {
      const bw = 4 + rand() * 9;
      list.push({ x, w: bw, h: 6 + rand() * 18, lit: rand() > 0.5 });
      x += bw + 0.5;
    }
    return list;
  }, []);

  return (
    <div className="scene scene-drive" aria-hidden="true">
      <div className="scene-sky" />
      <div className="drive-skyline">
        {skyline.map((b, i) => (
          <div
            key={i}
            className="skyline-building"
            style={{
              left: `${b.x}%`,
              width: `${b.w}%`,
              height: `${b.h}%`,
              background: 'linear-gradient(180deg, hsl(222, 20%, 10%), hsl(222, 24%, 5%))',
              boxShadow: b.lit ? 'inset 40% 20% 22px -14px rgba(255, 210, 150, 0.35)' : 'none',
            }}
          />
        ))}
      </div>
      <canvas ref={canvasRef} className="scene-canvas" />
    </div>
  );
}
