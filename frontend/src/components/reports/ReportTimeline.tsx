import React from 'react';
import type { WeeklyReportV2 } from '../../types/reports';
import WeeklyReportCard from './WeeklyReportCard';

interface Props {
  reports: WeeklyReportV2[];
  isManagerView?: boolean;
  onReviewedChange?: () => void;
  loading?: boolean;
}

const ReportTimeline: React.FC<Props> = ({
  reports,
  isManagerView = false,
  onReviewedChange,
  loading = false,
}) => {
  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
        Loading reports…
      </div>
    );
  }

  if (!reports.length) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#6b7280',
        background: '#1e1e2e',
        borderRadius: '14px',
        border: '1px solid #2a2a3e',
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
        <p style={{ margin: 0, fontSize: '14px' }}>No reports yet for this period.</p>
      </div>
    );
  }

  // Group reports by week_number — insert phase boundary markers when week_number resets
  let prevPhaseBreak = -1;
  const items: React.ReactNode[] = [];

  reports.forEach((report, index) => {
    // Insert a phase boundary marker when week numbers jump backwards (new phase)
    if (prevPhaseBreak > 0 && report.week_number < prevPhaseBreak) {
      items.push(
        <div
          key={`phase-break-${index}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '24px 0',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #4f46e5)' }} />
          <span style={{
            background: 'rgba(99,102,241,0.15)',
            color: '#818cf8',
            padding: '4px 14px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 700,
            border: '1px solid rgba(99,102,241,0.3)',
            whiteSpace: 'nowrap',
          }}>
            Phase Transition
          </span>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #4f46e5)' }} />
        </div>
      );
    }
    prevPhaseBreak = report.week_number;

    const priorReports = reports.slice(Math.max(0, index - 3), index);

    items.push(
      <WeeklyReportCard
        key={report.id}
        report={report}
        priorReports={priorReports}
        isManagerView={isManagerView}
        onReviewedChange={onReviewedChange}
      />
    );
  });

  return <div>{items}</div>;
};

export default ReportTimeline;
