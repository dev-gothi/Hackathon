import React, { useState } from 'react';
import { Modal } from '../Modal';
import { checkInteractions, addMedication } from '../../api/client';
import { AlertTriangle, ShieldAlert, CheckCircle, Clock } from 'lucide-react';

export const AddMedicationModal = ({ isOpen, onClose, profileId, onMedicationAdded }) => {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [times, setTimes] = useState(['08:00']);
  const [gracePeriod, setGracePeriod] = useState(30);
  
  // Interaction check state
  const [checkingInteractions, setCheckingInteractions] = useState(false);
  const [interactionResult, setInteractionResult] = useState(null);
  const [overrideWarning, setOverrideWarning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNameBlur = async () => {
    if (!name.trim()) return;
    try {
      setCheckingInteractions(true);
      const res = await checkInteractions(profileId, name.trim());
      setInteractionResult(res);
      setOverrideWarning(false);
    } catch (err) {
      console.warn('Interaction check error:', err);
    } finally {
      setCheckingInteractions(false);
    }
  };

  const handleAddTimeSlot = () => {
    setTimes([...times, '20:00']);
  };

  const handleTimeChange = (index, value) => {
    const updated = [...times];
    updated[index] = value;
    setTimes(updated);
  };

  const handleRemoveTime = (index) => {
    if (times.length <= 1) return;
    setTimes(times.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // If severe interaction is detected and not overridden, block saving
    if (interactionResult?.hasInteractions && !overrideWarning) {
      setError('Please review the drug interaction warning below before proceeding.');
      return;
    }

    try {
      setLoading(true);
      await addMedication(profileId, {
        name: name.trim(),
        dosage: dosage.trim(),
        instructions: instructions.trim(),
        times,
        grace_period_mins: Number(gracePeriod) || 30
      });
      onMedicationAdded();
      onClose();
      // Reset form
      setName('');
      setDosage('');
      setInstructions('');
      setTimes(['08:00']);
      setInteractionResult(null);
      setOverrideWarning(false);
    } catch (err) {
      setError(err.message || 'Failed to add medication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Medication" maxWidth="600px">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '10px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* Drug Name & Dosage */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Medication Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Lisinopril, Warfarin, Metformin"
              value={name}
              onChange={(e) => { setName(e.target.value); setInteractionResult(null); }}
              onBlur={handleNameBlur}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                outline: 'none'
              }}
            />
            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
              *Automatically cross-checked against NIH RxNav drug safety database
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Dosage
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 10mg, 1 tablet"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Live Drug Interaction Banner */}
        {checkingInteractions && (
          <div style={{ fontSize: '12px', color: '#0d9488', fontWeight: 600 }}>
            Checking drug interactions against active prescriptions...
          </div>
        )}

        {interactionResult?.hasInteractions && (
          <div style={{
            background: '#fff1f2',
            border: '2px solid #f43f5e',
            borderRadius: '12px',
            padding: '16px',
            color: '#881337'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldAlert size={20} color="#e11d48" />
              <strong style={{ fontSize: '14px', color: '#9f1239' }}>
                ⚠️ High-Risk Drug Interaction Detected!
              </strong>
            </div>

            {interactionResult.warnings.map((w, idx) => (
              <div key={idx} style={{ background: '#ffe4e6', padding: '10px', borderRadius: '8px', marginBottom: '8px', fontSize: '12px' }}>
                <strong>{w.drug1} + {w.drug2}:</strong> {w.description}
                <div style={{ fontSize: '11px', color: '#be123c', marginTop: '4px', fontWeight: 600 }}>
                  Severity: {w.severity.toUpperCase()} • Source: {w.source}
                </div>
              </div>
            ))}

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#4c0519', cursor: 'pointer', marginTop: '8px' }}>
              <input
                type="checkbox"
                checked={overrideWarning}
                onChange={(e) => setOverrideWarning(e.target.checked)}
              />
              Doctor has approved this combination / Override with clinical acknowledgment
            </label>
          </div>
        )}

        {/* Instructions */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Instructions / Meal Timing
          </label>
          <input
            type="text"
            placeholder="e.g. Take with a glass of water after breakfast"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              outline: 'none'
            }}
          />
        </div>

        {/* Daily Schedule Timings */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Daily Dose Times (24h format)
            </label>
            <button
              type="button"
              onClick={handleAddTimeSlot}
              style={{ fontSize: '12px', fontWeight: 700, color: '#0d9488' }}
            >
              + Add Dose Time
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {times.map((t, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="time"
                  required
                  value={t}
                  onChange={(e) => handleTimeChange(idx, e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                />
                {times.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTime(idx)}
                    style={{ color: '#94a3b8', fontSize: '16px', padding: '0 4px' }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Grace Period */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Missed Dose Escalation Window (Minutes)
          </label>
          <input
            type="number"
            min={5}
            max={180}
            value={gracePeriod}
            onChange={(e) => setGracePeriod(e.target.value)}
            style={{
              width: '120px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1'
            }}
          />
          <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '10px' }}>
            Minutes after scheduled time before caretaker is alerted
          </span>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              background: '#f1f5f9',
              color: '#475569',
              fontWeight: 600
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 22px',
              borderRadius: '8px',
              background: '#0d9488',
              color: '#ffffff',
              fontWeight: 700,
              boxShadow: '0 4px 10px rgba(13, 148, 136, 0.25)'
            }}
          >
            {loading ? 'Saving Prescription...' : 'Save Medication'}
          </button>
        </div>

      </form>
    </Modal>
  );
};
