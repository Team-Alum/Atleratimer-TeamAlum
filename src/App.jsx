import React from 'react';
import { TimerProvider } from './context/TimerContext';
import { AuthProvider } from './context/AuthContext';
import { MusicProvider } from './music/MusicPlayerContext';
import { PlaylistProvider } from './music/PlaylistContext';
import SessionMusicBridge from './music/SessionMusicBridge';
import AppShell from './components/layout/AppShell';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <TimerProvider>
        <MusicProvider>
          <PlaylistProvider>
            <SessionMusicBridge />
            <AppShell />
          </PlaylistProvider>
        </MusicProvider>
      </TimerProvider>
    </AuthProvider>
  );
}
