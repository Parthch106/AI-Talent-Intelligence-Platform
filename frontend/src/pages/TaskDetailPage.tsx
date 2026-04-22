import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    ChevronLeft, Calendar, Clock, Award, Star, 
    CheckCircle, AlertTriangle, 
    PlayCircle, FileText, User, Layers, History,
    ArrowRight, Search, Filter, Check, X, ChevronDown,
    ChevronRight, ArrowLeft, Sparkles, Bug, MessageSquare
} from 'lucide-react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useMonitoring } from '../context/MonitoringContext';
import { Card, Button, Badge } from '../components/common';
import toast from 'react-hot-toast';

interface Task {
    id: number;
    task_id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    due_date: string;
    assigned_at: string;
    completed_at: string | null;
    submitted_at: string | null;
    estimated_hours: number;
    actual_hours: number;
    quality_rating: number | null;
    code_review_score: number | null;
    bug_count: number;
    mentor_feedback: string | null;
    rework_required: boolean;
    intern?: {
        id: number;
        name: string;
        email: string;
    };
    project?: {
        id: number;
        name: string;
    };
    module?: {
        id: number;
        name: string;
    };
}

const STATUS_STEPS = [
    { status: 'ASSIGNED', label: 'Assigned', icon: User, color: 'text-blue-500' },
    { status: 'IN_PROGRESS', label: 'In Progress', icon: PlayCircle, color: 'text-indigo-500' },
    { status: 'SUBMITTED', label: 'Submitted', icon: FileText, color: 'text-yellow-500' },
    { status: 'COMPLETED', label: 'Completed', icon: CheckCircle, color: 'text-emerald-500' },
];

const TaskDetailPage: React.FC = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedInternId } = useMonitoring();
    
    // Core state
    const [task, setTask] = useState<Task | null>(null);
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [updating, setUpdating] = useState(false);

    // Filter/Selector state
    const [statusFilter, setStatusFilter] = useState<string | 'ALL'>('ALL');
    const [priorityFilter, setPriorityFilter] = useState<string | 'ALL'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [showSelector, setShowSelector] = useState(false);

    const [evaluation, setEvaluation] = useState({
        quality_rating: 0,
        code_review_score: 0,
        bug_count: 0,
        mentor_feedback: '',
        rework_required: false,
        status: ''
    });

    const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
    const baseUrl = isManager ? '/management/tasks' : '/workspace/my-tasks';

    // Fetch all tasks for the selector
    const fetchAllTasks = async () => {
        try {
            setTasksLoading(true);
            const params: any = { limit: 1000 };
            if (isManager && selectedInternId) {
                params.intern_id = selectedInternId;
            }
            const response = await axios.get('/analytics/tasks/', { params });
            const tasksData = response.data.tasks || [];
            setAllTasks(tasksData);
            
            // If no taskId is provided, redirect to the first task
            if (!taskId && tasksData.length > 0) {
                const targetId = tasksData[0].id;
                const path = isManager ? `/management/tasks/${targetId}` : `/workspace/tasks/${targetId}`;
                navigate(path, { replace: true });
            }
        } catch (error) {
            console.error('Error fetching tasks list:', error);
        } finally {
            setTasksLoading(false);
        }
    };

    // Filtered tasks for the selector
    const filteredTasks = useMemo(() => {
        return allTasks.filter(t => {
            const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
            const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
            const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                t.task_id?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesStatus && matchesPriority && matchesSearch;
        });
    }, [allTasks, statusFilter, priorityFilter, searchTerm]);

    const fetchTaskDetails = async () => {
        if (!taskId || taskId === 'details') return;
        try {
            setLoading(true);
            const response = await axios.get(`/analytics/tasks/${taskId}/evaluate/`);
            const data = response.data;
            setTask({
                ...data,
                id: data.task_id, 
                task_id: data.task_number,
                quality_rating: data.evaluation?.quality_rating,
                code_review_score: data.evaluation?.code_review_score,
                bug_count: data.evaluation?.bug_count,
                mentor_feedback: data.evaluation?.mentor_feedback,
                rework_required: data.evaluation?.rework_required,
            });
        } catch (error) {
            console.error('Error fetching task details:', error);
            toast.error('Failed to load task details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isManager, selectedInternId]);

    useEffect(() => {
        if (taskId && taskId !== 'details') {
            fetchTaskDetails();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskId]);

    useEffect(() => {
        if (task) {
            setEvaluation({
                quality_rating: task.quality_rating || 0,
                code_review_score: task.code_review_score || 0,
                bug_count: task.bug_count || 0,
                mentor_feedback: task.mentor_feedback || '',
                rework_required: task.rework_required || false,
                status: task.status
            });
        }
    }, [task]);

    const handleUpdateStatus = async (newStatus: string) => {
        setUpdating(true);
        toast.promise(axios.patch(`/analytics/tasks/${task!.id}/update-status/`, { status: newStatus }), {
            loading: `Transitioning task to ${newStatus.replace('_', ' ')}...`,
            success: () => {
                fetchTaskDetails();
                setUpdating(false);
                return `Status synchronized to ${newStatus.replace('_', ' ')}`;
            },
            error: (err) => {
                setUpdating(false);
                return (err as Error).message || 'Failed to update task lifecycle state';
            }
        });
    };

    const handleSubmitEvaluation = async () => {
        setUpdating(true);
        const payload = {
            task_id: task!.id,
            ...evaluation,
            status: evaluation.rework_required ? 'REWORK' : 'COMPLETED'
        };

        toast.promise(axios.patch(`/analytics/tasks/evaluate/`, payload), {
            loading: 'Analyzing and committing performance data...',
            success: () => {
                fetchTaskDetails();
                setUpdating(false);
                return 'Performance appraisal successfully committed';
            },
            error: (err) => {
                setUpdating(false);
                return (err as Error).message || 'Failed to persist task evaluation';
            }
        });
    };

    const navigateToTask = (direction: 'next' | 'prev') => {
        const currentIndex = allTasks.findIndex(t => String(t.id) === String(taskId));
        if (currentIndex === -1) return;
        
        let nextIndex;
        if (direction === 'next') {
            nextIndex = (currentIndex + 1) % allTasks.length;
        } else {
            nextIndex = (currentIndex - 1 + allTasks.length) % allTasks.length;
        }
        
        const nextTask = allTasks[nextIndex];
        const path = isManager ? `/management/tasks/${nextTask.id}` : `/workspace/tasks/${nextTask.id}`;
        navigate(path);
    };

    const getStatusLog = () => {
        const logs: { label: string, date: string, type: string }[] = [];
        if (task?.assigned_at) logs.push({ label: 'Task Assigned', date: task!.assigned_at, type: 'ASSIGNED' });
        if (task?.submitted_at) logs.push({ label: 'Task Submitted', date: task!.submitted_at, type: 'SUBMITTED' });
        if (task?.completed_at) logs.push({ label: 'Task Completed', date: task!.completed_at, type: 'COMPLETED' });
        return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    if (loading && !task) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
            </div>
        );
    }

    if (!task) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <AlertTriangle size={64} className="text-red-500 mb-4 opacity-20" />
                <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">No Tasks Found</h2>
                <p className="text-[var(--text-dim)] mb-6">You don't have any tasks assigned yet or they don't match your criteria.</p>
                <Button onClick={() => navigate(baseUrl)}>Go to Tasks List</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20 animate-fade-in flex flex-col">
            {/* Upgrade Header: Task Selector & Filters */}
            <div className="sticky top-0 z-30 bg-[var(--bg-muted)]/80 backdrop-blur-xl border-b border-[var(--border-color)] px-6 py-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* Back & Breadcrumb */}
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button 
                            onClick={() => navigate(baseUrl)}
                            className="p-2 hover:bg-[var(--bg-color)] rounded-xl text-[var(--text-dim)] hover:text-[var(--text-main)] transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="h-6 w-px bg-[var(--border-color)]" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Current Task</span>
                            <div className="relative">
                                <button 
                                    onClick={() => setShowSelector(!showSelector)}
                                    className="flex items-center gap-2 text-sm font-bold text-[var(--text-main)] hover:text-purple-400 transition-colors group"
                                >
                                    <span className="truncate max-w-[200px]">{task?.title}</span>
                                    <ChevronDown size={14} className={`transition-transform duration-300 ${showSelector ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Selector Dropdown */}
                                {showSelector && (
                                    <div className="absolute top-full left-0 mt-3 w-[300px] md:w-[400px] bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-in">
                                        <div className="p-4 border-b border-[var(--border-color)] space-y-3 bg-[var(--bg-color)]/50">
                                            <div className="relative">
                                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                                <input 
                                                    type="text" 
                                                    placeholder="Search tasks..." 
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--text-main)] outline-none focus:border-purple-500 transition-all"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <select 
                                                    value={statusFilter}
                                                    onChange={(e) => setStatusFilter(e.target.value)}
                                                    className="flex-1 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase text-[var(--text-dim)] outline-none"
                                                >
                                                    <option value="ALL">All Status</option>
                                                    <option value="ASSIGNED">Assigned</option>
                                                    <option value="IN_PROGRESS">In Progress</option>
                                                    <option value="SUBMITTED">Submitted</option>
                                                    <option value="COMPLETED">Completed</option>
                                                </select>
                                                <select 
                                                    value={priorityFilter}
                                                    onChange={(e) => setPriorityFilter(e.target.value)}
                                                    className="flex-1 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase text-[var(--text-dim)] outline-none"
                                                >
                                                    <option value="ALL">All Priority</option>
                                                    <option value="LOW">Low</option>
                                                    <option value="MEDIUM">Medium</option>
                                                    <option value="HIGH">High</option>
                                                    <option value="CRITICAL">Critical</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2">
                                            {tasksLoading ? (
                                                <div className="py-10 flex items-center justify-center">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" />
                                                </div>
                                            ) : filteredTasks.length > 0 ? (
                                                filteredTasks.map((t) => (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => {
                                                            const path = isManager ? `/management/tasks/${t.id}` : `/workspace/tasks/${t.id}`;
                                                            navigate(path);
                                                            setShowSelector(false);
                                                        }}
                                                        className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 group ${String(t.id) === String(taskId) ? 'bg-purple-500/10 border border-purple-500/20' : 'hover:bg-[var(--bg-color)]'}`}
                                                    >
                                                        <div className={`mt-1 shrink-0 w-2 h-2 rounded-full ${t.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-purple-500'}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start gap-2">
                                                                <p className={`text-xs font-bold truncate ${String(t.id) === String(taskId) ? 'text-purple-400' : 'text-[var(--text-main)] group-hover:text-purple-400'}`}>
                                                                    {t.title}
                                                                </p>
                                                                <span className="text-[9px] font-mono text-[var(--text-muted)] shrink-0">{t.task_id}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-dim)]">{t.status.replace('_', ' ')}</span>
                                                                <div className="w-1 h-1 rounded-full bg-[var(--border-color)]" />
                                                                <span className={`text-[9px] font-black uppercase tracking-widest ${t.priority === 'CRITICAL' ? 'text-red-400' : 'text-blue-400'}`}>{t.priority}</span>
                                                            </div>
                                                        </div>
                                                        {String(t.id) === String(taskId) && <Check size={14} className="text-purple-400 shrink-0" />}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="py-10 text-center text-[var(--text-dim)] text-xs">No tasks match filters</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="flex bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl p-1 shrink-0">
                            <button 
                                onClick={() => navigateToTask('prev')}
                                className="p-2 hover:bg-[var(--bg-muted)] rounded-lg text-[var(--text-dim)] hover:text-purple-400 transition-all"
                                title="Previous Task"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="w-px h-6 bg-[var(--border-color)] mx-1 self-center" />
                            <button 
                                onClick={() => navigateToTask('next')}
                                className="p-2 hover:bg-[var(--bg-muted)] rounded-lg text-[var(--text-dim)] hover:text-purple-400 transition-all"
                                title="Next Task"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                        {user?.role === 'MANAGER' && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleSubmitEvaluation}
                                disabled={updating}
                                className="px-6 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hidden md:flex"
                            >
                                {updating ? 'Saving...' : 'Save Evaluation'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full">
                {/* Task Title & Badge */}
                <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-lg text-[10px] font-mono font-black text-[var(--text-muted)] tracking-tighter shadow-sm">
                                {task!.task_id}
                            </span>
                            <Badge variant={task!.status === 'COMPLETED' ? 'success' : task!.status === 'REWORK' ? 'danger' : 'info'} size="sm" className="font-black uppercase tracking-widest text-[9px]">
                                {task!.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant={task!.priority === 'CRITICAL' ? 'danger' : 'warning'} size="sm" className="font-black uppercase tracking-widest text-[9px]">
                                {task!.priority}
                            </Badge>
                        </div>
                        <h1 className="text-4xl lg:text-6xl font-black text-[var(--text-main)] tracking-tight leading-none capitalize">
                            {task!.title}
                        </h1>
                    </div>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                    <div className="xl:col-span-2 space-y-10">
                        {/* Status Stepper */}
                        <Card className="p-10 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-[80px] rounded-full group-hover:bg-purple-500/10 transition-colors" />
                            <div className="flex justify-between items-center mb-12">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-dim)] flex items-center gap-3">
                                    <History size={16} className="text-purple-400" /> Progression Timeline
                                </h3>
                                {task!.status !== 'COMPLETED' && !isManager && (
                                    <div className="flex bg-[var(--bg-muted)] border border-[var(--border-color)] p-1.5 rounded-2xl glass-effect shadow-xl">
                                        {['IN_PROGRESS', 'SUBMITTED'].map((s) => (
                                            <button
                                                key={s}
                                                disabled={updating || task!.status === s}
                                                onClick={() => handleUpdateStatus(s)}
                                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                    task!.status === s 
                                                        ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]' 
                                                        : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5 disabled:opacity-50'
                                                }`}
                                            >
                                                {s.replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="relative flex justify-between px-2">
                                <div className="absolute top-6 left-0 w-full h-1 bg-[var(--border-color)] z-0 rounded-full" />
                                <div 
                                    className="absolute top-6 left-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 transition-all duration-1000 z-0 rounded-full" 
                                    style={{ width: `${(STATUS_STEPS.findIndex(s => s.status === (task!.status === 'REWORK' ? 'IN_PROGRESS' : task!.status)) / (STATUS_STEPS.length - 1)) * 100}%` }}
                                />

                                {STATUS_STEPS.map((step, idx) => {
                                    const activeStatus = task.status === 'REWORK' ? 'IN_PROGRESS' : task.status;
                                    const stepIdx = STATUS_STEPS.findIndex(s => s.status === activeStatus);
                                    const isCompleted = idx <= stepIdx;
                                    const isCurrent = idx === stepIdx;

                                    return (
                                        <div key={step.status} className="relative z-10 flex flex-col items-center">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-700 ${
                                                isCompleted 
                                                    ? 'bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-2xl shadow-purple-500/40 rotate-3' 
                                                    : 'bg-[var(--bg-muted)] border border-[var(--border-color)] text-[var(--text-muted)] group-hover:border-purple-500/30'
                                            }`}>
                                                {isCompleted ? <CheckCircle size={24} /> : <step.icon size={22} />}
                                            </div>
                                            <div className="mt-6 text-center">
                                                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isCurrent ? 'text-purple-400' : 'text-[var(--text-dim)]'}`}>
                                                    {step.label}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>

                        {/* Description Section */}
                        <Card className="p-10">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-dim)] mb-6 flex items-center gap-3">
                                <FileText size={16} className="text-blue-400" /> Task Briefing
                            </h3>
                            <div className="prose prose-invert max-w-none">
                                <p className="text-[var(--text-main)] text-lg leading-[1.8] font-medium whitespace-pre-wrap opacity-90">
                                    {task.description || 'No description provided for this task.'}
                                </p>
                            </div>
                        </Card>

                        {/* Action Portal */}
                        {isManager ? (
                            <Card className="p-10 border-purple-500/30 bg-purple-500/[0.03] shadow-[0_0_50px_rgba(168,85,247,0.05)]">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 mb-10 flex items-center gap-3">
                                    <Award size={18} /> Performance Appraisal
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)]">Execution Quality</label>
                                                <span className="text-xs font-black text-amber-500 px-3 py-1 bg-amber-500/10 rounded-lg">{evaluation.quality_rating || 0} / 5</span>
                                            </div>
                                            <div className="flex justify-between bg-[var(--bg-muted)] p-2 rounded-2xl border border-[var(--border-color)] shadow-inner">
                                                {[1,2,3,4,5].map(s => (
                                                    <button 
                                                        key={s} 
                                                        disabled={user?.role === 'ADMIN'}
                                                        onClick={() => setEvaluation({...evaluation, quality_rating: s})}
                                                        className={`w-12 h-12 rounded-xl transition-all flex items-center justify-center ${s <= evaluation.quality_rating ? 'bg-amber-500 shadow-lg shadow-amber-500/20 text-white rotate-3 scale-110' : 'text-slate-600 hover:text-amber-500/50'} ${user?.role === 'ADMIN' ? 'cursor-default' : ''}`}
                                                    >
                                                        <Star size={24} fill={s <= evaluation.quality_rating ? 'currentColor' : 'none'} strokeWidth={s <= evaluation.quality_rating ? 0 : 2} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-4 pt-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)]">Code Standards</label>
                                                <span className="text-xl font-black text-blue-400 font-mono italic">{evaluation.code_review_score}%</span>
                                            </div>
                                            <div className="relative h-2 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-full overflow-hidden shadow-inner">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                                                    style={{ width: `${evaluation.code_review_score}%` }}
                                                />
                                                <input 
                                                    type="range" min="0" max="100" 
                                                    disabled={user?.role === 'ADMIN'}
                                                    value={evaluation.code_review_score} 
                                                    onChange={(e) => setEvaluation({...evaluation, code_review_score: parseInt(e.target.value)})}
                                                    className={`absolute inset-0 w-full opacity-0 ${user?.role === 'ADMIN' ? 'cursor-default' : 'cursor-pointer'}`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)]">Incidents / Bugs Flagged</label>
                                            <div className="flex items-center gap-6">
                                                <button 
                                                    disabled={user?.role === 'ADMIN'}
                                                    onClick={() => setEvaluation({...evaluation, bug_count: Math.max(0, evaluation.bug_count - 1)})}
                                                    className={`w-16 h-16 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-2xl flex items-center justify-center text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all text-2xl font-black ${user?.role === 'ADMIN' ? 'cursor-default opacity-50' : ''}`}
                                                >-</button>
                                                <div className="flex-1 flex flex-col items-center">
                                                    <span className="text-4xl font-black text-[var(--text-main)] font-mono">{evaluation.bug_count}</span>
                                                    <span className="text-[8px] font-black uppercase text-[var(--text-dim)] tracking-widest mt-1">Total Issues</span>
                                                </div>
                                                <button 
                                                    disabled={user?.role === 'ADMIN'}
                                                    onClick={() => setEvaluation({...evaluation, bug_count: evaluation.bug_count + 1})}
                                                    className={`w-16 h-16 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-2xl flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all text-2xl font-black ${user?.role === 'ADMIN' ? 'cursor-default opacity-50' : ''}`}
                                                >+</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-10">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)]">Strategic Feedback</label>
                                    <textarea 
                                        rows={5}
                                        readOnly={user?.role === 'ADMIN'}
                                        value={evaluation.mentor_feedback}
                                        onChange={(e) => setEvaluation({...evaluation, mentor_feedback: e.target.value})}
                                        className={`w-full bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-[32px] px-8 py-6 text-sm text-[var(--text-main)] focus:border-purple-500/50 outline-none transition-all resize-none shadow-inner placeholder-[var(--text-muted)] ${user?.role === 'ADMIN' ? 'cursor-default' : ''}`}
                                        placeholder={user?.role === 'ADMIN' ? 'No feedback provided' : 'Provide deep architectural and practical feedback...'}
                                    />
                                </div>

                                <div className="flex items-center justify-between gap-6">
                                    {user?.role === 'MANAGER' && (
                                        <button 
                                            onClick={() => setEvaluation({...evaluation, rework_required: !evaluation.rework_required})}
                                            className={`flex-1 flex items-center justify-center gap-4 p-6 rounded-[32px] border transition-all duration-500 group ${evaluation.rework_required ? 'bg-red-500 border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.4)] text-white' : 'bg-[var(--bg-muted)] border-[var(--border-color)] text-[var(--text-dim)] hover:border-red-500/30 hover:text-red-400'}`}
                                        >
                                            <AlertTriangle size={24} className={evaluation.rework_required ? 'animate-bounce' : ''} />
                                            <div className="text-left">
                                                <p className="text-xs font-black uppercase tracking-widest">Mark for Rework</p>
                                                <p className={`text-[10px] font-bold ${evaluation.rework_required ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>Flags as incomplete</p>
                                            </div>
                                        </button>
                                    )}
                                    {user?.role === 'MANAGER' && (
                                        <Button 
                                            fullWidth 
                                            gradient="purple" 
                                            className="p-6 text-xs font-black tracking-[0.3em] uppercase hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] shadow-2xl transition-all scale-100 active:scale-95"
                                            onClick={handleSubmitEvaluation}
                                            disabled={updating}
                                        >
                                            {updating ? 'Processing...' : 'Submit Evaluation'}
                                        </Button>
                                    )}
                                    {user?.role === 'ADMIN' && (
                                        <div className="w-full p-6 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-[32px] text-center">
                                            <p className="text-xs font-black uppercase tracking-widest text-[var(--text-dim)] flex items-center justify-center gap-3">
                                                <Award size={18} className="text-purple-400" /> Evaluation Records are Read-Only for Admins
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ) : (
                            <Card className="p-10">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-dim)] mb-10">System Activity Logs</h3>
                                <div className="space-y-10">
                                    {getStatusLog().length > 0 ? getStatusLog().map((log, i) => (
                                        <div key={i} className="flex gap-8 items-start relative">
                                            {i < getStatusLog().length - 1 && (
                                                <div className="absolute left-[15px] top-8 w-px h-16 bg-[var(--border-color)] opacity-50" />
                                            )}
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 border-[var(--bg-color)] z-10 shadow-lg ${
                                                log.type === 'COMPLETED' ? 'bg-emerald-500 text-white' : 
                                                log.type === 'SUBMITTED' ? 'bg-yellow-500 text-white' : 
                                                'bg-purple-500 text-white shadow-purple-500/20'
                                            }`}>
                                                {log.type === 'COMPLETED' ? <CheckCircle size={16} /> : <PlayCircle size={16} />}
                                            </div>
                                            <div className="flex-1 bg-[var(--bg-muted)] p-5 rounded-2xl border border-[var(--border-color)] hover:border-purple-500/20 transition-all">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="text-sm font-black text-[var(--text-main)] uppercase tracking-[0.05em]">{log.label}</p>
                                                    <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] bg-[var(--bg-color)] px-2 py-1 rounded-md border border-[var(--border-color)]">
                                                        {new Date(log.date).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[var(--text-dim)] font-medium">Task lifecycle event recorded: {log.type.toLowerCase()}</p>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-20 opacity-20">
                                            <History size={64} className="mx-auto mb-4" />
                                            <p className="text-lg font-black uppercase tracking-widest">No Logs Found</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Meta Sidebar */}
                    <div className="space-y-10">
                        {/* Summary Deck */}
                        <Card className="p-8 space-y-8 relative overflow-hidden group">
                             <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-[60px] rounded-full" />
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-[var(--bg-muted)] rounded-2xl border border-[var(--border-color)]">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] flex items-center gap-3"><Calendar size={18} className="text-blue-400" /> Deadline</span>
                                    <span className="font-black text-[var(--text-main)] font-mono text-xs">{new Date(task!.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-[var(--bg-muted)] rounded-2xl border border-[var(--border-color)]">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] flex items-center gap-3"><Clock size={18} className="text-purple-400" /> Estimation</span>
                                    <span className="font-black text-[var(--text-main)] font-mono text-xs">{task!.estimated_hours} Hours</span>
                                </div>
                            </div>

                            <hr className="border-[var(--border-color)] opacity-50" />

                             {task!.intern && (
                                <div className="space-y-5">
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] px-1">Lead Developer</p>
                                    <div className="flex items-center gap-4 p-4 bg-[var(--bg-muted)]/50 rounded-2xl border border-[var(--border-color)] hover:bg-[var(--bg-muted)] transition-all cursor-pointer group">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-xl shadow-purple-500/20 group-hover:rotate-6 transition-all duration-500">
                                            {task!.intern.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-[var(--text-main)] truncate">{task!.intern.name}</p>
                                            <p className="text-[10px] font-medium text-[var(--text-muted)] truncate">{task!.intern.email}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                             {(task!.project || task!.module) && (
                                <div className="space-y-5 pt-4">
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] px-1">Contextual Domains</p>
                                    <div className="space-y-3">
                                        {task!.project && (
                                            <div className="flex items-center gap-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                                                <Layers size={16} className="text-blue-500" />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">Project: {task!.project.name}</span>
                                            </div>
                                        )}
                                        {task!.module && (
                                            <div className="flex items-center gap-4 p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                                                <ArrowRight size={16} className="text-purple-500" />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">Layer: {task!.module.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </Card>

                        {/* Intelligence Card */}
                         {task!.quality_rating && (
                            <Card className="p-8 bg-amber-500/[0.03] border-amber-500/20 relative group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
                                    <Sparkles size={48} className="text-amber-500" />
                                </div>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 mb-8 flex items-center gap-3">
                                    <Award size={18} /> Performance Metrics
                                </h3>
                                <div className="space-y-10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <div className="text-5xl font-black text-amber-500 italic leading-none">{task!.quality_rating.toFixed(1)}</div>
                                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-500/60 mt-2">Quality Score</span>
                                        </div>
                                        <div className="flex gap-1.5 p-2 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                            {[1,2,3,4,5].map(s => (
                                                <Star key={s} size={18} className={s <= Math.round(task!.quality_rating || 0) ? 'text-amber-500 fill-amber-500 scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'text-slate-800'} />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.1em]">
                                                <span className="text-[var(--text-dim)]">Integration Review</span>
                                                <span className="text-blue-400">{task!.code_review_score}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                                <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-1000" style={{ width: `${task!.code_review_score}%` }} />
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                            <div className="flex items-center gap-3">
                                                <Bug size={18} className="text-red-500" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Issues Reported</span>
                                            </div>
                                            <span className="text-xl font-black text-red-500 font-mono tracking-tighter">{task!.bug_count}</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}
                        
                        {/* Mentor Feedback Sidebar Display */}
                        {task!.mentor_feedback && !isManager && (
                            <Card className="p-8 bg-purple-500/[0.03] border-purple-500/20">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 mb-6 flex items-center gap-3">
                                    <MessageSquare size={16} /> Mentor Feedback
                                </h3>
                                <p className="text-sm font-medium text-[var(--text-main)] italic leading-relaxed opacity-80 border-l-2 border-purple-500/30 pl-4 py-2">
                                    "{task!.mentor_feedback}"
                                </p>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Quick Actions Footer (Mobile) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-muted)]/95 backdrop-blur-2xl border-t border-[var(--border-color)] p-4 flex gap-3 z-50">
                 <button 
                    onClick={() => navigateToTask('prev')}
                    className="flex-1 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl flex items-center justify-center text-[var(--text-dim)]"
                >
                    <ArrowLeft size={18} />
                </button>
                 <button 
                    onClick={() => navigateToTask('next')}
                    className="flex-1 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl flex items-center justify-center text-[var(--text-dim)]"
                >
                    <ChevronRight size={18} />
                </button>
                {user?.role === 'MANAGER' && (
                    <Button 
                        fullWidth 
                        gradient="purple" 
                        onClick={handleSubmitEvaluation}
                        disabled={updating}
                        className="py-3 flex-[3]"
                    >
                        {updating ? 'Saving...' : 'Save Evaluation'}
                    </Button>
                )}
            </div>
        </div>
    );
};

export default TaskDetailPage;
