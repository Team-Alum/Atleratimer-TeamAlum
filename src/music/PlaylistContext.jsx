// Playlist state for the whole app. Persistence goes through playlistStore
// (Supabase when signed in, localStorage for guests) and this context keeps
// the UI copy in sync after every mutation.

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { PlaylistContext } from './PlaylistContextInstance';
import { playlistStore, friendlyStoreError, sanitizePlaylistName } from './playlistStore';
import { useAuth } from '../context/useAuth';
import { useTimer } from '../context/useTimer';
import { useMusic } from './MusicPlayerContext';

export function PlaylistProvider({ children }) {
  const { user } = useAuth() || {};
  const userId = user?.id ?? null;
  const { data } = useTimer();
  const rememberLastPlaylist = data?.musicSettings?.rememberLastPlaylist !== false;
  const { actions: musicActions, lastPlaylist } = useMusic();

  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const restoredRef = useRef(false);

  // ---- Load (on mount and whenever the account changes) -------------------
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await playlistStore.list(userId);
      setPlaylists(list);
    } catch (err) {
      setError(friendlyStoreError(err));
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    restoredRef.current = false;
    load();
  }, [load]);

  // ---- Restore last playlist as the queue (never autoplays) ---------------
  useEffect(() => {
    if (loading || !rememberLastPlaylist || restoredRef.current || !playlists.length) return;
    restoredRef.current = true;
    const savedId = lastPlaylist.get();
    const saved = savedId && playlists.find((p) => p.id === savedId);
    if (saved?.tracks?.length) {
      setActiveId(saved.id);
      musicActions.setQueue(saved.tracks, 0);
    }
  }, [loading, playlists, rememberLastPlaylist, lastPlaylist, musicActions]);

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

  // Returns 'added' | 'duplicate' | throws on failure
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
    musicActions.playAll(playlist.tracks, 0);
  }, [playlists, selectPlaylist, musicActions]);

  const activePlaylist = useMemo(
    () => playlists.find((p) => p.id === activeId) || null,
    [playlists, activeId]
  );

  const value = useMemo(() => ({
    playlists,
    activePlaylist,
    activeId,
    loading,
    error,
    isGuest: !userId,
    storageLabel: userId ? 'Saved to your account' : 'Saved on this device (guest)',
    sanitizeName: sanitizePlaylistName,
    clearError: () => setError(null),
    actions: {
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      addTrackToPlaylist,
      removeTrackFromPlaylist,
      reorderPlaylist,
      selectPlaylist,
      playPlaylist,
      reload: load,
    },
  }), [playlists, activePlaylist, activeId, loading, error, userId, createPlaylist, renamePlaylist, deletePlaylist, addTrackToPlaylist, removeTrackFromPlaylist, reorderPlaylist, selectPlaylist, playPlaylist, load]);

  return <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>;
}

export function usePlaylists() {
  return useContext(PlaylistContext);
}
