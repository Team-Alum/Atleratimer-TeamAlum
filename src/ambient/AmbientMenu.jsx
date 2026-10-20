// Ambient control integrated into the dashboard header: a visible "Ambient"
// button next to Notification / Theme, opening a "Choose your atmosphere"
// popover with real poster-preview tiles, dimming, and motion toggles.
// Settings persist through the existing ambientSettings store.

import React, { useEffect, useRef, useState } from 'react';
import { useTimer } from '../context/useTimer';
import { AMBIENT_SCENES } from './scenes';
import { Layers, Check } from 'lucide-react';

export default function AmbientMenu() {
  const { data, setData } = useTimer();
  const ambient = data?.ambientSettings || { scene: 'starry-sky', enabled: true };
  const [open, setOpen] = useState(false);
  const [loadedPosters, setLoadedPosters] = useState({});
  const wrapRef = useRef(null);

  const reducedMotion = Boolean(data?.reducedMotion);
  const dim = typeof ambient.dim === 'number' ? ambient.dim : 0.25;
  const animDisabled = ambient.motion === false;

  const setAmbient = (patch) => {
    setData((prev) => ({
      ...prev,
      ambientSettings: { ...prev.ambientSettings, ...patch },
    }));
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markLoaded = (poster) => setLoadedPosters((prev) => (prev[poster] ? prev : { ...prev, [poster]: true }));

  return (
    <div className="ambient-menu" ref={wrapRef}>
      <button
        type="button"
        className={`icon-button ambient-header-btn${open ? ' active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title="Ambient background"
        aria-label="Choose ambient background"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Layers size={18} strokeWidth={2} />
        <span className="ambient-btn-label">Ambient</span>
      </button>

      {open && (
        <div className="ambient-popover" role="dialog" aria-label="Choose your atmosphere">
          <div className="ambient-title">Choose your atmosphere</div>

          <div className="ambient-grid" role="group" aria-label="Background options">
            {AMBIENT_SCENES.map((s) => {
              const selected = ambient.enabled !== false && ambient.scene === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`ambient-option${selected ? ' selected' : ''}`}
                  onClick={() => setAmbient({ scene: s.id, enabled: true })}
                  aria-pressed={selected}
                >
                  <span className={`ambient-tile${loadedPosters[s.poster] ? ' loaded' : ''}`}>
                    <img src={s.poster} alt="" loading="lazy" onLoad={() => markLoaded(s.poster)} />
                  </span>
                  <span className="ambient-name">{s.name}</span>
                  {selected && <Check size={12} className="ambient-check" />}
                </button>
              );
            })}
          </div>

          <div className="ambient-controls">
            <button
              type="button"
              className={`ambient-off${ambient.enabled === false ? ' selected' : ''}`}
              onClick={() => setAmbient({ enabled: false })}
              aria-pressed={ambient.enabled === false}
            >
              Static background (no animation)
            </button>

            <div className="ambient-control-row">
              <span className="ambient-control-label">Disable animation</span>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={animDisabled}
                  onChange={(e) => setAmbient({ motion: !e.target.checked })}
                  aria-label="Disable background animation"
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="ambient-control-row">
              <span className="ambient-control-label">Dim background</span>
              <input
                type="range"
                className="mb-range ambient-dim-range"
                min={0}
                max={70}
                value={Math.round(dim * 100)}
                onChange={(e) => setAmbient({ dim: Number(e.target.value) / 100 })}
                aria-label="Dim background for readability"
              />
            </div>
          </div>

          {reducedMotion && (
            <p className="ambient-note">Reduced motion is on — backgrounds stay still.</p>
          )}
        </div>
      )}
    </div>
  );
}
