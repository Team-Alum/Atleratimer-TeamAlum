// Vercel Serverless Function — YouTube Data API v3 search proxy.
// Keeps YOUTUBE_API_KEY server-side; the browser never sees it.
// Returns only the minimal sanitized fields the app needs.

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 300;
const MAX_RESULTS = 15;
const SEARCH_WINDOW_MS = 60 * 1000;
const MAX_SEARCHES_PER_WINDOW = 20;

// Best-effort in-memory cache + per-IP throttle (per warm function instance)
const cache = new Map();
const hits = new Map();

function getClientIp(req) {
  const fwd = req.headers?.['x-forwarded-for'];
  const first = Array.isArray(fwd) ? fwd[0] : String(fwd || '');
  return first.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}

function isThrottled(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < SEARCH_WINDOW_MS);
  if (list.length >= MAX_SEARCHES_PER_WINDOW) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  return false;
}

function isoToSeconds(iso) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '');
  if (!m) return null;
  return (Number(m[1] || 0) * 3600) + (Number(m[2] || 0) * 60) + Number(m[3] || 0);
}

const ENTITY_MAP = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" };
function decodeEntities(text) {
  return String(text || '').replace(/&(amp|lt|gt|quot|apos|#39);/g, (match) => ENTITY_MAP[match] || match);
}

function truncate(text, max) {
  return String(text || '').slice(0, max);
}

function extractPlaylistId(raw) {
  const str = String(raw || '').trim();
  if (!str) return '';
  // Check if it's a URL
  try {
    if (str.includes('youtube.com') || str.includes('youtu.be')) {
      const url = new URL(str.startsWith('http') ? str : `https://${str}`);
      const list = url.searchParams.get('list');
      if (list) return list;
    }
  } catch { /* not a URL, continue */ }
  // Strip any 'list=' prefix or whitespace
  const match = /[?&]list=([a-zA-Z0-9_-]+)/.exec(str);
  if (match) return match[1];
  return str.replace(/[^a-zA-Z0-9_-]/g, '');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed', message: 'Use GET for music search.' });
  }

  const API_KEY = process.env.YOUTUBE_API_KEY;
  if (!API_KEY) {
    return res.status(503).json({
      error: 'unconfigured',
      message: 'Music search isn’t set up on this deployment yet. Add the YOUTUBE_API_KEY environment variable to enable it.',
    });
  }

  if (isThrottled(getClientIp(req))) {
    return res.status(429).json({ error: 'rate_limited', message: 'Too many searches — wait a moment and try again.' });
  }

  const rawPlaylistId = req.query?.playlistId;
  const playlistId = rawPlaylistId ? extractPlaylistId(rawPlaylistId) : '';
  const searchType = String(req.query?.type || 'video').toLowerCase(); // 'video' | 'playlist' | 'all'
  const q = truncate(String(req.query?.q || '').trim(), 120);
  const pageToken = truncate(String(req.query?.pageToken || '').trim(), 500);

  // 1. Fetch Playlist items by playlistId
  if (playlistId) {
    const cacheKey = `playlist::${playlistId}::${pageToken}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return res.status(200).json(cached.payload);
    }

    try {
      // Fetch playlist details
      const plDetailsUrl = new URL('https://www.googleapis.com/youtube/v3/playlists');
      plDetailsUrl.searchParams.set('part', 'snippet,contentDetails');
      plDetailsUrl.searchParams.set('id', playlistId);
      plDetailsUrl.searchParams.set('key', API_KEY);

      // Fetch playlist items
      const plItemsUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      plItemsUrl.searchParams.set('part', 'snippet,contentDetails');
      plItemsUrl.searchParams.set('playlistId', playlistId);
      plItemsUrl.searchParams.set('maxResults', '25');
      if (pageToken) plItemsUrl.searchParams.set('pageToken', pageToken);
      plItemsUrl.searchParams.set('key', API_KEY);

      const [detailsRes, itemsRes] = await Promise.all([
        fetch(plDetailsUrl),
        fetch(plItemsUrl),
      ]);

      if (!itemsRes.ok) {
        const body = await itemsRes.json().catch(() => ({}));
        const reason = body?.error?.errors?.[0]?.reason || '';
        if (itemsRes.status === 403 && reason === 'quotaExceeded') {
          return res.status(429).json({ error: 'quota_exhausted', message: 'YouTube search quota is used up for today — please try again later.' });
        }
        if (itemsRes.status === 404) {
          return res.status(404).json({ error: 'not_found', message: 'Playlist not found or is private.' });
        }
        return res.status(502).json({ error: 'api_error', message: 'Could not load playlist items.' });
      }

      const itemsData = await itemsRes.json();
      const detailsData = detailsRes.ok ? await detailsRes.json() : null;
      const plSnippet = detailsData?.items?.[0]?.snippet || {};
      const plContent = detailsData?.items?.[0]?.contentDetails || {};

      const rawItems = (itemsData.items || []).filter(
        (it) => it.snippet?.resourceId?.videoId || it.contentDetails?.videoId
      );

      const videoIds = rawItems.map((it) => it.snippet?.resourceId?.videoId || it.contentDetails?.videoId);

      // Fetch durations & embeddability for videoIds
      const details = new Map();
      if (videoIds.length) {
        const vUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
        vUrl.searchParams.set('part', 'contentDetails,status');
        vUrl.searchParams.set('id', videoIds.join(','));
        vUrl.searchParams.set('key', API_KEY);
        const vRes = await fetch(vUrl);
        if (vRes.ok) {
          const vData = await vRes.json();
          for (const v of vData.items || []) {
            details.set(v.id, {
              duration: isoToSeconds(v.contentDetails?.duration),
              embeddable: v.status?.embeddable !== false,
            });
          }
        }
      }

      const results = rawItems
        .map((it) => {
          const vid = it.snippet?.resourceId?.videoId || it.contentDetails?.videoId;
          const d = details.get(vid) || {};
          const title = truncate(decodeEntities(it.snippet?.title || 'Untitled'), 200);
          if (title === 'Deleted video' || title === 'Private video') return null;
          return {
            videoId: vid,
            title,
            channel: truncate(decodeEntities(it.snippet?.videoOwnerChannelTitle || it.snippet?.channelTitle || ''), 120),
            thumbnail: truncate(it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.default?.url || '', 300),
            duration: d.duration ?? null,
            embeddable: d.embeddable !== false,
          };
        })
        .filter(Boolean);

      const payload = {
        playlist: {
          playlistId,
          title: truncate(decodeEntities(plSnippet.title || 'YouTube Playlist'), 200),
          channel: truncate(decodeEntities(plSnippet.channelTitle || ''), 120),
          thumbnail: truncate(plSnippet.thumbnails?.medium?.url || plSnippet.thumbnails?.default?.url || (results[0]?.thumbnail || ''), 300),
          itemCount: plContent.itemCount ?? results.length,
          description: truncate(decodeEntities(plSnippet.description || ''), 500),
        },
        results,
        nextPageToken: truncate(itemsData.nextPageToken || '', 500) || null,
      };

      cache.set(cacheKey, { at: Date.now(), payload });
      if (cache.size > CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value);
      return res.status(200).json(payload);
    } catch (err) {
      console.error('youtube playlist fetch failed:', err?.message);
      return res.status(502).json({ error: 'network', message: 'Could not reach YouTube for playlist items.' });
    }
  }

  // 2. Search query check
  if (q.length < 2) {
    return res.status(400).json({ error: 'bad_request', message: 'Enter at least two characters to search.' });
  }

  // 3. Search public playlists
  if (searchType === 'playlist') {
    const cacheKey = `search-playlist::${q.toLowerCase()}::${pageToken}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return res.status(200).json(cached.payload);
    }

    try {
      const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('type', 'playlist');
      searchUrl.searchParams.set('maxResults', String(MAX_RESULTS));
      searchUrl.searchParams.set('q', q);
      if (pageToken) searchUrl.searchParams.set('pageToken', pageToken);
      searchUrl.searchParams.set('key', API_KEY);

      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) {
        const body = await searchRes.json().catch(() => ({}));
        const reason = body?.error?.errors?.[0]?.reason || '';
        if (searchRes.status === 403 && reason === 'quotaExceeded') {
          return res.status(429).json({ error: 'quota_exhausted', message: 'YouTube search quota is used up for today — please try again later.' });
        }
        return res.status(502).json({ error: 'api_error', message: 'YouTube playlist search is temporarily unavailable.' });
      }

      const searchData = await searchRes.json();
      const items = (searchData.items || []).filter((it) => it.id?.playlistId);

      // Get item counts
      const counts = new Map();
      if (items.length) {
        const plUrl = new URL('https://www.googleapis.com/youtube/v3/playlists');
        plUrl.searchParams.set('part', 'contentDetails');
        plUrl.searchParams.set('id', items.map((it) => it.id.playlistId).join(','));
        plUrl.searchParams.set('key', API_KEY);
        const plRes = await fetch(plUrl);
        if (plRes.ok) {
          const plData = await plRes.json();
          for (const p of plData.items || []) {
            counts.set(p.id, p.contentDetails?.itemCount ?? null);
          }
        }
      }

      const playlists = items.map((it) => ({
        playlistId: it.id.playlistId,
        title: truncate(decodeEntities(it.snippet?.title || 'Untitled Playlist'), 200),
        channel: truncate(decodeEntities(it.snippet?.channelTitle || ''), 120),
        thumbnail: truncate(it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.default?.url || '', 300),
        itemCount: counts.get(it.id.playlistId) ?? null,
        description: truncate(decodeEntities(it.snippet?.description || ''), 300),
      }));

      const payload = {
        playlists,
        nextPageToken: truncate(searchData.nextPageToken || '', 500) || null,
      };

      cache.set(cacheKey, { at: Date.now(), payload });
      if (cache.size > CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value);
      return res.status(200).json(payload);
    } catch (err) {
      console.error('youtube playlist search failed:', err?.message);
      return res.status(502).json({ error: 'network', message: 'Could not reach YouTube for playlist search.' });
    }
  }

  // 4. Default: Search videos (tracks)
  const cacheKey = `video::${q.toLowerCase()}::${pageToken}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return res.status(200).json(cached.payload);
  }

  try {
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('videoEmbeddable', 'true');
    searchUrl.searchParams.set('maxResults', String(MAX_RESULTS));
    searchUrl.searchParams.set('q', q);
    if (pageToken) searchUrl.searchParams.set('pageToken', pageToken);
    searchUrl.searchParams.set('key', API_KEY);

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      const body = await searchRes.json().catch(() => ({}));
      const reason = body?.error?.errors?.[0]?.reason || '';
      if (searchRes.status === 403 && reason === 'quotaExceeded') {
        return res.status(429).json({ error: 'quota_exhausted', message: 'YouTube search quota is used up for today — please try again later.' });
      }
      if (searchRes.status === 400 || searchRes.status === 403) {
        return res.status(502).json({ error: 'api_error', message: 'YouTube rejected the search request.' });
      }
      return res.status(502).json({ error: 'api_error', message: 'YouTube search is temporarily unavailable.' });
    }

    const searchData = await searchRes.json();
    const items = (searchData.items || []).filter((it) => it.id?.videoId);

    // Fetch video durations & embeddability
    const details = new Map();
    if (items.length) {
      const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
      detailsUrl.searchParams.set('part', 'contentDetails,status');
      detailsUrl.searchParams.set('id', items.map((it) => it.id.videoId).join(','));
      detailsUrl.searchParams.set('key', API_KEY);
      const dRes = await fetch(detailsUrl);
      if (dRes.ok) {
        const dData = await dRes.json();
        for (const v of dData.items || []) {
          details.set(v.id, {
            duration: isoToSeconds(v.contentDetails?.duration),
            embeddable: v.status?.embeddable !== false,
          });
        }
      }
    }

    const results = items.map((it) => {
      const d = details.get(it.id.videoId) || {};
      return {
        videoId: it.id.videoId,
        title: truncate(decodeEntities(it.snippet?.title || 'Untitled'), 200),
        channel: truncate(decodeEntities(it.snippet?.channelTitle || ''), 120),
        thumbnail: truncate(it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.default?.url || '', 300),
        duration: d.duration ?? null,
        embeddable: d.embeddable !== false,
      };
    });

    const payload = {
      results,
      nextPageToken: truncate(searchData.nextPageToken || '', 500) || null,
    };
    cache.set(cacheKey, { at: Date.now(), payload });
    if (cache.size > CACHE_MAX_ENTRIES) {
      cache.delete(cache.keys().next().value);
    }
    return res.status(200).json(payload);
  } catch (err) {
    console.error('youtube-search failed:', err?.message);
    return res.status(502).json({ error: 'network', message: 'Could not reach YouTube — check connection and try again.' });
  }
}
