// Data persistence and history management with versioning
import { APPEARANCE_CACHE_KEY } from '../theme/atmospheres';

const STORAGE_KEY = 'atleratimer_v1_data';

// Trailing debounce for persistence. Settings changes usually arrive in
// bursts (dragging a slider fires a change per pixel), so writes are
// coalesced into one.
const SAVE_DEBOUNCE_MS = 300;

// Helper to get today's date key YYYY-MM-DD in local time
export function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Move a local date key (YYYY-MM-DD) by a number of days and report the new
// key plus its weekday index (0 = Sunday).
//
// The arithmetic is done in UTC on purpose: it keeps every step exactly one
// calendar day long, so daylight-saving transitions can never shift a day
// into the wrong bucket.
export function getOffsetDateString(dateStr, offsetDays) {
  const [year, month, day] = String(dateStr).split('-').map(Number);
  const stamp = Date.UTC(year, month - 1, day) + offsetDays * 86400000;
  const shifted = new Date(stamp);
  return {
    dateStr: `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`,
    dayOfWeek: shifted.getUTCDay(),
  };
}

// Generate default initial data (clean state — no demo history)
function getDefaultInitialData() {
  const focusMins = 25;

  return {
    version: 2,
    theme: 'light', // 'light' or 'dark'
    atmosphere: 'aurora', // see src/theme/atmospheres.js
    ambientScene: 'off', // 'off' | see src/ambient/ambientScenes.js
    ambientMotion: true,
    dialStyle: {
      // New users follow the atmosphere. An explicit scheme remains untouched
      // for people who already chose one.
      scheme: 'atmosphere', // see src/components/timer/dialStyle.js
      mood: 'natural',
      comfort: 'balanced',
      effect: 'glow',
    },
    soundEnabled: true,
    chimeType: 'zen', // 'zen', 'beep'
    ambientSoundEnabled: false,
    ambientType: 'rain',
    ambientVolume: 0.15,
    reducedMotion: false,
    desktopNotifications: false,
    digitAnimation: {
      mode: 'normal', // 'normal' | 'droplet' | 'slide' | 'bounce' | 'fade'
      speed: 'balanced', // 'subtle' | 'balanced' | 'expressive'
    },
    timerSettings: {
      focusDuration: focusMins, // minutes
      shortBreakDuration: 5,
      longBreakDuration: 15,
      sessionsPerCycle: 4,
      autoStartBreaks: false,
      autoStartFocus: false,
      dailyGoalMinutes: 100,
    },
    musicSettings: {
      volume: 0.8,
      rememberLastPlaylist: true,
      musicOnSessionStart: false,
        immersiveBackground: false,
    },
    timerState: {
      mode: 'focus', // 'focus', 'short_break', 'long_break'
      sessionTitle: 'Focus session',
      cycleIndex: 1, // session 1 of N
      remainingSeconds: focusMins * 60,
      totalSeconds: focusMins * 60,
      isRunning: false,
      lastStartedAt: null,
      expectedEndAt: null,
    },
    history: [],
    dailyActivity: {},
  };
}

// Fill in keys added after a version bump without discarding user data
function mergeMissingDefaults(parsed, defaults) {
  const merged = { ...defaults, ...parsed };
  for (const key of Object.keys(defaults)) {
    const def = defaults[key];
    if (def && typeof def === 'object' && !Array.isArray(def)) {
      merged[key] = { ...def, ...(parsed[key] && typeof parsed[key] === 'object' ? parsed[key] : {}) };
    }
  }
  return merged;
}

// Keys that no longer exist in the app. `ambientSettings` belonged to the old
// decorative background implementation; ambient scenes now live in
// `ambientScene`/`ambientMotion`. The remaining entries were never wired to
// anything and are dropped on load instead of lingering in every payload.
const LEGACY_KEYS = ['ambientSettings', 'colorScheme', 'comfortMode', 'accentColor', 'dialColor'];

function stripLegacyKeys(data) {
  for (const key of LEGACY_KEYS) delete data[key];
  return data;
}

// Build the payload actually written to localStorage.
//
// A running timer's `remainingSeconds` is deliberately dropped: the
// authoritative value is `expectedEndAt`, and `loadData()` recomputes the
// remaining time from it. That keeps the persisted payload byte-identical
// while the clock is running, so the write can be skipped entirely instead of
// serialising the whole blob on every tick.
function toPersistable(data) {
  const timerState = data?.timerState || {};
  return {
    ...data,
    timerState: {
      ...timerState,
      remainingSeconds: timerState.isRunning ? 0 : (timerState.remainingSeconds || 0),
    },
  };
}

// --- Write bookkeeping -----------------------------------------------------
// `lastWritten` holds the last payload handed to localStorage so repeated
// writes of identical data are skipped. `pendingTimer`/`pendingPayload` back
// the debounced write.
let lastWritten = null;
let pendingTimer = null;
let pendingPayload = null;

function commit(payload) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (!payload || payload === lastWritten) return;
  try {
    localStorage.setItem(STORAGE_KEY, payload);
    lastWritten = payload;
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

export const storageService = {
  loadData() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return getDefaultInitialData();
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const defaults = getDefaultInitialData();
        this.saveData(defaults);
        return defaults;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 2) {
        // Includes v1 data (which contained seeded demo history) — reset to clean state
        const defaults = getDefaultInitialData();
        this.saveData(defaults);
        return defaults;
      }

      // Older v2 data may predate music/ambient settings — fill the gaps in
      const merged = stripLegacyKeys(mergeMissingDefaults(parsed, getDefaultInitialData()));

      // Handle running timer if tab was closed or reloaded
      if (merged.timerState) {
        const { isRunning, expectedEndAt } = merged.timerState;
        if (isRunning && expectedEndAt) {
          const now = Date.now();
          if (now >= expectedEndAt) {
            // Timer finished while page was closed
            merged.timerState.isRunning = false;
            merged.timerState.remainingSeconds = 0;
          } else {
            merged.timerState.remainingSeconds = Math.max(0, Math.ceil((expectedEndAt - now) / 1000));
          }
        } else if (isRunning) {
          // Running without a deadline cannot be resumed — treat it as paused.
          merged.timerState.isRunning = false;
        }
      }

      return merged;
    } catch (e) {
      console.warn('Failed to load storage:', e);
      return getDefaultInitialData();
    }
  },

  // Write immediately.
  saveData(data) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      pendingPayload = JSON.stringify(toPersistable(data));
      commit(pendingPayload);
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  },

  // Write after a short idle window. Used for high-frequency updates.
  scheduleSave(data) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      pendingPayload = JSON.stringify(toPersistable(data));
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => {
        pendingTimer = null;
        commit(pendingPayload);
      }, SAVE_DEBOUNCE_MS);
    } catch (e) {
      console.warn('Failed to schedule storage save:', e);
    }
  },

  // Write any pending payload right now (used on page hide / unload).
  flushSave() {
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
    commit(pendingPayload);
  },

  clearAllData() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(APPEARANCE_CACHE_KEY);
      }
      lastWritten = null;
      pendingPayload = null;
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
  },
};
