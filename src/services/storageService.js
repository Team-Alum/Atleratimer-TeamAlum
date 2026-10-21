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
    colorScheme: 'teal', // 'teal', 'violet', 'rose', 'amber', 'cyan', 'emerald', 'ocean', 'slate'
    accentColor: '#078596',
    dialColor: '#078596', // custom dial/ring color
    comfortMode: 'balanced', // 'focused', 'balanced', 'relaxed', 'minimal'
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
    musicSettings: {
      volume: 0.8,
      rememberLastPlaylist: true,
      musicOnSessionStart: false,
    },
    ambientSettings: {
      scene: 'starry-sky', // 'rainy-night' (Rainy City) | 'night-drive' | 'starry-sky' | 'cozy-room' | 'forest-rain' | 'ocean-waves' | 'snowy-pines' | 'rainy-window' | 'aurora' | 'tranquil-forest' | 'forest-river' | 'bamboo-grove' | 'rainy-leaves' | 'minimal'
      enabled: true,
      motion: true,  // "disable animation" toggle in the ambient popover
      dim: 0.25,     // dark readability overlay in front of the background
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
      const merged = mergeMissingDefaults(parsed, getDefaultInitialData());

      // Handle running timer if tab was closed or reloaded
      if (merged.timerState && merged.timerState.isRunning && merged.timerState.expectedEndAt) {
        const now = Date.now();
        if (now >= merged.timerState.expectedEndAt) {
          // Timer finished while page was closed
          merged.timerState.isRunning = false;
          merged.timerState.remainingSeconds = 0;
        } else {
          merged.timerState.remainingSeconds = Math.max(0, Math.ceil((merged.timerState.expectedEndAt - now) / 1000));
        }
      }

      return merged;
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
