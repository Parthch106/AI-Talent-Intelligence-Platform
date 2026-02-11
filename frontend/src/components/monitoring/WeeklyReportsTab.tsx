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
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Weekly Reports</h2>
                    <p className="text-gray-500 mt-1">Track weekly progress and accomplishments</p>
                </div>
                <Button
                    onClick={onSubmitReport}
                    icon={<Plus size={18} />}
                    gradient="violet"
                >
                    Submit Report
                </Button>
            </div>

            <div className="space-y-4">
                {reports.map((report) => (
                    <Card key={report.id} hover padding="lg">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-semibold text-gray-800">
                                        {report.week_start_date} - {report.week_end_date}
                                    </h3>
                                    <Badge variant={report.is_submitted ? 'success' : 'warning'}>
                                        {report.is_submitted ? 'Submitted' : 'Draft'}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <CheckCircle size={14} className="text-emerald-500" />
                                        {report.tasks_completed} completed
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock size={14} className="text-blue-500" />
                                        {report.tasks_in_progress} in progress
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <AlertTriangle size={14} className="text-red-500" />
                                        {report.tasks_blocked} blocked
                                    </span>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-gray-400" />
                        </div>
                        {report.is_submitted && report.accomplishments && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-sm text-gray-600 line-clamp-2">{report.accomplishments}</p>
                                {report.self_rating && (
                                    <div className="flex items-center gap-2 mt-3">
                                        <span className="text-sm text-gray-500">Self Rating:</span>
                                        <span className="font-semibold text-gray-800">{report.self_rating}/10</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                ))}
                {reports.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No weekly reports found</p>
                        <p className="text-sm">Reports will appear here once submitted</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WeeklyReportsTab;
