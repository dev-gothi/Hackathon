import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAnalytics } from '../api/client';
import { BarChart2, CheckCircle, Flame, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

export const AnalyticsPage = () => {
  const { activeProfile } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!activeProfile) return;
      try {
        setLoading(true);
        const res = await getAnalytics(activeProfile.id);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [activeProfile]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        Loading adherence analytics...
      </div>
    );
  }

  const { summary, patterns_by_time, medication_breakdown, timeline_14d } = data || {};

  return (
    <div className="container page-container" style={{ padding: '24px 20px 80px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
          Adherence Analytics & Health Trends
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>
          Historical compliance insights, missed-dose patterns, and routine consistency metrics for {activeProfile?.display_name}.
        </p>
      </div>

      {/* Main KPI Row */}
      <div className="kpi-grid">
        
        {/* 7-Day Rate */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>7-Day Compliance</span>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f766e', marginTop: '8px' }}>
            {summary?.adherence_rate_7d}%
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            {summary?.taken_doses_7d} taken of {summary?.total_doses_7d} scheduled
          </p>
        </div>

        {/* 30-Day Rate */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>30-Day Long-Term</span>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#0284c7', marginTop: '8px' }}>
            {summary?.adherence_rate_30d}%
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Monthly overall adherence score
          </p>
        </div>

        {/* Streak */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Perfect Days Streak</span>
            <Flame size={20} color="#f97316" fill="#f97316" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#f97316', marginTop: '8px' }}>
            {summary?.current_streak_days} <span style={{ fontSize: '18px', color: '#94a3b8' }}>days</span>
          </div>
          <p style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600, marginTop: '4px' }}>
            Consecutive 100% adherence
          </p>
        </div>

        {/* Missed Doses 7d */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Missed (7 Days)</span>
          <div style={{ fontSize: '32px', fontWeight: 800, color: summary?.missed_doses_7d > 0 ? '#ef4444' : '#10b981', marginTop: '8px' }}>
            {summary?.missed_doses_7d}
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            {summary?.skipped_doses_7d} skipped intentionally
          </p>
        </div>
      </div>

      {/* Two Column Section: Time of Day Patterns + 14-Day Trend */}
      <div className="analytics-two-col">
        
        {/* Time-of-Day Missed Dose Patterns */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Clock size={18} color="#0d9488" />
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              Missed Dose Patterns by Time of Day
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
            Pinpoint what time of day adherence tends to dip so caretakers can intervene proactively.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {patterns_by_time?.map((item, idx) => {
              const missed = item.missed_doses || 0;
              const total = item.total_doses || 1;
              const missedPercent = Math.round((missed / total) * 100);

              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#334155' }}>{item.time_of_day}</span>
                    <span style={{ color: missed > 0 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                      {missed} missed ({missedPercent}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${missedPercent}%`,
                      height: '100%',
                      background: missedPercent > 20 ? '#ef4444' : '#f59e0b',
                      borderRadius: '4px'
                    }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 14-Day Compliance Bar Trend */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <TrendingUp size={18} color="#0284c7" />
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              14-Day Daily Adherence
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
            Daily breakdown of doses successfully taken (green) vs missed (red).
          </p>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '140px', gap: '6px' }}>
            {timeline_14d?.map((day, idx) => {
              const total = day.total || 1;
              const takenHeight = Math.round((day.taken / total) * 120);
              const isPerfect = day.missed === 0;

              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '100%',
                    height: `${Math.max(takenHeight, 10)}px`,
                    background: isPerfect ? '#10b981' : '#f59e0b',
                    borderRadius: '4px',
                    transition: 'height 0.3s'
                  }}></div>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                    {day.date.split('-')[2]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Per-Medication Breakdown Table */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
            Per-Medication Compliance Breakdown
          </h3>
        </div>

        <div className="table-responsive-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 24px' }}>Medication</th>
                <th style={{ padding: '14px 24px' }}>Dosage</th>
                <th style={{ padding: '14px 24px' }}>Scheduled (30d)</th>
                <th style={{ padding: '14px 24px' }}>Taken</th>
                <th style={{ padding: '14px 24px' }}>Missed</th>
                <th style={{ padding: '14px 24px' }}>Adherence Rate</th>
              </tr>
            </thead>
            <tbody>
              {medication_breakdown?.map((med, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 24px', fontWeight: 700, color: '#0f172a' }}>
                    {med.medication_name}
                  </td>
                  <td style={{ padding: '16px 24px', color: '#64748b' }}>
                    {med.dosage}
                  </td>
                  <td style={{ padding: '16px 24px', color: '#334155' }}>
                    {med.total_scheduled}
                  </td>
                  <td style={{ padding: '16px 24px', color: '#16a34a', fontWeight: 600 }}>
                    {med.taken_count}
                  </td>
                  <td style={{ padding: '16px 24px', color: med.missed_count > 0 ? '#ef4444' : '#64748b', fontWeight: med.missed_count > 0 ? 700 : 400 }}>
                    {med.missed_count}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: med.adherence_rate >= 90 ? '#d1fae5' : (med.adherence_rate >= 75 ? '#fef3c7' : '#fee2e2'),
                      color: med.adherence_rate >= 90 ? '#065f46' : (med.adherence_rate >= 75 ? '#92400e' : '#991b1b')
                    }}>
                      {med.adherence_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
