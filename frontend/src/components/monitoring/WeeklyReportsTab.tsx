import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, CheckCircle, Clock, AlertTriangle, ChevronRight, Eye } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';

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

interface WeeklyReportsTabProps {
    reports: WeeklyReport[];
    onSubmitReport: () => void;
    showSubmit?: boolean;
}

const WeeklyReportsTab: React.FC<WeeklyReportsTabProps> = ({ reports, onSubmitReport, showSubmit = true }) => {
    const navigate = useNavigate();
    // Ensure reports is always an array
    const reportsArray = Array.isArray(reports) ? reports : [];

    // Helper to get full PDF URL
    const getFullPdfUrl = (url: string | null) => {
        if (!url) return '#';
        if (url.startsWith('http')) return url;
        const base = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8000`;
        const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
        return `${cleanBase}${url}`;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {showSubmit && (
                    <Button
                        onClick={onSubmitReport}
                        icon={<Plus size={18} />}
                        gradient="indigo"
                    >
                        Submit Report
                    </Button>
                )}
            </div>

            <div className="space-y-4">
                {reportsArray.map((report) => (
                    <Card key={report.id} hover padding="lg" className="animate-slide-up cursor-pointer" onClick={() => navigate('/monitoring/report-details', { state: { report } })}>
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-semibold text-[var(--text-main)] text-lg">
                                        {report.week_start_date} - {report.week_end_date}
                                    </h3>
                                    <Badge variant={report.is_submitted ? 'success' : 'warning'} withDot>
                                        {report.is_submitted ? 'Submitted' : 'Draft'}
                                    </Badge>
                                    {report.is_reviewed && (
                                        <Badge variant="info" withDot>
                                            Reviewed
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm font-bold">
                                    <span className="flex items-center gap-1 text-emerald-500">
                                        <CheckCircle size={14} />
                                        {report.tasks_completed} completed
                                    </span>
                                    <span className="flex items-center gap-1 text-blue-500">
                                        <Clock size={14} />
                                        {report.tasks_in_progress} in progress
                                    </span>
                                    <span className="flex items-center gap-1 text-red-500">
                                        <AlertTriangle size={14} />
                                        {report.tasks_blocked} blocked
                                    </span>
                                </div>
                            </div>
                            {report.pdf_url && (
                                <a
                                    href={getFullPdfUrl(report.pdf_url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 rounded-lg transition-colors border border-purple-500/20"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Eye size={16} />
                                    <span className="text-sm font-bold">View PDF</span>
                                </a>
                            )}
                            <ChevronRight size={20} className="text-[var(--text-dim)]" />
                        </div>

                        {report.status_mismatch && (
                            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-pulse-slow">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <p className="text-sm font-bold text-red-500 uppercase tracking-tight">Status Mismatch Detected</p>
                                        <ul className="mt-1 space-y-1">
                                            {report.mismatch_details?.map((detail, idx) => (
                                                <li key={idx} className="text-xs text-red-500 font-medium list-disc list-inside">
                                                    {detail}
                                                </li>
                                            ))}
                                        </ul>
                                        <p className="text-[10px] text-red-500/60 mt-2">* Discrepancy between PDF report and system task records.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!report.status_mismatch && report.is_submitted && (
                            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                <div className="flex items-center gap-3 text-emerald-400">
                                    <CheckCircle size={18} />
                                    <span className="text-sm font-bold uppercase tracking-tight">Data Synchronized</span>
                                </div>
                                <p className="text-[10px] text-emerald-500/60 mt-1 ml-7">System records match the PDF report metrics.</p>
                            </div>
                        )}

                        {report.is_submitted && (
                            <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex items-center gap-4">
                                {report.submitted_at && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-[var(--text-dim)]">Submitted:</span>
                                        <span className="text-sm text-[var(--text-dim)] font-medium">{new Date(report.submitted_at).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                ))}
                {reportsArray.length === 0 && (
                    <div className="text-center py-20 animate-fade-in">
                        <FileText size={48} className="mx-auto mb-4 text-[var(--text-muted)] opacity-20" />
                        <p className="text-lg font-bold text-[var(--text-main)] uppercase">No weekly reports found</p>
                        <p className="text-sm text-[var(--text-dim)]">Reports will appear here once submitted</p>
                    </div>
                )}
            </div>

        </div>
    );
};

export default WeeklyReportsTab;
