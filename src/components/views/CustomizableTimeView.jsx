import React, { useState } from 'react';
import { useTimerState, useTimerActions } from '../../context/useTimer';
import { Check, RotateCcw } from 'lucide-react';

export default function CustomizableTimeView() {
  const { timerSettings } = useTimerState();
  const { setData, setActiveView, resetTimer } = useTimerActions();

  const [form, setForm] = useState({
    focusDuration: timerSettings.focusDuration,
    shortBreakDuration: timerSettings.shortBreakDuration,
    longBreakDuration: timerSettings.longBreakDuration,
    sessionsPerCycle: timerSettings.sessionsPerCycle,
    dailyGoalMinutes: timerSettings.dailyGoalMinutes || 100,
    autoStartBreaks: timerSettings.autoStartBreaks || false,
    autoStartFocus: timerSettings.autoStartFocus || false,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSavedSuccess(false);
    setErrorMsg('');
  };

  const handleSave = (e) => {
    e.preventDefault();

    // Validation
    const focus = Number(form.focusDuration);
    const sBreak = Number(form.shortBreakDuration);
    const lBreak = Number(form.longBreakDuration);
    const cycles = Number(form.sessionsPerCycle);
    const dailyGoal = Number(form.dailyGoalMinutes);

    if (isNaN(focus) || focus < 1 || focus > 180) {
      setErrorMsg('Focus duration must be between 1 and 180 minutes.');
      return;
    }
    if (isNaN(sBreak) || sBreak < 1 || sBreak > 60) {
      setErrorMsg('Short break duration must be between 1 and 60 minutes.');
      return;
    }
    if (isNaN(lBreak) || lBreak < 1 || lBreak > 120) {
      setErrorMsg('Long break duration must be between 1 and 120 minutes.');
      return;
    }
    if (isNaN(cycles) || cycles < 1 || cycles > 16) {
      setErrorMsg('Sessions per cycle must be between 1 and 16.');
      return;
    }
    if (isNaN(dailyGoal) || dailyGoal < 10 || dailyGoal > 720) {
      setErrorMsg('Daily focus goal must be between 10 and 720 minutes.');
      return;
    }

    setData((prev) => ({
      ...prev,
      timerSettings: {
        focusDuration: focus,
        shortBreakDuration: sBreak,
        longBreakDuration: lBreak,
        sessionsPerCycle: cycles,
        dailyGoalMinutes: dailyGoal,
        autoStartBreaks: !!form.autoStartBreaks,
        autoStartFocus: !!form.autoStartFocus,
      },
    }));

    resetTimer(focus * 60);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    setForm({
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      sessionsPerCycle: 4,
      dailyGoalMinutes: 100,
      autoStartBreaks: false,
      autoStartFocus: false,
    });
    setErrorMsg('');
  };

  return (
    <div className="view-container">
      <div className="view-card">
        <h2 className="view-card-title">Session Durations & Intervals</h2>
        <p className="view-card-desc">
          Customize your Pomodoro work cycles. Durations apply immediately to the focus timer.
        </p>

        {errorMsg && (
          <div style={{ color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px 14px', borderRadius: 12, marginBottom: 18, fontSize: 13 }}>
            {errorMsg}
          </div>
        )}

        {savedSuccess && (
          <div style={{ color: 'var(--accent-teal)', backgroundColor: 'var(--accent-soft)', padding: '10px 14px', borderRadius: 12, marginBottom: 18, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Check size={16} />
            <span>Settings saved successfully! Timer duration updated.</span>
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="setting-row">
            <div>
              <div className="setting-label">Focus Session Duration</div>
              <div className="setting-help">Length of concentrated work intervals (minutes)</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number"
                min="1"
                max="180"
                value={form.focusDuration}
                onChange={(e) => handleChange('focusDuration', e.target.value)}
                className="form-input"
                style={{ width: 80, textAlign: 'center' }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>min</span>
            </div>
          </div>

          <div className="setting-row">
            <div>
              <div className="setting-label">Short Break Duration</div>
              <div className="setting-help">Rest period between standard focus sessions</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number"
                min="1"
                max="60"
                value={form.shortBreakDuration}
                onChange={(e) => handleChange('shortBreakDuration', e.target.value)}
                className="form-input"
                style={{ width: 80, textAlign: 'center' }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>min</span>
            </div>
          </div>

          <div className="setting-row">
            <div>
              <div className="setting-label">Long Break Duration</div>
              <div className="setting-help">Extended recharge period after completing a full cycle</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number"
                min="1"
                max="120"
                value={form.longBreakDuration}
                onChange={(e) => handleChange('longBreakDuration', e.target.value)}
                className="form-input"
                style={{ width: 80, textAlign: 'center' }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>min</span>
            </div>
          </div>

          <div className="setting-row">
            <div>
              <div className="setting-label">Sessions Per Cycle</div>
              <div className="setting-help">Number of focus sessions before triggering a long break</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number"
                min="1"
                max="16"
                value={form.sessionsPerCycle}
                onChange={(e) => handleChange('sessionsPerCycle', e.target.value)}
                className="form-input"
                style={{ width: 80, textAlign: 'center' }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>sessions</span>
            </div>
          </div>

          <div className="setting-row">
            <div>
              <div className="setting-label">Daily Focus Target</div>
              <div className="setting-help">Goal for total productive minutes tracked each day</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number"
                min="10"
                max="720"
                step="10"
                value={form.dailyGoalMinutes}
                onChange={(e) => handleChange('dailyGoalMinutes', e.target.value)}
                className="form-input"
                style={{ width: 80, textAlign: 'center' }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>min</span>
            </div>
          </div>

          <label className="setting-row setting-row--toggle">
            <div>
              <div className="setting-label">Auto-start Breaks</div>
              <div className="setting-help">Automatically transition into break when focus session completes</div>
            </div>
            <input
              type="checkbox"
              checked={form.autoStartBreaks}
              onChange={(e) => handleChange('autoStartBreaks', e.target.checked)}
              style={{ width: 20, height: 20, accentColor: 'var(--accent-teal)' }}
            />
          </label>

          <label className="setting-row setting-row--toggle">
            <div>
              <div className="setting-label">Auto-start Focus Sessions</div>
              <div className="setting-help">Automatically begin next focus block when break countdown concludes</div>
            </div>
            <input
              type="checkbox"
              checked={form.autoStartFocus}
              onChange={(e) => handleChange('autoStartFocus', e.target.checked)}
              style={{ width: 20, height: 20, accentColor: 'var(--accent-teal)' }}
            />
          </label>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 28, paddingTop: 18, borderTop: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleResetDefaults}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RotateCcw size={15} />
              <span>Reset to Defaults</span>
            </button>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setActiveView('focus')}
              >
                Back to Timer
              </button>
              <button type="submit" className="btn-primary-action">
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
