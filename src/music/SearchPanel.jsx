// Music search section — embedded inside the expanded mini-player panel.
// Queries the /api/youtube-search serverless proxy (real YouTube results).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMusicPlayback, useMusicActions } from './MusicPlayerContextInstance';
import { usePlaylists } from './PlaylistContextInstance';
import { formatTime } from './youtubeIframe';
import { buildVibeQuery, makeVibe, trackMatchesLanguage } from './vibe';
import { Search, Play, Plus, Loader2, Music2, Check } from 'lucide-react';

// Language-aware starting points. The first two deliberately pin the language
// so same-vibe autoplay has nothing to guess.
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
    // Drop the previous list while the new query loads so a stale row can never
    // start a track under the wrong vibe.
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
    // If the first result page also supplied a cursor, reuse it: the prefetch
    // can jump straight to unseen tracks instead of re-fetching page one.
    // Page tokens are query-specific, so only adopt it when the autoplay query
    // is exactly the phrase that produced these results.
    if (vibe && searchedNextToken && buildVibeQuery(vibe).toLowerCase() === seed.trim().toLowerCase()) {
      vibe.pageToken = searchedNextToken;
    }
    // A search page can contain a stray track in another language. Keep the
    // track the listener picked, but trim the rest of the seed queue to the
    // vibe's language so the very first queue cannot cross the language lock.
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

  const handleAdd = async (playlistId, track) => {
    try {
      const outcome = await playlistActions.addTrackToPlaylist(playlistId, track);
      setFlash({ videoId: track.videoId, kind: outcome });
      setAddToFor(null);
      setTimeout(() => setFlash(null), 1800);
    } catch {
      // PlaylistContext stores the error; close the picker so it is visible
      setAddToFor(null);
    }
  };

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
          {status === 'loading' ? <Loader2 size={15} className="spin" /> : <Search size={15} />}
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
          <li key={track.videoId} className={`search-result${playback.track?.videoId === track.videoId ? ' active' : ''}`}>
            {track.thumbnail
              ? <img src={track.thumbnail} alt="" className="result-thumb" loading="lazy" width={48} height={36} />
              : <span className="result-thumb" aria-hidden="true" />}
            <div className="result-meta">
              <span className="result-title" title={track.title}>{track.title}</span>
              <span className="result-sub">{track.channel}{track.duration ? ` · ${formatTime(track.duration)}` : ''}{track.embeddable === false ? ' · not embeddable' : ''}</span>
            </div>
            <div className="result-actions">
              {flash?.videoId === track.videoId ? (
                <span className={`result-flash ${flash.kind}`}>
                  <Check size={13} /> {flash.kind === 'duplicate' ? 'In list' : 'Added'}
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    className="icon-btn"
                    title={track.embeddable === false ? 'This track can’t be embedded' : 'Play with same-vibe autoplay'}
                    aria-label={`Play ${track.title}`}
                    disabled={track.embeddable === false}
                    onClick={() => playResult(track, resultIndex)}
                  >
                    {playback.isBusy && playback.track?.videoId === track.videoId ? <Loader2 size={14} className="spin" /> : <Play size={14} />}
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Add to playlist"
                    aria-label={`Add ${track.title} to playlist`}
                    onClick={() => setAddToFor(addToFor?.videoId === track.videoId ? null : track)}
                  >
                    <Plus size={14} />
                  </button>
                </>
              )}
            </div>
            {addToFor?.videoId === track.videoId && (
              <div className="add-picker" role="menu" aria-label="Choose playlist">
                {playlists.length === 0 && <span className="add-picker-empty">No playlists yet — create one below.</span>}
                {playlists.map((p) => (
                  <button key={p.id} type="button" className="add-picker-item" role="menuitem" onClick={() => handleAdd(p.id, track)}>
                    {p.name}
                  </button>
                ))}
                <AddInline onCreate={(name) => playlistActions.createPlaylist(name).then((created) => handleAdd(created.id, track))} />
              </div>
            )}
          </li>
        ))}
      </ul>

      {status === 'done' && results.length > 0 && (
        <p className="drawer-hint">Press <Music2 size={11} style={{ verticalAlign: '-2px' }} /> play to listen with the same vibe, or + to save.</p>
      )}
    </div>
  );
}

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
