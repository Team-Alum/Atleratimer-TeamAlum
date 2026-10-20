// Persistent compact music bar. One instance lives in AppShell; all playback
// goes through the shared MusicPlayerContext. Secondary controls collapse
// intelligently on small screens.

import React, { useEffect, useRef, useState } from 'react';
import { useMusic } from './MusicPlayerContext';
import { formatTime } from './youtubeIframe';
import SearchPanel from './SearchPanel';
import PlaylistPanel from './PlaylistPanel';
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle,
  Volume2, VolumeX, Search, ListMusic, ListVideo, ChevronDown, Loader2, AlertTriangle,
} from 'lucide-react';

export default function MusicBar() {
  const { state, isBusy, actions } = useMusic();
  const [drawer, setDrawer] = useState(null); // 'search' | 'playlists' | null
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const barRef = useRef(null);

  const { status, track, queue, index, currentTime, duration, volume, muted, repeat, shuffle, error } = state;
  const playing = status === 'playing';

  // Close popovers on outside click / Escape
  useEffect(() => {
    if (!volumeOpen && !moreOpen) return undefined;
    const onDown = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setVolumeOpen(false);
        setMoreOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setVolumeOpen(false);
        setMoreOpen(false);
        setDrawer(null);
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [volumeOpen, moreOpen]);

  const repeatIcon = repeat === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />;
  const volumeIcon = muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />;
  const hasNext = queue.length > 1 || repeat === 'all';
  const hasPrev = queue.length > 1 || currentTime > 2;

  return (
    <>
      <div className="music-bar" role="region" aria-label="Music player" ref={barRef}>
        {/* Transport */}
        <div className="mb-transport">
          <button type="button" className="mb-btn" onClick={actions.prev} disabled={!hasPrev && !track} title="Previous track" aria-label="Previous track">
            <SkipBack size={16} />
          </button>
          <button
            type="button"
            className="mb-btn mb-play"
            onClick={actions.toggle}
            disabled={!track && queue.length === 0}
            title={playing ? 'Pause' : 'Play'}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {isBusy ? <Loader2 size={17} className="spin" /> : playing ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button type="button" className="mb-btn" onClick={actions.next} disabled={!hasNext && queue.length < 2} title="Next track" aria-label="Next track">
            <SkipForward size={16} />
          </button>
        </div>

        {/* Track meta */}
        <div className="mb-meta">
          <span className={`mb-title${track ? ' scrolling' : ''}`} title={track?.title}>
            {track ? track.title : 'Nothing playing — search or pick a playlist'}
          </span>
          <span className="mb-sub">
            {status === 'loading' && 'Loading…'}
            {status === 'buffering' && 'Buffering…'}
            {(status === 'playing' || status === 'paused') && (track?.channel || (queue.length > 1 ? `Track ${index + 1} of ${queue.length}` : ''))}
            {status === 'ended' && 'Queue finished'}
            {status === 'error' && <span className="mb-error"><AlertTriangle size={11} /> Can’t play this track</span>}
          </span>
        </div>

        {/* Progress */}
        <div className="mb-progress">
          <span className="mb-time tabular-nums">{formatTime(currentTime)}</span>
          <input
            type="range"
            className="mb-range"
            min={0}
            max={1000}
            value={duration > 0 ? Math.round((currentTime / duration) * 1000) : 0}
            onChange={(e) => actions.seekFraction(Number(e.target.value) / 1000)}
            disabled={!duration}
            aria-label="Seek within track"
          />
          <span className="mb-time tabular-nums">{duration > 0 ? formatTime(duration) : '--:--'}</span>
        </div>

        {/* Secondary controls (desktop) */}
        <div className="mb-controls">
          <button type="button" className={`mb-btn${repeat !== 'off' ? ' on' : ''}`} onClick={actions.cycleRepeat} title={`Repeat: ${repeat}`} aria-label={`Repeat: ${repeat}. Click to change.`}>
            {repeatIcon}
          </button>
          <button type="button" className={`mb-btn${shuffle ? ' on' : ''}`} onClick={actions.toggleShuffle} title={shuffle ? 'Shuffle on' : 'Shuffle off'} aria-label="Toggle shuffle" aria-pressed={shuffle}>
            <Shuffle size={15} />
          </button>
          <div className="mb-volume">
            <button type="button" className="mb-btn" onClick={() => setVolumeOpen((v) => !v)} title="Volume" aria-label={`Volume ${Math.round((muted ? 0 : volume) * 100)}%`} aria-expanded={volumeOpen}>
              {volumeIcon}
            </button>
            {volumeOpen && (
              <input
                type="range"
                className="mb-range mb-volume-range"
                min={0}
                max={100}
                value={Math.round((muted ? 0 : volume) * 100)}
                onChange={(e) => actions.setVolume(Number(e.target.value) / 100)}
                aria-label="Volume"
                autoFocus
              />
            )}
          </div>
          <span className="mb-divider" aria-hidden="true" />
          <button type="button" className={`mb-btn${drawer === 'search' ? ' on' : ''}`} onClick={() => setDrawer(drawer === 'search' ? null : 'search')} title="Search music" aria-label="Search music" aria-expanded={drawer === 'search'}>
            <Search size={15} />
          </button>
          <button type="button" className={`mb-btn${drawer === 'playlists' ? ' on' : ''}`} onClick={() => setDrawer(drawer === 'playlists' ? null : 'playlists')} title="Playlists" aria-label="Open playlists" aria-expanded={drawer === 'playlists'}>
            <ListMusic size={15} />
          </button>
          <button type="button" className="mb-btn mb-queue-btn" onClick={actions.setPlayerVisible.bind(null, !state.playerVisible)} title={state.playerVisible ? 'Hide video player' : 'Show video player'} aria-label={state.playerVisible ? 'Hide video player' : 'Show video player'} aria-pressed={state.playerVisible}>
            <ListVideo size={15} />
          </button>
        </div>

        {/* Compact controls (mobile) */}
        <div className="mb-controls-mobile">
          <button type="button" className="mb-btn" onClick={() => setMoreOpen((v) => !v)} title="More controls" aria-label="More player controls" aria-expanded={moreOpen}>
            <ChevronDown size={16} style={{ transform: moreOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
          <button type="button" className={`mb-btn${drawer === 'search' ? ' on' : ''}`} onClick={() => setDrawer(drawer === 'search' ? null : 'search')} title="Search music" aria-label="Search music">
            <Search size={15} />
          </button>
          <button type="button" className={`mb-btn${drawer === 'playlists' ? ' on' : ''}`} onClick={() => setDrawer(drawer === 'playlists' ? null : 'playlists')} title="Playlists" aria-label="Open playlists">
            <ListMusic size={15} />
          </button>
        </div>

        {moreOpen && (
          <div className="mb-more" role="group" aria-label="More player controls">
            <button type="button" className={`mb-btn${repeat !== 'off' ? ' on' : ''}`} onClick={actions.cycleRepeat} title={`Repeat: ${repeat}`} aria-label={`Repeat: ${repeat}`}>{repeatIcon}</button>
            <button type="button" className={`mb-btn${shuffle ? ' on' : ''}`} onClick={actions.toggleShuffle} title="Shuffle" aria-label="Toggle shuffle" aria-pressed={shuffle}><Shuffle size={15} /></button>
            <button type="button" className="mb-btn" onClick={actions.toggleMute} title={muted ? 'Unmute' : 'Mute'} aria-label={muted ? 'Unmute' : 'Mute'}>{volumeIcon}</button>
            <input
              type="range"
              className="mb-range mb-volume-inline"
              min={0}
              max={100}
              value={Math.round((muted ? 0 : volume) * 100)}
              onChange={(e) => actions.setVolume(Number(e.target.value) / 100)}
              aria-label="Volume"
            />
            <button type="button" className={`mb-btn${state.playerVisible ? ' on' : ''}`} onClick={() => actions.setPlayerVisible(!state.playerVisible)} title="Video player" aria-label="Toggle video player" aria-pressed={state.playerVisible}>
              <ListVideo size={15} />
            </button>
          </div>
        )}
      </div>

      {drawer === 'search' && <SearchPanel onClose={() => setDrawer(null)} />}
      {drawer === 'playlists' && <PlaylistPanel onClose={() => setDrawer(null)} />}

      {error && status === 'error' && (
        <div className="music-toast" role="alert">
          <AlertTriangle size={14} />
          <span>{error.message}</span>
          <button type="button" className="link-btn" onClick={actions.retry}>Retry</button>
          {queue.length > 1 && <button type="button" className="link-btn" onClick={actions.next}>Skip</button>}
          <button type="button" className="link-btn muted" onClick={actions.clearError}>Dismiss</button>
        </div>
      )}
    </>
  );
}
