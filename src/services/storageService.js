// Data persistence and history management with versioning

const STORAGE_KEY = 'atleratimer_v1_data';

// Helper to get today's date key YYYY-MM-DD in local time
export function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Generate default initial data (clean state — no demo history)
function getDefaultInitialData() {
  const focusMins = 25;

  return {
    version: 2,
    theme: 'light', // 'light' or 'dark'
    accentColor: '#078596',
    soundEnabled: true,
    chimeType: 'zen', // 'zen', 'beep'
    ambientSoundEnabled: false,
    ambientType: 'rain',
    ambientVolume: 0.15,
    reducedMotion: false,
    desktopNotifications: false,
    timerSettings: {
      focusDuration: focusMins, // minutes
      shortBreakDuration: 5,
      longBreakDuration: 15,
      sessionsPerCycle: 4,
      autoStartBreaks: false,
      autoStartFocus: false,
      dailyGoalMinutes: 100,
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

      // Handle running timer if tab was closed or reloaded
      if (parsed.timerState && parsed.timerState.isRunning && parsed.timerState.expectedEndAt) {
        const now = Date.now();
        if (now >= parsed.timerState.expectedEndAt) {
          // Timer finished while page was closed
          parsed.timerState.isRunning = false;
          parsed.timerState.remainingSeconds = 0;
        } else {
          parsed.timerState.remainingSeconds = Math.max(0, Math.ceil((parsed.timerState.expectedEndAt - now) / 1000));
        }
      }

      return parsed;
    } catch (e) {
      console.warn('Failed to load storage:', e);
      return getDefaultInitialData();
    }
  },

  saveData(data) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  },

  clearAllData() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
  },
};
