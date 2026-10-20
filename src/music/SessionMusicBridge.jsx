// Ties music preferences to the timer without coupling their logic:
// - pushes the saved default volume into the player
// - optionally starts the queue when a focus session starts (preference)
// Pausing music never pauses the timer and vice versa — they share no state.

import { useEffect, useRef } from 'react';
import { useTimer } from '../context/useTimer';
import { useMusic } from './MusicPlayerContext';

export default function SessionMusicBridge() {
  const { timerState, data } = useTimer();
  const { state, actions } = useMusic();
  const musicSettings = data?.musicSettings || {};
  const wasRunningRef = useRef(timerState.isRunning);

  // Keep the player in sync with the saved default volume
  useEffect(() => {
    const target = typeof musicSettings.volume === 'number' ? musicSettings.volume : 0.8;
    if (Math.abs(target - state.volume) > 0.01) {
      actions.setVolume(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicSettings.volume]);

  // Optional: begin the queue when a focus session transitions to running.
  // This is a programmatic call; if the browser's autoplay policy blocks it,
  // the player simply stays paused and the bar's Play button works as usual.
  useEffect(() => {
    const started = timerState.isRunning && !wasRunningRef.current;
    wasRunningRef.current = timerState.isRunning;
    if (!started || !musicSettings.musicOnSessionStart) return;
    if (timerState.mode !== 'focus' || !state.queue.length) return;
    if (state.status === 'idle' || state.status === 'ended') {
      if (state.track) actions.toggle();
      else actions.playAll(state.queue, 0);
    } else if (state.status === 'paused') {
      actions.toggle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerState.isRunning, musicSettings.musicOnSessionStart]);

  return null;
}
