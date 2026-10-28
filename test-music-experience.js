// Automated Test Suite for Atlera Music Experience Redesign
// Tests YouTube search proxy, intelligent autoplay engine, candidate ranking,
// queue-first behavior, transition deduplication, and playlist import.

import handler from './api/youtube-search.js';
import {
  FOCUS_CATEGORIES,
  CURATED_FOCUS_TRACKS,
  CURATED_PUBLIC_PLAYLISTS,
  scoreCandidate,
  findNextAutoplayTrack,
} from './src/music/autoplayEngine.js';
import { playlistStore, likedStore } from './src/music/playlistStore.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  process.env.YOUTUBE_API_KEY = 'test_key_for_testing';
  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('type=video')) {
      return {
        ok: true,
        json: async () => ({
          items: [
            {
              id: { videoId: 'jfKfPfyJRdk' },
              snippet: { title: 'Lofi Hip Hop Radio - Beats to Relax/Study to', channelTitle: 'Lofi Girl', thumbnails: { medium: { url: 'https://i.ytimg.com/vi/jfKfPfyJRdk/mqdefault.jpg' } } }
            }
          ]
        })
      };
    }
    if (urlStr.includes('type=playlist')) {
      return {
        ok: true,
        json: async () => ({
          items: [
            {
              id: { playlistId: 'PLOzDu-MXXLliO9fBNZOQTBDddoA3FzZUo' },
              snippet: { title: 'Deep Focus Study Music', channelTitle: 'Lofi Girl', thumbnails: { medium: { url: 'https://i.ytimg.com/vi/test/mqdefault.jpg' } } }
            }
          ]
        })
      };
    }
    if (urlStr.includes('playlistItems')) {
      return {
        ok: true,
        json: async () => ({
          items: [
            {
              snippet: {
                resourceId: { videoId: 'track_1' },
                title: 'Calm Piano Study',
                videoOwnerChannelTitle: 'Relaxation',
                channelTitle: 'Relaxation',
                thumbnails: { medium: { url: 'https://i.ytimg.com/vi/test/mqdefault.jpg' } }
              }
            }
          ]
        })
      };
    }
    if (urlStr.includes('playlists?part=snippet')) {
      return {
        ok: true,
        json: async () => ({
          items: [
            {
              snippet: {
                title: 'Curated Focus Playlist',
                channelTitle: 'Lofi Girl',
                thumbnails: { medium: { url: 'https://i.ytimg.com/vi/test/mqdefault.jpg' } }
              }
            }
          ]
        })
      };
    }
    return { ok: true, json: async () => ({ items: [] }) };
  };

  console.log('\n======================================================');
  console.log('1. TESTING YOUTUBE API SEARCH PROXY & PUBLIC PLAYLISTS');
  console.log('======================================================');

  // Test 1: Video Track Search
  {
    const req = { method: 'GET', query: { q: 'lofi study', type: 'video' } };
    let responseData = null;
    const res = {
      setHeader: () => res,
      status: (_c) => ({
        json: (d) => { responseData = d; },
      }),
    };

    await handler(req, res);
    assert(responseData && Array.isArray(responseData.results), 'Video search returns results array');
    assert(responseData.results.length > 0, `Video search returned ${responseData.results?.length} items`);
    assert(responseData.results[0]?.videoId, `Video result has videoId: ${responseData.results?.[0]?.videoId}`);
    assert(responseData.results[0]?.title, `Video result has title: "${responseData.results?.[0]?.title?.slice(0, 40)}..."`);
    assert(responseData.results[0]?.channel, `Video result has channel: ${responseData.results?.[0]?.channel}`);
  }

  // Test 2: Public Playlist Search
  {
    const req = { method: 'GET', query: { q: 'deep focus music', type: 'playlist' } };
    let responseData = null;
    const res = {
      setHeader: () => res,
      status: (_c) => ({
        json: (d) => { responseData = d; },
      }),
    };

    await handler(req, res);
    assert(responseData && Array.isArray(responseData.playlists), 'Playlist search returns playlists array');
    assert(responseData.playlists.length > 0, `Playlist search returned ${responseData.playlists?.length} playlists`);
    assert(responseData.playlists[0]?.playlistId, `Playlist result has playlistId: ${responseData.playlists?.[0]?.playlistId}`);
    assert(responseData.playlists[0]?.title, `Playlist result has real title: "${responseData.playlists?.[0]?.title?.slice(0, 40)}..."`);
    assert(responseData.playlists[0]?.channel, `Playlist result has channel: ${responseData.playlists?.[0]?.channel}`);
  }

  // Test 3: Fetching Playlist Items by ID
  {
    const req = { method: 'GET', query: { playlistId: 'PLOzDu-MXXLliO9fBNZOQTBDddoA3FzZUo' } };
    let responseData = null;
    const res = {
      setHeader: () => res,
      status: (_c) => ({
        json: (d) => { responseData = d; },
      }),
    };

    await handler(req, res);
    assert(responseData && responseData.playlist, 'Playlist items response contains playlist metadata');
    assert(responseData.results?.length > 0, `Loaded ${responseData.results?.length} tracks from playlist`);
    assert(responseData.results[0]?.videoId, 'Playlist track contains valid videoId');
  }

  // Test 4: URL Extraction in Playlist Import
  {
    const req = { method: 'GET', query: { playlistId: 'https://www.youtube.com/playlist?list=PLOzDu-MXXLliO9fBNZOQTBDddoA3FzZUo' } };
    let responseData = null;
    const res = {
      setHeader: () => res,
      status: (_c) => ({
        json: (d) => { responseData = d; },
      }),
    };

    await handler(req, res);
    assert(responseData && responseData.playlist?.title, `Extracted playlist from URL: "${responseData?.playlist?.title}"`);
    assert(responseData.results?.length > 0, 'Extracted tracks from URL successfully');
  }

  console.log('\n======================================================');
  console.log('2. TESTING INTELLIGENT AUTOPLAY & RECOMMENDATION RANKING');
  console.log('======================================================');

  // Test 5: Focus Categories
  assert(FOCUS_CATEGORIES.length === 10, `All 10 focus categories configured (count: ${FOCUS_CATEGORIES.length})`);
  assert(CURATED_FOCUS_TRACKS.length >= 25, `Curated focus catalog contains ${CURATED_FOCUS_TRACKS.length} verified tracks`);
  assert(CURATED_PUBLIC_PLAYLISTS.length >= 5, `Curated public playlists count: ${CURATED_PUBLIC_PLAYLISTS.length}`);

  // Test 6: Deterministic Scoring
  {
    const context = {
      category: 'deep-focus',
      currentTrack: { channel: 'Quiet Quest - Study Music', videoId: '2OEL4P1Rz04' },
    };
    const historySet = new Set(['2OEL4P1Rz04']); // Track already played

    const matchingCandidate = {
      videoId: 'rUxyKA_-grg',
      title: 'Study Music Alpha Waves for Deep Work',
      channel: 'Yellow Brick Cinema',
      category: 'deep-focus',
    };

    const repeatedCandidate = {
      videoId: '2OEL4P1Rz04',
      title: 'Deep Focus Music',
      channel: 'Quiet Quest',
      category: 'deep-focus',
    };

    const noisyCandidate = {
      videoId: 'XYZ123',
      title: 'HILARIOUS REACTION & INTERVIEW TO PODCAST',
      channel: 'Comedy Central',
      category: 'deep-focus',
    };

    const scoreMatch = scoreCandidate(matchingCandidate, context, historySet, {});
    const scoreRepeat = scoreCandidate(repeatedCandidate, context, historySet, {});
    const scoreNoisy = scoreCandidate(noisyCandidate, context, historySet, {});

    assert(scoreMatch > 80, `Fresh matching track scores high (${scoreMatch} pts)`);
    assert(scoreRepeat < 0, `Repeated track is heavily penalized (${scoreRepeat} pts)`);
    assert(scoreNoisy < 0, `Noisy non-focus video is heavily penalized (${scoreNoisy} pts)`);
    assert(scoreMatch > scoreNoisy, 'Focus music strictly preferred over noisy content');
  }

  // Test 7: Autoplay Queue Continuation
  {
    const activePlaylistTracks = [
      { videoId: 'track1', title: 'Focus Track 1' },
      { videoId: 'track2', title: 'Focus Track 2' },
      { videoId: 'track3', title: 'Focus Track 3' },
    ];

    // Playing track 1 in active playlist
    const nextItem = findNextAutoplayTrack({
      autoplay: true,
      currentTrack: activePlaylistTracks[0],
      playlistTracks: activePlaylistTracks,
      playlistTitle: 'Deep Study',
    }, new Set(['track1']), {});

    assert(nextItem?.track?.videoId === 'track2', `Active playlist plays next in order: ${nextItem?.track?.videoId}`);
    assert(nextItem?.reason?.includes('Deep Study'), `Autoplay preserves playlist context: "${nextItem?.reason}"`);
  }

  // Test 8: Autoplay Disabled Stops Cleanly
  {
    const nextItem = findNextAutoplayTrack({
      autoplay: false,
      currentTrack: { videoId: 'track1' },
    }, new Set(['track1']), {});

    assert(nextItem === null, 'Autoplay disabled returns null (stops playback cleanly without random search)');
  }

  // Test 9: Autoplay Exhaustion Fallback
  {
    const nextItem = findNextAutoplayTrack({
      autoplay: true,
      category: 'piano',
      currentTrack: { title: 'Piano Sonata', channel: 'Ludovico' },
    }, new Set(), {});

    assert(nextItem !== null && nextItem.track?.videoId, `Recommends relevant focus track when queue ends: "${nextItem?.track?.title}"`);
    assert(nextItem.track.category === 'piano' || nextItem.track.title.toLowerCase().includes('piano'), 'Recommendation adheres to piano category');
  }

  console.log('\n======================================================');
  console.log('3. TESTING USER LIBRARY, PLAYLIST STORE & LIKED TRACKS');
  console.log('======================================================');

  // Test 10: Playlist Creation & Sanitization
  {
    const pl = await playlistStore.create(null, '   Deep Coding Session   ');
    assert(pl.name === 'Deep Coding Session', `Playlist name sanitized: "${pl.name}"`);

    await playlistStore.addTrack(null, pl.id, {
      videoId: 'vid1',
      title: 'Coding Flow Beat 1',
      channel: 'Lofi Girl',
      thumbnail: 'https://img.yt/1.jpg',
    });

    const list = await playlistStore.list(null);
    const found = list.find((p) => p.id === pl.id);
    assert(found && found.tracks?.length === 1, `Track saved to playlist (track count: ${found?.tracks?.length})`);

    // Clean up
    await playlistStore.remove(null, pl.id);
    const afterDelete = await playlistStore.list(null);
    assert(!afterDelete.some((p) => p.id === pl.id), 'Playlist deleted successfully');
  }

  // Test 11: Liked Tracks Store
  {
    const mockTrack = {
      videoId: 'liked_vid_99',
      title: 'Peaceful Ambient Echo',
      channel: 'Ambient Realm',
    };

    const isLiked1 = likedStore.toggle(mockTrack);
    assert(isLiked1 === true, 'Track added to Liked Music');
    assert(likedStore.isLiked('liked_vid_99') === true, 'Track confirmed as liked in store');

    const isLiked2 = likedStore.toggle(mockTrack);
    assert(isLiked2 === false, 'Track toggled off from Liked Music');
    assert(likedStore.isLiked('liked_vid_99') === false, 'Track confirmed unliked');
  }

  console.log('\n======================================================');
  console.log(`TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
