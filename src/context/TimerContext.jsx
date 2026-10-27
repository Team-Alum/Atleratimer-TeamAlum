import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import {
  TimerStateContext,
  TimerActionsContext,
  TimerCountdownContext,
} from './TimerContextInstance';
import { storageService, getLocalDateString, getOffsetDateString } from '../services/storageService';
import { soundService } from '../services/audioService';
import { notificationService } from '../services/notificationService';
import { syncService } from '../services/syncService';
import { useAuth } from './useAuth';
import { applyAtmosphere, getAtmosphereRing } from '../theme/atmospheres';
import {
  getDurationLimit,
  getDurationSettingKey,
} from '../constants/durations';
import confetti from 'canvas-confetti';

// Merge cloud sessions into the local data blob. Pure: it returns the next
// data object plus the number of sessions that were actually new. Sessions
// that already exist locally are ignored, so pulling twice is harmless.
function mergeRemoteSessions(prev, remote) {
  const localIds = new Set((prev.history || []).map((h) => h.id));
  const newOnes = remote.filter((r) => !localIds.has(r.id));
  if (newOnes.length === 0) return { data: prev, addedCount: 0 };

  const merged = [...prev.history, ...newOnes].sort((a, b) => b.timestamp - a.timestamp);

  // Credit cloud focus minutes to the 7-day chart without touching local figures
  const updatedActivity = { ...prev.dailyActivity };
  for (const s of newOnes) {
    if (s.type === 'focus' && s.completed) {
      updatedActivity[s.date] = (updatedActivity[s.date] || 0) + s.durationMinutes;
    }
  }

  return {
    data: { ...prev, history: merged, dailyActivity: updatedActivity },
    addedCount: newOnes.length,
  };
}

export function TimerProvider({ children }) {
  const [data, setData] = useState(() => storageService.loadData());
  const { user } = useAuth() || {};
  const userId = user?.id ?? null;

  // The live countdown lives OUTSIDE `data`.
  //
  // `data` is the persisted blob; it only changes when something meaningful
  // changes (settings, history, timer mode, session title). The remaining
  // time is a separate piece of state that advances once per second, so only
  // the three components that display it re-render while the timer runs.
  // Before this split the countdown was part of `data`, which meant the whole
  // dashboard re-rendered every second and localStorage was rewritten every
  // second.
  const [countdown, setCountdown] = useState(() => data.timerState.remainingSeconds || 0);

  const [activeView, setActiveView] = useState('focus'); // 'focus', 'customizable_time', 'customizations', 'settings'
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Latest published countdown. Written imperatively at the same time the
  // state is updated, so the ticker can compare against it without reading a
  // ref during render.
  const countdownRef = useRef(countdown);
  const publishCountdown = useCallback((seconds) => {
    countdownRef.current = seconds;
    setCountdown(seconds);
  }, []);

  const endTimestampRef = useRef(data.timerState.expectedEndAt || null);
  const timerIntervalRef = useRef(null);

  // Destructure state
  const { theme, atmosphere, timerSettings, timerState } = data;
  const { mode, cycleIndex, sessionTitle, isRunning } = timerState;
  const timerTotalSeconds = timerState.totalSeconds;
  const { focusDuration, shortBreakDuration, longBreakDuration, sessionsPerCycle } = timerSettings;
  const { soundEnabled, chimeType, desktopNotifications, reducedMotion } = data;
  const { ambientSoundEnabled, ambientType, ambientVolume } = data;

  // The current local date. It is refreshed when the day rolls over, so the
  // daily stats never stay frozen on the day the app was opened. Reading the
  // clock during render would be impure, hence the state + timer.
  const [todayStr, setTodayStr] = useState(() => getLocalDateString());

  useEffect(() => {
    const tick = () => {
      const next = getLocalDateString();
      setTodayStr((prev) => (prev === next ? prev : next));
    };
    const id = setInterval(tick, 60_000);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', tick);
    };
  }, []);

  // --- Persistence ---------------------------------------------------------
  // Writes are debounced and skipped when the serialised payload is
  // unchanged, so a running timer no longer rewrites localStorage every tick.
  useEffect(() => {
    storageService.scheduleSave(data);
  }, [data]);

  // Flush a pending write when the tab is hidden or closed.
  useEffect(() => {
    const flush = () => storageService.flushSave();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, []);

  // Pull cloud history and merge it into local state (idempotent by session id)
  const pullFromCloud = useCallback(async () => {
    if (!userId) return 0;
    const remote = await syncService.pullSessions();
    if (!remote.length) return 0;

    let addedCount = 0;
    setData((prev) => {
      const result = mergeRemoteSessions(prev, remote);
      addedCount = result.addedCount;
      return result.data;
    });
    return addedCount;
  }, [userId]);

  // Auto-pull whenever the signed-in user changes.
  // The merge runs in a promise callback rather than in the effect body: the
  // pull is asynchronous, and this keeps the effect from scheduling a render
  // synchronously.
  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    syncService
      .pullSessions()
      .then((remote) => {
        if (cancelled || !remote?.length) return;
        setData((prev) => mergeRemoteSessions(prev, remote).data);
      })
      .catch((err) => console.warn('Cloud sync pull failed:', err));
    return () => { cancelled = true; };
  }, [userId]);

  // Publish the atmosphere + theme as CSS custom properties. `useLayoutEffect`
  // runs before the browser paints, so changing either never shows a frame in
  // the previous palette. The inline bootstrap in index.html covers the gap
  // before React mounts.
  useLayoutEffect(() => {
    applyAtmosphere(atmosphere || 'aurora', theme);
  }, [atmosphere, theme]);

  // Handle ambient sound toggle
  useEffect(() => {
    if (ambientSoundEnabled) {
      soundService.toggleAmbient(true, ambientType, ambientVolume);
    } else {
      soundService.toggleAmbient(false);
    }
    return () => {
      soundService.stopAmbient();
    };
  }, [ambientSoundEnabled, ambientType, ambientVolume]);

  // Helper to trigger celebratory effect when cycle finishes
  const triggerConfetti = useCallback(() => {
    if (reducedMotion) return;
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: getAtmosphereRing(atmosphere, theme).stops,
      });
    } catch {
      // ignore
    }
  }, [reducedMotion, atmosphere, theme]);

  // Move to next session in Pomodoro cycle
  const handleSessionCompletion = useCallback((options = {}) => {
    const isFocus = mode === 'focus';
    const away = Boolean(options?.completedWhileAway);
    const completionDate = endTimestampRef.current ? new Date(endTimestampRef.current) : new Date();
    const day = getLocalDateString(completionDate);
    const durationMins = Math.round(timerTotalSeconds / 60);

    // Play chime & send notification (if user wasn't away for a long duration)
    if (soundEnabled && !away) {
      soundService.playCompletionChime(chimeType);
    }

    if (desktopNotifications) {
      const msg = isFocus
        ? 'Focus session completed! Time for a well-deserved break.'
        : 'Break finished! Ready to dive back into deep work?';
      notificationService.send(isFocus ? 'Focus Session Completed 🎯' : 'Break Finished ☕', {
        body: msg,
      });
    }

    let nextMode = 'short_break';
    let nextCycle = cycleIndex;
    let nextDurationMins = shortBreakDuration;

    if (isFocus) {
      if (cycleIndex >= sessionsPerCycle) {
        nextMode = 'long_break';
        nextDurationMins = longBreakDuration;
        triggerConfetti();
      } else {
        nextMode = 'short_break';
        nextDurationMins = shortBreakDuration;
      }
    } else {
      // Break completed -> next focus session
      nextMode = 'focus';
      nextDurationMins = focusDuration;
      if (mode === 'long_break') {
        nextCycle = 1; // Restart cycle
      } else {
        nextCycle = Math.min(sessionsPerCycle, cycleIndex + 1);
      }
    }

    // New history item
    const newHistoryItem = {
      id: 'session-' + Date.now(),
      title: sessionTitle || (isFocus ? 'Focus session' : 'Break'),
      type: mode,
      startTime: completionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      durationMinutes: durationMins,
      completed: true,
      date: day,
      timestamp: completionDate.getTime(),
    };

    // Fire-and-forget cloud backup of the completed session
    if (userId) {
      syncService.pushSession(newHistoryItem, userId).catch((err) => {
        console.warn('Failed to push session to cloud:', err);
      });
    }

    // Never auto-start subsequent sessions in the background while user was away
    const shouldAutoStart = !away && (isFocus ? timerSettings.autoStartBreaks : timerSettings.autoStartFocus);
    const nextTotal = nextDurationMins * 60;
    const nextEnd = shouldAutoStart ? Date.now() + nextTotal * 1000 : null;

    // The deadline is owned here (and by startTimer), not by the interval
    // effect, so the ticker can keep running straight through a session
    // boundary when the next session auto-starts.
    endTimestampRef.current = nextEnd;
    publishCountdown(nextTotal);

    setData((prev) => {
      // Update daily focus minutes if it was a focus session
      const currentTodayMins = (prev.dailyActivity[day] || 0) + (isFocus ? durationMins : 0);
      const updatedActivity = {
        ...prev.dailyActivity,
        [day]: currentTodayMins,
      };

      // Update history list
      const updatedHistory = [newHistoryItem, ...prev.history];

      return {
        ...prev,
        dailyActivity: updatedActivity,
        history: updatedHistory,
        timerState: {
          ...prev.timerState,
          pendingCompletion: false,
          mode: nextMode,
          cycleIndex: nextCycle,
          remainingSeconds: nextTotal,
          totalSeconds: nextTotal,
          isRunning: shouldAutoStart,
          lastStartedAt: shouldAutoStart ? Date.now() : null,
          expectedEndAt: nextEnd,
        },
      };
    });
  }, [
    mode,
    cycleIndex,
    timerTotalSeconds,
    sessionTitle,
    sessionsPerCycle,
    shortBreakDuration,
    longBreakDuration,
    focusDuration,
    timerSettings.autoStartBreaks,
    timerSettings.autoStartFocus,
    soundEnabled,
    chimeType,
    desktopNotifications,
    triggerConfetti,
    userId,
    publishCountdown,
  ]);

  // Handle session completed while tab was asleep or closed
  useEffect(() => {
    if (data?.timerState?.pendingCompletion) {
      const timer = setTimeout(() => {
        handleSessionCompletion({ completedWhileAway: true });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [data?.timerState?.pendingCompletion, handleSessionCompletion]);

  // Tick function using exact timestamp difference.
  //
  // The ticker wakes up four times a second, but the countdown only advances
  // once a second. Publishing every wake-up would re-render the countdown
  // consumers four times per second for no visible gain, so a new value is
  // only published when the displayed second actually changed.
  const tick = useCallback(() => {
    const end = endTimestampRef.current;
    if (!end) return;

    const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));

    if (remaining <= 0) {
      handleSessionCompletion();
      return;
    }

    if (remaining === countdownRef.current) return;
    publishCountdown(remaining);
  }, [handleSessionCompletion, publishCountdown]);

  // Interval manager.
  //
  // The deadline lives in `endTimestampRef` and is owned by startTimer() and
  // handleSessionCompletion(). This effect therefore only decides whether the
  // ticker runs — it deliberately does NOT depend on the remaining seconds,
  // because that used to tear down and rebuild the interval every second.
  useEffect(() => {
    if (!isRunning) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      endTimestampRef.current = null;
      return undefined;
    }

    if (!timerIntervalRef.current) {
      timerIntervalRef.current = setInterval(tick, 250);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isRunning, tick]);

  // Tab visibility change handler to prevent any background drift
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (!isRunning) return;

      const end = endTimestampRef.current;
      if (!end) return;

      const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      if (remaining <= 0) {
        handleSessionCompletion();
      } else if (remaining !== countdownRef.current) {
        publishCountdown(remaining);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning, handleSessionCompletion, publishCountdown]);

  // Timer actions
  const resetTimer = useCallback((newDurationSecs = null) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    endTimestampRef.current = null;

    let targetTotal = newDurationSecs !== null ? newDurationSecs : timerTotalSeconds;
    if (newDurationSecs === null) {
      if (mode === 'focus') targetTotal = focusDuration * 60;
      else if (mode === 'short_break') targetTotal = shortBreakDuration * 60;
      else targetTotal = longBreakDuration * 60;
    }

    publishCountdown(targetTotal);
    setData((p) => ({
      ...p,
      timerState: {
        ...p.timerState,
        remainingSeconds: targetTotal,
        totalSeconds: targetTotal,
        isRunning: false,
        lastStartedAt: null,
        expectedEndAt: null,
      },
    }));
  }, [timerTotalSeconds, mode, focusDuration, shortBreakDuration, longBreakDuration, publishCountdown]);

  const startTimer = useCallback(() => {
    const current = countdownRef.current;
    const remaining = current > 0 ? current : timerTotalSeconds;
    const end = Date.now() + remaining * 1000;

    endTimestampRef.current = end;
    publishCountdown(remaining);
    setData((prev) => ({
      ...prev,
      timerState: {
        ...prev.timerState,
        remainingSeconds: remaining,
        isRunning: true,
        lastStartedAt: prev.timerState.lastStartedAt || Date.now(),
        expectedEndAt: end,
      },
    }));
  }, [timerTotalSeconds, publishCountdown]);

  const pauseTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Derive the remaining time from the deadline so the paused value is
    // exact even if the last tick has not been published yet.
    const end = endTimestampRef.current;
    const remaining = end
      ? Math.max(0, Math.ceil((end - Date.now()) / 1000))
      : countdownRef.current;

    endTimestampRef.current = null;
    publishCountdown(remaining);
    setData((prev) => ({
      ...prev,
      timerState: {
        ...prev.timerState,
        remainingSeconds: remaining,
        isRunning: false,
        expectedEndAt: null,
      },
    }));
  }, [publishCountdown]);

  const toggleTimer = useCallback(() => {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }, [isRunning, pauseTimer, startTimer]);

  // Preset switch: 'focus', 'short_break', 'long_break'
  const switchPreset = useCallback((nextMode) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    endTimestampRef.current = null;

    let durationMins = focusDuration;
    if (nextMode === 'short_break') durationMins = shortBreakDuration;
    if (nextMode === 'long_break') durationMins = longBreakDuration;
    const total = durationMins * 60;

    publishCountdown(total);
    setData((p) => ({
      ...p,
      timerState: {
        ...p.timerState,
        mode: nextMode,
        remainingSeconds: total,
        totalSeconds: total,
        isRunning: false,
        lastStartedAt: null,
        expectedEndAt: null,
      },
    }));
  }, [focusDuration, shortBreakDuration, longBreakDuration, publishCountdown]);

  // Inline duration editing.
  //
  // Changes the duration of the session type that is currently on the dial and
  // applies it to the existing timer — no new timer or interval is created.
  // The timer must be idle or paused: silently rewriting a live countdown is
  // never allowed, so the editor asks the student to pause first.
  const applyDuration = useCallback((nextMinutes) => {
    const limit = getDurationLimit(mode);
    const minutes = Math.round(Number(nextMinutes));

    if (!Number.isFinite(minutes)) return false;
    if (minutes < limit.minMinutes || minutes > limit.maxMinutes) return false;
    if (isRunning) return false;

    // Defensive: the interval should already be stopped while paused, but a
    // dead interval must never survive a duration change.
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    endTimestampRef.current = null;

    const total = minutes * 60;
    const settingKey = getDurationSettingKey(mode);

    publishCountdown(total);
    setData((prev) => ({
      ...prev,
      timerSettings: {
        ...prev.timerSettings,
        [settingKey]: minutes,
      },
      timerState: {
        ...prev.timerState,
        remainingSeconds: total,
        totalSeconds: total,
        isRunning: false,
        lastStartedAt: null,
        expectedEndAt: null,
      },
    }));
    return true;
  }, [mode, isRunning, publishCountdown]);

  // Update session title
  const setSessionTitle = useCallback((title) => {
    setData((prev) => ({
      ...prev,
      timerState: {
        ...prev.timerState,
        sessionTitle: title,
      },
    }));
  }, []);

  // Toggle theme
  const toggleTheme = useCallback((newTheme) => {
    setData((prev) => {
      const selected = newTheme || (prev.theme === 'light' ? 'dark' : 'light');
      return { ...prev, theme: selected };
    });
  }, []);

  // Toggle ambient sound
  const toggleAmbientSound = useCallback(() => {
    setData((prev) => ({
      ...prev,
      ambientSoundEnabled: !prev.ambientSoundEnabled,
    }));
  }, []);

  // Toggle immersive music background
  const toggleImmersiveBackground = useCallback(() => {
    setData((prev) => ({
      ...prev,
      musicSettings: {
        ...prev.musicSettings,
        immersiveBackground: !prev.musicSettings?.immersiveBackground,
      },
    }));
  }, []);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept while a dialog (duration editor, history modal) is
      // open, or while the user is typing in a form control.
      const target = e.target;
      if (target && typeof target.closest === 'function' && target.closest('[role="dialog"]')) {
        return;
      }
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
        return;
      }

      // Space to toggle pause/resume. A focused button/link handles Space
      // natively, so intercepting it here would double-trigger the action.
      const isInteractive = target && (target.tagName === 'BUTTON' || target.tagName === 'A' || target.getAttribute?.('role') === 'button');
      if (e.code === 'Space') {
        if (isInteractive) return;
        e.preventDefault();
        toggleTimer();
      }

      // Alt+R to reset (leaves Ctrl+R unintercepted for native browser reload)
      if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        resetTimer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTimer, resetTimer]);

  // Derived stats
  const todayFocusMinutes = data.dailyActivity[todayStr] || 0;
  const completedFocusSessionsToday = useMemo(() => {
    return (data.history || []).filter((h) => h.date === todayStr && h.type === 'focus' && h.completed).length;
  }, [data.history, todayStr]);

  // Calculate last 7 days metrics + week-over-week rhythm delta
  const { last7DaysData, rhythmText, rhythmBadge } = useMemo(() => {
    const items = [];
    const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    let thisWeekMins = 0;

    for (let i = 6; i >= 0; i -= 1) {
      const { dateStr, dayOfWeek } = getOffsetDateString(todayStr, -i);
      const minutes = data.dailyActivity[dateStr] || 0;
      thisWeekMins += minutes;

      items.push({
        dateStr,
        dayInitial: daysOfWeek[dayOfWeek],
        minutes,
        isToday: i === 0,
      });
    }

    // Previous 7-day period (days -13 to -7)
    let priorWeekMins = 0;
    for (let i = 13; i >= 7; i -= 1) {
      const { dateStr } = getOffsetDateString(todayStr, -i);
      priorWeekMins += data.dailyActivity[dateStr] || 0;
    }

    let badge = null;
    if (thisWeekMins === 0 && priorWeekMins === 0) {
      badge = { text: 'Starting fresh', type: 'neutral' };
    } else if (priorWeekMins === 0 && thisWeekMins > 0) {
      badge = { text: 'First week', type: 'positive' };
    } else if (priorWeekMins > 0) {
      const diff = thisWeekMins - priorWeekMins;
      const pct = Math.round((diff / priorWeekMins) * 100);
      if (pct > 0) {
        badge = { text: `+${pct}% vs last week`, type: 'positive' };
      } else if (pct < 0) {
        badge = { text: `${pct}% vs last week`, type: 'negative' };
      } else {
        badge = { text: 'On pace with last week', type: 'neutral' };
      }
    }

    const rhythmHours = Math.floor(thisWeekMins / 60);
    const rhythmRemainingMins = thisWeekMins % 60;
    return {
      last7DaysData: items,
      rhythmText: `${rhythmHours}h ${rhythmRemainingMins}m`,
      rhythmBadge: badge,
    };
  }, [data.dailyActivity, todayStr]);

  // `remainingSeconds` is intentionally not part of the exposed timer state:
  // it ticks every second and lives in its own context (useTimerCountdown).
  const exposedTimerState = useMemo(() => {
    const next = { ...data.timerState };
    delete next.remainingSeconds;
    return next;
  }, [data.timerState]);

  const stateValue = useMemo(() => ({
    data,
    activeView,
    isEditingTitle,
    showHistoryModal,
    theme,
    atmosphere,
    timerState: exposedTimerState,
    timerSettings,
    todayFocusMinutes,
    completedFocusSessionsToday,
    last7DaysData,
    rhythmText,
    rhythmBadge,
  }), [
    data,
    activeView,
    isEditingTitle,
    showHistoryModal,
    theme,
    atmosphere,
    exposedTimerState,
    timerSettings,
    todayFocusMinutes,
    completedFocusSessionsToday,
    last7DaysData,
    rhythmText,
    rhythmBadge,
  ]);

  // The action callbacks below keep a stable identity between renders, so
  // this object — and every component that only needs actions — stays put.
  const actionsValue = useMemo(() => ({
    setData,
    setActiveView,
    setIsEditingTitle,
    setShowHistoryModal,
    toggleTheme,
    toggleAmbientSound,
    toggleImmersiveBackground,
    setSessionTitle,
    startTimer,
    pauseTimer,
    toggleTimer,
    resetTimer,
    switchPreset,
    applyDuration,
    pullFromCloud,
  }), [
    toggleTheme,
    toggleAmbientSound,
    toggleImmersiveBackground,
    setSessionTitle,
    startTimer,
    pauseTimer,
    toggleTimer,
    resetTimer,
    switchPreset,
    applyDuration,
    pullFromCloud,
  ]);

  const countdownValue = useMemo(() => ({ remainingSeconds: countdown }), [countdown]);

  return (
    <TimerStateContext.Provider value={stateValue}>
      <TimerActionsContext.Provider value={actionsValue}>
        <TimerCountdownContext.Provider value={countdownValue}>
          {children}
        </TimerCountdownContext.Provider>
      </TimerActionsContext.Provider>
    </TimerStateContext.Provider>
  );
}
