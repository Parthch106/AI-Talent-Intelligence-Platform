import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { WeeklyReportsTab } from '../components/monitoring';
import { ChevronDown } from 'lucide-react';

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

interface Intern {
    id: number;
    email: string;
    full_name: string | null;
    department: string | null;
}

const MonitoringReportsPage: React.FC = () => {
    const { user } = useAuth();
    
    // State
    const [selectedIntern, setSelectedIntern] = useState<number | null>(null);
    const [interns, setInterns] = useState<Intern[]>([]);
    const [reports, setReports] = useState<WeeklyReport[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [showInternDropdown, setShowInternDropdown] = useState(false);

    // Fetch interns when page loads (for managers/admins)
    useEffect(() => {
        if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
            fetchInterns();
        } else if (user?.role === 'INTERN') {
            fetchData();
        }
    }, [user?.role]);

    // Fetch data when selectedIntern changes
    useEffect(() => {
        if ((user?.role === 'ADMIN' || user?.role === 'MANAGER') && selectedIntern) {
            fetchData();
        }
    }, [selectedIntern, user?.role]);

    const fetchInterns = async (): Promise<void> => {
        if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
            try {
                const response = await axios.get('/accounts/users/', {
                    params: { role: 'INTERN', department: user.role === 'MANAGER' ? user.department : undefined }
                });
                const internList = Array.isArray(response.data) ? response.data : response.data.results || [];
                setInterns(internList);
                if (internList.length > 0 && !selectedIntern) {
                    setSelectedIntern(internList[0].id);
                }
            } catch (err) {
                console.error('[fetchInterns] Error:', err);
            }
        }
    };

    const fetchData = async (): Promise<void> => {
        setLoading(true);
        try {
            const targetId = user?.role === 'INTERN' ? user.id : selectedIntern;
            if (!targetId) return;

            const reportsRes = await axios.get('/analytics/weekly-reports/', { params: { intern_id: targetId } });
            const reports = Array.isArray(reportsRes.data.weekly_reports) ? reportsRes.data.weekly_reports : [];
            setReports(reports);
        } catch (err: any) {
            console.error('[fetchData] Error fetching reports:', err.message || err);
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
                    <WeeklyReportsTab reports={reports} onSubmitReport={() => {}} />
                )}
            </div>
        </div>
    );
};

export default MonitoringReportsPage;
