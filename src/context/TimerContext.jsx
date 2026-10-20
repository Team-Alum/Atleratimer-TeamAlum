import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TimerContext } from './TimerContextInstance';
import { storageService, getLocalDateString } from '../services/storageService';
import { soundService } from '../services/audioService';
import { notificationService } from '../services/notificationService';
import confetti from 'canvas-confetti';

export function TimerProvider({ children }) {
  const [data, setData] = useState(() => storageService.loadData());
  const [activeView, setActiveView] = useState('focus'); // 'focus', 'customizable_time', 'customizations', 'settings'
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Destructure state
  const { theme, soundEnabled, chimeType, ambientSoundEnabled, ambientType, ambientVolume, reducedMotion, desktopNotifications, timerSettings, timerState } = data;

  const timerIntervalRef = useRef(null);
  const endTimestampRef = useRef(timerState.expectedEndAt || null);

  // Save to localStorage when data changes
  useEffect(() => {
    storageService.saveData(data);
  }, [data]);

  // Set HTML theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
        colors: ['#078596', '#62DCE7', '#38BDF8', '#10B981'],
      });
    } catch {
      // ignore
    }
  }, [reducedMotion]);

  // Move to next session in Pomodoro cycle
  const handleSessionCompletion = useCallback(() => {
    const isFocus = timerState.mode === 'focus';
    const currentCycle = timerState.cycleIndex;
    const maxCycles = timerSettings.sessionsPerCycle;
    const now = new Date();
    const todayStr = getLocalDateString(now);
    const durationMins = Math.round(timerState.totalSeconds / 60);

    // Play chime & send notification
    if (soundEnabled) {
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
    let nextCycle = currentCycle;
    let nextDurationMins = timerSettings.shortBreakDuration;

    if (isFocus) {
      if (currentCycle >= maxCycles) {
        nextMode = 'long_break';
        nextDurationMins = timerSettings.longBreakDuration;
        triggerConfetti();
      } else {
        nextMode = 'short_break';
        nextDurationMins = timerSettings.shortBreakDuration;
      }
    } else {
      // Break completed -> next focus session
      nextMode = 'focus';
      nextDurationMins = timerSettings.focusDuration;
      if (timerState.mode === 'long_break') {
        nextCycle = 1; // Restart cycle
      } else {
        nextCycle = Math.min(maxCycles, currentCycle + 1);
      }
    }

    // New history item
    const newHistoryItem = {
      id: 'session-' + Date.now(),
      title: timerState.sessionTitle || (isFocus ? 'Focus session' : 'Break'),
      type: timerState.mode,
      startTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      durationMinutes: durationMins,
      completed: true,
      date: todayStr,
      timestamp: Date.now(),
    };

    setData((prev) => {
      // Update daily focus minutes if it was a focus session
      const currentTodayMins = (prev.dailyActivity[todayStr] || 0) + (isFocus ? durationMins : 0);
      const updatedActivity = {
        ...prev.dailyActivity,
        [todayStr]: currentTodayMins,
      };

      // Update history list
      const updatedHistory = [newHistoryItem, ...prev.history.filter((h) => h.id !== 'session-live-01')];

      const shouldAutoStart = isFocus ? prev.timerSettings.autoStartBreaks : prev.timerSettings.autoStartFocus;

      return {
        ...prev,
        dailyActivity: updatedActivity,
        history: updatedHistory,
        timerState: {
          ...prev.timerState,
          mode: nextMode,
          cycleIndex: nextCycle,
          remainingSeconds: nextDurationMins * 60,
          totalSeconds: nextDurationMins * 60,
          isRunning: shouldAutoStart,
          lastStartedAt: shouldAutoStart ? Date.now() : null,
          expectedEndAt: shouldAutoStart ? Date.now() + nextDurationMins * 60 * 1000 : null,
        },
      };
    });
  }, [
    timerState.mode,
    timerState.cycleIndex,
    timerState.totalSeconds,
    timerState.sessionTitle,
    timerSettings.sessionsPerCycle,
    timerSettings.shortBreakDuration,
    timerSettings.longBreakDuration,
    timerSettings.focusDuration,
    soundEnabled,
    chimeType,
    desktopNotifications,
    triggerConfetti,
  ]);

  // Tick function using exact timestamp difference
  const tick = useCallback(() => {
    if (!endTimestampRef.current) return;
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((endTimestampRef.current - now) / 1000));

    if (remaining <= 0) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      handleSessionCompletion();
    } else {
      setData((prev) => ({
        ...prev,
        timerState: {
          ...prev.timerState,
          remainingSeconds: remaining,
        },
      }));
    }
  }, [handleSessionCompletion]);

  // Interval manager
  useEffect(() => {
    if (timerState.isRunning) {
      endTimestampRef.current = Date.now() + timerState.remainingSeconds * 1000;
      if (!timerIntervalRef.current) {
        timerIntervalRef.current = setInterval(tick, 250);
      }
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      endTimestampRef.current = null;
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [timerState.isRunning, tick, timerState.remainingSeconds]);

  // Tab visibility change handler to prevent any background drift
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && timerState.isRunning && endTimestampRef.current) {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((endTimestampRef.current - now) / 1000));
        if (remaining <= 0) {
          handleSessionCompletion();
        } else {
          setData((prev) => ({
            ...prev,
            timerState: {
              ...prev.timerState,
              remainingSeconds: remaining,
            },
          }));
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [timerState.isRunning, handleSessionCompletion]);

  // Timer actions
  const resetTimer = useCallback((newDurationSecs = null) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    endTimestampRef.current = null;

    setData((prev) => {
      let targetTotal = newDurationSecs !== null ? newDurationSecs : prev.timerState.totalSeconds;
      if (newDurationSecs === null) {
        if (prev.timerState.mode === 'focus') targetTotal = prev.timerSettings.focusDuration * 60;
        else if (prev.timerState.mode === 'short_break') targetTotal = prev.timerSettings.shortBreakDuration * 60;
        else targetTotal = prev.timerSettings.longBreakDuration * 60;
      }

      return {
        ...prev,
        timerState: {
          ...prev.timerState,
          remainingSeconds: targetTotal,
          totalSeconds: targetTotal,
          isRunning: false,
          lastStartedAt: null,
          expectedEndAt: null,
        },
      };
    });
  }, []);

  const startTimer = useCallback(() => {
    setData((prev) => {
      const remaining = prev.timerState.remainingSeconds <= 0 ? prev.timerState.totalSeconds : prev.timerState.remainingSeconds;
      const end = Date.now() + remaining * 1000;
      endTimestampRef.current = end;
      return {
        ...prev,
        timerState: {
          ...prev.timerState,
          remainingSeconds: remaining,
          isRunning: true,
          lastStartedAt: Date.now(),
          expectedEndAt: end,
        },
      };
    });
  }, []);

  const pauseTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    endTimestampRef.current = null;
    setData((prev) => ({
      ...prev,
      timerState: {
        ...prev.timerState,
        isRunning: false,
        expectedEndAt: null,
      },
    }));
  }, []);

  const toggleTimer = useCallback(() => {
    if (timerState.isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }, [timerState.isRunning, pauseTimer, startTimer]);

  // Preset switch: 'focus', 'short_break', 'long_break'
  const switchPreset = useCallback((mode) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    endTimestampRef.current = null;

    setData((prev) => {
      let durationMins = prev.timerSettings.focusDuration;
      if (mode === 'short_break') durationMins = prev.timerSettings.shortBreakDuration;
      if (mode === 'long_break') durationMins = prev.timerSettings.longBreakDuration;

      return {
        ...prev,
        timerState: {
          ...prev.timerState,
          mode,
          remainingSeconds: durationMins * 60,
          totalSeconds: durationMins * 60,
          isRunning: false,
          lastStartedAt: null,
          expectedEndAt: null,
        },
      };
    });
  }, []);

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

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in input or textarea
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Space to toggle pause/resume
      if (e.code === 'Space') {
        e.preventDefault();
        toggleTimer();
      }

      // Ctrl+R to reset (prevent page refresh)
      if (e.ctrlKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        resetTimer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTimer, resetTimer]);

  // Derived stats
  const todayStr = useMemo(() => getLocalDateString(), []);
  const todayFocusMinutes = data.dailyActivity[todayStr] || 0;
  const completedFocusSessionsToday = useMemo(() => {
    return (data.history || []).filter((h) => h.date === todayStr && h.type === 'focus' && h.completed).length;
  }, [data.history, todayStr]);

  // Calculate last 7 days metrics
  const { last7DaysData, rhythmText } = useMemo(() => {
    const items = [];
    const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    let totalMins = 0;
    const baseDate = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const dateStr = getLocalDateString(d);
      const minutes = data.dailyActivity[dateStr] || 0;
      totalMins += minutes;

      items.push({
        dateStr,
        dayInitial: daysOfWeek[d.getDay()],
        minutes,
        isToday: i === 0,
      });
    }

    const rhythmHours = Math.floor(totalMins / 60);
    const rhythmRemainingMins = totalMins % 60;
    return {
      last7DaysData: items,
      rhythmText: `${rhythmHours}h ${rhythmRemainingMins}m`,
    };
  }, [data.dailyActivity]);

  return (
    <TimerContext.Provider
      value={{
        data,
        setData,
        activeView,
        setActiveView,
        isEditingTitle,
        setIsEditingTitle,
        showHistoryModal,
        setShowHistoryModal,
        theme,
        toggleTheme,
        timerState,
        timerSettings,
        startTimer,
        pauseTimer,
        toggleTimer,
        resetTimer,
        switchPreset,
        setSessionTitle,
        toggleAmbientSound,
        todayFocusMinutes,
        completedFocusSessionsToday,
        last7DaysData,
        rhythmText,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}
