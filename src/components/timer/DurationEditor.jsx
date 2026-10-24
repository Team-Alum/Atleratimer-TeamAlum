import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Minus, Plus, X } from 'lucide-react';
import { useTimerState, useTimerActions, useTimerCountdown } from '../../context/useTimer';
import {
  formatDurationLabel,
  getDurationLimit,
  getDurationSettingKey,
  getModeLabel,
  splitDuration,
} from '../../constants/durations';

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const pad2 = (value) => String(value).padStart(2, '0');
const onlyDigits = (value) => String(value).replace(/\D/g, '').slice(0, 2);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// One unit (hours or minutes) with accessible -/+ buttons and a directly
// editable value. The value is kept as a string so typing stays predictable;
// step buttons and blur normalise it to two digits.
function DurationUnit({ label, value, min, max, onChange, onStep, disabled, inputRef }) {
  const numeric = value === '' ? 0 : Number(value);
  return (
    <div className="duration-unit">
      <span className="duration-unit-label">{label}</span>
      <div className="duration-stepper">
        <button
          type="button"
          className="duration-step-btn"
          onClick={() => onStep(-1)}
          disabled={disabled || numeric <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          <Minus size={16} strokeWidth={2.4} aria-hidden="true" />
        </button>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          className="duration-number tabular-nums"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => onChange(value === '' ? pad2(min) : pad2(numeric))}
          onFocus={(event) => event.target.select()}
          disabled={disabled}
          aria-label={`${label} in the new duration`}
        />
        <button
          type="button"
          className="duration-step-btn"
          onClick={() => onStep(1)}
          disabled={disabled || numeric >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default function DurationEditor({ onClose }) {
  const { timerState, timerSettings } = useTimerState();
  const { remainingSeconds } = useTimerCountdown();
  const { applyDuration, pauseTimer } = useTimerActions();

  const { mode, isRunning } = timerState;
  const limit = getDurationLimit(mode);
  const settingKey = getDurationSettingKey(mode);
  const modeLabel = getModeLabel(mode);
  const maxHours = Math.floor(limit.maxMinutes / 60);

  // Seed the editor from the value on the dial (or the configured duration if
  // the clock already reached zero). Runs once per open.
  const [draft, setDraft] = useState(() => {
    const fromClock = Math.round((remainingSeconds || 0) / 60);
    const seeded = fromClock > 0
      ? fromClock
      : (timerSettings[settingKey] || limit.minMinutes);
    const parts = splitDuration(clamp(seeded, limit.minMinutes, limit.maxMinutes));
    return { hours: pad2(parts.hours), minutes: pad2(parts.minutes) };
  });
  const [errorMsg, setErrorMsg] = useState('');

  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const hoursRef = useRef(null);
  const previousFocusRef = useRef(null);

  const hoursNum = draft.hours === '' ? 0 : Number(draft.hours);
  const minutesNum = draft.minutes === '' ? 0 : Number(draft.minutes);

  // The minutes allowed for the chosen hour value. When the maximum is a whole
  // number of hours (180, 120, 60) the minutes must be zero at that hour.
  const minuteCeiling = hoursNum >= maxHours
    ? (limit.maxMinutes % 60)
    : 59;

  const totalMinutes = hoursNum * 60 + minutesNum;
  const overLimit = totalMinutes > limit.maxMinutes;
  const underMinimum = totalMinutes < limit.minMinutes;
  const canApply = !isRunning && !overLimit && !underMinimum;

  let validationMessage = '';
  if (underMinimum) {
    validationMessage = 'Choose at least 1 minute.';
  } else if (overLimit) {
    validationMessage = `${modeLabel} can be at most ${formatDurationLabel(limit.maxMinutes)}.`;
  }

  // Focus management: move focus into the dialog, trap Tab, restore the
  // element that opened it, and lock background scrolling on small screens.
  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    const previousOverflow = document.body.style.overflow;

    if (narrow) document.body.style.overflow = 'hidden';

    const frame = requestAnimationFrame(() => {
      hoursRef.current?.focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(frame);
      if (narrow) document.body.style.overflow = previousOverflow;
      const previous = previousFocusRef.current;
      if (previous && typeof previous.focus === 'function') {
        previous.focus({ preventScroll: true });
      }
    };
  }, []);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const nodes = panelRef.current?.querySelectorAll(FOCUSABLE);
    if (!nodes || nodes.length === 0) return;

    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, [onClose]);

  const handleHoursChange = (raw) => {
    const digits = onlyDigits(raw);
    if (digits === '') {
      setDraft((prev) => ({ ...prev, hours: '' }));
      setErrorMsg('');
      return;
    }
    const value = clamp(Number(digits), 0, maxHours);
    setDraft((prev) => ({
      hours: String(value),
      // Selecting the highest hour makes the leftover minute slot explicit.
      minutes: value >= maxHours
        ? pad2(Math.min(minutesNum, limit.maxMinutes % 60))
        : prev.minutes,
    }));
    setErrorMsg('');
  };

  const handleMinutesChange = (raw) => {
    const digits = onlyDigits(raw);
    if (digits === '') {
      setDraft((prev) => ({ ...prev, minutes: '' }));
      setErrorMsg('');
      return;
    }
    const value = clamp(Number(digits), 0, minuteCeiling);
    setDraft((prev) => ({ ...prev, minutes: String(value) }));
    setErrorMsg('');
  };

  const stepHours = (delta) => {
    setDraft((prev) => {
      const currentHours = prev.hours === '' ? 0 : Number(prev.hours);
      const currentMinutes = prev.minutes === '' ? 0 : Number(prev.minutes);
      const next = clamp(currentHours + delta, 0, maxHours);
      return {
        hours: pad2(next),
        minutes: next >= maxHours
          ? pad2(Math.min(currentMinutes, limit.maxMinutes % 60))
          : prev.minutes,
      };
    });
    setErrorMsg('');
  };

  const stepMinutes = (delta) => {
    setDraft((prev) => {
      const currentHours = prev.hours === '' ? 0 : Number(prev.hours);
      const currentMinutes = prev.minutes === '' ? 0 : Number(prev.minutes);
      const hourCeil = currentHours >= maxHours ? (limit.maxMinutes % 60) : 59;
      return {
        ...prev,
        minutes: pad2(clamp(currentMinutes + delta, 0, hourCeil)),
      };
    });
    setErrorMsg('');
  };

  const handleApply = () => {
    if (!canApply) return;
    const applied = applyDuration(totalMinutes);
    if (applied) {
      onClose();
      return;
    }
    // The timer started while the editor was open.
    setErrorMsg('Pause the timer before changing its duration.');
  };

  const summary = useMemo(() => formatDurationLabel(totalMinutes), [totalMinutes]);

  return createPortal(
    <div
      ref={overlayRef}
      className="duration-overlay"
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        if (event.target === overlayRef.current) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="duration-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="duration-editor-title"
        aria-describedby="duration-editor-summary"
      >
        <div className="duration-editor-head">
          <div>
            <h2 id="duration-editor-title" className="duration-editor-title">
              Edit {modeLabel.toLowerCase()} duration
            </h2>
            <p className="duration-editor-subtitle">
              Change the current timer without leaving this screen.
            </p>
          </div>
          <button
            type="button"
            className="duration-close-btn"
            onClick={onClose}
            aria-label="Close duration editor"
          >
            <X size={18} />
          </button>
        </div>

        {isRunning && (
          <div className="duration-locked" role="status">
            <Lock size={15} strokeWidth={2.2} aria-hidden="true" />
            <div className="duration-locked-text">
              <strong>Timer is running.</strong>
              <span>Pause it before changing the duration.</span>
            </div>
            <button type="button" className="duration-locked-action" onClick={pauseTimer}>
              Pause
            </button>
          </div>
        )}

        <div className="duration-units">
          <DurationUnit
            label="Hours"
            value={draft.hours}
            min={0}
            max={maxHours}
            onChange={handleHoursChange}
            onStep={stepHours}
            disabled={isRunning}
            inputRef={hoursRef}
          />
          <DurationUnit
            label="Minutes"
            value={draft.minutes}
            min={0}
            max={minuteCeiling}
            onChange={handleMinutesChange}
            onStep={stepMinutes}
            disabled={isRunning}
            inputRef={null}
          />
        </div>

        <p
          id="duration-editor-summary"
          className={`duration-summary${(overLimit || underMinimum) ? ' invalid' : ''}`}
          aria-live="polite"
        >
          New duration: <strong>{summary}</strong>
          {validationMessage && <span className="duration-error">{validationMessage}</span>}
        </p>

        {errorMsg && <p className="duration-error" role="alert">{errorMsg}</p>}

        <div className="duration-editor-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary-action"
            onClick={handleApply}
            disabled={!canApply}
          >
            Done
          </button>
        </div>

        <p className="duration-editor-hint">
          Limits: {formatDurationLabel(limit.minMinutes)} – {formatDurationLabel(limit.maxMinutes)}
        </p>
      </div>
    </div>,
    document.body
  );
}
