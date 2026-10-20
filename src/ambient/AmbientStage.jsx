// AmbientStage — full-viewport ambient background behind the whole app.
// Primary layer is a licensed looping video (one <video>, swapped per scene,
// object-fit: cover, muted, aria-hidden, poster while loading). Fallbacks, in
// order: the scene's canvas/CSS animation, then a static gradient. The stage
// never intercepts input (pointer-events: none), pauses video when the tab is
// hidden, and honors both the system reduced-motion setting and the in-app
// "disable animation" toggle.

import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useTimer } from '../context/useTimer';
import { AMBIENT_SCENES } from './scenes';

const RainyNight = lazy(() => import('./scenes/RainyNight'));
const NightDrive = lazy(() => import('./scenes/NightDrive'));
const StarrySky = lazy(() => import('./scenes/StarrySky'));
const CozyRoom = lazy(() => import('./scenes/CozyRoom'));
const MinimalAmbient = lazy(() => import('./scenes/MinimalAmbient'));
const ForestRain = lazy(() => import('./scenes/ForestRain'));

const SCENE_COMPONENTS = {
  'rainy-night': RainyNight,
  'night-drive': NightDrive,
  'starry-sky': StarrySky,
  'cozy-room': CozyRoom,
  'forest-rain': ForestRain,
  minimal: MinimalAmbient,
};

export default function AmbientStage() {
  const { data } = useTimer();
  const ambient = data?.ambientSettings || { scene: 'starry-sky', enabled: true };
  const reducedMotionPref = Boolean(data?.reducedMotion);

  // System preference, kept live
  const [systemReduce, setSystemReduce] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => setSystemReduce(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const scene = AMBIENT_SCENES.find((s) => s.id === ambient.scene) || AMBIENT_SCENES[0];
  const motionOff = ambient.motion === false;
  const motionAllowed = ambient.enabled !== false && !reducedMotionPref && !systemReduce && !motionOff;

  // Video failure fallback (per src)
  const [failedSrc, setFailedSrc] = useState(null);
  const [ready, setReady] = useState(false);
  const videoRef = useRef(null);

  const videoSrc = motionAllowed && scene.video && failedSrc !== scene.video ? scene.video : null;

  // Pause background video when the tab is hidden; resume when visible.
  useEffect(() => {
    const onVis = () => {
      const v = videoRef.current;
      if (!v) return;
      if (document.hidden) { try { v.pause(); } catch { /* ignore */ } }
      else if (videoSrc) { try { v.play()?.catch?.(() => {}); } catch { /* ignore */ } }
    };
    document.addEventListener('visibilitychange', onVis);
    onVis();
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [videoSrc]);

  // Canvas/CSS fallback scene: used when there is no video, the video failed,
  // or motion is disabled (static frame).
  const Scene = SCENE_COMPONENTS[scene.id];
  const useFallbackScene = Boolean(Scene) && !videoSrc;
  const sceneNode = useMemo(() => {
    if (!useFallbackScene) return null;
    return (
      <Suspense fallback={null}>
        <Scene reducedMotion={!motionAllowed} />
      </Suspense>
    );
  }, [Scene, useFallbackScene, motionAllowed]);

  const dim = typeof ambient.dim === 'number' ? Math.min(0.7, Math.max(0, ambient.dim)) : 0.25;
  const reduceClass = reducedMotionPref || systemReduce || motionOff ? ' reduce-motion' : '';

  return (
    <div className={`ambient-root${reduceClass}`} aria-hidden="true">
      <div className="ambient-fallback" />
      {sceneNode}
      {videoSrc && (
        <video
          key={videoSrc}
          ref={videoRef}
          className={`ambient-video${ready ? ' ready' : ''}`}
          src={videoSrc}
          poster={scene.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={() => setReady(true)}
          onPlaying={() => setReady(true)}
          onError={() => { setFailedSrc(scene.video); setReady(false); }}
        />
      )}
      <div className="ambient-dim" style={{ opacity: dim }} />
    </div>
  );
}
