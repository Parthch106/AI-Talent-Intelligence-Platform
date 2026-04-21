import React, { useState } from 'react';
import type { WeeklyReportV2 } from '../../types/reports';
import ReportSparkline from './ReportSparkline';
import SelfReportMismatch from './SelfReportMismatch';
import { addManagerCommentV2, markReportReviewedV2 } from '../../api/reports';

interface Props {
  report: WeeklyReportV2;
  priorReports?: WeeklyReportV2[];   // Last 4 for sparkline
  isManagerView?: boolean;
  onReviewedChange?: () => void;
}

const scoreBadge = (score: number | null, label: string) => (
  <div style={{
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '8px',
    padding: '8px 12px',
    textAlign: 'center',
    minWidth: '80px',
  }}>
    <div style={{
      fontSize: '20px',
      fontWeight: 800,
      color: score === null ? '#6b7280'
        : score >= 75 ? '#34d399'
        : score >= 50 ? '#fbbf24'
        : '#f87171',
    }}>
      {score !== null ? `${score.toFixed(1)}%` : '—'}
    </div>
    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {label}
    </div>
  </div>
);

const deltaBadge = (delta: number | null) => {
  if (delta === null) return null;
  const isPos = delta >= 0;
  return (
    <span style={{
      fontSize: '11px',
      fontWeight: 700,
      color: isPos ? '#34d399' : '#f87171',
      marginLeft: '6px',
    }}>
      {isPos ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
    </span>
  );
};

const WeeklyReportCard: React.FC<Props> = ({
  report,
  priorReports = [],
  isManagerView = false,
  onReviewedChange,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState(report.manager_comment || '');
  const [commentSaving, setCommentSaving] = useState(false);
  const [reviewed, setReviewed] = useState(report.manager_reviewed);

  // Build sparkline data from prior reports + this week
  const sparkData = [...priorReports, report]
    .slice(-4)
    .map(r => ({
      week: `W${r.week_number}`,
      score: r.overall_weekly_score ?? 0,
    }));

  const handleSaveComment = async () => {
    setCommentSaving(true);
    try {
      await addManagerCommentV2(report.id, comment);
    } finally {
      setCommentSaving(false);
    }
  };

  const handleMarkReviewed = async () => {
    await markReportReviewedV2(report.id);
    setReviewed(true);
    onReviewedChange?.();
  };

  const dateRange = `${new Date(report.week_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — ${new Date(report.week_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div style={{
      background: '#1e1e2e',
      border: report.red_flag
        ? '1px solid #dc2626'
        : reviewed
          ? '1px solid #059669'
          : '1px solid #2a2a3e',
      borderRadius: '14px',
      marginBottom: '16px',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s',
    }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          padding: '16px 20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          userSelect: 'none',
        }}
      >
        {/* Week badge */}
        <div style={{
          background: 'rgba(99,102,241,0.15)',
          color: '#818cf8',
          borderRadius: '8px',
          padding: '6px 12px',
          fontWeight: 700,
          fontSize: '13px',
          whiteSpace: 'nowrap',
        }}>
          Week {report.week_number}
        </div>

        {/* Date range */}
        <span style={{ color: '#9ca3af', fontSize: '13px', flex: 1 }}>
          {dateRange}
        </span>

        {/* Overall score + delta */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{
            fontWeight: 800,
            fontSize: '18px',
            color: report.overall_weekly_score === null ? '#6b7280'
              : report.overall_weekly_score >= 75 ? '#34d399'
              : report.overall_weekly_score >= 50 ? '#fbbf24'
              : '#f87171',
          }}>
            {report.overall_weekly_score?.toFixed(1) ?? '—'}%
          </span>
          {deltaBadge(report.overall_delta)}
        </div>

        {/* Status tags */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {report.red_flag && (
            <span style={{
              background: '#7f1d1d', color: '#fca5a5',
              padding: '2px 8px', borderRadius: '20px',
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px',
            }}>
              🚩 RED FLAG
            </span>
          )}
          {report.self_report_mismatch && (
            <span style={{
              background: '#451a03', color: '#fcd34d',
              padding: '2px 8px', borderRadius: '20px',
              fontSize: '10px', fontWeight: 700,
            }}>
              ⚠ MISMATCH
            </span>
          )}
          {reviewed && (
            <span style={{
              background: '#064e3b', color: '#6ee7b7',
              padding: '2px 8px', borderRadius: '20px',
              fontSize: '10px', fontWeight: 700,
            }}>
              ✓ Reviewed
            </span>
          )}
          {!report.is_auto_generated && (
            <span style={{
              background: '#1e1b4b', color: '#a5b4fc',
              padding: '2px 8px', borderRadius: '20px',
              fontSize: '10px', fontWeight: 600,
            }}>
              Self-submitted
            </span>
          )}
        </div>

        {/* Expand chevron */}
        <span style={{
          color: '#6b7280',
          fontSize: '16px',
          transition: 'transform 0.2s',
          transform: expanded ? 'rotate(180deg)' : 'none',
          flexShrink: 0,
        }}>
          ▾
        </span>
      </div>

      {/* ── Quick stats bar (always visible) ────────────────────────────────── */}
      <div style={{
        padding: '0 20px 14px',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        alignItems: 'center',
        fontSize: '12px',
        color: '#9ca3af',
        borderBottom: expanded ? '1px solid #2a2a3e' : 'none',
      }}>
        <span>✅ {report.tasks_completed}/{report.tasks_assigned} tasks</span>
        <span style={{ color: '#4b5563' }}>•</span>
        <span>📅 {report.attendance_days}/{report.expected_days} days</span>
        <span style={{ color: '#4b5563' }}>•</span>
        <span style={{ color: report.tasks_overdue > 0 ? '#f87171' : '#9ca3af' }}>
          ⏰ {report.tasks_overdue} overdue
        </span>
        <span style={{ color: '#4b5563' }}>•</span>
        <span>🕐 {report.total_actual_hours.toFixed(1)}h actual</span>

        {/* Inline sparkline */}
        <div style={{ marginLeft: 'auto', width: '90px', height: '30px' }}>
          <ReportSparkline data={sparkData} height={30} showTooltip={false} />
        </div>
      </div>

      {/* ── Expanded detail panel ────────────────────────────────────────────── */}
      {expanded && (
        <div style={{ padding: '20px' }}>

          {/* Score grid */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {scoreBadge(report.productivity_score, 'Productivity')}
            {scoreBadge(report.quality_score, 'Quality')}
            {scoreBadge(report.engagement_score, 'Engagement')}
            {scoreBadge(report.attendance_pct, 'Attendance')}
            {scoreBadge(report.cumulative_overall_score, 'Phase Avg')}
          </div>

          {/* 4-week trend sparkline */}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              4-Week Trend
            </p>
            <div style={{ height: '60px' }}>
              <ReportSparkline data={sparkData} height={60} />
            </div>
          </div>

          {/* Red flag reasons */}
          {report.red_flag && report.red_flag_reasons.length > 0 && (
            <div style={{
              background: 'rgba(220, 38, 38, 0.08)',
              border: '1px solid #dc2626',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '16px',
            }}>
              <p style={{ fontWeight: 700, color: '#fca5a5', fontSize: '12px', marginBottom: '6px' }}>
                🚩 Red Flag Reasons
              </p>
              <ul style={{ margin: 0, padding: '0 0 0 16px', color: '#fca5a5', fontSize: '12px', lineHeight: 1.7 }}>
                {report.red_flag_reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {/* AI Narrative */}
          {report.ai_narrative && (
            report.ai_narrative.startsWith('[AI summary unavailable') ? (
              <div style={{
                background: 'rgba(75,85,99,0.15)',
                border: '1px solid #374151',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '16px',
                color: '#9ca3af',
                fontSize: '12px',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <span style={{ fontSize: '16px' }}>ℹ️</span>
                <span>AI summary temporarily unavailable. Performance metrics above are fully accurate.</span>
              </div>
            ) : (
              <div style={{
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '16px',
              }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🤖 AI Summary
                </p>
                <p style={{ color: '#d1d5db', fontSize: '13px', lineHeight: 1.7, margin: '0 0 10px' }}>
                  {report.ai_narrative}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {report.ai_top_achievement && (
                    <p style={{ fontSize: '12px', color: '#6ee7b7', margin: 0 }}>
                      ✦ <strong>Achievement:</strong> {report.ai_top_achievement}
                    </p>
                  )}
                  {report.ai_concern_area && (
                    <p style={{ fontSize: '12px', color: '#fcd34d', margin: 0 }}>
                      ✦ <strong>Concern:</strong> {report.ai_concern_area}
                    </p>
                  )}
                  {report.ai_growth_note && (
                    <p style={{ fontSize: '12px', color: '#93c5fd', margin: 0 }}>
                      ✦ <strong>Growth:</strong> {report.ai_growth_note}
                    </p>
                  )}
                </div>
              </div>
            )
          )}

          {/* Self-report mismatch */}
          {report.self_report_mismatch && (
            <SelfReportMismatch
              discrepancies={report.self_report_mismatch_details}
              systemReport={{
                tasks_completed: report.tasks_completed,
                attendance_days: report.attendance_days,
                total_actual_hours: report.total_actual_hours,
                tasks_overdue: report.tasks_overdue,
              }}
              selfReport={null}
            />
          )}

          {/* Manager comment section */}
          {isManagerView && (
            <div style={{ marginTop: '16px', borderTop: '1px solid #2a2a3e', paddingTop: '16px' }}>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                Manager Comment
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                placeholder="Add your observations or action items..."
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#e5e7eb',
                  padding: '10px 12px',
                  fontSize: '13px',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  onClick={handleSaveComment}
                  disabled={commentSaving}
                  style={{
                    background: '#4f46e5',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: commentSaving ? 0.7 : 1,
                  }}
                >
                  {commentSaving ? 'Saving…' : 'Save Comment'}
                </button>
                {!reviewed && (
                  <button
                    onClick={handleMarkReviewed}
                    style={{
                      background: 'transparent',
                      color: '#34d399',
                      border: '1px solid #059669',
                      borderRadius: '6px',
                      padding: '6px 16px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ✓ Mark Reviewed
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Read-only manager comment (intern view) */}
          {!isManagerView && report.manager_comment && (
            <div style={{
              marginTop: '16px',
              borderTop: '1px solid #2a2a3e',
              paddingTop: '16px',
            }}>
              <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>
                Manager comment:
              </p>
              <p style={{ fontSize: '13px', color: '#d1d5db', fontStyle: 'italic', margin: 0 }}>
                "{report.manager_comment}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WeeklyReportCard;
