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
import {
  buildVibeQuery,
  nextVibeState,
  trackMatchesLanguage,
} from './vibe';

const QUEUE_SESSION_KEY = 'atleratimer_queue_v1';
const LAST_PLAYLIST_KEY = 'atleratimer_last_playlist_v1';
const AUTO_VIBE_KEY = 'atleratimer_auto_vibe_v1';
const PROGRESS_INTERVAL_MS = 900;

function readAutoVibePref() {
  try {
    const raw = localStorage.getItem(AUTO_VIBE_KEY);
    return raw == null ? true : raw === '1';
  } catch {
    return true;
  }
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
  unavailable: {}, // videoId -> true, e.g. embedding disabled
  playerVisible: false, // the small YouTube panel (kept visible while a track is loaded)
  vibe: null, // { query, label, language, pageToken, variant, pages, exhausted }
  autoVibe: true, // keep the same vibe/language playing after the queue ends
  vibeLoading: false,
  vibeNote: '', // subtle inline note when a vibe can't be topped up
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
      vibe: restored?.vibe?.query
        ? { ...restored.vibe, pageToken: null, variant: 0, pages: 0, exhausted: false }
        : null,
      autoVibe: readAutoVibePref(),
    };
  });

  const playerRef = useRef(null);      // YT.Player instance
  const playerReadyRef = useRef(null); // Promise<YT.Player> resolved only after onReady
  const creatingRef = useRef(false);   // guards double creation
  const stateRef = useRef(state);      // always-fresh mirror for event handlers
  const pollRef = useRef(null);
  const interactedRef = useRef(false); // any user gesture seen (autoplay policy)
  const vibeFetchRef = useRef(false);  // one vibe top-up request at a time
  const vibeFetchKeyRef = useRef('');  // avoid refetching the same page on pause/resume

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
        sessionStorage.setItem(QUEUE_SESSION_KEY, JSON.stringify({
          queue: state.queue,
          index: state.index,
          vibe: state.vibe,
        }));
      } else {
        sessionStorage.removeItem(QUEUE_SESSION_KEY);
      }
    } catch { /* storage unavailable */ }
  }, [state.queue, state.index, state.vibe]);

  // ---- Same-vibe autoplay -------------------------------------------------
  // Fetch one more page of the current vibe. Returns the fresh list plus the
  // cursor; callers decide when to append and play, so ENDED can start the
  // first new track without waiting for React to commit the queue update.
  const requestVibeTracks = useCallback(async (vibeOverride) => {
    const { autoVibe } = stateRef.current;
    const vibe = vibeOverride || stateRef.current.vibe;
    if (!autoVibe || !vibe?.query || vibe.exhausted) return null;
    if (vibeFetchRef.current) return null;
    vibeFetchRef.current = true;
    set({ vibeLoading: true });
    try {
      const params = new URLSearchParams({ q: buildVibeQuery(vibe) });
      if (vibe.pageToken) params.set('pageToken', vibe.pageToken);
      const res = await fetch(`/api/youtube-search?${params.toString()}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Vibe search failed.');
      const current = stateRef.current;
      const seen = new Set(current.queue.map((t) => t.videoId));
      const fresh = (Array.isArray(body.results) ? body.results : [])
        .filter((r) => r?.videoId && !seen.has(r.videoId) && !current.unavailable[r.videoId])
        .map((r) => ({ ...r, id: r.videoId }))
        .filter((r) => trackMatchesLanguage(r, vibe.language));
      return { fresh, nextPageToken: body.nextPageToken || null, vibeQuery: vibe.query };
    } catch {
      return null;
    } finally {
      vibeFetchRef.current = false;
      set({ vibeLoading: false });
    }
  }, [set]);

  // Apply a fetch result. `nextVibe` is the pre-computed cursor (see
  // nextVibeState) so a caller can continue before React commits the state.
  const applyVibeResult = useCallback((result, nextVibe, { playFirst = false } = {}) => {
    if (!result) return false;
    const first = result.fresh?.[0] || null;
    set((prev) => {
      // Ignore a response that belongs to a vibe the listener already left.
      if (!prev.vibe) return prev;
      if (result.vibeQuery && prev.vibe.query !== result.vibeQuery) return prev;
      const seen = new Set(prev.queue.map((t) => t.videoId));
      const fresh = (result.fresh || []).filter((t) => !seen.has(t.videoId));
      const vibe = nextVibe || nextVibeState(prev.vibe, result);
      const exhausted = Boolean(vibe?.exhausted);
      const patch = {
        vibe,
        vibeLoading: false,
        vibeNote: fresh.length ? '' : (exhausted ? 'No more matching tracks — replaying this vibe.' : prev.vibeNote),
      };
      if (!fresh.length) return patch;
      patch.queue = [...prev.queue, ...fresh];
      if (playFirst) {
        patch.track = fresh[0];
        patch.index = prev.queue.length;
        patch.status = 'loading';
        patch.error = null;
        patch.currentTime = 0;
        patch.playerVisible = true;
      }
      return patch;
    });
    if (playFirst && first) {
      try {
        playerRef.current?.loadVideoById?.(first.videoId);
      } catch (err) {
        set({ status: 'error', error: { message: err?.message || 'Playback failed.' } });
      }
    }
    return Boolean(first);
  }, [set]);

  // ---- Load next in queue (used by ENDED) ---------------------------------
  const advance = useCallback(async (auto) => {
    const { queue, index, repeat, shuffle, autoVibe, vibe } = stateRef.current;
    if (!queue.length) return;

    const load = (nextIndex) => {
      const track = queue[nextIndex];
      set({ track, index: nextIndex, status: 'loading', error: null, currentTime: 0, playerVisible: true });
      try {
        playerRef.current?.loadVideoById?.(track.videoId);
      } catch (err) {
        set({ status: 'error', error: { message: err?.message || 'Playback failed.' } });
      }
    };

    if (shuffle && queue.length > 1) {
      let nextIndex;
      do { nextIndex = Math.floor(Math.random() * queue.length); } while (nextIndex === index);
      load(nextIndex);
      return;
    }

    if (index < queue.length - 1) {
      load(index + 1);
      return;
    }

    if (auto && autoVibe && vibe && !vibe.exhausted) {
      // Queue finished — top up the same vibe before falling back to a replay.
      const result = await requestVibeTracks(vibe);
      const current = stateRef.current;
      // The listener may have started another track (or another vibe) while
      // the request was in flight. Never let a late response override them.
      if (current.index !== index || current.track?.videoId !== queue[index]?.videoId) return;
      if (current.vibe?.query !== vibe.query) return;
      if (result?.fresh?.length && current.autoVibe) {
        applyVibeResult(result, nextVibeState(vibe, result), { playFirst: true });
        return;
      }
      if (result && current.autoVibe) applyVibeResult(result, nextVibeState(vibe, result));
    }

    if (repeat === 'all' || auto) {
      load(0);
      return;
    }

    set({ status: 'ended' });
  }, [set, requestVibeTracks, applyVibeResult]);

  // ---- YT event handlers --------------------------------------------------
  const handleStateChange = useCallback((event) => {
    const code = event.data;
    const player = playerRef.current;
    if (code === 1) { // PLAYING
      let duration = 0;
      try { duration = player?.getDuration?.() || 0; } catch { /* ignore */ }
      set({ status: 'playing', error: null, duration });
      startPolling();

      // Prefetch the next same-vibe page while the last track is still
      // playing, so the transition is seamless. Only near the end, never
      // per track: a YouTube search request costs ~100 quota units.
      const { autoVibe, vibe, queue, index } = stateRef.current;
      if (autoVibe && vibe && !vibe.exhausted && queue.length && index >= queue.length - 2) {
        const key = `${vibe.query}|${vibe.variant || 0}|${vibe.pageToken || 'first'}`;
        if (vibeFetchKeyRef.current !== key) {
          vibeFetchKeyRef.current = key;
          requestVibeTracks(vibe).then((result) => {
            if (!result || !stateRef.current.autoVibe) return;
            if (stateRef.current.vibe?.query !== vibe.query) return;
            applyVibeResult(result, nextVibeState(vibe, result));
          });
        }
      }
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
  }, [set, startPolling, stopPolling, advance, requestVibeTracks, applyVibeResult]);

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
  // The IFrame API only attaches the public methods (loadVideoById, playVideo,
  // …) once the player fires onReady. Resolve only after that point: calling
  // loadVideoById straight after `new YT.Player()` throws in current browsers.
  const ensurePlayer = useCallback(async () => {
    if (playerReadyRef.current) return playerReadyRef.current;
    // A previous attempt may have timed out just before the player finished
    // starting; reuse it if its public methods are now attached.
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
              reject(new Error('The YouTube player took too long to start — check the network connection.'));
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
                  autoplay: 0, // playback only ever starts from an explicit user action
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
          // Allow a later click to retry instead of caching a rejected promise.
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

  // ---- Public actions -----------------------------------------------------
  const playTrack = useCallback(async (track, options = {}) => {
    if (!track?.videoId) return;
    const queue = options.queue || stateRef.current.queue || [];
    let index = options.index;
    if (index == null) index = queue.findIndex((t) => t.videoId === track.videoId);
    if (index == null || index < 0) index = 0;

    // A vibe supplied with the play action starts a fresh autoplay lane.
    // Without one, keep the lane the user is already listening to.
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
      status: 'loading', track, queue, index, vibe,
      vibeNote: '', vibeLoading: false,
      error: null, currentTime: 0, playerVisible: true,
    });

    try {
      const player = await ensurePlayer();
      // The user clicked something — that is the gesture that permits playback
      player.loadVideoById(track.videoId);
    } catch (err) {
      set({ status: 'error', error: { message: err?.message || 'Couldn’t start the player.' } });
    }
  }, [ensurePlayer, set]);

  const playAll = useCallback((tracks, startIndex = 0, options = {}) => {
    if (!tracks?.length) return;
    const index = Math.max(0, Math.min(startIndex, tracks.length - 1));
    playTrack(tracks[index], { ...options, queue: tracks, index });
  }, [playTrack]);

  const toggle = useCallback(() => {
    const player = playerRef.current;
    if (!player || !stateRef.current.track) return;
    try {
      if (stateRef.current.status === 'playing') player.pauseVideo?.();
      else {
        // Resuming requires the player to be on screen (YouTube policy).
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

  const toggleAutoVibe = useCallback(() => {
    set((prev) => {
      const autoVibe = !prev.autoVibe;
      try { localStorage.setItem(AUTO_VIBE_KEY, autoVibe ? '1' : '0'); } catch { /* ignore */ }
      if (autoVibe) vibeFetchKeyRef.current = '';
      return { autoVibe, vibeNote: autoVibe ? prev.vibeNote : '' };
    });
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
    vibeFetchKeyRef.current = '';
    set({
      status: 'idle', track: null, index: -1, currentTime: 0, duration: 0,
      error: null, playerVisible: false, vibe: null, vibeNote: '', vibeLoading: false,
    });
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
    playerReadyRef.current = null;
    creatingRef.current = false;
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
    vibe: state.vibe,
    autoVibe: state.autoVibe,
    vibeLoading: state.vibeLoading,
    vibeNote: state.vibeNote,
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
    state.vibe,
    state.autoVibe,
    state.vibeLoading,
    state.vibeNote,
    canGoPrev,
  ]);

  const progressValue = useMemo(() => ({
    currentTime: state.currentTime,
    duration: state.duration,
  }), [state.currentTime, state.duration]);

  const actionsValue = useMemo(() => ({
    actions: {
      playTrack, playAll, toggle, next, prev, seekFraction,
      setVolume, toggleMute, cycleRepeat, toggleShuffle, toggleAutoVibe,
      enqueue, removeQueued, stop, retry, clearError,
      setPlayerVisible, setQueue,
    },
    lastPlaylist,
  }), [
    playTrack, playAll, toggle, next, prev, seekFraction,
    setVolume, toggleMute, cycleRepeat, toggleShuffle, toggleAutoVibe,
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

