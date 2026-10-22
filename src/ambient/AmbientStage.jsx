// AmbientStage — full-viewport ambient background behind the whole app.
//
// The stage renders a single static poster image for the selected scene over a
// CSS gradient fallback, with a readability dimmer in front of it. It never
// intercepts input (pointer-events: none) and is aria-hidden because it
// carries no information.
//
// The live/animated background was removed for performance: it previously
// streamed a looping video per scene (80+ MB of assets) and fell back to a
// per-scene canvas animation, both running full-viewport behind the timer.
// The remaining static image is composited once by the GPU and costs a single
// small request.

import React, { memo, useMemo } from 'react';
import { useTimerState } from '../context/useTimer';
import { AMBIENT_SCENES } from './scenes';

function AmbientStage() {
  const { data } = useTimerState();
  const ambient = data?.ambientSettings;

  const scene = useMemo(
    () => AMBIENT_SCENES.find((s) => s.id === ambient?.scene) || AMBIENT_SCENES[0],
    [ambient?.scene]
  );

  // "enabled: false" means no image at all — just the gradient backdrop.
  const showPoster = ambient?.enabled !== false;
  const dim = typeof ambient?.dim === 'number'
    ? Math.min(0.7, Math.max(0, ambient.dim))
    : 0.25;

  return (
    <div className="ambient-root" aria-hidden="true">
      <div className="ambient-fallback" />
      {showPoster && (
        <img
          className="ambient-poster"
          src={scene.poster}
          alt=""
          decoding="async"
          fetchPriority="low"
        />
      )}
      <div className="ambient-dim" style={{ opacity: dim }} />
    </div>
  );
}

// Memoised: this component only reads its own context subscriptions and its
// props, so a parent re-render can skip it entirely.
export default memo(AmbientStage);
