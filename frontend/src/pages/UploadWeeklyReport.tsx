import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge } from '../components/common';
import {
    FileText, Upload, CheckCircle, Clock, AlertTriangle,
    ChevronRight, FileUp, Calendar, Target, TrendingUp, Trash2, Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface WeeklyReport {
    id: number;
    week_start_date: string;
    week_end_date: string;
    tasks_completed: number;
    tasks_in_progress: number;
    tasks_blocked: number;
    accomplishments: string;
    challenges: string;
    learnings: string;
    next_week_goals: string;
    is_submitted: boolean;
    pdf_url?: string;
    status_mismatch?: boolean;
}

const UploadWeeklyReport: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [reports, setReports] = useState<WeeklyReport[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [success, setSuccess] = useState<string>('');
    const [error, setError] = useState<string>('');

    const fetchReports = React.useCallback(async () => {
        setLoading(true);
        try {
            // For interns, don't pass intern_id - backend uses current user
            // For admin/manager, pass intern_id to view specific intern's reports
            const params = user?.role === 'INTERN' ? {} : { intern_id: user?.id };
            const response = await axios.get('/analytics/weekly-reports/', { params });
            setReports(response.data.weekly_reports || []);
        } catch (err) {
            console.error('Error fetching reports:', err);
        }
        setLoading(false);
    }, [user?.role, user?.id]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const getFullPdfUrl = (url: string | null | undefined) => {
        if (!url) return '#';
        if (url.startsWith('http')) return url;
        const base = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8000`;
        const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
        return `${cleanBase}${url}`;
    };

    const handleFinalizeDraft = async (reportId: number) => {
        toast.promise(axios.patch('/analytics/weekly-reports/', {
            report_id: reportId,
            is_submitted: true
        }), {
            loading: 'Finalizing draft...',
            success: () => {
                fetchReports();
                return 'Draft successfully submitted';
            },
            error: (err) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (err as any).response?.data?.error || 'Failed to finalize draft';
            }
        });
    };

    const handleDeleteReport = async (reportId: number) => {
        if (!window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
            return;
        }

        toast.promise(axios.delete('/analytics/weekly-reports/', {
            data: { report_id: reportId }
        }), {
            loading: 'Decommissioning archived report...',
            success: () => {
                fetchReports();
                return 'Report successfully decommissioned';
            },
            error: (err) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (err as any).response?.data?.error || 'Failed to decommission report';
            }
        });
    };

    const getStats = () => {
        const submitted = reports.filter(r => r.is_submitted).length;
        const pending = reports.filter(r => !r.is_submitted).length;
        const totalCompleted = reports.reduce((sum, r) => sum + r.tasks_completed, 0);
        return { submitted, pending, totalCompleted, total: reports.length };
    };

    const stats = getStats();

    return (
        <div className="min-h-screen animate-fade-in p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-[var(--text-main)]">
                    Weekly <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Reports</span>
                </h1>
                <p className="text-[var(--text-dim)] mt-1">Submit and track your weekly progress reports</p>
            </div>

            {/* Success/Error Messages */}
            {success && (
                <div className="mb-6 px-4 py-3 rounded-xl flex items-center gap-2 animate-slide-up bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <CheckCircle size={18} />
                    {success}
                </div>
            )}

            {error && (
                <div className="mb-6 px-4 py-3 rounded-xl flex items-center gap-2 animate-slide-up bg-red-500/10 border border-red-500/30 text-red-400">
                    <AlertTriangle size={18} />
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card padding="md" className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <FileText size={20} className="text-purple-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-main)]">{stats.total}</p>
                            <p className="text-sm text-[var(--text-dim)]">Total Reports</p>
                        </div>
                    </div>
                </Card>
                <Card padding="md" className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <CheckCircle size={20} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-main)]">{stats.submitted}</p>
                            <p className="text-sm text-[var(--text-dim)]">Submitted</p>
                        </div>
                    </div>
                </Card>
                <Card padding="md" className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                            <Clock size={20} className="text-amber-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-main)]">{stats.pending}</p>
                            <p className="text-sm text-[var(--text-dim)]">Drafts</p>
                        </div>
                    </div>
                </Card>
                <Card padding="md" className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Target size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-main)]">{stats.totalCompleted}</p>
                            <p className="text-sm text-[var(--text-dim)]">Tasks Completed</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Submit Button */}
            <div className="mb-8">
                <Button
                    onClick={() => navigate('/workspace/submit-report/new')}
                    icon={<Upload size={18} />}
                    gradient="purple"
                    className="shadow-lg shadow-purple-500/25"
                >
                    Submit New Weekly Report
                </Button>
            </div>

            {/* Reports List */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-[var(--text-main)] mb-4">Report History</h2>

                {loading ? (
                    Array.from({ length: 2 }).map((_, idx) => (
                        <Card key={`skeleton-${idx}`} padding="lg" className="animate-pulse">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div className="flex-1 w-full">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-9 h-9 bg-[var(--border-color)] rounded-lg"></div>
                                        <div className="h-6 bg-[var(--border-color)] rounded-md w-48"></div>
                                        <div className="h-5 bg-[var(--border-color)] rounded-full w-20"></div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div className="h-4 bg-[var(--border-color)] rounded w-24"></div>
                                        <div className="h-4 bg-[var(--border-color)] rounded w-24"></div>
                                        <div className="h-4 bg-[var(--border-color)] rounded w-24"></div>
                                    </div>
                                    <div className="pt-3 border-t border-[var(--border-color)]">
                                        <div className="h-3 bg-[var(--border-color)] rounded w-full mb-2"></div>
                                        <div className="h-3 bg-[var(--border-color)] rounded w-3/4"></div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-[var(--border-color)] rounded-lg"></div>
                                    <div className="w-8 h-8 bg-[var(--border-color)] rounded-lg"></div>
                                    <div className="w-5 h-5 bg-[var(--border-color)] rounded-full"></div>
                                </div>
                            </div>
                        </Card>
                    ))
                ) : reports.length === 0 ? (
                    <Card padding="lg" className="text-center py-12">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium text-[var(--text-main)]">No weekly reports found</p>
                        <p className="text-sm text-[var(--text-dim)] mt-1">Submit your first weekly report to get started</p>
                    </Card>
                ) : (
                    reports.map((report) => (
                        <Card key={report.id} hover padding="lg" className="animate-fade-in">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-purple-500/20 rounded-lg">
                                            <Calendar size={18} className="text-purple-400" />
                                        </div>
                                        <h3 className="font-semibold text-[var(--text-main)] text-lg">
                                            {report.week_start_date} - {report.week_end_date}
                                        </h3>
                                        <Badge
                                            variant={report.is_submitted ? 'success' : 'warning'}
                                            withDot
                                            size="sm"
                                        >
                                            {report.is_submitted ? 'Submitted' : 'Draft'}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <CheckCircle size={14} className="text-emerald-400" />
                                            <span className="text-[var(--text-dim)]">{report.tasks_completed} Completed</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <TrendingUp size={14} className="text-blue-400" />
                                            <span className="text-[var(--text-dim)]">{report.tasks_in_progress} In Progress</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <AlertTriangle size={14} className="text-red-400" />
                                            <span className="text-[var(--text-dim)]">{report.tasks_blocked} Blocked</span>
                                        </div>
                                    </div>

                                    {report.is_submitted && !report.status_mismatch && (
                                        <div className="mt-3 flex items-center gap-2 text-emerald-400 bg-emerald-500/5 px-3 py-2 rounded-lg border border-emerald-500/10">
                                            <CheckCircle size={16} />
                                            <span className="text-xs font-bold uppercase tracking-wider">Data Synchronized</span>
                                        </div>
                                    )}

                                    {report.is_submitted && report.accomplishments && (
                                        <div className="pt-3 border-t border-[var(--border-color)]">
                                            <p className="text-sm text-[var(--text-dim)] line-clamp-2">
                                                {report.accomplishments}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {!report.is_submitted && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border-emerald-500/20"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleFinalizeDraft(report.id);
                                            }}
                                            title="Finalize & Submit"
                                            icon={<CheckCircle size={16} />}
                                        >
                                            Submit
                                        </Button>
                                    )}
                                    {report.pdf_url && (
                                        <a
                                            href={getFullPdfUrl(report.pdf_url)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 rounded-lg transition-colors border border-purple-500/20"
                                            onClick={(e) => e.stopPropagation()}
                                            title="View PDF"
                                        >
                                            <Eye size={16} />
                                        </a>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteReport(report.id);
                                        }}
                                        icon={<Trash2 size={16} />}
                                    />
                                    <ChevronRight size={20} className="text-[var(--text-muted)]" />
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Submit Report Modal - PDF Only */}
        </div>
    );
};

export default UploadWeeklyReport;
