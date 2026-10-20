import React from 'react';
import { TimerProvider } from './context/TimerContext';
import { AuthProvider } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <TimerProvider>
        <AppShell />
      </TimerProvider>
    </AuthProvider>
  );
}
