import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMedications, deleteMedication } from '../api/client';
import { Pill, Plus, Clock, AlertTriangle, ShieldCheck, Trash2, CheckCircle2 } from 'lucide-react';

export const MedicationsPage = ({ onOpenAddMedication }) => {
  const { activeProfile } = useAuth();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  const isViewer = activeProfile?.role === 'family_viewer';

  const loadMedications = async () => {
    if (!activeProfile) return;
    try {
      setLoading(true);
      const data = await getMedications(activeProfile.id);
      setMedications(data.medications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedications();
  }, [activeProfile]);

  const handleDeactivate = async (medId) => {
    if (!confirm('Are you sure you want to discontinue/archive this medication?')) return;
    try {
      await deleteMedication(medId);
      setFeedback('Medication discontinued.');
      setTimeout(() => setFeedback(''), 2500);
      loadMedications();
    } catch (err) {
      alert(err.message || 'Failed to deactivate.');
    }
  };

  return (
    <div className="container page-container" style={{ padding: '24px 20px 80px' }}>
      <div className="page-header-row">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
            {activeProfile?.display_name}'s Medications
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>
            Active prescriptions, dosage timings, and automated drug interaction safeguards.
          </p>
        </div>

        {!isViewer && (
          <button
            onClick={onOpenAddMedication}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#0d9488',
              color: '#ffffff',
              padding: '11px 18px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              boxShadow: '0 4px 10px rgba(13, 148, 136, 0.25)'
            }}
          >
            <Plus size={18} /> Add Medication
          </button>
        )}
      </div>

      {feedback && (
        <div style={{
          background: '#d1fae5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '20px',
          fontWeight: 600
        }}>
          {feedback}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading medications...</p>
      ) : medications.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '48px',
          textAlign: 'center',
          border: '1px solid #e2e8f0'
        }}>
          <Pill size={40} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>No Medications Added</h3>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
            Add prescriptions and schedule daily dose times to enable automated reminders and escalation alerts.
          </p>
          {!isViewer && (
            <button
              onClick={onOpenAddMedication}
              style={{
                background: '#0d9488',
                color: '#ffffff',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: 700
              }}
            >
              Add First Medication
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
          {medications.map((med) => (
            <div
              key={med.id}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: med.is_active ? '1px solid #e2e8f0' : '1px dashed #cbd5e1',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                opacity: med.is_active ? 1 : 0.65,
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                    {med.name}
                  </h3>
                  <span style={{
                    display: 'inline-block',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0d9488',
                    background: '#ccfbf1',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    marginTop: '4px'
                  }}>
                    {med.dosage}
                  </span>
                </div>

                {!isViewer && med.is_active ? (
                  <button
                    onClick={() => handleDeactivate(med.id)}
                    title="Discontinue Medication"
                    style={{
                      padding: '6px',
                      borderRadius: '6px',
                      color: '#94a3b8'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>

              {med.instructions && (
                <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', lineHeight: 1.4 }}>
                  {med.instructions}
                </p>
              )}

              {/* Schedule Timing Pills */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                  Daily Schedule
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {med.schedules?.map((s) => (
                    <span
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#334155',
                        background: '#f1f5f9',
                        padding: '4px 10px',
                        borderRadius: '8px'
                      }}
                    >
                      <Clock size={13} color="#64748b" />
                      {s.time_of_day}
                    </span>
                  ))}
                </div>
              </div>

              {/* NIH RxNorm link */}
              {med.rxcui && (
                <div style={{ marginTop: '12px', fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={13} /> Linked to NIH RxNorm database (RxCUI #{med.rxcui})
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
