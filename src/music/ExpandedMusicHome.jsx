// State B — Expanded Music Home
// Polished, translucent, claymorphic music discovery interface.
// Inspired by the YouTube Music layout hierarchy without copying proprietary branding.

import React, { memo, useState, useRef, useCallback, useMemo } from 'react';
import { useMusicPlayback, useMusicProgress, useMusicActions } from './MusicPlayerContextInstance';
import { usePlaylists } from './PlaylistContextInstance';
import {
  FOCUS_CATEGORIES,
  CURATED_FOCUS_TRACKS,
  CURATED_PUBLIC_PLAYLISTS,
} from './autoplayEngine';
import { formatTime } from './youtubeIframe';
import {
  Home, Compass, Library, Heart, ListMusic, Plus, Search, X,
  Minimize2, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, VolumeX, Sparkles, Loader2, Music2, AlertTriangle, Trash2,
  Check, ArrowRight, Hourglass, FolderHeart, Link2, Square,
} from 'lucide-react';

export function ExpandedMusicHome() {
  const playback = useMusicPlayback();
  const progress = useMusicProgress();
  const { actions: musicActions } = useMusicActions();
  const {
    playlists, likedTracks, activePlaylist, actions: playlistActions,
    isGuest, storageLabel,
  } = usePlaylists();

  const {
    track, status, queue, index, volume, muted, repeat, shuffle,
    autoplay, activeCategory, musicUiState, autoplayReason,
  } = playback;

  // Active navigation tab: 'home' | 'explore' | 'library' | 'liked' | 'saved'
  const [activeTab, setActiveTab] = useState('home');
  const [userSelectedCategory, setUserSelectedCategory] = useState(null);
  const selectedCategory = userSelectedCategory || activeCategory || 'deep-focus';

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchPlaylists, setSearchPlaylists] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Modals & Panels
  const [selectedPlaylistDetail, setSelectedPlaylistDetail] = useState(null);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [newPlaylistModalOpen, setNewPlaylistModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importStatus, setImportStatus] = useState({ loading: false, error: null, success: false });

  // Action feedback flash
  const [flashMessage, setFlashMessage] = useState(null);

  const searchInputRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const searchAbortRef = useRef(null);

  const playing = status === 'playing';

  const showFlash = useCallback((msg) => {
    setFlashMessage(msg);
    setTimeout(() => setFlashMessage(null), 2400);
  }, []);


  // Handle live debounced search
  const executeSearch = useCallback(async (queryStr) => {
    const q = queryStr.trim();
    if (q.length < 2) {
      setIsSearching(false);
      setSearchResults([]);
      setSearchPlaylists([]);
      setSearchLoading(false);
      return;
    }

    setIsSearching(true);
    setSearchLoading(true);
    setSearchError(null);

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    try {
      // Parallel fetch for videos and public playlists
      const [vRes, pRes] = await Promise.all([
        fetch(`/api/youtube-search?q=${encodeURIComponent(q)}&type=video`, { signal: controller.signal }),
        fetch(`/api/youtube-search?q=${encodeURIComponent(q)}&type=playlist`, { signal: controller.signal }),
      ]);

      const vData = await vRes.json().catch(() => ({}));
      const pData = await pRes.json().catch(() => ({}));

      if (!vRes.ok && !pRes.ok) {
        throw new Error(vData?.message || pData?.message || 'Search failed. Check your internet connection.');
      }

      setSearchResults(Array.isArray(vData.results) ? vData.results : []);
      setSearchPlaylists(Array.isArray(pData.playlists) ? pData.playlists : []);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setSearchError(err.message || 'Search request failed.');
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(searchDebounceRef.current);
    if (!val.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      setSearchPlaylists([]);
      return;
    }
    searchDebounceRef.current = setTimeout(() => {
      executeSearch(val);
    }, 380);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setSearchResults([]);
    setSearchPlaylists([]);
    searchInputRef.current?.focus();
  };

  const handleCategoryClick = (catId) => {
    setUserSelectedCategory(catId);
    musicActions.setActiveCategory(catId);
    if (isSearching) {
      setSearchQuery('');
      setIsSearching(false);
    }
  };

  // Open Playlist detail (handles both local playlists and public YouTube playlists)
  const openPlaylistDetail = async (pl) => {
    if (pl.tracks && Array.isArray(pl.tracks)) {
      setSelectedPlaylistDetail(pl);
      return;
    }

    // Public YouTube playlist: fetch items via API
    setSelectedPlaylistDetail({
      ...pl,
      tracks: [],
    });
    setPlaylistLoading(true);

    try {
      const res = await fetch(`/api/youtube-search?playlistId=${encodeURIComponent(pl.playlistId)}`);
      const data = await res.json();
      if (res.ok && data.results) {
        setSelectedPlaylistDetail({
          id: pl.playlistId,
          playlistId: pl.playlistId,
          name: pl.title || data.playlist?.title || 'Public Playlist',
          title: pl.title || data.playlist?.title || 'Public Playlist',
          channel: pl.channel || data.playlist?.channel || '',
          thumbnail: pl.thumbnail || data.playlist?.thumbnail || '',
          itemCount: data.results.length,
          tracks: data.results,
          isPublicYouTube: true,
        });
      } else {
        showFlash(data.message || 'Could not load playlist items.');
      }
    } catch (err) {
      showFlash(err?.message || 'Failed to reach YouTube for playlist items.');
    } finally {
      setPlaylistLoading(false);
    }
  };

  // Play a track from discovery or playlist
  const handlePlayTrack = (selectedTrack, candidateQueue = null) => {
    const targetQueue = candidateQueue || [selectedTrack];
    const targetIndex = targetQueue.findIndex((t) => t.videoId === selectedTrack.videoId);
    musicActions.playTrack(selectedTrack, {
      queue: targetQueue,
      index: targetIndex >= 0 ? targetIndex : 0,
      playlistTitle: selectedPlaylistDetail?.title || selectedPlaylistDetail?.name,
    });
  };

  // Import public playlist URL
  const handleImportSubmit = async (e) => {
    e.preventDefault();
    const url = importUrl.trim();
    if (!url) return;

    setImportStatus({ loading: true, error: null, success: false });
    try {
      const res = await fetch(`/api/youtube-search?playlistId=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Could not import playlist. Check the URL.');
      }
      if (!data.results || !data.results.length) {
        throw new Error('Playlist has no available playable tracks.');
      }

      await playlistActions.importPlaylist(data.playlist, data.results);
      setImportStatus({ loading: false, error: null, success: true });
      showFlash(`Imported "${data.playlist?.title}" to your library!`);
      setTimeout(() => {
        setImportModalOpen(false);
        setImportUrl('');
        setImportStatus({ loading: false, error: null, success: false });
      }, 1200);
    } catch (err) {
      setImportStatus({ loading: false, error: err.message, success: false });
    }
  };

  // Create empty playlist
  const handleCreatePlaylistSubmit = async (e) => {
    e.preventDefault();
    const name = newPlaylistName.trim();
    if (!name) return;
    try {
      await playlistActions.createPlaylist(name);
      showFlash(`Created playlist "${name}"`);
      setNewPlaylistName('');
      setNewPlaylistModalOpen(false);
    } catch (err) {
      showFlash(err.message || 'Could not create playlist.');
    }
  };

  // Filter curated tracks by selected category
  const categoryTracks = useMemo(() => {
    return CURATED_FOCUS_TRACKS.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  const deepFocusTracks = useMemo(() => {
    return CURATED_FOCUS_TRACKS.filter((t) => t.category === 'deep-focus');
  }, []);

  const lofiTracks = useMemo(() => {
    return CURATED_FOCUS_TRACKS.filter((t) => t.category === 'lo-fi');
  }, []);

  // History tracks mapped from video IDs
  const historyTracks = useMemo(() => {
    const historyIds = playback.history || [];
    return historyIds
      .map((id) => CURATED_FOCUS_TRACKS.find((t) => t.videoId === id) || queue.find((t) => t.videoId === id))
      .filter(Boolean)
      .slice(0, 8);
  }, [playback.history, queue]);

  if (musicUiState !== 'expanded') return null;

  return (
    <div className="atlera-music-overlay" role="dialog" aria-modal="true" aria-label="Atlera Music Discovery Home">
      {/* Toast Flash Notice */}
      {flashMessage && (
        <div className="atlera-flash-toast" role="status">
          <Check size={14} />
          <span>{flashMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="atlera-music-frame">
        {/* ================================================================= */}
        {/* LEFT SIDEBAR (Desktop)                                            */}
        {/* ================================================================= */}
        <aside className="atlera-music-sidebar" aria-label="Music navigation">
          {/* Brand header */}
          <div className="atlera-music-brand">
            <div className="atlera-music-brand-icon">
              <Hourglass size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div className="atlera-music-brand-title">Atleratimer</div>
              <div className="atlera-music-brand-subtitle">FOCUS MUSIC HOME</div>
            </div>
          </div>

          {/* Primary Nav */}
          <nav className="atlera-music-nav">
            <button
              type="button"
              className={`atlera-nav-link ${activeTab === 'home' && !isSearching ? 'active' : ''}`}
              onClick={() => { setActiveTab('home'); setIsSearching(false); setSelectedPlaylistDetail(null); }}
            >
              <Home size={18} />
              <span>Home</span>
            </button>

            <button
              type="button"
              className={`atlera-nav-link ${activeTab === 'explore' ? 'active' : ''}`}
              onClick={() => { setActiveTab('explore'); setIsSearching(false); setSelectedPlaylistDetail(null); }}
            >
              <Compass size={18} />
              <span>Explore</span>
            </button>

            <button
              type="button"
              className={`atlera-nav-link ${activeTab === 'library' ? 'active' : ''}`}
              onClick={() => { setActiveTab('library'); setIsSearching(false); setSelectedPlaylistDetail(null); }}
            >
              <Library size={18} />
              <span>Your Library</span>
            </button>

            <button
              type="button"
              className={`atlera-nav-link ${activeTab === 'liked' ? 'active' : ''}`}
              onClick={() => { setActiveTab('liked'); setIsSearching(false); setSelectedPlaylistDetail(null); }}
            >
              <Heart size={18} />
              <span>Liked Music</span>
              {likedTracks.length > 0 && (
                <span className="atlera-nav-count">{likedTracks.length}</span>
              )}
            </button>

            <button
              type="button"
              className={`atlera-nav-link ${activeTab === 'saved' ? 'active' : ''}`}
              onClick={() => { setActiveTab('saved'); setIsSearching(false); setSelectedPlaylistDetail(null); }}
            >
              <ListMusic size={18} />
              <span>Saved Playlists</span>
              {playlists.length > 0 && (
                <span className="atlera-nav-count">{playlists.length}</span>
              )}
            </button>
          </nav>

          <div className="atlera-sidebar-divider" />

          {/* Quick Actions */}
          <div className="atlera-sidebar-actions">
            <button
              type="button"
              className="atlera-action-btn"
              onClick={() => setNewPlaylistModalOpen(true)}
            >
              <Plus size={16} />
              <span>Create Playlist</span>
            </button>

            <button
              type="button"
              className="atlera-action-btn"
              onClick={() => setImportModalOpen(true)}
            >
              <Link2 size={16} />
              <span>Import Playlist</span>
            </button>
          </div>

          {/* User Playlists Quick Shelf */}
          {playlists.length > 0 && (
            <div className="atlera-sidebar-playlists">
              <div className="atlera-sidebar-heading">YOUR PLAYLISTS</div>
              <ul className="atlera-sidebar-list">
                {playlists.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={`atlera-sidebar-item ${activePlaylist?.id === p.id ? 'active' : ''}`}
                      onClick={() => openPlaylistDetail(p)}
                    >
                      <FolderHeart size={14} />
                      <span className="atlera-sidebar-item-name">{p.name}</span>
                      <span className="atlera-sidebar-item-count">{p.tracks?.length || 0}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer status */}
          <div className="atlera-sidebar-bottom">
            <span className={`atlera-dot ${isGuest ? 'guest' : 'synced'}`} />
            <span>{storageLabel}</span>
          </div>
        </aside>

        {/* ================================================================= */}
        {/* MAIN CONTENT AREA                                                 */}
        {/* ================================================================= */}
        <main className="atlera-music-content">
          {/* Top Bar: Search, Category Chips & Window Controls */}
          <header className="atlera-topbar">
            {/* Search Input Box */}
            <div className="atlera-search-container">
              <div className="atlera-search-wrapper">
                <Search size={18} className="atlera-search-icon" />
                <input
                  ref={searchInputRef}
                  type="search"
                  className="atlera-search-input"
                  placeholder="Search songs, artists, and public playlists..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      executeSearch(searchQuery);
                    }
                  }}
                  aria-label="Search focus music"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="atlera-search-clear"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
                {searchLoading && (
                  <Loader2 size={16} className="spin atlera-search-spinner" />
                )}
              </div>
            </div>

            {/* Window Controls: MINIMIZE and CLOSE */}
            <div className="atlera-window-controls">
              <button
                type="button"
                className="atlera-win-btn atlera-win-minimize"
                onClick={musicActions.minimize}
                title="Minimize to HUD (playback continues on timer)"
                aria-label="Minimize to HUD"
              >
                <Minimize2 size={16} />
                <span className="atlera-win-btn-label">Minimize</span>
              </button>

              <button
                type="button"
                className="atlera-win-btn atlera-win-close"
                onClick={musicActions.closeMusic}
                title="Close music interface"
                aria-label="Close music interface"
              >
                <X size={16} />
                <span className="atlera-win-btn-label">Close</span>
              </button>
            </div>
          </header>

          {/* Category Chips Bar */}
          <div className="atlera-category-strip" role="tablist" aria-label="Music mood filters">
            {FOCUS_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={selectedCategory === cat.id}
                className={`atlera-cat-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Scrollable Main Views */}
          <div className="atlera-scroll-area">
            {/* 1. PLAYLIST DETAIL VIEW (Overlay modal inside content) */}
            {selectedPlaylistDetail && (
              <section className="atlera-detail-view" aria-label="Playlist detail">
                <button
                  type="button"
                  className="atlera-back-btn"
                  onClick={() => setSelectedPlaylistDetail(null)}
                >
                  ← Back to discovery
                </button>

                <div className="atlera-detail-header">
                  <div className="atlera-detail-cover">
                    {selectedPlaylistDetail.thumbnail ? (
                      <img src={selectedPlaylistDetail.thumbnail} alt="" />
                    ) : (
                      <Music2 size={36} />
                    )}
                  </div>
                  <div className="atlera-detail-meta">
                    <span className="atlera-detail-tag">PLAYLIST</span>
                    <h2 className="atlera-detail-title">{selectedPlaylistDetail.title || selectedPlaylistDetail.name}</h2>
                    <p className="atlera-detail-creator">
                      Curated by {selectedPlaylistDetail.channel || 'Atlera Focus'} · {selectedPlaylistDetail.tracks?.length || selectedPlaylistDetail.itemCount || 0} tracks
                    </p>
                    {selectedPlaylistDetail.description && (
                      <p className="atlera-detail-desc">{selectedPlaylistDetail.description}</p>
                    )}

                    <div className="atlera-detail-actions">
                      <button
                        type="button"
                        className="atlera-primary-btn"
                        onClick={() => {
                          if (selectedPlaylistDetail.tracks?.length) {
                            musicActions.playPlaylist(selectedPlaylistDetail, 0);
                          }
                        }}
                        disabled={!selectedPlaylistDetail.tracks?.length}
                      >
                        <Play size={16} />
                        <span>Play All</span>
                      </button>

                      <button
                        type="button"
                        className="atlera-secondary-btn"
                        onClick={() => {
                          if (selectedPlaylistDetail.tracks?.length) {
                            musicActions.playPlaylist(selectedPlaylistDetail, 0, { shuffle: true });
                          }
                        }}
                        disabled={!selectedPlaylistDetail.tracks?.length}
                      >
                        <Shuffle size={16} />
                        <span>Shuffle</span>
                      </button>

                      {/* Save to library action */}
                      {selectedPlaylistDetail.isPublicYouTube && (
                        <button
                          type="button"
                          className="atlera-secondary-btn"
                          onClick={async () => {
                            try {
                              await playlistActions.importPlaylist(selectedPlaylistDetail, selectedPlaylistDetail.tracks);
                              showFlash(`Saved "${selectedPlaylistDetail.title}" to Your Library!`);
                            } catch (err) {
                              showFlash(err.message || 'Could not save playlist.');
                            }
                          }}
                        >
                          <Plus size={16} />
                          <span>Save to Library</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tracks Table */}
                <div className="atlera-tracks-table-wrap">
                  {playlistLoading ? (
                    <div className="atlera-loading-box">
                      <Loader2 size={24} className="spin" />
                      <span>Loading playlist tracks from YouTube…</span>
                    </div>
                  ) : !selectedPlaylistDetail.tracks?.length ? (
                    <div className="atlera-empty-box">No playable tracks in this playlist.</div>
                  ) : (
                    <table className="atlera-tracks-table">
                      <thead>
                        <tr>
                          <th style={{ width: 44 }}>#</th>
                          <th>Title</th>
                          <th>Artist / Channel</th>
                          <th style={{ width: 80, textAlign: 'right' }}>Duration</th>
                          <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPlaylistDetail.tracks.map((t, idx) => {
                          const isCurrent = track?.videoId === t.videoId;
                          const liked = playlistActions.isLiked(t.videoId);

                          return (
                            <tr
                              key={`${t.videoId}-${idx}`}
                              className={`atlera-track-row ${isCurrent ? 'active' : ''}`}
                              onClick={() => handlePlayTrack(t, selectedPlaylistDetail.tracks)}
                            >
                              <td className="atlera-track-num">
                                {isCurrent && playing ? (
                                  <div className="atlera-mini-wave"><span /><span /><span /></div>
                                ) : (
                                  idx + 1
                                )}
                              </td>
                              <td className="atlera-track-title-cell">
                                <img src={t.thumbnail} alt="" className="atlera-track-thumb" />
                                <div className="atlera-track-title" title={t.title}>{t.title}</div>
                              </td>
                              <td className="atlera-track-channel">{t.channel}</td>
                              <td className="atlera-track-time">{formatTime(t.duration)}</td>
                              <td className="atlera-track-btns" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className={`atlera-icon-act ${liked ? 'liked' : ''}`}
                                  onClick={() => {
                                    const nextLiked = playlistActions.toggleLikeTrack(t);
                                    showFlash(nextLiked ? 'Added to Liked Music' : 'Removed from Liked Music');
                                  }}
                                  title={liked ? 'Unlike' : 'Like'}
                                  aria-label="Like track"
                                >
                                  <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
                                </button>
                                <button
                                  type="button"
                                  className="atlera-icon-act"
                                  onClick={() => {
                                    musicActions.addToQueue(t);
                                    showFlash('Added to Up Next queue');
                                  }}
                                  title="Add to queue"
                                  aria-label="Add to queue"
                                >
                                  <Plus size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            )}

            {/* 2. LIVE SEARCH RESULTS VIEW */}
            {!selectedPlaylistDetail && isSearching && (
              <section className="atlera-search-results-view" aria-label="Search results">
                <div className="atlera-section-header">
                  <h3>Search results for "{searchQuery}"</h3>
                  <button type="button" className="atlera-link-btn" onClick={handleClearSearch}>Clear search</button>
                </div>

                {searchError && (
                  <div className="atlera-error-banner" role="alert">
                    <AlertTriangle size={16} />
                    <span>{searchError}</span>
                  </div>
                )}

                {/* Song results */}
                <div className="atlera-search-block">
                  <h4 className="atlera-subheading">Songs</h4>
                  {searchResults.length === 0 && !searchLoading ? (
                    <p className="atlera-empty-text">No songs matching "{searchQuery}".</p>
                  ) : (
                    <div className="atlera-track-grid">
                      {searchResults.map((r, i) => (
                        <div
                          key={r.videoId || i}
                          className="atlera-track-item"
                          onClick={() => handlePlayTrack(r, searchResults)}
                        >
                          <img src={r.thumbnail} alt="" className="atlera-track-item-thumb" />
                          <div className="atlera-track-item-info">
                            <div className="atlera-track-item-title" title={r.title}>{r.title}</div>
                            <div className="atlera-track-item-channel">{r.channel}</div>
                          </div>
                          <div className="atlera-track-item-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="atlera-circle-btn"
                              onClick={() => handlePlayTrack(r, searchResults)}
                              title="Play"
                              aria-label="Play song"
                            >
                              <Play size={13} style={{ marginLeft: 2 }} />
                            </button>
                            <button
                              type="button"
                              className="atlera-circle-btn"
                              onClick={() => {
                                musicActions.addToQueue(r);
                                showFlash('Added to queue');
                              }}
                              title="Add to queue"
                              aria-label="Add to queue"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Public playlist results */}
                <div className="atlera-search-block" style={{ marginTop: 24 }}>
                  <h4 className="atlera-subheading">Public Playlists</h4>
                  {searchPlaylists.length === 0 && !searchLoading ? (
                    <p className="atlera-empty-text">No playlists matching "{searchQuery}".</p>
                  ) : (
                    <div className="atlera-shelf-grid">
                      {searchPlaylists.map((pl) => (
                        <PlaylistCard
                          key={pl.playlistId}
                          playlist={pl}
                          onSelect={() => openPlaylistDetail(pl)}
                          onPlay={() => openPlaylistDetail(pl)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 3. HOME VIEW (Recommended shelves & Curated Categories) */}
            {!selectedPlaylistDetail && !isSearching && activeTab === 'home' && (
              <div className="atlera-home-content">
                {/* Shelf: Recommended for Focus */}
                <section className="atlera-shelf">
                  <div className="atlera-shelf-head">
                    <div>
                      <h3 className="atlera-shelf-title">Recommended for Focus</h3>
                      <p className="atlera-shelf-desc">Curated study playlists to keep you in flow</p>
                    </div>
                  </div>
                  <div className="atlera-shelf-grid">
                    {CURATED_PUBLIC_PLAYLISTS.map((pl) => (
                      <PlaylistCard
                        key={pl.playlistId}
                        playlist={pl}
                        onSelect={() => openPlaylistDetail(pl)}
                        onPlay={() => openPlaylistDetail(pl)}
                      />
                    ))}
                  </div>
                </section>

                {/* Shelf: Selected Mood Tracks */}
                <section className="atlera-shelf">
                  <div className="atlera-shelf-head">
                    <div>
                      <h3 className="atlera-shelf-title">
                        {FOCUS_CATEGORIES.find((c) => c.id === selectedCategory)?.label || 'Deep Focus'}
                      </h3>
                      <p className="atlera-shelf-desc">
                        {FOCUS_CATEGORIES.find((c) => c.id === selectedCategory)?.description || 'Curated soundscapes'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="atlera-play-all-pill"
                      onClick={() => handlePlayTrack(categoryTracks[0], categoryTracks)}
                    >
                      <Play size={13} />
                      <span>Play all</span>
                    </button>
                  </div>
                  <div className="atlera-track-grid">
                    {categoryTracks.map((t) => (
                      <TrackCard
                        key={t.videoId}
                        track={t}
                        isPlaying={track?.videoId === t.videoId && playing}
                        onPlay={() => handlePlayTrack(t, categoryTracks)}
                        onAddQueue={() => { musicActions.addToQueue(t); showFlash('Added to queue'); }}
                        isLiked={playlistActions.isLiked(t.videoId)}
                        onToggleLike={() => playlistActions.toggleLikeTrack(t)}
                      />
                    ))}
                  </div>
                </section>

                {/* Shelf: Deep Focus & Ambient */}
                <section className="atlera-shelf">
                  <div className="atlera-shelf-head">
                    <h3 className="atlera-shelf-title">Deep Focus & Binaural</h3>
                  </div>
                  <div className="atlera-track-grid">
                    {deepFocusTracks.map((t) => (
                      <TrackCard
                        key={t.videoId}
                        track={t}
                        isPlaying={track?.videoId === t.videoId && playing}
                        onPlay={() => handlePlayTrack(t, deepFocusTracks)}
                        onAddQueue={() => { musicActions.addToQueue(t); showFlash('Added to queue'); }}
                        isLiked={playlistActions.isLiked(t.videoId)}
                        onToggleLike={() => playlistActions.toggleLikeTrack(t)}
                      />
                    ))}
                  </div>
                </section>

                {/* Shelf: Lo-fi & Instrumental */}
                <section className="atlera-shelf">
                  <div className="atlera-shelf-head">
                    <h3 className="atlera-shelf-title">Lo-fi & Instrumental Study</h3>
                  </div>
                  <div className="atlera-track-grid">
                    {lofiTracks.map((t) => (
                      <TrackCard
                        key={t.videoId}
                        track={t}
                        isPlaying={track?.videoId === t.videoId && playing}
                        onPlay={() => handlePlayTrack(t, lofiTracks)}
                        onAddQueue={() => { musicActions.addToQueue(t); showFlash('Added to queue'); }}
                        isLiked={playlistActions.isLiked(t.videoId)}
                        onToggleLike={() => playlistActions.toggleLikeTrack(t)}
                      />
                    ))}
                  </div>
                </section>

                {/* Shelf: Recently Played */}
                {historyTracks.length > 0 && (
                  <section className="atlera-shelf">
                    <div className="atlera-shelf-head">
                      <h3 className="atlera-shelf-title">Recently Played</h3>
                    </div>
                    <div className="atlera-track-grid">
                      {historyTracks.map((t) => (
                        <TrackCard
                          key={`hist-${t.videoId}`}
                          track={t}
                          isPlaying={track?.videoId === t.videoId && playing}
                          onPlay={() => handlePlayTrack(t, historyTracks)}
                          onAddQueue={() => { musicActions.addToQueue(t); showFlash('Added to queue'); }}
                          isLiked={playlistActions.isLiked(t.videoId)}
                          onToggleLike={() => playlistActions.toggleLikeTrack(t)}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* 4. EXPLORE VIEW */}
            {!selectedPlaylistDetail && !isSearching && activeTab === 'explore' && (
              <div className="atlera-explore-content">
                <div className="atlera-explore-header">
                  <h2>Explore Focus Moods & Ambience</h2>
                  <p>Choose an environment tailored for your concentration.</p>
                </div>

                <div className="atlera-explore-grid">
                  {FOCUS_CATEGORIES.map((cat) => (
                    <div
                      key={cat.id}
                      className="atlera-mood-card"
                      onClick={() => handleCategoryClick(cat.id)}
                    >
                      <div className="atlera-mood-card-title">{cat.label}</div>
                      <div className="atlera-mood-card-desc">{cat.description}</div>
                      <span className="atlera-mood-arrow">Explore <ArrowRight size={14} /></span>
                    </div>
                  ))}
                </div>

                {/* Public Playlist Import Section */}
                <div className="atlera-import-banner">
                  <div className="atlera-import-info">
                    <h3>Import any YouTube Playlist</h3>
                    <p>Paste a public YouTube playlist URL to stream it directly during study sessions.</p>
                  </div>
                  <button
                    type="button"
                    className="atlera-primary-btn"
                    onClick={() => setImportModalOpen(true)}
                  >
                    <Link2 size={16} />
                    <span>Import URL</span>
                  </button>
                </div>
              </div>
            )}

            {/* 5. LIBRARY VIEW */}
            {!selectedPlaylistDetail && !isSearching && activeTab === 'library' && (
              <div className="atlera-library-content">
                <div className="atlera-section-header">
                  <h2>Your Library</h2>
                  <div className="atlera-lib-header-btns">
                    <button
                      type="button"
                      className="atlera-primary-btn"
                      onClick={() => setNewPlaylistModalOpen(true)}
                    >
                      <Plus size={15} />
                      <span>New Playlist</span>
                    </button>
                    <button
                      type="button"
                      className="atlera-secondary-btn"
                      onClick={() => setImportModalOpen(true)}
                    >
                      <Link2 size={15} />
                      <span>Import</span>
                    </button>
                  </div>
                </div>

                {playlists.length === 0 ? (
                  <div className="atlera-empty-card">
                    <ListMusic size={32} />
                    <h4>No playlists created yet</h4>
                    <p>Create your custom playlists or import public study playlists to access them here.</p>
                    <button
                      type="button"
                      className="atlera-primary-btn"
                      onClick={() => setNewPlaylistModalOpen(true)}
                    >
                      <Plus size={16} />
                      <span>Create your first playlist</span>
                    </button>
                  </div>
                ) : (
                  <div className="atlera-shelf-grid">
                    {playlists.map((pl) => (
                      <PlaylistCard
                        key={pl.id}
                        playlist={pl}
                        onSelect={() => openPlaylistDetail(pl)}
                        onPlay={() => playlistActions.playPlaylist(pl.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 6. LIKED MUSIC VIEW */}
            {!selectedPlaylistDetail && !isSearching && activeTab === 'liked' && (
              <div className="atlera-library-content">
                <div className="atlera-section-header">
                  <h2>Liked Music</h2>
                  {likedTracks.length > 0 && (
                    <button
                      type="button"
                      className="atlera-primary-btn"
                      onClick={() => handlePlayTrack(likedTracks[0], likedTracks)}
                    >
                      <Play size={15} />
                      <span>Play all ({likedTracks.length})</span>
                    </button>
                  )}
                </div>

                {likedTracks.length === 0 ? (
                  <div className="atlera-empty-card">
                    <Heart size={32} />
                    <h4>No liked tracks yet</h4>
                    <p>Click the heart icon on any song while studying to save it to your favorites.</p>
                  </div>
                ) : (
                  <div className="atlera-track-grid">
                    {likedTracks.map((t) => (
                      <TrackCard
                        key={`liked-${t.videoId}`}
                        track={t}
                        isPlaying={track?.videoId === t.videoId && playing}
                        onPlay={() => handlePlayTrack(t, likedTracks)}
                        onAddQueue={() => { musicActions.addToQueue(t); showFlash('Added to queue'); }}
                        isLiked={true}
                        onToggleLike={() => {
                          playlistActions.toggleLikeTrack(t);
                          showFlash('Removed from Liked Music');
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 7. SAVED PLAYLISTS VIEW */}
            {!selectedPlaylistDetail && !isSearching && activeTab === 'saved' && (
              <div className="atlera-library-content">
                <div className="atlera-section-header">
                  <h2>Saved Playlists</h2>
                  <button
                    type="button"
                    className="atlera-primary-btn"
                    onClick={() => setNewPlaylistModalOpen(true)}
                  >
                    <Plus size={15} />
                    <span>Create Playlist</span>
                  </button>
                </div>

                {playlists.length === 0 ? (
                  <div className="atlera-empty-card">
                    <ListMusic size={32} />
                    <h4>No saved playlists yet</h4>
                    <p>Playlists you create or import will appear here.</p>
                  </div>
                ) : (
                  <div className="atlera-shelf-grid">
                    {playlists.map((pl) => (
                      <PlaylistCard
                        key={pl.id}
                        playlist={pl}
                        onSelect={() => openPlaylistDetail(pl)}
                        onPlay={() => playlistActions.playPlaylist(pl.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* =============================================================== */}
          {/* PERSISTENT EXPANDED PLAYER BAR (Bottom of Music Home)           */}
          {/* =============================================================== */}
          <footer className="atlera-player-dock" aria-label="Audio player dock">
            {/* Left: Track Information */}
            <div className="atlera-player-info">
              <div className="atlera-player-thumb">
                {track?.thumbnail ? (
                  <img src={track.thumbnail} alt="" />
                ) : (
                  <Music2 size={18} />
                )}
              </div>
              <div className="atlera-player-names">
                <div className="atlera-player-title" title={track?.title || 'No track selected'}>
                  {track ? track.title : 'Ready to play'}
                </div>
                <div className="atlera-player-artist">
                  {track?.channel || (autoplayReason || 'Study atmosphere')}
                </div>
              </div>
              {track && (
                <button
                  type="button"
                  className={`atlera-player-like-btn ${playlistActions.isLiked(track.videoId) ? 'liked' : ''}`}
                  onClick={() => {
                    const nextLiked = playlistActions.toggleLikeTrack(track);
                    showFlash(nextLiked ? 'Added to Liked Music' : 'Removed from Liked Music');
                  }}
                  title="Like track"
                  aria-label="Like track"
                >
                  <Heart size={16} fill={playlistActions.isLiked(track.videoId) ? 'currentColor' : 'none'} />
                </button>
              )}
            </div>

            {/* Center: Controls & Scrubber */}
            <div className="atlera-player-center">
              <div className="atlera-transport-row">
                {/* Shuffle */}
                <button
                  type="button"
                  className={`atlera-dock-btn ${shuffle ? 'active' : ''}`}
                  onClick={musicActions.toggleShuffle}
                  title={`Shuffle: ${shuffle ? 'On' : 'Off'}`}
                  aria-label="Toggle shuffle"
                  aria-pressed={shuffle}
                >
                  <Shuffle size={15} />
                </button>

                {/* Previous */}
                <button
                  type="button"
                  className="atlera-dock-btn"
                  onClick={musicActions.prev}
                  title="Previous track"
                  aria-label="Previous track"
                >
                  <SkipBack size={17} />
                </button>

                {/* Play / Pause */}
                <button
                  type="button"
                  className="atlera-dock-btn atlera-dock-play"
                  onClick={musicActions.toggle}
                  disabled={!track && queue.length === 0}
                  title={playing ? 'Pause' : 'Play'}
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playback.isBusy ? (
                    <Loader2 size={18} className="spin" />
                  ) : playing ? (
                    <Pause size={18} />
                  ) : (
                    <Play size={18} style={{ marginLeft: 2 }} />
                  )}
                </button>

                {/* Next */}
                <button
                  type="button"
                  className="atlera-dock-btn"
                  onClick={musicActions.next}
                  title="Next track"
                  aria-label="Next track"
                >
                  <SkipForward size={17} />
                </button>

                {/* Repeat */}
                <button
                  type="button"
                  className={`atlera-dock-btn ${repeat !== 'off' ? 'active' : ''}`}
                  onClick={musicActions.cycleRepeat}
                  title={`Repeat: ${repeat}`}
                  aria-label={`Repeat mode: ${repeat}`}
                >
                  {repeat === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />}
                </button>
              </div>

              {/* Progress Slider */}
              <div className="atlera-scrub-row">
                <span className="atlera-scrub-time">{formatTime(progress.currentTime)}</span>
                <input
                  type="range"
                  className="atlera-scrub-range"
                  min={0}
                  max={1000}
                  value={progress.duration > 0 ? Math.round((progress.currentTime / progress.duration) * 1000) : 0}
                  onChange={(e) => musicActions.seekFraction(Number(e.target.value) / 1000)}
                  disabled={!progress.duration}
                  aria-label="Playback scrub"
                />
                <span className="atlera-scrub-time">
                  {progress.duration > 0 ? formatTime(progress.duration) : '--:--'}
                </span>
              </div>
            </div>

            {/* Right: Autoplay, Volume & Queue */}
            <div className="atlera-player-right">
              {/* Autoplay Toggle */}
              <button
                type="button"
                className={`atlera-autoplay-toggle ${autoplay ? 'on' : 'off'}`}
                onClick={musicActions.toggleAutoplay}
                title={`Intelligent Autoplay: ${autoplay ? 'ON (Continues with curated focus music)' : 'OFF'}`}
                aria-pressed={autoplay}
                aria-label={`Intelligent Autoplay ${autoplay ? 'on' : 'off'}`}
              >
                <Sparkles size={13} />
                <span>Autoplay</span>
              </button>

              {/* Volume Slider */}
              <div className="atlera-volume-group">
                <button
                  type="button"
                  className="atlera-dock-btn"
                  onClick={musicActions.toggleMute}
                  title={muted ? 'Unmute' : 'Mute'}
                  aria-label={muted ? 'Unmute' : 'Mute'}
                >
                  {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range"
                  className="atlera-volume-range"
                  min={0}
                  max={100}
                  value={Math.round((muted ? 0 : volume) * 100)}
                  onChange={(e) => musicActions.setVolume(Number(e.target.value) / 100)}
                  aria-label="Volume"
                />
              </div>

              {/* Queue Button */}
              <button
                type="button"
                className={`atlera-dock-btn atlera-queue-btn ${isQueueOpen ? 'active' : ''}`}
                onClick={() => setIsQueueOpen((v) => !v)}
                title="Up Next Queue"
                aria-label="Up Next Queue"
                aria-expanded={isQueueOpen}
              >
                <ListMusic size={16} />
                {queue.length > 0 && (
                  <span className="atlera-queue-badge">{queue.length}</span>
                )}
              </button>

              {/* Explicit Stop Music Button */}
              <button
                type="button"
                className="atlera-dock-btn atlera-stop-btn"
                onClick={musicActions.stop}
                title="Stop music playback"
                aria-label="Stop music playback"
              >
                <Square size={14} />
              </button>
            </div>
          </footer>

          {/* =============================================================== */}
          {/* UP NEXT QUEUE DRAWER (Slide-out panel)                          */}
          {/* =============================================================== */}
          {isQueueOpen && (
            <aside className="atlera-queue-drawer" role="region" aria-label="Up Next Queue">
              <div className="atlera-drawer-head">
                <div className="atlera-drawer-title-group">
                  <h4>Up Next Queue</h4>
                  <span className="atlera-queue-len">{queue.length} track{queue.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="atlera-drawer-actions">
                  <button
                    type="button"
                    className="atlera-link-btn"
                    onClick={musicActions.clearQueue}
                    disabled={queue.length <= 1}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className="atlera-dock-btn"
                    onClick={() => setIsQueueOpen(false)}
                    aria-label="Close queue"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="atlera-queue-list">
                {queue.map((qTrack, qIdx) => {
                  const isCurrent = qIdx === index;
                  return (
                    <div
                      key={`${qTrack.videoId}-${qIdx}`}
                      className={`atlera-queue-item ${isCurrent ? 'playing' : ''}`}
                      onClick={() => musicActions.playTrack(qTrack, { queue, index: qIdx })}
                    >
                      <div className="atlera-queue-item-thumb">
                        <img src={qTrack.thumbnail} alt="" />
                        {isCurrent && playing && (
                          <div className="atlera-queue-wave"><span /><span /><span /></div>
                        )}
                      </div>
                      <div className="atlera-queue-item-meta">
                        <div className="atlera-queue-item-title" title={qTrack.title}>{qTrack.title}</div>
                        <div className="atlera-queue-item-channel">{qTrack.channel}</div>
                      </div>
                      <button
                        type="button"
                        className="atlera-queue-del-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          musicActions.removeQueued(qIdx);
                        }}
                        title="Remove from queue"
                        aria-label="Remove from queue"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Autoplay Preview */}
              <div className="atlera-queue-autoplay-banner">
                <div className="atlera-autoplay-desc">
                  <Sparkles size={14} className="atlera-sparkle-icon" />
                  <div>
                    <div className="atlera-autoplay-head">Intelligent Autoplay {autoplay ? 'Active' : 'Disabled'}</div>
                    <div className="atlera-autoplay-foot">
                      {autoplay
                        ? 'Queue will seamlessly transition to recommended focus tracks.'
                        : 'Playback will stop when the queue finishes.'}
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          )}

          {/* =============================================================== */}
          {/* CREATE PLAYLIST MODAL                                            */}
          {/* =============================================================== */}
          {newPlaylistModalOpen && (
            <div className="atlera-modal-backdrop" onClick={() => setNewPlaylistModalOpen(false)}>
              <div className="atlera-modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Create playlist">
                <div className="atlera-modal-header">
                  <h4>New Playlist</h4>
                  <button type="button" className="atlera-modal-close" onClick={() => setNewPlaylistModalOpen(false)}>✕</button>
                </div>
                <form onSubmit={handleCreatePlaylistSubmit}>
                  <p className="atlera-modal-sub">Create a custom focus study collection.</p>
                  <input
                    type="text"
                    className="atlera-modal-input"
                    placeholder="Playlist name (e.g. Deep Coding, Math Focus)"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    autoFocus
                    maxLength={80}
                  />
                  <div className="atlera-modal-footer">
                    <button
                      type="button"
                      className="atlera-secondary-btn"
                      onClick={() => setNewPlaylistModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="atlera-primary-btn"
                      disabled={!newPlaylistName.trim()}
                    >
                      Create
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* IMPORT PLAYLIST MODAL                                            */}
          {/* =============================================================== */}
          {importModalOpen && (
            <div className="atlera-modal-backdrop" onClick={() => setImportModalOpen(false)}>
              <div className="atlera-modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Import playlist">
                <div className="atlera-modal-header">
                  <h4>Import YouTube Playlist</h4>
                  <button type="button" className="atlera-modal-close" onClick={() => setImportModalOpen(false)}>✕</button>
                </div>
                <form onSubmit={handleImportSubmit}>
                  <p className="atlera-modal-sub">
                    Paste any public YouTube playlist link or playlist ID (e.g. https://www.youtube.com/playlist?list=PL...):
                  </p>
                  <input
                    type="text"
                    className="atlera-modal-input"
                    placeholder="https://www.youtube.com/playlist?list=..."
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    autoFocus
                  />
                  {importStatus.error && (
                    <div className="atlera-modal-error" role="alert">
                      <AlertTriangle size={14} />
                      <span>{importStatus.error}</span>
                    </div>
                  )}
                  {importStatus.success && (
                    <div className="atlera-modal-success" role="status">
                      <Check size={14} />
                      <span>Playlist imported successfully!</span>
                    </div>
                  )}
                  <div className="atlera-modal-footer">
                    <button
                      type="button"
                      className="atlera-secondary-btn"
                      onClick={() => setImportModalOpen(false)}
                      disabled={importStatus.loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="atlera-primary-btn"
                      disabled={!importUrl.trim() || importStatus.loading}
                    >
                      {importStatus.loading ? <Loader2 size={15} className="spin" /> : 'Import'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable Playlist Card
// ---------------------------------------------------------------------------
function PlaylistCard({ playlist, onSelect, onPlay }) {
  const title = playlist.title || playlist.name;
  const channel = playlist.channel || playlist.creator || 'Curated';
  const count = playlist.itemCount ?? playlist.tracks?.length ?? 0;

  return (
    <div
      className="atlera-card"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="atlera-card-thumb-wrap">
        {playlist.thumbnail ? (
          <img src={playlist.thumbnail} alt="" className="atlera-card-img" />
        ) : (
          <div className="atlera-card-fallback-icon"><Music2 size={32} /></div>
        )}
        <button
          type="button"
          className="atlera-card-play-overlay"
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          title={`Play ${title}`}
          aria-label={`Play ${title}`}
        >
          <Play size={18} style={{ marginLeft: 2 }} />
        </button>
      </div>
      <div className="atlera-card-info">
        <div className="atlera-card-title" title={title}>{title}</div>
        <div className="atlera-card-meta">
          <span>{channel}</span>
          {count > 0 && <span>· {count} tracks</span>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable Track Card
// ---------------------------------------------------------------------------
function TrackCard({ track, isPlaying, onPlay, onAddQueue, isLiked, onToggleLike }) {
  return (
    <div
      className={`atlera-track-card ${isPlaying ? 'playing' : ''}`}
      onClick={onPlay}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPlay();
        }
      }}
    >
      <div className="atlera-track-card-thumb">
        <img src={track.thumbnail} alt="" />
        <button
          type="button"
          className="atlera-track-card-play"
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          title={isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 2 }} />}
        </button>
      </div>
      <div className="atlera-track-card-info">
        <div className="atlera-track-card-title" title={track.title}>{track.title}</div>
        <div className="atlera-track-card-channel">{track.channel}</div>
      </div>
      <div className="atlera-track-card-actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`atlera-card-act-btn ${isLiked ? 'liked' : ''}`}
          onClick={onToggleLike}
          title={isLiked ? 'Unlike' : 'Like'}
          aria-label="Like"
        >
          <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
        </button>
        <button
          type="button"
          className="atlera-card-act-btn"
          onClick={onAddQueue}
          title="Add to queue"
          aria-label="Add to queue"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

export default memo(ExpandedMusicHome);
