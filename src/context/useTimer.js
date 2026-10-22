import { useContext } from 'react';
import {
  TimerStateContext,
  TimerActionsContext,
  TimerCountdownContext,
} from './TimerContextInstance';

// App state — changes when settings, history or the timer mode change.
export function useTimerState() {
  const context = useContext(TimerStateContext);
  if (!context) {
    throw new Error('useTimerState must be used within a TimerProvider');
  }
  return context;
}

// Action callbacks — the object identity is stable for the lifetime of the
// provider, so a component that only needs actions never re-renders.
export function useTimerActions() {
  const context = useContext(TimerActionsContext);
  if (!context) {
    throw new Error('useTimerActions must be used within a TimerProvider');
  }
  return context;
}

// The live countdown — updates once per second while the timer runs.
export function useTimerCountdown() {
  const context = useContext(TimerCountdownContext);
  if (!context) {
    throw new Error('useTimerCountdown must be used within a TimerProvider');
  }
  return context;
}

// Combined view of all three contexts.
//
// Prefer the narrow hooks above: this one subscribes to the countdown as well,
// so the calling component re-renders on every tick.
export function useTimer() {
  const state = useTimerState();
  const actions = useTimerActions();
  const countdown = useTimerCountdown();

  return {
    ...state,
    ...actions,
    ...countdown,
    timerState: { ...state.timerState, remainingSeconds: countdown.remainingSeconds },
  };
}
