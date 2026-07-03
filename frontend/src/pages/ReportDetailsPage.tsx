import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    ArrowLeft, FileText, BarChart2, CheckCircle, AlertTriangle, Eye,
    Clock, Calendar, Star
} from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

interface WeeklyReport {
    id: number;
    week_start_date: string;
    week_end_date: string;
    tasks_completed: number;
    tasks_in_progress: number;
    tasks_blocked: number;
    accomplishments: string;
    challenges?: string;
    learnings?: string;
    next_week_goals?: string;
    self_rating: number | null;
    is_submitted: boolean;
    is_reviewed?: boolean;
    pdf_url: string | null;
    submitted_at?: string;
    status_mismatch?: boolean;
    mismatch_details?: string[];
    actual_tasks?: {
        completed: number;
        in_progress: number;
        blocked: number;
    };
}

const ReportDetailsPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [report, setReport] = useState<WeeklyReport | null>(null);

    useEffect(() => {
        if (location.state?.report) {
            setReport(location.state.report);
        } else {
            navigate(-1);
        }
    }, [location.state, navigate]);

    const getFullPdfUrl = (url: string | null) => {
        if (!url) return '#';
        if (url.startsWith('http')) return url;
        const base = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8000`;
        const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
        return `${cleanBase}${url}`;
    };

    if (!report) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-pulse text-[var(--text-dim)]">Loading report...</div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-6">
            {/* Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm font-medium text-[var(--text-dim)] hover:text-purple-400 transition-colors"
            >
                <ArrowLeft size={16} /> Back to Reports
            </button>

            {/* Page Title */}
            <div>
                <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2 flex items-center gap-3">
                    <FileText className="text-purple-500" />
                    Report <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Details</span>
                </h1>
                <p className="text-[var(--text-dim)]">
                    Weekly report for {report.week_start_date} to {report.week_end_date}
                </p>
            </div>

            {/* Status Badges */}
            <div className="flex items-center gap-3 flex-wrap">
                <Badge variant={report.is_submitted ? 'success' : 'warning'} withDot>
                    {report.is_submitted ? 'Submitted' : 'Draft'}
                </Badge>
                {report.is_reviewed && (
                    <Badge variant="info" withDot>Reviewed</Badge>
                )}
                {report.status_mismatch && (
                    <Badge variant="danger" withDot>Mismatch Detected</Badge>
                )}
                {report.submitted_at && (
                    <span className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
                        <Calendar size={12} />
                        Submitted on {new Date(report.submitted_at).toLocaleDateString('en-US', { 
                            year: 'numeric', month: 'short', day: 'numeric' 
                        })}
                    </span>
                )}
            </div>

            {/* Status Mismatch Alert */}
            {report.status_mismatch && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-pulse-slow">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="font-bold text-red-500 uppercase tracking-tight">Status Mismatch Detected</p>
                            <p className="text-sm text-red-400/80 mt-1">
                                There is a discrepancy between the tasks reported in the PDF and the system records for this week.
                            </p>
                            {report.mismatch_details && report.mismatch_details.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                    {report.mismatch_details.map((detail, idx) => (
                                        <li key={idx} className="text-xs text-red-400 font-medium list-disc list-inside">
                                            {detail}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <p className="text-[10px] text-red-500/50 mt-2">* Discrepancy between PDF report and system task records.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Side-by-Side Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Reported in PDF */}
                <Card padding="lg" className="border-[var(--border-color)]">
                    <h4 className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest mb-4 flex items-center gap-2">
                        <FileText size={14} /> Reported in PDF
                    </h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-[var(--bg-muted)] px-4 py-3 rounded-xl">
                            <span className="text-sm text-[var(--text-dim)] flex items-center gap-2">
                                <CheckCircle size={14} className="text-emerald-500" /> Completed
                            </span>
                            <span className="font-bold text-lg text-emerald-500">{report.tasks_completed}</span>
                        </div>
                        <div className="flex justify-between items-center bg-[var(--bg-muted)] px-4 py-3 rounded-xl">
                            <span className="text-sm text-[var(--text-dim)] flex items-center gap-2">
                                <Clock size={14} className="text-blue-500" /> In Progress
                            </span>
                            <span className="font-bold text-lg text-blue-500">{report.tasks_in_progress}</span>
                        </div>
                        <div className="flex justify-between items-center bg-[var(--bg-muted)] px-4 py-3 rounded-xl">
                            <span className="text-sm text-[var(--text-dim)] flex items-center gap-2">
                                <AlertTriangle size={14} className="text-red-500" /> Blocked
                            </span>
                            <span className="font-bold text-lg text-red-500">{report.tasks_blocked}</span>
                        </div>
                    </div>
                </Card>

                {/* System Records */}
                <Card padding="lg" className="border-purple-500/20 bg-purple-500/5">
                    <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <BarChart2 size={14} /> System Records
                    </h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-emerald-500/10 px-4 py-3 rounded-xl border border-emerald-500/20">
                            <span className="text-sm text-emerald-400 flex items-center gap-2">
                                <CheckCircle size={14} /> Completed
                            </span>
                            <span className="font-bold text-lg text-emerald-500">{report.actual_tasks?.completed ?? 0}</span>
                        </div>
                        <div className="flex justify-between items-center bg-blue-500/10 px-4 py-3 rounded-xl border border-blue-500/20">
                            <span className="text-sm text-blue-400 flex items-center gap-2">
                                <Clock size={14} /> In Progress
                            </span>
                            <span className="font-bold text-lg text-blue-500">{report.actual_tasks?.in_progress ?? 0}</span>
                        </div>
                        <div className="flex justify-between items-center bg-red-500/10 px-4 py-3 rounded-xl border border-red-500/20">
                            <span className="text-sm text-red-400 flex items-center gap-2">
                                <AlertTriangle size={14} /> Blocked
                            </span>
                            <span className="font-bold text-lg text-red-500">{report.actual_tasks?.blocked ?? 0}</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Self Rating */}
            {report.self_rating !== null && report.self_rating !== undefined && (
                <Card padding="lg" className="border-amber-500/20 bg-amber-500/5">
                    <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Star size={14} /> Self Rating
                    </h4>
                    <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map(star => (
                            <Star
                                key={star}
                                size={24}
                                fill={star <= report.self_rating! ? '#f59e0b' : 'transparent'}
                                color="#f59e0b"
                                className={star <= report.self_rating! ? 'drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]' : 'opacity-30'}
                            />
                        ))}
                        <span className="ml-3 text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                            {report.self_rating}/5
                        </span>
                    </div>
                </Card>
            )}

            {/* Report Content */}
            <Card padding="lg" className="border-purple-500/10">
                <h4 className="font-bold text-[var(--text-main)] border-b border-[var(--border-color)] pb-3 mb-4 text-lg">
                    Report Content
                </h4>
                <div className="space-y-5">
                    {report.accomplishments && (
                        <div>
                            <p className="text-xs text-purple-400 uppercase tracking-wider mb-2 font-bold flex items-center gap-1.5">
                                <CheckCircle size={12} /> Accomplishments
                            </p>
                            <div className="text-sm text-[var(--text-dim)] leading-relaxed bg-[var(--bg-muted)] p-4 rounded-xl whitespace-pre-wrap">
                                {report.accomplishments}
                            </div>
                        </div>
                    )}
                    {report.challenges && (
                        <div>
                            <p className="text-xs text-red-400 uppercase tracking-wider mb-2 font-bold flex items-center gap-1.5">
                                <AlertTriangle size={12} /> Challenges
                            </p>
                            <div className="text-sm text-[var(--text-dim)] leading-relaxed bg-[var(--bg-muted)] p-4 rounded-xl whitespace-pre-wrap">
                                {report.challenges}
                            </div>
                        </div>
                    )}
                    {report.learnings && (
                        <div>
                            <p className="text-xs text-blue-400 uppercase tracking-wider mb-2 font-bold flex items-center gap-1.5">
                                <FileText size={12} /> Learnings
                            </p>
                            <div className="text-sm text-[var(--text-dim)] leading-relaxed bg-[var(--bg-muted)] p-4 rounded-xl whitespace-pre-wrap">
                                {report.learnings}
                            </div>
                        </div>
                    )}
                    {report.next_week_goals && (
                        <div>
                            <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2 font-bold flex items-center gap-1.5">
                                <Star size={12} /> Next Week Goals
                            </p>
                            <div className="text-sm text-[var(--text-dim)] leading-relaxed bg-[var(--bg-muted)] p-4 rounded-xl whitespace-pre-wrap">
                                {report.next_week_goals}
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
                {report.pdf_url && (
                    <a
                        href={getFullPdfUrl(report.pdf_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center gap-2 px-6 py-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 rounded-xl transition-colors border border-purple-500/20 font-bold"
                    >
                        <Eye size={18} />
                        View Original PDF
                    </a>
                )}
                <Button type="button" onClick={() => navigate(-1)} variant="outline" fullWidth>
                    Back to Reports
                </Button>
            </div>
        </div>
    );
};

export default ReportDetailsPage;
