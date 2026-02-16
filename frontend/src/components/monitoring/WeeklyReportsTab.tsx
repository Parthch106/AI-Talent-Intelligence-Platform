import React from 'react';
import { Plus, FileText, CheckCircle, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
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
    self_rating: number | null;
    is_submitted: boolean;
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
                            <ChevronRight size={20} className="text-slate-400" />
                        </div>
                        {report.is_submitted && report.accomplishments && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <p className="text-sm text-slate-300 line-clamp-2">{report.accomplishments}</p>
                                {report.self_rating && (
                                    <div className="flex items-center gap-2 mt-3">
                                        <span className="text-sm text-slate-400">Self Rating:</span>
                                        <span className="font-semibold text-white">{report.self_rating}/10</span>
                                    </div>
                                )}
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
