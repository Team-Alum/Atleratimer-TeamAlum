// Language-aware "vibe" helpers for same-vibe autoplay.
// YouTube search results carry no language metadata, so these heuristics are
// deliberately conservative: they only need to stop obvious cross-language
// jumps (for example, a Hindi queue suddenly turning into English pop).

const DEVANAGARI = /[\u0900-\u097F]/;

// Strong Hindi signals: words in the query, major Indian labels and a small
// set of very common transliterated Hindi words (so "Tum Hi Ho" is recognised
// even when the channel name is unfamiliar).
// Short transliterations are word-bounded: "meri" must not match "American",
// "desi" must not match "Design", and "dil" must not match "Dilemma".
const HINDI_HINT = /(hindi|bollywood|indian songs|indian music|arijit|t-series|tseries|zee music|sony music india|tips official|tips music|yrf|yash raj|saregama|shemaroo|speed records|rajshri|dharma|tum hi ho|kesariya|raataan|channa mereya|apna bana|tujhe|mujhe|pyaar|pyar|ishq|sanam|sajna|sajni|rabba|zindagi|mohabbat|dhadkan|deewana|aashiq|\b(?:desi|dil|dilwale|dilbar|diljit|tera|teri|meri|mere|jaan|nahin|nahi)\b)/i;

const ENGLISH_HINT = /(english|english songs|hollywood|american pop|british pop)/i;

// Vocal-free / background-friendly families. If the query or track looks like
// one of these and has no explicit language marker, the language lock is
// irrelevant (and the autoplay keeps the same instrumental vibe).
const AMBIENT_HINT = /(instrumental|lofi|lo-fi|piano|classical|ambient|rain|nature|white noise|study|focus|jazz|guitar|sitar|flute|meditation|sleep|chillhop|orchestra|symphony|soundtrack|bgm|beats to)/i;

export const LANGUAGE_META = {
  hindi: { label: 'Hindi only', short: 'Hindi' },
  english: { label: 'English only', short: 'English' },
  instrumental: { label: 'Instrumental', short: 'Instrumental' },
  unknown: { label: 'Same vibe', short: 'Vibe' },
};

export const VIBE_VARIANTS = ['', ' mix', ' playlist'];

function textOf(track) {
  return `${track?.title || ''} ${track?.channel || ''}`;
}

function isHindiText(text) {
  return DEVANAGARI.test(text) || HINDI_HINT.test(text);
}

function isClearlyEnglish(track) {
  const text = textOf(track);
  if (isHindiText(text)) return false;
  if (ENGLISH_HINT.test(text)) return true;
  // Latin script with no Hindi and no instrumental cue: treat as English.
  return !AMBIENT_HINT.test(text);
}

/**
 * Language implied by a search phrase or playlist name.
 */
export function detectQueryLanguage(query = '') {
  const q = String(query || '');
  if (!q.trim()) return 'unknown';
  if (DEVANAGARI.test(q) || HINDI_HINT.test(q)) return 'hindi';
  if (ENGLISH_HINT.test(q)) return 'english';
  if (AMBIENT_HINT.test(q)) return 'instrumental';
  return 'unknown';
}

/**
 * Best-effort language of a single search result.
 */
export function detectTrackLanguage(track) {
  const text = textOf(track);
  if (DEVANAGARI.test(text) || HINDI_HINT.test(text)) return 'hindi';
  if (AMBIENT_HINT.test(text)) return 'instrumental';
  return 'english';
}

/**
 * Resolve the language lock for a vibe. The query is the strongest signal;
 * the seed track fills in when the phrase is just an artist or song name.
 */
export function resolveVibeLanguage(query, seedTrack = null) {
  const fromQuery = detectQueryLanguage(query);
  if (fromQuery !== 'unknown') return fromQuery;
  if (seedTrack) return detectTrackLanguage(seedTrack);
  return 'english';
}

/**
 * Build the persisted vibe metadata for a search result or playlist.
 */
export function makeVibe(query, seedTrack = null) {
  const q = String(query || '').trim() || String(seedTrack?.title || '').trim();
  if (!q) return null;
  return {
    query: q,
    label: q,
    language: resolveVibeLanguage(q, seedTrack),
    pageToken: null,
    variant: 0,
    pages: 0,
    exhausted: false,
  };
}

/**
 * Podcast and talk-show detection to keep autoplay strictly focused on music.
 */
export const NON_MUSIC_REGEX = /\b(podcast|podcasts|episode|episodes?|ep\s*\d+|ep\.\s*\d+|interview|interviews|talk\s*show|talkshow|full\s*episode|roundtable|discussion|q&a|reaction|reacts|vlog|vlogging|vloggers?|standup|stand-up|roast|news\s*live|press conference|documentary|audiobook|webinar|tedx|ted\s*talk|monologue|commentary|the\s+\w+\s+show|show\s*#\d+|trs|clips?)\b|#\s*\d{2,4}\b/i;

export function isPodcastOrNonMusic(track) {
  if (!track) return false;
  const text = `${track.title || ''} ${track.channel || ''}`;
  if (NON_MUSIC_REGEX.test(text)) return true;
  if (/podcast|talks|conversations|interviews|beerbiceps|powerfuljre|huberman|fridman/i.test(track.channel || '')) return true;
  // If track is over 35 minutes and has no music cues, it is almost certainly a talk show/podcast
  if (track.duration && track.duration > 2100) {
    const isMusicMix = /(music|song|songs|lofi|lo-fi|soundtrack|relaxing|study|beats|instrumental|ambient|chillhop|mix|jukebox|playlist|classical)/i.test(text);
    if (!isMusicMix) return true;
  }
  return false;
}

/**
 * The actual YouTube query used when topping up a vibe. A language suffix is
 * added when the original phrase does not already name the language, which
 * keeps result pages on the same side of the language lock.
 * Excludes podcasts and interviews explicitly.
 */
export function buildVibeQuery(vibe) {
  const base = String(vibe?.query || '').trim();
  if (!base) return '';
  const variant = Math.min(Math.max(Number(vibe?.variant) || 0, 0), VIBE_VARIANTS.length - 1);
  let query = base;
  if (vibe.language === 'hindi' && !/hindi|bollywood|desi|indian/i.test(query)) {
    query = `${query} hindi songs`;
  } else if (vibe.language === 'english' && !/english/i.test(query)) {
    query = `${query} english songs`;
  } else if (vibe.language === 'instrumental' && !/instrumental|lofi|study|music/i.test(query)) {
    query = `${query} study focus music`;
  }
  return `${query}${VIBE_VARIANTS[variant]} music -podcast -interview`.trim();
}

/**
 * Strict-ish language and music gate for autoplay results.
 * - Drops any podcast or talk show regardless of language.
 * - Hindi vibe: drop clearly English tracks, keep Hindi/transliterated Hindi.
 * - English vibe: drop any Hindi/Devanagari track.
 * - Instrumental/unknown: drop podcasts, no language gate.
 */
export function trackMatchesLanguage(track, language) {
  if (isPodcastOrNonMusic(track)) return false;
  if (!language || language === 'instrumental' || language === 'unknown') return true;
  if (language === 'hindi') return !isClearlyEnglish(track);
  if (language === 'english') return !isHindiText(textOf(track));
  return true;
}

/**
 * Pick the language for a saved playlist from its name first, then its tracks.
 */
export function vibeFromPlaylist(playlist) {
  const tracks = Array.isArray(playlist?.tracks) ? playlist.tracks : [];
  if (!playlist?.name && !tracks.length) return null;
  const fromName = detectQueryLanguage(playlist?.name || '');
  let language = fromName;
  if (language === 'unknown' && tracks.length) {
    const counts = { hindi: 0, english: 0, instrumental: 0 };
    for (const track of tracks) {
      const lang = detectTrackLanguage(track);
      if (lang in counts) counts[lang] += 1;
    }
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    language = ranked[0][1] > 0 ? ranked[0][0] : 'english';
  }
  if (language === 'unknown') language = 'english';
  const vibe = makeVibe(playlist?.name || tracks[0]?.title || '', tracks[0] || null);
  if (!vibe) return null;
  return { ...vibe, language };
}

/**
 * Advance the page/variant cursor after a fetch. Pure so callers can update
 * their local cursor before React has committed the state update.
 */
export function nextVibeState(vibe, result) {
  if (!vibe) return vibe;
  const nextToken = result?.nextPageToken || null;
  const variant = Math.min(Math.max(Number(vibe.variant) || 0, 0), VIBE_VARIANTS.length - 1);

  if (nextToken) {
    return { ...vibe, pageToken: nextToken, variant, exhausted: false };
  }

  // This query/page has no further results. Move to the next phrasing.
  const nextVariant = Math.min(variant + 1, VIBE_VARIANTS.length - 1);
  return {
    ...vibe,
    pageToken: null,
    variant: nextVariant,
    exhausted: variant === VIBE_VARIANTS.length - 1,
  };
}
