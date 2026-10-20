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
    id: 'minimal',
    name: 'Minimal Ambient',
    video: '/assets/ambient/minimal.mp4',
    poster: '/assets/ambient/minimal.jpg',
  },
];
