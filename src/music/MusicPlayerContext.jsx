// Shared, app-wide music playback controller.
// Exactly one YouTube IFrame player exists for the whole app; every UI piece
// reads and mutates it through this context. Nothing here touches the timer.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MusicPlaybackContext,
  MusicProgressContext,
  MusicActionsContext,
} from './MusicPlayerContextInstance';
import { useTimerState } from '../context/useTimer';
import { loadYouTubeApi, describeYtError } from './youtubeIframe';
import {
  findNextAutoplayTrack,
  CURATED_FOCUS_TRACKS,
} from './autoplayEngine';


const QUEUE_SESSION_KEY = 'atleratimer_queue_v1';
const LAST_PLAYLIST_KEY = 'atleratimer_last_playlist_v1';
const AUTO_VIBE_KEY = 'atleratimer_auto_vibe_v1';
const AUTOPLAY_KEY = 'atleratimer_autoplay_v1';
const MUSIC_UI_STATE_KEY = 'atleratimer_music_ui_state_v1';
const HISTORY_KEY = 'atleratimer_history_v1';
const PROGRESS_INTERVAL_MS = 900;

function readAutoVibePref() {
  try {
    const raw = localStorage.getItem(AUTO_VIBE_KEY);
    return raw == null ? true : raw === '1';
  } catch {
    return true;
  }
}

function readAutoplayPref() {
  try {
    const raw = localStorage.getItem(AUTOPLAY_KEY);
    return raw == null ? true : raw === '1';
  } catch {
    return true;
  }
}

function readMusicUiStatePref() {
  try {
    const raw = localStorage.getItem(MUSIC_UI_STATE_KEY);
    if (raw === 'compact' || raw === 'expanded' || raw === 'hidden') return raw;
    return 'compact';
  } catch {
    return 'compact';
  }
}

function readHistory() {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readSessionQueue() {
  try {
    const raw = sessionStorage.getItem(QUEUE_SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.queue) && parsed.queue.length) return parsed;
  } catch { /* ignore */ }
  return null;
}

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
  unavailable: {}, // videoId -> true
  playerVisible: false,
  musicUiState: 'compact', // 'compact' | 'expanded' | 'hidden'
  autoplay: true, // queue-first intelligent autoplay
  activeCategory: 'deep-focus',
  activePlaylistId: null,
  activePlaylistTitle: null,
  activePlaylistTracks: null,
  history: [],
  autoplayReason: null,
  vibe: null,
  autoVibe: true,
  vibeLoading: false,
  vibeNote: '',
};

export function MusicProvider({ children }) {
  const timerState = useTimerState();
  const isImmersivePref = Boolean(timerState?.data?.musicSettings?.immersiveBackground);
  const isFocusView = timerState?.activeView === 'focus';
  const isImmersive = isImmersivePref && isFocusView;

  const [state, setState] = useState(() => {
    const restored = readSessionQueue();
    const index = restored ? Math.min(restored.index ?? 0, restored.queue.length - 1) : -1;
    const defaultTrack = restored?.queue?.[index] || CURATED_FOCUS_TRACKS[0];
    const defaultQueue = restored?.queue || [CURATED_FOCUS_TRACKS[0], CURATED_FOCUS_TRACKS[1], CURATED_FOCUS_TRACKS[2]];

    return {
      ...INITIAL_STATE,
      queue: defaultQueue,
      index: restored ? index : 0,
      track: defaultTrack,
      musicUiState: readMusicUiStatePref(),
      autoplay: readAutoplayPref(),
      autoVibe: readAutoVibePref(),
      history: readHistory(),
      vibe: restored?.vibe?.query
        ? { ...restored.vibe, pageToken: null, variant: 0, pages: 0, exhausted: false }
        : null,
    };
  });

  const playerRef = useRef(null);      // YT.Player instance
  const playerReadyRef = useRef(null); // Promise<YT.Player> resolved after onReady
  const creatingRef = useRef(false);   // guards double creation
  const stateRef = useRef(state);      // always-fresh mirror for handlers
  const pollRef = useRef(null);
  const interactedRef = useRef(false); // user gesture flag
  const vibeFetchKeyRef = useRef('');
  const transitionLockRef = useRef(false);
  const lastTransitionTimeRef = useRef(0);

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
      } catch { /* player transitioning */ }
    }, PROGRESS_INTERVAL_MS);
  }, [set]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // ---- Queue persistence --------------------------------------------------
  useEffect(() => {
    try {
      if (state.queue.length) {
        sessionStorage.setItem(QUEUE_SESSION_KEY, JSON.stringify({
          queue: state.queue,
          index: state.index,
          vibe: state.vibe,
        }));
      } else {
        sessionStorage.removeItem(QUEUE_SESSION_KEY);
      }
    } catch { /* storage full / blocked */ }
  }, [state.queue, state.index, state.vibe]);

  // ---- Queue continuation (Guaranteed Single Transition Guard) ------------
  const advance = useCallback((auto) => {
    const now = Date.now();
    // Guard against duplicate transitions when YouTube fires state 0 multiple times
    if (transitionLockRef.current || (now - lastTransitionTimeRef.current < 900)) {
      return;
    }
    transitionLockRef.current = true;
    lastTransitionTimeRef.current = now;
    setTimeout(() => {
      transitionLockRef.current = false;
    }, 900);

    const {
      queue, index, repeat, shuffle, autoplay, track, history,
      activeCategory, activePlaylistTracks, activePlaylistTitle, unavailable,
    } = stateRef.current;

    // Track current in history
    if (track?.videoId) {
      const nextHistory = [track.videoId, ...(history || []).filter((id) => id !== track.videoId)].slice(0, 50);
      try {
        sessionStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
      } catch { /* ignore */ }
      set((prev) => ({ ...prev, history: nextHistory }));
    }

    if (!queue.length) return;

    const load = (nextIndex, reason = null) => {
      const nextTrack = queue[nextIndex];
      if (!nextTrack) return;
      set({
        track: nextTrack,
        index: nextIndex,
        status: 'loading',
        error: null,
        currentTime: 0,
        playerVisible: true,
        autoplayReason: reason,
      });
      try {
        playerRef.current?.loadVideoById?.(nextTrack.videoId);
      } catch (err) {
        set({ status: 'error', error: { message: err?.message || 'Playback failed.' } });
      }
    };

    // 1. Repeat One
    if (repeat === 'one' && auto) {
      load(index);
      return;
    }

    // 2. Shuffle within Queue
    if (shuffle && queue.length > 1) {
      let nextIndex;
      let attempts = 0;
      do {
        nextIndex = Math.floor(Math.random() * queue.length);
        attempts++;
      } while (nextIndex === index && attempts < 10);
      load(nextIndex);
      return;
    }

    // 3. Next Track in Queue
    if (index < queue.length - 1) {
      load(index + 1);
      return;
    }

    // 4. Repeat All
    if (repeat === 'all') {
      load(0);
      return;
    }

    // 5. Intelligent Autoplay recommendation when queue finishes
    if (auto && autoplay) {
      const historySet = new Set(stateRef.current.history || []);
      if (track?.videoId) historySet.add(track.videoId);

      const nextRec = findNextAutoplayTrack({
        autoplay: true,
        category: activeCategory,
        currentTrack: track,
        playlistTracks: activePlaylistTracks,
        playlistTitle: activePlaylistTitle,
      }, historySet, unavailable);

      if (nextRec?.track) {
        const nextTrack = nextRec.track;
        const nextQueue = [...queue, nextTrack];
        const nextIndex = queue.length;
        set({
          queue: nextQueue,
          index: nextIndex,
          track: nextTrack,
          status: 'loading',
          error: null,
          currentTime: 0,
          playerVisible: true,
          autoplayReason: nextRec.reason,
        });
        try {
          playerRef.current?.loadVideoById?.(nextTrack.videoId);
        } catch (err) {
          set({ status: 'error', error: { message: err?.message || 'Playback failed.' } });
        }
        return;
      }
    }

    // 6. Queue ended cleanly
    set({ status: 'ended', autoplayReason: 'Queue finished. Autoplay paused.' });
  }, [set]);

  // ---- YT Event Handlers --------------------------------------------------
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

  // ---- Player Creation (single instance for app lifetime) -----------------
  const ensurePlayer = useCallback(async () => {
    if (playerReadyRef.current) return playerReadyRef.current;
    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      return playerRef.current;
    }

    if (!creatingRef.current) {
      creatingRef.current = true;
      playerReadyRef.current = (async () => {
        try {
          const YT = await loadYouTubeApi();
          const host = document.getElementById('atlera-yt-host');
          if (!host) throw new Error('Music player component isn’t mounted.');

          return await new Promise((resolve, reject) => {
            let settled = false;
            let player = null;
            const timer = setTimeout(() => {
              if (settled) return;
              settled = true;
              reject(new Error('The YouTube player took too long to start.'));
            }, 15000);
            const ready = () => {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              try { player.setVolume(Math.round(stateRef.current.volume * 100)); } catch { /* ignore */ }
              resolve(player);
            };

            try {
              player = new YT.Player(host, {
                height: '200',
                width: '200',
                playerVars: {
                  autoplay: 0,
                  controls: 1,
                  rel: 0,
                  modestbranding: 1,
                  playsinline: 1,
                  origin: window.location.origin,
                },
                events: {
                  onReady: ready,
                  onStateChange: handleStateChange,
                  onError: handleError,
                },
              });
              playerRef.current = player;
            } catch (err) {
              settled = true;
              clearTimeout(timer);
              reject(err);
            }
          });
        } catch (err) {
          playerRef.current = null;
          playerReadyRef.current = null;
          throw err;
        } finally {
          creatingRef.current = false;
        }
      })();
    }

    return playerReadyRef.current;
  }, [handleStateChange, handleError]);

  // ---- Public Actions -----------------------------------------------------
  const playTrack = useCallback(async (track, options = {}) => {
    if (!track?.videoId) return;
    const queue = options.queue || stateRef.current.queue || [track];
    let index = options.index;
    if (index == null) index = queue.findIndex((t) => t.videoId === track.videoId);
    if (index == null || index < 0) index = 0;

    const hasVibeOption = Object.prototype.hasOwnProperty.call(options, 'vibe');
    const vibe = hasVibeOption
      ? (options.vibe ? {
        ...options.vibe,
        pageToken: options.vibe.pageToken || null,
        variant: options.vibe.variant || 0,
        pages: 0,
        exhausted: false,
      } : null)
      : stateRef.current.vibe;
    if (hasVibeOption) vibeFetchKeyRef.current = '';

    set({
      status: 'loading',
      track,
      queue,
      index,
      vibe,
      vibeNote: '',
      vibeLoading: false,
      error: null,
      currentTime: 0,
      playerVisible: true,
      autoplayReason: options.autoplayReason || null,
      activePlaylistTitle: options.playlistTitle || stateRef.current.activePlaylistTitle,
    });

    try {
      const player = await ensurePlayer();
      player.loadVideoById(track.videoId);
    } catch (err) {
      set({ status: 'error', error: { message: err?.message || 'Couldn’t start playback.' } });
    }
  }, [ensurePlayer, set]);

  const playAll = useCallback((tracks, startIndex = 0, options = {}) => {
    if (!tracks?.length) return;
    const index = Math.max(0, Math.min(startIndex, tracks.length - 1));
    playTrack(tracks[index], { ...options, queue: tracks, index });
  }, [playTrack]);

  const playPlaylist = useCallback((playlist, startIndex = 0, options = {}) => {
    const tracks = playlist?.tracks || [];
    if (!tracks.length) return;
    const idx = Math.max(0, Math.min(startIndex, tracks.length - 1));
    set({
      activePlaylistId: playlist.id || playlist.playlistId || null,
      activePlaylistTitle: playlist.name || playlist.title || 'Playlist',
      activePlaylistTracks: tracks,
      activeCategory: playlist.category || stateRef.current.activeCategory,
    });
    playTrack(tracks[idx], {
      ...options,
      queue: tracks,
      index: idx,
      playlistTitle: playlist.name || playlist.title,
    });
  }, [playTrack, set]);

  const toggle = useCallback(() => {
    const player = playerRef.current;
    if (!player || !stateRef.current.track) return;
    try {
      if (stateRef.current.status === 'playing') player.pauseVideo?.();
      else {
        set({ playerVisible: true });
        player.playVideo?.();
      }
    } catch (err) {
      set({ status: 'error', error: { message: err?.message || 'Playback control failed.' } });
    }
  }, [set]);

  const next = useCallback(() => advance(false), [advance]);

  const prev = useCallback(() => {
    const player = playerRef.current;
    const { index, queue, currentTime } = stateRef.current;
    if (currentTime > 3) {
      try { player?.seekTo?.(0, true); } catch { /* ignore */ }
      return;
    }
    if (index > 0) {
      const track = queue[index - 1];
      set({ track, index: index - 1, status: 'loading', error: null, currentTime: 0 });
      try { player?.loadVideoById?.(track.videoId); } catch { /* ignore */ }
    } else {
      try { player?.seekTo?.(0, true); } catch { /* ignore */ }
    }
  }, [set]);

  const seekFraction = useCallback((fraction) => {
    const player = playerRef.current;
    const duration = stateRef.current.duration || player?.getDuration?.() || 0;
    if (!player || !duration) return;
    try {
      const targetTime = Math.max(0, Math.min(1, fraction)) * duration;
      player.seekTo(targetTime, true);
      set({ currentTime: targetTime });
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

  const toggleAutoplay = useCallback(() => {
    set((prev) => {
      const nextAutoplay = !prev.autoplay;
      try { localStorage.setItem(AUTOPLAY_KEY, nextAutoplay ? '1' : '0'); } catch { /* ignore */ }
      return { ...prev, autoplay: nextAutoplay };
    });
  }, [set]);

  const setAutoplay = useCallback((enabled) => {
    try { localStorage.setItem(AUTOPLAY_KEY, enabled ? '1' : '0'); } catch { /* ignore */ }
    set({ autoplay: Boolean(enabled) });
  }, [set]);

  const setActiveCategory = useCallback((catId) => {
    set({ activeCategory: catId });
  }, [set]);

  // Queue actions
  const addToQueue = useCallback((track) => {
    if (!track?.videoId) return;
    set((prev) => {
      if (prev.queue.some((t) => t.videoId === track.videoId)) return prev;
      const queue = [...prev.queue, track];
      const index = prev.index < 0 ? 0 : prev.index;
      const patch = { queue, index };
      if (!prev.track) {
        patch.track = queue[index];
        patch.status = 'idle';
      }
      return patch;
    });
  }, [set]);

  const playNext = useCallback((track) => {
    if (!track?.videoId) return;
    set((prev) => {
      const queue = [...prev.queue];
      const currentIndex = prev.index < 0 ? 0 : prev.index;
      queue.splice(currentIndex + 1, 0, track);
      return { ...prev, queue };
    });
  }, [set]);

  const removeQueued = useCallback((target) => {
    set((prev) => {
      const removedIndex = typeof target === 'number'
        ? target
        : prev.queue.findIndex((t) => t.id === target || t.videoId === target);
      if (removedIndex < 0 || removedIndex >= prev.queue.length) return prev;
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

  const clearQueue = useCallback(() => {
    set((prev) => ({
      ...prev,
      queue: prev.track ? [prev.track] : [],
      index: prev.track ? 0 : -1,
    }));
  }, [set]);

  const reorderQueue = useCallback((newQueue) => {
    if (!Array.isArray(newQueue)) return;
    set((prev) => {
      const currentVid = prev.track?.videoId;
      const nextIndex = currentVid ? newQueue.findIndex((t) => t.videoId === currentVid) : 0;
      return {
        ...prev,
        queue: newQueue,
        index: nextIndex >= 0 ? nextIndex : 0,
      };
    });
  }, [set]);

  // HUD / UI state controls
  const setMusicUiState = useCallback((uiState) => {
    try { localStorage.setItem(MUSIC_UI_STATE_KEY, uiState); } catch { /* ignore */ }
    set({ musicUiState: uiState });
  }, [set]);

  const openExpanded = useCallback(() => setMusicUiState('expanded'), [setMusicUiState]);
  const minimize = useCallback(() => setMusicUiState('compact'), [setMusicUiState]);
  const closeMusic = useCallback(() => setMusicUiState('hidden'), [setMusicUiState]);
  const restoreHud = useCallback(() => setMusicUiState('compact'), [setMusicUiState]);

  const stop = useCallback(() => {
    try { playerRef.current?.stopVideo?.(); } catch { /* ignore */ }
    stopPolling();
    vibeFetchKeyRef.current = '';
    set({
      status: 'idle',
      currentTime: 0,
      playerVisible: false,
      autoplayReason: null,
    });
  }, [set, stopPolling]);

  const clearError = useCallback(() => set((prev) => ({ ...prev, error: null })), [set]);

  const retry = useCallback(() => {
    const { track } = stateRef.current;
    if (track) playTrack(track, { queue: stateRef.current.queue, index: stateRef.current.index });
  }, [playTrack]);

  const setPlayerVisible = useCallback((visible) => {
    if (!visible) {
      try { playerRef.current?.pauseVideo?.(); } catch { /* ignore */ }
    }
    set({ playerVisible: visible });
  }, [set]);

  const setQueue = useCallback(
    (queue, index = 0, vibe = undefined) => {
      if (vibe !== undefined) vibeFetchKeyRef.current = '';
      set((prev) => ({
        ...prev,
        queue,
        index,
        track: queue[index] || null,
        ...(vibe !== undefined ? { vibe } : null),
      }));
    },
    [set]
  );

  const toggleAutoVibe = useCallback(() => {
    set((prev) => {
      const autoVibe = !prev.autoVibe;
      try { localStorage.setItem(AUTO_VIBE_KEY, autoVibe ? '1' : '0'); } catch { /* ignore */ }
      if (autoVibe) vibeFetchKeyRef.current = '';
      return { autoVibe, vibeNote: autoVibe ? prev.vibeNote : '' };
    });
  }, [set]);

  const lastPlaylist = useMemo(() => ({
    get: () => { try { return localStorage.getItem(LAST_PLAYLIST_KEY) || null; } catch { return null; } },
    set: (id) => { try { if (id) localStorage.setItem(LAST_PLAYLIST_KEY, id); else localStorage.removeItem(LAST_PLAYLIST_KEY); } catch { /* ignore */ } },
  }), []);

  // ---- Cleanup on unmount -------------------------------------------------
  useEffect(() => () => {
    stopPolling();
    try { playerRef.current?.destroy?.(); } catch { /* ignore */ }
    playerRef.current = null;
    playerReadyRef.current = null;
    creatingRef.current = false;
  }, [stopPolling]);

  // Derived booleans
  const canGoPrev = state.queue.length > 1 || state.currentTime > 2;

  const isVideoPlayable = Boolean(
    isImmersive &&
    state.track?.videoId &&
    state.track?.embeddable !== false &&
    !state.unavailable[state.track.videoId] &&
    state.status !== 'error' &&
    (state.status === 'playing' || state.status === 'buffering' || state.status === 'ready')
  );

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
    musicUiState: state.musicUiState,
    autoplay: state.autoplay,
    activeCategory: state.activeCategory,
    activePlaylistId: state.activePlaylistId,
    activePlaylistTitle: state.activePlaylistTitle,
    activePlaylistTracks: state.activePlaylistTracks,
    history: state.history,
    autoplayReason: state.autoplayReason,
    vibe: state.vibe,
    autoVibe: state.autoVibe,
    vibeLoading: state.vibeLoading,
    vibeNote: state.vibeNote,
    isImmersive,
    isVideoPlayable,
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
    state.musicUiState,
    state.autoplay,
    state.activeCategory,
    state.activePlaylistId,
    state.activePlaylistTitle,
    state.activePlaylistTracks,
    state.history,
    state.autoplayReason,
    state.vibe,
    state.autoVibe,
    state.vibeLoading,
    state.vibeNote,
    canGoPrev,
    isImmersive,
    isVideoPlayable,
  ]);

  const progressValue = useMemo(() => ({
    currentTime: state.currentTime,
    duration: state.duration,
  }), [state.currentTime, state.duration]);

  const actionsValue = useMemo(() => ({
    actions: {
      playTrack,
      playAll,
      playPlaylist,
      toggle,
      next,
      prev,
      seekFraction,
      setVolume,
      toggleMute,
      cycleRepeat,
      toggleShuffle,
      toggleAutoplay,
      setAutoplay,
      setActiveCategory,
      addToQueue,
      playNext,
      removeQueued,
      clearQueue,
      reorderQueue,
      setMusicUiState,
      openExpanded,
      minimize,
      closeMusic,
      restoreHud,
      stop,
      retry,
      clearError,
      setPlayerVisible,
      setQueue,
      toggleAutoVibe,
    },
    lastPlaylist,
  }), [
    playTrack,
    playAll,
    playPlaylist,
    toggle,
    next,
    prev,
    seekFraction,
    setVolume,
    toggleMute,
    cycleRepeat,
    toggleShuffle,
    toggleAutoplay,
    setAutoplay,
    setActiveCategory,
    addToQueue,
    playNext,
    removeQueued,
    clearQueue,
    reorderQueue,
    setMusicUiState,
    openExpanded,
    minimize,
    closeMusic,
    restoreHud,
    stop,
    retry,
    clearError,
    setPlayerVisible,
    setQueue,
    toggleAutoVibe,
    lastPlaylist,
  ]);

  return (
    <MusicActionsContext.Provider value={actionsValue}>
      <MusicProgressContext.Provider value={progressValue}>
        <MusicPlaybackContext.Provider value={playbackValue}>
          {children}
          {/* Persistent host for the single YouTube player instance.
              The IFrame API replaces this div with the player, so it must never unmount. */}
          <div
            className={`yt-host-wrap${state.playerVisible && state.track ? ' visible' : ''}${isImmersive ? ' is-immersive' : ''}${isVideoPlayable ? ' video-active' : ''}`}
            aria-hidden={!state.playerVisible && !isImmersive}
          >
            <div id="atlera-yt-host" />
          </div>
        </MusicPlaybackContext.Provider>
      </MusicProgressContext.Provider>
    </MusicActionsContext.Provider>
  );
}
