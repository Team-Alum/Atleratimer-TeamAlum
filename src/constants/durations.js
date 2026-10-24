// Duration limits shared by the inline timer editor and the settings form.
//
// These mirror the ranges enforced by CustomizableTimeView. Keeping them in
// one module means the inline editor can never offer a value the settings
// screen would reject (or vice versa).
export const DURATION_LIMITS = {
  focus: { minMinutes: 1, maxMinutes: 180 },
  short_break: { minMinutes: 1, maxMinutes: 60 },
  long_break: { minMinutes: 1, maxMinutes: 120 },
};

export function getDurationLimit(mode) {
  return DURATION_LIMITS[mode] || DURATION_LIMITS.focus;
}

// Maps a timer mode to the timerSettings key that stores its duration.
export function getDurationSettingKey(mode) {
  if (mode === 'short_break') return 'shortBreakDuration';
  if (mode === 'long_break') return 'longBreakDuration';
  return 'focusDuration';
}

// "90" -> { hours: 1, minutes: 30 }
export function splitDuration(totalMinutes) {
  const safe = Math.max(0, Math.round(Number(totalMinutes) || 0));
  return {
    hours: Math.floor(safe / 60),
    minutes: safe % 60,
  };
}

// "90" -> "1 h 30 min"; "60" -> "1 h"; "25" -> "25 min"
export function formatDurationLabel(totalMinutes) {
  const { hours, minutes } = splitDuration(totalMinutes);
  const parts = [];
  if (hours) parts.push(`${hours} h`);
  if (minutes) parts.push(`${minutes} min`);
  return parts.length ? parts.join(' ') : '0 min';
}

// Human label for a timer mode, used by the duration editor.
export function getModeLabel(mode) {
  if (mode === 'short_break') return 'Short break';
  if (mode === 'long_break') return 'Long break';
  return 'Focus session';
}
