// Compact Music HUD — State A
// Discreet, translucent, claymorphic mini-player docked cleanly on the timer screen.
// Provides immediate controls without dominating or overlapping the countdown timer.

import React, { memo } from 'react';
import { useMusicPlayback, useMusicActions } from './MusicPlayerContextInstance';
import { Play, Pause, SkipForward, Maximize2, Music2, X, AlertTriangle } from 'lucide-react';

function MusicHUD() {
  const playback = useMusicPlayback();
  const { actions } = useMusicActions();
  const { track, status, isBusy, musicUiState, autoplayReason, error } = playback;

  if (musicUiState !== 'compact') return null;

  const playing = status === 'playing';
  const displayTitle = track?.title || 'Choose Focus Music';
  const displaySubtitle = track?.channel || (status === 'loading' ? 'Loading audio…' : autoplayReason || 'Atmospheric study audio');

  const handlePillClick = (e) => {
    // If clicking a button, don't trigger the expand
    if (e.target.closest('button')) return;
    actions.openExpanded();
  };

  return (
    <aside
      className={`atlera-hud-wrap${playing ? ' is-playing' : ''}`}
      aria-label="Compact music player HUD"
      role="region"
    >
      <div
        className="atlera-hud-card"
        onClick={handlePillClick}
        title="Tap to open Music Discovery Home"
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            actions.openExpanded();
          }
        }}
        aria-label={`Music player: ${displayTitle}. Press Enter to expand.`}
      >
        {/* Thumbnail artwork & Live Waveform */}
        <div className="atlera-hud-thumb-box" aria-hidden="true">
          {track?.thumbnail ? (
            <img src={track.thumbnail} alt="" className="atlera-hud-img" />
          ) : (
            <div className="atlera-hud-fallback-icon">
              <Music2 size={16} />
            </div>
          )}

          {playing && !isBusy && (
            <div className="atlera-hud-equalizer" aria-label="Audio playing">
              <span /><span /><span /><span />
            </div>
          )}
        </div>

        {/* Track Title and Artist / Channel */}
        <div className="atlera-hud-info">
          <div className="atlera-hud-title" title={displayTitle}>
            {displayTitle}
          </div>
          <div className="atlera-hud-sub" title={displaySubtitle}>
            {error && status === 'error' ? (
              <span className="atlera-hud-err"><AlertTriangle size={11} /> Playback notice</span>
            ) : (
              displaySubtitle
            )}
          </div>
        </div>

        {/* Quick Controls */}
        <div className="atlera-hud-actions" onClick={(e) => e.stopPropagation()}>
          {/* Play / Pause */}
          <button
            type="button"
            className="atlera-hud-btn atlera-hud-btn-primary"
            onClick={actions.toggle}
            disabled={!track}
            aria-label={playing ? 'Pause music' : 'Play music'}
            title={playing ? 'Pause music' : 'Play music'}
          >
            {playing ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
          </button>

          {/* Next Track */}
          <button
            type="button"
            className="atlera-hud-btn"
            onClick={actions.next}
            disabled={!track}
            aria-label="Next track"
            title="Next track"
          >
            <SkipForward size={15} />
          </button>

          {/* Expand to State B */}
          <button
            type="button"
            className="atlera-hud-btn atlera-hud-btn-expand"
            onClick={actions.openExpanded}
            aria-label="Expand music discovery home"
            title="Expand music discovery home"
          >
            <Maximize2 size={15} />
          </button>

          {/* Dismiss / Close HUD */}
          <button
            type="button"
            className="atlera-hud-btn atlera-hud-btn-dismiss"
            onClick={actions.closeMusic}
            aria-label="Dismiss HUD (playback continues)"
            title="Dismiss HUD (playback continues)"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default memo(MusicHUD);
