// Compact floating mini player — an Apple-Dynamic-Island-inspired pill that
// expands into a floating panel. One instance lives in AppShell; all playback
// goes through the shared MusicPlayerContext (never a second player). The
// panel stays mounted and is hidden with CSS, so expanding/collapsing never
// disturbs playback or loses search/playlist state.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMusic } from './MusicPlayerContext';
import { usePlaylists } from './PlaylistContext';
import { formatTime } from './youtubeIframe';
import SearchSection from './SearchPanel';
import PlaylistPanel from './PlaylistPanel';
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle,
  Volume2, VolumeX, Search, ListMusic, ListVideo, ChevronDown,
  Loader2, AlertTriangle, Music2,
} from 'lucide-react';

export default function MusicBar() {
  const { state, isBusy, actions } = useMusic();
  const { playlists, activeId, activePlaylist, actions: playlistActions } = usePlaylists();

  const [open, setOpen] = useState(false);
  const [playlistsOpen, setPlaylistsOpen] = useState(false); // full management drawer
  const [pickerOpen, setPickerOpen] = useState(false);       // compact playlist selector
  const rootRef = useRef(null);
  const searchInputRef = useRef(null);
  const pickerRef = useRef(null);

  const { status, track, queue, index, currentTime, duration, volume, muted, repeat, shuffle, error } = state;
  const playing = status === 'playing';
  const hasNext = queue.length > 1 || repeat === 'all';
  const hasPrev = queue.length > 1 || currentTime > 2;

  // Expanding always focuses the search input (search icon or pill click).
  useEffect(() => {
    if (!open) return undefined;
    const id = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Outside click + Escape collapse the panel (playback keeps running).
  useEffect(() => {
    if (!open && !pickerOpen && !playlistsOpen) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setPickerOpen(false);
        setPlaylistsOpen(false);
      } else if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
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

  const collapse = useCallback(() => setOpen(false), []);
  const repeatIcon = repeat === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />;
  const volumeIcon = muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />;
  const busyForTrack = isBusy && status === 'loading';

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

  return (
    <div className="music-root" ref={rootRef}>
      {/* Expanded panel (mounted; hidden via CSS so state survives) */}
      <div
        className={`music-panel${open ? ' open' : ''}`}
        role="dialog"
        aria-label="Music player"
        aria-hidden={!open}
      >
        <div className="mp-header">
          <span className="mp-thumb" aria-hidden="true">
            {track?.thumbnail
              ? <img src={track.thumbnail} alt="" width={36} height={36} />
              : <Music2 size={16} />}
          </span>
          <div className="mp-meta">
            <span className="mp-title" title={track?.title}>{track ? track.title : 'Nothing playing'}</span>
            <span className="mp-sub">{subText()}</span>
          </div>
          <div className="mp-header-actions">
            <button
              type="button"
              className={`mb-btn${state.playerVisible ? ' on' : ''}`}
              onClick={() => actions.setPlayerVisible(!state.playerVisible)}
              title={state.playerVisible ? 'Hide video player' : 'Show video player'}
              aria-label="Toggle video player"
              aria-pressed={state.playerVisible}
            >
              <ListVideo size={15} />
            </button>
            <button type="button" className="mb-btn" onClick={collapse} title="Collapse player" aria-label="Collapse player">
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        <SearchSection inputRef={searchInputRef} />

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

        <div className="mp-controls">
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
            <button type="button" className="mb-btn" onClick={() => setPlaylistsOpen(true)} title="Manage playlists" aria-label="Manage playlists">
              <ListMusic size={15} />
            </button>
          </div>
        </div>

        {/* Compact playlist selector */}
        <div className="mp-playlists" ref={pickerRef}>
          <button
            type="button"
            className="mp-playlist-btn"
            onClick={() => setPickerOpen((v) => !v)}
            aria-expanded={pickerOpen}
            aria-haspopup="menu"
          >
            <ListMusic size={13} />
            <span className="mp-playlist-name">{activePlaylist ? activePlaylist.name : 'Choose a playlist'}</span>
            <ChevronDown size={13} style={{ transform: pickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
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
                    onClick={() => { playlistActions.playPlaylist(p.id); setPickerOpen(false); }}
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
      </div>

      {/* Collapsed pill */}
      <div className="music-pill" role="region" aria-label="Music player">
        <button
          type="button"
          className="pill-main"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Collapse music player' : 'Expand music player'}
          title={track ? track.title : 'Find your focus music'}
        >
          <span className="pill-thumb" aria-hidden="true">
            {track?.thumbnail
              ? <img src={track.thumbnail} alt="" width={34} height={34} />
              : <Music2 size={15} />}
          </span>
          <span className="pill-title">{track ? track.title : 'Find your focus music'}</span>
        </button>

        {playing && !isBusy && (
          <span className="pill-waveform" aria-hidden="true">
            <span /><span /><span /><span /><span />
          </span>
        )}

        <button
          type="button"
          className="mb-btn pill-play"
          onClick={actions.toggle}
          disabled={!track && queue.length === 0}
          title={playing ? 'Pause' : 'Play'}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {busyForTrack ? <Loader2 size={15} className="spin" /> : playing ? <Pause size={15} /> : <Play size={15} />}
        </button>

        <button
          type="button"
          className="mb-btn pill-search"
          onClick={() => setOpen(true)}
          title="Search music"
          aria-label="Search music"
        >
          <Search size={15} />
        </button>
      </div>

      {playlistsOpen && <PlaylistPanel onClose={() => setPlaylistsOpen(false)} />}

      {error && status === 'error' && (
        <div className="music-toast" role="alert">
          <AlertTriangle size={14} />
          <span>{error.message}</span>
          <button type="button" className="link-btn" onClick={actions.retry}>Retry</button>
          {queue.length > 1 && <button type="button" className="link-btn" onClick={actions.next}>Skip</button>}
          <button type="button" className="link-btn muted" onClick={actions.clearError}>Dismiss</button>
        </div>
      )}
    </div>
  );
}
