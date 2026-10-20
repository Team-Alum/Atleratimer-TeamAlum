// AmbientStage — renders the selected scene behind the focus view.
// Never blocks input (pointer-events: none), fades between scenes, honors
// reduced motion and the animations-enabled setting, and always keeps a
// static gradient fallback underneath.

import React, { lazy, Suspense, useMemo } from 'react';
import { useTimer } from '../context/useTimer';
import AmbientSelector from './AmbientSelector';

const RainyNight = lazy(() => import('./scenes/RainyNight'));
const NightDrive = lazy(() => import('./scenes/NightDrive'));
const StarrySky = lazy(() => import('./scenes/StarrySky'));
const CozyRoom = lazy(() => import('./scenes/CozyRoom'));
const MinimalAmbient = lazy(() => import('./scenes/MinimalAmbient'));

export const AMBIENT_SCENES = [
  { id: 'rainy-night', name: 'Rainy Night' },
  { id: 'night-drive', name: 'Night Drive' },
  { id: 'starry-sky', name: 'Starry Sky' },
  { id: 'cozy-room', name: 'Cozy Room' },
  { id: 'minimal', name: 'Minimal Ambient' },
];

const SCENE_COMPONENTS = {
  'rainy-night': RainyNight,
  'night-drive': NightDrive,
  'starry-sky': StarrySky,
  'cozy-room': CozyRoom,
  minimal: MinimalAmbient,
};

export default function AmbientStage() {
  const { data, setData } = useTimer();
  const ambient = data?.ambientSettings || { scene: 'starry-sky', enabled: true };
  const reducedMotion = Boolean(data?.reducedMotion);

  const Scene = ambient.enabled ? SCENE_COMPONENTS[ambient.scene] : null;

  const sceneNode = useMemo(() => {
    if (!Scene) return null;
    return (
      <Suspense fallback={null}>
        <Scene reducedMotion={reducedMotion} />
      </Suspense>
    );
  }, [Scene, reducedMotion]);

  const setAmbient = (patch) => {
    setData((prev) => ({
      ...prev,
      ambientSettings: { ...prev.ambientSettings, ...patch },
    }));
  };

  return (
    <>
      <div className={`ambient-root${reducedMotion ? ' reduce-motion' : ''}`} aria-hidden="true">
        <div className="ambient-fallback" />
        {sceneNode}
      </div>
      <AmbientSelector
        ambient={ambient}
        reducedMotion={reducedMotion}
        onChange={setAmbient}
      />
    </>
  );
}
