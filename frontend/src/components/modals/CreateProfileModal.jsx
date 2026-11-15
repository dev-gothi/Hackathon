import React, { useState } from 'react';
import { Modal } from '../Modal';
import { createProfile } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const CreateProfileModal = ({ isOpen, onClose }) => {
  const { refreshProfiles, selectProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [dob, setDob] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passcode.length < 4) {
      setError('Passcode must be at least 4 digits/characters.');
      return;
    }
    setError('');
    try {
      setLoading(true);
      const res = await createProfile({
        display_name: displayName.trim(),
        dob: dob || null,
        emergency_phone: emergencyPhone.trim() || null,
        passcode: passcode.trim()
      });
      await refreshProfiles();
      if (res.profile) selectProfile(res.profile);
      onClose();
      setDisplayName('');
      setDob('');
      setEmergencyPhone('');
      setPasscode('');
    } catch (err) {
      setError(err.message || 'Failed to create profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Elderly Care Profile">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Elderly Individual's Name
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Grandma Rose, Dad, Arthur Miller"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Date of Birth
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Emergency Phone
            </label>
            <input
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Set 6-Digit Shared Access Passcode
          </label>
          <input
            type="text"
            required
            maxLength={10}
            placeholder="e.g. 482910"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', letterSpacing: '2px', fontWeight: 700 }}
          />
          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
            Share this PIN with family members or caregivers to link to this profile.
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button type="button" onClick={onClose} style={{ padding: '9px 16px', borderRadius: '8px', background: '#f1f5f9', color: '#475569' }}>
            Cancel
          </button>
          <button type="submit" disabled={loading} style={{ padding: '9px 20px', borderRadius: '8px', background: '#0d9488', color: '#ffffff', fontWeight: 700 }}>
            {loading ? 'Creating...' : 'Create Care Profile'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
