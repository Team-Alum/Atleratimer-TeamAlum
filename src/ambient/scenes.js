// Registry of ambient environments. Each scene has a licensed looping video
// (public/assets/ambient/, see that folder's README for licensing) plus a
// poster shown while the video loads. Canvas/CSS fallback scenes live in
// ./scenes and are used when a video is missing, fails to load, or motion is
// disabled. id 'rainy-night' is kept for storage compatibility; it displays
// as "Rainy City".

export const AMBIENT_SCENES = [
  {
    id: 'rainy-night',
    name: 'Rainy City',
    video: '/assets/ambient/rainy-city.mp4',
    poster: '/assets/ambient/rainy-city.jpg',
  },
  {
    id: 'night-drive',
    name: 'Night Drive',
    video: '/assets/ambient/night-drive.mp4',
    poster: '/assets/ambient/night-drive.jpg',
  },
  {
    id: 'starry-sky',
    name: 'Starry Sky',
    video: '/assets/ambient/starry-sky.mp4',
    poster: '/assets/ambient/starry-sky.jpg',
  },
  {
    id: 'cozy-room',
    name: 'Cozy Room',
    video: '/assets/ambient/cozy-room.mp4',
    poster: '/assets/ambient/cozy-room.jpg',
  },
  {
    id: 'forest-rain',
    name: 'Forest Rain',
    video: '/assets/ambient/forest-rain.mp4',
    poster: '/assets/ambient/forest-rain.jpg',
  },
  {
    id: 'ocean-waves',
    name: 'Ocean Waves',
    video: '/assets/ambient/ocean-waves.mp4',
    poster: '/assets/ambient/ocean-waves.jpg',
  },
  {
    id: 'snowy-pines',
    name: 'Snowy Pines',
    video: '/assets/ambient/snowy-pines.mp4',
    poster: '/assets/ambient/snowy-pines.jpg',
  },
  {
    id: 'rainy-window',
    name: 'Rainy Window',
    video: '/assets/ambient/rainy-window.mp4',
    poster: '/assets/ambient/rainy-window.jpg',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    video: '/assets/ambient/aurora.mp4',
    poster: '/assets/ambient/aurora.jpg',
  },
  {
    id: 'tranquil-forest',
    name: 'Tranquil Forest',
    video: '/assets/ambient/tranquil-forest.mp4',
    poster: '/assets/ambient/tranquil-forest.jpg',
  },
  {
    id: 'forest-river',
    name: 'Forest River',
    video: '/assets/ambient/forest-river.mp4',
    poster: '/assets/ambient/forest-river.jpg',
  },
  {
    id: 'bamboo-grove',
    name: 'Bamboo Grove',
    video: '/assets/ambient/bamboo-grove.mp4',
    poster: '/assets/ambient/bamboo-grove.jpg',
  },
  {
    id: 'rainy-leaves',
    name: 'Rainy Leaves',
    video: '/assets/ambient/rainy-leaves.mp4',
    poster: '/assets/ambient/rainy-leaves.jpg',
  },
  {
    id: 'minimal',
    name: 'Minimal Ambient',
    video: '/assets/ambient/minimal.mp4',
    poster: '/assets/ambient/minimal.jpg',
  },
];
