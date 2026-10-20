// Compact ambient-background picker that floats over the focus view.

import React, { useEffect, useRef, useState } from 'react';
import { AMBIENT_SCENES } from './AmbientStage';
import { Layers, Check } from 'lucide-react';

export default function AmbientSelector({ ambient, reducedMotion, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

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

  return (
    <div className="ambient-selector" ref={wrapRef}>
      <button
        type="button"
        className="ambient-trigger"
        onClick={() => setOpen((v) => !v)}
        title="Ambient background"
        aria-label="Choose ambient background"
        aria-expanded={open}
      >
        <Layers size={15} />
        <span className="ambient-trigger-label">Ambient</span>
      </button>

      {open && (
        <div className="ambient-popover" role="dialog" aria-label="Ambient background selector">
          <div className="ambient-title">Ambient background</div>
          <div className="ambient-grid" role="group" aria-label="Background options">
            {AMBIENT_SCENES.map((scene) => (
              <button
                key={scene.id}
                type="button"
                className={`ambient-option swatch-${scene.id}${ambient.enabled && ambient.scene === scene.id ? ' selected' : ''}`}
                onClick={() => onChange({ scene: scene.id, enabled: true })}
                aria-pressed={ambient.enabled && ambient.scene === scene.id}
              >
                <span className="ambient-swatch" aria-hidden="true" />
                <span className="ambient-name">{scene.name}</span>
                {ambient.enabled && ambient.scene === scene.id && <Check size={12} className="ambient-check" />}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`ambient-off${!ambient.enabled ? ' selected' : ''}`}
            onClick={() => onChange({ enabled: false })}
            aria-pressed={!ambient.enabled}
          >
            Static background (no animation)
          </button>

          {reducedMotion && (
            <p className="ambient-note">Reduced motion is on — scenes render as a single calm frame.</p>
          )}
        </div>
      )}
    </div>
  );
}
