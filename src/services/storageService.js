// Data persistence and history management with versioning

const STORAGE_KEY = 'atleratimer_v1_data';

// Helper to get today's date key YYYY-MM-DD in local time
export function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Generate default realistic initial history matching the reference screenshot
function getDefaultInitialData() {
  const todayStr = getLocalDateString();
  const now = new Date();

  // Helper for generating dates in the last 7 days
  const makePastDate = (daysAgo) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    return getLocalDateString(d);
  };

  // 7-day activity distribution summing to 440 minutes (7h 20m) matching the reference
  // Day order: 6 days ago -> 5 days ago -> ... -> today (matching W, T, F, S, S, M, T)
  const pastDaysActivity = {
    [makePastDate(6)]: 75, // Wed
    [makePastDate(5)]: 70, // Thu
    [makePastDate(4)]: 50, // Fri
    [makePastDate(3)]: 90, // Sat
    [makePastDate(2)]: 30, // Sun
    [makePastDate(1)]: 75, // Mon
    [todayStr]: 50,        // Tue (today - 2 sessions: 25m + 25m = 50m)
  };

  const initialSessions = [
    {
      id: 'session-live-01',
      title: 'Design research',
      type: 'focus',
      startTime: '09:35',
      durationMinutes: 25,
      completed: false,
      date: todayStr,
      timestamp: Date.now() - 6 * 60 * 1000 - 18 * 1000,
    },
    {
      id: 'session-completed-01',
      title: 'Reading & notes',
      type: 'focus',
      startTime: '09:00',
      durationMinutes: 25,
      completed: true,
      date: todayStr,
      timestamp: Date.now() - 40 * 60 * 1000,
    },
    {
      id: 'session-completed-02',
      title: 'Morning writing',
      type: 'focus',
      startTime: '08:30',
      durationMinutes: 25,
      completed: true,
      date: todayStr,
      timestamp: Date.now() - 80 * 60 * 1000,
    },
  ];

  return {
    version: 1,
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
      focusDuration: 25, // minutes
      shortBreakDuration: 5,
      longBreakDuration: 15,
      sessionsPerCycle: 4,
      autoStartBreaks: false,
      autoStartFocus: false,
      dailyGoalMinutes: 100,
    },
    timerState: {
      mode: 'focus', // 'focus', 'short_break', 'long_break'
      sessionTitle: 'Design research',
      cycleIndex: 3, // session 3 of 4
      remainingSeconds: 18 * 60 + 42, // 18:42
      totalSeconds: 25 * 60,
      isRunning: false,
      lastStartedAt: null,
      expectedEndAt: null,
    },
    history: initialSessions,
    dailyActivity: pastDaysActivity,
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
      if (!parsed || parsed.version !== 1) {
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
