import { createContext, useContext } from 'react';

export const PlaylistContext = createContext(null);

export function usePlaylists() {
  const context = useContext(PlaylistContext);
  if (!context) {
    throw new Error('usePlaylists must be used within a PlaylistProvider');
  }
  return context;
}
