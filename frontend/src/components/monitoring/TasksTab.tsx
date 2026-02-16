import React, { useState } from 'react';
import { Plus, Target, Clock, Award, ChevronDown, CheckCircle, AlertTriangle, PlayCircle } from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';

interface Task {
    id: number;
    task_id: string;
    title: string;
    status: string;
    priority: string;
    due_date: string;
    quality_rating: number | null;
}

interface TasksTabProps {
    tasks: Task[];
    onAddTask: () => void;
    canCreate: boolean;
    onStatusChange?: (taskId: number, newStatus: string) => void;
}

const TasksTab: React.FC<TasksTabProps> = ({ tasks, onAddTask, canCreate, onStatusChange }) => {
    // Ensure tasks is always an array
    const tasksArray = Array.isArray(tasks) ? tasks : [];

    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
            'COMPLETED': 'success',
            'IN_PROGRESS': 'info',
            'BLOCKED': 'danger',
            'ASSIGNED': 'default',
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
                icon: <PlayCircle size={14} className="text-blue-400" />,
                disabled: task.status === 'IN_PROGRESS'
            },
            {
                value: 'COMPLETED',
                label: 'Completed',
                icon: <CheckCircle size={14} className="text-emerald-400" />,
                disabled: task.status === 'COMPLETED'
            },
            {
                value: 'BLOCKED',
                label: 'Blocked',
                icon: <AlertTriangle size={14} className="text-red-400" />,
                disabled: task.status === 'BLOCKED'
            },
        ];
        return options;
    };

    const handleStatusChange = (taskId: number, newStatus: string) => {
        setActiveDropdown(null);
        if (onStatusChange) {
            onStatusChange(taskId, newStatus);
        }
    };

    // Custom styled card to avoid overflow issues
    const TaskCard: React.FC<{
        task: Task;
        showDropdown: boolean;
        onToggleDropdown: () => void;
    }> = ({ task, showDropdown, onToggleDropdown }) => {
        const statusBadge = getStatusBadge(task.status);
        const priorityBadge = getPriorityBadge(task.priority);
        const availableStatuses = getAvailableStatuses(task);

        return (
            <div
                className={`relative rounded-2xl border backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 ${showDropdown
                    ? 'z-50 bg-slate-800/50 border-purple-500/50 shadow-xl shadow-purple-500/20'
                    : 'bg-slate-800/30 border-white/5 hover:border-purple-500/30 hover:bg-slate-800/50 hover:shadow-lg hover:shadow-purple-500/10'
                    } p-5`}
            >
                {/* Decorative gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-5/5 pointer-events-none rounded-2xl"></div>

                <div className="relative">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-slate-500 font-mono">{task.task_id}</span>
                            <Badge variant={statusBadge} withDot>
                                {task.status.replace('_', ' ')}
                            </Badge>
                        </div>
                        {onStatusChange && (
                            <div className="relative">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={onToggleDropdown}
                                    icon={<ChevronDown size={14} />}
                                    iconPosition="right"
                                >
                                    Status
                                </Button>

                                {showDropdown && (
                                    <div className="absolute right-0 top-full mt-2 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-[100] animate-scale-in overflow-hidden">
                                        <div className="py-2">
                                            {availableStatuses.map((option) => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => handleStatusChange(task.id, option.value)}
                                                    disabled={option.disabled}
                                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${option.disabled
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
                        )}
                    </div>

                    <h3 className="font-semibold text-lg text-white mb-3">{task.title}</h3>

                    <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant={priorityBadge} size="sm">
                            {task.priority}
                        </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Clock size={14} />
                            <span>Due: {task.due_date}</span>
                        </div>
                        {task.quality_rating && (
                            <div className="flex items-center gap-1">
                                <Award size={14} className="text-amber-500" />
                                <span className="text-sm font-medium">{task.quality_rating}/5</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom decorative line */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Task Management</h2>
                    <p className="text-slate-400 mt-1">Track and manage assigned tasks</p>
                </div>
                {canCreate && (
                    <Button
                        onClick={onAddTask}
                        icon={<Plus size={18} />}
                        gradient="blue"
                    >
                        Assign New Task
                    </Button>
                )}
            </div>

            {/* Task Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="relative rounded-2xl border backdrop-blur-xl bg-slate-800/30 border-white/5 p-5 text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-5/5 pointer-events-none rounded-2xl"></div>
                    <div className="relative">
                        <p className="text-2xl font-bold text-white">{tasksArray.length}</p>
                        <p className="text-sm text-slate-400">Total Tasks</p>
                    </div>
                </div>
                <div className="relative rounded-2xl border backdrop-blur-xl bg-slate-800/30 border-white/5 p-5 text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-5/5 pointer-events-none rounded-2xl"></div>
                    <div className="relative">
                        <p className="text-2xl font-bold text-blue-400">{tasksArray.filter(t => t.status === 'IN_PROGRESS').length}</p>
                        <p className="text-sm text-slate-400">In Progress</p>
                    </div>
                </div>
                <div className="relative rounded-2xl border backdrop-blur-xl bg-slate-800/30 border-white/5 p-5 text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-5/5 pointer-events-none rounded-2xl"></div>
                    <div className="relative">
                        <p className="text-2xl font-bold text-emerald-400">{tasksArray.filter(t => t.status === 'COMPLETED').length}</p>
                        <p className="text-sm text-slate-400">Completed</p>
                    </div>
                </div>
                <div className="relative rounded-2xl border backdrop-blur-xl bg-slate-800/30 border-white/5 p-5 text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-5/5 pointer-events-none rounded-2xl"></div>
                    <div className="relative">
                        <p className="text-2xl font-bold text-red-400">{tasksArray.filter(t => t.status === 'BLOCKED').length}</p>
                        <p className="text-sm text-slate-400">Blocked</p>
                    </div>
                </div>
            </div>

            {/* Task Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {tasksArray.map((task) => (
                    <div
                        key={task.id}
                        style={{ zIndex: activeDropdown === task.id ? 50 : 1 }}
                    >
                        <TaskCard
                            task={task}
                            showDropdown={activeDropdown === task.id}
                            onToggleDropdown={() => setActiveDropdown(activeDropdown === task.id ? null : task.id)}
                        />
                    </div>
                ))}
                {tasksArray.length === 0 && (
                    <div className="col-span-3 text-center py-12">
                        <div className="relative rounded-2xl border backdrop-blur-xl bg-slate-800/30 border-white/5 p-12">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-5/5 pointer-events-none rounded-2xl"></div>
                            <Target size={48} className="mx-auto mb-4 text-slate-600 relative" />
                            <p className="text-lg font-medium text-white relative">No tasks found</p>
                            <p className="text-sm text-slate-400 mt-1 relative">Tasks will appear here once assigned</p>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default TasksTab;
