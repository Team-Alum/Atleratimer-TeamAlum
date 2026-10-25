// Compact mini player that lives entirely inside the sidebar.
// The collapsed state is a Dynamic-Island-inspired pill; expanding renders the
// player panel, the playlist manager and playback errors inline in the sidebar
// (no body portal, no floating panel over the timer).
//
// Performance notes:
//  - the pill subscribes to the *playback* context only, so the once-a-second
//    progress poll does not re-render it (the tiny progress row subscribes to
//    the progress context on its own);
//  - the search section and the playlist manager are code-split and only
//    downloaded the first time they are actually opened.

import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTimerState, useTimerActions } from '../context/useTimer';
import { useMusicPlayback, useMusicProgress, useMusicActions } from './MusicPlayerContextInstance';
import { usePlaylists } from './PlaylistContextInstance';
import { formatTime } from './youtubeIframe';
import { LANGUAGE_META } from './vibe';
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle,
  Volume2, VolumeX, ListMusic, ChevronDown, Lock, Sparkles,
  Loader2, AlertTriangle, Music2, Waves, X,
} from 'lucide-react';

// Both panels are only needed once the user actually opens them.
const SearchSection = lazy(() => import('./SearchPanel'));
const PlaylistPanel = lazy(() => import('./PlaylistPanel'));

export default function MusicBar() {
  const { data } = useTimerState();
  const { toggleImmersiveBackground } = useTimerActions();
  const immersiveBackground = Boolean(data?.musicSettings?.immersiveBackground);
  const playback = useMusicPlayback();
  const { actions } = useMusicActions();
  const { playlists, activeId, activePlaylist, actions: playlistActions } = usePlaylists();

  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [playlistsOpen, setPlaylistsOpen] = useState(false); // inline playlist manager
  const [pickerOpen, setPickerOpen] = useState(false);       // compact playlist selector
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const searchInputRef = useRef(null);
  const pendingSearchFocusRef = useRef(false);
  const pickerRef = useRef(null);

  const {
    status, track, queue, index, volume, muted, repeat, shuffle, error,
    vibe, autoVibe, vibeLoading, vibeNote,
  } = playback;
  const playing = status === 'playing';
  const hasNext = queue.length > 1 || repeat === 'all';
  // `hasPrev` also depends on the playhead, but the provider folds that into
  // a boolean so the pill does not have to subscribe to the progress context.
  const hasPrev = playback.hasPrev;
  const languageMeta = vibe ? (LANGUAGE_META[vibe.language] || LANGUAGE_META.unknown) : null;

  // Callback ref handed to the lazily loaded search section. The first time
  // the panel opens the chunk is still being fetched, so focusing happens as
  // soon as the input actually mounts instead of polling for it.
  const registerSearchInput = useCallback((node) => {
    searchInputRef.current = node;
    if (node && pendingSearchFocusRef.current) {
      pendingSearchFocusRef.current = false;
      requestAnimationFrame(() => node.focus());
    }
  }, []);

  const togglePanel = useCallback(() => {
    setEverOpened(true);
    const next = !open;
    if (!next) {
      setPickerOpen(false);
      setPlaylistsOpen(false);
    }
    pendingSearchFocusRef.current = next;
    setOpen(next);
  }, [open]);

  // Expanding always focuses the search input. On later opens the search
  // section is already mounted, so the callback ref above will not fire
  // again — focus it here instead.
  useEffect(() => {
    if (!open || !pendingSearchFocusRef.current) return undefined;
    if (!searchInputRef.current) return undefined; // the callback ref handles it
    pendingSearchFocusRef.current = false;
    const id = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Outside click + Escape collapse the panel (playback keeps running).
  // The expanded panel is portaled into document.body, so containment is checked
  // against both the sidebar pill and the floating/modal panel.
  useEffect(() => {
    if (!open && !pickerOpen && !playlistsOpen) return undefined;
    const onDown = (e) => {
      const target = e.target;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) {
        if (pickerRef.current && !pickerRef.current.contains(target)) {
          setPickerOpen(false);
        }
        return;
      }
      setOpen(false);
      setPickerOpen(false);
      setPlaylistsOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setPickerOpen(false);
        setPlaylistsOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, pickerOpen, playlistsOpen]);

  const collapse = useCallback(() => {
    setOpen(false);
    setPickerOpen(false);
    setPlaylistsOpen(false);
  }, []);

  const repeatIcon = repeat === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />;
  const volumeIcon = muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />;
  const busyForTrack = playback.isBusy && status === 'loading';

  const subText = () => {
    if (status === 'loading') return 'Loading…';
    if (status === 'buffering') return 'Buffering…';
    if (status === 'playing' || status === 'paused') {
      return track?.channel || (queue.length > 1 ? `Track ${index + 1} of ${queue.length}` : '');
    }
    if (status === 'ended') return 'Queue finished';
    if (status === 'error') return <span className="mb-error"><AlertTriangle size={11} /> Can’t play this track</span>;
    return '';
  };

  const pill = (
    <div className={`music-pill${playing ? ' playing' : ''}${open ? ' expanded' : ''}`} role="region" aria-label="Music player">
      <button
        type="button"
        className="pill-main"
        onClick={togglePanel}
        aria-expanded={open}
        aria-label={open ? 'Collapse music player' : 'Expand music player'}
        title={track ? track.title : 'Find focus music'}
      >
        <span className={`pill-thumb${playing ? ' playing' : ''}`} aria-hidden="true">
          {track?.thumbnail
            ? <img src={track.thumbnail} alt="" width={32} height={32} />
            : <Music2 size={14} />}
        </span>
        <span className="pill-title">{track ? track.title : 'Find focus music'}</span>
      </button>

      {playing && !playback.isBusy && (
        <span className="pill-waveform" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </span>
      )}

      <button
        type="button"
        className="mb-btn pill-play"
        onClick={actions.toggle}
        disabled={!track && queue.length === 0}
        title={playing ? 'Pause music' : 'Play music'}
        aria-label={playing ? 'Pause music' : 'Play music'}
      >
        {busyForTrack ? <Loader2 size={14} className="spin" /> : playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
    </div>
  );

  const toast = error && status === 'error' && (
    <div className="music-toast music-toast--inline" role="alert">
      <AlertTriangle size={14} />
      <span className="music-toast-text">{error.message}</span>
      <button type="button" className="link-btn" onClick={actions.retry}>Retry</button>
      {queue.length > 1 && <button type="button" className="link-btn" onClick={actions.next}>Skip</button>}
      <button type="button" className="link-btn muted" onClick={actions.clearError}>Dismiss</button>
    </div>
  );

  const expandedPanel = open && (
    <>
      <div
        className="music-backdrop"
        onClick={collapse}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        className="music-panel open"
        role="dialog"
        aria-label="Music player"
        aria-modal="true"
      >
        <div className="mp-mobile-handle" aria-hidden="true" onClick={collapse} />

        <div className="mp-header">
          <span className="mp-thumb" aria-hidden="true">
            {track?.thumbnail
              ? <img src={track.thumbnail} alt="" width={44} height={44} />
              : <Music2 size={20} />}
          </span>
          <div className="mp-meta">
            <span className="mp-title" title={track?.title}>{track ? track.title : 'Nothing playing'}</span>
            <span className="mp-sub">{subText()}</span>
          </div>
          <div className="mp-header-actions">
            <button
              type="button"
              className={`mb-btn${immersiveBackground ? ' on' : ''}`}
              onClick={toggleImmersiveBackground}
              title={`Immersive Music Background: ${immersiveBackground ? 'On' : 'Off'}`}
              aria-label="Toggle Immersive Music Background"
              aria-pressed={immersiveBackground}
            >
              <Sparkles size={16} />
            </button>
            <button
              type="button"
              className="mb-btn mp-close-btn"
              onClick={collapse}
              title="Close music player"
              aria-label="Close music player"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <PlayerProgress />

        <div className={`mp-vibe${vibe ? '' : ' empty'}${autoVibe ? '' : ' off'}`}>
          <span className="mp-vibe-mark" aria-hidden="true"><Waves size={14} /></span>
          <span className="mp-vibe-copy">
            <span className="mp-vibe-label" title={vibe?.query || 'Same-vibe autoplay'}>
              {vibe ? vibe.label : 'Same-vibe autoplay'}
            </span>
            <span className="mp-vibe-sub">
              {vibeLoading
                ? <><Loader2 size={10} className="spin" /> Finding more…</>
                : vibe
                  ? <><Lock size={10} /> {languageMeta.label}</>
                  : 'Keeps the current mood and language'}
            </span>
          </span>
          <button
            type="button"
            className={`mp-vibe-toggle${autoVibe ? ' on' : ''}`}
            onClick={actions.toggleAutoVibe}
            aria-pressed={autoVibe}
            aria-label={`Same-vibe autoplay ${autoVibe ? 'on' : 'off'}`}
            title={autoVibe ? 'Same-vibe autoplay is on' : 'Same-vibe autoplay is off'}
          >
            {vibeLoading ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />}
            <span>{autoVibe ? 'Auto' : 'Off'}</span>
          </button>
        </div>

        {vibeNote && <p className="mp-vibe-note" role="status">{vibeNote}</p>}

        <div className="mp-controls">
          <div className="mb-transport">
            <button type="button" className="mb-btn mb-prev" onClick={actions.prev} disabled={!hasPrev && !track} title="Previous track" aria-label="Previous track">
              <SkipBack size={18} />
            </button>
            <button
              type="button"
              className="mb-btn mb-play"
              onClick={actions.toggle}
              disabled={!track && queue.length === 0}
              title={playing ? 'Pause music' : 'Play music'}
              aria-label={playing ? 'Pause music' : 'Play music'}
            >
              {playback.isBusy ? <Loader2 size={18} className="spin" /> : playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button type="button" className="mb-btn mb-next" onClick={actions.next} disabled={!hasNext && queue.length < 2} title="Next track" aria-label="Next track">
              <SkipForward size={18} />
            </button>
          </div>

          <div className="mp-volume">
            <button type="button" className="mb-btn" onClick={actions.toggleMute} title={muted ? 'Unmute' : 'Mute'} aria-label={muted ? 'Unmute' : 'Mute'}>
              {volumeIcon}
            </button>
            <input
              type="range"
              className="mb-range mb-volume-inline"
              min={0}
              max={100}
              value={Math.round((muted ? 0 : volume) * 100)}
              onChange={(e) => actions.setVolume(Number(e.target.value) / 100)}
              aria-label="Volume"
            />
          </div>

          <div className="mp-secondary">
            <button type="button" className={`mb-btn${repeat !== 'off' ? ' on' : ''}`} onClick={actions.cycleRepeat} title={`Repeat: ${repeat}`} aria-label={`Repeat: ${repeat}. Click to change.`}>
              {repeatIcon}
            </button>
            <button type="button" className={`mb-btn${shuffle ? ' on' : ''}`} onClick={actions.toggleShuffle} title={shuffle ? 'Shuffle on' : 'Shuffle off'} aria-label="Toggle shuffle" aria-pressed={shuffle}>
              <Shuffle size={15} />
            </button>
            <button
              type="button"
              className={`mb-btn${playlistsOpen ? ' on' : ''}`}
              onClick={() => { setPlaylistsOpen((v) => !v); setPickerOpen(false); }}
              title="Manage playlists"
              aria-label="Manage playlists"
            >
              <ListMusic size={15} />
            </button>
          </div>
        </div>

        <Suspense fallback={<div className="mp-search-placeholder" aria-hidden="true" />}>
          {everOpened && <SearchSection inputRef={registerSearchInput} />}
        </Suspense>

        {/* Compact playlist selector */}
        <PlaylistSelector
          playlists={playlists}
          activeId={activeId}
          activePlaylist={activePlaylist}
          pickerOpen={pickerOpen}
          setPickerOpen={setPickerOpen}
          pickerRef={pickerRef}
          onSelect={(id) => {
            playlistActions.playPlaylist(id);
            setPickerOpen(false);
          }}
        />

        {playlistsOpen && (
          <Suspense fallback={(
            <div className="music-drawer" role="dialog" aria-label="Playlists">
              <div className="drawer-header">
                <span className="drawer-title">Playlists</span>
                <button type="button" className="drawer-close" onClick={() => setPlaylistsOpen(false)} aria-label="Close playlists">✕</button>
              </div>
              <p className="drawer-message"><Loader2 size={13} className="spin" style={{ verticalAlign: '-2px' }} /> Loading…</p>
            </div>
          )}>
            <PlaylistPanel onClose={() => setPlaylistsOpen(false)} />
          </Suspense>
        )}
      </div>
    </>
  );

  return (
    <div className="music-root music-root--sidebar" ref={rootRef}>
      {toast}
      {pill}
      {typeof document !== 'undefined' && createPortal(expandedPanel, document.body)}
    </div>
  );
}

// The seek bar is the only part of the player that needs the once-a-second
// progress values, so it lives in its own component: the pill above it stays
// completely still while a track plays.
// Separated playlist selector component with accessible popup positioning.
function PlaylistSelector({
  playlists,
  activeId,
  activePlaylist,
  pickerOpen,
  setPickerOpen,
  pickerRef,
  onSelect,
}) {
  return (
    <div className="mp-playlists" ref={pickerRef}>
      <button
        type="button"
        className="mp-playlist-btn"
        onClick={() => setPickerOpen((v) => !v)}
        aria-expanded={pickerOpen}
        aria-haspopup="menu"
      >
        <ListMusic size={14} className="mp-playlist-icon" />
        <span className="mp-playlist-name">{activePlaylist ? activePlaylist.name : 'Choose a playlist'}</span>
        <ChevronDown size={14} style={{ transform: pickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
      </button>
      {pickerOpen && (
        <ul className="mp-playlist-menu" role="menu" aria-label="Playlists">
          {playlists.length === 0 && (
            <li className="mp-playlist-empty">No playlists yet — use + on a search result to create one.</li>
          )}
          {playlists.map((p) => (
            <li key={p.id} role="none">
              <button
                type="button"
                role="menuitem"
                className={`mp-playlist-item${activeId === p.id ? ' active' : ''}`}
                onClick={() => onSelect(p.id)}
                disabled={!p.tracks?.length}
                title={p.tracks?.length ? `Play ${p.name}` : `${p.name} is empty`}
              >
                <span className="mp-playlist-item-name">{p.name}</span>
                <span className="mp-playlist-count tabular-nums">{p.tracks?.length || 0}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlayerProgress() {
  const { currentTime, duration } = useMusicProgress();
  const { actions } = useMusicActions();

  return (
    <div className="mp-progress">
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
  );
}
