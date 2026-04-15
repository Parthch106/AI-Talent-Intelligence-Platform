import React, { useState, useEffect, useRef } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, ContributionHeatmap, Card } from '../components/common';
import TaskDetailDrawer from '../components/tasks/TaskDetailDrawer';
import {
    Target, Clock, Award, Calendar, ChevronRight,
    CheckCircle, AlertTriangle, PlayCircle, Filter, Search,
    ChevronDown, X
} from 'lucide-react';

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

interface ProjectGroup {
    id: number;
    name: string;
    status: string;
    tasks: Task[];
}

const STATUS_STYLES: Record<string, string> = {
    ASSIGNED: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    IN_PROGRESS: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    SUBMITTED: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    BLOCKED: 'bg-red-500/10 text-red-400 border-red-500/30',
    REWORK: 'bg-red-600/15 text-red-300 border-red-600/40',
};

const PRIORITY_DOT: Record<string, string> = {
    CRITICAL: 'bg-red-500',
    HIGH: 'bg-orange-400',
    MEDIUM: 'bg-yellow-400',
    LOW: 'bg-blue-400',
};

const TaskCard: React.FC<{
    task: Task;
    showDropdown: boolean;
    onToggleDropdown: () => void;
    onStatusChange: (status: string) => void;
    availableStatuses: { value: string; label: string; icon: React.ReactNode; disabled: boolean }[];
    onViewDetails: () => void;
}> = ({ task, showDropdown, onToggleDropdown, onStatusChange, availableStatuses, onViewDetails }) => {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const statusBadge = getStatusBadge(task.status);
    const priorityBadge = getPriorityBadge(task.priority);
    const overdue = isOverdue(task.due_date, task.status);

    const statusStyle = STATUS_STYLES[task.status] || 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    const priorityDot = PRIORITY_DOT[task.priority] || 'bg-gray-400';

    return (
        <div
            ref={dropdownRef}
            className={`relative rounded-xl border backdrop-blur-xl transition-all duration-300 group ${
                overdue ? 'border-l-2 border-l-red-500' : ''
            } ${
                showDropdown
                    ? 'z-50 bg-[var(--bg-muted)] border-purple-500/50 shadow-xl shadow-purple-500/20'
                    : 'bg-[var(--card-bg)] border-[var(--border-color)] hover:border-purple-500/30 hover:bg-[var(--bg-muted)]'
            } p-4`}
        >
            {/* Compact row layout */}
            <div className="flex items-center gap-4">
                {/* Left: Status pill (clickable) */}
                <div className="relative">
                    <button
                        onClick={onToggleDropdown}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer hover:opacity-80 ${statusStyle}`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {statusBadge.label}
                        <ChevronDown size={10} />
                    </button>

                    {showDropdown && (
                        <div className="absolute left-0 top-full mt-1 w-44 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl animate-scale-in overflow-hidden z-50">
                            <div className="py-1">
                                {availableStatuses.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => onStatusChange(option.value)}
                                        disabled={option.disabled}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                                            option.disabled
                                                ? 'text-[var(--text-muted)] cursor-not-allowed'
                                                : 'text-[var(--text-main)] hover:bg-[var(--bg-muted)]'
                                        }`}
                                    >
                                        {option.icon}
                                        <span>{option.label}</span>
                                        {option.disabled && (
                                            <span className="ml-auto text-xs text-[var(--text-muted)]">Current</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Priority dot */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`w-2 h-2 rounded-full ${priorityDot}`} />
                    <span className="text-xs text-[var(--text-dim)] uppercase">{priorityBadge.label}</span>
                </div>

                {/* Task ID */}
                <span className="text-xs text-[var(--text-muted)] font-mono shrink-0">{task.task_id}</span>

                {/* Middle: Title + Description */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[var(--text-main)] text-sm truncate">{task.title}</h3>
                    {task.description && (
                        <p className="text-xs text-[var(--text-dim)] truncate mt-0.5">{task.description}</p>
                    )}
                </div>

                {/* Right: Due date, Rating, Expand */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
                        <Calendar size={12} />
                        <span>Due {formatDate(task.due_date)}</span>
                    </div>

                    {task.quality_rating !== null && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <Award size={12} className="text-amber-400" />
                            <span className="text-xs font-medium text-amber-400">
                                ★ {task.quality_rating.toFixed(1)}/5
                            </span>
                        </div>
                    )}
                    <button 
                        onClick={onViewDetails}
                        className="text-[var(--text-muted)] group-hover:text-purple-400 transition-colors cursor-pointer"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────
// Helper functions
// ──────────────────────────────────────────────

const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: any; label: string }> = {
        COMPLETED: { variant: 'success', label: 'Completed' },
        SUBMITTED: { variant: 'warning', label: 'Submitted' },
        IN_PROGRESS: { variant: 'info', label: 'In Progress' },
        BLOCKED: { variant: 'danger', label: 'Blocked' },
        ASSIGNED: { variant: 'default', label: 'Assigned' },
        REWORK: { variant: 'danger', label: 'Needs Rework' },
    };
    return map[status] || { variant: 'default', label: status };
};

const getPriorityBadge = (priority: string) => {
    const map: Record<string, { variant: any; label: string }> = {
        CRITICAL: { variant: 'danger', label: 'Critical' },
        HIGH: { variant: 'warning', label: 'High' },
        MEDIUM: { variant: 'info', label: 'Medium' },
        LOW: { variant: 'default', label: 'Low' },
    };
    return map[priority] || { variant: 'default', label: priority };
};

const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

const isOverdue = (dueDate: string, status: string): boolean =>
    status !== 'COMPLETED' && new Date(dueDate) < new Date();

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

const InternTasks: React.FC = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [heatmapLoading, setHeatmapLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const dropdownRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    const toggleGroup = (groupId: number) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };

    const fetchTasks = async () => {
        if (!user?.id) return;

        setLoading(true);
        try {
            const params =
                user.role === 'INTERN'
                    ? {}
                    : user.role === 'MANAGER' || user.role === 'ADMIN'
                    ? { intern_id: user.id }
                    : {};

            const res = await axios.get('/analytics/tasks/', { params });
            setTasks(res.data.tasks || []);
        } catch (err) {
            console.error('Failed to load tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchHeatmapData = async () => {
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
    };

    useEffect(() => {
        if (user?.id) {
            fetchTasks();
            fetchHeatmapData();
        }
    }, [user?.id, user?.role]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (activeDropdown === null) return;

            const activeCard = dropdownRefs.current.get(activeDropdown);
            if (activeCard && !activeCard.contains(e.target as Node)) {
                setActiveDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeDropdown]);

    const updateTaskStatus = async (taskId: number, newStatus: string) => {
        setActiveDropdown(null);
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await axios.patch(`/analytics/tasks/${taskId}/update-status/`, { status: newStatus });
            setSuccess(`Task marked as ${newStatus.replace('_', ' ')}`);
            await fetchTasks();
            setTimeout(() => setSuccess(''), 3400);
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Could not update status';
            setError(msg);
            setTimeout(() => setError(''), 5000);
        } finally {
            setLoading(false);
        }
    };

    const getAvailableStatuses = (task: Task) => {
        const base = [
            {
                value: 'IN_PROGRESS',
                label: 'In Progress',
                icon: <PlayCircle size={14} className="text-blue-400" />,
                disabled: task.status === 'IN_PROGRESS',
            },
            {
                value: 'SUBMITTED',
                label: 'Mark Submitted',
                icon: <Clock size={14} className="text-amber-400" />,
                disabled: task.status === 'SUBMITTED',
            },
            {
                value: 'COMPLETED',
                label: 'Completed',
                icon: <CheckCircle size={14} className="text-emerald-400" />,
                disabled: task.status === 'COMPLETED',
            },
        ];

        if (user?.role === 'MANAGER' || user?.role === 'ADMIN') {
            base.push({
                value: 'BLOCKED',
                label: 'Blocked',
                icon: <AlertTriangle size={14} className="text-red-400" />,
                disabled: task.status === 'BLOCKED',
            });
        }

        return base;
    };

    const filteredTasks = tasks.filter((task) => {
        const matchesFilter =
            filter === 'all' ||
            (filter === 'OVERDUE' ? isOverdue(task.due_date, task.status) : task.status === filter);

        const matchesPriority =
            priorityFilter === 'all' || task.priority === priorityFilter;

        const matchesSearch =
            task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (task.description || '').toLowerCase().includes(searchTerm.toLowerCase());

        return matchesFilter && matchesPriority && matchesSearch;
    });
    
    const groupedTasks = filteredTasks.reduce((groups: ProjectGroup[], task) => {
        if (!task.project) {
            const unassignedGroup = groups.find(g => g.id === 0);
            if (unassignedGroup) {
                unassignedGroup.tasks.push(task);
            } else {
                groups.push({ id: 0, name: 'Unassigned', status: 'N/A', tasks: [task] });
            }
        } else {
            const existingGroup = groups.find(g => g.id === task.project!.id);
            if (existingGroup) {
                existingGroup.tasks.push(task);
            } else {
                groups.push({
                    id: task.project.id,
                    name: task.project.name,
                    status: task.project.status,
                    tasks: [task]
                });
            }
        }
        return groups;
    }, []);
    
    const getProjectProgress = (group: ProjectGroup) => {
        const total = group.tasks.length;
        const completed = group.tasks.filter(t => t.status === 'COMPLETED').length;
        return total > 0 ? Math.round((completed / total) * 100) : 0;
    };
    
    const getProjectStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING_APPROVAL':
                return { variant: 'warning' as const, label: 'Pending Approval' };
            case 'COMPLETED':
                return { variant: 'success' as const, label: 'Completed' };
            case 'ACTIVE':
                return { variant: 'info' as const, label: 'Active' };
            case 'DROPPED':
                return { variant: 'danger' as const, label: 'Dropped' };
            default:
                return { variant: 'default' as const, label: status };
        }
    };

    const statsValues = {
        total: tasks.length,
        completed: tasks.filter((t) => t.status === 'COMPLETED').length,
        submitted: tasks.filter((t) => t.status === 'SUBMITTED' || t.status === 'REVIEWED').length,
        inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
        blocked: tasks.filter((t) => t.status === 'BLOCKED').length,
        overdue: tasks.filter((t) => isOverdue(t.due_date, t.status)).length,
    };

    const StatsCard = ({
        children,
        className = '',
        onClick,
        isActive = false,
    }: {
        children: React.ReactNode;
        className?: string;
        onClick?: () => void;
        isActive?: boolean;
    }) => (
        <button
            onClick={onClick}
            className={`relative rounded-2xl border backdrop-blur-xl bg-[var(--card-bg)] p-5 text-left w-full transition-all hover:-translate-y-1 hover:shadow-lg ${
                isActive ? 'border-purple-500/50 shadow-lg shadow-purple-500/20' : 'border-[var(--border-color)] hover:border-purple-500/30'
            } ${className}`}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none rounded-2xl" />
            <div className="relative">{children}</div>
        </button>
    );

    return (
        <div className="min-h-screen bg-[var(--bg-color)] p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[var(--text-main)]">
                        My <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Tasks</span>
                    </h1>
                    <p className="text-[var(--text-dim)] mt-1">View and manage your assigned tasks</p>
                </div>

                {success && (
                    <div className="mb-6 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center gap-2">
                        <CheckCircle size={18} />
                        {success}
                    </div>
                )}

                {error && (
                    <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl flex items-center gap-2">
                        <AlertTriangle size={18} />
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    <StatsCard
                        className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20"
                        onClick={() => setFilter('all')}
                        isActive={filter === 'all'}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <Target size={20} className="text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[var(--text-main)]">{statsValues.total}</p>
                                <p className="text-sm text-[var(--text-dim)]">Total Tasks</p>
                            </div>
                        </div>
                    </StatsCard>

                    <StatsCard
                        className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20"
                        onClick={() => setFilter('COMPLETED')}
                        isActive={filter === 'COMPLETED'}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/20 rounded-lg">
                                <CheckCircle size={20} className="text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[var(--text-main)]">{statsValues.completed}</p>
                                <p className="text-sm text-[var(--text-dim)]">Completed</p>
                            </div>
                        </div>
                    </StatsCard>

                    <StatsCard
                        className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/20"
                        onClick={() => setFilter('SUBMITTED')}
                        isActive={filter === 'SUBMITTED'}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/20 rounded-lg">
                                <Clock size={20} className="text-amber-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[var(--text-main)]">{statsValues.submitted}</p>
                                <p className="text-sm text-[var(--text-dim)]">Submitted</p>
                            </div>
                        </div>
                    </StatsCard>

                    <StatsCard
                        className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20"
                        onClick={() => setFilter('IN_PROGRESS')}
                        isActive={filter === 'IN_PROGRESS'}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <PlayCircle size={20} className="text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[var(--text-main)]">{statsValues.inProgress}</p>
                                <p className="text-sm text-[var(--text-dim)]">In Progress</p>
                            </div>
                        </div>
                    </StatsCard>

                    <StatsCard
                        className="bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-500/20"
                        onClick={() => setFilter('BLOCKED')}
                        isActive={filter === 'BLOCKED'}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500/20 rounded-lg">
                                <AlertTriangle size={20} className="text-red-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[var(--text-main)]">{statsValues.blocked}</p>
                                <p className="text-sm text-[var(--text-dim)]">Blocked</p>
                            </div>
                        </div>
                    </StatsCard>

                    <StatsCard
                        className={`bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 ${statsValues.overdue > 0 ? 'ring-1 ring-red-500/50 animate-pulse-ring' : ''}`}
                        onClick={() => setFilter('OVERDUE')}
                        isActive={filter === 'OVERDUE'}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/20 rounded-lg">
                                <Clock size={20} className="text-amber-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[var(--text-main)]">{statsValues.overdue}</p>
                                <p className="text-sm text-[var(--text-dim)]">Overdue</p>
                            </div>
                        </div>
                    </StatsCard>
                </div>

                {/* Task Distribution Heatmap */}
                <Card className="mb-8 p-4">
                    {heatmapLoading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                        </div>
                    ) : (
                        <ContributionHeatmap
                            data={heatmapData}
                            title="Task Contribution"
                            colorScheme="green"
                        />
                    )}
                </Card>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setFilter(filter === 'all' ? 'all' : 'all')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all ${
                                filter === 'all'
                                    ? 'bg-purple-500/10 border-purple-500/50 text-purple-400'
                                    : 'bg-[var(--bg-muted)] border-[var(--border-color)] text-[var(--text-dim)] hover:border-purple-500/50'
                            }`}
                        >
                            All
                            {filter === 'all' && <X size={12} />}
                        </button>
                        <div className="relative group">
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-[var(--bg-muted)] border-[var(--border-color)] text-[var(--text-dim)] text-sm hover:border-purple-500/50 transition-all">
                                Status: {filter === 'all' ? 'All' : filter}
                                <ChevronDown size={12} />
                            </button>
                            <div className="absolute top-full left-0 mt-1 w-36 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 hidden group-hover:block">
                                <button onClick={() => setFilter('all')} className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--bg-muted)]">All</button>
                                <button onClick={() => setFilter('ASSIGNED')} className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--bg-muted)]">Assigned</button>
                                <button onClick={() => setFilter('IN_PROGRESS')} className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--bg-muted)]">In Progress</button>
                                <button onClick={() => setFilter('SUBMITTED')} className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--bg-muted)]">Submitted</button>
                                <button onClick={() => setFilter('COMPLETED')} className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--bg-muted)]">Completed</button>
                                <button onClick={() => setFilter('BLOCKED')} className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--bg-muted)]">Blocked</button>
                                <button onClick={() => setFilter('OVERDUE')} className="w-full px-3 py-2 text-sm text-left text-red-400 hover:bg-red-500/10">Overdue</button>
                            </div>
                        </div>
                        <div className="relative group">
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-[var(--bg-muted)] border-[var(--border-color)] text-[var(--text-dim)] text-sm hover:border-purple-500/50 transition-all">
                                Priority: {priorityFilter === 'all' ? 'All' : priorityFilter}
                                <ChevronDown size={12} />
                            </button>
                            <div className="absolute top-full left-0 mt-1 w-36 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 hidden group-hover:block">
                                <button onClick={() => setPriorityFilter('all')} className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--bg-muted)]">All</button>
                                <button onClick={() => setPriorityFilter('CRITICAL')} className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--bg-muted)]">Critical</button>
                                <button onClick={() => setPriorityFilter('HIGH')} className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--bg-muted)]">High</button>
                                <button onClick={() => setPriorityFilter('MEDIUM')} className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--bg-muted)]">Medium</button>
                                <button onClick={() => setPriorityFilter('LOW')} className="w-full px-3 py-2 text-sm text-left hover:bg-[var(--bg-muted)]">Low</button>
                            </div>
                        </div>
                        {(filter !== 'all' || priorityFilter !== 'all' || searchTerm) && (
                            <button
                                onClick={() => { setFilter('all'); setPriorityFilter('all'); setSearchTerm(''); }}
                                className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
                            >
                                Clear ×
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    {loading ? (
                        <div className="flex justify-center items-center min-h-[50vh]">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                <p className="text-[var(--text-muted)] animate-pulse">Loading tasks...</p>
                            </div>
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="relative rounded-2xl border backdrop-blur-xl bg-[var(--bg-muted)] border-[var(--border-color)] p-12 text-center">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none rounded-2xl" />
                            <Target size={48} className="mx-auto mb-4 text-[var(--text-muted)]" />
                            <p className="text-lg font-medium text-[var(--text-main)]">No tasks found</p>
                            <p className="text-sm text-[var(--text-dim)] mt-1">
                                {searchTerm || filter !== 'all'
                                    ? 'Try adjusting your filters or search term'
                                    : 'You will see tasks here once your manager assigns them'}
                            </p>
                        </div>
                    ) : (
                        <>
                            {groupedTasks.map((group) => (
                                <div key={group.id} className="space-y-4">
                                    {/* Project Header */}
                                    <div className="relative rounded-xl border backdrop-blur-xl bg-[var(--bg-muted)] border-[var(--border-color)] p-4">
                                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 pointer-events-none rounded-xl" />
                                        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-500/20 rounded-lg">
                                                    <Target size={20} className="text-purple-400" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-[var(--text-main)] text-lg">{group.name}</h3>
                                                    <p className="text-sm text-[var(--text-dim)]">
                                                        {group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {/* Progress bar */}
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-2 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transition-all duration-500"
                                                            style={{ width: `${getProjectProgress(group)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm text-[var(--text-dim)]">{getProjectProgress(group)}%</span>
                                                </div>
                                                {/* Collapse toggle */}
                                                <button
                                                    onClick={() => toggleGroup(group.id)}
                                                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                                                >
                                                    <ChevronDown size={18} className={`transition-transform ${collapsedGroups.has(group.id) ? '-rotate-90' : ''}`} />
                                                </button>
                                                {/* Project status badge */}
                                                <Badge variant={getProjectStatusBadge(group.status).variant}>
                                                    {getProjectStatusBadge(group.status).label}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Tasks in this project */}
                                    {!collapsedGroups.has(group.id) && group.tasks.map((task) => {
                                        const availableStatuses = getAvailableStatuses(task);
                                        const showDropdown = activeDropdown === task.id;

                                        return (
                                            <TaskCard
                                                key={task.id}
                                                task={task}
                                                showDropdown={showDropdown}
                                                onToggleDropdown={() =>
                                                    setActiveDropdown(showDropdown ? null : task.id)
                                                }
                                                onStatusChange={(status) => updateTaskStatus(task.id, status)}
                                                availableStatuses={availableStatuses}
                                                onViewDetails={() => setSelectedTask(task)}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </>
                    )}
                </div>

                {tasks.length > 0 && !loading && (
                    <div className="mt-8 p-4 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl">
                        <p className="text-sm text-[var(--text-dim)] text-center">
                            Completion Rate:{' '}
                            <span className="text-[var(--text-main)] font-semibold">
                                {statsValues.total > 0 ? Math.round((statsValues.completed / statsValues.total) * 100) : 0}%
                            </span>{' '}
                            ({statsValues.completed} of {statsValues.total} tasks)
                        </p>
                    </div>
                )}

                {selectedTask && (
                    <TaskDetailDrawer 
                        task={selectedTask} 
                        onClose={() => setSelectedTask(null)} 
                        role="intern"
                    />
                )}
            </div>
        </div>
    );
};

export default InternTasks;