import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { TasksTab } from '../components/monitoring';
import { Card, ContributionHeatmap } from '../components/common';
import { ChevronDown } from 'lucide-react';

// Types (matching MonitoringDashboard)
interface Task {
    id: number;
    task_id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    due_date: string;
    estimated_hours: number;
    actual_hours: number;
    quality_rating: number | null;
    code_review_score: number | null;
    bug_count: number;
    mentor_feedback: string;
    rework_required: boolean;
}

interface Intern {
    id: number;
    email: string;
    full_name: string | null;
    department: string | null;
}

const MonitoringTasksPage: React.FC = () => {
    const { user } = useAuth();
    
    // State
    const [selectedIntern, setSelectedIntern] = useState<number | null>(null);
    const [interns, setInterns] = useState<Intern[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [monthFilter, setMonthFilter] = useState<number | 'all'>('all');
    const [yearFilter, setYearFilter] = useState<number | 'all'>(new Date().getFullYear());
    const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [heatmapLoading, setHeatmapLoading] = useState<boolean>(false);
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

    const fetchHeatmapData = async (targetId: number): Promise<void> => {
        setHeatmapLoading(true);
        try {
            const params: any = { intern_id: targetId };
            
            if (yearFilter !== 'all') {
                params.start_date = `${yearFilter}-01-01`;
                params.end_date = `${yearFilter}-12-31`;
            } else {
                params.months = 12;
            }

            const response = await axios.get('/analytics/heatmap/tasks/', { params });
            setHeatmapData(response.data.heatmap || {});
        } catch (error) {
            console.error('Error fetching heatmap data:', error);
            setHeatmapData({});
        } finally {
            setHeatmapLoading(false);
        }
    };

    const fetchData = async (): Promise<void> => {
        setLoading(true);
        try {
            const targetId = user?.role === 'INTERN' ? user.id : selectedIntern;
            if (!targetId) return;

            fetchHeatmapData(targetId);

            const params: any = { 
                intern_id: targetId,
                limit: 1000
            };

            if (monthFilter !== 'all') params.month = monthFilter;
            if (yearFilter !== 'all') params.year = yearFilter;

            const tasksRes = await axios.get('/analytics/tasks/', { params });
            const tasks = Array.isArray(tasksRes.data.tasks) ? tasksRes.data.tasks : [];
            setTasks(tasks);
        } catch (err: any) {
            console.error('[fetchData] Error fetching tasks:', err.message || err);
        }
        setLoading(false);
    };

    // Re-fetch when filters change
    useEffect(() => {
        const targetId = user?.role === 'INTERN' ? user.id : selectedIntern;
        if (targetId) {
            fetchData();
        }
    }, [monthFilter, yearFilter]);

    const handleTaskStatusChange = async (taskId: number, newStatus: string): Promise<void> => {
        try {
            await axios.patch(`/analytics/tasks/${taskId}/`, { status: newStatus });
            fetchData();
        } catch (err) {
            console.error('Error updating task status:', err);
        }
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
                            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Tasks</span>
                        </h1>
                        <p className="text-slate-400 mt-1">Manage and track intern tasks</p>
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
                            <p className="text-slate-400">Loading tasks...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <Card className="mb-6 p-4">
                            {heatmapLoading ? (
                                <div className="flex items-center justify-center h-32">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
                                </div>
                            ) : (
                                <ContributionHeatmap
                                    data={heatmapData}
                                    year={yearFilter === 'all' ? new Date().getFullYear() : yearFilter}
                                    title={`Task Contribution ${yearFilter !== 'all' ? `(${yearFilter})` : '(Last 12 Months)'}`}
                                    colorScheme="green"
                                />
                            )}
                        </Card>
                        <TasksTab
                            tasks={tasks}
                            onAddTask={() => {}}
                            canCreate={user?.role === 'ADMIN' || user?.role === 'MANAGER'}
                            onStatusChange={handleTaskStatusChange}
                            onRefresh={fetchData}
                            internId={selectedIntern || undefined}
                            monthFilter={monthFilter}
                            setMonthFilter={setMonthFilter}
                            yearFilter={yearFilter}
                            setYearFilter={setYearFilter}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default MonitoringTasksPage;
