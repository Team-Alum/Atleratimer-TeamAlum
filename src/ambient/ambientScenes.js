// Ambient scene registry.
//
// There is no universally-safe set of "realistic" ambient clips that can be
// bundled without an explicit licence, so the app ships a video integration
// point plus a designed tonal fallback. Drop licensed files into
// `public/assets/ambient/` using the names below and they are picked up
// automatically (see the README in that directory).
//
// The hero media for each scene is optional. `AmbientBackground` probes the
// file with a HEAD request before mounting a <video>, so a missing asset stays
// silent and the fallback remains in place.

export const DEFAULT_AMBIENT_SCENE = 'off';

export const AMBIENT_SCENES = [
  {
    id: 'off',
    name: 'None',
    tagline: 'Atmosphere only',
    description: 'No scene media. Uses only the active atmosphere light.',
    fallback: null,
  },
  {
    id: 'rainy-city',
    name: 'Rainy city',
    tagline: 'Neon reflections · night rain',
    description: 'A slow, rain-soaked city window after dark.',
    video: '/assets/ambient/rainy-city.mp4',
    poster: '/assets/ambient/rainy-city.jpg',
    fallback: {
      base: '#050B14',
      a: 'rgba(56, 189, 248, 0.26)',
      b: 'rgba(251, 191, 36, 0.13)',
      c: 'rgba(99, 102, 241, 0.22)',
    },
    veil: { dark: 0.44, light: 0.58 },
    credit: 'Add the clip source and licence to public/assets/ambient/ATTRIBUTION.md',
  },
  {
    id: 'night-drive',
    name: 'Night drive',
    tagline: 'Long road · tail lights',
    description: 'Forward motion on an empty road, deep blue hour.',
    video: '/assets/ambient/night-drive.mp4',
    poster: '/assets/ambient/night-drive.jpg',
    fallback: {
      base: '#070812',
      a: 'rgba(59, 130, 246, 0.24)',
      b: 'rgba(244, 63, 94, 0.16)',
      c: 'rgba(251, 191, 36, 0.11)',
    },
    veil: { dark: 0.46, light: 0.60 },
    credit: 'Add the clip source and licence to public/assets/ambient/ATTRIBUTION.md',
  },
  {
    id: 'starry-sky',
    name: 'Starry sky',
    tagline: 'Deep space · slow stars',
    description: 'A dark, quiet sky with a faint galactic band.',
    video: '/assets/ambient/starry-sky.mp4',
    poster: '/assets/ambient/starry-sky.jpg',
    fallback: {
      base: '#04060F',
      a: 'rgba(129, 140, 248, 0.20)',
      b: 'rgba(56, 189, 248, 0.11)',
      c: 'rgba(226, 232, 240, 0.09)',
    },
    veil: { dark: 0.38, light: 0.52 },
    credit: 'Add the clip source and licence to public/assets/ambient/ATTRIBUTION.md',
  },
  {
    id: 'cozy-study',
    name: 'Cozy study',
    tagline: 'Warm lamp · quiet room',
    description: 'A warm desk lamp in a calm, low-light study.',
    video: '/assets/ambient/cozy-study.mp4',
    poster: '/assets/ambient/cozy-study.jpg',
    fallback: {
      base: '#120D08',
      a: 'rgba(245, 158, 11, 0.24)',
      b: 'rgba(180, 83, 9, 0.15)',
      c: 'rgba(120, 53, 15, 0.18)',
    },
    veil: { dark: 0.40, light: 0.56 },
    credit: 'Add the clip source and licence to public/assets/ambient/ATTRIBUTION.md',
  },
  {
    id: 'forest-rain',
    name: 'Forest rain',
    tagline: 'Wet canopy · diffused green',
    description: 'Rain moving through a dense green canopy.',
    video: '/assets/ambient/forest-rain.mp4',
    poster: '/assets/ambient/forest-rain.jpg',
    fallback: {
      base: '#06110B',
      a: 'rgba(16, 185, 129, 0.20)',
      b: 'rgba(132, 204, 22, 0.10)',
      c: 'rgba(6, 95, 70, 0.24)',
    },
    veil: { dark: 0.42, light: 0.58 },
    credit: 'Add the clip source and licence to public/assets/ambient/ATTRIBUTION.md',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    tagline: 'Open water · deep teal',
    description: 'Slow, distant waves under a wide horizon.',
    video: '/assets/ambient/ocean.mp4',
    poster: '/assets/ambient/ocean.jpg',
    fallback: {
      base: '#03121A',
      a: 'rgba(14, 165, 233, 0.22)',
      b: 'rgba(45, 212, 191, 0.17)',
      c: 'rgba(2, 132, 199, 0.16)',
    },
    veil: { dark: 0.42, light: 0.58 },
    credit: 'Add the clip source and licence to public/assets/ambient/ATTRIBUTION.md',
  },
];

const SCENE_BY_ID = new Map(AMBIENT_SCENES.map((scene) => [scene.id, scene]));

export function getAmbientScene(id) {
  return SCENE_BY_ID.get(id) || SCENE_BY_ID.get(DEFAULT_AMBIENT_SCENE);
}

// Probe a media URL once per session. Vercel serves a 404 for a missing file,
// but an SPA rewrite could answer with HTML, so the content-type is checked
// as well. A failed probe is intentionally silent: the fallback is the design.
const probeCache = new Map();

export function probeAmbientVideo(src) {
  if (!src) return Promise.resolve(false);
  if (probeCache.has(src)) return probeCache.get(src);

  const result = fetch(src, { method: 'HEAD', cache: 'no-store' })
    .then((response) => {
      if (!response.ok) return false;
      const type = response.headers.get('content-type') || '';
      return type.startsWith('video/');
    })
    .catch(() => false);

  probeCache.set(src, result);
  return result;
}
