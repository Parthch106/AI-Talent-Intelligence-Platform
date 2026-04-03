import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Plus, Target, Clock, Award, CheckCircle, 
    AlertTriangle, PlayCircle, Star, Code, Bug, LayoutGrid, 
    List, Sparkles, Wand2, Loader2, MessageSquare, 
    Calendar, Filter, Search, ArrowRight,
    Layers, Trash2
} from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Modal from '../common/Modal';
import axios from '../../api/axios';
import toast from 'react-hot-toast';

interface Task {
    id: number;
    task_id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    due_date: string;
    assigned_at?: string;
    completed_at?: string;
    estimated_hours?: number;
    actual_hours?: number;
    quality_rating: number | null;
    code_review_score: number | null;
    bug_count?: number;
    mentor_feedback?: string;
    rework_required?: boolean;
    project?: {
        id: number;
        name: string;
        status: string;
    } | null;
    module?: {
        id: number;
        name: string;
    } | null;
}

interface TasksTabProps {
    tasks: Task[];
    onAddTask: () => void;
    canCreate: boolean;
    onStatusChange?: (taskId: number, newStatus: string) => void;
    onRefresh?: () => void;
    internId?: number;
    internName?: string;
    monthFilter: number | 'all';
    setMonthFilter: (value: number | 'all') => void;
    yearFilter: number | 'all';
    setYearFilter: (value: number | 'all') => void;
    dateFilter?: string | null;
    setDateFilter?: (date: string | null) => void;
}

const TasksTab: React.FC<TasksTabProps> = ({ 
    tasks, 
    onAddTask, 
    canCreate, 
    onStatusChange, 
    onRefresh, 
    internId, 
    internName,
    monthFilter,
    setMonthFilter,
    yearFilter,
    setYearFilter,
    dateFilter,
    setDateFilter
}) => {
    const tasksArray = Array.isArray(tasks) ? tasks : [];

    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
    const [showEvaluationModal, setShowEvaluationModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [projectFilter, setProjectFilter] = useState<number | null>(null);
    const [projects, setProjects] = useState<{id: number; name: string}[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const ITEMS_PER_PAGE = 12;

    const navigate = useNavigate();

    React.useEffect(() => {
        fetchProjects();
    }, [internId]);

    const fetchProjects = async () => {
        try {
            if (internId) {
                const response = await axios.get('/projects/assignments/', { params: { intern_id: internId } });
                const assignments = response.data.results || response.data;
                const uniqueProjects = Array.from(new Set(assignments.map((a: any) => JSON.stringify({id: a.project.id, name: a.project.name}))))
                    .map((s: any) => JSON.parse(s));
                setProjects(uniqueProjects);
            } else {
                const response = await axios.get('/projects/projects/');
                setProjects(response.data.results || response.data);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    };

    const [evaluation, setEvaluation] = useState({
        quality_rating: 0,
        code_review_score: 0,
        bug_count: 0,
        mentor_feedback: '',
        rework_required: false,
        status: 'COMPLETED'
    });

    const [savingEvaluation, setSavingEvaluation] = useState(false);

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
            'COMPLETED': 'success',
            'IN_PROGRESS': 'info',
            'BLOCKED': 'danger',
            'ASSIGNED': 'default',
            'SUBMITTED': 'warning',
            'REVIEWED': 'info',
            'REWORK': 'danger',
        };
        return variants[status] || 'default';
    };

    const getPriorityBadge = (priority: string) => {
        const variants: Record<string, 'danger' | 'warning' | 'info' | 'default'> = {
            'CRITICAL': 'danger',
            'HIGH': 'warning',
            'MEDIUM': 'info',
            'LOW': 'default',
        };
        return variants[priority] || 'default';
    };

    const getAvailableStatuses = (task: Task) => {
        const options = [
            {
                value: 'IN_PROGRESS',
                label: 'In Progress',
                icon: PlayCircle,
                iconColor: 'text-blue-500 dark:text-blue-400',
                disabled: task.status === 'IN_PROGRESS'
            },
            {
                value: 'SUBMITTED',
                label: 'Submitted',
                icon: CheckCircle,
                iconColor: 'text-yellow-600 dark:text-yellow-400',
                disabled: task.status === 'SUBMITTED'
            },
            {
                value: 'COMPLETED',
                label: 'Completed',
                icon: CheckCircle,
                iconColor: 'text-emerald-400',
                disabled: task.status === 'COMPLETED'
            },
            {
                value: 'BLOCKED',
                label: 'Blocked',
                icon: AlertTriangle,
                iconColor: 'text-red-500 dark:text-red-400',
                disabled: task.status === 'BLOCKED'
            },
        ];
        return options;
    };

    const monthYearFilteredTasks = tasksArray.filter(task => {
        const taskDate = new Date(task.due_date);
        const taskMonth = taskDate.getMonth() + 1;
        const taskYear = taskDate.getFullYear();
        const monthMatch = monthFilter === 'all' || taskMonth === monthFilter;
        const yearMatch = yearFilter === 'all' || taskYear === yearFilter;
        return monthMatch && yearMatch;
    });

    const filteredTasks = statusFilter ? monthYearFilteredTasks.filter(task => task.status === statusFilter) : monthYearFilteredTasks;
    const projectFilteredTasks = projectFilter ? filteredTasks.filter(task => task.project && task.project.id === projectFilter) : filteredTasks;

    const finalFilteredTasks = dateFilter ? projectFilteredTasks.filter(task => {
        const taskAssignedDate = task.assigned_at ? task.assigned_at.split('T')[0] : '';
        const taskCompletedDate = task.completed_at ? task.completed_at.split('T')[0] : '';
        return taskAssignedDate === dateFilter || taskCompletedDate === dateFilter;
    }) : projectFilteredTasks;

    React.useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, projectFilter, monthFilter, yearFilter, viewMode, dateFilter]);

    const totalPages = Math.ceil(finalFilteredTasks.length / ITEMS_PER_PAGE);
    const paginatedTasks = finalFilteredTasks.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const openEvaluationModal = (task: Task) => {
        setSelectedTask(task);
        setEvaluation({
            quality_rating: task.quality_rating || 0,
            code_review_score: task.code_review_score || 0,
            bug_count: task.bug_count || 0,
            mentor_feedback: task.mentor_feedback || '',
            rework_required: task.rework_required || false,
            status: task.status === 'REWORK' ? 'REWORK' : 'COMPLETED'
        });
        setShowEvaluationModal(true);
    };

    const submitEvaluation = async () => {
        if (!selectedTask) return;
        try {
            setSavingEvaluation(true);
            await axios.patch(`/analytics/tasks/evaluate/`, { task_id: selectedTask.id, ...evaluation });
            setShowEvaluationModal(false);
            if (onRefresh) onRefresh();
            toast.success('Evaluation saved');
        } catch (error) {
            console.error('Error submitting evaluation:', error);
            toast.error('Failed to submit evaluation');
        } finally {
            setSavingEvaluation(false);
        }
    };

    const handleStatusChange = (taskId: number, newStatus: string) => {
        setActiveDropdown(null);
        if (onStatusChange) onStatusChange(taskId, newStatus);
    };

    const handleDeleteTask = async (taskId: number) => {
        if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;
        try {
            await axios.delete(`/analytics/tasks/${taskId}/`);
            toast.success('Task deleted successfully');
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Error deleting task:', error);
            toast.error('Failed to delete task');
        }
    };

    const getStatCardClass = (status: string, color: string) => {
        const isActive = statusFilter === status;
        const isAll = status === 'ALL' && statusFilter === null;
        const selected = isActive || isAll;
        
        const activeColorMap: Record<string, string> = {
            slate: 'border-[var(--text-muted)] bg-[var(--bg-muted)] shadow-[var(--card-shadow)]',
            indigo: 'border-indigo-500/50 bg-indigo-500/5 shadow-indigo-500/10',
            blue: 'border-blue-500/50 bg-blue-500/5 shadow-blue-500/10',
            yellow: 'border-yellow-500/50 bg-yellow-500/5 shadow-yellow-500/10',
            emerald: 'border-emerald-500/50 bg-emerald-500/5 shadow-emerald-500/10',
            red: 'border-red-500/50 bg-red-500/5 shadow-red-500/10',
        };
        
        return `group relative overflow-hidden rounded-3xl border p-6 transition-all duration-500 cursor-pointer 
            ${selected ? activeColorMap[color] : 'bg-[var(--card-bg)] border-[var(--border-color)] hover:border-purple-500/30 hover:bg-purple-500/[0.03]'}`;
    };

    // Sub-components
    const TaskCard = ({ task, idx }: { task: Task, idx: number }) => (
        <div className="group relative bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[32px] overflow-hidden p-8 transition-all duration-500 hover:bg-purple-500/[0.02] hover:border-purple-500/20 hover:shadow-2xl dark:hover:shadow-black/50">
            <div className="flex justify-between items-start mb-6">
                <div className="space-y-2">
                    <span className="text-[9px] font-black font-mono text-[var(--text-muted)] tracking-widest">{task.task_id}</span>
                    <div className="flex gap-2">
                        <Badge variant={getPriorityBadge(task.priority)} size="sm">{task.priority}</Badge>
                        {task.status === 'COMPLETED' && (
                            <Badge variant={task.quality_rating ? 'success' : 'warning'} size="sm" className="font-black uppercase tracking-widest text-[8px]">
                                {task.quality_rating ? 'Evaluated' : 'Not Evaluated'}
                            </Badge>
                        )}
                        {canCreate && (
                            <button 
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Delete Task"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                </div>
                {/* Direct Status Picker */}
                <div className="flex bg-[var(--bg-muted)] border border-[var(--border-color)] p-1 rounded-xl glass-effect">
                    {getAvailableStatuses(task).map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => handleStatusChange(task.id, opt.value)}
                            title={opt.label}
                            className={`p-1.5 rounded-lg transition-all ${task.status === opt.value ? 'bg-purple-500/20 text-purple-400 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-dim)] hover:bg-white/5'}`}
                        >
                            {<opt.icon size={14} className={opt.iconColor} />}
                        </button>
                    ))}
                </div>
            </div>
            <h3 className="text-xl font-black text-[var(--text-main)] leading-tight mb-4 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors capitalize">{task.title}</h3>
            {task.module && (
                <div className="flex items-center gap-2 mb-6">
                    <Layers size={12} className="text-blue-500" />
                    <span className="text-[10px] font-black tracking-widest text-[var(--text-muted)] uppercase">{task.module.name}</span>
                </div>
            )}
            <div className="flex items-center justify-between pt-6 border-t border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-dim)]">
                        <Clock size={12} /> {task.due_date}
                    </div>
                </div>
                <div className="flex gap-2">
                    {task.quality_rating && <Badge variant="warning" size="sm">★{task.quality_rating}</Badge>}
                    {(task.status === 'COMPLETED' || task.status === 'SUBMITTED') && (
                        <button 
                            onClick={() => openEvaluationModal(task)}
                            className="px-4 py-1.5 rounded-lg border border-purple-400 bg-purple-600 !text-white shadow-[0_0_15px_rgba(147,51,234,0.4)] transition-all font-black uppercase tracking-widest text-[10px] hover:bg-purple-500 hover:scale-105 active:scale-95"
                        >
                            {task.status === 'SUBMITTED' ? 'Evaluate Now' : 'Evaluate'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        } catch (e) {
            return dateString;
        }
    };

    const TaskListItem = ({ task }: { task: Task }) => (
        <div className="bg-[var(--card-bg)] hover:bg-purple-500/[0.03] border border-[var(--border-color)] hover:border-purple-500/20 rounded-2xl p-4 flex items-center gap-4 transition-all group">
            {/* ID Column */}
            <div className="w-20 shrink-0 text-[10px] font-mono text-[var(--text-muted)] tracking-tighter truncate">{task.task_id}</div>
            
            {/* Title & Project Column */}
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-black text-[var(--text-main)] truncate capitalize group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{task.title}</h4>
                <div className="flex items-center gap-4 mt-0.5">
                    <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">{task.project?.name || 'General'}</span>
                    {task.module && <span className="text-[10px] text-blue-500/50 font-black tracking-widest uppercase">{task.module.name}</span>}
                    {task.status === 'COMPLETED' && (
                        <Badge variant={task.quality_rating ? 'success' : 'warning'} size="sm" className="font-black uppercase tracking-widest text-[8px] scale-90 origin-left">
                            {task.quality_rating ? 'Evaluated' : 'Not Evaluated'}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Status Picker Column */}
            <div className="w-40 shrink-0 flex justify-center">
                <div className="flex bg-[var(--bg-muted)] border border-[var(--border-color)] p-1 rounded-xl">
                    {getAvailableStatuses(task).map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => handleStatusChange(task.id, opt.value)}
                            title={opt.label}
                            className={`p-1.5 rounded-lg transition-all ${task.status === opt.value ? 'bg-purple-500/20 text-purple-400 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-dim)] hover:bg-white/5'}`}
                        >
                            {<opt.icon size={14} className={opt.iconColor} />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Priority Column */}
            <div className="w-24 shrink-0 flex justify-center">
                <Badge variant={getPriorityBadge(task.priority)} size="sm">{task.priority}</Badge>
            </div>

            {/* Date Column */}
            <div className="w-32 shrink-0 flex items-center justify-center gap-2 text-[10px] font-bold text-[var(--text-dim)] font-mono">
                <Calendar size={12} className="shrink-0" /> {formatDate(task.due_date)}
            </div>

            {/* Actions Column (Fixed Width for consistent alignment) */}
            <div className="w-44 shrink-0 flex items-center justify-end gap-3">
                <div className="w-32 flex justify-end">
                    {(task.status === 'COMPLETED' || task.status === 'SUBMITTED') && (
                        <Button 
                            size="sm" 
                            onClick={() => openEvaluationModal(task)}
                            className="bg-purple-600 !text-white hover:bg-purple-500 border-none shadow-[0_0_12px_rgba(147,51,234,0.3)] whitespace-nowrap"
                        >
                            {task.status === 'SUBMITTED' ? 'Evaluate Now' : 'Evaluate'}
                        </Button>
                    )}
                </div>
                {canCreate && (
                    <button 
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all shrink-0"
                        title="Delete Task"
                    >
                        <Trash2 size={20} />
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            {/* Header Area */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
                <div>
                    <h2 className="text-4xl font-black text-[var(--text-main)] tracking-tighter uppercase">Tasks</h2>
                    <p className="text-[var(--text-dim)] mt-4 font-medium max-w-md leading-relaxed">Track and manage intern assignments and performance.</p>
                </div>
                {canCreate && (
                    <div className="flex flex-wrap gap-4 w-full sm:w-auto">
                        <button onClick={() => navigate(`/monitoring/ai-tasks/${internId || ''}?project=${projectFilter || ''}`)} className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl dark:shadow-purple-950/20 shadow-purple-500/10">
                            <Sparkles size={18} /> AI Generator
                        </button>
                        <button onClick={onAddTask} className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-[var(--text-main)] text-[var(--bg-color)] rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all">
                            <Plus size={18} /> New Task
                        </button>
                    </div>
                )}
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                {[
                    { id: 'ALL', label: 'Total Tasks', count: monthYearFilteredTasks.length, color: 'slate', icon: Target, glowColor: 'bg-slate-500' },
                    { id: 'ASSIGNED', label: 'Assigned', count: monthYearFilteredTasks.filter(t => t.status === 'ASSIGNED').length, color: 'indigo', icon: Wand2, glowColor: 'bg-indigo-500' },
                    { id: 'IN_PROGRESS', label: 'In Progress', count: monthYearFilteredTasks.filter(t => t.status === 'IN_PROGRESS').length, color: 'blue', icon: PlayCircle, glowColor: 'bg-blue-500' },
                    { id: 'SUBMITTED', label: 'Submitted', count: monthYearFilteredTasks.filter(t => t.status === 'SUBMITTED').length, color: 'yellow', icon: Clock, glowColor: 'bg-yellow-500' },
                    { id: 'COMPLETED', label: 'Completed', count: monthYearFilteredTasks.filter(t => t.status === 'COMPLETED').length, color: 'emerald', icon: CheckCircle, glowColor: 'bg-emerald-500' },
                    { id: 'BLOCKED', label: 'Blocked', count: monthYearFilteredTasks.filter(t => t.status === 'BLOCKED').length, color: 'red', icon: AlertTriangle, glowColor: 'bg-red-500' },
                ].map((stat) => (
                    <div key={stat.id} onClick={() => setStatusFilter(stat.id === 'ALL' ? null : (statusFilter === stat.id ? null : stat.id))} className={getStatCardClass(stat.id, stat.color)}>
                        <div className={`absolute top-0 right-0 w-24 h-24 ${stat.glowColor}/10 blur-3xl -mr-8 -mt-8 rounded-full`} />
                        <div className="relative flex flex-col items-center text-center">
                            <stat.icon className="mb-3 text-[var(--text-muted)] transition-colors" size={20} />
                            <p className="text-3xl font-black text-[var(--text-main)] group-hover:scale-110 transition-transform">{stat.count}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] mt-1 whitespace-nowrap">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 p-2">
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="flex bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl p-1 shrink-0">
                        <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-dim)]'}`}><LayoutGrid size={18} /></button>
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-dim)]'}`}><List size={18} /></button>
                    </div>
                    <div className="h-6 w-px bg-[var(--border-color)] hidden sm:block" />
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative group">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl pl-9 pr-8 py-2.5 text-xs font-bold text-[var(--text-dim)] appearance-none hover:bg-purple-500/5 cursor-pointer">
                                <option value="all">ANY MONTH</option>
                                {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', { month: 'long' }).toUpperCase()}</option>)}
                            </select>
                        </div>
                        <div className="relative group">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl pl-9 pr-8 py-2.5 text-xs font-bold text-[var(--text-dim)] appearance-none hover:bg-purple-500/5 cursor-pointer">
                                <option value="all">ANY YEAR</option>
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        {projects.length > 0 && (
                            <div className="relative group">
                                <Target className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                                <select value={projectFilter || ''} onChange={(e) => setProjectFilter(e.target.value ? parseInt(e.target.value) : null)} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl pl-9 pr-8 py-2.5 text-xs font-bold text-[var(--text-dim)] appearance-none hover:bg-purple-500/5 cursor-pointer">
                                    <option value="">ALL DOMAINS</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {projectFilteredTasks.length > 0 ? (
                <>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {paginatedTasks.map((task, idx) => (
                                <TaskCard key={task.id} task={task} idx={idx} />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {paginatedTasks.map((task) => (
                                <TaskListItem key={task.id} task={task} />
                            ))}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-10">
                            <p className="text-xs font-bold text-[var(--text-dim)] tracking-widest uppercase">Page <span className="text-[var(--text-main)]">{currentPage}</span> / <span className="text-[var(--text-muted)]">{totalPages}</span></p>
                            <div className="flex gap-4">
                                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-6 py-2.5 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-dim)] disabled:opacity-20 font-mono">PREV</button>
                                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-6 py-2.5 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-dim)] disabled:opacity-20 font-mono">NEXT</button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="py-32 flex flex-col items-center justify-center text-center animate-fade-in">
                    <Target size={80} className="text-[var(--text-muted)] opacity-20 mb-8" />
                    <h3 className="text-2xl font-black text-[var(--text-main)] uppercase mb-2">No tasks found</h3>
                    <p className="text-[var(--text-dim)] max-w-sm font-medium">No tasks match your current filter parameters.</p>
                </div>
            )}

            {/* Evaluation Modal */}
            <Modal isOpen={showEvaluationModal} onClose={() => setShowEvaluationModal(false)} title="Evaluate Task Performance" gradient="violet" size="2xl">
                <div className="space-y-6 p-2">
                    {/* Performance Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* Quality Rating */}
                        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-amber-500/30 transition-all flex flex-col justify-center">
                            <label className="text-xs font-black uppercase tracking-widest text-[var(--text-dim)] mb-3 flex items-center gap-2">
                                <Star size={16} className="text-amber-500" /> Quality Rating
                            </label>
                            <div className="flex justify-between items-center bg-[var(--bg-muted)] rounded-xl p-1.5 border border-[var(--border-color)]">
                                {[1,2,3,4,5].map(s => (
                                    <button 
                                        key={s} 
                                        onClick={() => setEvaluation({...evaluation, quality_rating: s})}
                                        className={`p-1.5 rounded-lg transition-all hover:scale-110 ${s <= evaluation.quality_rating ? 'bg-amber-500/20 text-amber-500' : 'text-[var(--text-muted)] hover:bg-[var(--bg-color)] hover:text-[var(--text-main)]'}`}
                                    >
                                        <Star size={20} fill={s <= evaluation.quality_rating ? 'currentColor' : 'none'} strokeWidth={s <= evaluation.quality_rating ? 0 : 2} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Code Review Score */}
                        <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-blue-500/30 transition-all flex flex-col justify-center">
                            <label className="text-xs font-black uppercase tracking-widest text-[var(--text-dim)] mb-3 flex items-center gap-2">
                                <Code size={16} className="text-blue-500" /> Code Score
                            </label>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="number" 
                                    min="0" max="100" 
                                    value={evaluation.code_review_score} 
                                    onChange={(e) => setEvaluation({...evaluation, code_review_score: parseInt(e.target.value) || 0})}
                                    className="w-20 px-3 py-2 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] font-mono text-center font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                                <span className="text-sm font-bold text-[var(--text-dim)]">%</span>
                            </div>
                            <input 
                                type="range" min="0" max="100" 
                                value={evaluation.code_review_score} 
                                onChange={(e) => setEvaluation({...evaluation, code_review_score: parseInt(e.target.value)})} 
                                className="w-full h-1.5 mt-4 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-lg appearance-none cursor-pointer accent-blue-500" 
                            />
                        </div>

                        {/* Bug Count */}
                        <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-red-500/30 transition-all flex flex-col justify-center">
                            <label className="text-xs font-black uppercase tracking-widest text-[var(--text-dim)] mb-3 flex items-center gap-2">
                                <Bug size={16} className="text-red-500" /> Issues Found
                            </label>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setEvaluation({...evaluation, bug_count: Math.max(0, evaluation.bug_count - 1)})}
                                    className="w-10 h-10 flex items-center justify-center bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all font-bold text-lg"
                                >
                                    -
                                </button>
                                <input 
                                    type="number" 
                                    min="0" 
                                    value={evaluation.bug_count} 
                                    onChange={(e) => setEvaluation({...evaluation, bug_count: parseInt(e.target.value) || 0})}
                                    className="flex-1 w-full px-3 py-2 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] font-mono text-center font-bold focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                />
                                <button 
                                    onClick={() => setEvaluation({...evaluation, bug_count: evaluation.bug_count + 1})}
                                    className="w-10 h-10 flex items-center justify-center bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all font-bold text-lg"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Feedback Area */}
                    <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] transition-all flex flex-col focus-within:border-purple-500/50 focus-within:shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                        <label className="text-xs font-black uppercase tracking-widest text-[var(--text-dim)] mb-3 flex items-center gap-2">
                            <MessageSquare size={16} className="text-purple-500" /> Mentor Feedback
                        </label>
                        <textarea 
                            value={evaluation.mentor_feedback} 
                            onChange={(e) => setEvaluation({...evaluation, mentor_feedback: e.target.value})} 
                            rows={4} 
                            className="w-full bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none placeholder-[var(--text-muted)] transition-all" 
                            placeholder="Provide constructive feedback on what the intern did well and areas for improvement..." 
                        />
                    </div>

                    {/* Rework Toggle */}
                    <button 
                        onClick={() => setEvaluation({...evaluation, rework_required: !evaluation.rework_required})}
                        className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 ${evaluation.rework_required ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'bg-[var(--card-bg)] border-[var(--border-color)] hover:bg-[var(--bg-muted)]'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl ${evaluation.rework_required ? 'bg-red-500/20 text-red-500' : 'bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-muted)]'}`}>
                                <AlertTriangle size={20} />
                            </div>
                            <div className="text-left">
                                <p className={`text-sm font-black uppercase tracking-widest ${evaluation.rework_required ? 'text-red-500' : 'text-[var(--text-main)]'}`}>Mark for Rework</p>
                                <p className="text-xs text-[var(--text-dim)] mt-0.5">Flag this task for mandatory revision</p>
                            </div>
                        </div>
                        <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${evaluation.rework_required ? 'bg-red-500' : 'bg-[var(--bg-muted)] border border-[var(--border-color)]'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${evaluation.rework_required ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                    </button>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-4 border-t border-[var(--border-color)]">
                        <Button fullWidth variant="outline" type="button" onClick={() => setShowEvaluationModal(false)} className="py-3.5">
                            Cancel
                        </Button>
                        <Button fullWidth gradient="purple" onClick={submitEvaluation} disabled={savingEvaluation} className="py-3.5 text-xs tracking-widest font-black shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                            {savingEvaluation ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'SAVE EVALUATION'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TasksTab;
