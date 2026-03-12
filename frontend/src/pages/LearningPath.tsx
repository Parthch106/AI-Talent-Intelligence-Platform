import React, { useState, useEffect, useCallback } from 'react';
import {
    BookOpen, Brain, ChevronRight, CheckCircle2, Circle,
    Clock, TrendingUp, Zap, Target, AlertCircle, RefreshCw,
    Star, Activity, Layers, Play, Award, BarChart3, Cpu, X,
    ChevronDown, ChevronUp, ClipboardList
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
    id: number;
    task_id: string;
    title: string;
    description: string;
    status: 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED';
    priority: string;
    assigned_at: string;
    due_date: string;
    estimated_hours: number;
    actual_hours: number | null;
    quality_rating: number | null;
    code_review_score: number | null;
    project: { name: string } | null;
}

interface Milestone {
    position: number;
    skill: string;
    title: string;
    description: string;
    difficulty: number;
    estimated_hours: number;
    resources: Array<{ title: string; url: string; type: string }>;
    prerequisites: string[];
    current_mastery: number;
    mastery_target: number;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING';
}

interface PathProgress {
    path_id: number;
    intern_id: number;
    target_role: string;
    total_milestones: number;
    current_position: number;
    completion_percentage: number;
    completed_milestones: string[];
    next_milestone: Milestone | null;
    milestones: Milestone[];
    updated_at: string;
}

interface RLRecommendation {
    intern_id: number;
    action: string;
    recommended_difficulty: number;
    exploration_rate: number;
    q_values: number[];
    recommended_templates: Array<{ id: number; title: string; difficulty: number; estimated_hours: number; skills: string[]; learning_value: number }>;
    rationale: string;
    state_vector: number[];
}

interface OptimalDifficulty {
    intern_id: number;
    optimal_difficulty: number;
    difficulty_label: string;
    state_vector: number[];
    state_keys: string[];
}

// ─── Utilities ────────────────────────────────────────────────────────────────

const DIFFICULTY_COLORS = ['', '#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444'];
const DIFFICULTY_LABELS = ['', 'Beginner', 'Easy', 'Moderate', 'Advanced', 'Expert'];
const DIFFICULTY_BG = ['', 'bg-emerald-500/20 text-emerald-300', 'bg-lime-500/20 text-lime-300',
    'bg-amber-500/20 text-amber-300', 'bg-orange-500/20 text-orange-300', 'bg-red-500/20 text-red-300'];

const ACTION_INFO: Record<string, { label: string; color: string; icon: string }> = {
    EASY_TASK: { label: 'Easy Task', color: 'from-emerald-500 to-green-600', icon: '🌱' },
    MODERATE_TASK: { label: 'Moderate Task', color: 'from-amber-500 to-yellow-600', icon: '⚡' },
    HARD_TASK: { label: 'Hard Task', color: 'from-red-500 to-rose-600', icon: '🔥' },
    SKILL_GAP_TASK: { label: 'Skill Gap Task', color: 'from-violet-500 to-purple-600', icon: '🎯' },
    COLLABORATION_TASK: { label: 'Collaboration Task', color: 'from-blue-500 to-indigo-600', icon: '🤝' },
};

function MasteryBar({ mastery }: { mastery: number }) {
    const pct = Math.round(mastery * 100);
    const color = pct >= 80 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#6366f1';
    return (
        <div className="w-full">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Mastery</span>
                <span className="font-semibold" style={{ color }}>{pct}%</span>
            </div>
            <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                />
            </div>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MilestoneCard({ milestone, isActive, onClick }: { milestone: Milestone; isActive: boolean; onClick: () => void }) {
    const isCompleted = milestone.status === 'COMPLETED';
    const isInProgress = milestone.status === 'IN_PROGRESS';

    return (
        <div 
            onClick={onClick}
            className={`relative flex gap-4 group transition-all duration-300 cursor-pointer ${isActive ? 'scale-[1.01]' : 'hover:translate-x-1'}`}
        >
            {/* Timeline line */}
            <div className="flex flex-col items-center">
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 flex-shrink-0
                    ${isCompleted
                        ? 'bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-500/20 group-hover:bg-emerald-500/30'
                        : isActive
                            ? 'bg-violet-500/20 border-violet-500 shadow-lg shadow-violet-500/30 animate-pulse group-hover:bg-violet-500/30'
                            : 'bg-slate-800/60 border-slate-600/50 group-hover:bg-slate-700/60 group-hover:border-slate-500/50'
                    }`}
                >
                    {isCompleted
                        ? <CheckCircle2 size={18} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                        : isInProgress
                            ? <Play size={16} className="text-violet-400 group-hover:scale-110 transition-transform" />
                            : <Circle size={18} className="text-slate-500 group-hover:text-slate-400 transition-colors" />
                    }
                </div>
                <div className={`w-0.5 flex-1 mt-1 rounded-full transition-colors ${isCompleted ? 'bg-emerald-500/40 group-hover:bg-emerald-500/60' : 'bg-slate-700/40 group-hover:bg-slate-600/50'}`} style={{ minHeight: 24 }} />
            </div>

            {/* Card */}
            <div className={`flex-1 pb-5 rounded-2xl p-4 border transition-all duration-300
                ${isCompleted
                    ? 'bg-emerald-500/5 border-emerald-500/20 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10'
                    : isActive
                        ? 'bg-violet-500/10 border-violet-500/30 shadow-lg shadow-violet-500/10 group-hover:border-violet-500/50 group-hover:shadow-violet-500/20'
                        : 'bg-slate-800/40 border-slate-700/40 group-hover:bg-slate-800/60 group-hover:border-slate-600/50'
                }
            `}>
                <div className="flex items-start justify-between mb-2 gap-3">
                    <div>
                        <h3 className="font-semibold text-slate-100 text-sm group-hover:text-white transition-colors">{milestone.title}</h3>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{milestone.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_BG[milestone.difficulty] || DIFFICULTY_BG[3]}`}>
                            {DIFFICULTY_LABELS[milestone.difficulty] || 'Moderate'}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                            <Clock size={11} /> {milestone.estimated_hours}h
                        </span>
                    </div>
                </div>

                <MasteryBar mastery={milestone.current_mastery} />

                {/* Prerequisites */}
                {milestone.prerequisites.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {milestone.prerequisites.map(p => (
                            <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 group-hover:bg-slate-700/70">
                                req: {p}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
    const isCompleted = task.status === 'COMPLETED' || task.status === 'SUBMITTED';
    const isOverdue = !isCompleted && new Date(task.due_date) < new Date();
    const isAssigned = task.status === 'ASSIGNED';

    return (
        <div 
            onClick={onClick}
            className="relative flex gap-4 group transition-all duration-300 cursor-pointer hover:translate-x-1"
        >
            {/* Timeline line */}
            <div className="flex flex-col items-center">
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 flex-shrink-0
                    ${isCompleted
                        ? 'bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-500/20 group-hover:bg-emerald-500/30'
                        : isOverdue
                            ? 'bg-red-500/20 border-red-500 shadow-lg shadow-red-500/30 group-hover:bg-red-500/30'
                            : isAssigned
                                ? 'bg-indigo-500/20 border-indigo-500 shadow-lg shadow-indigo-500/30 group-hover:bg-indigo-500/30'
                                : 'bg-slate-800/60 border-slate-600/50 group-hover:bg-slate-700/60 group-hover:border-slate-500/50'
                    }`}
                >
                    {isCompleted
                        ? <CheckCircle2 size={18} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                        : isOverdue
                            ? <AlertCircle size={18} className="text-red-400 group-hover:scale-110 transition-transform animate-pulse" />
                            : <Play size={16} className={`${isAssigned ? 'text-indigo-400' : 'text-slate-500'} group-hover:scale-110 transition-transform`} />
                    }
                </div>
                <div className={`w-0.5 flex-1 mt-1 rounded-full transition-colors ${isCompleted ? 'bg-emerald-500/40 group-hover:bg-emerald-500/60' : 'bg-slate-700/40 group-hover:bg-slate-600/50'}`} style={{ minHeight: 24 }} />
            </div>

            {/* Card */}
            <div className={`flex-1 pb-5 rounded-2xl p-4 border transition-all duration-300
                ${isCompleted
                    ? 'bg-emerald-500/5 border-emerald-500/20 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10'
                    : isOverdue
                        ? 'bg-red-500/5 border-red-500/30 shadow-lg shadow-red-500/10 group-hover:border-red-500/50'
                        : 'bg-slate-800/40 border-slate-700/40 group-hover:bg-slate-800/60 group-hover:border-slate-600/50'
                }
            `}>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="font-semibold text-slate-100 text-sm group-hover:text-white transition-colors">{task.title}</h3>
                        {task.project && <p className="text-xs text-indigo-400 mt-0.5 font-medium">{task.project.name}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                            ${task.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 
                              task.status === 'SUBMITTED' ? 'bg-blue-500/20 text-blue-400' : 
                              task.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-400' : 
                              'bg-indigo-500/20 text-indigo-400'}`}>
                            {task.status.replace('_', ' ')}
                        </span>
                        <span className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-red-400' : 'text-slate-400'}`}>
                            <Clock size={11} /> Due: {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span title="Estimated Hours" className="flex items-center gap-1"><Target size={12} /> {task.estimated_hours}h</span>
                        {task.actual_hours && <span title="Actual Hours" className="flex items-center gap-1"><Activity size={12} /> {task.actual_hours}h logged</span>}
                    </div>
                    
                    {task.quality_rating && (
                        <div className="flex items-center gap-1">
                            <Star size={12} className={task.quality_rating >= 4 ? 'text-yellow-400 fill-yellow-400/20' : 'text-slate-500'} />
                            <span className="text-xs font-bold text-slate-300">{task.quality_rating}/5</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function RLRecommendationCard({ recommendation, loading, onRefresh }: {
    recommendation: RLRecommendation | null; loading: boolean; onRefresh: () => void;
}) {
    const info = recommendation ? ACTION_INFO[recommendation.action] || ACTION_INFO['MODERATE_TASK'] : null;

    return (
        <div className="relative rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/40 p-5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5" />
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <Cpu size={16} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-100 text-sm">RL Task Recommendation</h3>
                            <p className="text-xs text-slate-400">Q-Learning Agent</p>
                        </div>
                    </div>
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="w-8 h-8 rounded-lg bg-slate-700/60 border border-slate-600/40 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-600/60 transition-all"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-3 bg-slate-700/60 rounded-full animate-pulse" style={{ width: `${60 + i * 10}%` }} />
                        ))}
                    </div>
                ) : recommendation ? (
                    <div>
                        {/* Big action badge */}
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r ${info?.color} text-white text-sm font-semibold mb-3 shadow-lg`}>
                            <span className="text-lg">{info?.icon}</span>
                            {info?.label}
                        </div>

                        {/* Difficulty */}
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map(d => (
                                    <div key={d} className={`w-3 h-3 rounded-sm transition-all ${d <= recommendation.recommended_difficulty ? 'opacity-100' : 'opacity-20'}`}
                                        style={{ backgroundColor: DIFFICULTY_COLORS[recommendation.recommended_difficulty] }} />
                                ))}
                            </div>
                            <span className="text-xs text-slate-300">Difficulty {recommendation.recommended_difficulty}/5</span>
                            <span className="text-xs text-slate-500">ε={recommendation.exploration_rate.toFixed(2)}</span>
                        </div>

                        {/* Rationale */}
                        <p className="text-xs text-slate-400 leading-relaxed mb-3 p-2.5 bg-slate-700/30 rounded-xl">
                            {recommendation.rationale}
                        </p>

                        {/* Templates */}
                        {recommendation.recommended_templates.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Matching Templates</p>
                                {recommendation.recommended_templates.map(t => (
                                    <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-700/30 border border-slate-600/30">
                                        <div>
                                            <p className="text-xs font-medium text-slate-200">{t.title}</p>
                                            <p className="text-xs text-slate-500">{t.estimated_hours}h · Value: {(t.learning_value * 100).toFixed(0)}%</p>
                                        </div>
                                        <Star size={14} className="text-amber-400" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Q-Values visualization */}
                        <div className="mt-3">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Q-Values</p>
                            <div className="flex items-end gap-1 h-8">
                                {recommendation.q_values.map((q, i) => {
                                    const maxQ = Math.max(...recommendation.q_values);
                                    const normH = maxQ > 0 ? (q / maxQ) * 100 : 20;
                                    const labels = ['E', 'M', 'H', 'G', 'C'];
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                            <div className="w-full rounded-t-sm transition-all duration-700"
                                                style={{ height: `${normH}%`, backgroundColor: i === recommendation.q_values.indexOf(maxQ) ? '#8b5cf6' : '#374151' }} />
                                            <span className="text-slate-600" style={{ fontSize: 9 }}>{labels[i]}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <Brain size={32} className="mx-auto text-slate-600 mb-2" />
                        <p className="text-sm text-slate-400">Click refresh to get an AI recommendation</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const LearningPath: React.FC = () => {
    const { user } = useAuth();
    const [path, setPath] = useState<PathProgress | null>(null);
    const [recommendation, setRecommendation] = useState<RLRecommendation | null>(null);
    const [optimalDiff, setOptimalDiff] = useState<OptimalDifficulty | null>(null);
    const [interns, setInterns] = useState<any[]>([]);
    const [loadingPath, setLoadingPath] = useState(false);
    const [loadingRec, setLoadingRec] = useState(false);
    const [loadingGenerate, setLoadingGenerate] = useState(false);
    const [activeStatModal, setActiveStatModal] = useState<string | null>(null);
    const [activeMilestoneModal, setActiveMilestoneModal] = useState<Milestone | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [activeTaskModal, setActiveTaskModal] = useState<Task | null>(null);
    const [showSkillsMap, setShowSkillsMap] = useState(false);
    const [targetRole, setTargetRole] = useState('');
    const [jobRoles, setJobRoles] = useState<{id: number; role_title: string; role_description: string}[]>([]);
    const [activeInternId, setActiveInternId] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN';
    const effectiveInternId = activeInternId || (user?.role === 'INTERN' ? user.id : null);

    // Fetch Job Roles for dropdown
    useEffect(() => {
        const fetchJobRoles = async () => {
            try {
                const res = await api.get('/analytics/job-roles/');
                if (res.data?.job_roles) {
                    setJobRoles(res.data.job_roles);
                }
            } catch (err) {
                console.error('Failed to fetch job roles', err);
            }
        };
        fetchJobRoles();
    }, []);

    // Fetch Interns for the Dropdown
    useEffect(() => {
        if (!isManagerOrAdmin) return;
        const fetchInterns = async () => {
            try {
                if (user?.role === 'MANAGER') {
                    const res = await api.get('/interns/department-interns/');
                    setInterns(res.data);
                } else {
                    const res = await api.get('/interns/profiles/');
                    setInterns(res.data.map((p: any) => p.user));
                }
            } catch (err) {
                console.error("Failed to fetch interns", err);
            }
        };
        fetchInterns();
    }, [isManagerOrAdmin, user?.role]);

    const loadPath = useCallback(async (internId: number) => {
        setLoadingPath(true);
        setError('');
        try {
            const res = await api.get(`/analytics/learning-path/${internId}/progress/`);
            setPath(res.data);
        } catch (err: any) {
            if (err.response && err.response.status === 404) {
                setPath(null);
            } else {
                setError(err.response?.data?.error || 'Failed to load path');
            }
        } finally {
            setLoadingPath(false);
        }
    }, []);

    const loadOptimalDiff = useCallback(async (internId: number) => {
        try {
            const res = await api.get(`/analytics/rl/optimal-difficulty/${internId}/`);
            setOptimalDiff(res.data);
        } catch (_) {}
    }, []);

    const fetchRecommendation = useCallback(async (internId: number) => {
        if (!isManagerOrAdmin) return;
        setLoadingRec(true);
        try {
            const res = await api.post('/analytics/rl/assign-task/', { intern_id: internId });
            setRecommendation(res.data);
        } catch (_) {} finally {
            setLoadingRec(false);
        }
    }, [isManagerOrAdmin]);

    const loadTasks = useCallback(async (internId: number) => {
        setLoadingTasks(true);
        try {
            const res = await api.get(`/analytics/tasks/?intern_id=${internId}`);
            setTasks(res.data.tasks || []);
        } catch (_) {
            setTasks([]);
        } finally {
            setLoadingTasks(false);
        }
    }, []);

    const generatePath = async () => {
        if (!effectiveInternId) { setError('Select an intern first'); return; }
        if (!targetRole.trim()) { 
            setError(jobRoles.length > 0 ? 'Select a target role from the dropdown' : 'Enter a target role (e.g., BACKEND_DEVELOPER)'); 
            return; 
        }
        setLoadingGenerate(true);
        setError('');
        try {
            const res = await api.post(`/analytics/learning-path/${effectiveInternId}/`, { target_role: targetRole });
            if (res.status === 200 || res.status === 201) {
                setSuccessMsg('Learning path generated!');
                setTimeout(() => setSuccessMsg(''), 3000);
                loadPath(effectiveInternId);
                if (isManagerOrAdmin) fetchRecommendation(effectiveInternId);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to generate path');
        } finally {
            setLoadingGenerate(false);
        }
    };

    const handleInternSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = parseInt(e.target.value);
        if (!isNaN(id) && id > 0) {
            setActiveInternId(id);
        } else {
            setActiveInternId(null);
            setPath(null);
            setRecommendation(null);
            setOptimalDiff(null);
            setTasks([]);
        }
    };

    useEffect(() => {
        if (effectiveInternId) {
            loadPath(effectiveInternId);
            loadOptimalDiff(effectiveInternId);
            loadTasks(effectiveInternId);
            if (isManagerOrAdmin) fetchRecommendation(effectiveInternId);
        }
    }, [effectiveInternId, loadPath, loadOptimalDiff, loadTasks, fetchRecommendation, isManagerOrAdmin]);

    const tasksCompleted = tasks.filter(t => t.status === 'COMPLETED').length;
    const tasksSubmitted = tasks.filter(t => t.status === 'SUBMITTED').length;
    const tasksOverdue = tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'SUBMITTED' && new Date(t.due_date) < new Date()).length;
    const totalActualHours = tasks.reduce((s, t) => s + (t.actual_hours || 0), 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
            {/* Background orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/4 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/4 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                <ClipboardList size={20} className="text-white" />
                            </div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-violet-200 to-purple-300 bg-clip-text text-transparent">
                                AI Learning Path
                            </h1>
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30 animate-pulse">
                                RL-Powered Tasks
                            </span>
                        </div>
                        <p className="text-slate-400 text-sm">Task recommendation and progress tracking</p>
                    </div>

                    {/* Manager: intern dropdown */}
                    {isManagerOrAdmin && (
                        <div className="flex items-center gap-2">
                            <select
                                value={activeInternId || ''}
                                onChange={handleInternSelect}
                                className="w-56 px-3 py-2 bg-slate-800/60 border border-slate-600/40 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-violet-500/60"
                            >
                                <option value="">Select an Intern...</option>
                                {interns.map(i => (
                                    <option key={i.id} value={i.id}>{i.full_name || i.username} ({i.role})</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Error / Success */}
                {error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}
                {successMsg && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
                        <CheckCircle2 size={16} /> {successMsg}
                    </div>
                )}

                {/* Optional: Skills Graph Accordion */}
                <div className="rounded-2xl bg-slate-800/50 border border-slate-700/40 backdrop-blur-sm overflow-hidden transition-all duration-500">
                    <button 
                        onClick={() => setShowSkillsMap(!showSkillsMap)}
                        className="w-full p-4 flex items-center justify-between hover:bg-slate-800/60 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                <Activity size={16} className="text-indigo-400" />
                            </div>
                            <div className="text-left">
                                <h2 className="font-semibold text-slate-100 text-sm">Optional: Technical Skills Path</h2>
                                <p className="text-xs text-slate-400 hidden sm:block">Explore prerequisite knowledge graphs and learning resources</p>
                            </div>
                        </div>
                        {showSkillsMap ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                    </button>
                    
                    {showSkillsMap && (
                        <div className="p-5 border-t border-slate-700/40 bg-slate-900/30 space-y-6">
                            {/* Generate Path Form */}
                            <div className="rounded-2xl bg-slate-800/50 border border-slate-700/40 p-5 backdrop-blur-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <Target size={18} className="text-violet-400" />
                                    <h2 className="font-semibold text-slate-100">Generate Learning Path</h2>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    {jobRoles.length > 0 ? (
                                        <select
                                            value={targetRole}
                                            onChange={e => setTargetRole(e.target.value)}
                                            className="flex-1 px-4 py-2.5 bg-slate-900/60 border border-slate-600/40 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-violet-500/60 transition-colors"
                                        >
                                            <option value="">Select a job role...</option>
                                            {jobRoles.map(role => (
                                                <option key={role.id} value={role.role_title}>
                                                    {role.role_title}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            placeholder="Target Role (e.g., BACKEND_DEVELOPER, FRONTEND_DEVELOPER)"
                                            value={targetRole}
                                            onChange={e => setTargetRole(e.target.value)}
                                            className="flex-1 px-4 py-2.5 bg-slate-900/60 border border-slate-600/40 rounded-xl text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition-colors"
                                        />
                                    )}
                                    <button
                                        onClick={generatePath}
                                        disabled={loadingGenerate}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white text-sm font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-violet-500/20 disabled:opacity-60"
                                    >
                                        {loadingGenerate
                                            ? <RefreshCw size={15} className="animate-spin" />
                                            : <Brain size={15} />
                                        }
                                        {loadingGenerate ? 'Generating…' : 'Generate Path'}
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                    Uses A* graph search over skill prerequisites to build the optimal learning sequence.
                                </p>
                            </div>

                            {/* Skills Stepper Inline View */}
                            {path && path.milestones.length > 0 && (
                                <div className="p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-slate-200 text-sm">Path to {path.target_role}</h3>
                                        <span className="text-xs text-slate-400">{path.completion_percentage.toFixed(0)}% Complete</span>
                                    </div>
                                    <div className="space-y-1">
                                        {path.milestones.map((m, idx) => (
                                            <MilestoneCard
                                                key={m.position}
                                                milestone={m}
                                                isActive={idx === path.current_position}
                                                onClick={() => setActiveMilestoneModal(m)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Tasks', value: tasks.length, icon: <Layers size={18} />, color: 'from-blue-500 to-indigo-600' },
                        { label: 'Done / Submitted', value: `${tasksCompleted + tasksSubmitted}`, icon: <CheckCircle2 size={18} />, color: 'from-emerald-500 to-green-600' },
                        { label: 'Overdue', value: tasksOverdue, icon: <AlertCircle size={18} />, color: tasksOverdue > 0 ? 'from-red-500 to-rose-600' : 'from-slate-600 to-slate-700' },
                        { label: 'Hours Logged', value: `${totalActualHours.toFixed(1)}h`, icon: <Clock size={18} />, color: 'from-amber-500 to-orange-600' },
                    ].map(s => (
                        <div
                            key={s.label}
                            className="rounded-2xl bg-slate-800/50 border border-slate-700/40 p-4 flex items-center gap-3"
                        >
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform`}>
                                    {s.icon}
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-slate-100 group-hover:text-violet-200 transition-colors">{s.value}</p>
                                    <p className="text-xs text-slate-400">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Task Flow Timeline */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <ClipboardList size={18} className="text-violet-400" />
                                <h2 className="font-semibold text-slate-100">Task Flow Timeline</h2>
                            </div>
                            <span className="text-xs text-slate-400">
                                Assigned Work
                            </span>
                        </div>

                        {loadingTasks ? (
                            <div className="space-y-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="flex gap-4 animate-pulse">
                                        <div className="w-10 h-10 bg-slate-700/60 rounded-full flex-shrink-0" />
                                        <div className="flex-1 h-24 bg-slate-800/60 rounded-2xl" />
                                    </div>
                                ))}
                            </div>
                        ) : tasks.length > 0 ? (
                            <div className="space-y-1">
                                {tasks.sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()).map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onClick={() => setActiveTaskModal(task)}
                                    />
                                ))}
                                {/* Start node */}
                                <div className="flex items-center gap-4 pt-2">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                                        <Circle size={14} className="text-slate-500" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-500">
                                        Onboarding Completed
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-slate-800/30 border border-slate-700/30 border-dashed">
                                <Activity size={40} className="text-slate-600 mb-3" />
                                <p className="text-slate-400 font-medium text-sm mb-1">No tasks assigned yet</p>
                                <p className="text-slate-500 text-xs text-center max-w-xs">
                                    Interns will see their active project tasks flow here once assigned by a manager.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right Panel */}
                    <div className="space-y-5">

                        {/* Optimal Difficulty Card */}
                        {optimalDiff && (
                            <div className="rounded-2xl bg-slate-800/50 border border-slate-700/40 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <TrendingUp size={16} className="text-indigo-400" />
                                    <h3 className="font-semibold text-slate-100 text-sm">Optimal Task Difficulty</h3>
                                </div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="text-4xl font-black" style={{ color: DIFFICULTY_COLORS[optimalDiff.optimal_difficulty] }}>
                                        {optimalDiff.optimal_difficulty}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-100">{optimalDiff.difficulty_label}</p>
                                        <p className="text-xs text-slate-400">Greedy Policy (no exploration)</p>
                                    </div>
                                </div>
                                {/* State radar simple */}
                                <div className="space-y-1.5 mt-3">
                                    {optimalDiff.state_keys.map((key, i) => (
                                        <div key={key} className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500 w-32 truncate">{key.replace(/_/g, ' ')}</span>
                                            <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full bg-violet-500/60" style={{ width: `${Math.round(optimalDiff.state_vector[i] * 100)}%` }} />
                                            </div>
                                            <span className="text-xs text-slate-500 w-6 text-right">{Math.round(optimalDiff.state_vector[i] * 100)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* RL Recommendation */}
                        {isManagerOrAdmin && effectiveInternId && (
                            <RLRecommendationCard
                                recommendation={recommendation}
                                loading={loadingRec}
                                onRefresh={() => fetchRecommendation(effectiveInternId)}
                            />
                        )}

                        {/* Interns-only: next milestone quick view */}
                        {!isManagerOrAdmin && path?.next_milestone && (
                            <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/30 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Zap size={16} className="text-yellow-400" />
                                    <h3 className="font-semibold text-slate-100 text-sm">Next Step</h3>
                                </div>
                                <p className="text-sm font-medium text-violet-200 mb-1">{path.next_milestone.title}</p>
                                <p className="text-xs text-slate-400 mb-2">{path.next_milestone.description}</p>
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <Clock size={11} /> ~{path.next_milestone.estimated_hours}h
                                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_BG[path.next_milestone.difficulty] || DIFFICULTY_BG[3]}`}>
                                        {DIFFICULTY_LABELS[path.next_milestone.difficulty]}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Progress Ring */}
                        {path && (
                            <div className="rounded-2xl bg-slate-800/50 border border-slate-700/40 p-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <BarChart3 size={16} className="text-emerald-400" />
                                    <h3 className="font-semibold text-slate-100 text-sm">Overall Progress</h3>
                                </div>
                                <div className="flex items-center gap-4">
                                    {/* SVG ring */}
                                    <div className="relative w-20 h-20 flex-shrink-0">
                                        <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
                                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#8b5cf6" strokeWidth="3"
                                                strokeDasharray={`${path.completion_percentage} ${100 - path.completion_percentage}`}
                                                strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-sm font-bold text-violet-300">{path.completion_percentage.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-xs text-slate-300">{tasksCompleted} completed</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                                            <span className="text-xs text-slate-300">1 in progress</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-slate-600" />
                                            <span className="text-xs text-slate-300">{Math.max(0, tasks.length - tasksCompleted - 1)} remaining</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            {/* Analysis Modal */}
            {activeStatModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setActiveStatModal(null)} />
                    <div className="relative z-10 w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-800">
                            <h2 className="text-lg font-bold text-slate-100">
                                {activeStatModal} Analysis
                            </h2>
                            <button onClick={() => setActiveStatModal(null)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div className="p-6 overflow-y-auto">
                            {/* We keep the old Path breakdown for these modals if path exists, otherwise hide or show task stats */}
                            {activeStatModal === 'Completion' && path && (
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        The completion metric measures the aggregated average mastery across all {path.total_milestones} milestones in the `{path.target_role}` path.
                                    </p>
                                    <div className="bg-slate-800/50 rounded-xl p-4 border border-emerald-500/20">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-emerald-400 uppercase">Overall Progress</span>
                                            <span className="text-sm font-bold text-slate-100">{path.completion_percentage?.toFixed(1) || 0}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${path.completion_percentage || 0}%` }} />
                                        </div>
                                    </div>
                                    <h3 className="text-sm font-semibold text-slate-400 mt-6 mb-3">Mastery Breakdown</h3>
                                    <div className="space-y-3">
                                        {path.milestones?.map(m => (
                                            <div key={m.skill}>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-slate-300">{m.title}</span>
                                                    <span className={m.current_mastery >= m.mastery_target ? 'text-emerald-400' : 'text-slate-500'}>
                                                        {Math.round(m.current_mastery * 100)}% / {Math.round(m.mastery_target * 100)}%
                                                    </span>
                                                </div>
                                                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${m.current_mastery >= m.mastery_target ? 'bg-emerald-500' : 'bg-slate-600'}`} 
                                                        style={{ width: `${Math.min(100, Math.round((m.current_mastery/m.mastery_target)*100))}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeStatModal === 'Milestones Done' && path && (
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        You have fully mastered {path.milestones?.filter(m => m.status === 'COMPLETED').length || 0} out of {path.total_milestones} required skills for the {path.target_role} role. A milestone is considered "done" when its current mastery meets or exceeds the target mastery.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        <div className="bg-slate-800/50 border border-emerald-500/20 rounded-xl p-4 text-center">
                                            <p className="text-3xl font-black text-emerald-400">{path.milestones?.filter(m => m.status === 'COMPLETED').length || 0}</p>
                                            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Done</p>
                                        </div>
                                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                                            <p className="text-3xl font-black text-slate-300">{path.total_milestones - (path.milestones?.filter(m => m.status === 'COMPLETED').length || 0)}</p>
                                            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Remaining</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeStatModal === 'Total Hours' && path && (
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        This path requires approximately {path.milestones?.reduce((s, m) => s + m.estimated_hours, 0) || 0} estimated hours of deliberate practice and project work to complete all {path.total_milestones} milestones.
                                    </p>
                                    <h3 className="text-sm font-semibold text-slate-400 mt-6 mb-3">Time Distribution</h3>
                                    <div className="space-y-2">
                                        {path.milestones?.map(m => {
                                            const tH = path.milestones?.reduce((s, x) => s + x.estimated_hours, 0) || 1;
                                            const pct = (m.estimated_hours / tH) * 100;
                                            return (
                                                <div key={m.skill} className="bg-slate-800/30 p-3 rounded-lg flex items-center gap-3">
                                                    <div className="w-12 text-right flex-shrink-0">
                                                        <span className="text-sm font-bold text-indigo-400">{m.estimated_hours}h</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm text-slate-200">{m.title}</p>
                                                        <div className="w-full h-1 bg-slate-800 mt-2 rounded-full overflow-hidden">
                                                            <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }}/>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-slate-500 w-8">{pct.toFixed(0)}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {activeStatModal === 'Hours Left' && path && (
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        Based on your current progress, there are approximately {path.milestones?.filter(m => m.status !== 'COMPLETED').reduce((s, m) => s + m.estimated_hours, 0) || 0} hours of learning left to hit your target role.
                                    </p>
                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-2xl font-black text-amber-500">{path.milestones?.filter(m => m.status !== 'COMPLETED').reduce((s, m) => s + m.estimated_hours, 0) || 0}h</p>
                                            <p className="text-xs font-semibold text-amber-500/70 uppercase tracking-wider mt-1">Remaining Time</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-800">
                                        <p className="text-xs text-slate-400 italic">
                                            * Note: The AI agent recalculates these hours dynamically. If you demonstrate fast mastery or high quality scores in task completions, the remaining hours will compress.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Footer */}
                        <div className="p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-2xl">
                            <button
                                onClick={() => setActiveStatModal(null)}
                                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-colors"
                            >
                                Close Analysis
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Task Detailed Modal */}
            {activeTaskModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setActiveTaskModal(null)} />
                    <div className="relative z-10 w-full max-w-2xl bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="flex items-start justify-between p-6 border-b border-slate-800">
                            <div className="flex gap-4 items-center">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0
                                    ${activeTaskModal.status === 'COMPLETED' ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 
                                      activeTaskModal.status === 'SUBMITTED' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                                      activeTaskModal.status === 'IN_PROGRESS' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 
                                      'bg-slate-800 border border-slate-700'}`}>
                                    {activeTaskModal.status === 'COMPLETED' ? <CheckCircle2 size={24} className="text-white" /> :
                                     activeTaskModal.status === 'SUBMITTED' ? <CheckCircle2 size={24} className="text-white" /> :
                                     activeTaskModal.status === 'IN_PROGRESS' ? <Play size={24} className="text-white" /> :
                                     <Circle size={24} className="text-slate-400" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-xl font-bold text-slate-100">{activeTaskModal.title}</h2>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                                            ${activeTaskModal.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 
                                              activeTaskModal.status === 'SUBMITTED' ? 'bg-blue-500/20 text-blue-400' : 
                                              activeTaskModal.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-400' : 
                                              'bg-indigo-500/20 text-indigo-400'}`}>
                                            {activeTaskModal.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        {activeTaskModal.project && <span className="text-indigo-400 font-medium">{activeTaskModal.project.name}</span>}
                                        {activeTaskModal.project && <span>•</span>}
                                        <span className="flex items-center gap-1"><Target size={14} /> D: {new Date(activeTaskModal.due_date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setActiveTaskModal(null)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            
                            {/* Description */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-400 mb-2">Description</h3>
                                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{activeTaskModal.description}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-400 mb-2">Time Tracking</h3>
                                    <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">Estimated</span>
                                            <span className="font-semibold text-slate-200">{activeTaskModal.estimated_hours} hrs</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">Logged</span>
                                            <span className="font-semibold text-indigo-400">{activeTaskModal.actual_hours || 0} hrs</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-400 mb-2">Evaluation</h3>
                                    <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">Quality</span>
                                            <div className="flex items-center gap-1">
                                                {activeTaskModal.quality_rating ? (
                                                    <>
                                                        <span className="font-bold text-yellow-400">{activeTaskModal.quality_rating}/5</span>
                                                        <Star size={14} className="text-yellow-400 fill-yellow-400/20" />
                                                    </>
                                                ) : <span className="text-slate-500 italic">Not rated</span>}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">Code Score</span>
                                            <div className="flex items-center gap-1">
                                                {activeTaskModal.code_review_score ? (
                                                    <>
                                                        <span className="font-bold text-emerald-400">{activeTaskModal.code_review_score}%</span>
                                                        <Cpu size={14} className="text-emerald-400" />
                                                    </>
                                                ) : <span className="text-slate-500 italic">No score</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Milestone Detailed Modal */}
            {activeMilestoneModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setActiveMilestoneModal(null)} />
                    <div className="relative z-10 w-full max-w-2xl bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="flex items-start justify-between p-6 border-b border-slate-800">
                            <div className="flex gap-4 items-center">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg
                                    ${activeMilestoneModal.status === 'COMPLETED' ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 
                                      activeMilestoneModal.status === 'IN_PROGRESS' ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 
                                      'bg-slate-800 border border-slate-700'}`}>
                                    {activeMilestoneModal.status === 'COMPLETED' ? <CheckCircle2 size={24} className="text-white" /> :
                                     activeMilestoneModal.status === 'IN_PROGRESS' ? <Play size={24} className="text-white" /> :
                                     <Circle size={24} className="text-slate-400" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-xl font-bold text-slate-100">{activeMilestoneModal.title}</h2>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_BG[activeMilestoneModal.difficulty] || DIFFICULTY_BG[3]}`}>
                                            {DIFFICULTY_LABELS[activeMilestoneModal.difficulty]}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <span className="flex items-center gap-1"><Clock size={14} /> {activeMilestoneModal.estimated_hours} hours required</span>
                                        <span>•</span>
                                        <span className={`${activeMilestoneModal.status === 'COMPLETED' ? 'text-emerald-400' : activeMilestoneModal.status === 'IN_PROGRESS' ? 'text-violet-400 animate-pulse' : 'text-slate-500'}`}>
                                            {activeMilestoneModal.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setActiveMilestoneModal(null)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            
                            {/* Description */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-100 mb-2">Milestone Description</h3>
                                <p className="text-sm text-slate-300 leading-relaxed p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                                    {activeMilestoneModal.description}
                                </p>
                            </div>

                            {/* Mastery Target vs Current */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-100 mb-2">Mastery Objective</h3>
                                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-slate-300">Skill Target: <span className="font-bold text-slate-100">{activeMilestoneModal.skill}</span></span>
                                        <span className={activeMilestoneModal.current_mastery >= activeMilestoneModal.mastery_target ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}>
                                            {Math.round(activeMilestoneModal.current_mastery * 100)}% / {Math.round(activeMilestoneModal.mastery_target * 100)}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden relative">
                                        <div 
                                            className="absolute top-0 bottom-0 left-0 bg-slate-700" 
                                            style={{ width: `${Math.round(activeMilestoneModal.mastery_target * 100)}%` }}
                                        />
                                        <div 
                                            className={`absolute top-0 bottom-0 left-0 transition-all duration-1000 ${activeMilestoneModal.current_mastery >= activeMilestoneModal.mastery_target ? 'bg-emerald-500' : 'bg-violet-500'}`} 
                                            style={{ width: `${Math.min(100, Math.round(activeMilestoneModal.current_mastery * 100))}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                                        <Target size={12} /> Target mastery required to pass this milestone is {(activeMilestoneModal.mastery_target * 100).toFixed(0)}%.
                                    </p>
                                </div>
                            </div>

                            {/* Dependencies Graph / Prereqs */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-100 mb-2">Required Dependencies</h3>
                                {activeMilestoneModal.prerequisites.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                                        {activeMilestoneModal.prerequisites.map(p => {
                                            const prereqNode = path?.milestones.find(m => m.skill === p);
                                            const isDone = prereqNode?.status === 'COMPLETED';
                                            return (
                                                <div key={p} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isDone ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                                    {isDone ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                                    <span className="text-sm font-medium">{p}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-sm text-slate-400 italic bg-slate-800/20 rounded-xl p-4 border border-slate-800">
                                        <Target size={14} /> No prerequisites mapped for this skill.
                                    </div>
                                )}
                            </div>

                            {/* Learning Resources */}
                            {activeMilestoneModal.resources.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-100 mb-2">Recommended Learning Resources</h3>
                                    <div className="space-y-2">
                                        {activeMilestoneModal.resources.map((r, i) => (
                                            <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                                                className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-800/40 hover:bg-slate-700/60 border border-slate-700/50 hover:border-violet-500/40 transition-all text-left">
                                                <div>
                                                    <p className="text-sm font-medium text-violet-300 group-hover:text-violet-200 transition-colors flex items-center gap-2">
                                                        {r.type.toLowerCase() === 'video' ? <Play size={14} /> : <BookOpen size={14} />}
                                                        {r.title}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1 sm:mt-0 font-mono hidden sm:block truncate max-w-sm">{r.url}</p>
                                                </div>
                                                <div className="mt-2 sm:mt-0 self-start sm:self-auto">
                                                    <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                        {r.type}
                                                    </span>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LearningPath;
