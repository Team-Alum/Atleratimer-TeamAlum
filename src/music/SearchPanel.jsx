// Music search section — embedded inside the expanded mini-player panel.
// Queries the /api/youtube-search serverless proxy (real YouTube results).

import React, { useCallback, useEffect, useRef, useState, memo } from 'react';
import { useMusicPlayback, useMusicActions } from './MusicPlayerContextInstance';
import { usePlaylists } from './PlaylistContextInstance';
import { formatTime } from './youtubeIframe';
import { buildVibeQuery, makeVibe, trackMatchesLanguage } from './vibe';
import { Search, Play, Plus, Loader2, Music2, Check } from 'lucide-react';

// Language-aware starting points.
const SUGGESTIONS = ['Hindi lo-fi', 'English lo-fi', 'Bollywood chill', 'Instrumental focus', 'Piano study', 'Rain sounds', 'Nature sounds', 'White noise'];
const clientCache = new Map(); // query -> { results, nextPageToken } (session-scoped)

export default function SearchSection({ inputRef }) {
  const playback = useMusicPlayback();
  const { actions } = useMusicActions();
  const { playlists, actions: playlistActions } = usePlaylists();

  const [query, setQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [searchedNextToken, setSearchedNextToken] = useState(null);
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [message, setMessage] = useState('');
  const [addToFor, setAddToFor] = useState(null); // track being added; picker open
  const [flash, setFlash] = useState(null);       // { videoId, kind: 'added' | 'duplicate' }
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const runSearch = useCallback(async (rawQuery) => {
    const q = rawQuery.trim();
    if (q.length < 2) {
      setStatus('idle');
      return;
    }
    setSearchedQuery(q);
    setSearchedNextToken(null);
    const cached = clientCache.get(q.toLowerCase());
    if (cached) {
      setResults(cached.results);
      setSearchedNextToken(cached.nextPageToken || null);
      setStatus('done');
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setResults([]);
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || 'Search failed — please try again.');
      }
      const list = Array.isArray(body.results) ? body.results : [];
      const nextPageToken = body.nextPageToken || null;
      clientCache.set(q.toLowerCase(), { results: list.map((r) => ({ ...r, id: r.videoId })), nextPageToken });
      setResults(list.map((r) => ({ ...r, id: r.videoId })));
      setSearchedNextToken(nextPageToken);
      setStatus('done');
      if (!list.length) setMessage('No tracks found for that search — try a different phrase.');
    } catch (err) {
      if (err.name === 'AbortError') return;
      setStatus('error');
      setMessage(err.message || 'Search failed — please try again.');
    }
  }, []);

  const playResult = useCallback((track, index) => {
    const seed = searchedQuery || query;
    const vibe = makeVibe(seed, track);
    if (vibe && searchedNextToken && buildVibeQuery(vibe).toLowerCase() === seed.trim().toLowerCase()) {
      vibe.pageToken = searchedNextToken;
    }
    const queue = results.filter((t, i) => i === index || trackMatchesLanguage(t, vibe?.language));
    const queueIndex = Math.max(0, queue.findIndex((t) => t.videoId === track.videoId));
    actions.playTrack(track, {
      queue,
      index: queueIndex,
      vibe,
    });
  }, [actions, query, results, searchedQuery, searchedNextToken]);

  const handleSubmit = (e) => {
    e.preventDefault();
    runSearch(query);
  };

  const handleAdd = useCallback(async (playlistId, track) => {
    try {
      const outcome = await playlistActions.addTrackToPlaylist(playlistId, track);
      setFlash({ videoId: track.videoId, kind: outcome });
      setAddToFor(null);
      setTimeout(() => setFlash(null), 1800);
    } catch {
      setAddToFor(null);
    }
  }, [playlistActions]);

  const handleCreateAndAdd = useCallback((name, track) => {
    playlistActions.createPlaylist(name).then((created) => handleAdd(created.id, track));
  }, [handleAdd, playlistActions]);

  return (
    <div className="mp-search">
      <form className="search-form" onSubmit={handleSubmit} role="search">
        <input
          ref={inputRef}
          type="search"
          className="form-input search-input"
          placeholder="Search music for your focus..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search music for your focus"
          maxLength={120}
        />
        <button type="submit" className="btn-secondary search-submit" aria-label="Search">
          {status === 'loading' ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
        </button>
      </form>

      {status === 'idle' && (
        <div className="search-suggestions" aria-label="Search suggestions">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="chip"
              onClick={() => { setQuery(s); runSearch(s); }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {status === 'error' && <p className="drawer-message error" role="alert">{message}</p>}
      {status === 'done' && message && <p className="drawer-message">{message}</p>}

      <ul className="search-results" aria-live="polite">
        {results.map((track, resultIndex) => (
          <SearchResultRow
            key={track.videoId}
            track={track}
            resultIndex={resultIndex}
            isActive={playback.track?.videoId === track.videoId}
            isBusy={playback.isBusy && playback.track?.videoId === track.videoId}
            flash={flash?.videoId === track.videoId ? flash : null}
            isAddToOpen={addToFor?.videoId === track.videoId}
            playlists={playlists}
            onPlay={playResult}
            onToggleAdd={(t) => setAddToFor((prev) => (prev?.videoId === t.videoId ? null : t))}
            onAdd={handleAdd}
            onCreatePlaylist={handleCreateAndAdd}
          />
        ))}
      </ul>

      {status === 'done' && results.length > 0 && (
        <p className="drawer-hint">Press <Music2 size={11} style={{ verticalAlign: '-2px' }} /> play to listen with the same vibe, or + to save.</p>
      )}
    </div>
  );
}

const SearchResultRow = memo(function SearchResultRow({
  track,
  resultIndex,
  isActive,
  isBusy,
  flash,
  isAddToOpen,
  playlists,
  onPlay,
  onToggleAdd,
  onAdd,
  onCreatePlaylist,
}) {
  return (
    <li className={`search-result${isActive ? ' active' : ''}`}>
      {track.thumbnail ? (
        <img src={track.thumbnail} alt="" className="result-thumb" loading="lazy" width={56} height={42} />
      ) : (
        <span className="result-thumb" aria-hidden="true" />
      )}
      <div className="result-meta">
        <span className="result-title" title={track.title}>{track.title}</span>
        <span className="result-sub">
          {track.channel}
          {track.duration ? ` · ${formatTime(track.duration)}` : ''}
          {track.embeddable === false ? ' · not embeddable' : ''}
        </span>
      </div>
      <div className="result-actions">
        {flash?.videoId === track.videoId ? (
          <span className={`result-flash ${flash.kind}`}>
            <Check size={14} /> {flash.kind === 'duplicate' ? 'In list' : 'Added'}
          </span>
        ) : (
          <>
            <button
              type="button"
              className="icon-btn"
              title={track.embeddable === false ? 'This track can’t be embedded' : 'Play with same-vibe autoplay'}
              aria-label={`Play ${track.title}`}
              disabled={track.embeddable === false}
              onClick={() => onPlay(track, resultIndex)}
            >
              {isBusy ? <Loader2 size={15} className="spin" /> : <Play size={15} />}
            </button>
            <button
              type="button"
              className="icon-btn"
              title="Add to playlist"
              aria-label={`Add ${track.title} to playlist`}
              onClick={() => onToggleAdd(track)}
            >
              <Plus size={15} />
            </button>
          </>
        )}
      </div>
      {isAddToOpen && (
        <div className="add-picker" role="menu" aria-label="Choose playlist">
          {playlists.length === 0 && <span className="add-picker-empty">No playlists yet — create one below.</span>}
          {playlists.map((p) => (
            <button key={p.id} type="button" className="add-picker-item" role="menuitem" onClick={() => onAdd(p.id, track)}>
              {p.name}
            </button>
          ))}
          <AddInline onCreate={(name) => onCreatePlaylist(name, track)} />
        </div>
      )}
    </li>
  );
});

function AddInline({ onCreate }) {
  const [name, setName] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const clean = name.trim();
    if (clean) onCreate(clean).then(() => setName(''), () => {});
  };
  return (
    <form className="add-inline" onSubmit={submit}>
      <input
        type="text"
        className="form-input"
        placeholder="New playlist name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={80}
        aria-label="New playlist name"
      />
      <button type="submit" className="btn-secondary" disabled={!name.trim()}>Create</button>
    </form>
  );
}
