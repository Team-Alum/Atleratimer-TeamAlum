import React, { useCallback, useState } from 'react';
import { useTimerState, useTimerActions } from '../../context/useTimer';
import Sidebar from './Sidebar';
import DashboardHeader from './DashboardHeader';
import FocusSessionView from '../views/FocusSessionView';
import CustomizableTimeView from '../views/CustomizableTimeView';
import TimerCustomizationsView from '../views/TimerCustomizationsView';
import SettingsView from '../views/SettingsView';
import SessionHistoryModal from '../stats/SessionHistoryModal';
import Watermark from './Watermark';
import AmbientStage from '../../ambient/AmbientStage';
import { Menu, Hourglass } from 'lucide-react';

export default function AppShell() {
  const { activeView, showHistoryModal } = useTimerState();
  const { setShowHistoryModal } = useTimerActions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Stable callbacks — the children are memoised, so a new function identity
  // on every render would defeat the memoisation.
  const openMobileMenu = useCallback(() => setMobileMenuOpen(true), []);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const closeHistoryModal = useCallback(() => setShowHistoryModal(false), [setShowHistoryModal]);

  return (
    <div className="app-container">
      {/* Mobile Top Navigation Bar */}
      <div className="mobile-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="brand-icon-box" style={{ width: 34, height: 34, borderRadius: 8 }}>
            <Hourglass size={18} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Atleratimer</span>
        </div>
        <button
          className="icon-button"
          onClick={openMobileMenu}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Responsive Sidebar */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
      />

      {/* Main Workspace */}
      <main className="main-workspace">
        {/* Ambient cinematic background (behind everything, never blocks input) */}
        <AmbientStage />

        <DashboardHeader
          onOpenMobileMenu={openMobileMenu}
        />

        {/* View Switcher */}
        {activeView === 'focus' && <FocusSessionView />}
        {activeView === 'customizable_time' && (
          <>
            <CustomizableTimeView />
            <Watermark />
          </>
        )}
        {activeView === 'customizations' && (
          <>
            <TimerCustomizationsView />
            <Watermark />
          </>
        )}
        {activeView === 'settings' && (
          <>
            <SettingsView />
            <Watermark />
          </>
        )}
      </main>

      {/* Modal for full session history log */}
      <SessionHistoryModal
        isOpen={showHistoryModal}
        onClose={closeHistoryModal}
      />
    </div>
  );
}
