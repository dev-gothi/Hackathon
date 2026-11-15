import React, { useState } from 'react';
import { Modal } from '../Modal';
import { submitCheckin } from '../../api/client';
import { Bot, Sparkles, AlertTriangle } from 'lucide-react';

export const AssistedCheckinModal = ({ isOpen, onClose, profileId, patientName, onCheckinSubmitted }) => {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!response.trim()) return;
    setError('');
    try {
      setLoading(true);
      const res = await submitCheckin(profileId, {
        response_text: response.trim(),
        is_assisted: true
      });
      setAnalysisResult(res.checkin);
      onCheckinSubmitted();
    } catch (err) {
      setError(err.message || 'Check-in evaluation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    setResponse('');
    setAnalysisResult(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleFinish} title="Assisted Daily Wellbeing Check-in">
      {!analysisResult ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '14px', borderRadius: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#6d28d9', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bot size={16} /> Verbal Prompt to ask {patientName}:
            </div>
            <p style={{ fontSize: '14px', color: '#4c1d95', fontStyle: 'italic', fontWeight: 500 }}>
              "How are you feeling today? Any dizziness, nausea, chest pain, or joint discomfort?"
            </p>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Elderly Patient's Verbal Response (Type or Dictate):
            </label>
            <textarea
              rows={4}
              required
              placeholder="e.g. She says she felt a bit lightheaded when standing up this morning, but had water and feels slightly better now..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={handleFinish} style={{ padding: '9px 16px', borderRadius: '8px', background: '#f1f5f9', color: '#475569' }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                background: '#7c3aed',
                color: '#ffffff',
                fontWeight: 700,
                boxShadow: '0 4px 10px rgba(124, 58, 237, 0.25)'
              }}
            >
              {loading ? 'Evaluating with AI...' : 'Submit & Analyze'}
            </button>
          </div>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: analysisResult.risk_level === 'high' ? '#fee2e2' : (analysisResult.risk_level === 'moderate' ? '#fef3c7' : '#d1fae5'),
            border: `2px solid ${analysisResult.risk_level === 'high' ? '#ef4444' : (analysisResult.risk_level === 'moderate' ? '#f59e0b' : '#10b981')}`,
            borderRadius: '12px',
            padding: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', color: analysisResult.risk_level === 'high' ? '#991b1b' : (analysisResult.risk_level === 'moderate' ? '#92400e' : '#065f46') }}>
                {analysisResult.risk_level} RISK LEVEL DETECTED
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#475569' }}>
                Sentiment: {analysisResult.sentiment}
              </span>
            </div>

            <p style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600, marginTop: '6px' }}>
              {analysisResult.ai_summary}
            </p>

            {analysisResult.flagged_symptoms?.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
                {analysisResult.flagged_symptoms.map((s, idx) => (
                  <span key={idx} style={{ background: '#ffffff', color: '#b91c1c', border: '1px solid #fca5a5', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                    ⚠️ {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          {['moderate', 'high'].includes(analysisResult.risk_level) && (
            <p style={{ fontSize: '13px', color: '#b91c1c', fontWeight: 600 }}>
              📧 High priority email notification has been dispatched to all Primary & Secondary Caretakers!
            </p>
          )}

          <button
            onClick={handleFinish}
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: '#0f172a',
              color: '#ffffff',
              fontWeight: 700,
              marginTop: '8px'
            }}
          >
            Done
          </button>
        </div>
      )}
    </Modal>
  );
};
