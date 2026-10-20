import React, { useState } from 'react';
import { useTimer } from '../../context/useTimer';
import Sidebar from './Sidebar';
import DashboardHeader from './DashboardHeader';
import FocusSessionView from '../views/FocusSessionView';
import CustomizableTimeView from '../views/CustomizableTimeView';
import TimerCustomizationsView from '../views/TimerCustomizationsView';
import SettingsView from '../views/SettingsView';
import SessionHistoryModal from '../stats/SessionHistoryModal';
import { Menu, Hourglass } from 'lucide-react';

export default function AppShell() {
  const { activeView, showHistoryModal, setShowHistoryModal } = useTimer();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Responsive Sidebar */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Workspace */}
      <main className="main-workspace">
        <DashboardHeader
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* View Switcher */}
        {activeView === 'focus' && <FocusSessionView />}
        {activeView === 'customizable_time' && (
          <>
            <CustomizableTimeView />
            <div className="app-watermark">By &quot;TeamAlum - Sudarshan &amp; Soham&quot;</div>
          </>
        )}
        {activeView === 'customizations' && (
          <>
            <TimerCustomizationsView />
            <div className="app-watermark">By &quot;TeamAlum - Sudarshan &amp; Soham&quot;</div>
          </>
        )}
        {activeView === 'settings' && (
          <>
            <SettingsView />
            <div className="app-watermark">By &quot;TeamAlum - Sudarshan &amp; Soham&quot;</div>
          </>
        )}
      </main>

      {/* Modal for full session history log */}
      <SessionHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />
    </div>
  );
}
