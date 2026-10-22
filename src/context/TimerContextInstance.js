import { createContext } from 'react';

// The timer is split across three contexts so that a change in one does not
// re-render the consumers of the others:
//
// - TimerStateContext      app state (settings, history, timer mode, ...).
//                          Changes only when something meaningful changes.
// - TimerActionsContext    action callbacks. Never changes identity.
// - TimerCountdownContext  the live countdown. Changes once per second.
//
// Before the split, the countdown lived inside the state blob, so every
// second the whole dashboard tree re-rendered and the persisted payload was
// re-serialised. Now only the three components that actually display the
// remaining time subscribe to the ticking value.
export const TimerStateContext = createContext(null);
export const TimerActionsContext = createContext(null);
export const TimerCountdownContext = createContext(null);
