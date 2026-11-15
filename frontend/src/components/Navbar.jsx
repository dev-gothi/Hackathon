import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Heart, Shield, Pill, BarChart2, Users, Bot, 
  LogOut, ChevronDown, Plus, RefreshCw, Eye
} from 'lucide-react';
import { triggerCronCycle } from '../api/client';

export const Navbar = ({ currentTab, setCurrentTab, onOpenCreateProfile, onOpenJoinProfile }) => {
  const { user, profiles, activeProfile, selectProfile, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [cronRunning, setCronRunning] = useState(false);
  const [cronFeedback, setCronFeedback] = useState('');

  const handleTriggerCron = async () => {
    try {
      setCronRunning(true);
      setCronFeedback('Running...');
      await triggerCronCycle();
      setCronFeedback('Cron Fired!');
      setTimeout(() => setCronFeedback(''), 2500);
      window.dispatchEvent(new Event('refreshDashboard'));
    } catch (err) {
      setCronFeedback('Error');
      setTimeout(() => setCronFeedback(''), 2000);
    } finally {
      setCronRunning(false);
    }
  };

  const roleLabels = {
    primary_caretaker: { text: 'Primary Caretaker', color: '#0d9488', bg: '#ccfbf1' },
    secondary_caretaker: { text: 'Secondary Caretaker', color: '#0284c7', bg: '#e0f2fe' },
    family_viewer: { text: 'Family Viewer', color: '#64748b', bg: '#f1f5f9' },
    elderly: { text: 'Elderly User', color: '#8b5cf6', bg: '#ede9fe' }
  };

  const currentRole = activeProfile?.role || 'primary_caretaker';
  const roleStyle = roleLabels[currentRole] || roleLabels.primary_caretaker;

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        minHeight: '66px',
        paddingTop: '8px',
        paddingBottom: '8px',
        gap: '12px'
      }}>
        {/* Left: Brand & Profile Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
          <div 
            onClick={() => setCurrentTab('dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #0d9488, #14b8a6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 3px 8px rgba(13, 148, 136, 0.25)',
              flexShrink: 0
            }}>
              <Heart size={20} fill="#ffffff" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.4px', lineHeight: 1 }}>
                Care<span style={{ color: '#0d9488' }}>Circle</span>
              </span>
              <span style={{ fontSize: '9px', fontWeight: 800, color: '#0d9488', background: '#ccfbf1', padding: '2px 5px', borderRadius: '4px', letterSpacing: '0.5px' }}>
                MEDS
              </span>
            </div>
          </div>

          {/* Active Profile Switcher */}
          {profiles.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#1e293b'
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }}></span>
                <span>{activeProfile?.display_name || 'Select Profile'}</span>
                <ChevronDown size={13} color="#64748b" />
              </button>

              {profileDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '120%',
                  left: 0,
                  width: '230px',
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                  padding: '6px',
                  zIndex: 200
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', padding: '6px 10px', textTransform: 'uppercase' }}>
                    Care Profiles
                  </div>
                  {profiles.map(p => (
                    <div
                      key={p.id}
                      onClick={() => {
                        selectProfile(p);
                        setProfileDropdownOpen(false);
                      }}
                      style={{
                        padding: '7px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: activeProfile?.id === p.id ? '#f0fdfa' : 'transparent',
                        color: activeProfile?.id === p.id ? '#0d9488' : '#334155',
                        fontWeight: activeProfile?.id === p.id ? 700 : 500,
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>{p.display_name}</span>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>#{p.id}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '4px', paddingTop: '4px' }}>
                    <button
                      onClick={() => { setProfileDropdownOpen(false); onOpenCreateProfile(); }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '6px 10px',
                        fontSize: '11px',
                        color: '#0d9488',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Plus size={13} /> Add New Profile
                    </button>
                    <button
                      onClick={() => { setProfileDropdownOpen(false); onOpenJoinProfile(); }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '6px 10px',
                        fontSize: '11px',
                        color: '#64748b',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Shield size={13} /> Join via Passcode
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Navigation Tabs (Desktop) */}
        <nav className="desktop-nav">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Heart },
            { id: 'medications', label: 'Medications', icon: Pill },
            { id: 'carecircle', label: 'Care Circle', icon: Users },
            { id: 'analytics', label: 'Analytics', icon: BarChart2 },
            { id: 'elderly', label: 'Elderly Mode', icon: Eye, special: true }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 11px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: isActive ? 700 : 500,
                  color: tab.special 
                    ? '#ffffff' 
                    : (isActive ? '#0d9488' : '#64748b'),
                  background: tab.special
                    ? (isActive ? '#7c3aed' : '#8b5cf6')
                    : (isActive ? '#f0fdfa' : 'transparent'),
                  border: isActive && !tab.special ? '1px solid #ccfbf1' : '1px solid transparent'
                }}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Cron Simulator, Role Badge & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Simulate Cron Button */}
          <button
            onClick={handleTriggerCron}
            disabled={cronRunning}
            title="Trigger reminder & escalation cycle on-demand"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 700,
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fde68a'
            }}
          >
            <RefreshCw size={13} className={cronRunning ? 'animate-spin' : ''} />
            <span className="cron-btn-text">{cronFeedback || 'Cron'}</span>
          </button>

          {/* User info & role badge (Desktop) */}
          <div className="user-role-badge" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>
              {user?.full_name?.split(' ')[0]}
            </span>
            <span style={{
              display: 'inline-block',
              fontSize: '9.5px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '10px',
              background: roleStyle.bg,
              color: roleStyle.color,
              marginTop: '2px',
              lineHeight: 1.2
            }}>
              {roleStyle.text}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            title="Log Out"
            style={{
              padding: '6px',
              borderRadius: '6px',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        {[
          { id: 'dashboard', label: 'Home', icon: Heart },
          { id: 'medications', label: 'Meds', icon: Pill },
          { id: 'carecircle', label: 'Circle', icon: Users },
          { id: 'analytics', label: 'Analytics', icon: BarChart2 },
          { id: 'elderly', label: 'Elderly', icon: Eye, special: true }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          let className = 'mobile-nav-item';
          if (isActive) {
            className += tab.special ? ' active-elderly' : ' active';
          }
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={className}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};
