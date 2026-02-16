import React, { useState, useMemo } from 'react';
import { Plus, Target, Clock, Award, ChevronDown, CheckCircle, AlertTriangle, PlayCircle, Star, Code, Bug } from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Modal from '../common/Modal';
import axios from '../../api/axios';

interface Task {
    id: number;
    task_id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    due_date: string;
    estimated_hours?: number;
    actual_hours?: number;
    quality_rating: number | null;
    code_review_score: number | null;
    bug_count?: number;
    mentor_feedback?: string;
    rework_required?: boolean;
}

interface TasksTabProps {
    tasks: Task[];
    onAddTask: () => void;
    canCreate: boolean;
    onStatusChange?: (taskId: number, newStatus: string) => void;
    onRefresh?: () => void;
}

const TasksTab: React.FC<TasksTabProps> = ({ tasks, onAddTask, canCreate, onStatusChange, onRefresh }) => {
    const tasksArray = Array.isArray(tasks) ? tasks : [];

    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
    const [showEvaluationModal, setShowEvaluationModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [saving, setSaving] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [monthFilter, setMonthFilter] = useState<number>(new Date().getMonth() + 1);
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());

    const [evaluation, setEvaluation] = useState({
        quality_rating: 0,
        code_review_score: 0,
        bug_count: 0,
        mentor_feedback: '',
        rework_required: false,
        status: 'COMPLETED'
    });

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
                icon: <PlayCircle size={14} className="text-blue-400" />,
                disabled: task.status === 'IN_PROGRESS'
            },
            {
                value: 'SUBMITTED',
                label: 'Submitted',
                icon: <CheckCircle size={14} className="text-yellow-400" />,
                disabled: task.status === 'SUBMITTED'
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
            setSaving(true);
            await axios.patch(`/analytics/tasks/evaluate/`, {
                task_id: selectedTask.id,
                ...evaluation
            });
            setShowEvaluationModal(false);
            if (onRefresh) {
                onRefresh();
            }
        } catch (error) {
            console.error('Error submitting evaluation:', error);
            alert('Failed to submit evaluation. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const canEvaluate = (task: Task) => {
        return task.status === 'COMPLETED';
    };

    // Filter tasks by month and year only (for status card counts)
    const monthYearFilteredTasks = tasksArray.filter(task => {
        const taskDate = new Date(task.due_date);
        const taskMonth = taskDate.getMonth() + 1;
        const taskYear = taskDate.getFullYear();
        return taskMonth === monthFilter && taskYear === yearFilter;
    });

    // Filter tasks by status if filter is selected (for task list)
    const filteredTasks = statusFilter
        ? monthYearFilteredTasks.filter(task => task.status === statusFilter)
        : monthYearFilteredTasks;

    const getStatCardClass = (status: string) => {
        const isActive = statusFilter === status;
        return `relative rounded-2xl border backdrop-blur-xl bg-slate-800/30 border-white/5 p-5 text-center cursor-pointer transition-all hover:scale-105 ${isActive ? 'border-purple-500/50 bg-slate-800/50' : ''}`;
    };

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

                    {(task.quality_rating !== null || task.code_review_score !== null) && (
                        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-white/10">
                            {task.quality_rating !== null && (
                                <div className="flex items-center gap-1 text-amber-400">
                                    <Star size={14} fill="currentColor" />
                                    <span className="text-sm font-medium">{task.quality_rating}/5</span>
                                </div>
                            )}
                            {task.code_review_score !== null && (
                                <div className="flex items-center gap-1 text-blue-400">
                                    <Code size={14} />
                                    <span className="text-sm font-medium">{task.code_review_score}%</span>
                                </div>
                            )}
                            {task.bug_count && task.bug_count > 0 && (
                                <div className="flex items-center gap-1 text-red-400">
                                    <Bug size={14} />
                                    <span className="text-sm font-medium">{task.bug_count}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {canEvaluate(task) && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                            <Button
                                fullWidth
                                onClick={() => openEvaluationModal(task)}
                            >
                                {task.quality_rating === null ? 'Evaluate Task' : 'Update Evaluation'}
                            </Button>
                        </div>
                    )}
                </div>

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

            {/* Month/Year Filter */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-400">Month:</label>
                    <select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(parseInt(e.target.value))}
                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                        <option value={1}>January</option>
                        <option value={2}>February</option>
                        <option value={3}>March</option>
                        <option value={4}>April</option>
                        <option value={5}>May</option>
                        <option value={6}>June</option>
                        <option value={7}>July</option>
                        <option value={8}>August</option>
                        <option value={9}>September</option>
                        <option value={10}>October</option>
                        <option value={11}>November</option>
                        <option value={12}>December</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-400">Year:</label>
                    <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(parseInt(e.target.value))}
                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                        <option value={2024}>2024</option>
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                        <option value={2027}>2027</option>
                        <option value={2028}>2028</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <button
                    onClick={() => setStatusFilter(statusFilter === null ? null : null)}
                    className={getStatCardClass('ALL')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-5/5 pointer-events-none rounded-2xl"></div>
                    <div className="relative">
                        <p className="text-2xl font-bold text-white">{monthYearFilteredTasks.length}</p>
                        <p className="text-sm text-slate-400">Total Tasks</p>
                    </div>
                </button>
                <button
                    onClick={() => setStatusFilter(statusFilter === 'ASSIGNED' ? null : 'ASSIGNED')}
                    className={getStatCardClass('ASSIGNED')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-5/5 pointer-events-none rounded-2xl"></div>
                    <div className="relative">
                        <p className="text-2xl font-bold text-indigo-400">{monthYearFilteredTasks.filter(t => t.status === 'ASSIGNED').length}</p>
                        <p className="text-sm text-slate-400">Assigned</p>
                    </div>
                </button>
                <button
                    onClick={() => setStatusFilter(statusFilter === 'IN_PROGRESS' ? null : 'IN_PROGRESS')}
                    className={getStatCardClass('IN_PROGRESS')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-5/5 pointer-events-none rounded-2xl"></div>
                    <div className="relative">
                        <p className="text-2xl font-bold text-blue-400">{monthYearFilteredTasks.filter(t => t.status === 'IN_PROGRESS').length}</p>
                        <p className="text-sm text-slate-400">In Progress</p>
                    </div>
                </button>
                <button
                    onClick={() => setStatusFilter(statusFilter === 'SUBMITTED' ? null : 'SUBMITTED')}
                    className={getStatCardClass('SUBMITTED')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-5/5 pointer-events-none rounded-2xl"></div>
                    <div className="relative">
                        <p className="text-2xl font-bold text-yellow-400">{monthYearFilteredTasks.filter(t => t.status === 'SUBMITTED').length}</p>
                        <p className="text-sm text-slate-400">Submitted</p>
                    </div>
                </button>
                <button
                    onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? null : 'COMPLETED')}
                    className={getStatCardClass('COMPLETED')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-5/5 pointer-events-none rounded-2xl"></div>
                    <div className="relative">
                        <p className="text-2xl font-bold text-emerald-400">{monthYearFilteredTasks.filter(t => t.status === 'COMPLETED').length}</p>
                        <p className="text-sm text-slate-400">Completed</p>
                    </div>
                </button>
                <button
                    onClick={() => setStatusFilter(statusFilter === 'BLOCKED' ? null : 'BLOCKED')}
                    className={getStatCardClass('BLOCKED')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-5/5 pointer-events-none rounded-2xl"></div>
                    <div className="relative">
                        <p className="text-2xl font-bold text-red-400">{monthYearFilteredTasks.filter(t => t.status === 'BLOCKED').length}</p>
                        <p className="text-sm text-slate-400">Blocked</p>
                    </div>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTasks.map((task) => (
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
                {filteredTasks.length === 0 && (
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

            <Modal
                isOpen={showEvaluationModal}
                onClose={() => setShowEvaluationModal(false)}
                title={`Evaluate: ${selectedTask?.title}`}
                gradient="violet"
                size="md"
            >
                <div className="space-y-5">
                    <div className="bg-slate-800/50 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Clock size={14} />
                            <span>Est: {selectedTask?.estimated_hours || 0}h | Actual: {selectedTask?.actual_hours || 0}h</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Quality Rating (0-5)</label>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} type="button" onClick={() => setEvaluation({ ...evaluation, quality_rating: star })} className="focus:outline-none p-1">
                                    <Star size={28} className={star <= evaluation.quality_rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'} />
                                </button>
                            ))}
                            <span className="ml-2 text-slate-400 text-sm">{evaluation.quality_rating > 0 ? `${evaluation.quality_rating}.0` : '-'}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Code Review Score (0-100)</label>
                        <div className="flex items-center gap-4">
                            <input type="range" min="0" max="100" value={evaluation.code_review_score} onChange={(e) => setEvaluation({ ...evaluation, code_review_score: parseInt(e.target.value) })} className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                            <span className="w-12 text-center text-white font-medium">{evaluation.code_review_score}%</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Bugs Found</label>
                        <input type="number" min="0" value={evaluation.bug_count} onChange={(e) => setEvaluation({ ...evaluation, bug_count: parseInt(e.target.value) || 0 })} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Mentor Feedback</label>
                        <textarea value={evaluation.mentor_feedback} onChange={(e) => setEvaluation({ ...evaluation, mentor_feedback: e.target.value })} rows={3} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white" />
                    </div>

                    <div className="flex items-center gap-3">
                        <input type="checkbox" id="rework" checked={evaluation.rework_required} onChange={(e) => setEvaluation({ ...evaluation, rework_required: e.target.checked })} className="w-5 h-5" />
                        <label htmlFor="rework" className="text-sm text-slate-300">Require Rework</label>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-white/10">
                        <Button variant="secondary" fullWidth onClick={() => setShowEvaluationModal(false)}>Cancel</Button>
                        <Button fullWidth onClick={submitEvaluation} disabled={saving}>
                            {saving ? 'Saving...' : 'Submit Evaluation'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TasksTab;
