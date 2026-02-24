import React, { useState, useEffect, useRef } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Badge, Button } from '../components/common';
import {
    Target, Clock, Award, Calendar, ChevronRight,
    CheckCircle, AlertTriangle, PlayCircle, Filter, Search,
    Loader2, ChevronDown
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

const TaskCard: React.FC<{
    task: Task;
    showDropdown: boolean;
    onToggleDropdown: () => void;
    onStatusChange: (status: string) => void;
    availableStatuses: { value: string; label: string; icon: React.ReactNode; disabled: boolean }[];
}> = ({ task, showDropdown, onToggleDropdown, onStatusChange, availableStatuses }) => {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const statusBadge = getStatusBadge(task.status);
    const priorityBadge = getPriorityBadge(task.priority);
    const overdue = isOverdue(task.due_date, task.status);

    return (
        <div
            ref={dropdownRef}
            className={`relative rounded-2xl border backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 ${
                showDropdown
                    ? 'z-50 bg-slate-800/50 border-purple-500/50 shadow-xl shadow-purple-500/20'
                    : 'bg-slate-800/30 border-white/5 hover:border-purple-500/30 hover:bg-slate-800/50 hover:shadow-lg hover:shadow-purple-500/10'
            } p-6`}
        >
            {/* Decorative gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none rounded-2xl" />

            <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className="text-xs text-slate-500 font-mono">{task.task_id}</span>
                        <Badge variant={statusBadge.variant} withDot>
                            {statusBadge.label}
                        </Badge>
                        <Badge variant={priorityBadge.variant} size="sm">
                            {priorityBadge.label}
                        </Badge>
                        {overdue && (
                            <Badge variant="danger" size="sm">
                                Overdue
                            </Badge>
                        )}
                    </div>

                    <h3 className="font-semibold text-white text-lg mb-2">{task.title}</h3>

                    {task.description && (
                        <p className="text-sm text-slate-400 mb-3 line-clamp-2">{task.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                        <div className="flex items-center gap-1.5">
                            <Calendar size={14} />
                            <span>Due: {formatDate(task.due_date)}</span>
                        </div>
                        {task.created_by?.full_name && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-500">by</span>
                                <span className="text-blue-400">{task.created_by.full_name}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={onToggleDropdown}
                            icon={<ChevronDown size={14} />}
                            iconPosition="right"
                        >
                            Change Status
                        </Button>

                        {showDropdown && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl animate-scale-in overflow-hidden z-50">
                                <div className="py-2">
                                    {availableStatuses.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => onStatusChange(option.value)}
                                            disabled={option.disabled}
                                            className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                                                option.disabled
                                                    ? 'text-slate-500 cursor-not-allowed'
                                                    : 'text-white hover:bg-slate-700'
                                            }`}
                                        >
                                            {option.icon}
                                            <span>{option.label}</span>
                                            {option.disabled && (
                                                <span className="ml-auto text-xs text-slate-500">Current</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {task.quality_rating !== null && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <Award size={16} className="text-amber-400" />
                            <span className="text-sm font-medium text-amber-400">
                                {task.quality_rating}/5
                            </span>
                        </div>
                    )}
                    <ChevronRight size={20} className="text-slate-400" />
                </div>
            </div>

            {task.status === 'IN_PROGRESS' && (
                <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-blue-400">In Progress</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                            style={{ width: '50%' }} // ← ideally come from backend
                        />
                    </div>
                </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        </div>
    );
};

// ──────────────────────────────────────────────
// Helper functions (unchanged)
// ──────────────────────────────────────────────

const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: any; label: string }> = {
        COMPLETED: { variant: 'success', label: 'Completed' },
        IN_PROGRESS: { variant: 'info', label: 'In Progress' },
        BLOCKED: { variant: 'danger', label: 'Blocked' },
        ASSIGNED: { variant: 'default', label: 'Assigned' },
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
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

    const dropdownRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    const fetchTasks = async () => {
        if (!user?.id) return;

        setLoading(true);
        try {
            // Most common pattern:
            //   • Intern → sees only own tasks (backend uses request.user)
            //   • Manager/Admin → can see specific intern by passing intern_id
            const params =
                user.role === 'INTERN' || user.role === 'INTERN'
                    ? {}
                    : user.role === 'MANAGER' || user.role === 'ADMIN'
                    ? { intern_id: user.id } // ← review this logic
                    : {};

            const res = await axios.get('/analytics/tasks/', { params });
            setTasks(res.data.tasks || []);
        } catch (err) {
            console.error('Failed to load tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) {
            fetchTasks();
        }
    }, [user?.id, user?.role]);

    // Improved click-outside handling
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

        const matchesSearch =
            task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (task.description || '').toLowerCase().includes(searchTerm.toLowerCase());

        return matchesFilter && matchesSearch;
    });
    
    // Group tasks by project
    const groupedTasks = filteredTasks.reduce((groups: ProjectGroup[], task) => {
        if (!task.project) {
            // Tasks without project go to "Unassigned" group
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
    
    // Calculate progress for each project group
    const getProjectProgress = (group: ProjectGroup) => {
        const total = group.tasks.length;
        const completed = group.tasks.filter(t => t.status === 'COMPLETED').length;
        return total > 0 ? Math.round((completed / total) * 100) : 0;
    };
    
    // Get project status badge variant
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

    const stats = {
        total: tasks.length,
        completed: tasks.filter((t) => t.status === 'COMPLETED').length,
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
            className={`relative rounded-2xl border backdrop-blur-xl bg-slate-800/30 p-5 text-left w-full transition-all hover:-translate-y-1 hover:shadow-lg ${
                isActive ? 'border-purple-500/50 shadow-lg shadow-purple-500/20' : 'border-white/5 hover:border-purple-500/30'
            } ${className}`}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none rounded-2xl" />
            <div className="relative">{children}</div>
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white">
                        My <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Tasks</span>
                    </h1>
                    <p className="text-slate-400 mt-1">View and manage your assigned tasks</p>
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
                                <p className="text-2xl font-bold text-white">{stats.total}</p>
                                <p className="text-sm text-slate-400">Total Tasks</p>
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
                                <p className="text-2xl font-bold text-white">{stats.completed}</p>
                                <p className="text-sm text-slate-400">Completed</p>
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
                                <p className="text-2xl font-bold text-white">{stats.inProgress}</p>
                                <p className="text-sm text-slate-400">In Progress</p>
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
                                <p className="text-2xl font-bold text-white">{stats.blocked}</p>
                                <p className="text-sm text-slate-400">Blocked</p>
                            </div>
                        </div>
                    </StatsCard>

                    <StatsCard
                        className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20"
                        onClick={() => setFilter('OVERDUE')}
                        isActive={filter === 'OVERDUE'}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/20 rounded-lg">
                                <Clock size={20} className="text-amber-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stats.overdue}</p>
                                <p className="text-sm text-slate-400">Overdue</p>
                            </div>
                        </div>
                    </StatsCard>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-slate-400" />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        >
                            <option value="all">All Status</option>
                            <option value="ASSIGNED">Assigned</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="BLOCKED">Blocked</option>
                            <option value="OVERDUE">Overdue</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-6">
                    {loading ? (
                        <div className="flex justify-center items-center min-h-[50vh]">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                <p className="text-slate-400 animate-pulse">Loading tasks...</p>
                            </div>
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="relative rounded-2xl border backdrop-blur-xl bg-slate-800/30 border-white/5 p-12 text-center">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none rounded-2xl" />
                            <Target size={48} className="mx-auto mb-4 text-slate-600" />
                            <p className="text-lg font-medium text-white">No tasks found</p>
                            <p className="text-sm text-slate-400 mt-1">
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
                                    <div className="relative rounded-xl border backdrop-blur-xl bg-slate-800/50 border-white/10 p-4">
                                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 pointer-events-none rounded-xl" />
                                        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-500/20 rounded-lg">
                                                    <Target size={20} className="text-purple-400" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-white text-lg">{group.name}</h3>
                                                    <p className="text-sm text-slate-400">
                                                        {group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {/* Progress bar */}
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transition-all duration-500"
                                                            style={{ width: `${getProjectProgress(group)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm text-slate-400">{getProjectProgress(group)}%</span>
                                                </div>
                                                {/* Project status badge */}
                                                <Badge variant={getProjectStatusBadge(group.status).variant}>
                                                    {getProjectStatusBadge(group.status).label}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Tasks in this project */}
                                    {group.tasks.map((task) => {
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
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </>
                    )}
                </div>

                {tasks.length > 0 && !loading && (
                    <div className="mt-8 p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
                        <p className="text-sm text-slate-400 text-center">
                            Completion Rate:{' '}
                            <span className="text-white font-semibold">
                                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                            </span>{' '}
                            ({stats.completed} of {stats.total} tasks)
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InternTasks;