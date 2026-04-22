import React from 'react';
import { AlertTriangle, ShieldCheck, User, Search } from 'lucide-react';

interface Props {
  discrepancies: string[];
  systemReport: {
    tasks_completed: number;
    attendance_days: number;
    total_actual_hours: number;
    tasks_overdue: number;
  };
  selfReport: {
    tasks_completed: number;
    attendance_days: number;
    total_actual_hours: number;
    tasks_overdue: number;
  } | null;
}

const SelfReportMismatch: React.FC<Props> = ({
  discrepancies,
  systemReport,
  selfReport,
}) => {
  if (!discrepancies.length) return null;

  const rows: { label: string; sysKey: keyof typeof systemReport; unit?: string }[] = [
    { label: 'Tasks Completed', sysKey: 'tasks_completed' },
    { label: 'Attendance Days', sysKey: 'attendance_days', unit: ' DAYS' },
    { label: 'Actual Hours', sysKey: 'total_actual_hours', unit: 'H' },
    { label: 'Overdue Tasks', sysKey: 'tasks_overdue' },
  ];

  return (
    <div className="p-6 rounded-[32px] bg-amber-500/[0.02] border border-amber-500/20 space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <Search size={120} className="text-amber-500" />
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <AlertTriangle size={20} />
          </div>
          <div>
              <h4 className="text-sm font-heading font-black text-amber-400 uppercase tracking-tight">Audit Anomaly Detected</h4>
              <p className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest">Self-report data deviation from system records</p>
          </div>
      </div>

      {/* Comparison grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-amber-500/10">
              <th className="text-left py-3 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Data Parameter</th>
              <th className="text-center py-3 px-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20 text-[9px] font-black text-blue-400 uppercase tracking-widest">
                      <ShieldCheck size={10} /> System
                  </div>
              </th>
              <th className="text-center py-3 px-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20 text-[9px] font-black text-amber-400 uppercase tracking-widest">
                      <User size={10} /> Intern
                  </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-500/5">
            {rows.map(({ label, sysKey, unit }) => {
              const sysVal = systemReport[sysKey];
              const selfVal = selfReport?.[sysKey] ?? '—';
              const isDiff = selfReport && Math.abs(Number(sysVal) - Number(selfVal)) > 0;
              
              return (
                <tr key={sysKey} className={isDiff ? 'bg-amber-500/[0.01]' : ''}>
                  <td className="py-4 text-xs font-black text-[var(--text-dim)] uppercase tracking-tight">{label}</td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-xs font-heading font-black text-blue-400">
                        {sysVal}{unit}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`text-xs font-heading font-black ${isDiff ? 'text-amber-400 animate-pulse' : 'text-[var(--text-muted)]'}`}>
                        {selfVal !== '—' ? `${selfVal}${unit ?? ''}` : '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Alert details */}
      <div className="pt-4 border-t border-amber-500/10 space-y-3">
          <div className="text-[9px] font-black text-amber-500/50 uppercase tracking-[0.2em] ml-1">Deviation Markers</div>
          <div className="space-y-2">
            {discrepancies.map((d, i) => (
                <div key={i} className="flex items-center gap-3 text-[11px] text-amber-300/70 font-bold px-4 py-2 bg-amber-500/[0.03] rounded-xl border border-amber-500/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    {d}
                </div>
            ))}
          </div>
      </div>
    </div>
  );
};

export default SelfReportMismatch;
