import React from 'react';
import { Plus, FileText, CheckCircle, Clock, AlertTriangle, ChevronRight, Download } from 'lucide-react';
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
}

interface WeeklyReportsTabProps {
    reports: WeeklyReport[];
    onSubmitReport: () => void;
}

const WeeklyReportsTab: React.FC<WeeklyReportsTabProps> = ({ reports, onSubmitReport }) => {
    // Ensure reports is always an array
    const reportsArray = Array.isArray(reports) ? reports : [];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold gradient-text">Weekly Reports</h2>
                    <p className="text-slate-400 mt-1">Track weekly progress and accomplishments</p>
                </div>
                <Button
                    onClick={onSubmitReport}
                    icon={<Plus size={18} />}
                    gradient="indigo"
                >
                    Submit Report
                </Button>
            </div>

            <div className="space-y-4">
                {reportsArray.map((report) => (
                    <Card key={report.id} hover padding="lg" className="animate-slide-up">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-semibold text-white text-lg">
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
                                <div className="flex flex-wrap gap-4 text-sm">
                                    <span className="flex items-center gap-1 text-emerald-400">
                                        <CheckCircle size={14} />
                                        {report.tasks_completed} completed
                                    </span>
                                    <span className="flex items-center gap-1 text-blue-400">
                                        <Clock size={14} />
                                        {report.tasks_in_progress} in progress
                                    </span>
                                    <span className="flex items-center gap-1 text-red-400">
                                        <AlertTriangle size={14} />
                                        {report.tasks_blocked} blocked
                                    </span>
                                </div>
                            </div>
                            {report.pdf_url && (
                                <a
                                    href={report.pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors border border-purple-500/30"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Download size={16} />
                                    <span className="text-sm font-medium">Download PDF</span>
                                </a>
                            )}
                            <ChevronRight size={20} className="text-slate-400" />
                        </div>
                        {report.is_submitted && (
                            <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                                {report.accomplishments && (
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Accomplishments</p>
                                        <p className="text-sm text-slate-300">{report.accomplishments}</p>
                                    </div>
                                )}
                                {report.challenges && (
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Challenges</p>
                                        <p className="text-sm text-slate-300">{report.challenges}</p>
                                    </div>
                                )}
                                {report.learnings && (
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Learnings</p>
                                        <p className="text-sm text-slate-300">{report.learnings}</p>
                                    </div>
                                )}
                                {report.next_week_goals && (
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Next Week Goals</p>
                                        <p className="text-sm text-slate-300">{report.next_week_goals}</p>
                                    </div>
                                )}
                                <div className="flex items-center gap-4 pt-2">
                                    {report.self_rating && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-slate-400">Self Rating:</span>
                                            <span className="font-semibold text-white">{report.self_rating}/10</span>
                                        </div>
                                    )}
                                    {report.submitted_at && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-slate-400">Submitted:</span>
                                            <span className="text-sm text-slate-300">{new Date(report.submitted_at).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </Card>
                ))}
                {reportsArray.length === 0 && (
                    <div className="text-center py-12">
                        <FileText size={48} className="mx-auto mb-4 text-slate-600" />
                        <p className="text-lg font-medium text-white">No weekly reports found</p>
                        <p className="text-sm text-slate-400">Reports will appear here once submitted</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WeeklyReportsTab;
