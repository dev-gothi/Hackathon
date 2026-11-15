import React, { useState } from 'react';
import { Modal } from '../Modal';
import { joinProfile } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Shield } from 'lucide-react';

export const JoinProfileModal = ({ isOpen, onClose }) => {
  const { refreshProfiles, selectProfile } = useAuth();
  const [profileId, setProfileId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [role, setRole] = useState('secondary_caretaker');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      const res = await joinProfile({
        profile_id: Number(profileId),
        passcode: passcode.trim(),
        role
      });
      await refreshProfiles();
      if (res.profile) selectProfile(res.profile);
      onClose();
      setProfileId('');
      setPasscode('');
    } catch (err) {
      setError(err.message || 'Incorrect profile ID or passcode.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join Profile via Shared Passcode">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '12px', borderRadius: '10px', fontSize: '13px', color: '#0f766e', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={18} /> Enter the Profile ID and 6-digit passcode provided by the Primary Caretaker.
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Profile ID
          </label>
          <input
            type="number"
            required
            placeholder="e.g. 1"
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            6-Digit Shared Passcode
          </label>
          <input
            type="text"
            required
            placeholder="e.g. 482910"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', letterSpacing: '2px', fontWeight: 700 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Your Role in this Care Circle
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          >
            <option value="secondary_caretaker">Secondary Caretaker (Tier 2 Escalations, Manage Doses)</option>
            <option value="family_viewer">Family Viewer (Read-only, Appointment Reminders)</option>
            <option value="elderly">Elderly Patient (Patient Interface)</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button type="button" onClick={onClose} style={{ padding: '9px 16px', borderRadius: '8px', background: '#f1f5f9', color: '#475569' }}>
            Cancel
          </button>
          <button type="submit" disabled={loading} style={{ padding: '9px 20px', borderRadius: '8px', background: '#0d9488', color: '#ffffff', fontWeight: 700 }}>
            {loading ? 'Verifying...' : 'Link Care Profile'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
