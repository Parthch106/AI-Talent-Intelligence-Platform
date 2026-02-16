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
    created_by?: {
        full_name: string;
    };
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
            className={`relative rounded-2xl border backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 ${showDropdown
                ? 'z-50 bg-slate-800/50 border-purple-500/50 shadow-xl shadow-purple-500/20'
                : 'bg-slate-800/30 border-white/5 hover:border-purple-500/30 hover:bg-slate-800/50 hover:shadow-lg hover:shadow-purple-500/10'
                } p-6`}
        >
            {/* Decorative gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-5/5 pointer-events-none rounded-2xl"></div>

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
                        <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                            {task.description}
                        </p>
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
                    {/* Status Dropdown */}
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
                            <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-[100] animate-scale-in overflow-hidden">
                                <div className="py-2">
                                    {availableStatuses.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => onStatusChange(option.value)}
                                            disabled={option.disabled}
                                            className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${option.disabled
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

                    {task.quality_rating && (
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

            {/* Progress indicator for in-progress tasks */}
            {task.status === 'IN_PROGRESS' && (
                <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-blue-400">In Progress</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                            style={{ width: '50%' }}
                        />
                    </div>
                </div>
            )}

            {/* Bottom decorative line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
        </div>
    );
};

const getStatusBadge = (status: string): { variant: 'success' | 'warning' | 'danger' | 'info' | 'default', label: string } => {
    const statusMap: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default', label: string }> = {
        'COMPLETED': { variant: 'success', label: 'Completed' },
        'IN_PROGRESS': { variant: 'info', label: 'In Progress' },
        'BLOCKED': { variant: 'danger', label: 'Blocked' },
        'ASSIGNED': { variant: 'default', label: 'Assigned' },
    };
    return statusMap[status] || { variant: 'default', label: status };
};

const getPriorityBadge = (priority: string): { variant: 'danger' | 'warning' | 'info' | 'default', label: string } => {
    const priorityMap: Record<string, { variant: 'danger' | 'warning' | 'info' | 'default', label: string }> = {
        'CRITICAL': { variant: 'danger', label: 'Critical' },
        'HIGH': { variant: 'warning', label: 'High' },
        'MEDIUM': { variant: 'info', label: 'Medium' },
        'LOW': { variant: 'default', label: 'Low' },
    };
    return priorityMap[priority] || { variant: 'default', label: priority };
};

const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

const isOverdue = (dueDate: string, status: string): boolean => {
    if (status === 'COMPLETED') return false;
    return new Date(dueDate) < new Date();
};

const InternTasks: React.FC = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [filter, setFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
    const [userLoaded, setUserLoaded] = useState(false);

    const fetchTasks = async () => {
        // Skip if user is not loaded yet
        if (!user?.id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const response = await axios.get('/analytics/tasks/', {
                // For interns, don't pass intern_id - backend uses current user
                // For admin/manager, pass intern_id to view specific intern's tasks
                params: user?.role === 'INTERN' ? {} : { intern_id: user?.id }
            });
            setTasks(response.data.tasks || []);
        } catch (err) {
            console.error('Error fetching tasks:', err);
        }
        setLoading(false);
    };

    // Fetch tasks when user is loaded
    useEffect(() => {
        if (user?.id) {
            setUserLoaded(true);
            fetchTasks();
        }
    }, [user?.id]);

    useEffect(() => {
        // Close dropdown when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            const dropdowns = document.querySelectorAll('[data-dropdown-ref]');
            const isClickInside = Array.from(dropdowns).some(
                dropdown => dropdown.contains(event.target as Node)
            );
            if (!isClickInside) {
                setActiveDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const updateTaskStatus = async (taskId: number, newStatus: string) => {
        setActiveDropdown(null);
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await axios.patch(`/analytics/tasks/${taskId}/update-status/`, {
                status: newStatus
            });
            setSuccess(`Task status updated to ${newStatus.replace('_', ' ')}`);
            fetchTasks();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'Failed to update task status';
            setError(errorMsg);
            setTimeout(() => setError(''), 5000);
        }
        setLoading(false);
    };

    const getAvailableStatuses = (task: Task): { value: string; label: string; icon: React.ReactNode; disabled: boolean }[] => {
        const options = [
            {
                value: 'IN_PROGRESS',
                label: 'In Progress',
                icon: <PlayCircle size={14} className="text-blue-400" />,
                disabled: task.status === 'IN_PROGRESS'
            },
            {
                value: 'COMPLETED',
                label: 'Completed',
                icon: <CheckCircle size={14} className="text-emerald-400" />,
                disabled: task.status === 'COMPLETED'
            },
        ];

        // Only managers can block tasks
        if (user?.role === 'MANAGER' || user?.role === 'ADMIN') {
            options.push({
                value: 'BLOCKED',
                label: 'Blocked',
                icon: <AlertTriangle size={14} className="text-red-400" />,
                disabled: task.status === 'BLOCKED'
            });
        }

        return options;
    };

    const filteredTasks = tasks.filter(task => {
        const matchesFilter = filter === 'all' || task.status === filter;
        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getStats = () => {
        return {
            total: tasks.length,
            completed: tasks.filter(t => t.status === 'COMPLETED').length,
            inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
            blocked: tasks.filter(t => t.status === 'BLOCKED').length,
            overdue: tasks.filter(t => isOverdue(t.due_date, t.status)).length,
        };
    };

    const stats = getStats();

    // Simple Card component for stats
    const StatsCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
        <div className={`relative rounded-2xl border backdrop-blur-xl bg-slate-800/30 border-white/5 p-5 ${className}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none rounded-2xl"></div>
            <div className="relative">{children}</div>
        </div>
    );

    return (
        <div className="min-h-screen animate-fade-in p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">
                    My <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Tasks</span>
                </h1>
                <p className="text-slate-400 mt-1">View and track your assigned tasks</p>
            </div>

            {/* Success Message */}
            {success && (
                <div className="mb-6 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center gap-2 animate-slide-up">
                    <CheckCircle size={18} />
                    {success}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl flex items-center gap-2 animate-slide-up">
                    <AlertTriangle size={18} />
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <StatsCard className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
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
                <StatsCard className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20">
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
                <StatsCard className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
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
                <StatsCard className="bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-500/20">
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
                <StatsCard className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
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

            {/* Filter and Search */}
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
                    </select>
                </div>
            </div>

            {/* Tasks List */}
            <div className="space-y-4 relative">
                {!userLoaded ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                            <p className="text-slate-400">Loading user...</p>
                        </div>
                    </div>
                ) : loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                            <p className="text-slate-400">Loading tasks...</p>
                        </div>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="relative rounded-2xl border backdrop-blur-xl bg-slate-800/30 border-white/5 p-12 text-center">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none rounded-2xl"></div>
                        <Target size={48} className="mx-auto mb-4 text-slate-600 relative" />
                        <p className="text-lg font-medium text-white relative">No tasks found</p>
                        <p className="text-sm text-slate-400 mt-1 relative">
                            {searchTerm || filter !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Tasks will appear here when assigned by your manager'}
                        </p>
                    </div>
                ) : (
                    filteredTasks.map((task) => {
                        const availableStatuses = getAvailableStatuses(task);
                        const showDropdown = activeDropdown === task.id;

                        return (
                            <div
                                key={task.id}
                                data-dropdown-ref={showDropdown ? 'true' : undefined}
                                style={{ zIndex: showDropdown ? 50 : 1 }}
                            >
                                <TaskCard
                                    task={task}
                                    showDropdown={showDropdown}
                                    onToggleDropdown={() => setActiveDropdown(showDropdown ? null : task.id)}
                                    onStatusChange={(status) => updateTaskStatus(task.id, status)}
                                    availableStatuses={availableStatuses}
                                />
                            </div>
                        );
                    })
                )}
            </div>

            {/* Task Summary Footer */}
            {tasks.length > 0 && (
                <div className="mt-8 p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
                    <p className="text-sm text-slate-400 text-center">
                        Completion Rate: <span className="text-white font-semibold">{Math.round((stats.completed / stats.total) * 100)}%</span>
                        {' '}({stats.completed} of {stats.total} tasks)
                    </p>
                </div>
            )}
        </div>
    );
};

export default InternTasks;
