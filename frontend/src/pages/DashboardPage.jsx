import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getTodayDoses, recordDoseAction, acknowledgeDoseEscalation, 
  getTodayCheckin, getAppointments, getAnalytics 
} from '../api/client';
import { 
  Clock, CheckCircle2, AlertTriangle, AlertCircle, Calendar, 
  Flame, Bot, UserCheck, ShieldAlert, Sparkles, Plus, ExternalLink 
} from 'lucide-react';

export const DashboardPage = ({ onNavigateTab, onOpenAddAppointment, onOpenAssistedCheckin }) => {
  const { activeProfile, user } = useAuth();
  const [doses, setDoses] = useState([]);
  const [checkin, setCheckin] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [feedback, setFeedback] = useState('');

  const isViewer = activeProfile?.role === 'family_viewer';

  const loadDashboardData = async () => {
    if (!activeProfile) return;
    try {
      setLoading(true);
      const [dosesData, checkinData, apptsData, analyticsData] = await Promise.all([
        getTodayDoses(activeProfile.id),
        getTodayCheckin(activeProfile.id),
        getAppointments(activeProfile.id),
        getAnalytics(activeProfile.id)
      ]);
      setDoses(dosesData.doses || []);
      setCheckin(checkinData);
      setAppointments(apptsData.appointments || []);
      setAnalytics(analyticsData.summary || null);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Listen for manual cron trigger events
    const handleRefresh = () => loadDashboardData();
    window.addEventListener('refreshDashboard', handleRefresh);
    return () => window.removeEventListener('refreshDashboard', handleRefresh);
  }, [activeProfile]);

  const handleDoseAction = async (doseLogId, status) => {
    if (isViewer) return;
    try {
      setActionLoading(doseLogId);
      await recordDoseAction(doseLogId, status);
      setFeedback(`Dose marked as ${status}!`);
      setTimeout(() => setFeedback(''), 2500);
      await loadDashboardData();
    } catch (err) {
      alert(err.message || 'Action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcknowledgeEscalation = async (doseLogId) => {
    try {
      setActionLoading(doseLogId);
      const res = await acknowledgeDoseEscalation(doseLogId);
      setFeedback(res.message || 'Escalation cleared.');
      setTimeout(() => setFeedback(''), 3000);
      await loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to acknowledge.');
    } finally {
      setActionLoading(null);
    }
  };

  // Find any active unacknowledged escalation doses
  const activeEscalations = doses.filter(d => 
    d.status === 'missed' && d.escalation_level > 0 && !d.acknowledged_by
  );

  const takenCount = doses.filter(d => d.status === 'taken').length;
  const totalDosesToday = doses.length;
  const progressPercent = totalDosesToday > 0 ? Math.round((takenCount / totalDosesToday) * 100) : 0;

  const nextAppointment = appointments.find(a => new Date(a.appointment_datetime) >= new Date());

  if (loading) {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        <p>Loading {activeProfile?.display_name}'s care dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '32px 20px 80px' }}>
      
      {/* 🚨 CRITICAL ESCALATION BANNER */}
      {activeEscalations.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #fee2e2, #fef2f2)',
          border: '2px solid #ef4444',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#ef4444',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <ShieldAlert size={26} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#991b1b', marginBottom: '4px' }}>
                🚨 Urgent: Missed Dose Escalation Active!
              </h3>
              <p style={{ fontSize: '14px', color: '#7f1d1d' }}>
                <strong>{activeProfile?.display_name}</strong> has missed <strong>{activeEscalations[0].medication_name}</strong> ({activeEscalations[0].dosage}) scheduled for {activeEscalations[0].scheduled_time.split(' ')[1].slice(0, 5)}.
                {activeEscalations[0].escalation_level === 1 && ' Tier 1 Caretaker was notified.'}
                {activeEscalations[0].escalation_level === 2 && ' Escalated to Tier 2 (Primary Caretaker unacknowledged).'}
                {activeEscalations[0].escalation_level === 99 && ' CRITICAL: All-Hands Emergency Broadcast dispatched!'}
              </p>
            </div>
          </div>

          {!isViewer && (
            <button
              onClick={() => handleAcknowledgeEscalation(activeEscalations[0].dose_log_id)}
              disabled={actionLoading === activeEscalations[0].dose_log_id}
              style={{
                background: '#dc2626',
                color: '#ffffff',
                padding: '11px 20px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '14px',
                flexShrink: 0,
                boxShadow: '0 4px 10px rgba(220, 38, 38, 0.3)'
              }}
            >
              {actionLoading === activeEscalations[0].dose_log_id ? 'Clearing...' : 'Acknowledge & Clear Alarm'}
            </button>
          )}
        </div>
      )}

      {feedback && (
        <div style={{
          background: '#d1fae5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '20px',
          fontWeight: 600,
          fontSize: '14px'
        }}>
          {feedback}
        </div>
      )}

      {/* Overview KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        
        {/* Today's Adherence Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '22px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Today's Doses</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0d9488', background: '#ccfbf1', padding: '3px 8px', borderRadius: '12px' }}>
              {progressPercent}% Done
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
            {takenCount} <span style={{ fontSize: '16px', fontWeight: 600, color: '#94a3b8' }}>/ {totalDosesToday} doses</span>
          </div>
          {/* Progress bar */}
          <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', background: '#0d9488', transition: 'width 0.4s ease' }}></div>
          </div>
        </div>

        {/* 7-Day Adherence Score */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '22px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>7-Day Adherence</span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            {analytics?.adherence_rate_7d ?? 95}%
          </div>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            {analytics?.missed_doses_7d || 0} missed in past 7 days
          </span>
        </div>

        {/* Current Streak */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '22px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Adherence Streak</span>
            <Flame size={18} color="#f97316" fill="#f97316" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            {analytics?.current_streak_days ?? 2} <span style={{ fontSize: '16px', fontWeight: 600, color: '#94a3b8' }}>days</span>
          </div>
          <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>
            Consistent compliance streak
          </span>
        </div>

        {/* Next Doctor Appointment */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '22px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Next Appointment</span>
            <Calendar size={18} color="#0284c7" />
          </div>
          {nextAppointment ? (
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
                {nextAppointment.doctor_name}
              </div>
              <div style={{ fontSize: '13px', color: '#0284c7', fontWeight: 600 }}>
                {new Date(nextAppointment.appointment_datetime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '14px', color: '#94a3b8', fontStyle: 'italic' }}>
              No upcoming appointments
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Today's Timeline (Left 65%) + Wellbeing & Appointments (Right 35%) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.9fr 1.1fr', gap: '28px' }}>
        
        {/* Left Column: Today's Medication Timeline */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Today's Medication Timeline</h2>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            
            <button
              onClick={() => onNavigateTab('medications')}
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#0d9488',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Manage Medications <ExternalLink size={14} />
            </button>
          </div>

          {doses.length === 0 ? (
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '40px',
              textAlign: 'center',
              border: '1px solid #e2e8f0',
              color: '#94a3b8'
            }}>
              No medications scheduled for today. Add a new prescription in the Medications tab.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {doses.map((dose) => {
                const isTaken = dose.status === 'taken';
                const isMissed = dose.status === 'missed';
                const isPending = dose.status === 'pending';
                const timeOnly = dose.scheduled_time.split(' ')[1].slice(0, 5);

                return (
                  <div
                    key={dose.dose_log_id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '14px',
                      border: isMissed 
                        ? '2px solid #ef4444' 
                        : (isTaken ? '1px solid #e2e8f0' : '1px solid #cbd5e1'),
                      padding: '18px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      opacity: isTaken ? 0.85 : 1
                    }}
                  >
                    {/* Time + Med Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: isTaken ? '#d1fae5' : (isMissed ? '#fee2e2' : '#f1f5f9'),
                        color: isTaken ? '#065f46' : (isMissed ? '#991b1b' : '#334155'),
                        fontWeight: 800,
                        fontSize: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Clock size={16} />
                        {timeOnly}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                            {dose.medication_name}
                          </h4>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#475569',
                            background: '#f1f5f9',
                            padding: '2px 8px',
                            borderRadius: '6px'
                          }}>
                            {dose.dosage}
                          </span>
                        </div>

                        {dose.instructions && (
                          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>
                            {dose.instructions}
                          </p>
                        )}

                        {isTaken && (
                          <p style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, marginTop: '4px' }}>
                            ✓ Taken at {dose.action_taken_at?.split(' ')[1]?.slice(0, 5) || 'scheduled time'} {dose.action_by_name ? `by ${dose.action_by_name}` : ''}
                          </p>
                        )}
                        {dose.acknowledged_by_name && (
                          <p style={{ fontSize: '12px', color: '#0d9488', fontWeight: 600 }}>
                            ✓ Alert cleared by {dose.acknowledged_by_name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isTaken ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#059669',
                          fontWeight: 700,
                          fontSize: '13px',
                          background: '#ecfdf5',
                          padding: '6px 14px',
                          borderRadius: '8px'
                        }}>
                          <CheckCircle2 size={16} /> Completed
                        </span>
                      ) : (
                        <>
                          {!isViewer ? (
                            <>
                              <button
                                onClick={() => handleDoseAction(dose.dose_log_id, 'taken')}
                                disabled={actionLoading === dose.dose_log_id}
                                style={{
                                  background: '#0d9488',
                                  color: '#ffffff',
                                  padding: '9px 16px',
                                  borderRadius: '8px',
                                  fontWeight: 700,
                                  fontSize: '13px',
                                  boxShadow: '0 2px 5px rgba(13, 148, 136, 0.2)'
                                }}
                              >
                                {actionLoading === dose.dose_log_id ? 'Updating...' : 'Mark Taken'}
                              </button>
                              <button
                                onClick={() => handleDoseAction(dose.dose_log_id, 'skipped')}
                                disabled={actionLoading === dose.dose_log_id}
                                style={{
                                  background: '#f1f5f9',
                                  color: '#64748b',
                                  padding: '9px 14px',
                                  borderRadius: '8px',
                                  fontWeight: 600,
                                  fontSize: '13px'
                                }}
                              >
                                Skip
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                              View Only
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: AI Wellbeing Check-In & Doctor Appointments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Daily AI Wellbeing Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#f5f3ff',
                  color: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Bot size={18} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>AI Daily Wellbeing</h3>
              </div>
              
              {checkin?.already_submitted && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: checkin.checkin.risk_level === 'high' ? '#fee2e2' : (checkin.checkin.risk_level === 'moderate' ? '#fef3c7' : '#d1fae5'),
                  color: checkin.checkin.risk_level === 'high' ? '#991b1b' : (checkin.checkin.risk_level === 'moderate' ? '#92400e' : '#065f46')
                }}>
                  {checkin.checkin.risk_level.toUpperCase()} RISK
                </span>
              )}
            </div>

            {checkin?.already_submitted ? (
              <div>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                  Patient response to "{checkin.prompt}":
                </p>
                <div style={{
                  background: '#f8fafc',
                  borderLeft: '3px solid #7c3aed',
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontStyle: 'italic',
                  color: '#334155',
                  marginBottom: '12px'
                }}>
                  "{checkin.checkin.response_text}"
                </div>
                <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>
                  Clinical AI Summary:
                </div>
                <p style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                  {checkin.checkin.ai_summary}
                </p>

                {checkin.checkin.flagged_symptoms?.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {checkin.checkin.flagged_symptoms.map((s, idx) => (
                      <span key={idx} style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        background: '#fee2e2',
                        color: '#b91c1c',
                        padding: '2px 8px',
                        borderRadius: '6px'
                      }}>
                        ⚠️ {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                  {activeProfile?.display_name} hasn't completed today's morning wellbeing prompt yet.
                </p>
                {!isViewer && (
                  <button
                    onClick={onOpenAssistedCheckin}
                    style={{
                      width: '100%',
                      background: '#7c3aed',
                      color: '#ffffff',
                      padding: '10px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '13px',
                      boxShadow: '0 4px 10px rgba(124, 58, 237, 0.25)'
                    }}
                  >
                    Record Assisted Check-in
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Doctor Appointments Mini-List */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#0284c7" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>Upcoming Visits</h3>
              </div>
              {!isViewer && (
                <button
                  onClick={onOpenAddAppointment}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <Plus size={14} /> New
                </button>
              )}
            </div>

            {appointments.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                No appointments currently scheduled.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {appointments.slice(0, 3).map((appt) => (
                  <div
                    key={appt.id}
                    style={{
                      padding: '12px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #f1f5f9'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                        {appt.doctor_name}
                      </div>
                      <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700 }}>
                        {new Date(appt.appointment_datetime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {appt.specialty} • {appt.location || 'Clinic'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
