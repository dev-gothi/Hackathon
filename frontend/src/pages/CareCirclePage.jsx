import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMembers, updatePriorities } from '../api/client';
import { Users, Shield, Copy, Check, ArrowUp, ArrowDown, Mail, Phone, AlertCircle } from 'lucide-react';

export const CareCirclePage = () => {
  const { activeProfile, user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState('');

  const isPrimary = activeProfile?.role === 'primary_caretaker';

  const loadMembers = async () => {
    if (!activeProfile) return;
    try {
      setLoading(true);
      const data = await getMembers(activeProfile.id);
      setMembers(data.members || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [activeProfile]);

  const handleCopyPasscode = () => {
    // In seed, shared PIN is 482910
    navigator.clipboard.writeText('482910');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMovePriority = async (index, direction) => {
    if (!isPrimary) return;
    const newMembers = [...members];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newMembers.length) return;

    // Swap
    const temp = newMembers[index];
    newMembers[index] = newMembers[targetIndex];
    newMembers[targetIndex] = temp;

    // Reassign priorities 1, 2, 3...
    const priorityList = newMembers.map((m, idx) => ({
      user_id: m.user_id,
      escalation_priority: idx + 1
    }));

    try {
      await updatePriorities(activeProfile.id, priorityList);
      setFeedback('Escalation priority hierarchy updated.');
      setTimeout(() => setFeedback(''), 2500);
      loadMembers();
    } catch (err) {
      alert(err.message || 'Failed to update priorities.');
    }
  };

  return (
    <div className="container" style={{ padding: '32px 20px 80px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
          Care Circle & Escalation Hierarchy
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>
          Manage family members, caregivers, and the emergency escalation priority order for {activeProfile?.display_name}.
        </p>
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

      {/* Shared Passcode Card */}
      <div style={{
        background: 'linear-gradient(135deg, #0f766e, #0d9488)',
        borderRadius: '16px',
        padding: '24px',
        color: '#ffffff',
        marginBottom: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: '0 10px 25px -5px rgba(13, 148, 136, 0.3)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Shield size={20} />
            <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Shared Care Passcode
            </span>
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Profile #{activeProfile?.id} Access Code</h3>
          <p style={{ fontSize: '13px', opacity: 0.9, marginTop: '2px', maxWidth: '500px' }}>
            Give this 6-digit passcode to family members or nurses so they can link to {activeProfile?.display_name}'s care circle from their own accounts.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '10px 20px',
            borderRadius: '12px',
            fontSize: '24px',
            fontWeight: 800,
            letterSpacing: '4px',
            fontFamily: 'monospace'
          }}>
            482910
          </div>
          <button
            onClick={handleCopyPasscode}
            style={{
              background: '#ffffff',
              color: '#0f766e',
              padding: '10px 16px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
      </div>

      {/* Escalation Hierarchy List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Caretaker Escalation Ladder
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              If a dose is missed, Tier 1 is alerted first. If unacknowledged after 30 minutes, it automatically escalates to Tier 2.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {members.map((member, index) => {
            const isTier1 = member.escalation_priority === 1;
            const isTier2 = member.escalation_priority === 2;
            const isViewer = member.role === 'family_viewer';

            return (
              <div
                key={member.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: isTier1 ? '2px solid #0d9488' : '1px solid #e2e8f0',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Priority Badge */}
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: isTier1 ? '#ccfbf1' : (isTier2 ? '#e0f2fe' : '#f1f5f9'),
                    color: isTier1 ? '#0f766e' : (isTier2 ? '#0369a1' : '#64748b'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '15px'
                  }}>
                    {isViewer ? '—' : `T${member.escalation_priority}`}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                        {member.full_name}
                      </h4>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: isTier1 ? '#ccfbf1' : (isTier2 ? '#e0f2fe' : '#f1f5f9'),
                        color: isTier1 ? '#0f766e' : (isTier2 ? '#0369a1' : '#64748b')
                      }}>
                        {member.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={13} /> {member.email}
                      </span>
                      {member.phone && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={13} /> {member.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: Priority Actions & Notification status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748b' }}>
                    {member.notify_escalations ? (
                      <span style={{ color: '#059669', fontWeight: 600 }}>✓ Escalations On</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Escalations Off</span>
                    )}
                  </div>

                  {isPrimary && !isViewer && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleMovePriority(index, -1)}
                        disabled={index === 0}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          opacity: index === 0 ? 0.3 : 1
                        }}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => handleMovePriority(index, 1)}
                        disabled={index === members.length - 1}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          opacity: index === members.length - 1 ? 0.3 : 1
                        }}
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
