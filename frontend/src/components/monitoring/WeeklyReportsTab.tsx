import React from 'react';
import { Plus, FileText, CheckCircle, Clock, AlertTriangle, ChevronRight, Download, BarChart2 } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Modal from '../common/Modal';

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
}

const WeeklyReportsTab: React.FC<WeeklyReportsTabProps> = ({ reports, onSubmitReport }) => {
    // Ensure reports is always an array
    const reportsArray = Array.isArray(reports) ? reports : [];
    const [selectedReport, setSelectedReport] = React.useState<WeeklyReport | null>(null);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold gradient-text">Weekly Reports</h2>
                    <p className="text-[var(--text-dim)] mt-1">Track weekly progress and accomplishments</p>
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
                    <Card key={report.id} hover padding="lg" className="animate-slide-up cursor-pointer" onClick={() => setSelectedReport(report)}>
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
                                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle size={14} />
                                        {report.tasks_completed} completed
                                    </span>
                                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                        <Clock size={14} />
                                        {report.tasks_in_progress} in progress
                                    </span>
                                    <span className="flex items-center gap-1 text-red-500 dark:text-red-400">
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
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg transition-colors border border-purple-500/20"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Download size={16} />
                                    <span className="text-sm font-bold">Download PDF</span>
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
                                                <li key={idx} className="text-xs text-red-400 font-medium list-disc list-inside">
                                                    {detail}
                                                </li>
                                            ))}
                                        </ul>
                                        <p className="text-[10px] text-red-400/60 mt-2 italic">* Discrepancy between PDF report and system task records.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {report.is_submitted && (
                            <div className="mt-4 pt-4 border-t border-[var(--border-color)] space-y-3">
                                {report.accomplishments && (
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1 font-bold">Accomplishments</p>
                                        <p className="text-sm text-[var(--text-dim)] font-medium leading-relaxed">{report.accomplishments}</p>
                                    </div>
                                )}
                                {report.challenges && (
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1 font-bold">Challenges</p>
                                        <p className="text-sm text-[var(--text-dim)] font-medium leading-relaxed">{report.challenges}</p>
                                    </div>
                                )}
                                {report.learnings && (
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1 font-bold">Learnings</p>
                                        <p className="text-sm text-[var(--text-dim)] font-medium leading-relaxed">{report.learnings}</p>
                                    </div>
                                )}
                                {report.next_week_goals && (
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1 font-bold">Next Week Goals</p>
                                        <p className="text-sm text-[var(--text-dim)] font-medium leading-relaxed">{report.next_week_goals}</p>
                                    </div>
                                )}
                                <div className="flex items-center gap-4 pt-2">
                                    {report.self_rating && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-[var(--text-dim)]">Self Rating:</span>
                                            <span className="font-bold text-[var(--text-main)] bg-[var(--bg-muted)] px-2 py-0.5 rounded-md border border-[var(--border-color)]">{report.self_rating}/10</span>
                                        </div>
                                    )}
                                    {report.submitted_at && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-[var(--text-dim)]">Submitted:</span>
                                            <span className="text-sm text-[var(--text-dim)] font-medium">{new Date(report.submitted_at).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </Card>
                ))}
                {reportsArray.length === 0 && (
                    <div className="text-center py-20 animate-fade-in">
                        <FileText size={48} className="mx-auto mb-4 text-[var(--text-muted)] opacity-20" />
                        <p className="text-lg font-bold text-[var(--text-main)] uppercase italic">No weekly reports found</p>
                        <p className="text-sm text-[var(--text-dim)]">Reports will appear here once submitted</p>
                    </div>
                )}
            </div>

            {/* Report Details & Mismatch Modal */}
            <Modal
                isOpen={!!selectedReport}
                onClose={() => setSelectedReport(null)}
                title={`Report Details: ${selectedReport?.week_start_date} to ${selectedReport?.week_end_date}`}
                gradient="violet"
                size="lg"
            >
                {selectedReport && (
                    <div className="space-y-6">
                        {/* Status Mismatch Alert */}
                        {selectedReport.status_mismatch && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <p className="font-bold text-red-500 uppercase tracking-tight">Status Mismatch Detected</p>
                                        <p className="text-sm text-red-400 mt-1">There is a discrepancy between the tasks reported in the PDF and the system records for this week.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Side-by-Side Comparison */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-4">
                                <h4 className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <FileText size={14} /> Reported in PDF
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-[var(--bg-muted)] px-3 py-2 rounded-lg">
                                        <span className="text-sm text-[var(--text-dim)]">Completed</span>
                                        <span className="font-bold text-emerald-500">{selectedReport.tasks_completed}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-[var(--bg-muted)] px-3 py-2 rounded-lg">
                                        <span className="text-sm text-[var(--text-dim)]">In Progress</span>
                                        <span className="font-bold text-blue-500">{selectedReport.tasks_in_progress}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-[var(--bg-muted)] px-3 py-2 rounded-lg">
                                        <span className="text-sm text-[var(--text-dim)]">Blocked</span>
                                        <span className="font-bold text-red-500">{selectedReport.tasks_blocked}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                                <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <BarChart2 size={14} /> System Records
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
                                        <span className="text-sm text-emerald-400/80">Completed</span>
                                        <span className="font-bold text-emerald-400">{selectedReport.actual_tasks?.completed ?? 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/20">
                                        <span className="text-sm text-blue-400/80">In Progress</span>
                                        <span className="font-bold text-blue-400">{selectedReport.actual_tasks?.in_progress ?? 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
                                        <span className="text-sm text-red-400/80">Blocked</span>
                                        <span className="font-bold text-red-400">{selectedReport.actual_tasks?.blocked ?? 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Report Content */}
                        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-5 space-y-4">
                            <h4 className="font-bold text-[var(--text-main)] border-b border-[var(--border-color)] pb-2">Report Content</h4>
                            
                            {selectedReport.accomplishments && (
                                <div>
                                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1 font-bold">Accomplishments</p>
                                    <p className="text-sm text-[var(--text-dim)] leading-relaxed bg-[var(--bg-muted)] p-3 rounded-lg">{selectedReport.accomplishments}</p>
                                </div>
                            )}
                            {selectedReport.challenges && (
                                <div>
                                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1 font-bold">Challenges</p>
                                    <p className="text-sm text-[var(--text-dim)] leading-relaxed bg-[var(--bg-muted)] p-3 rounded-lg">{selectedReport.challenges}</p>
                                </div>
                            )}
                            {selectedReport.learnings && (
                                <div>
                                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1 font-bold">Learnings</p>
                                    <p className="text-sm text-[var(--text-dim)] leading-relaxed bg-[var(--bg-muted)] p-3 rounded-lg">{selectedReport.learnings}</p>
                                </div>
                            )}
                            {selectedReport.next_week_goals && (
                                <div>
                                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1 font-bold">Next Week Goals</p>
                                    <p className="text-sm text-[var(--text-dim)] leading-relaxed bg-[var(--bg-muted)] p-3 rounded-lg">{selectedReport.next_week_goals}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            {selectedReport.pdf_url && (
                                <a
                                    href={selectedReport.pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex w-full items-center justify-center gap-2 px-6 py-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl transition-colors border border-purple-500/20 font-bold"
                                >
                                    <Download size={18} />
                                    Download Original PDF
                                </a>
                            )}
                            <Button type="button" onClick={() => setSelectedReport(null)} variant="outline" fullWidth>
                                Close View
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default WeeklyReportsTab;
