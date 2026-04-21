import React, { useEffect, useState, useCallback } from 'react';
import PhaseTimeline from '../components/phases/PhaseTimeline';
import { fetchMyStages, fetchMyEvaluations } from '../api/reports';
import type { EmploymentStage, PhaseEvaluation } from '../types/reports';
import { useAuth } from '../context/AuthContext';

const PhaseTimelinePage: React.FC = () => {
  const { user } = useAuth();
  const [stages, setStages]           = useState<EmploymentStage[]>([]);
  const [evaluations, setEvaluations] = useState<PhaseEvaluation[]>([]);
  const [loading, setLoading]         = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, e] = await Promise.all([fetchMyStages(), fetchMyEvaluations()]);
      setStages(s);
      setEvaluations(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle different potential user object structures
  const currentStatus = (user as any)?.internprofile_status || (user as any)?.status || 'ACTIVE_INTERN';

  return (
    <div style={{ padding: '28px 24px', maxWidth: '860px', margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: '#e5e7eb' }}>
        Career Phase Timeline
      </h1>
      <p style={{ margin: '0 0 28px', color: '#6b7280', fontSize: '13px' }}>
        Your 12-month internship → full-time journey
      </p>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          Loading your career timeline…
        </div>
      ) : (
        <>
          <PhaseTimeline
            stages={stages}
            currentStatus={currentStatus}
            conversionScore={null}   // Wired up in Sprint 5 when ConversionScore model is built
          />

          {/* Phase Evaluations */}
          {evaluations.length > 0 && (
            <div style={{ marginTop: '28px' }}>
              <h2 style={{
                fontSize: '14px', fontWeight: 700,
                color: '#9ca3af', textTransform: 'uppercase',
                letterSpacing: '0.5px', margin: '0 0 14px',
              }}>
                Gate Evaluations
              </h2>
              {evaluations.map(ev => (
                <div key={ev.id} style={{
                  background: '#1e1e2e',
                  border: `1px solid ${ev.criteria_met ? '#059669' : '#dc2626'}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}>
                  <span style={{
                    background: ev.criteria_met ? '#064e3b' : '#7f1d1d',
                    color: ev.criteria_met ? '#34d399' : '#fca5a5',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontWeight: 700,
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                  }}>
                    {ev.criteria_met ? '✓ Passed' : '✗ Not Passed'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#e5e7eb', fontSize: '14px' }}>
                      {ev.decision_display}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '2px' }}>
                      Evaluated {new Date(ev.evaluated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {ev.evaluated_by_name ? ` by ${ev.evaluated_by_name}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '22px', fontWeight: 800,
                      color: ev.overall_score >= 75 ? '#34d399' : '#f87171',
                    }}>
                      {ev.overall_score.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>Overall Score</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PhaseTimelinePage;
