import React, { useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useMonitoring } from '../context/MonitoringContext';
import { WeeklyReportsTab } from '../components/monitoring';
import { ChevronDown, CheckCircle, AlertTriangle, FileUp } from 'lucide-react';
import { Modal, Button } from '../components/common';

// Types (matching MonitoringDashboard)
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


const MonitoringReportsPage: React.FC = () => {
    const { user } = useAuth();
    
    // State
    // Global State from context
    const { selectedInternId: selectedIntern, setSelectedInternId: setSelectedIntern, interns } = useMonitoring();
    
    // Local State
    const [reports, setReports] = useState<WeeklyReport[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [showInternDropdown, setShowInternDropdown] = useState(false);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Fetch data when page loads (for interns) or when selectedIntern changes
    const fetchData = useCallback(async (): Promise<void> => {
        setLoading(true);
        try {
            const targetId = user?.role === 'INTERN' ? user.id : selectedIntern;
            if (!targetId) return;

            const reportsRes = await axios.get('/analytics/weekly-reports/', { params: { intern_id: targetId } });
            const reports = Array.isArray(reportsRes.data.weekly_reports) ? reportsRes.data.weekly_reports : [];
            setReports(reports);
        } catch (err: unknown) {
            const apiError = err as { message?: string };
            console.error('[fetchData] Error fetching reports:', apiError.message || err);
        }
        setLoading(false);
    }, [user?.role, user?.id, selectedIntern]);

    // Fetch data when page loads (for interns) or when selectedIntern changes
    useEffect(() => {
        if (user?.role === 'INTERN') {
            fetchData();
        } else if (selectedIntern) {
            fetchData();
        }
    }, [selectedIntern, user?.role, fetchData]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                setStatusMsg({ type: 'error', text: 'Please select a PDF file only' });
                setPdfFile(null);
                return;
            }
            setPdfFile(file);
            setStatusMsg(null);
        }
    };

    const handleSubmitReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pdfFile) {
            setStatusMsg({ type: 'error', text: 'Please select a PDF file to upload' });
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('pdf_report', pdfFile);

            await axios.post('/analytics/weekly-reports/submit/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setStatusMsg({ type: 'success', text: 'Weekly report submitted successfully!' });
            setShowSubmitModal(false);
            setPdfFile(null);
            fetchData();
            setTimeout(() => setStatusMsg(null), 5000);
        } catch (err: unknown) {
            console.error('Error submitting report:', err);
            const apiError = err as { response?: { data?: { error?: string } } };
            setStatusMsg({ type: 'error', text: apiError.response?.data?.error || 'Failed to submit report' });
        }
        setLoading(false);
    };

    const getSelectedInternName = (): string => {
        if (user?.role === 'INTERN') return user.full_name || user.email;
        const selected = interns.find(i => i.id === selectedIntern);
        return selected?.full_name || selected?.email || 'Select Intern';
    };

    const getGradient = (name: string): string => {
        const colors = [
            'from-pink-500 to-rose-500', 'from-purple-500 to-indigo-500',
            'from-blue-500 to-cyan-500', 'from-green-500 to-emerald-500',
            'from-yellow-500 to-orange-500', 'from-red-500 to-pink-500'
        ];
        const index = name ? name.charCodeAt(0) % colors.length : 0;
        return colors[index];
    };

    const getInitials = (name: string | null): string => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="min-h-screen animate-fade-in overflow-visible">
            {/* Header */}
            <div className="bg-[var(--bg-muted)] border-b-0 px-6 py-4 backdrop-blur-xl overflow-visible z-30 relative">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 overflow-visible">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-main)]">
                            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Weekly Reports</span>
                        </h1>
                        <p className="text-[var(--text-dim)] mt-1">Review and manage intern weekly reports</p>
                    </div>
                    {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                        <div className="relative z-30">
                            <button
                                onClick={() => setShowInternDropdown(!showInternDropdown)}
                                className="flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl hover:border-purple-500/50 transition-all"
                            >
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getGradient(getSelectedInternName())} flex items-center justify-center text-[var(--text-main)] font-bold text-xs`}>
                                    {getInitials(interns.find(i => i.id === selectedIntern)?.full_name || null)}
                                </div>
                                <span className="text-[var(--text-main)]">{getSelectedInternName()}</span>
                                <ChevronDown size={16} className={`text-[var(--text-dim)] transition-transform ${showInternDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showInternDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--border-color)] rounded-xl shadow-xl z-[9999] isolate animate-scale-in">
                                    <div className="p-2">
                                        {interns.map((intern) => (
                                            <button
                                                key={intern.id}
                                                onClick={() => {
                                                    setSelectedIntern(intern.id);
                                                    setShowInternDropdown(false);
                                                }}
                                                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${selectedIntern === intern.id ? 'bg-purple-500/20' : 'hover:bg-[var(--bg-muted)]'}`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getGradient(intern.full_name || intern.email)} flex items-center justify-center text-[var(--text-main)] font-bold text-xs`}>
                                                    {getInitials(intern.full_name)}
                                                </div>
                                                <span className="text-[var(--text-main)] text-sm">{intern.full_name || intern.email}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Status Messages */}
            {statusMsg && (
                <div className={`mx-6 mt-4 px-4 py-3 rounded-xl flex items-center gap-2 animate-slide-up ${
                    statusMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                    {statusMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                    {statusMsg.text}
                </div>
            )}

            {/* Content */}
            <div className="p-6">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                            <p className="text-[var(--text-dim)]">Loading reports...</p>
                        </div>
                    </div>
                ) : (
                    <WeeklyReportsTab 
                        reports={reports} 
                        onSubmitReport={() => setShowSubmitModal(true)} 
                        showSubmit={user?.role === 'INTERN'}
                    />
                )}
            </div>

            {/* Submit Report Modal */}
            <Modal
                isOpen={showSubmitModal}
                onClose={() => {
                    setShowSubmitModal(false);
                    setPdfFile(null);
                    setStatusMsg(null);
                }}
                title="Submit Weekly Report"
                gradient="violet"
                size="md"
            >
                <form onSubmit={handleSubmitReport} className="space-y-5">
                    <div className="bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl p-4">
                        <p className="text-sm text-[var(--text-dim)]">
                            Upload your weekly report as a PDF. Our AI engine will automatically parse it to synchronize with system task records.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">
                            <FileUp size={14} className="inline mr-1" />
                            PDF Document
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
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            onClick={() => setShowSubmitModal(false)}
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
                            {loading ? 'Processing...' : 'Upload & Sync'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default MonitoringReportsPage;
