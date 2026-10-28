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
import AmbientBackground from '../../ambient/AmbientBackground';
import ImmersiveBackground from '../../music/ImmersiveBackground';
import MusicHUD from '../../music/MusicHUD';
import ExpandedMusicHome from '../../music/ExpandedMusicHome';

export default function AppShell() {
  const { activeView, showHistoryModal, data, theme } = useTimerState();
  const { setShowHistoryModal } = useTimerActions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Stable callbacks — the children are memoised, so a new function identity
  // on every render would defeat the memoisation.
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((open) => !open), []);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const closeHistoryModal = useCallback(() => setShowHistoryModal(false), [setShowHistoryModal]);

  return (
    <div className="app-container">
      {/* Decorative, fixed background: atmosphere wash plus optional scene */}
      <AmbientBackground
        sceneId={data?.ambientScene}
        ambientMotion={data?.ambientMotion !== false}
        reducedMotion={data?.reducedMotion}
        theme={theme}
      />

      {/* Immersive Music Background (video or thumbnail fallback) */}
      <ImmersiveBackground />

      {/* Responsive Sidebar */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
      />

      {/* Main Workspace */}
      <main className="main-workspace">
        <DashboardHeader
          onOpenMobileMenu={toggleMobileMenu}
          mobileMenuOpen={mobileMenuOpen}
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

      {/* State A: Compact Claymorphic Music HUD */}
      <MusicHUD />

      {/* State B: Expanded Music Discovery Home */}
      <ExpandedMusicHome />

      {/* Modal for full session history log */}
      <SessionHistoryModal
        isOpen={showHistoryModal}
        onClose={closeHistoryModal}
      />
    </div>
  );
}
