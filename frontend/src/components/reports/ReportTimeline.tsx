import React from 'react';
import type { WeeklyReportV2 } from '../../types/reports';
import WeeklyReportCard from './WeeklyReportCard';
import { Card, LoadingSpinner } from '../common';
import { ClipboardList, GitBranch, LayoutDashboard, Search } from 'lucide-react';

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
      <div className="py-24 flex flex-col items-center justify-center gap-4">
        <LoadingSpinner />
        <p className="text-[var(--text-dim)] font-black uppercase text-[10px] tracking-[0.2em] animate-pulse">Syncing report history...</p>
      </div>
    );
  }

  if (!reports.length) {
    return (
      <Card padding="none" className="py-24 flex flex-col items-center justify-center gap-6 border-dashed border-2 border-[var(--border-color)] bg-white/[0.01]">
        <div className="p-6 bg-white/[0.02] rounded-full border border-[var(--border-color)]">
            <ClipboardList size={48} className="text-[var(--text-muted)] opacity-20" />
        </div>
        <div className="text-center space-y-1">
            <p className="text-[var(--text-main)] font-heading font-black uppercase tracking-tight text-lg">No records found</p>
            <p className="text-[var(--text-dim)] font-black uppercase text-[10px] tracking-widest italic">No reports available for this deployment cycle</p>
        </div>
      </Card>
    );
  }

  // Group reports by week_number — insert phase boundary markers when week_number resets
  let prevPhaseBreak = -1;
  const items: React.ReactNode[] = [];

  reports.forEach((report, index) => {
    // Insert a phase boundary marker when week numbers jump backwards (new phase)
    if (prevPhaseBreak > 0 && report.week_number < prevPhaseBreak) {
      items.push(
        <div key={`phase-break-${index}`} className="relative py-12 flex items-center gap-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-indigo-500/50" />
          <div className="flex items-center gap-3 px-6 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full backdrop-blur-xl">
              <GitBranch size={14} className="text-indigo-400" />
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Deployment Phase Transition</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-indigo-500/30 to-indigo-500/50" />
        </div>
      );
    }
    prevPhaseBreak = report.week_number;

    const priorReports = reports.slice(Math.max(0, index - 3), index);

    items.push(
      <div key={report.id} className="mb-8 last:mb-0">
        <WeeklyReportCard
          report={report}
          priorReports={priorReports}
          isManagerView={isManagerView}
          onReviewedChange={onReviewedChange}
        />
      </div>
    );
  });

  return <div className="space-y-2">{items}</div>;
};

export default ReportTimeline;
