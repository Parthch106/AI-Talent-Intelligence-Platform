import React, { useState } from 'react';
import type { WeeklyReportV2 } from '../../types/reports';
import ReportSparkline from './ReportSparkline';
import SelfReportMismatch from './SelfReportMismatch';
import { addManagerCommentV2, markReportReviewedV2 } from '../../api/reports';
import { Card, Button, Badge, LoadingSpinner } from '../common';
import { 
  Calendar, 
  ChevronDown, 
  Flag, 
  AlertTriangle, 
  CheckCircle2, 
  User, 
  Bot, 
  Trophy, 
  Target, 
  Zap, 
  Clock, 
  CheckSquare, 
  MessageSquare, 
  ArrowUpRight,
  TrendingUp,
  Activity
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Props {
  report: WeeklyReportV2;
  priorReports?: WeeklyReportV2[];   // Last 4 for sparkline
  isManagerView?: boolean;
  onReviewedChange?: () => void;
}

const ScoreBadge: React.FC<{ score: number | null, label: string, icon: React.ReactNode }> = ({ score, label, icon }) => {
    const getColor = (val: number | null) => {
        if (val === null) return 'text-[var(--text-muted)]';
        if (val >= 75) return 'text-emerald-400';
        if (val >= 50) return 'text-amber-400';
        return 'text-red-400';
    };

    return (
        <div className="flex-1 min-w-[100px] p-4 rounded-2xl bg-white/[0.02] border border-[var(--border-color)] flex flex-col items-center gap-1">
            <div className="text-[var(--text-muted)] mb-1 opacity-50">{icon}</div>
            <div className={`text-xl font-heading font-black ${getColor(score)} tracking-tight`}>
                {score !== null ? `${score.toFixed(0)}%` : '—'}
            </div>
            <div className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{label}</div>
        </div>
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

  const sparkData = [...priorReports, report]
    .slice(-4)
    .map(r => ({
      week: `W${r.week_number}`,
      score: r.overall_weekly_score ?? 0,
    }));

  const handleSaveComment = async () => {
    if (!comment.trim()) return;
    toast.promise(addManagerCommentV2(report.id, comment), {
      loading: 'Registering strategic feedback...',
      success: () => {
        return 'Feedback successfully committed to record';
      },
      error: 'Failed to synchronize comment'
    });
  };

  const handleMarkReviewed = async () => {
    toast.promise(markReportReviewedV2(report.id), {
      loading: 'Authorizing performance record...',
      success: () => {
        setReviewed(true);
        onReviewedChange?.();
        return 'Report successfully authorized';
      },
      error: 'Authorization protocol failed'
    });
  };

  const dateRange = `${new Date(report.week_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — ${new Date(report.week_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const getOverallColor = (score: number | null) => {
    if (score === null) return 'text-[var(--text-muted)]';
    if (score >= 75) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <Card padding="none" className={`group border-[var(--border-color)] bg-[var(--card-bg)] hover:border-[var(--text-muted)] transition-all duration-500 overflow-hidden ${report.red_flag ? 'ring-1 ring-red-500/30' : reviewed ? 'ring-1 ring-emerald-500/20' : ''}`}>
      {/* Header Section */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className="p-6 cursor-pointer flex flex-col md:flex-row md:items-center gap-6 select-none"
      >
        <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex flex-col items-center justify-center border border-indigo-500/20">
                <span className="text-[9px] font-black text-indigo-400 uppercase leading-none">WK</span>
                <span className="text-lg font-heading font-black text-indigo-400 leading-none">{report.week_number}</span>
            </div>
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest">
                    <Calendar size={12} className="text-indigo-400" />
                    {dateRange}
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-2xl font-heading font-black tracking-tight ${getOverallColor(report.overall_weekly_score)}`}>
                        {report.overall_weekly_score?.toFixed(1) ?? '—'}%
                    </span>
                    {report.overall_delta !== null && (
                        <Badge className={`text-[10px] ${report.overall_delta >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {report.overall_delta >= 0 ? '▲' : '▼'} {Math.abs(report.overall_delta).toFixed(1)}%
                        </Badge>
                    )}
                </div>
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            {report.red_flag && (
                <Badge className="bg-red-500/10 text-red-400 border-red-500/20 flex items-center gap-1 px-3 py-1 animate-pulse font-black text-[9px] tracking-widest">
                    <Flag size={10} /> RED FLAG
                </Badge>
            )}
            {report.self_report_mismatch && (
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 flex items-center gap-1 px-3 py-1 font-black text-[9px] tracking-widest">
                    <AlertTriangle size={10} /> MISMATCH
                </Badge>
            )}
            {reviewed && (
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1 px-3 py-1 font-black text-[9px] tracking-widest">
                    <CheckCircle2 size={10} /> REVIEWED
                </Badge>
            )}
            {!report.is_auto_generated && (
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 flex items-center gap-1 px-3 py-1 font-black text-[9px] tracking-widest">
                    <User size={10} /> SELF-REPORT
                </Badge>
            )}
            <div className={`p-2 rounded-full hover:bg-white/5 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
                <ChevronDown size={20} className="text-[var(--text-muted)]" />
            </div>
        </div>
      </div>

      {/* Metric Bar */}
      <div className="px-6 py-4 bg-white/[0.01] border-t border-[var(--border-color)] flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)]">
            <CheckSquare size={12} className="text-emerald-500" />
            <span>{report.tasks_completed}/{report.tasks_assigned} <span className="opacity-50 font-bold">Tasks</span></span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)]">
            <Calendar size={12} className="text-blue-500" />
            <span>{report.attendance_days}/{report.expected_days} <span className="opacity-50 font-bold">Days</span></span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)]">
            <Clock size={12} className={report.tasks_overdue > 0 ? 'text-red-500' : 'text-amber-500'} />
            <span className={report.tasks_overdue > 0 ? 'text-red-400' : ''}>{report.tasks_overdue} <span className="opacity-50 font-bold">Overdue</span></span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)]">
            <TrendingUp size={12} className="text-indigo-400" />
            <span>{report.total_actual_hours.toFixed(1)}H <span className="opacity-50 font-bold">Actual</span></span>
        </div>

        <div className="hidden md:block ml-auto w-24 h-6 opacity-60">
             <ReportSparkline data={sparkData} height={24} showTooltip={false} />
        </div>
      </div>

      {/* Detail Content */}
      {expanded && (
        <div className="p-8 space-y-8 animate-in slide-in-from-top-4 duration-500 border-t border-[var(--border-color)]">
          
          {/* Score Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <ScoreBadge score={report.productivity_score} label="Productivity" icon={<Zap size={14} />} />
            <ScoreBadge score={report.quality_score} label="Quality" icon={<Target size={14} />} />
            <ScoreBadge score={report.engagement_score} label="Engagement" icon={<Trophy size={14} />} />
            <ScoreBadge score={report.attendance_pct} label="Attendance" icon={<Calendar size={14} />} />
            <ScoreBadge score={report.cumulative_overall_score} label="Phase Avg" icon={<Activity size={14} />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* AI Summary */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                    <Bot size={14} /> AI Performance Narrative
                </div>
                {report.ai_narrative && !report.ai_narrative.startsWith('[AI summary unavailable') ? (
                    <div className="p-6 rounded-3xl bg-indigo-500/[0.03] border border-indigo-500/10 space-y-5">
                        <p className="text-[var(--text-main)] text-sm leading-relaxed font-medium">
                            {report.ai_narrative}
                        </p>
                        <div className="space-y-3 pt-2">
                            {report.ai_top_achievement && (
                                <div className="flex gap-3 items-start">
                                    <div className="mt-1 p-1 bg-emerald-500/20 rounded-md"><Trophy size={10} className="text-emerald-400" /></div>
                                    <p className="text-[11px] text-[var(--text-dim)] leading-snug"><span className="font-black text-emerald-400 uppercase tracking-tighter mr-1">Achievement:</span> {report.ai_top_achievement}</p>
                                </div>
                            )}
                            {report.ai_concern_area && (
                                <div className="flex gap-3 items-start">
                                    <div className="mt-1 p-1 bg-amber-500/20 rounded-md"><AlertTriangle size={10} className="text-amber-400" /></div>
                                    <p className="text-[11px] text-[var(--text-dim)] leading-snug"><span className="font-black text-amber-400 uppercase tracking-tighter mr-1">Observation:</span> {report.ai_concern_area}</p>
                                </div>
                            )}
                            {report.ai_growth_note && (
                                <div className="flex gap-3 items-start">
                                    <div className="mt-1 p-1 bg-blue-500/20 rounded-md"><TrendingUp size={10} className="text-blue-400" /></div>
                                    <p className="text-[11px] text-[var(--text-dim)] leading-snug"><span className="font-black text-blue-400 uppercase tracking-tighter mr-1">Growth Node:</span> {report.ai_growth_note}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="p-6 rounded-3xl bg-white/[0.02] border border-[var(--border-color)] flex items-center gap-4 text-[var(--text-muted)] italic text-xs">
                        <Bot size={18} className="opacity-30" />
                        AI synthesis engine temporarily offline. Performance indices remain validated.
                    </div>
                )}
            </div>

            {/* Sparkline & Red Flags */}
            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-dim)]">
                            <Activity size={14} /> 4-Week Velocity
                        </div>
                    </div>
                    <div className="h-32 p-4 bg-white/[0.02] border border-[var(--border-color)] rounded-3xl">
                        <ReportSparkline data={sparkData} height={96} />
                    </div>
                </div>

                {report.red_flag && report.red_flag_reasons.length > 0 && (
                    <div className="p-5 bg-red-500/[0.03] border border-red-500/20 rounded-3xl space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black text-red-400 uppercase tracking-widest">
                            <Flag size={12} /> System Alerts
                        </div>
                        <ul className="space-y-2">
                            {report.red_flag_reasons.map((r, i) => (
                                <li key={i} className="text-[11px] text-red-300/80 font-bold flex items-start gap-2">
                                    <span className="mt-1 w-1 h-1 rounded-full bg-red-400 shrink-0" />
                                    {r}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
          </div>

          {/* Mismatch Section */}
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

          {/* Manager Actions */}
          {isManagerView && (
            <div className="pt-8 border-t border-[var(--border-color)] space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-dim)]">
                  <MessageSquare size={14} /> Evaluation & Feedback
              </div>
              <div className="relative">
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={4}
                  placeholder="Enter strategic observations or required corrective actions..."
                  className="w-full bg-white/[0.02] border border-[var(--border-color)] rounded-2xl p-4 text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all resize-none placeholder:text-[var(--text-muted)]"
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={handleSaveComment}
                  disabled={commentSaving || !comment.trim()}
                  className="btn-primary-premium flex items-center gap-2 px-6"
                >
                  {commentSaving ? <LoadingSpinner /> : <ArrowUpRight size={16} />}
                  <span>Commit Comment</span>
                </Button>
                {!reviewed && (
                  <Button
                    onClick={handleMarkReviewed}
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 px-6"
                  >
                    <CheckCircle2 size={16} />
                    <span>Authorize Report</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Intern View Comment */}
          {!isManagerView && report.manager_comment && (
            <div className="pt-8 border-t border-[var(--border-color)] space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-dim)]">
                  <MessageSquare size={14} /> Leadership Feedback
              </div>
              <div className="p-5 bg-white/[0.03] border border-[var(--border-color)] rounded-2xl italic text-sm text-[var(--text-main)] leading-relaxed relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/40" />
                "{report.manager_comment}"
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default WeeklyReportCard;
