// Shared, app-wide music playback controller.
// Exactly one YouTube IFrame player exists for the whole app; every UI piece
// reads and mutates it through this context. Nothing here touches the timer.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MusicPlaybackContext,
  MusicProgressContext,
  MusicActionsContext,
} from './MusicPlayerContextInstance';
import { loadYouTubeApi, describeYtError } from './youtubeIframe';

const QUEUE_SESSION_KEY = 'atleratimer_queue_v1';
const LAST_PLAYLIST_KEY = 'atleratimer_last_playlist_v1';
const PROGRESS_INTERVAL_MS = 900;

const INITIAL_STATE = {
  status: 'idle', // idle | loading | ready | playing | paused | buffering | ended | error
  track: null,
  queue: [],
  index: -1,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  muted: false,
  repeat: 'off', // off | one | all
  shuffle: false,
  error: null, // { message }
  unavailable: {}, // videoId -> true, e.g. embedding disabled
  playerVisible: false, // the small YouTube panel (kept visible while a track is loaded)
};

function readSessionQueue() {
  try {
    const raw = sessionStorage.getItem(QUEUE_SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.queue) && parsed.queue.length) return parsed;
  } catch { /* ignore */ }
  return null;
}

export function MusicProvider({ children }) {
  const [state, setState] = useState(() => {
    const restored = readSessionQueue();
    const index = restored ? Math.min(restored.index ?? 0, restored.queue.length - 1) : -1;
    return {
      ...INITIAL_STATE,
      queue: restored?.queue || [],
      index,
      track: restored?.queue?.[index] || null,
    };
  });

  const playerRef = useRef(null);      // YT.Player instance
  const creatingRef = useRef(false);   // guards double creation
  const stateRef = useRef(state);      // always-fresh mirror for event handlers
  const pollRef = useRef(null);
  const interactedRef = useRef(false); // any user gesture seen (autoplay policy)

  // Keep the mirror in step with the state. The YouTube callbacks read it
  // from outside React's render cycle, so it is updated after commit rather
  // than during render — a ref must never be mutated while rendering.
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const set = useCallback((patch) => {
    setState((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
  }, []);

  // ---- Mark first user gesture (browser autoplay policy) ------------------
  useEffect(() => {
    const mark = () => {
      interactedRef.current = true;
      window.removeEventListener('pointerdown', mark);
      window.removeEventListener('keydown', mark);
    };
    window.addEventListener('pointerdown', mark);
    window.addEventListener('keydown', mark);
    return () => {
      window.removeEventListener('pointerdown', mark);
      window.removeEventListener('keydown', mark);
    };
  }, []);

  // ---- Progress polling (only while actively playing) ---------------------
  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== 'function') return;
      try {
        const currentTime = player.getCurrentTime() || 0;
        const duration = player.getDuration() || 0;
        set((prev) =>
          prev.currentTime === currentTime && prev.duration === duration
            ? prev
            : { currentTime, duration }
        );
      } catch { /* player in transition */ }
    }, PROGRESS_INTERVAL_MS);
  }, [set]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // ---- Queue persistence (same-session resume, never autoplays) -----------
  useEffect(() => {
    try {
      if (state.queue.length) {
        sessionStorage.setItem(QUEUE_SESSION_KEY, JSON.stringify({ queue: state.queue, index: state.index }));
      } else {
        sessionStorage.removeItem(QUEUE_SESSION_KEY);
      }
    } catch { /* storage unavailable */ }
  }, [state.queue, state.index]);

  // ---- Load next in queue (used by ENDED) ---------------------------------
  const advance = useCallback((auto) => {
    const { queue, index, repeat, shuffle } = stateRef.current;
    if (!queue.length) return;
    let nextIndex;
    if (shuffle && queue.length > 1) {
      do { nextIndex = Math.floor(Math.random() * queue.length); } while (nextIndex === index);
    } else if (index < queue.length - 1) {
      nextIndex = index + 1;
    } else if (repeat === 'all' || auto) {
      nextIndex = 0;
    } else {
      set({ status: 'ended' });
      return;
    }
    const track = queue[nextIndex];
    // Auto/manual advance always surfaces the player (see setPlayerVisible).
    set({ track, index: nextIndex, status: 'loading', error: null, currentTime: 0, playerVisible: true });
    try {
      playerRef.current?.loadVideoById?.(track.videoId);
    } catch (err) {
      set({ status: 'error', error: { message: err?.message || 'Playback failed.' } });
    }
  }, [set]);

  // ---- YT event handlers --------------------------------------------------
  const handleStateChange = useCallback((event) => {
    const code = event.data;
    const player = playerRef.current;
    if (code === 1) { // PLAYING
      let duration = 0;
      try { duration = player?.getDuration?.() || 0; } catch { /* ignore */ }
      set({ status: 'playing', error: null, duration });
      startPolling();
    } else if (code === 2) { // PAUSED
      set({ status: 'paused' });
      stopPolling();
    } else if (code === 3) { // BUFFERING
      set({ status: 'buffering' });
    } else if (code === 0) { // ENDED
      stopPolling();
      if (stateRef.current.repeat === 'one') {
        try {
          player?.seekTo?.(0, true);
          player?.playVideo?.();
        } catch { /* ignore */ }
      } else {
        advance(true);
      }
    } else if (code === 5) { // CUED
      set({ status: 'ready' });
    }
  }, [set, startPolling, stopPolling, advance]);

  const handleError = useCallback((event) => {
    const code = event?.data;
    const track = stateRef.current.track;
    stopPolling();
    set((prev) => ({
      status: 'error',
      error: { message: describeYtError(code) },
      unavailable: track ? { ...prev.unavailable, [track.videoId]: true } : prev.unavailable,
    }));
  }, [set, stopPolling]);

  // ---- Player creation (once per app lifetime) ----------------------------
  const ensurePlayer = useCallback(async () => {
    if (playerRef.current) return playerRef.current;
    if (creatingRef.current) {
      // Wait for the in-flight creation to finish
      for (let i = 0; i < 100 && !playerRef.current; i += 1) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (playerRef.current) return playerRef.current;
      throw new Error('The music player is still starting — try again in a moment.');
    }
    creatingRef.current = true;
    try {
      const YT = await loadYouTubeApi();
      const host = document.getElementById('atlera-yt-host');
      if (!host) throw new Error('Music player component isn’t mounted.');
      const player = new YT.Player(host, {
        height: '200',
        width: '200',
        playerVars: {
          autoplay: 0, // playback only ever starts from an explicit user action
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            try { player.setVolume(Math.round(stateRef.current.volume * 100)); } catch { /* ignore */ }
          },
          onStateChange: handleStateChange,
          onError: handleError,
        },
      });
      playerRef.current = player;
      return player;
    } finally {
      creatingRef.current = false;
    }
  }, [handleStateChange, handleError]);

  // ---- Public actions -----------------------------------------------------
  const playTrack = useCallback(async (track, options = {}) => {
    if (!track?.videoId) return;
    const queue = options.queue || stateRef.current.queue || [];
    let index = options.index;
    if (index == null) index = queue.findIndex((t) => t.videoId === track.videoId);
    if (index == null || index < 0) index = 0;

    set({ status: 'loading', track, queue, index, error: null, currentTime: 0, playerVisible: true });

    try {
      const player = await ensurePlayer();
      // The user clicked something — that is the gesture that permits playback
      player.loadVideoById(track.videoId);
    } catch (err) {
      set({ status: 'error', error: { message: err?.message || 'Couldn’t start the player.' } });
    }
  }, [ensurePlayer, set]);

  const playAll = useCallback((tracks, startIndex = 0) => {
    if (!tracks?.length) return;
    const index = Math.max(0, Math.min(startIndex, tracks.length - 1));
    playTrack(tracks[index], { queue: tracks, index });
  }, [playTrack]);

  const toggle = useCallback(() => {
    const player = playerRef.current;
    if (!player || !stateRef.current.track) return;
    try {
      if (stateRef.current.status === 'playing') player.pauseVideo();
      else {
        // Resuming requires the player to be on screen (YouTube policy).
        set({ playerVisible: true });
        player.playVideo();
      }
    } catch (err) {
      set({ status: 'error', error: { message: err?.message || 'Playback control failed.' } });
    }
  }, [set]);

  const next = useCallback(() => advance(false), [advance]);

  const prev = useCallback(() => {
    const player = playerRef.current;
    const { index, queue } = stateRef.current;
    if (index > 0) {
      const track = queue[index - 1];
      set({ track, index: index - 1, status: 'loading', error: null, currentTime: 0 });
      try { player?.loadVideoById?.(track.videoId); } catch { /* handled by onError */ }
    } else {
      try { player?.seekTo?.(0, true); } catch { /* ignore */ }
    }
  }, [set]);

  const seekFraction = useCallback((fraction) => {
    const player = playerRef.current;
    const duration = stateRef.current.duration || player?.getDuration?.() || 0;
    if (!player || !duration) return;
    try {
      player.seekTo(Math.max(0, Math.min(1, fraction)) * duration, true);
      set({ currentTime: Math.max(0, Math.min(1, fraction)) * duration });
    } catch { /* ignore */ }
  }, [set]);

  const setVolume = useCallback((volume) => {
    const clamped = Math.max(0, Math.min(1, volume));
    set({ volume: clamped, muted: clamped === 0 });
    try {
      playerRef.current?.setVolume?.(Math.round(clamped * 100));
      if (clamped > 0) playerRef.current?.unMute?.();
      else playerRef.current?.mute?.();
    } catch { /* ignore */ }
  }, [set]);

  const toggleMute = useCallback(() => {
    const muted = !stateRef.current.muted;
    set({ muted });
    try {
      if (muted) playerRef.current?.mute?.();
      else playerRef.current?.unMute?.();
    } catch { /* ignore */ }
  }, [set]);

  const cycleRepeat = useCallback(() => {
    set((prev) => ({ repeat: prev.repeat === 'off' ? 'all' : prev.repeat === 'all' ? 'one' : 'off' }));
  }, [set]);

  const toggleShuffle = useCallback(() => {
    set((prev) => ({ shuffle: !prev.shuffle }));
  }, [set]);

  const enqueue = useCallback((track) => {
    if (!track?.videoId) return;
    set((prev) => {
      if (prev.queue.some((t) => t.videoId === track.videoId)) return prev;
      const queue = [...prev.queue, track];
      const index = prev.index < 0 ? 0 : prev.index;
      const patch = { queue, index };
      if (!prev.track) {
        patch.track = queue[index];
        patch.status = 'idle'; // queued, not playing — user must press play
      }
      return patch;
    });
  }, [set]);

  const removeQueued = useCallback((trackId) => {
    set((prev) => {
      const removedIndex = prev.queue.findIndex((t) => t.id === trackId || t.videoId === trackId);
      if (removedIndex < 0) return prev;
      const queue = prev.queue.filter((_, i) => i !== removedIndex);
      let index = prev.index;
      let track = prev.track;
      let status = prev.status;
      if (removedIndex === prev.index) {
        index = Math.min(prev.index, queue.length - 1);
        track = queue[index] || null;
        status = 'idle';
        try { playerRef.current?.stopVideo?.(); } catch { /* ignore */ }
        stopPolling();
      } else if (removedIndex < prev.index) {
        index = prev.index - 1;
      }
      return { ...prev, queue, index, track, status };
    });
  }, [set, stopPolling]);

  const stop = useCallback(() => {
    try { playerRef.current?.stopVideo?.(); } catch { /* ignore */ }
    stopPolling();
    set({ status: 'idle', track: null, index: -1, currentTime: 0, duration: 0, error: null, playerVisible: false });
  }, [set, stopPolling]);

  const clearError = useCallback(() => set((prev) => ({ ...prev, error: null })), [set]);

  const retry = useCallback(() => {
    const { track } = stateRef.current;
    if (track) playTrack(track, { queue: stateRef.current.queue, index: stateRef.current.index });
  }, [playTrack]);

  const setPlayerVisible = useCallback((visible) => {
    if (!visible) {
      // YouTube policy: the embedded player must stay visible while it
      // plays. Hiding the panel always pauses playback first.
      try { playerRef.current?.pauseVideo?.(); } catch { /* ignore */ }
    }
    set({ playerVisible: visible });
  }, [set]);

  const setQueue = useCallback(
    (queue, index = 0) => set({ queue, index, track: queue[index] || null }),
    [set]
  );

  // ---- remember-last-playlist helpers (used by PlaylistContext) -----------
  const lastPlaylist = useMemo(() => ({
    get: () => { try { return localStorage.getItem(LAST_PLAYLIST_KEY) || null; } catch { return null; } },
    set: (id) => { try { if (id) localStorage.setItem(LAST_PLAYLIST_KEY, id); else localStorage.removeItem(LAST_PLAYLIST_KEY); } catch { /* ignore */ } },
  }), []);

  // ---- Cleanup on unmount -------------------------------------------------
  useEffect(() => () => {
    stopPolling();
    try { playerRef.current?.destroy?.(); } catch { /* ignore */ }
    playerRef.current = null;
  }, [stopPolling]);

  // ---- Context values -----------------------------------------------------
  // The three contexts are split so that the once-per-second progress poll
  // only re-renders the (tiny) progress readout instead of every consumer.

  // Derived booleans are computed outside the memo so the memo only depends
  // on values that actually change.
  const canGoPrev = state.queue.length > 1 || state.currentTime > 2;

  const playbackValue = useMemo(() => ({
    track: state.track,
    status: state.status,
    index: state.index,
    queue: state.queue,
    playerVisible: state.playerVisible,
    error: state.error,
    repeat: state.repeat,
    shuffle: state.shuffle,
    volume: state.volume,
    muted: state.muted,
    unavailable: state.unavailable,
    isBusy: state.status === 'loading' || state.status === 'buffering',
    hasNext: state.queue.length > 1,
    hasPrev: canGoPrev,
  }), [
    state.track,
    state.status,
    state.index,
    state.queue,
    state.playerVisible,
    state.error,
    state.repeat,
    state.shuffle,
    state.volume,
    state.muted,
    state.unavailable,
    canGoPrev,
  ]);

  const progressValue = useMemo(() => ({
    currentTime: state.currentTime,
    duration: state.duration,
  }), [state.currentTime, state.duration]);

  const actionsValue = useMemo(() => ({
    actions: {
      playTrack, playAll, toggle, next, prev, seekFraction,
      setVolume, toggleMute, cycleRepeat, toggleShuffle,
      enqueue, removeQueued, stop, retry, clearError,
      setPlayerVisible, setQueue,
    },
    lastPlaylist,
  }), [
    playTrack, playAll, toggle, next, prev, seekFraction,
    setVolume, toggleMute, cycleRepeat, toggleShuffle,
    enqueue, removeQueued, stop, retry, clearError,
    setPlayerVisible, setQueue, lastPlaylist,
  ]);

  return (
    <MusicActionsContext.Provider value={actionsValue}>
      <MusicProgressContext.Provider value={progressValue}>
        <MusicPlaybackContext.Provider value={playbackValue}>
          {children}
          {/* Persistent host for the single YouTube player instance.
              The IFrame API replaces this div with the player, so it must never unmount. */}
          <div className={`yt-host-wrap${state.playerVisible && state.track ? ' visible' : ''}`} aria-hidden={!state.playerVisible}>
            <div id="atlera-yt-host" />
          </div>
        </MusicPlaybackContext.Provider>
      </MusicProgressContext.Provider>
    </MusicActionsContext.Provider>
  );
}

