import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ContributionHeatmap, Card } from '../components/common';
import { useSearchParams } from 'react-router-dom';
import { TasksTab } from '../components/monitoring';
import toast from 'react-hot-toast';

interface Task {
    id: number;
    task_id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    due_date: string;
    quality_rating: number | null;
    code_review_score: number | null;
    project?: {
        id: number;
        name: string;
        status: string;
    } | null;
    created_by?: {
        full_name: string;
    };
}

const InternTasks: React.FC = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const viewParam = searchParams.get('view') as 'grid' | 'list' | 'board' | null;

    const [tasks, setTasks] = useState<Task[]>([]);
    const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [heatmapLoading, setHeatmapLoading] = useState(true);
    
    // Filter states for TasksTab
    const [monthFilter, setMonthFilter] = useState<number | 'all'>('all');
    const [yearFilter, setYearFilter] = useState<number | 'all'>(new Date().getFullYear());
    const [filterDate, setFilterDate] = useState<string | null>(null);

    const fetchTasks = React.useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const res = await axios.get('/analytics/tasks/');
            setTasks(res.data.tasks || []);
        } catch (err) {
            console.error('Failed to load tasks:', err);
            toast.error('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    const fetchHeatmapData = React.useCallback(async () => {
        if (!user?.id) return;
        setHeatmapLoading(true);
        try {
            const res = await axios.get('/analytics/heatmap/tasks/', {
                params: { months: 12 }
            });
            setHeatmapData(res.data.heatmap || {});
        } catch (err) {
            console.error('Failed to load heatmap data:', err);
        } finally {
            setHeatmapLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchTasks();
        fetchHeatmapData();
    }, [fetchTasks, fetchHeatmapData]);

    const handleStatusChange = async (taskId: number, newStatus: string) => {
        try {
            await axios.patch(`/analytics/tasks/${taskId}/update-status/`, { status: newStatus });
            toast.success(`Task marked as ${newStatus.replace('_', ' ')}`);
            fetchTasks();
        } catch {
            toast.error('Could not update status');
        }
    };

    const handleHeatmapClick = (date: string) => {
        setFilterDate(filterDate === date ? null : date);
    };

    return (
        <div className="min-h-screen bg-[var(--bg-color)] p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[var(--text-main)]">
                        My <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Tasks</span>
                    </h1>
                    <p className="text-[var(--text-dim)] mt-1">View and manage your assigned tasks</p>
                </div>

                {/* Heatmap Section */}
                <Card className="mb-10 p-4">
                    {heatmapLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
                        </div>
                    ) : (
                        <ContributionHeatmap
                            data={heatmapData}
                            title="My Task Activity"
                            colorScheme="green"
                            onCellClick={handleHeatmapClick}
                            year={yearFilter === 'all' ? new Date().getFullYear() : yearFilter}
                        />
                    )}
                </Card>

                {filterDate && (
                    <div className="flex items-center gap-3 mb-6 animate-slide-in">
                        <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                            <span className="text-xs font-black text-purple-400 uppercase tracking-widest">Showing Activity for:</span>
                            <span className="text-sm font-bold text-[var(--text-main)]">{new Date(filterDate).toLocaleDateString()}</span>
                        </div>
                        <button 
                            onClick={() => setFilterDate(null)}
                            className="text-xs font-black text-[var(--text-muted)] hover:text-[var(--text-main)] uppercase tracking-widest transition-colors"
                        >
                            Clear Filter
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                            <p className="text-[var(--text-dim)] text-sm font-bold uppercase tracking-widest">Synchronizing Tasks...</p>
                        </div>
                    </div>
                ) : (
                    <TasksTab
                        tasks={tasks}
                        onAddTask={() => {}} // Interns cannot add tasks
                        canCreate={false}
                        onStatusChange={handleStatusChange}
                        onRefresh={fetchTasks}
                        monthFilter={monthFilter}
                        setMonthFilter={setMonthFilter}
                        yearFilter={yearFilter}
                        setYearFilter={setYearFilter}
                        dateFilter={filterDate}
                        setDateFilter={setFilterDate}
                        initialView={viewParam || undefined}
                    />
                )}
            </div>
        </div>
    );
};

export default InternTasks;