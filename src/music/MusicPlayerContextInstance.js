import { createContext, useContext } from 'react';

// The music player state is split into three contexts so that the fast-moving
// values do not re-render the whole app:
//
// - MusicPlaybackContext  track, status, queue, volume, ... (changes when
//                         something actually happens)
// - MusicProgressContext  currentTime / duration (changes ~once per second)
// - MusicActionsContext   action callbacks (never changes identity)
//
// Before the split every consumer re-rendered roughly eleven times a second
// while a track was playing, because the progress poll shared one context
// with everything else.
export const MusicPlaybackContext = createContext(null);
export const MusicProgressContext = createContext(null);
export const MusicActionsContext = createContext(null);

// Playback state — changes when the track, status, queue or volume change.
export function useMusicPlayback() {
  const context = useContext(MusicPlaybackContext);
  if (!context) {
    throw new Error('useMusicPlayback must be used within a MusicProvider');
  }
  return context;
}

// The progress of the current track — updates about once per second.
export function useMusicProgress() {
  const context = useContext(MusicProgressContext);
  if (!context) {
    throw new Error('useMusicProgress must be used within a MusicProvider');
  }
  return context;
}

// Action callbacks plus the "last playlist" helpers. Stable identity.
export function useMusicActions() {
  const context = useContext(MusicActionsContext);
  if (!context) {
    throw new Error('useMusicActions must be used within a MusicProvider');
  }
  return context;
}

// Combined view of all three. Prefer the narrow hooks above — this one
// re-renders on every progress tick.
export function useMusic() {
  const playback = useMusicPlayback();
  const progress = useMusicProgress();
  const { actions, lastPlaylist } = useMusicActions();

  return {
    state: { ...playback, ...progress },
    isBusy: playback.isBusy,
    hasNext: playback.hasNext,
    hasPrev: playback.hasPrev,
    actions,
    lastPlaylist,
  };
}
