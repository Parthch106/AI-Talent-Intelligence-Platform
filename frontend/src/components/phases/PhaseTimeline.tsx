import React from 'react';
import type { EmploymentStage } from '../../types/reports';
import ConversionProbabilityGauge from './ConversionProbabilityGauge';

interface Props {
  stages: EmploymentStage[];
  currentStatus: string;       // From InternProfile.status
  conversionScore?: number | null;
}

const PHASE_META = [
  {
    phase: 'PHASE_1' as const,
    label: 'Standard Internship',
    sublabel: 'Months 1–6',
    icon: '🎓',
    color: '#6366f1',
  },
  {
    phase: 'PHASE_2' as const,
    label: 'Stipend Internship',
    sublabel: 'Months 7–12',
    icon: '💼',
    color: '#0ea5e9',
  },
  {
    phase: 'FULL_TIME' as const,
    label: 'Full-Time Employment',
    sublabel: 'Month 13+',
    icon: '🚀',
    color: '#10b981',
  },
];

const PhaseTimeline: React.FC<Props> = ({ stages, currentStatus, conversionScore }) => {
  const stageMap = Object.fromEntries(stages.map(s => [s.phase, s]));

  const getPhaseState = (phase: string): 'completed' | 'active' | 'locked' => {
    if (stageMap[phase]?.phase_end_date) return 'completed';
    if (stageMap[phase]) return 'active';
    return 'locked';
  };

  return (
    <div style={{ padding: '24px 0' }}>

      {/* Phase steps row */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0,
        position: 'relative',
      }}>
        {PHASE_META.map((meta, index) => {
          const state = getPhaseState(meta.phase);
          const stage = stageMap[meta.phase];
          const isLast = index === PHASE_META.length - 1;

          return (
            <React.Fragment key={meta.phase}>
              {/* Phase node */}
              <div style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                {/* Circle */}
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  margin: '0 auto 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  border: `3px solid ${state === 'locked' ? '#374151' : meta.color}`,
                  background: state === 'completed'
                    ? meta.color
                    : state === 'active'
                      ? `${meta.color}22`
                      : '#111827',
                  transition: 'all 0.3s',
                  position: 'relative',
                  zIndex: 2,
                }}>
                  {state === 'completed' ? '✓' : meta.icon}
                </div>

                {/* Phase label */}
                <div style={{
                  fontWeight: 700,
                  fontSize: '13px',
                  color: state === 'locked' ? '#4b5563' : '#e5e7eb',
                  marginBottom: '3px',
                }}>
                  {meta.label}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>
                  {meta.sublabel}
                </div>

                {/* Dates */}
                {stage && (
                  <div style={{ fontSize: '10px', color: '#9ca3af', lineHeight: 1.5 }}>
                    <div>
                      ▶ {new Date(stage.phase_start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {stage.phase_end_date && (
                      <div>
                        ■ {new Date(stage.phase_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                )}

                {/* Score badge for completed phases */}
                {stage?.conversion_score !== null && stage?.conversion_score !== undefined && (
                  <div style={{
                    marginTop: '6px',
                    display: 'inline-block',
                    background: `${meta.color}22`,
                    color: meta.color,
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}>
                    {stage.conversion_score.toFixed(1)}%
                  </div>
                )}
              </div>

              {/* Connector line (not after last) */}
              {!isLast && (
                <div style={{
                  width: '60px',
                  height: '3px',
                  marginTop: '26px',
                  background: getPhaseState(PHASE_META[index + 1].phase) !== 'locked'
                    ? `linear-gradient(to right, ${meta.color}, ${PHASE_META[index + 1].color})`
                    : '#374151',
                  borderRadius: '2px',
                  flexShrink: 0,
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* FTE conversion gauge */}
      <div style={{
        marginTop: '32px',
        padding: '20px',
        background: 'rgba(16, 185, 129, 0.06)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        flexWrap: 'wrap',
      }}>
        <ConversionProbabilityGauge score={conversionScore ?? null} size={160} />
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h3 style={{ color: '#10b981', margin: '0 0 8px', fontSize: '16px', fontWeight: 700 }}>
            Full-Time Conversion Score
          </h3>
          <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
            Your conversion probability is computed from performance trends,
            skill growth, attendance, and peer comparison across your entire
            internship journey. Updated every Monday.
          </p>
          {conversionScore === null && (
            <p style={{
              marginTop: '10px',
              color: '#6b7280',
              fontSize: '12px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '6px',
              padding: '8px 12px',
            }}>
              ⏳ Score becomes available after completing Phase 1 and entering Phase 2.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhaseTimeline;
