// Vercel Serverless Function — YouTube Data API v3 search proxy.
// Keeps YOUTUBE_API_KEY server-side; the browser never sees it.
// Returns only the minimal sanitized fields the app needs.

const API_KEY = process.env.YOUTUBE_API_KEY;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;
const MAX_RESULTS = 15;
const SEARCH_WINDOW_MS = 60 * 1000;
const MAX_SEARCHES_PER_WINDOW = 12;

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
  return String(text).replace(/&(amp|lt|gt|quot|apos|#39);/g, (match) => ENTITY_MAP[match] || match);
}

function truncate(text, max) {
  return String(text || '').slice(0, max);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed', message: 'Use GET for music search.' });
  }

  if (!API_KEY) {
    return res.status(503).json({
      error: 'unconfigured',
      message: 'Music search isn’t set up on this deployment yet. Add the YOUTUBE_API_KEY environment variable to enable it.',
    });
  }

  if (isThrottled(getClientIp(req))) {
    return res.status(429).json({ error: 'rate_limited', message: 'Too many searches — wait a moment and try again.' });
  }

  const q = truncate(String(req.query?.q || '').trim(), 120);
  if (q.length < 2) {
    return res.status(400).json({ error: 'bad_request', message: 'Enter at least two characters to search.' });
  }
  // Optional pagination token for same-vibe autoplay. Kept opaque.
  const pageToken = truncate(String(req.query?.pageToken || '').trim(), 500);

  const cacheKey = `${q.toLowerCase()}::${pageToken}`;
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
        return res.status(502).json({ error: 'api_error', message: 'YouTube rejected the search request — check the API key and make sure the YouTube Data API v3 is enabled for this project.' });
      }
      return res.status(502).json({ error: 'api_error', message: 'YouTube search is temporarily unavailable.' });
    }

    const searchData = await searchRes.json();
    const items = (searchData.items || []).filter((it) => it.id?.videoId);

    // Cheap second call (1 quota unit): durations + embeddability
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
    return res.status(502).json({ error: 'network', message: 'Could not reach YouTube — check the connection and try again.' });
  }
}
