import React from 'react';
import { X, Calendar, Clock, Award, User, Layers, Star, CheckCircle, PlayCircle, FileText } from 'lucide-react';

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
    mentor_feedback?: string;
    project?: {
        id: number;
        name: string;
    } | null;
    module?: {
        id: number;
        name: string;
    } | null;
    created_by?: {
        full_name: string;
    };
}

interface TaskDetailDrawerProps {
    task: Task;
    onClose: () => void;
    role: 'intern' | 'manager';
}

const STATUS_STEPS = [
    { status: 'ASSIGNED', label: 'Assigned', icon: User },
    { status: 'IN_PROGRESS', label: 'In Progress', icon: PlayCircle },
    { status: 'SUBMITTED', label: 'Submitted', icon: FileText },
    { status: 'COMPLETED', label: 'Completed', icon: CheckCircle },
];

const STATUS_COLORS: Record<string, string> = {
    ASSIGNED: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    IN_PROGRESS: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    SUBMITTED: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    BLOCKED: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const PRIORITY_COLORS: Record<string, string> = {
    CRITICAL: 'bg-red-500',
    HIGH: 'bg-orange-400',
    MEDIUM: 'bg-yellow-400',
    LOW: 'bg-blue-400',
};

const formatDate = (dateString: string) => {
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch {
        return dateString;
    }
};

const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({ task, onClose, role }) => {
    const currentStepIndex = STATUS_STEPS.findIndex(s => s.status === task.status);

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={onClose}
            />
            
            {/* Drawer */}
            <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-[var(--bg-color)] border-l border-[var(--border-color)] z-50 shadow-2xl animate-slide-in overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-[var(--bg-color)] border-b border-[var(--border-color)] p-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-[var(--text-muted)]">{task.task_id}</span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[task.status] || 'bg-gray-500/10 text-gray-400 border-gray-500/30'}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {STATUS_STEPS.find(s => s.status === task.status)?.label || task.status}
                        </span>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-muted)] rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Title */}
                    <div>
                        <h2 className="text-xl font-bold text-[var(--text-main)] capitalize">{task.title}</h2>
                        {task.description && (
                            <p className="mt-2 text-sm text-[var(--text-dim)]">{task.description}</p>
                        )}
                    </div>

                    {/* Status Timeline */}
                    <div className="p-4 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl">
                        <h3 className="text-sm font-semibold text-[var(--text-main)] mb-4">Progress</h3>
                        <div className="flex items-center justify-between">
                            {STATUS_STEPS.map((step, index) => {
                                const isCompleted = index <= currentStepIndex;
                                const isCurrent = index === currentStepIndex;
                                return (
                                    <div key={step.status} className="flex flex-col items-center relative">
                                        {index > 0 && (
                                            <div className={`absolute top-3 -left-1/2 w-full h-0.5 ${isCompleted ? 'bg-purple-500' : 'bg-[var(--border-color)]'}`} />
                                        )}
                                        <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                            isCompleted 
                                                ? 'bg-purple-500 text-white' 
                                                : 'bg-[var(--bg-muted)] text-[var(--text-muted)]'
                                        }`}>
                                            {isCompleted ? <CheckCircle size={14} /> : <step.icon size={14} />}
                                        </div>
                                        <span className={`text-xs mt-1 ${isCurrent ? 'text-purple-400 font-medium' : 'text-[var(--text-muted)]'}`}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl">
                            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
                                <Calendar size={14} />
                                <span className="text-xs">Due Date</span>
                            </div>
                            <p className="text-sm font-medium text-[var(--text-main)]">{formatDate(task.due_date)}</p>
                        </div>
                        <div className="p-4 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl">
                            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
                                <Clock size={14} />
                                <span className="text-xs">Estimated</span>
                            </div>
                            <p className="text-sm font-medium text-[var(--text-main)]">{task.estimated_hours || 0}h</p>
                        </div>
                    </div>

                    {/* Project & Module */}
                    {(task.project || task.module) && (
                        <div className="flex items-center gap-3">
                            {task.project && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                                    <Layers size={14} className="text-purple-400" />
                                    <span className="text-xs text-purple-400">{task.project.name}</span>
                                </div>
                            )}
                            {task.module && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                    <Layers size={14} className="text-blue-400" />
                                    <span className="text-xs text-blue-400">{task.module.name}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Priority */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--text-muted)]">Priority:</span>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                            PRIORITY_COLORS[task.priority] ? '' : 'bg-gray-500/10 text-gray-400'
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority] || 'bg-gray-400'}`} />
                            {task.priority}
                        </span>
                    </div>

                    {/* Assigned By */}
                    {task.created_by?.full_name && (
                        <div className="flex items-center gap-2">
                            <User size={14} className="text-[var(--text-muted)]" />
                            <span className="text-sm text-[var(--text-dim)]">Assigned by</span>
                            <span className="text-sm font-medium text-[var(--text-main)]">{task.created_by.full_name}</span>
                        </div>
                    )}

                    {/* Quality Rating (if evaluated) */}
                    {task.quality_rating && (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Award size={16} className="text-amber-400" />
                                    <span className="text-sm font-medium text-amber-400">Quality Rating</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {[1,2,3,4,5].map(s => (
                                        <Star 
                                            key={s} 
                                            size={16} 
                                            className={s <= task.quality_rating! ? 'text-amber-400 fill-amber-400' : 'text-[var(--text-muted)]'} 
                                        />
                                    ))}
                                    <span className="ml-1 text-sm font-bold text-amber-400">{task.quality_rating.toFixed(1)}/5</span>
                                </div>
                            </div>
                            {task.code_review_score !== null && (
                                <div className="text-xs text-amber-300 mt-1">
                                    Code Review Score: {task.code_review_score}%
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mentor Feedback (if exists) */}
                    {task.mentor_feedback && role === 'intern' && (
                        <div className="p-4 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl">
                            <h3 className="text-sm font-semibold text-[var(--text-main)] mb-2">Mentor Feedback</h3>
                            <p className="text-sm text-[var(--text-dim)]">{task.mentor_feedback}</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default TaskDetailDrawer;
