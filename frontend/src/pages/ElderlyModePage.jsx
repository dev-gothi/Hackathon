import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTodayDoses, recordDoseAction, getTodayCheckin, submitCheckin } from '../api/client';
import { Heart, Check, Clock, Bot, Send } from 'lucide-react';

export const ElderlyModePage = () => {
  const { activeProfile } = useAuth();
  const [doses, setDoses] = useState([]);
  const [checkin, setCheckin] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!activeProfile) return;
    try {
      setLoading(true);
      const [dosesData, checkinData] = await Promise.all([
        getTodayDoses(activeProfile.id),
        getTodayCheckin(activeProfile.id)
      ]);
      setDoses(dosesData.doses || []);
      setCheckin(checkinData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProfile]);

  const handleTakeDose = async (doseLogId, medName) => {
    try {
      await recordDoseAction(doseLogId, 'taken');
      setFeedback(`Great job! You took your ${medName}. Your family has been notified.`);
      setTimeout(() => setFeedback(''), 4500);
      loadData();
    } catch (err) {
      alert(err.message || 'Could not record dose.');
    }
  };

  const handleCheckinSubmit = async (e) => {
    e.preventDefault();
    if (!responseText.trim()) return;
    try {
      setIsSubmitting(true);
      await submitCheckin(activeProfile.id, { response_text: responseText, is_assisted: false });
      setFeedback('Thank you! Your daily check-in was received and shared with your care team.');
      setResponseText('');
      setTimeout(() => setFeedback(''), 4500);
      loadData();
    } catch (err) {
      alert(err.message || 'Submission error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingDoses = doses.filter(d => d.status === 'pending');
  const takenDoses = doses.filter(d => d.status === 'taken');

  return (
    <div style={{
      minHeight: 'calc(100vh - 66px)',
      background: '#f8fafc',
      padding: '28px 16px 60px'
    }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        
        {/* Elder-Friendly Clean Greeting Banner */}
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '24px',
          textAlign: 'center',
          border: '1.5px solid #0d9488',
          boxShadow: '0 4px 15px rgba(13, 148, 136, 0.08)',
          marginBottom: '24px'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: '#ccfbf1',
            color: '#0f766e',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '10px'
          }}>
            <Heart size={28} fill="#0d9488" />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            Hello, {activeProfile?.display_name}!
          </h1>
          <p style={{ fontSize: '15px', color: '#475569', fontWeight: 500 }}>
            Here are your scheduled medications and morning wellbeing check-in.
          </p>
        </div>

        {feedback && (
          <div style={{
            background: '#d1fae5',
            border: '1.5px solid #10b981',
            color: '#065f46',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            fontSize: '15px',
            fontWeight: 700,
            textAlign: 'center'
          }}>
            {feedback}
          </div>
        )}

        {/* Section 1: Scheduled Medications to Take */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
            🔔 Due Medications
          </h2>

          {pendingDoses.length === 0 ? (
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              border: '1.5px dashed #cbd5e1'
            }}>
              <Check size={36} color="#10b981" style={{ margin: '0 auto 8px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                All current doses completed!
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                You are all caught up for right now. Great job keeping up with your health!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingDoses.map((dose) => (
                <div
                  key={dose.dose_log_id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    padding: '18px 22px',
                    border: '1.5px solid #0d9488',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} /> Scheduled for {dose.scheduled_time.split(' ')[1].slice(0, 5)}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                      {dose.medication_name} ({dose.dosage})
                    </div>
                    {dose.instructions && (
                      <p style={{ fontSize: '14px', color: '#64748b', marginTop: '3px' }}>
                        {dose.instructions}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleTakeDose(dose.dose_log_id, dose.medication_name)}
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#ffffff',
                      padding: '11px 22px',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: 800,
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <Check size={18} /> I Took This
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Daily Wellbeing Check-in */}
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          marginBottom: '28px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: '#f3e8ff',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={20} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Daily Wellbeing Check-in
            </h3>
          </div>

          <p style={{ fontSize: '15px', color: '#334155', fontWeight: 600, marginBottom: '14px' }}>
            "How are you feeling today? Any pain, dizziness, or anything you'd like your family to know?"
          </p>

          {checkin?.already_submitted ? (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a', marginBottom: '6px' }}>
                ✓ Today's check-in was submitted
              </div>
              <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#475569' }}>
                "{checkin.checkin?.response_text}"
              </p>
            </div>
          ) : (
            <form onSubmit={handleCheckinSubmit}>
              <textarea
                rows={3}
                required
                placeholder="Type how you feel (e.g. I am feeling good today, rested well...)"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '15px',
                  outline: 'none',
                  marginBottom: '12px',
                  lineHeight: 1.4
                }}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  background: '#7c3aed',
                  color: '#ffffff',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: 800,
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <Send size={16} />
                {isSubmitting ? 'Sending to Care Circle...' : 'Send Message to Family'}
              </button>
            </form>
          )}
        </div>

        {/* Section 3: Completed Earlier Today */}
        {takenDoses.length > 0 && (
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
              ✓ Completed Earlier Today
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {takenDoses.map((dose) => (
                <div
                  key={dose.dose_log_id}
                  style={{
                    background: '#ffffff',
                    padding: '12px 18px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                    color: '#64748b'
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#334155' }}>{dose.medication_name} ({dose.dosage})</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Taken</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
