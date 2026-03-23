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
    module: { name: string } | null;
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
            <div className="flex justify-between text-xs text-[var(--text-dim)] mb-1">
                <span>Mastery</span>
                <span className="font-semibold" style={{ color }}>{pct}%</span>
            </div>
            <div className="h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
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
                            : 'dark:bg-slate-800/60 dark:border-slate-600/50 dark:group-hover:bg-slate-700/60 dark:group-hover:border-slate-500/50 bg-slate-100/80 border-slate-200/50 group-hover:bg-slate-200/80 group-hover:border-slate-300/50'
                    }`}
                >
                    {isCompleted
                        ? <CheckCircle2 size={18} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                        : isInProgress
                            ? <Play size={16} className="text-violet-400 group-hover:scale-110 transition-transform" />
                            : <Circle size={18} className="dark:text-slate-500 text-slate-400 group-hover:dark:text-slate-400 group-hover:text-slate-500 transition-colors" />
                    }
                </div>
                <div className={`w-0.5 flex-1 mt-1 rounded-full transition-colors ${isCompleted ? 'bg-emerald-500/40 group-hover:bg-emerald-500/60' : 'dark:bg-slate-700/40 dark:group-hover:bg-slate-600/50 bg-slate-200/40 group-hover:bg-slate-300/50'}`} style={{ minHeight: 24 }} />
            </div>

            {/* Card */}
            <div className={`flex-1 pb-5 rounded-2xl p-4 border transition-all duration-300
                ${isCompleted
                    ? 'bg-emerald-500/5 border-emerald-500/20 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10'
                    : isActive
                        ? 'bg-violet-500/10 border-violet-500/30 shadow-lg shadow-violet-500/10 group-hover:border-violet-500/50 group-hover:shadow-violet-500/20'
                        : 'dark:bg-slate-800/40 dark:border-slate-700/40 dark:group-hover:bg-slate-800/60 dark:group-hover:border-slate-600/50 bg-white/60 border-slate-200/40 group-hover:bg-white/80 group-hover:border-slate-300/50'
                }
            `}>
                <div className="flex items-start justify-between mb-2 gap-3">
                    <div>
                        <h3 className="font-semibold text-[var(--text-main)] text-sm group-hover:text-[var(--text-main)] transition-colors">{milestone.title}</h3>
                        <p className="text-xs text-[var(--text-dim)] mt-0.5 line-clamp-1">{milestone.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_BG[milestone.difficulty] || DIFFICULTY_BG[3]}`}>
                            {DIFFICULTY_LABELS[milestone.difficulty] || 'Moderate'}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-[var(--text-dim)] group-hover:text-[var(--text-dim)] transition-colors">
                            <Clock size={11} /> {milestone.estimated_hours}h
                        </span>
                    </div>
                </div>

                <MasteryBar mastery={milestone.current_mastery} />

                {/* Prerequisites */}
                {milestone.prerequisites.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {milestone.prerequisites.map(p => (
                            <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-muted)] text-[var(--text-dim)] group-hover:bg-[var(--bg-muted)]">
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
    const isInProgress = task.status === 'IN_PROGRESS';

    return (
        <div 
            onClick={onClick}
            className="relative flex gap-6 group cursor-pointer"
        >
            {/* Timeline connectors */}
            <div className="flex flex-col items-center">
                <div className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 shadow-xl
                    ${isCompleted
                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-emerald-500/10 group-hover:bg-emerald-500/20'
                        : isOverdue
                            ? 'bg-red-500/10 border-red-500/50 shadow-red-500/10 group-hover:bg-red-500/20'
                            : isInProgress
                                ? 'bg-violet-500/10 border-violet-500/50 shadow-violet-500/10 group-hover:bg-violet-500/20 animate-pulse'
                                : 'dark:bg-slate-800/40 dark:border-slate-700/50 dark:group-hover:bg-slate-800/60 bg-white/60 border-slate-200/50 group-hover:bg-white/80'
                    }`}
                >
                    {isCompleted
                        ? <CheckCircle2 size={22} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                        : isOverdue
                            ? <AlertCircle size={22} className="text-red-400 group-hover:scale-110 transition-transform" />
                            : isInProgress
                                ? <Play size={20} className="text-violet-400 group-hover:scale-110 transition-transform" />
                                : <Circle size={20} className="dark:text-slate-500 text-slate-400 group-hover:dark:text-slate-400 group-hover:text-slate-500 transition-colors" />
                    }
                </div>
                <div className={`w-0.5 flex-1 rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500/30 group-hover:bg-emerald-500/50' : 'dark:bg-slate-700/30 dark:group-hover:bg-slate-600/50 bg-slate-200/30 group-hover:bg-slate-300/50'}`} />
            </div>

            {/* Content Card */}
            <div className={`flex-1 mb-8 rounded-3xl p-5 border backdrop-blur-sm transition-all duration-300 group-hover:translate-x-1
                ${isCompleted
                    ? 'bg-emerald-500/5 border-emerald-500/20 group-hover:border-emerald-500/40'
                    : isOverdue
                        ? 'bg-red-500/5 border-red-500/20 group-hover:border-red-500/40'
                        : isInProgress
                            ? 'bg-violet-500/5 border-violet-500/30 group-hover:border-violet-500/50 shadow-lg shadow-violet-500/5'
                            : 'dark:bg-slate-800/20 dark:border-slate-700/30 dark:group-hover:bg-slate-800/40 dark:group-hover:border-slate-600/50 bg-slate-50/50 border-slate-200/30 group-hover:bg-white/60 group-hover:border-slate-300/50'
                }
            `}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-[var(--text-main)] text-base group-hover:text-[var(--text-main)] transition-colors">{task.title}</h3>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider
                                ${task.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                  task.status === 'SUBMITTED' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                                  task.status === 'IN_PROGRESS' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 text-glow-amber' : 
                                  'dark:bg-slate-700/30 dark:text-slate-400 dark:border-slate-600/30 bg-slate-200/30 text-slate-600 border-slate-300/30 text-indigo-600'}`}>
                                {task.status.replace('_', ' ')}
                            </span>
                        </div>
                        {task.project && (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold text-indigo-400/80 bg-indigo-500/5 px-2 py-0.5 rounded-md border border-indigo-500/10 uppercase tracking-tight">
                                    Project: {task.project.name}
                                </span>
                                {task.module && (
                                    <span className="text-[10px] font-bold text-violet-400/80 bg-violet-500/5 px-2 py-0.5 rounded-md border border-violet-500/10 uppercase tracking-tight">
                                        Module: {task.module.name}
                                    </span>
                                )}
                            </div>
                        )}
                        <p className="text-xs text-[var(--text-dim)] line-clamp-2 mt-2 leading-relaxed italic">
                            {task.description.substring(0, 120)}...
                        </p>
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 flex-shrink-0">
                        <div className={`p-2 rounded-xl flex items-center gap-2 bg-[var(--bg-muted)] border border-[var(--border-color)]
                            ${isOverdue ? 'text-red-400 ring-1 ring-red-500/20' : 'text-[var(--text-dim)]'}`}>
                            <Clock size={14} />
                            <span className="text-xs font-bold whitespace-nowrap">
                                {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div title="Estimated Effort" className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase">
                                <Target size={12} className="dark:text-slate-600 text-slate-400" />
                                {task.estimated_hours}h
                            </div>
                            {task.quality_rating && (
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                                    <Star size={12} className="text-yellow-400 fill-yellow-400/20" />
                                    <span className="text-xs font-black text-yellow-500">{task.quality_rating}</span>
                                </div>
                            )}
                        </div>
                    </div>
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
        <div className="group relative rounded-3xl dark:bg-slate-900/40 dark:border-slate-800/60 bg-white/80 border border-slate-200/30 p-6 overflow-hidden backdrop-blur-xl transition-all duration-300 hover:border-violet-500/30 dark:hover:border-violet-500/30">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-full blur-3xl group-hover:scale-110 transition-transform" />
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                            <Brain size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-[var(--text-main)] text-sm">AI Recommendation</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Q-Agent Live</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="w-9 h-9 rounded-xl dark:bg-slate-800/80 dark:border-slate-700/50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700/80 bg-slate-200/80 border border-slate-300/50 text-slate-600 hover:text-slate-800 hover:bg-slate-300/80 transition-all active:scale-90"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {loading ? (
                    <div className="space-y-4 py-2">
                        <div className="h-10 bg-[var(--bg-muted)] rounded-xl animate-pulse w-3/4" />
                        <div className="space-y-2">
                            <div className="h-3 bg-[var(--bg-muted)] rounded-full animate-pulse" />
                            <div className="h-3 bg-[var(--bg-muted)] rounded-full animate-pulse w-5/6" />
                        </div>
                    </div>
                ) : recommendation ? (
                    <div className="space-y-5">
                        {/* Big action badge */}
                        <div className={`flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r ${info?.color} text-white shadow-xl`}>
                            <span className="text-2xl drop-shadow-md">{info?.icon}</span>
                            <span className="font-black text-sm uppercase tracking-tight">{info?.label}</span>
                        </div>

                        {/* Difficulty Level Display */}
                        <div className="p-4 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)]">
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Recommended Difficulty</p>
                            <div className="flex items-center gap-3">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(d => (
                                        <div key={d} className={`h-2 flex-1 rounded-full transition-all duration-500 ${d <= recommendation.recommended_difficulty ? 'bg-violet-500' : 'dark:bg-slate-700 bg-slate-300'}`} />
                                    ))}
                                </div>
                                <span className="text-sm font-bold text-[var(--text-main)]">{recommendation.recommended_difficulty}/5</span>
                            </div>
                            <p className="text-xs text-[var(--text-dim)] mt-2">
                                {recommendation.recommended_difficulty <= 2 ? 'Recommended for current skill level' : 
                                 recommendation.recommended_difficulty === 3 ? 'Moderate challenge recommended' : 
                                 'High difficulty - stretch goal'}
                            </p>
                        </div>

                        {/* Rationale */}
                        <div className="relative p-4 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)]">
                            <Star size={14} className="absolute -top-1.5 -left-1.5 text-yellow-500 fill-current" />
                            <p className="text-xs text-[var(--text-dim)] leading-relaxed font-medium capitalize">
                                {recommendation.rationale}
                            </p>
                        </div>

                        {/* Q-Values visualization */}
                        <div className="pt-2">
                            <div className="flex items-end gap-1.5 h-12 px-1">
                                {recommendation.q_values.map((q, i) => {
                                    const maxQ = Math.max(...recommendation.q_values);
                                    const normH = maxQ > 0 ? (q / maxQ) * 100 : 20;
                                    const labels = ['E', 'M', 'H', 'G', 'C'];
                                    const isActive = i === recommendation.q_values.indexOf(maxQ);
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                            <div className={`w-full rounded-t-md transition-all duration-1000 origin-bottom
                                                ${isActive ? 'bg-gradient-to-t from-violet-600 to-indigo-400 shadow-[0_-4px_12px_rgba(139,92,246,0.3)]' : 'dark:bg-slate-800 bg-slate-200'}`}
                                                style={{ height: `${Math.max(10, normH)}%` }} />
                                            <span className={`text-[9px] font-black tracking-tighter ${isActive ? 'text-violet-400' : 'dark:text-slate-600 text-slate-500'}`}>{labels[i]}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <div className="w-16 h-16 rounded-full dark:bg-slate-800/40 dark:border-dashed dark:border-slate-700 bg-slate-100/40 border border-dashed border-slate-300 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                            <Cpu size={32} className="dark:text-slate-600 text-slate-400" />
                        </div>
                        <p className="text-sm font-bold text-[var(--text-dim)]">AI Engine Ready</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">Tap refresh to synthesize next step</p>
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
    const [taskPage, setTaskPage] = useState(1);
    const TASKS_PER_PAGE = 10;
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
            const res = await api.post('/analytics/rl/top-tasks/', { intern_id: internId });
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
            setTaskPage(1);
        }
    };

    useEffect(() => {
        if (effectiveInternId) {
            loadPath(effectiveInternId);
            loadOptimalDiff(effectiveInternId);
            loadTasks(effectiveInternId);
            setTaskPage(1);
            if (isManagerOrAdmin) fetchRecommendation(effectiveInternId);
        }
    }, [effectiveInternId, loadPath, loadOptimalDiff, loadTasks, fetchRecommendation, isManagerOrAdmin]);

    const tasksCompleted = tasks.filter(t => t.status === 'COMPLETED').length;
    const tasksSubmitted = tasks.filter(t => t.status === 'SUBMITTED').length;
    const tasksOverdue = tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'SUBMITTED' && new Date(t.due_date) < new Date()).length;
    const totalActualHours = tasks.reduce((s, t) => s + (t.actual_hours || 0), 0);

    return (
        <div className="min-h-screen p-6">
            {/* Background orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/4 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/4 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto space-y-6">

                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 flex items-center justify-center shadow-xl shadow-violet-500/20 ring-1 ring-white/20">
                                <ClipboardList size={24} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-main)] sm:text-4xl">
                                    AI Learning <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">Path</span>
                                </h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-300 border border-violet-500/20 backdrop-blur-md">
                                        <Brain size={12} className="text-violet-400" />
                                        RL-Powered Insights
                                    </span>
                                    <p className="text-[var(--text-dim)] text-sm font-medium ml-1">Personalized growth trajectory</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Manager: intern dropdown */}
                    {isManagerOrAdmin && (
                        <div className="flex items-center gap-3 bg-[var(--bg-muted)] p-2 rounded-2xl border border-[var(--border-color)] backdrop-blur-xl">
                            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest ml-2">Selected Intern</label>
                            <select
                                value={activeInternId || ''}
                                onChange={handleInternSelect}
                                className="w-64 px-4 py-2 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 transition-all cursor-pointer appearance-none"
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

                {/* Skills Map Accordion */}
                <div className="group relative rounded-3xl bg-[var(--bg-muted)] border border-[var(--border-color)] backdrop-blur-2xl overflow-hidden transition-all duration-500 hover:border-violet-500/30">
                    <button 
                        onClick={() => setShowSkillsMap(!showSkillsMap)}
                        className="w-full p-6 flex items-center justify-between hover:bg-[var(--bg-muted)]/80 transition-all duration-300"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center border border-indigo-500/30 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/5">
                                <Activity size={20} className="text-indigo-400" />
                            </div>
                            <div className="text-left">
                                <h2 className="text-lg font-bold text-[var(--text-main)] leading-tight">Technical Knowledge Graph</h2>
                                <p className="text-sm text-[var(--text-dim)] mt-0.5 font-medium">Map your skills, prerequisites, and milestones</p>
                            </div>
                        </div>
                        <div className={`w-10 h-10 rounded-xl bg-[var(--bg-muted)] flex items-center justify-center text-[var(--text-dim)] transition-all duration-300 ${showSkillsMap ? 'rotate-180 bg-violet-500/20 text-violet-400' : 'group-hover:bg-[var(--bg-muted)]/80'}`}>
                            <ChevronDown size={22} />
                        </div>
                    </button>
                    
                    {showSkillsMap && (
                        <div className="p-6 pt-0 border-t border-[var(--border-color)] animate-slideDown">
                            <div className="space-y-8 mt-6">
                                {/* Generate Path Form */}
                                <div className="relative rounded-3xl bg-[var(--bg-muted)] border border-[var(--border-color)] p-6 backdrop-blur-md overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl" />
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                                <Target size={16} className="text-white" />
                                            </div>
                                            <h2 className="text-base font-bold text-[var(--text-main)]">Generate Custom Growth Path</h2>
                                        </div>
                                        <div className="flex flex-col md:flex-row gap-4">
                                            {jobRoles.length > 0 ? (
                                                <select
                                                    value={targetRole}
                                                    onChange={e => setTargetRole(e.target.value)}
                                                    className="flex-1 px-5 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl text-[var(--text-main)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 transition-all cursor-pointer appearance-none"
                                                >
                                                    <option value="">Select a specific job role focus...</option>
                                                    {jobRoles.map(role => (
                                                        <option key={role.id} value={role.role_title}>
                                                            {role.role_title}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    placeholder="Enter target role (e.g. Fullstack Engineer)"
                                                    value={targetRole}
                                                    onChange={e => setTargetRole(e.target.value)}
                                                    className="flex-1 px-5 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl text-[var(--text-main)] text-sm font-medium placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 transition-all"
                                                />
                                            )}
                                            <button
                                                onClick={generatePath}
                                                disabled={loadingGenerate}
                                                className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600 text-white text-sm font-black rounded-2xl transition-all duration-300 shadow-xl shadow-violet-500/20 disabled:opacity-50 active:scale-95"
                                            >
                                                {loadingGenerate
                                                    ? <RefreshCw size={18} className="animate-spin" />
                                                    : <Zap size={18} className="fill-current" />
                                                }
                                                {loadingGenerate ? 'Reconfiguring...' : 'Synthesize Path'}
                                            </button>
                                        </div>
                                        <div className="mt-4 flex items-center gap-2">
                                            <div className="px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-[10px] font-bold text-violet-400 uppercase tracking-widest">A* SEARCH ENABLED</div>
                                            <p className="text-[11px] text-[var(--text-muted)] font-medium">Optimal skill sequence calculation based on global prerequisite graphs.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Skills Stepper Inline View */}
                                {path && path.milestones.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-2">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-base font-bold text-[var(--text-main)]">Trajectory to {path.target_role}</h3>
                                                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400">
                                                    {path.completion_percentage.toFixed(0)}% Achieved
                                                </span>
                                            </div>
                                            <button className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors uppercase tracking-widest">View Detailed Graph</button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {path.milestones.map((m, idx) => (
                                                <div 
                                                    key={m.position} 
                                                    onClick={() => setActiveMilestoneModal(m)}
                                                    className={`group/milestone relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden
                                                        ${idx === path.current_position 
                                                            ? 'bg-violet-500/10 border-violet-500/40 ring-1 ring-violet-500/20' 
                                                            : m.status === 'COMPLETED'
                                                                ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
                                                                : 'bg-[var(--bg-muted)] border-[var(--border-color)] hover:bg-[var(--bg-muted)]/80 hover:border-violet-500/30'
                                                        }
                                                    `}
                                                >
                                                    <div className="flex items-start justify-between gap-3 mb-4">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors
                                                            ${m.status === 'COMPLETED' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'dark:bg-slate-700/50 dark:border-slate-600/50 dark:text-slate-400 bg-slate-200/50 border-slate-300/50 text-slate-600'}
                                                        `}>
                                                            {m.status === 'COMPLETED' ? <CheckCircle2 size={16} /> : <Circle size={14} />}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                                                            Lvl {m.difficulty}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-[var(--text-main)] text-sm group-hover/milestone:text-violet-600 dark:group-hover/milestone:text-violet-300 transition-colors line-clamp-1">{m.title}</h4>
                                                    <div className="mt-3">
                                                        <div className="flex justify-between text-[10px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-tighter">
                                                            <span>Mastery</span>
                                                            <span className={m.current_mastery >= 0.8 ? 'text-emerald-400' : 'text-violet-400'}>{Math.round(m.current_mastery * 100)}%</span>
                                                        </div>
                                                        <div className="h-1 dark:bg-slate-800 bg-slate-200 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-1000 ${m.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-violet-500'}`}
                                                                style={{ width: `${Math.round(m.current_mastery * 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Tasks', value: tasks.length, icon: <Layers size={20} />, color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
                        { label: 'Completed', value: `${tasksCompleted + tasksSubmitted}`, icon: <CheckCircle2 size={20} />, color: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-500/20' },
                        { label: 'Overdue', value: tasksOverdue, icon: <AlertCircle size={20} />, color: tasksOverdue > 0 ? 'from-red-500 to-rose-600' : 'from-slate-600 to-slate-700', shadow: tasksOverdue > 0 ? 'shadow-red-500/20' : '' },
                        { label: 'Hours Logged', value: `${totalActualHours.toFixed(1)}h`, icon: <Clock size={20} />, color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
                    ].map(s => (
                        <div
                            key={s.label}
                            className="group relative overflow-hidden rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] p-5 hover:bg-[var(--bg-muted)]/80 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                        >
                            <div className="absolute top-0 right-0 -tr-1/4 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
                            <div className="relative flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white shadow-lg ${s.shadow} group-hover:rotate-6 transition-all duration-300`}>
                                    {s.icon}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-0.5">{s.label}</p>
                                    <p className="text-2xl font-black text-[var(--text-main)] group-hover:text-violet-600 dark:group-hover:text-violet-200 transition-colors">{s.value}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Task Flow Timeline */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <ClipboardList size={18} className="text-violet-400" />
                                <h2 className="font-semibold text-[var(--text-main)]">Task Flow Timeline</h2>
                            </div>
                            <span className="text-xs text-[var(--text-dim)]">
                                Assigned Work
                            </span>
                        </div>

                        {loadingTasks ? (
                            <div className="space-y-6">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex gap-6 animate-pulse">
                                        <div className="w-12 h-12 bg-[var(--bg-muted)] rounded-2xl flex-shrink-0" />
                                        <div className="flex-1 h-32 bg-[var(--bg-muted)] rounded-3xl" />
                                    </div>
                                ))}
                            </div>
                        ) : tasks.length > 0 ? (
                            <div className="relative">
                                {/* Vertical background line */}
                                <div className="absolute left-6 top-6 bottom-6 w-px bg-gradient-to-b from-violet-500/50 via-slate-700/30 to-transparent" />
                                
                                <div className="space-y-2">
                                    {/* Start node - only on the last page */}
                                    {taskPage === Math.ceil(tasks.length / TASKS_PER_PAGE) && (
                                        <div className="flex items-start gap-6 pb-4">
                                            <div className="w-12 h-12 rounded-2xl dark:bg-slate-900 dark:border-slate-800 bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-lg relative z-10">
                                                <div className="w-2 h-2 rounded-full dark:bg-slate-600 bg-slate-400" />
                                            </div>
                                            <div className="py-3">
                                                <p className="text-sm font-bold text-[var(--text-muted)] tracking-tight uppercase">
                                                    Onboarding Reached
                                                </p>
                                                <p className="text-xs text-[var(--text-muted)] mt-1">Foundation established</p>
                                            </div>
                                        </div>
                                    )}

                                    {tasks
                                        .sort((a, b) => new Date(a.assigned_at).getTime() - new Date(b.assigned_at).getTime())
                                        .slice((taskPage - 1) * TASKS_PER_PAGE, taskPage * TASKS_PER_PAGE)
                                        .map(task => (
                                            <TaskCard
                                                key={task.id}
                                                task={task}
                                                onClick={() => setActiveTaskModal(task)}
                                            />
                                        ))
                                    }
                                </div>

                                {/* Pagination Controls */}
                                {tasks.length > TASKS_PER_PAGE && (
                                    <div className="flex items-center justify-center gap-4 mt-8 pt-4 border-t border-[var(--border-color)]">
                                        <button
                                            onClick={() => setTaskPage(p => Math.max(1, p - 1))}
                                            disabled={taskPage === 1}
                                            className="px-4 py-2 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-color)] text-[var(--text-dim)] text-xs font-bold uppercase tracking-widest hover:bg-[var(--bg-muted)]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
                                            Page {taskPage} of {Math.ceil(tasks.length / TASKS_PER_PAGE)}
                                        </span>
                                        <button
                                            onClick={() => setTaskPage(p => Math.min(Math.ceil(tasks.length / TASKS_PER_PAGE), p + 1))}
                                            disabled={taskPage === Math.ceil(tasks.length / TASKS_PER_PAGE)}
                                            className="px-4 py-2 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-color)] text-[var(--text-dim)] text-xs font-bold uppercase tracking-widest hover:bg-[var(--bg-muted)]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 rounded-2xl dark:bg-slate-800/30 dark:border-slate-700/30 border-dashed bg-white/50 border border-slate-200/30 border-dashed">
                                <Activity size={40} className="dark:text-slate-600 text-slate-400 mb-3" />
                                <p className="text-[var(--text-dim)] font-medium text-sm mb-1">No tasks assigned yet</p>
                                <p className="text-[var(--text-muted)] text-xs text-center max-w-xs">
                                    Interns will see their active project tasks flow here once assigned by a manager.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right Panel */}
                    <div className="space-y-5">

                        {/* Optimal Difficulty Card */}
                        {optimalDiff && (
                            <div className="group relative rounded-3xl dark:bg-slate-900/40 dark:border-slate-800/60 bg-white/60 border border-slate-200/30 p-6 overflow-hidden backdrop-blur-xl transition-all duration-300 hover:border-indigo-500/30">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl transition-transform group-hover:scale-125" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                            <TrendingUp size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[var(--text-main)] text-sm tracking-tight uppercase">Optimal Difficulty</h3>
                                            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Greedy Policy</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="relative">
                                            <svg className="w-16 h-16 transform -rotate-90">
                                                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="dark:text-slate-800 text-slate-300" />
                                                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" 
                                                    strokeDasharray={176} strokeDashoffset={176 - (optimalDiff.optimal_difficulty / 5) * 176}
                                                    strokeLinecap="round" className="text-indigo-400 transition-all duration-1000" />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center text-2xl font-black text-[var(--text-main)]">
                                                {optimalDiff.optimal_difficulty}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-[var(--text-main)] leading-tight">{optimalDiff.difficulty_label}</p>
                                            <p className="text-xs font-medium text-[var(--text-dim)]">Baseline Target</p>
                                        </div>
                                    </div>

                                    {/* State radar simple */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Growth Vector</span>
                                            <span className="text-[10px] font-black text-indigo-400">STATE DEPTH</span>
                                        </div>
                                        <div className="space-y-2">
                                            {optimalDiff.state_keys.map((key, i) => (
                                                <div key={key} className="space-y-1">
                                                    <div className="flex justify-between text-[10px] font-bold text-[var(--text-dim)] px-1">
                                                        <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                                                        <span>{Math.round(optimalDiff.state_vector[i] * 100)}%</span>
                                                    </div>
                                                    <div className="h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-blue-400 transition-all duration-1000" 
                                                            style={{ width: `${Math.round(optimalDiff.state_vector[i] * 100)}%` }} 
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
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

                        {/* Action Needed Card */}
                        {(tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'SUBMITTED').length > 0) && (
                            <div className="rounded-3xl dark:bg-slate-900/40 dark:border-slate-800/60 bg-white/60 border border-slate-200/30 p-5 overflow-hidden backdrop-blur-xl transition-all duration-300 hover:border-violet-500/30">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${tasksOverdue > 0 ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                        <AlertCircle size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[var(--text-main)] text-sm tracking-tight">{tasksOverdue > 0 ? 'Action Needed' : 'Pending Tasks'}</h3>
                                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'SUBMITTED').length} tasks remaining</p>
                                    </div>
                                </div>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'SUBMITTED').sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).map(task => {
                                        const isOverdue = new Date(task.due_date) < new Date();
                                        return (
                                            <div key={task.id} onClick={() => setActiveTaskModal(task)} className={`group cursor-pointer flex flex-col p-3 rounded-xl border transition-all hover:scale-[1.02] ${isOverdue ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40' : 'dark:bg-slate-800/30 dark:border-slate-700/50 dark:hover:border-slate-600 bg-white/60 border-slate-200/50 hover:border-slate-300'}`}>
                                                <div className="flex justify-between items-start mb-2 gap-2">
                                                    <span className="text-xs font-bold text-[var(--text-main)] group-hover:text-[var(--text-main)] line-clamp-1 flex-1">{task.title}</span>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                        {task.status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-semibold">
                                                    <Clock size={12} className={isOverdue ? "text-red-400" : "dark:text-slate-500 text-slate-400"} />
                                                    <span className={isOverdue ? "text-red-400" : "dark:text-slate-400 text-slate-500"}>Due: {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Interns-only: next milestone quick view */}
                        {!isManagerOrAdmin && path?.next_milestone && (
                            <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/30 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Zap size={16} className="text-yellow-400" />
                                    <h3 className="font-semibold text-[var(--text-main)] text-sm">Next Step</h3>
                                </div>
                                <p className="text-sm font-medium text-violet-200 mb-1">{path.next_milestone.title}</p>
                                <p className="text-xs dark:text-slate-400 text-slate-500 mb-2">{path.next_milestone.description}</p>
                                <div className="flex items-center gap-2 text-xs dark:text-slate-400 text-slate-500">
                                    <Clock size={11} /> ~{path.next_milestone.estimated_hours}h
                                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_BG[path.next_milestone.difficulty] || DIFFICULTY_BG[3]}`}>
                                        {DIFFICULTY_LABELS[path.next_milestone.difficulty]}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Progress Ring */}
                        {path && (
                            <div className="rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] p-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <BarChart3 size={16} className="text-emerald-400" />
                                    <h3 className="font-semibold text-[var(--text-main)] text-sm">Overall Progress</h3>
                                </div>
                                <div className="flex items-center gap-4">
                                    {/* SVG ring */}
                                    <div className="relative w-20 h-20 flex-shrink-0">
                                        <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                                            <circle cx="18" cy="18" r="15.9" fill="none" className="dark:text-slate-700 text-slate-300" strokeWidth="3" />
                                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#8b5cf6" strokeWidth="3"
                                                strokeDasharray={`${path.completion_percentage || 0} ${100 - (path.completion_percentage || 0)}`}
                                                strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-sm font-bold dark:text-violet-300 text-violet-600">{path.completion_percentage?.toFixed(0) || 0}%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-xs text-[var(--text-dim)]">{tasksCompleted} completed</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                                            <span className="text-xs text-[var(--text-dim)]">1 in progress</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full dark:bg-slate-600 bg-slate-400" />
                                            <span className="text-xs text-[var(--text-dim)]">{Math.max(0, tasks.length - tasksCompleted - 1)} remaining</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                </div>

            {/* Analysis Modal */}
            {activeStatModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 dark:bg-slate-950/80 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActiveStatModal(null)} />
                    <div className="relative z-10 w-full max-w-lg dark:bg-[var(--bg-color)] bg-white border dark:border-[var(--border-color)] border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
                            <h2 className="text-lg font-bold text-[var(--text-main)]">
                                {activeStatModal} Analysis
                            </h2>
                            <button onClick={() => setActiveStatModal(null)} className="p-1 hover:bg-[var(--bg-muted)] rounded-lg text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div className="p-6 overflow-y-auto">
                            {/* We keep the old Path breakdown for these modals if path exists, otherwise hide or show task stats */}
                            {activeStatModal === 'Completion' && path && (
                                <div className="space-y-4">
                                    <p className="text-sm text-[var(--text-dim)] leading-relaxed">
                                        The completion metric measures the aggregated average mastery across all {path.total_milestones} milestones in the `{path.target_role}` path.
                                    </p>
                                    <div className="bg-[var(--bg-muted)] rounded-xl p-4 border border-emerald-500/20">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-emerald-400 uppercase">Overall Progress</span>
                                            <span className="text-sm font-bold text-[var(--text-main)]">{path.completion_percentage?.toFixed(1) || 0}%</span>
                                        </div>
                                        <div className="h-2 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${path.completion_percentage || 0}%` }} />
                                        </div>
                                    </div>
                                    <h3 className="text-sm font-semibold text-[var(--text-dim)] mt-6 mb-3">Mastery Breakdown</h3>
                                    <div className="space-y-3">
                                        {path.milestones?.map(m => (
                                            <div key={m.skill}>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-[var(--text-dim)]">{m.title}</span>
                                                    <span className={m.current_mastery >= m.mastery_target ? 'text-emerald-400' : 'text-slate-500'}>
                                                        {Math.round(m.current_mastery * 100)}% / {Math.round(m.mastery_target * 100)}%
                                                    </span>
                                                </div>
                                                <div className="h-1 bg-[var(--bg-muted)] rounded-full overflow-hidden">
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
                                    <p className="text-sm text-[var(--text-dim)] leading-relaxed">
                                        You have fully mastered {path.milestones?.filter(m => m.status === 'COMPLETED').length || 0} out of {path.total_milestones} required skills for the {path.target_role} role. A milestone is considered "done" when its current mastery meets or exceeds the target mastery.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        <div className="bg-[var(--bg-muted)] border border-emerald-500/20 rounded-xl p-4 text-center">
                                            <p className="text-3xl font-black text-emerald-400">{path.milestones?.filter(m => m.status === 'COMPLETED').length || 0}</p>
                                            <p className="text-xs text-[var(--text-dim)] mt-1 uppercase tracking-wider font-semibold">Done</p>
                                        </div>
                                        <div className="bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl p-4 text-center">
                                            <p className="text-3xl font-black text-[var(--text-main)]">{path.total_milestones - (path.milestones?.filter(m => m.status === 'COMPLETED').length || 0)}</p>
                                            <p className="text-xs text-[var(--text-dim)] mt-1 uppercase tracking-wider font-semibold">Remaining</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeStatModal === 'Total Hours' && path && (
                                <div className="space-y-4">
                                    <p className="text-sm text-[var(--text-dim)] leading-relaxed">
                                        This path requires approximately {path.milestones?.reduce((s, m) => s + m.estimated_hours, 0) || 0} estimated hours of deliberate practice and project work to complete all {path.total_milestones} milestones.
                                    </p>
                                    <h3 className="text-sm font-semibold text-[var(--text-dim)] mt-6 mb-3">Time Distribution</h3>
                                    <div className="space-y-2">
                                        {path.milestones?.map(m => {
                                            const tH = path.milestones?.reduce((s, x) => s + x.estimated_hours, 0) || 1;
                                            const pct = (m.estimated_hours / tH) * 100;
                                            return (
                                                <div key={m.skill} className="bg-[var(--bg-muted)] p-3 rounded-lg flex items-center gap-3">
                                                    <div className="w-12 text-right flex-shrink-0">
                                                        <span className="text-sm font-bold text-indigo-400">{m.estimated_hours}h</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm text-[var(--text-dim)]">{m.title}</p>
                                                        <div className="w-full h-1 bg-[var(--bg-muted)] mt-2 rounded-full overflow-hidden">
                                                            <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }}/>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-[var(--text-muted)] w-8">{pct.toFixed(0)}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {activeStatModal === 'Hours Left' && path && (
                                <div className="space-y-4">
                                    <p className="text-sm text-[var(--text-dim)] leading-relaxed">
                                        Based on your current progress, there are approximately {path.milestones?.filter(m => m.status !== 'COMPLETED').reduce((s, m) => s + m.estimated_hours, 0) || 0} hours of learning left to hit your target role.
                                    </p>
                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-2xl font-black text-amber-500">{path.milestones?.filter(m => m.status !== 'COMPLETED').reduce((s, m) => s + m.estimated_hours, 0) || 0}h</p>
                                            <p className="text-xs font-semibold text-amber-500/70 uppercase tracking-wider mt-1">Remaining Time</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                                        <p className="text-xs text-[var(--text-dim)] italic">
                                            * Note: The AI agent recalculates these hours dynamically. If you demonstrate fast mastery or high quality scores in task completions, the remaining hours will compress.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Footer */}
                        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-muted)] rounded-b-2xl">
                            <button
                                onClick={() => setActiveStatModal(null)}
                                className="w-full py-2.5 bg-[var(--bg-muted)] hover:bg-[var(--bg-color)] text-[var(--text-dim)] text-sm font-semibold rounded-xl transition-colors border border-[var(--border-color)]"
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
                    <div className="absolute inset-0 dark:bg-slate-950/80 bg-white/70 backdrop-blur-sm" onClick={() => setActiveTaskModal(null)} />
                    <div className="relative z-10 w-full max-w-2xl dark:bg-[var(--bg-color)] bg-white border dark:border-[var(--border-color)] border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="flex items-start justify-between p-6 dark:border-b dark:border-slate-800 border-b border-slate-200">
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
                            <button onClick={() => setActiveTaskModal(null)} className="p-2 dark:hover:bg-slate-800 rounded-lg dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            
                            {/* Description */}
                            <div>
                                <h3 className="text-sm font-semibold dark:text-slate-400 text-slate-600 mb-2">Description</h3>
                                <div className="dark:bg-slate-800/30 p-4 rounded-xl dark:border border-slate-700/50 bg-slate-100/50 border border-slate-200/50">
                                    <p className="dark:text-slate-300 text-slate-700 text-sm whitespace-pre-wrap">{activeTaskModal.description}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-sm font-semibold dark:text-slate-400 text-slate-600 mb-2">Time Tracking</h3>
                                    <div className="dark:bg-slate-800/30 p-4 rounded-xl dark:border border-slate-700/50 bg-slate-100/50 border border-slate-200/50 space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="dark:text-slate-400 text-slate-600">Estimated</span>
                                            <span className="font-semibold dark:text-slate-200 text-slate-800">{activeTaskModal.estimated_hours} hrs</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="dark:text-slate-400 text-slate-600">Logged</span>
                                            <span className="font-semibold text-indigo-400">{activeTaskModal.actual_hours || 0} hrs</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold dark:text-slate-400 text-slate-600 mb-2">Evaluation</h3>
                                    <div className="dark:bg-slate-800/30 p-4 rounded-xl dark:border border-slate-700/50 bg-slate-100/50 border border-slate-200/50 space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="dark:text-slate-400 text-slate-600">Quality</span>
                                            <div className="flex items-center gap-1">
                                                {activeTaskModal.quality_rating ? (
                                                    <>
                                                        <span className="font-bold text-yellow-400">{activeTaskModal.quality_rating}/5</span>
                                                        <Star size={14} className="text-yellow-400 fill-yellow-400/20" />
                                                    </>
                                                ) : <span className="dark:text-slate-500 text-slate-400 italic">Not rated</span>}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="dark:text-slate-400 text-slate-600">Code Score</span>
                                            <div className="flex items-center gap-1">
                                                {activeTaskModal.code_review_score ? (
                                                    <>
                                                        <span className="font-bold text-emerald-400">{activeTaskModal.code_review_score}%</span>
                                                        <Cpu size={14} className="text-emerald-400" />
                                                    </>
                                                ) : <span className="dark:text-slate-500 text-slate-400 italic">No score</span>}
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
                    <div className="absolute inset-0 dark:bg-slate-950/80 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActiveMilestoneModal(null)} />
                    <div className="relative z-10 w-full max-w-2xl dark:bg-slate-900 dark:border border-slate-700/60 bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="flex items-start justify-between p-6 dark:border-b dark:border-slate-800 border-b border-slate-200">
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
                                        <h2 className="text-xl font-bold dark:text-slate-100 text-slate-800">{activeMilestoneModal.title}</h2>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_BG[activeMilestoneModal.difficulty] || DIFFICULTY_BG[3]}`}>
                                            {DIFFICULTY_LABELS[activeMilestoneModal.difficulty]}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm dark:text-slate-400 text-slate-600">
                                        <span className="flex items-center gap-1"><Clock size={14} /> {activeMilestoneModal.estimated_hours} hours required</span>
                                        <span>•</span>
                                        <span className={`${activeMilestoneModal.status === 'COMPLETED' ? 'text-emerald-400' : activeMilestoneModal.status === 'IN_PROGRESS' ? 'text-violet-400 animate-pulse' : 'text-slate-500'}`}>
                                            {activeMilestoneModal.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setActiveMilestoneModal(null)} className="p-2 dark:hover:bg-slate-800 rounded-lg dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            
                            {/* Description */}
                            <div>
                                <h3 className="text-sm font-semibold dark:text-slate-100 text-slate-800 mb-2">Milestone Description</h3>
                                <p className="text-sm dark:text-slate-300 text-slate-700 leading-relaxed p-4 dark:bg-slate-800/30 rounded-xl dark:border border-slate-700/30 bg-white/50 border border-slate-200/30">
                                    {activeMilestoneModal.description}
                                </p>
                            </div>

                            {/* Mastery Target vs Current */}
                            <div>
                                <h3 className="text-sm font-semibold dark:text-slate-100 text-slate-800 mb-2">Mastery Objective</h3>
                                <div className="dark:bg-slate-800/50 dark:border border-slate-700/50 rounded-xl p-4 bg-white/50 border border-slate-200/50">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="dark:text-slate-300 text-slate-700">Skill Target: <span className="font-bold dark:text-slate-100 text-slate-800">{activeMilestoneModal.skill}</span></span>
                                        <span className={activeMilestoneModal.current_mastery >= activeMilestoneModal.mastery_target ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}>
                                            {Math.round(activeMilestoneModal.current_mastery * 100)}% / {Math.round(activeMilestoneModal.mastery_target * 100)}%
                                        </span>
                                    </div>
                                    <div className="h-2 dark:bg-slate-900 bg-slate-200 rounded-full overflow-hidden relative">
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
                                <h3 className="text-sm font-semibold dark:text-slate-100 text-slate-800 mb-2">Required Dependencies</h3>
                                {activeMilestoneModal.prerequisites.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 p-4 dark:bg-slate-800/30 rounded-xl dark:border border-slate-700/30 bg-white/50 border border-slate-200/30">
                                        {activeMilestoneModal.prerequisites.map(p => {
                                            const prereqNode = path?.milestones.find(m => m.skill === p);
                                            const isDone = prereqNode?.status === 'COMPLETED';
                                            return (
                                                <div key={p} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isDone ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 bg-white border border-slate-200 text-slate-600'}`}>
                                                    {isDone ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                                    <span className="text-sm font-medium">{p}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-sm dark:text-slate-400 text-slate-500 italic dark:bg-slate-800/20 rounded-xl p-4 dark:border border-slate-800 bg-white/50 border border-slate-200">
                                        <Target size={14} /> No prerequisites mapped for this skill.
                                    </div>
                                )}
                            </div>

                            {/* Learning Resources */}
                            {activeMilestoneModal.resources.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold dark:text-slate-100 text-slate-800 mb-2">Recommended Learning Resources</h3>
                                    <div className="space-y-2">
                                        {activeMilestoneModal.resources.map((r, i) => (
                                            <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                                                className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl dark:bg-slate-800/40 dark:hover:bg-slate-700/60 dark:border border-slate-700/50 dark:hover:border-violet-500/40 bg-white/50 hover:bg-slate-100 border border-slate-200 hover:border-violet-400/40 transition-all text-left">
                                                <div>
                                                    <p className="text-sm font-medium text-violet-300 group-hover:text-violet-200 transition-colors flex items-center gap-2">
                                                        {r.type.toLowerCase() === 'video' ? <Play size={14} /> : <BookOpen size={14} />}
                                                        {r.title}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1 sm:mt-0 font-mono hidden sm:block truncate max-w-sm">{r.url}</p>
                                                </div>
                                                <div className="mt-2 sm:mt-0 self-start sm:self-auto">
                                                    <span className="px-2 py-1 rounded dark:bg-slate-900 dark:border border-slate-700 dark:text-slate-400 bg-slate-200 border border-slate-300 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
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
