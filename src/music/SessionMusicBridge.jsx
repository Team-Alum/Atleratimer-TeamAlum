// Ties music preferences to the timer without coupling their logic:
// - pushes the saved default volume into the player
// - optionally starts the queue when a focus session starts (preference)
// Pausing music never pauses the timer and vice versa — they share no state.

import { useEffect, useRef } from 'react';
import { useTimerState } from '../context/useTimer';
import { useMusicPlayback, useMusicActions } from './MusicPlayerContextInstance';

export default function SessionMusicBridge() {
  const { timerState, data } = useTimerState();
  const playback = useMusicPlayback();
  const { actions } = useMusicActions();
  const musicSettings = data?.musicSettings || {};
  const wasRunningRef = useRef(timerState.isRunning);

  // Keep the player in sync with the saved default volume
  useEffect(() => {
    const target = typeof musicSettings.volume === 'number' ? musicSettings.volume : 0.8;
    if (Math.abs(target - playback.volume) > 0.01) {
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
    if (timerState.mode !== 'focus' || !playback.queue.length) return;
    if (playback.status === 'idle' || playback.status === 'ended') {
      if (playback.track) actions.toggle();
      else actions.playAll(playback.queue, 0);
    } else if (playback.status === 'paused') {
      actions.toggle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerState.isRunning, musicSettings.musicOnSessionStart]);

  return null;
}
