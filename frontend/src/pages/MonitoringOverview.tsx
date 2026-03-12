import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { OverviewTab } from '../components/monitoring';
import { ChevronDown } from 'lucide-react';

// Types (matching MonitoringDashboard)
interface Task {
    id: number;
    task_id: string;
    title: string;
    status: string;
    due_date: string;
}

interface Attendance {
    id: number;
    date: string;
    status: string;
}

interface PerformanceMetric {
    overall_performance_score: number;
    productivity_score: number;
    quality_score: number;
    engagement_score: number;
    growth_score: number;
    dropout_risk: string;
}

interface Intern {
    id: number;
    email: string;
    full_name: string | null;
    department: string | null;
}

const MonitoringOverviewPage: React.FC = () => {
    const { user } = useAuth();
    
    // State
    const [selectedIntern, setSelectedIntern] = useState<number | null>(null);
    const [interns, setInterns] = useState<Intern[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [performance, setPerformance] = useState<PerformanceMetric | null>(null);
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

            const [tasksRes, attendanceRes, performanceRes] = await Promise.all([
                axios.get('/analytics/tasks/', { params: { intern_id: targetId } }),
                axios.get('/analytics/attendance/', { params: { intern_id: targetId } }),
                axios.get('/analytics/performance/', { params: { intern_id: targetId } })
            ]);

            const tasks = Array.isArray(tasksRes.data.tasks) ? tasksRes.data.tasks : [];
            const attendance = Array.isArray(attendanceRes.data.attendance) ? attendanceRes.data.attendance : [];
            const performance = Array.isArray(performanceRes.data.performance_metrics) 
                ? performanceRes.data.performance_metrics[0] || null 
                : null;

            setTasks(tasks);
            setAttendance(attendance);
            setPerformance(performance);
        } catch (err: any) {
            console.error('[fetchData] Error fetching data:', err.message || err);
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
            <div className="bg-slate-800/30 border-b-0 px-6 py-4 backdrop-blur-xl overflow-visible z-30 relative">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 overflow-visible">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Overview</span>
                        </h1>
                        <p className="text-slate-400 mt-1">Summary of intern activities and performance</p>
                    </div>
                    {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                        <div className="relative z-30">
                            <button
                                onClick={() => setShowInternDropdown(!showInternDropdown)}
                                className="flex items-center gap-3 px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-purple-500/50 transition-all"
                            >
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getGradient(getSelectedInternName())} flex items-center justify-center text-white font-bold text-xs`}>
                                    {getInitials(interns.find(i => i.id === selectedIntern)?.full_name || null)}
                                </div>
                                <span className="text-white">{getSelectedInternName()}</span>
                                <ChevronDown size={16} className={`text-slate-400 transition-transform ${showInternDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showInternDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-xl z-[9999] isolate animate-scale-in">
                                    <div className="p-2">
                                        {interns.map((intern) => (
                                            <button
                                                key={intern.id}
                                                onClick={() => {
                                                    setSelectedIntern(intern.id);
                                                    setShowInternDropdown(false);
                                                }}
                                                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${selectedIntern === intern.id ? 'bg-purple-500/20' : 'hover:bg-slate-700'}`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getGradient(intern.full_name || intern.email)} flex items-center justify-center text-white font-bold text-xs`}>
                                                    {getInitials(intern.full_name)}
                                                </div>
                                                <span className="text-white text-sm">{intern.full_name || intern.email}</span>
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
                            <p className="text-slate-400">Loading data...</p>
                        </div>
                    </div>
                ) : (
                    <OverviewTab tasks={tasks} attendance={attendance} performance={performance} />
                )}
            </div>
        </div>
    );
};

export default MonitoringOverviewPage;
