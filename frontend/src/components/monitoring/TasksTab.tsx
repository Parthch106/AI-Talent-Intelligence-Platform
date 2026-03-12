import React, { useState } from 'react';
import { Plus, Target, Clock, Award, ChevronDown, CheckCircle, AlertTriangle, PlayCircle, Star, Code, Bug, LayoutGrid, List, Sparkles, Wand2, Loader2, MessageSquare } from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Modal from '../common/Modal';
import axios from '../../api/axios';

interface AITaskSuggestion {
    title: string;
    description: string;
    priority: string;
    estimated_hours: number;
    due_date: string;
    skills_required: string[];
    rationale: string;
}

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
    project?: {
        id: number;
        name: string;
        status: string;
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
}

const TasksTab: React.FC<TasksTabProps> = ({ tasks, onAddTask, canCreate, onStatusChange, onRefresh, internId, internName }) => {
    const tasksArray = Array.isArray(tasks) ? tasks : [];

    // Extract unique projects from tasks
    React.useEffect(() => {
        const uniqueProjects = new Map<number, string>();
        tasksArray.forEach(task => {
            if (task.project && task.project.id) {
                uniqueProjects.set(task.project.id, task.project.name);
            }
        });
        setProjects(Array.from(uniqueProjects.entries()).map(([id, name]) => ({ id, name })));
    }, [tasksArray]);

    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
    const [showEvaluationModal, setShowEvaluationModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [saving, setSaving] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [projectFilter, setProjectFilter] = useState<number | null>(null);
    const [projects, setProjects] = useState<{id: number; name: string}[]>([]);
    const [monthFilter, setMonthFilter] = useState<number>(new Date().getMonth() + 1);
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // AI Task Generation State
    const [showAITaskModal, setShowAITaskModal] = useState(false);
    const [generatingTasks, setGeneratingTasks] = useState(false);
    const [aiTasks, setAiTasks] = useState<AITaskSuggestion[]>([]);
    const [aiSummary, setAiSummary] = useState<string>('');
    const [selectedAITask, setSelectedAITask] = useState<AITaskSuggestion | null>(null);
    const [editingTask, setEditingTask] = useState<AITaskSuggestion | null>(null);
    const [projectRequirements, setProjectRequirements] = useState<string>('');
    const [targetRole, setTargetRole] = useState<string>('');
    const [assigningTask, setAssigningTask] = useState(false);
    const [aiError, setAiError] = useState<string>('');

    const [evaluation, setEvaluation] = useState({
        quality_rating: 0,
        code_review_score: 0,
        bug_count: 0,
        mentor_feedback: '',
        rework_required: false,
        status: 'COMPLETED'
    });

    // Feedback Modal State
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackTask, setFeedbackTask] = useState<Task | null>(null);
    const [feedbackData, setFeedbackData] = useState({
        task_status: 'COMPLETED_APPROVED',
        rating: 5,
        comments: '',
        strengths: '',
        areas_for_improvement: ''
    });
    const [submittingFeedback, setSubmittingFeedback] = useState(false);

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

    // Submit feedback for a task
    const submitFeedback = async () => {
        if (!feedbackTask || !internId) return;

        try {
            setSubmittingFeedback(true);
            await axios.post('/feedback/', {
                recipient_id: internId,
                task_id: feedbackTask.id,
                feedback_type: 'TASK',
                task_status: feedbackData.task_status,
                rating: feedbackData.rating,
                comments: feedbackData.comments,
                strengths: feedbackData.strengths,
                areas_for_improvement: feedbackData.areas_for_improvement
            });
            setShowFeedbackModal(false);
            setFeedbackTask(null);
            setFeedbackData({
                task_status: 'COMPLETED_APPROVED',
                rating: 5,
                comments: '',
                strengths: '',
                areas_for_improvement: ''
            });
            if (onRefresh) {
                onRefresh();
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('Failed to submit feedback. Please try again.');
        } finally {
            setSubmittingFeedback(false);
        }
    };

    const canEvaluate = (task: Task) => {
        return task.status === 'COMPLETED';
    };

    const openFeedbackModal = (task: Task) => {
        setFeedbackTask(task);
        setShowFeedbackModal(true);
    };

    const canGiveFeedback = (task: Task) => {
        return task.status === 'COMPLETED' || task.status === 'SUBMITTED' || task.status === 'REVIEWED';
    };

    // AI Task Generation Functions
    const generateAITasks = async () => {
        if (!internId) {
            setAiError('No intern selected. Please select an intern first.');
            return;
        }

        try {
            setGeneratingTasks(true);
            setAiError('');
            const response = await axios.post('/analytics/llm/generate-tasks/', {
                intern_id: internId,
                project_requirements: projectRequirements || undefined,
                target_role: targetRole || undefined,
                num_suggestions: 3
            });

            setAiTasks(response.data.tasks || []);
            setAiSummary(response.data.summary || '');
        } catch (error: any) {
            console.error('Error generating AI tasks:', error);
            setAiError(error.response?.data?.error || 'Failed to generate AI tasks. Please try again.');
        } finally {
            setGeneratingTasks(false);
        }
    };

    const assignAITask = async (task: AITaskSuggestion) => {
        if (!internId) return;

        try {
            setAssigningTask(true);
            await axios.post('/analytics/tasks/create/', {
                title: task.title,
                description: task.description,
                priority: task.priority,
                estimated_hours: task.estimated_hours,
                due_date: task.due_date,
                status: 'ASSIGNED',
                intern_id: internId
            });

            setShowAITaskModal(false);
            setAiTasks([]);
            setAiSummary('');
            setSelectedAITask(null);
            setEditingTask(null);

            if (onRefresh) {
                onRefresh();
            }

            alert('Task assigned successfully!');
        } catch (error: any) {
            console.error('Error assigning task:', error);
            alert(error.response?.data?.error || 'Failed to assign task. Please try again.');
        } finally {
            setAssigningTask(false);
        }
    };

    const openTaskDetails = (task: AITaskSuggestion) => {
        setSelectedAITask(task);
        setEditingTask({ ...task });
    };

    const saveEditedTask = () => {
        if (editingTask) {
            setSelectedAITask(editingTask);
        }
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
    
    // Apply project filter
    const projectFilteredTasks = projectFilter
        ? filteredTasks.filter(task => task.project && task.project.id === projectFilter)
        : filteredTasks;

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
                            {canGiveFeedback(task) && internId && (
                                <Button
                                    fullWidth
                                    variant="secondary"
                                    className="mt-2"
                                    onClick={() => openFeedbackModal(task)}
                                >
                                    <MessageSquare size={14} className="mr-1" />
                                    Give Feedback
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
            </div>
        );
    };

    const TaskListItem: React.FC<{
        task: Task;
        showDropdown: boolean;
        onToggleDropdown: () => void;
    }> = ({ task, showDropdown, onToggleDropdown }) => {
        const statusBadge = getStatusBadge(task.status);
        const priorityBadge = getPriorityBadge(task.priority);
        const availableStatuses = getAvailableStatuses(task);

        return (
            <div
                className={`relative rounded-xl border backdrop-blur-xl transition-all duration-200 ${showDropdown
                    ? 'z-50 bg-slate-800/50 border-purple-500/50 shadow-xl'
                    : 'bg-slate-800/30 border-white/5 hover:border-purple-500/30 hover:bg-slate-800/50'
                    } p-4`}
            >
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-20">
                        <span className="text-xs text-slate-500 font-mono">{task.task_id}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{task.title}</h3>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={statusBadge} withDot>
                            {task.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant={priorityBadge} size="sm">
                            {task.priority}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-400 flex-shrink-0 w-32">
                        <Clock size={14} />
                        <span>{task.due_date}</span>
                    </div>

                    {(task.quality_rating !== null || task.code_review_score !== null) && (
                        <div className="flex items-center gap-3 flex-shrink-0">
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
                        </div>
                    )}

                    <div className="flex items-center gap-2 flex-shrink-0">
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
                        {canEvaluate(task) && (
                            <Button
                                size="sm"
                                onClick={() => openEvaluationModal(task)}
                            >
                                {task.quality_rating === null ? 'Evaluate' : 'Update'}
                            </Button>
                        )}
                        {canGiveFeedback(task) && internId && (
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openFeedbackModal(task)}
                            >
                                <MessageSquare size={14} className="mr-1" />
                                Feedback
                            </Button>
                        )}
                    </div>
                </div>
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
                    <div className="flex gap-2">
                        <Button
                            onClick={() => setShowAITaskModal(true)}
                            icon={<Sparkles size={18} />}
                            variant="secondary"
                        >
                            Generate AI Tasks
                        </Button>
                        <Button
                            onClick={onAddTask}
                            icon={<Plus size={18} />}
                            gradient="blue"
                        >
                            Assign New Task
                        </Button>
                    </div>
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
                {projects.length > 0 && (
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-400">Project:</label>
                        <select
                            value={projectFilter || ''}
                            onChange={(e) => setProjectFilter(e.target.value ? parseInt(e.target.value) : null)}
                            className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                        >
                            <option value="">All Projects</option>
                            {projects.map(project => (
                                <option key={project.id} value={project.id}>{project.name}</option>
                            ))}
                        </select>
                    </div>
                )}
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

            {/* View Toggle */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    title="Grid View"
                >
                    <LayoutGrid size={18} />
                </button>
                <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    title="List View"
                >
                    <List size={18} />
                </button>
            </div>

            {/* Tasks Display - Grid or List View */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {projectFilteredTasks.map((task) => (
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
                    {projectFilteredTasks.length === 0 && (
                        <div className="col-span-full text-center py-12">
                            <div className="relative rounded-2xl border backdrop-blur-xl bg-slate-800/30 border-white/5 p-12">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none rounded-2xl"></div>
                                <Target size={48} className="mx-auto mb-4 text-slate-600 relative" />
                                <p className="text-lg font-medium text-white relative">No tasks found</p>
                                <p className="text-sm text-slate-400 mt-1 relative">Tasks will appear here once assigned</p>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full min-w-[900px]">
                        <thead>
                            <tr className="bg-slate-800/80 text-left text-sm text-slate-400">
                                <th className="px-4 py-3 font-medium w-20">ID</th>
                                <th className="px-4 py-3 font-medium min-w-[280px]">Title</th>
                                <th className="px-4 py-3 font-medium w-28">Status</th>
                                <th className="px-4 py-3 font-medium w-24">Priority</th>
                                <th className="px-4 py-3 font-medium w-28">Due Date</th>
                                <th className="px-4 py-3 font-medium w-24">Quality</th>
                                <th className="px-4 py-3 font-medium w-24">Code %</th>
                                <th className="px-4 py-3 font-medium w-32">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {projectFilteredTasks.map((task) => (
                                <tr 
                                    key={task.id} 
                                    className="bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                                >
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-slate-500 font-mono">{task.task_id}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-white font-medium truncate block w-full" title={task.title}>{task.title}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant={getStatusBadge(task.status)} withDot>
                                            {task.status.replace('_', ' ')}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant={getPriorityBadge(task.priority)} size="sm">
                                            {task.priority}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 text-sm text-slate-400">
                                            <Clock size={14} />
                                            <span>{task.due_date}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {task.quality_rating !== null ? (
                                            <span className="text-amber-400 text-sm font-medium">★ {task.quality_rating}/5</span>
                                        ) : (
                                            <span className="text-slate-600 text-sm">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {task.code_review_score !== null ? (
                                            <span className="text-blue-400 text-sm font-medium">{task.code_review_score}%</span>
                                        ) : (
                                            <span className="text-slate-600 text-sm">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {onStatusChange && (
                                                <div className="relative">
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => setActiveDropdown(activeDropdown === task.id ? null : task.id)}
                                                    >
                                                        Status
                                                    </Button>
                                                    {activeDropdown === task.id && (
                                                        <div className="absolute right-0 top-full mt-1 w-36 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-[100] animate-scale-in">
                                                            <div className="py-1">
                                                                {getAvailableStatuses(task).map((option) => (
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
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {canEvaluate(task) && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => openEvaluationModal(task)}
                                                >
                                                    {task.quality_rating === null ? 'Evaluate' : 'Update'}
                                                </Button>
                                            )}
                                            {canGiveFeedback(task) && internId && (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => openFeedbackModal(task)}
                                                >
                                                    <MessageSquare size={14} />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {projectFilteredTasks.length === 0 && (
                        <div className="text-center py-12 bg-slate-800/30">
                            <Target size={48} className="mx-auto mb-4 text-slate-600" />
                            <p className="text-lg font-medium text-white">No tasks found</p>
                            <p className="text-sm text-slate-400 mt-1">Tasks will appear here once assigned</p>
                        </div>
                    )}
                </div>
            )}

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

            {/* Task Feedback Modal */}
            <Modal
                isOpen={showFeedbackModal}
                onClose={() => {
                    setShowFeedbackModal(false);
                    setFeedbackTask(null);
                }}
                title={`Provide Feedback: ${feedbackTask?.title || ''}`}
                gradient="emerald"
                size="md"
            >
                <div className="space-y-5">
                    <div className="bg-slate-800/50 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <MessageSquare size={14} />
                            <span>Task ID: {feedbackTask?.task_id}</span>
                        </div>
                    </div>

                    {/* Task Status Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Task Status</label>
                        <select
                            value={feedbackData.task_status}
                            onChange={(e) => setFeedbackData({ ...feedbackData, task_status: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white"
                        >
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED_APPROVED">Complete - Approved</option>
                            <option value="COMPLETED_REWORK">Complete - Needs Rework</option>
                        </select>
                    </div>

                    {/* Rating */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Rating (1-5)</label>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} type="button" onClick={() => setFeedbackData({ ...feedbackData, rating: star })} className="focus:outline-none p-1">
                                    <Star size={28} className={star <= feedbackData.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'} />
                                </button>
                            ))}
                            <span className="ml-2 text-slate-400 text-sm">{feedbackData.rating > 0 ? `${feedbackData.rating}.0` : '-'}</span>
                        </div>
                    </div>

                    {/* Comments */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Comments</label>
                        <textarea
                            value={feedbackData.comments}
                            onChange={(e) => setFeedbackData({ ...feedbackData, comments: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white"
                            placeholder="Provide feedback on the task completion..."
                        />
                    </div>

                    {/* Strengths */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Strengths</label>
                        <textarea
                            value={feedbackData.strengths}
                            onChange={(e) => setFeedbackData({ ...feedbackData, strengths: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white"
                            placeholder="What did the intern do well?"
                        />
                    </div>

                    {/* Areas for Improvement */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Areas for Improvement</label>
                        <textarea
                            value={feedbackData.areas_for_improvement}
                            onChange={(e) => setFeedbackData({ ...feedbackData, areas_for_improvement: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white"
                            placeholder="What can be improved?"
                        />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-white/10">
                        <Button variant="secondary" fullWidth onClick={() => setShowFeedbackModal(false)}>Cancel</Button>
                        <Button fullWidth onClick={submitFeedback} disabled={submittingFeedback}>
                            {submittingFeedback ? 'Sending...' : 'Submit Feedback'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* AI Task Generation Modal */}
            <Modal
                isOpen={showAITaskModal}
                onClose={() => {
                    setShowAITaskModal(false);
                    setAiTasks([]);
                    setAiSummary('');
                    setSelectedAITask(null);
                    setEditingTask(null);
                    setAiError('');
                }}
                title="AI Task Generator"
                size="xl"
            >
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {/* Intern Info */}
                    {internId && internName && (
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                            <p className="text-sm text-purple-300">
                                Generating tasks for: <span className="font-semibold">{internName}</span>
                            </p>
                        </div>
                    )}

                    {!internId && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                            <p className="text-sm text-yellow-300">
                                Please select an intern from the dashboard to generate AI tasks.
                            </p>
                        </div>
                    )}

                    {/* Project Requirements Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Project Requirements (Optional)
                        </label>
                        <textarea
                            value={projectRequirements}
                            onChange={(e) => setProjectRequirements(e.target.value)}
                            placeholder="Describe the project or specific requirements for the task..."
                            className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 h-20 resize-none"
                        />
                    </div>

                    {/* Target Role Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Target Role (Optional)
                        </label>
                        <input
                            type="text"
                            value={targetRole}
                            onChange={(e) => setTargetRole(e.target.value)}
                            placeholder="e.g., Frontend Developer, ML Engineer..."
                            className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                        />
                    </div>

                    {/* Error Message */}
                    {aiError && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            <p className="text-sm text-red-300">{aiError}</p>
                        </div>
                    )}

                    {/* Generate Button */}
                    <Button
                        onClick={generateAITasks}
                        disabled={generatingTasks || !internId}
                        icon={generatingTasks ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                        gradient="purple"
                        fullWidth
                    >
                        {generatingTasks ? 'Generating Tasks...' : 'Generate AI Task Suggestions'}
                    </Button>

                    {/* AI Summary */}
                    {aiSummary && (
                        <div className="bg-slate-800/50 border border-white/10 rounded-lg p-3">
                            <p className="text-sm text-slate-300">{aiSummary}</p>
                        </div>
                    )}

                    {/* AI Task Suggestions */}
                    {aiTasks.length > 0 && !selectedAITask && (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Sparkles size={14} className="text-purple-400" />
                                Suggested Tasks (Click to Review)
                            </h4>
                            {aiTasks.map((task, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-4 cursor-pointer transition-all hover:border-purple-500/50 hover:bg-purple-500/5 group text-left"
                                    onClick={() => openTaskDetails(task)}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                            <h5 className="font-semibold text-white group-hover:text-purple-300 transition-colors">{task.title}</h5>
                                            <p className="text-sm text-slate-400 mt-1 line-clamp-2">{task.description}</p>
                                        </div>
                                        <Badge variant={task.priority === 'HIGH' ? 'warning' : task.priority === 'CRITICAL' ? 'danger' : task.priority === 'LOW' ? 'default' : 'info'}>
                                            {task.priority}
                                        </Badge>
                                    </div>
                                    
                                    {/* Task Meta Info */}
                                    <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-white/10">
                                        <div className="flex items-center gap-1 text-xs text-slate-400">
                                            <Clock size={12} className="text-blue-400" />
                                            <span>{task.estimated_hours}h estimated</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-slate-400">
                                            <Award size={12} className="text-green-400" />
                                            <span>Due: {task.due_date}</span>
                                        </div>
                                        {task.skills_required && task.skills_required.length > 0 && (
                                            <div className="flex items-center gap-1 text-xs text-slate-400">
                                                <Code size={12} className="text-purple-400" />
                                                <span>{task.skills_required.slice(0, 3).join(', ')}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Rationale Preview */}
                                    {task.rationale && (
                                        <div className="mt-3 p-2 bg-purple-500/10 rounded-lg">
                                            <p className="text-xs text-purple-300 line-clamp-2">
                                                <Sparkles size={10} className="inline mr-1" />
                                                {task.rationale}
                                            </p>
                                        </div>
                                    )}

                                    {/* Click to review hint */}
                                    <div className="mt-3 flex items-center justify-center gap-1 text-xs text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span>Click to review and assign</span>
                                        <ChevronDown size={12} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Task Details & Assignment */}
                    {selectedAITask && editingTask && (
                        <div className="bg-slate-800/50 border border-purple-500/30 rounded-lg p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-white flex items-center gap-2">
                                    <Sparkles size={16} className="text-purple-400" />
                                    Task Details - Review & Assign
                                </h4>
                                <Badge variant={editingTask.priority === 'HIGH' ? 'warning' : editingTask.priority === 'CRITICAL' ? 'danger' : editingTask.priority === 'LOW' ? 'default' : 'info'}>
                                    {editingTask.priority} Priority
                                </Badge>
                            </div>

                            {/* Task Title */}
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Task Title</label>
                                <input
                                    type="text"
                                    value={editingTask.title}
                                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                                    className="w-full bg-slate-800 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 font-medium"
                                    placeholder="Enter task title..."
                                />
                            </div>

                            {/* Task Description */}
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Task Description</label>
                                <textarea
                                    value={editingTask.description}
                                    onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                                    className="w-full bg-slate-800 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 h-32 resize-none"
                                    placeholder="Describe the task in detail..."
                                />
                            </div>

                            {/* Skills Required */}
                            {editingTask.skills_required && editingTask.skills_required.length > 0 && (
                                <div>
                                    <label className="block text-xs text-slate-400 mb-2">Skills Required</label>
                                    <div className="flex flex-wrap gap-2">
                                        {editingTask.skills_required.map((skill, idx) => (
                                            <span key={idx} className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Task Timeline */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Due Date</label>
                                    <input
                                        type="date"
                                        value={editingTask.due_date}
                                        onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                                        className="w-full bg-slate-800 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Estimated Hours</label>
                                    <input
                                        type="number"
                                        value={editingTask.estimated_hours}
                                        onChange={(e) => setEditingTask({ ...editingTask, estimated_hours: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-slate-800 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                        min="1"
                                        max="40"
                                    />
                                </div>
                            </div>

                            {/* Priority Selection */}
                            <div>
                                <label className="block text-xs text-slate-400 mb-2">Priority Level</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setEditingTask({ ...editingTask, priority: p })}
                                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                                                editingTask.priority === p
                                                    ? p === 'CRITICAL' ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                                                    : p === 'HIGH' ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50'
                                                    : p === 'MEDIUM' ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                                                    : 'bg-slate-500/30 text-slate-300 border border-slate-500/50'
                                                    : 'bg-slate-800 text-slate-500 border border-white/10 hover:bg-slate-700'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* AI Rationale - More Prominent */}
                            {selectedAITask.rationale && (
                                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles size={14} className="text-purple-400" />
                                        <span className="text-sm font-semibold text-purple-300">AI Recommendation Reason</span>
                                    </div>
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        {selectedAITask.rationale}
                                    </p>
                                </div>
                            )}

                            {/* Task Summary Card */}
                            <div className="bg-slate-900/50 border border-white/10 rounded-lg p-3">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-lg font-bold text-white">{editingTask.estimated_hours}h</p>
                                        <p className="text-xs text-slate-500">Duration</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-white">{editingTask.due_date || 'Not set'}</p>
                                        <p className="text-xs text-slate-500">Due Date</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-white">{editingTask.skills_required?.length || 0}</p>
                                        <p className="text-xs text-slate-500">Skills</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="secondary"
                                    fullWidth
                                    onClick={() => {
                                        setSelectedAITask(null);
                                        setEditingTask(null);
                                    }}
                                >
                                    Back to Suggestions
                                </Button>
                                <Button
                                    fullWidth
                                    onClick={() => assignAITask(editingTask)}
                                    disabled={assigningTask}
                                    icon={assigningTask ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                    gradient="purple"
                                >
                                    {assigningTask ? 'Assigning...' : 'Confirm & Assign'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default TasksTab;

