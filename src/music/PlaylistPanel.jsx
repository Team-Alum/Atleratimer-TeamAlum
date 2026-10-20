// Playlist drawer — create, rename, delete, play, and reorder playlists.

import React, { useMemo, useRef, useState } from 'react';
import { useMusic } from './MusicPlayerContext';
import { usePlaylists } from './PlaylistContext';
import { Play, Plus, Trash2, Check, X, ListMusic, GripVertical, Loader2 } from 'lucide-react';

export default function PlaylistPanel({ onClose }) {
  const { state, actions: music } = useMusic();
  const {
    playlists, activeId, loading, error, isGuest, storageLabel, clearError,
    actions,
  } = usePlaylists();

  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [flash, setFlash] = useState(null); // { playlistId, message }
  const dragIdRef = useRef(null);

  const active = useMemo(() => playlists.find((p) => p.id === activeId) || playlists[0] || null, [playlists, activeId]);

  const showFlash = (playlistId, message) => {
    setFlash({ playlistId, message });
    setTimeout(() => setFlash(null), 1800);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const clean = newName.trim();
    if (!clean) return;
    try {
      await actions.createPlaylist(clean);
      setNewName('');
    } catch { /* error surfaced via context */ }
  };

  const handleRename = async (playlist, e) => {
    e?.preventDefault();
    const clean = renameValue.trim();
    setRenamingId(null);
    if (!clean || clean === playlist.name) return;
    try {
      await actions.renamePlaylist(playlist.id, clean);
    } catch { /* context */ }
  };

  const handleDelete = async (playlist) => {
    if (window.confirm(`Delete the playlist “${playlist.name}”? This can’t be undone.`)) {
      try { await actions.deletePlaylist(playlist.id); } catch { /* context */ }
    }
  };

  // ---- Drag & drop reorder ------------------------------------------------
  const onDragStart = (trackId) => { dragIdRef.current = trackId; };
  const onDragOver = (e) => e.preventDefault();
  const onDrop = async (targetTrackId) => {
    const dragged = dragIdRef.current;
    dragIdRef.current = null;
    if (!active || !dragged || dragged === targetTrackId) return;
    const ids = active.tracks.map((t) => t.id);
    const from = ids.indexOf(dragged);
    const to = ids.indexOf(targetTrackId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    try { await actions.reorderPlaylist(active.id, ids); } catch { /* context */ }
  };

  return (
    <div className="music-drawer music-drawer-right" role="dialog" aria-label="Playlists">
      <div className="drawer-header">
        <span className="drawer-title">Playlists</span>
        <div className="drawer-header-side">
          <span className="drawer-badge" title={storageLabel}>{isGuest ? 'Guest' : 'Cloud'}</span>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Close playlists">✕</button>
        </div>
      </div>

      <form className="search-form" onSubmit={handleCreate}>
        <input
          type="text"
          className="form-input"
          placeholder="New playlist name (e.g. Deep Focus)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={80}
          aria-label="New playlist name"
        />
        <button type="submit" className="btn-secondary" disabled={!newName.trim()} aria-label="Create playlist">
          <Plus size={15} />
        </button>
      </form>

      {error && (
        <p className="drawer-message error" role="alert">
          {error}{' '}
          <button type="button" className="link-btn" onClick={() => { clearError(); actions.reload(); }}>Retry</button>
        </p>
      )}

      {loading && <p className="drawer-message"><Loader2 size={13} className="spin" style={{ verticalAlign: '-2px' }} /> Loading playlists…</p>}

      {!loading && playlists.length === 0 && (
        <p className="drawer-message">
          {isGuest
            ? 'Create your first playlist — guests keep them on this device. Sign in to sync across devices.'
            : 'Create your first playlist — it will be saved to your account.'}
        </p>
      )}

      {!loading && playlists.length > 0 && (
        <>
          <div className="playlist-tabs" role="tablist" aria-label="Your playlists">
            {playlists.map((p) => (
              <div key={p.id} className={`playlist-tab${active?.id === p.id ? ' active' : ''}`}>
                {renamingId === p.id ? (
                  <form onSubmit={(e) => handleRename(p, e)} className="playlist-rename-form">
                    <input
                      type="text"
                      className="form-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={(e) => handleRename(p, e)}
                      maxLength={80}
                      autoFocus
                      aria-label="Rename playlist"
                    />
                  </form>
                ) : (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active?.id === p.id}
                    className="playlist-tab-btn"
                    onClick={() => actions.selectPlaylist(p.id)}
                    onDoubleClick={() => { setRenamingId(p.id); setRenameValue(p.name); }}
                    title={`${p.name} — ${p.tracks.length} track(s). Double-click to rename.`}
                  >
                    <ListMusic size={13} />
                    <span className="playlist-tab-name">{p.name}</span>
                    <span className="playlist-tab-count">{p.tracks.length}</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {active && (
            <div className="playlist-detail">
              <div className="playlist-detail-head">
                <span className="drawer-title">{active.name}</span>
                <div className="detail-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    title="Play this playlist"
                    aria-label={`Play playlist ${active.name}`}
                    disabled={!active.tracks.length}
                    onClick={() => actions.playPlaylist(active.id)}
                  >
                    <Play size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Rename playlist"
                    aria-label={`Rename playlist ${active.name}`}
                    onClick={() => { setRenamingId(active.id); setRenameValue(active.name); }}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    title="Delete playlist"
                    aria-label={`Delete playlist ${active.name}`}
                    onClick={() => handleDelete(active)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {flash?.playlistId === active.id && <p className="drawer-message flash" role="status">{flash.message}</p>}

              {active.tracks.length === 0 ? (
                <p className="drawer-message">This playlist is empty — add tracks from search.</p>
              ) : (
                <ul className="track-list" aria-label={`Tracks in ${active.name}`}>
                  {active.tracks.map((track) => (
                    <li
                      key={track.id}
                      className={`track-row${state.track?.videoId === track.videoId ? ' active' : ''}`}
                      draggable
                      onDragStart={() => onDragStart(track.id)}
                      onDragOver={onDragOver}
                      onDrop={() => onDrop(track.id)}
                    >
                      <span className="track-drag" title="Drag to reorder" aria-hidden="true"><GripVertical size={13} /></span>
                      <button
                        type="button"
                        className="track-play"
                        onClick={() => music.playAll(active.tracks, active.tracks.findIndex((t) => t.id === track.id))}
                        aria-label={`Play ${track.title}`}
                        title="Play"
                      >
                        <Play size={12} />
                      </button>
                      <span className="track-title" title={track.title}>{track.title}</span>
                      <button
                        type="button"
                        className="icon-btn ghost"
                        title="Remove from playlist"
                        aria-label={`Remove ${track.title} from ${active.name}`}
                        onClick={() => actions.removeTrackFromPlaylist(active.id, track.id).then(
                          () => showFlash(active.id, 'Track removed.'),
                          () => {}
                        )}
                      >
                        <X size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
