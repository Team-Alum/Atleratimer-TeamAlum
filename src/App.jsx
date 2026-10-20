import React from 'react';
import { TimerProvider } from './context/TimerContext';
import AppShell from './components/layout/AppShell';
import './App.css';

export default function App() {
  return (
    <TimerProvider>
      <AppShell />
    </TimerProvider>
  );
}
