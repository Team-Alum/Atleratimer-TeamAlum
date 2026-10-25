// Playlist state for the whole app. Persistence goes through playlistStore
// (Supabase when signed in, localStorage for guests) and this context keeps
// the UI copy in sync after every mutation.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PlaylistContext } from './PlaylistContextInstance';
import { playlistStore, friendlyStoreError, sanitizePlaylistName } from './playlistStore';
import { useAuth } from '../context/useAuth';
import { useTimerState } from '../context/useTimer';
import { useMusicActions } from './MusicPlayerContextInstance';
import { vibeFromPlaylist } from './vibe';

export function PlaylistProvider({ children }) {
  const { user } = useAuth() || {};
  const userId = user?.id ?? null;
  const { data } = useTimerState();
  const rememberLastPlaylist = data?.musicSettings?.rememberLastPlaylist !== false;
  const { actions: musicActions, lastPlaylist } = useMusicActions();

  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const restoredRef = useRef(false);
  // Guards against a slow request for a previous account overwriting the
  // playlists of the account that is signed in now.
  const requestRef = useRef(0);

  // ---- Restore last playlist as the queue (never autoplays) ---------------
  // Runs right after a successful load, so the saved playlist is restored
  // together with the list it came from.
  const restoreLastPlaylist = useCallback((list) => {
    if (!rememberLastPlaylist || restoredRef.current || !list?.length) return;
    restoredRef.current = true;
    const savedId = lastPlaylist.get();
    const saved = savedId && list.find((p) => p.id === savedId);
    if (saved?.tracks?.length) {
      setActiveId(saved.id);
      musicActions.setQueue(saved.tracks, 0, vibeFromPlaylist(saved));
    }
  }, [rememberLastPlaylist, lastPlaylist, musicActions]);

  // ---- Load (on mount and whenever the account changes) -------------------
  // The store is asynchronous, so the state updates happen in a promise
  // callback rather than in the effect body.
  const load = useCallback(() => {
    const token = (requestRef.current += 1);
    return playlistStore
      .list(userId)
      .then((list) => {
        // A newer request has superseded this one — drop the stale result.
        if (token !== requestRef.current) return;
        setError(null);
        setPlaylists(list);
        restoreLastPlaylist(list);
      })
      .catch((err) => {
        if (token !== requestRef.current) return;
        setError(friendlyStoreError(err));
        setPlaylists([]);
      })
      .finally(() => {
        if (token === requestRef.current) setLoading(false);
      });
  }, [userId, restoreLastPlaylist]);

  useEffect(() => {
    restoredRef.current = false;
    load();
  }, [load]);

  const persistAndSet = useCallback(async (mutator) => {
    setError(null);
    try {
      await mutator();
      const list = await playlistStore.list(userId);
      setPlaylists(list);
      return list;
    } catch (err) {
      setError(friendlyStoreError(err));
      throw err;
    }
  }, [userId]);

  const createPlaylist = useCallback(async (name) => {
    let created;
    await persistAndSet(async () => {
      created = await playlistStore.create(userId, name);
    });
    setActiveId(created.id);
    if (rememberLastPlaylist) lastPlaylist.set(created.id);
    return created;
  }, [persistAndSet, userId, rememberLastPlaylist, lastPlaylist]);

  const renamePlaylist = useCallback(async (id, name) => {
    await persistAndSet(() => playlistStore.rename(userId, id, name));
  }, [persistAndSet, userId]);

  const deletePlaylist = useCallback(async (id) => {
    await persistAndSet(() => playlistStore.remove(userId, id));
    if (activeId === id) {
      setActiveId(null);
      if (rememberLastPlaylist) lastPlaylist.set(null);
    }
  }, [persistAndSet, userId, activeId, rememberLastPlaylist, lastPlaylist]);

  // Returns 'added' | 'duplicate', throws on failure
  const addTrackToPlaylist = useCallback(async (playlistId, track) => {
    let outcome = 'added';
    await persistAndSet(async () => {
      const result = await playlistStore.addTrack(userId, playlistId, track);
      if (result.duplicate) outcome = 'duplicate';
    });
    return outcome;
  }, [persistAndSet, userId]);

  const removeTrackFromPlaylist = useCallback(async (playlistId, trackId) => {
    await persistAndSet(() => playlistStore.removeTrack(userId, playlistId, trackId));
  }, [persistAndSet, userId]);

  const reorderPlaylist = useCallback(async (playlistId, orderedTrackIds) => {
    await persistAndSet(() => playlistStore.reorder(userId, playlistId, orderedTrackIds));
  }, [persistAndSet, userId]);

  const selectPlaylist = useCallback((id) => {
    setActiveId(id);
    if (rememberLastPlaylist) lastPlaylist.set(id);
  }, [rememberLastPlaylist, lastPlaylist]);

  const playPlaylist = useCallback((id) => {
    const playlist = playlists.find((p) => p.id === id);
    if (!playlist?.tracks?.length) return;
    selectPlaylist(id);
    musicActions.playAll(playlist.tracks, 0, { vibe: vibeFromPlaylist(playlist) });
  }, [playlists, selectPlaylist, musicActions]);

  const activePlaylist = useMemo(
    () => playlists.find((p) => p.id === activeId) || null,
    [playlists, activeId]
  );

  const clearError = useCallback(() => setError(null), []);

  const reload = useCallback(() => {
    setLoading(true);
    return load();
  }, [load]);

  const value = useMemo(() => ({
    playlists,
    activePlaylist,
    activeId,
    loading,
    error,
    isGuest: !userId,
    storageLabel: userId ? 'Saved to your account' : 'Saved on this device (guest)',
    sanitizeName: sanitizePlaylistName,
    clearError,
    actions: {
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      addTrackToPlaylist,
      removeTrackFromPlaylist,
      reorderPlaylist,
      selectPlaylist,
      playPlaylist,
      reload,
    },
  }), [playlists, activePlaylist, activeId, loading, error, userId, clearError, createPlaylist, renamePlaylist, deletePlaylist, addTrackToPlaylist, removeTrackFromPlaylist, reorderPlaylist, selectPlaylist, playPlaylist, reload]);

  return <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>;
}
