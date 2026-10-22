// Registry of ambient environments.
//
// Each scene is a single static poster image (public/assets/ambient/, see that
// folder's README for licensing). The previous implementation also shipped a
// looping video per scene plus a canvas/CSS animation fallback; all of that
// was removed in favour of these static images because the live background
// streamed tens of megabytes behind the timer for no functional gain.
//
// id 'rainy-night' is kept for storage compatibility; it displays as
// "Rainy City".

export const AMBIENT_SCENES = [
  { id: 'rainy-night', name: 'Rainy City', poster: '/assets/ambient/rainy-city.jpg' },
  { id: 'night-drive', name: 'Night Drive', poster: '/assets/ambient/night-drive.jpg' },
  { id: 'starry-sky', name: 'Starry Sky', poster: '/assets/ambient/starry-sky.jpg' },
  { id: 'cozy-room', name: 'Cozy Room', poster: '/assets/ambient/cozy-room.jpg' },
  { id: 'forest-rain', name: 'Forest Rain', poster: '/assets/ambient/forest-rain.jpg' },
  { id: 'ocean-waves', name: 'Ocean Waves', poster: '/assets/ambient/ocean-waves.jpg' },
  { id: 'snowy-pines', name: 'Snowy Pines', poster: '/assets/ambient/snowy-pines.jpg' },
  { id: 'rainy-window', name: 'Rainy Window', poster: '/assets/ambient/rainy-window.jpg' },
  { id: 'aurora', name: 'Aurora', poster: '/assets/ambient/aurora.jpg' },
  { id: 'tranquil-forest', name: 'Tranquil Forest', poster: '/assets/ambient/tranquil-forest.jpg' },
  { id: 'forest-river', name: 'Forest River', poster: '/assets/ambient/forest-river.jpg' },
  { id: 'bamboo-grove', name: 'Bamboo Grove', poster: '/assets/ambient/bamboo-grove.jpg' },
  { id: 'rainy-leaves', name: 'Rainy Leaves', poster: '/assets/ambient/rainy-leaves.jpg' },
  { id: 'minimal', name: 'Minimal Ambient', poster: '/assets/ambient/minimal.jpg' },
];
