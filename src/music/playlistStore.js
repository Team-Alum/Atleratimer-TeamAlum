// Playlist persistence with two interchangeable backends:
// - Signed in  -> Supabase tables (playlists + playlist_tracks, RLS-protected)
// - Guest      -> localStorage (temporary, per-device)
// The UI never talks to either backend directly — only through PlaylistContext.

import { supabase } from '../services/supabaseClient';

const LOCAL_KEY = 'atleratimer_playlists_v1';

export function sanitizePlaylistName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 80);
}

function sanitizeTrack(track) {
  return {
    videoId: String(track.videoId || '').trim().slice(0, 20),
    title: String(track.title || 'Untitled').trim().slice(0, 200) || 'Untitled',
    channel: String(track.channel || '').trim().slice(0, 120),
    thumbnail: String(track.thumbnail || '').trim().slice(0, 300),
  };
}

function newLocalId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---- Guest backend (localStorage) ----------------------------------------

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(playlists) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(playlists));
  } catch {
    throw new Error('Couldn’t save playlists on this device — local storage may be full or blocked.');
  }
}

// ---- Row <-> local shape mapping -----------------------------------------

function mapDbPlaylist(row) {
  const tracks = [...(row.playlist_tracks || [])]
    .sort((a, b) => a.position - b.position)
    .map((t) => ({
      id: t.id,
      videoId: t.youtube_video_id,
      title: t.title,
      channel: t.channel_name || '',
      thumbnail: t.thumbnail_url || '',
    }));
  return { id: row.id, name: row.name, tracks, createdAt: row.created_at, updatedAt: row.updated_at };
}

const DB_SELECT = 'id, name, created_at, updated_at, playlist_tracks ( id, youtube_video_id, title, channel_name, thumbnail_url, position, added_at )';

// ---- Public API -----------------------------------------------------------

export const playlistStore = {
  async list(userId) {
    if (userId) {
      const { data, error } = await supabase
        .from('playlists')
        .select(DB_SELECT)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapDbPlaylist);
    }
    return readLocal();
  },

  async create(userId, name) {
    const clean = sanitizePlaylistName(name);
    if (!clean) throw new Error('Playlist name can’t be empty.');
    if (userId) {
      const { data, error } = await supabase
        .from('playlists')
        .insert({ user_id: userId, name: clean })
        .select(DB_SELECT)
        .single();
      if (error) throw error;
      return mapDbPlaylist(data);
    }
    const playlists = readLocal();
    if (playlists.some((p) => p.name.toLowerCase() === clean.toLowerCase())) {
      throw new Error('You already have a playlist with that name.');
    }
    const playlist = { id: newLocalId('pl'), name: clean, tracks: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    playlists.push(playlist);
    writeLocal(playlists);
    return playlist;
  },

  async rename(userId, playlistId, name) {
    const clean = sanitizePlaylistName(name);
    if (!clean) throw new Error('Playlist name can’t be empty.');
    if (userId) {
      const { data, error } = await supabase
        .from('playlists')
        .update({ name: clean })
        .eq('id', playlistId)
        .select(DB_SELECT)
        .single();
      if (error) throw error;
      return mapDbPlaylist(data);
    }
    const playlists = readLocal();
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) throw new Error('Playlist not found.');
    playlist.name = clean;
    playlist.updatedAt = new Date().toISOString();
    writeLocal(playlists);
    return playlist;
  },

  async remove(userId, playlistId) {
    if (userId) {
      const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
      if (error) throw error;
      return;
    }
    writeLocal(readLocal().filter((p) => p.id !== playlistId));
  },

  // Returns { playlist, duplicate } — duplicate adds are a no-op, not an error
  async addTrack(userId, playlistId, track) {
    const clean = sanitizeTrack(track);
    if (!clean.videoId) throw new Error('That track has no valid video ID.');
    if (userId) {
      const { data: existing, error: readErr } = await supabase
        .from('playlist_tracks')
        .select('id')
        .eq('playlist_id', playlistId)
        .eq('youtube_video_id', clean.videoId)
        .maybeSingle();
      if (readErr) throw readErr;
      if (existing) return { duplicate: true };

      const { data: maxRow, error: maxErr } = await supabase
        .from('playlist_tracks')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxErr) throw maxErr;

      const { error: insertErr } = await supabase.from('playlist_tracks').insert({
        playlist_id: playlistId,
        youtube_video_id: clean.videoId,
        title: clean.title,
        channel_name: clean.channel,
        thumbnail_url: clean.thumbnail,
        position: (maxRow?.position ?? -1) + 1,
      });
      if (insertErr) {
        if (insertErr.code === '23505') return { duplicate: true };
        throw insertErr;
      }
      return { duplicate: false };
    }

    const playlists = readLocal();
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) throw new Error('Playlist not found.');
    if (playlist.tracks.some((t) => t.videoId === clean.videoId)) return { duplicate: true };
    playlist.tracks.push({ id: newLocalId('t'), ...clean });
    playlist.updatedAt = new Date().toISOString();
    writeLocal(playlists);
    return { duplicate: false };
  },

  async removeTrack(userId, playlistId, trackId) {
    if (userId) {
      const { error } = await supabase.from('playlist_tracks').delete().eq('id', trackId);
      if (error) throw error;
      return;
    }
    const playlists = readLocal();
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) throw new Error('Playlist not found.');
    playlist.tracks = playlist.tracks.filter((t) => t.id !== trackId);
    playlist.updatedAt = new Date().toISOString();
    writeLocal(playlists);
  },

  // orderedTrackIds must be a permutation of the playlist's current track ids
  async reorder(userId, playlistId, orderedTrackIds) {
    if (userId) {
      const updates = orderedTrackIds.map((id, position) =>
        supabase.from('playlist_tracks').update({ position }).eq('id', id)
      );
      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed) throw failed.error;
      return;
    }
    const playlists = readLocal();
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) throw new Error('Playlist not found.');
    const byId = new Map(playlist.tracks.map((t) => [t.id, t]));
    playlist.tracks = orderedTrackIds.map((id) => byId.get(id)).filter(Boolean);
    playlist.updatedAt = new Date().toISOString();
    writeLocal(playlists);
  },
};

// Friendly message for infrastructure-level failures (e.g. migration not run)
export function friendlyStoreError(err) {
  const msg = String(err?.message || '');
  if (/does not exist|schema cache|permission denied/i.test(msg)) {
    return 'Cloud playlists aren’t available yet on this project — the database tables need to be created first.';
  }
  if (/Failed to fetch|NetworkError|fetch failed/i.test(msg)) {
    return 'Couldn’t reach the server — check your connection and try again.';
  }
  return msg || 'Something went wrong while saving playlists.';
}
