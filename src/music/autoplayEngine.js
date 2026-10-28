// Intelligent Autoplay Engine & Curated Focus Music Knowledge Base
// Provides verified focus music catalog, deterministic candidate ranking,
// and strict anti-repetition queue continuation for Atlera.

export const FOCUS_CATEGORIES = [
  { id: 'deep-focus', label: 'Deep Focus', description: 'Binaural beats, ambient synthesis, and deep work soundscapes' },
  { id: 'lo-fi', label: 'Lo-fi', description: 'Chilled beats to study, code, and relax to' },
  { id: 'piano', label: 'Piano', description: 'Peaceful acoustic and neo-classical piano melodies' },
  { id: 'ambient', label: 'Ambient', description: 'Atmospheric textures, drones, and tranquil spaces' },
  { id: 'rain', label: 'Rain', description: 'Gentle rainfall, cozy window drops, and distant thunder' },
  { id: 'classical', label: 'Classical', description: 'Mozart, Bach, Vivaldi, and Chopin for cognitive clarity' },
  { id: 'nature', label: 'Nature', description: 'Forest streams, birdsong, and soothing ocean tide' },
  { id: 'instrumental', label: 'Instrumental', description: 'Acoustic guitar, warm cello, and calming instruments' },
  { id: 'sleep', label: 'Sleep', description: 'Delta waves and soft sleep ambient for restorative rest' },
  { id: 'energy', label: 'Energy', description: 'Upbeat chillstep and melodic electronic rhythms for momentum' },
];

// Verified, high-quality, embeddable focus study tracks categorized by mood
export const CURATED_FOCUS_TRACKS = [
  // --- Deep Focus ---
  {
    videoId: '2OEL4P1Rz04',
    title: 'Deep Focus: Music for Work & Concentration',
    channel: 'Quiet Quest - Study Music',
    thumbnail: 'https://i.ytimg.com/vi/2OEL4P1Rz04/hqdefault.jpg',
    duration: 10800,
    category: 'deep-focus',
    embeddable: true,
  },
  {
    videoId: 'rUxyKA_-grg',
    title: 'Study Music Alpha Waves — Brain Concentration',
    channel: 'Yellow Brick Cinema',
    thumbnail: 'https://i.ytimg.com/vi/rUxyKA_-grg/hqdefault.jpg',
    duration: 14400,
    category: 'deep-focus',
    embeddable: true,
  },
  {
    videoId: '4xDzrJKXOOY',
    title: 'Synthwave Radio — Chill Synth / Retro Beats for Focus',
    channel: 'Lofi Girl',
    thumbnail: 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg',
    duration: 7200,
    category: 'deep-focus',
    embeddable: true,
  },
  {
    videoId: 'sjkrrmBnpGE',
    title: '14 Hz Beta Waves for Super Intelligence & Intense Focus',
    channel: 'Mind Power Audio',
    thumbnail: 'https://i.ytimg.com/vi/sjkrrmBnpGE/hqdefault.jpg',
    duration: 7200,
    category: 'deep-focus',
    embeddable: true,
  },

  // --- Lo-fi ---
  {
    videoId: 'jfKfPfyJRdk',
    title: 'lofi hip hop radio 📚 - beats to relax/study to',
    channel: 'Lofi Girl',
    thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
    duration: 0,
    category: 'lo-fi',
    embeddable: true,
  },
  {
    videoId: '5qap5aO4i9A',
    title: 'Lofi Hip Hop Radio — Beats to Study & Relax To',
    channel: 'Lofi Girl',
    thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
    duration: 0,
    category: 'lo-fi',
    embeddable: true,
  },
  {
    videoId: 'DWcJFNfaw9c',
    title: 'Peaceful Piano & Guitar Lo-fi Study Beats',
    channel: 'Chillhop Music',
    thumbnail: 'https://i.ytimg.com/vi/DWcJFNfaw9c/hqdefault.jpg',
    duration: 5400,
    category: 'lo-fi',
    embeddable: true,
  },
  {
    videoId: '7NOSDKb0HlU',
    title: 'Chill Lofi Study Session — Morning Coffee',
    channel: 'Kupla',
    thumbnail: 'https://i.ytimg.com/vi/7NOSDKb0HlU/hqdefault.jpg',
    duration: 3600,
    category: 'lo-fi',
    embeddable: true,
  },

  // --- Piano ---
  {
    videoId: 'Wb_k32Y14U4',
    title: 'Relaxing Piano Study Music — Peaceful Thoughts',
    channel: 'Soul Candle',
    thumbnail: 'https://i.ytimg.com/vi/Wb_k32Y14U4/hqdefault.jpg',
    duration: 7200,
    category: 'piano',
    embeddable: true,
  },
  {
    videoId: 'wAPCSnAhhC8',
    title: 'Beautiful Relaxing Piano Music for Concentration',
    channel: 'Tim Janis',
    thumbnail: 'https://i.ytimg.com/vi/wAPCSnAhhC8/hqdefault.jpg',
    duration: 10800,
    category: 'piano',
    embeddable: true,
  },
  {
    videoId: '1prweT95U8Y',
    title: 'Ludovico Einaudi: Best Piano Solo Collection',
    channel: 'Classical Masterpieces',
    thumbnail: 'https://i.ytimg.com/vi/1prweT95U8Y/hqdefault.jpg',
    duration: 5400,
    category: 'piano',
    embeddable: true,
  },
  {
    videoId: 'q0Pz84W7Wio',
    title: 'Peaceful Piano & Soft Raindrops Ambience',
    channel: 'Relaxing Soul',
    thumbnail: 'https://i.ytimg.com/vi/q0Pz84W7Wio/hqdefault.jpg',
    duration: 7200,
    category: 'piano',
    embeddable: true,
  },

  // --- Ambient ---
  {
    videoId: 'mZ6VezKtoaQ',
    title: 'Space Ambient Music for Deep Focus & Quiet Thought',
    channel: 'SpaceWave - Cosmic Ambient',
    thumbnail: 'https://i.ytimg.com/vi/mZ6VezKtoaQ/hqdefault.jpg',
    duration: 14400,
    category: 'ambient',
    embeddable: true,
  },
  {
    videoId: 'V1RPi2MYUsM',
    title: 'Deep Drone Ambient — Calming Mind & Study Flow',
    channel: 'Cryo Chamber',
    thumbnail: 'https://i.ytimg.com/vi/V1RPi2MYUsM/hqdefault.jpg',
    duration: 7200,
    category: 'ambient',
    embeddable: true,
  },
  {
    videoId: 'lTRiuFIWV54',
    title: 'Warm Ambient Soundscapes for Reading & Work',
    channel: 'Echoes of Calm',
    thumbnail: 'https://i.ytimg.com/vi/lTRiuFIWV54/hqdefault.jpg',
    duration: 5400,
    category: 'ambient',
    embeddable: true,
  },

  // --- Rain ---
  {
    videoId: 'mPZkdNFkNps',
    title: 'Gentle Rain Sounds for Studying & Focus',
    channel: 'Relaxing White Noise',
    thumbnail: 'https://i.ytimg.com/vi/mPZkdNFkNps/hqdefault.jpg',
    duration: 28800,
    category: 'rain',
    embeddable: true,
  },
  {
    videoId: 'q76bMs-NwRk',
    title: 'Rain on Window with Distant Rolling Thunder',
    channel: 'Cozy Rain Sanctuary',
    thumbnail: 'https://i.ytimg.com/vi/q76bMs-NwRk/hqdefault.jpg',
    duration: 10800,
    category: 'rain',
    embeddable: true,
  },
  {
    videoId: 'gVKEM4KhnTE',
    title: 'Cozy Rain in Library Ambience for Focus & Reading',
    channel: 'Calm Library Vibes',
    thumbnail: 'https://i.ytimg.com/vi/gVKEM4KhnTE/hqdefault.jpg',
    duration: 14400,
    category: 'rain',
    embeddable: true,
  },

  // --- Classical ---
  {
    videoId: '4Tr0otuiQuU',
    title: 'Classical Music for Studying & Brain Concentration (Mozart, Bach)',
    channel: 'HALIDONMUSIC',
    thumbnail: 'https://i.ytimg.com/vi/4Tr0otuiQuU/hqdefault.jpg',
    duration: 10800,
    category: 'classical',
    embeddable: true,
  },
  {
    videoId: 'Rb0UmrCXxVA',
    title: 'Mozart: Brain Power & Memory Focus Symphony',
    channel: 'Classical Brain Wave',
    thumbnail: 'https://i.ytimg.com/vi/Rb0UmrCXxVA/hqdefault.jpg',
    duration: 7200,
    category: 'classical',
    embeddable: true,
  },
  {
    videoId: 'jgpJVI3tDbY',
    title: 'Vivaldi: The Four Seasons (L’Inverno / Winter & Spring)',
    channel: 'Baroque Essentials',
    thumbnail: 'https://i.ytimg.com/vi/jgpJVI3tDbY/hqdefault.jpg',
    duration: 4800,
    category: 'classical',
    embeddable: true,
  },
  {
    videoId: 'wygy721nzRc',
    title: 'Bach: Goldberg Variations — Gentle Study Recording',
    channel: 'Baroque Classics',
    thumbnail: 'https://i.ytimg.com/vi/wygy721nzRc/hqdefault.jpg',
    duration: 4500,
    category: 'classical',
    embeddable: true,
  },

  // --- Nature ---
  {
    videoId: 'eKFTSSKCzWA',
    title: 'Forest Stream & Morning Birdsong for Productivity',
    channel: 'Nature Soundscapes',
    thumbnail: 'https://i.ytimg.com/vi/eKFTSSKCzWA/hqdefault.jpg',
    duration: 14400,
    category: 'nature',
    embeddable: true,
  },
  {
    videoId: 'Nep1qytq9JM',
    title: 'Gentle Ocean Waves Crashing on Calm Shoreline',
    channel: 'Peaceful Shores',
    thumbnail: 'https://i.ytimg.com/vi/Nep1qytq9JM/hqdefault.jpg',
    duration: 10800,
    category: 'nature',
    embeddable: true,
  },
  {
    videoId: 'vPhg6sc1Mk4',
    title: 'Mountain River Flow & White Water Focus Ambience',
    channel: 'Wild Water Sounds',
    thumbnail: 'https://i.ytimg.com/vi/vPhg6sc1Mk4/hqdefault.jpg',
    duration: 7200,
    category: 'nature',
    embeddable: true,
  },

  // --- Instrumental ---
  {
    videoId: 'lCOF9LN_Zxs',
    title: 'Relaxing Acoustic Guitar Instrumental for Working',
    channel: 'Acoustic Morning',
    thumbnail: 'https://i.ytimg.com/vi/lCOF9LN_Zxs/hqdefault.jpg',
    duration: 7200,
    category: 'instrumental',
    embeddable: true,
  },
  {
    videoId: 'CmbAonfU1h8',
    title: 'Warm Cello & Acoustic Guitar Harmony',
    channel: 'String Sessions',
    thumbnail: 'https://i.ytimg.com/vi/CmbAonfU1h8/hqdefault.jpg',
    duration: 5400,
    category: 'instrumental',
    embeddable: true,
  },
  {
    videoId: '74u3kZ2_g58',
    title: 'Fingerstyle Acoustic Guitar Study Sessions',
    channel: 'Solo Strings',
    thumbnail: 'https://i.ytimg.com/vi/74u3kZ2_g58/hqdefault.jpg',
    duration: 4200,
    category: 'instrumental',
    embeddable: true,
  },

  // --- Sleep ---
  {
    videoId: '1ZYbU82GVz4',
    title: 'Deep Delta Waves Sleep Sanctuary',
    channel: 'NuMeditationMusic',
    thumbnail: 'https://i.ytimg.com/vi/1ZYbU82GVz4/hqdefault.jpg',
    duration: 28800,
    category: 'sleep',
    embeddable: true,
  },
  {
    videoId: 'y7e-GC6oGhg',
    title: 'Peaceful Night Sky Ambient — Restorative Sleep',
    channel: 'Sleep Sound Lab',
    thumbnail: 'https://i.ytimg.com/vi/y7e-GC6oGhg/hqdefault.jpg',
    duration: 14400,
    category: 'sleep',
    embeddable: true,
  },

  // --- Energy ---
  {
    videoId: 'f02mOEt11OQ',
    title: 'Upbeat Chillstep Focus Mix — Productive Flow',
    channel: 'Flow State Records',
    thumbnail: 'https://i.ytimg.com/vi/f02mOEt11OQ/hqdefault.jpg',
    duration: 7200,
    category: 'energy',
    embeddable: true,
  },
  {
    videoId: 'L5sXoA9H1zM',
    title: 'Melodic Electronic Rhythm for Deep Coding & Design',
    channel: 'Codebeats',
    thumbnail: 'https://i.ytimg.com/vi/L5sXoA9H1zM/hqdefault.jpg',
    duration: 5400,
    category: 'energy',
    embeddable: true,
  },
];

// Curated public playlists for focus study
export const CURATED_PUBLIC_PLAYLISTS = [
  {
    playlistId: 'PLOzDu-MXXLliO9fBNZOQTBDddoA3FzZUo',
    title: '💕 Lofi Hip Hop Study Mix 💕',
    channel: 'Chilled Empire',
    thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
    itemCount: 25,
    category: 'lo-fi',
    description: 'Calm lo-fi beats curated for continuous concentration and reading.',
  },
  {
    playlistId: 'PL4QNnZJr8sRNKjKzArmzTBflNYY3YW4-u',
    title: 'Classical Focus Essentials',
    channel: 'HALIDONMUSIC',
    thumbnail: 'https://i.ytimg.com/vi/4Tr0otuiQuU/hqdefault.jpg',
    itemCount: 20,
    category: 'classical',
    description: 'Mozart, Vivaldi, and Bach compositions selected for deep work.',
  },
  {
    playlistId: 'PL6NdkXsTSxKMUS86bLg7qS9u_Y5x653e1',
    title: 'Deep Focus & Ambient Space Waves',
    channel: 'Ambient Sanctuary',
    thumbnail: 'https://i.ytimg.com/vi/2OEL4P1Rz04/hqdefault.jpg',
    itemCount: 18,
    category: 'deep-focus',
    description: 'Drifting atmospheric drones and binaural tones for uninterrupted focus.',
  },
  {
    playlistId: 'PL8fVUTBmJhHLELqYwHh7kU0l9wKz3pQ',
    title: 'Peaceful Piano Reflections',
    channel: 'Solo Piano Moments',
    thumbnail: 'https://i.ytimg.com/vi/Wb_k32Y14U4/hqdefault.jpg',
    itemCount: 22,
    category: 'piano',
    description: 'Introspective acoustic piano pieces for quiet study hours.',
  },
  {
    playlistId: 'PLrAlbmPo3Nwrw2_B1qJt60sYQfH8w3L9P',
    title: 'Rain, Storm & Cozy Ambience',
    channel: 'Nature Soundscapes',
    thumbnail: 'https://i.ytimg.com/vi/mPZkdNFkNps/hqdefault.jpg',
    itemCount: 15,
    category: 'rain',
    description: 'Immersive downpours and distant thunder to isolate outside noise.',
  },
];

/**
 * Deterministically ranks a track candidate against active playback context.
 * Returns an integer score (-1000 to +200).
 */
export function scoreCandidate(candidate, context, historySet, unavailableMap) {
  if (!candidate?.videoId) return -1000;
  if (unavailableMap?.[candidate.videoId]) return -1000;
  if (historySet?.has(candidate.videoId)) return -60; // Anti-repetition penalty

  let score = 50; // Base score for fresh valid track

  // 1. Matches active category
  if (context?.category && candidate.category === context.category) {
    score += 45;
  }

  // 2. Matches active artist or channel
  if (context?.currentTrack?.channel && candidate.channel) {
    const c1 = context.currentTrack.channel.trim().toLowerCase();
    const c2 = candidate.channel.trim().toLowerCase();
    if (c1 === c2) {
      score += 35;
    } else if (c1.includes(c2) || c2.includes(c1)) {
      score += 20;
    }
  }

  // 3. Keyword relevance in title
  const title = (candidate.title || '').toLowerCase();
  const focusKeywords = ['focus', 'study', 'relax', 'instrumental', 'lofi', 'lo-fi', 'ambient', 'piano', 'chill', 'binaural', 'classical', 'nature', 'rain'];
  const hitCount = focusKeywords.filter((kw) => title.includes(kw)).length;
  score += Math.min(30, hitCount * 10);

  // 4. Strong penalty for vocal/talk/spoof terms
  const noisy = ['reaction', 'review', 'interview', 'podcast', 'talking', 'prank', 'trailer', 'teaser', 'vlog', 'comedy'];
  if (noisy.some((kw) => title.includes(kw))) {
    score -= 100;
  }

  return score;
}

/**
 * Intelligent Autoplay selector.
 * Evaluates candidate pool and returns the best continuation track or null if no relevant music exists.
 */
export function findNextAutoplayTrack(context, historySet = new Set(), unavailableMap = {}) {
  if (!context?.autoplay) return null;

  // 1. If an active playlist has unplayed items, pick next from playlist
  if (context.playlistTracks && context.playlistTracks.length > 0) {
    const currentVid = context.currentTrack?.videoId;
    const playlist = context.playlistTracks;
    const currentIndex = playlist.findIndex((t) => t.videoId === currentVid);
    if (currentIndex >= 0 && currentIndex < playlist.length - 1) {
      // Find next playable item in playlist
      for (let i = currentIndex + 1; i < playlist.length; i++) {
        const item = playlist[i];
        if (item?.videoId && !unavailableMap[item.videoId]) {
          return {
            track: item,
            reason: `Next from ${context.playlistTitle || 'active playlist'}`,
          };
        }
      }
    }
  }

  // 2. Candidates from curated library
  const pool = [...CURATED_FOCUS_TRACKS];

  // If user has search candidate results in context, include them
  if (Array.isArray(context.candidates) && context.candidates.length) {
    pool.push(...context.candidates);
  }

  // Score all candidates
  const scored = pool
    .map((track) => ({
      track,
      score: scoreCandidate(track, context, historySet, unavailableMap),
    }))
    .filter((item) => item.score > 20)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    const best = scored[0].track;
    return {
      track: best,
      reason: `Autoplay based on ${context.category ? context.category.replace('-', ' ') : 'focus flow'}`,
    };
  }

  // No sufficiently relevant music available — return null to stop cleanly
  return null;
}
