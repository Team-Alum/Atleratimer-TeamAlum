import React, { useEffect, useState } from 'react';
import { getAmbientScene, probeAmbientVideo } from './ambientScenes';

// Read a media query once and keep it in sync with the viewport. Used for the
// "don't fetch a 1080p clip on a phone" rule.
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(query).matches
      : false
  ));

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, [query]);

  return matches;
}

function useReducedMotionPreference() {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

// The ambient layer is fixed, decorative and sits behind the app shell. It
// never intercepts pointer events and never changes layout.
//
// Scene media is optional. A HEAD probe checks for a real video before a
// <video> is mounted, which keeps missing assets from producing console noise
// and means the tonal fallback is a first-class state rather than an error.
export default function AmbientBackground({
  sceneId = 'off',
  ambientMotion = true,
  reducedMotion = false,
  theme = 'light',
}) {
  const scene = getAmbientScene(sceneId);
  const prefersReducedMotion = useReducedMotionPreference();
  const isCompact = useMediaQuery('(max-width: 768px)');
  const active = scene.id !== 'off';
  const motionAllowed = active && ambientMotion && !reducedMotion && !prefersReducedMotion;

  // Optional lightweight variant. If it is not installed, no desktop clip is
  // fetched in its place on a small screen.
  const mediaSrc = active
    ? (isCompact ? scene.video?.replace(/\.mp4$/i, '-mobile.mp4') : scene.video)
    : null;

  // Probe state is keyed by source so switching scenes can never surface the
  // previous clip's status. `playing` is keyed too, which means a failed new
  // clip leaves the fallback visible instead of inheriting the old fade state.
  const [probe, setProbe] = useState({ src: null, status: 'idle' }); // idle | ready | missing
  const [playing, setPlaying] = useState({ src: null, value: false });

  useEffect(() => {
    let cancelled = false;
    if (!mediaSrc || !motionAllowed) return () => { cancelled = true; };

    probeAmbientVideo(mediaSrc).then((available) => {
      if (!cancelled) setProbe({ src: mediaSrc, status: available ? 'ready' : 'missing' });
    });

    return () => { cancelled = true; };
  }, [mediaSrc, motionAllowed]);

  const fallbackStyle = scene.fallback
    ? {
      '--scene-base': scene.fallback.base,
      '--scene-a': scene.fallback.a,
      '--scene-b': scene.fallback.b,
      '--scene-c': scene.fallback.c,
      '--scene-veil': scene.veil?.[theme === 'dark' ? 'dark' : 'light'] ?? 0.46,
    }
    : undefined;

  const showVideo = motionAllowed && probe.src === mediaSrc && probe.status === 'ready';
  const videoPlaying = showVideo && playing.src === mediaSrc && playing.value;
  const markPlaying = () => setPlaying({ src: mediaSrc, value: true });

  return (
    <div className="ambient-layer" data-scene={scene.id} aria-hidden="true">
      <div className="ambient-wash" />

      {active && (
        <div
          className={`ambient-fallback ambient-fallback--${scene.id}${videoPlaying ? ' is-covered' : ''}`}
          style={fallbackStyle}
        />
      )}

      {showVideo && (
        <video
          key={mediaSrc}
          className={`ambient-video${videoPlaying ? ' is-playing' : ''}`}
          src={mediaSrc}
          poster={scene.poster}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          tabIndex={-1}
          onPlaying={markPlaying}
          onCanPlay={markPlaying}
          onError={() => {
            setProbe({ src: mediaSrc, status: 'missing' });
            setPlaying({ src: mediaSrc, value: false });
          }}
        />
      )}

      {active && <div className="ambient-scrim" />}
      <div className="ambient-vignette" />
    </div>
  );
}
