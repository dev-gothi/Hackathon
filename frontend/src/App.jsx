import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { MedicationsPage } from './pages/MedicationsPage';
import { CareCirclePage } from './pages/CareCirclePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ElderlyModePage } from './pages/ElderlyModePage';

// Modals
import { AddMedicationModal } from './components/modals/AddMedicationModal';
import { ScheduleAppointmentModal } from './components/modals/ScheduleAppointmentModal';
import { AssistedCheckinModal } from './components/modals/AssistedCheckinModal';
import { CreateProfileModal } from './components/modals/CreateProfileModal';
import { JoinProfileModal } from './components/modals/JoinProfileModal';

export const App = () => {
  const { user, activeProfile, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

  // Modal states
  const [addMedOpen, setAddMedOpen] = useState(false);
  const [scheduleApptOpen, setScheduleApptOpen] = useState(false);
  const [assistedCheckinOpen, setAssistedCheckinOpen] = useState(false);
  const [createProfileOpen, setCreateProfileOpen] = useState(false);
  const [joinProfileOpen, setJoinProfileOpen] = useState(false);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        color: '#64748b'
      }}>
        Initializing CareCircle Platform...
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // If user has no active care profiles yet
  if (!activeProfile) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#f8fafc'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
            Welcome to CareCircle, {user.full_name}!
          </h2>
          <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '28px' }}>
            To get started, create a care profile for an elderly loved one or join an existing profile with a shared passcode.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => setCreateProfileOpen(true)}
              style={{
                background: '#0d9488',
                color: '#ffffff',
                padding: '14px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700
              }}
            >
              + Create New Elderly Care Profile
            </button>
            <button
              onClick={() => setJoinProfileOpen(true)}
              style={{
                background: '#f1f5f9',
                color: '#334155',
                padding: '14px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700
              }}
            >
              Join with 6-Digit Passcode
            </button>
          </div>
        </div>

        <CreateProfileModal isOpen={createProfileOpen} onClose={() => setCreateProfileOpen(false)} />
        <JoinProfileModal isOpen={joinProfileOpen} onClose={() => setJoinProfileOpen(false)} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenCreateProfile={() => setCreateProfileOpen(true)}
        onOpenJoinProfile={() => setJoinProfileOpen(true)}
      />

      <main>
        {currentTab === 'dashboard' && (
          <DashboardPage
            onNavigateTab={setCurrentTab}
            onOpenAddAppointment={() => setScheduleApptOpen(true)}
            onOpenAssistedCheckin={() => setAssistedCheckinOpen(true)}
          />
        )}
        {currentTab === 'medications' && (
          <MedicationsPage
            onOpenAddMedication={() => setAddMedOpen(true)}
          />
        )}
        {currentTab === 'carecircle' && (
          <CareCirclePage />
        )}
        {currentTab === 'analytics' && (
          <AnalyticsPage />
        )}
        {currentTab === 'checkin' && (
          <ElderlyModePage />
        )}
        {currentTab === 'elderly' && (
          <ElderlyModePage />
        )}
      </main>

      {/* Global Modals */}
      <AddMedicationModal
        isOpen={addMedOpen}
        onClose={() => setAddMedOpen(false)}
        profileId={activeProfile.id}
        onMedicationAdded={() => {
          window.dispatchEvent(new Event('refreshDashboard'));
        }}
      />

      <ScheduleAppointmentModal
        isOpen={scheduleApptOpen}
        onClose={() => setScheduleApptOpen(false)}
        profileId={activeProfile.id}
        onAppointmentAdded={() => {
          window.dispatchEvent(new Event('refreshDashboard'));
        }}
      />

      <AssistedCheckinModal
        isOpen={assistedCheckinOpen}
        onClose={() => setAssistedCheckinOpen(false)}
        profileId={activeProfile.id}
        patientName={activeProfile.display_name}
        onCheckinSubmitted={() => {
          window.dispatchEvent(new Event('refreshDashboard'));
        }}
      />

      <CreateProfileModal
        isOpen={createProfileOpen}
        onClose={() => setCreateProfileOpen(false)}
      />

      <JoinProfileModal
        isOpen={joinProfileOpen}
        onClose={() => setJoinProfileOpen(false)}
      />
    </div>
  );
};
