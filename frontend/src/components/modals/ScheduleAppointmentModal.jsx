import React, { useState } from 'react';
import { Modal } from '../Modal';
import { createAppointment } from '../../api/client';

export const ScheduleAppointmentModal = ({ isOpen, onClose, profileId, onAppointmentAdded }) => {
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [location, setLocation] = useState('');
  const [datetime, setDatetime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      await createAppointment(profileId, {
        doctor_name: doctorName.trim(),
        specialty: specialty.trim(),
        location: location.trim(),
        appointment_datetime: datetime,
        notes: notes.trim()
      });
      onAppointmentAdded();
      onClose();
      setDoctorName('');
      setSpecialty('');
      setLocation('');
      setDatetime('');
      setNotes('');
    } catch (err) {
      setError(err.message || 'Failed to schedule appointment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Doctor Appointment">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Doctor or Clinic Name
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Dr. Robert Vance"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Specialty
            </label>
            <input
              type="text"
              placeholder="e.g. Cardiology, Optometry"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Date & Time
            </label>
            <input
              type="datetime-local"
              required
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Location / Address
          </label>
          <input
            type="text"
            placeholder="e.g. Memorial Heart Center, Suite 402"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Preparation Notes
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Fast 8 hours prior; bring current medication bottles"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button type="button" onClick={onClose} style={{ padding: '9px 16px', borderRadius: '8px', background: '#f1f5f9', color: '#475569' }}>
            Cancel
          </button>
          <button type="submit" disabled={loading} style={{ padding: '9px 20px', borderRadius: '8px', background: '#0284c7', color: '#ffffff', fontWeight: 700 }}>
            {loading ? 'Saving...' : 'Save Appointment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
