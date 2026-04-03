import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge, Modal } from '../components/common';
import {
    FileText, Upload, CheckCircle, Clock, AlertTriangle,
    ChevronRight, FileUp, Calendar, Target, TrendingUp, BookOpen
} from 'lucide-react';

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
    self_rating: number | null;
    is_submitted: boolean;
    pdf_report?: string;
}

const UploadWeeklyReport: React.FC = () => {
    const { user } = useAuth();
    const [reports, setReports] = useState<WeeklyReport[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [showModal, setShowModal] = useState(false);
    const [success, setSuccess] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
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
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                setError('Please select a PDF file only');
                setPdfFile(null);
                return;
            }
            setPdfFile(file);
            setError('');
        }
    };

    const handleSubmitReport = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!pdfFile) {
            setError('Please select a PDF file to upload');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('pdf_report', pdfFile);

            await axios.post('/analytics/weekly-reports/submit/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setSuccess('Weekly report submitted successfully!');
            setShowModal(false);
            setPdfFile(null);
            fetchReports();
            setTimeout(() => setSuccess(''), 5000);
        } catch (err: any) {
            console.error('Error submitting report:', err);
            setError(err.response?.data?.error || 'Failed to submit report. Please try again.');
        }
        setLoading(false);
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
                    onClick={() => setShowModal(true)}
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
                    <div className="flex justify-center items-center h-64">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                            <p className="text-[var(--text-dim)]">Loading reports...</p>
                        </div>
                    </div>
                ) : reports.length === 0 ? (
                    <Card padding="lg" className="text-center py-12">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium text-[var(--text-main)]">No weekly reports found</p>
                        <p className="text-sm text-[var(--text-dim)] mt-1">Submit your first weekly report to get started</p>
                    </Card>
                ) : (
                    reports.map((report) => (
                        <Card key={report.id} hover padding="lg" className="animate-slide-up">
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

                                    {report.is_submitted && report.accomplishments && (
                                        <div className="pt-3 border-t border-[var(--border-color)]">
                                            <p className="text-sm text-[var(--text-dim)] line-clamp-2">
                                                {report.accomplishments}
                                            </p>
                                            {report.self_rating && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-sm text-[var(--text-muted)]">Self Rating:</span>
                                                    <div className="flex items-center gap-1">
                                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                                                            <span
                                                                key={star}
                                                                className={`text-sm ${star <= report.self_rating! ? 'text-amber-400' : 'text-[var(--border-color)] opacity-50'}`}
                                                            >
                                                                ★
                                                            </span>
                                                        ))}
                                                        <span className="text-[var(--text-main)] ml-1">{report.self_rating}/10</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <ChevronRight size={20} className="text-[var(--text-muted)]" />
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Submit Report Modal - PDF Only */}
            <Modal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setPdfFile(null);
                    setError('');
                }}
                title="Submit Weekly Report"
                gradient="violet"
                size="md"
            >
                <form onSubmit={handleSubmitReport} className="space-y-5">
                    <div className="bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl p-4 mb-4">
                        <p className="text-sm text-[var(--text-dim)]">
                            Upload your weekly report as a PDF document. The system will automatically
                            parse and extract the relevant information from your report.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">
                            <FileUp size={14} className="inline mr-1" />
                            Upload PDF Report (Required)
                        </label>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-500/20 file:text-purple-400 hover:file:bg-purple-500/30 cursor-pointer"
                            />
                            {pdfFile && (
                                <div className="mt-2 flex items-center gap-2 text-emerald-400">
                                    <CheckCircle size={16} />
                                    <span className="text-sm">{pdfFile.name}</span>
                                    <span className="text-xs text-[var(--text-muted)]">
                                        ({(pdfFile.size / 1024).toFixed(1)} KB)
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            onClick={() => {
                                setShowModal(false);
                                setPdfFile(null);
                                setError('');
                            }}
                            variant="outline"
                            fullWidth
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            gradient="purple"
                            fullWidth
                            disabled={loading || !pdfFile}
                        >
                            {loading ? 'Submitting...' : 'Submit Report'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default UploadWeeklyReport;
