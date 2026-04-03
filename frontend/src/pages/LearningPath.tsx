import React, { useState, useEffect, useCallback } from 'react';
import {
    BookOpen, Brain, ChevronRight, CheckCircle2, Circle,
    Clock, TrendingUp, Zap, Target, AlertCircle, RefreshCw,
    Star, Activity, Layers, Play, Award, BarChart3, Cpu, X,
    ChevronDown, ChevronUp, ClipboardList, Sparkles, Rocket, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';

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
    task_details?: {
        title: string;
        description: string;
        starter_script: string;
        status: 'PENDING' | 'APPROVED';
    };
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
                            : 'bg-[var(--bg-muted)] border-[var(--border-color)] hover:bg-purple-500/10'
                    }`}
                >
                    {isCompleted
                        ? <CheckCircle2 size={18} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                            : <Circle size={18} className="text-[var(--text-muted)] group-hover:text-[var(--text-dim)] transition-colors" />
                    }
                </div>
                <div className={`w-0.5 flex-1 mt-1 rounded-full transition-colors ${isCompleted ? 'bg-emerald-500/40 group-hover:bg-emerald-500/60' : 'bg-[var(--border-color)]'}`} style={{ minHeight: 24 }} />
            </div>

            {/* Card */}
            <div className={`flex-1 pb-5 rounded-2xl p-4 border transition-all duration-300
                ${isCompleted
                    ? 'bg-emerald-500/5 border-emerald-500/20 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10'
                        : 'bg-[var(--card-bg)] border-[var(--border-color)] hover:bg-purple-500/[0.03] hover:border-purple-500/20'
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
                                ? 'bg-violet-500/10 border-violet-500/50 shadow-violet-500/10 group-hover:bg-violet-500/20'
                                : 'bg-[var(--bg-muted)] border-[var(--border-color)]'
                    }`}
                >
                    {isCompleted
                        ? <CheckCircle2 size={22} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                        : isOverdue
                            ? <AlertCircle size={22} className="text-red-400 group-hover:scale-110 transition-transform" />
                            : isInProgress
                                ? <Play size={20} className="text-violet-400 group-hover:scale-110 transition-transform" />
                                : <Circle size={20} className="text-[var(--text-muted)] group-hover:text-[var(--text-dim)] transition-colors" />
                    }
                </div>
                <div className={`w-0.5 flex-1 rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500/30 group-hover:bg-emerald-500/50' : 'bg-[var(--border-color)]'}`} />
            </div>

            {/* Content Card */}
            <div className={`flex-1 mb-8 rounded-3xl p-5 border backdrop-blur-sm transition-all duration-300 group-hover:translate-x-1
                ${isCompleted
                    ? 'bg-emerald-500/5 border-emerald-500/20 group-hover:border-emerald-500/40'
                    : isOverdue
                        ? 'bg-red-500/5 border-red-500/20 group-hover:border-red-500/40'
                    : isInProgress
                        ? 'bg-violet-500/5 border-violet-500/30 group-hover:border-violet-500/50 shadow-lg shadow-violet-500/5'
                        : 'bg-[var(--card-bg)] border-[var(--border-color)] hover:border-purple-500/20'
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
                                  'bg-[var(--bg-muted)] text-[var(--text-dim)] border border-[var(--border-color)]'}`}>
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
                        <p className="text-xs text-[var(--text-dim)] line-clamp-2 mt-2 leading-relaxed">
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
                                <Target size={12} className="text-[var(--text-muted)] opacity-60" />
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
        <div className="group relative rounded-3xl bg-[var(--card-bg)] border border-[var(--border-color)] p-6 overflow-hidden backdrop-blur-xl transition-all duration-300 hover:border-violet-500/30">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-full blur-3xl group-hover:scale-110 transition-transform" />
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                            <Brain size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-[var(--text-main)] text-sm">Task Complexity Recommendation</h3>
                        </div>
                    </div>
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="w-9 h-9 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-color)] text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-purple-500/10 transition-all active:scale-90"
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
                                        <div key={d} className={`h-2 flex-1 rounded-full transition-all duration-500 ${d <= recommendation.recommended_difficulty ? 'bg-violet-500' : 'bg-[var(--bg-muted)]'}`} />
                                    ))}
                                </div>
                                <span className="text-sm font-bold text-[var(--text-main)]">{recommendation.recommended_difficulty}/5</span>
                            </div>
                        </div>

                        {/* Rationale */}
                        <div className="relative p-4 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)]">
                            <Star size={14} className="absolute -top-1.5 -left-1.5 text-yellow-500 fill-current" />
                            <p className="text-xs text-[var(--text-dim)] leading-relaxed font-medium capitalize">
                                {recommendation.rationale}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <div className="w-16 h-16 rounded-full bg-[var(--bg-muted)] border border-dashed border-[var(--border-color)] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                            <Cpu size={32} className="text-[var(--text-muted)]" />
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
    
    // Custom Path States
    const [availableSkills, setAvailableSkills] = useState<string[]>([]);
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [customPathTitle, setCustomPathTitle] = useState('');
    const [aiGoal, setAiGoal] = useState('');
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [aiRationale, setAiRationale] = useState('');
    const [basicsOnly, setBasicsOnly] = useState(false);

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

    // Filter states
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [projectFilter, setProjectFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const [isGeneratingTask, setIsGeneratingTask] = useState(false);
    const [activeMilestoneIndex, setActiveMilestoneIndex] = useState<number | null>(null);
    const [isReviewingTask, setIsReviewingTask] = useState(false);

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

    const fetchAvailableSkills = useCallback(async () => {
        try {
            const response = await api.get('/analytics/skills/');
            setAvailableSkills(response.data.skills);
        } catch (err) {
            console.error("Error fetching skills:", err);
        }
    }, []);

    const generatePath = async (type: 'role' | 'skill' = 'role') => {
        if (!effectiveInternId) { setError('Select an intern first'); return; }
        
        if (type === 'role' && !targetRole.trim()) { 
            setError(jobRoles.length > 0 ? 'Select a target role from the dropdown' : 'Enter a target role (e.g., BACKEND_DEVELOPER)'); 
            return; 
        }

        if (type === 'skill' && selectedSkills.length === 0) {
            setError('Please select at least one skill.');
            return;
        }

        setLoadingGenerate(true);
        setError('');
        try {
            const payload = type === 'role' 
                ? { target_role: targetRole }
                : { type: 'skill', skills: selectedSkills, title: customPathTitle || 'Custom Skill Path', basics_only: basicsOnly };

            const res = await api.post(`/analytics/learning-path/${effectiveInternId}/`, payload);
            if (res.status === 200 || res.status === 201) {
                setSuccessMsg(type === 'role' ? 'Learning path generated!' : 'Custom skill path generated!');
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

    const handleSuggestSkills = async () => {
        if (!aiGoal) {
            setError("Please enter a goal for the AI to analyze.");
            return;
        }
        if (!effectiveInternId) { setError('Select an intern first'); return; }

        setIsSuggesting(true);
        setAiRationale('');
        setError('');
        try {
            const response = await api.post('/analytics/llm/suggest-path/', {
                intern_id: effectiveInternId,
                goal: aiGoal,
                basics_only: basicsOnly
            });
            
            if (response.data.suggested_skills) {
                setSelectedSkills(response.data.suggested_skills);
                setAiRationale(response.data.rationale);
                setCustomPathTitle(`${aiGoal} Focus`);
                setSuccessMsg('AI suggestions received!');
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err: any) {
            console.error("Error fetching AI suggestions:", err);
            setError(err.response?.data?.error || "Failed to get AI suggestions.");
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleGenerateMilestoneTask = async (skill: string, index: number) => {
        if (!effectiveInternId) return;
        setIsGeneratingTask(true);
        setActiveMilestoneIndex(index);
        setError('');
        try {
            const res = await api.post('/analytics/learning-path/generate-milestone-task/', {
                intern_id: effectiveInternId,
                milestone_index: index,
                skill: skill,
                goal: aiGoal || targetRole,
                basics_only: basicsOnly
            });
            if (res.data.task) {
                setSuccessMsg(`AI Task generated for ${skill}!`);
                setTimeout(() => setSuccessMsg(''), 3000);
                
                // Refresh path AND active modal to show new details immediately
                const pathRes = await api.get(`/analytics/learning-path/${effectiveInternId}/`);
                setPath(pathRes.data);
                
                // Update the active modal state with the fresh milestone data
                const updatedMilestone = pathRes.data.milestones[index];
                if (updatedMilestone) {
                    setActiveMilestoneModal(updatedMilestone);
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to generate AI task');
        } finally {
            setIsGeneratingTask(false);
        }
    };

    const handleReviewMilestoneTask = async (index: number, action: 'APPROVE' | 'REJECT') => {
        if (!effectiveInternId) return;
        setIsReviewingTask(true);
        setError('');
        try {
            const res = await api.post('/analytics/learning-path/review-milestone-task/', {
                intern_id: effectiveInternId,
                milestone_index: index,
                action: action
            });
            setSuccessMsg(res.data.message || `Task ${action === 'APPROVE' ? 'Approved' : 'Rejected'}`);
            setTimeout(() => setSuccessMsg(''), 3000);

            // Refresh path AND active modal
            const pathRes = await api.get(`/analytics/learning-path/${effectiveInternId}/`);
            setPath(pathRes.data);

            const updatedMilestone = pathRes.data.milestones[index];
            if (updatedMilestone) {
                setActiveMilestoneModal(updatedMilestone);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to review task');
        } finally {
            setIsReviewingTask(false);
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
            fetchAvailableSkills();
            setTaskPage(1);
            if (isManagerOrAdmin) fetchRecommendation(effectiveInternId);
        }
    }, [effectiveInternId, loadPath, loadOptimalDiff, loadTasks, fetchRecommendation, fetchAvailableSkills, isManagerOrAdmin]);

    const tasksCompleted = tasks.filter(t => t.status === 'COMPLETED').length;
    const tasksSubmitted = tasks.filter(t => t.status === 'SUBMITTED').length;
    const tasksInProgress = tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'SUBMITTED').length;
    const tasksRemaining = tasks.filter(t => t.status === 'ASSIGNED').length;
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
                                <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tighter uppercase">AIMs Adaptive Roadmap</h1>
                                <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">Personalized Learning & Skill Mastery</p>
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
                                <div className="bg-violet-600/10 border border-violet-500/20 rounded-2xl p-6 relative overflow-hidden group hover:border-violet-500/40 transition-all duration-500">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                                <Target size={16} className="text-white" />
                                            </div>
                                            <h2 className="text-base font-bold text-[var(--text-main)]">AIMs Intelligence: Generate Custom Path</h2>
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
                                                onClick={() => generatePath('role')}
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

                                {/* Custom Skill Selection Section */}
                                <div className="relative rounded-3xl bg-[var(--bg-muted)] border border-[var(--border-color)] p-6 backdrop-blur-md overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-3 bg-purple-500/20 rounded-xl">
                                                <Target className="w-6 h-6 text-purple-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold font-heading text-[var(--text-main)]">Focus on Specific Skills</h3>
                                                <p className="text-[var(--text-dim)] text-sm">Select languages or frameworks for a custom path</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            {/* AI Suggestion Input */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-sm font-medium text-[var(--text-dim)] block">AI-Powered Suggestions</label>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Focus on Basics</span>
                                                        <button 
                                                            onClick={() => setBasicsOnly(!basicsOnly)}
                                                            className={`w-10 h-5 rounded-full relative transition-all duration-300 ${basicsOnly ? 'bg-violet-500' : 'bg-slate-700'}`}
                                                        >
                                                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${basicsOnly ? 'left-6' : 'left-1'}`} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                                                        <input
                                                            type="text"
                                                            value={aiGoal}
                                                            onChange={(e) => setAiGoal(e.target.value)}
                                                            placeholder="e.g., Become a Backend Expert, Master React..."
                                                            className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl py-2 pl-10 pr-4 text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-[var(--text-muted)]"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={handleSuggestSkills}
                                                        disabled={isSuggesting || !aiGoal}
                                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-purple-500/20"
                                                    >
                                                        {isSuggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                                                        {isSuggesting ? 'Thinking...' : 'Suggest'}
                                                    </button>
                                                </div>
                                                {aiRationale && (
                                                    <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg text-xs text-purple-200 animate-in fade-in slide-in-from-top-1">
                                                        <div className="flex gap-2">
                                                            <Brain className="w-4 h-4 flex-shrink-0" />
                                                            <p>{aiRationale}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Manual Skill Selector */}
                                            <div className="space-y-3">
                                                <label className="text-sm font-medium text-[var(--text-dim)] block">Select Focus Skills</label>
                                                <div className="flex flex-wrap gap-2 p-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl min-h-[100px]">
                                                    {availableSkills.map((skill) => (
                                                        <button
                                                          key={skill}
                                                          onClick={() => {
                                                            if (selectedSkills.includes(skill)) {
                                                              setSelectedSkills(selectedSkills.filter(s => s !== skill));
                                                            } else {
                                                              setSelectedSkills([...selectedSkills, skill]);
                                                            }
                                                          }}
                                                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                                                            selectedSkills.includes(skill)
                                                              ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/20'
                                                              : 'bg-[var(--bg-color)] text-[var(--text-dim)] border border-[var(--border-color)] hover:bg-[var(--bg-muted)]/80'
                                                          }`}
                                                        >
                                                            {skill}
                                                            {selectedSkills.includes(skill) && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-sm font-medium text-[var(--text-dim)] block">Path Title (Optional)</label>
                                                <input
                                                    type="text"
                                                    value={customPathTitle}
                                                    onChange={(e) => setCustomPathTitle(e.target.value)}
                                                    placeholder="e.g., Python Backend Mastery"
                                                    className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl py-2 px-4 text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                />
                                            </div>

                                            <button
                                                onClick={() => generatePath('skill')}
                                                disabled={loadingGenerate || selectedSkills.length === 0}
                                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-bold font-heading flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                                            >
                                                {loadingGenerate ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
                                                {loadingGenerate ? 'GENERATING...' : 'GENERATE CUSTOM PATH'}
                                            </button>
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
                                                            ${m.status === 'COMPLETED' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-[var(--bg-muted)] border-[var(--border-color)] text-[var(--text-muted)]'}
                                                        `}>
                                                            {m.status === 'COMPLETED' ? <CheckCircle2 size={16} /> : <Circle size={14} />}
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                                                                Lvl {m.difficulty}
                                                            </span>
                                                            {m.task_details && (
                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${m.task_details.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400 animate-pulse'}`}>
                                                                    <Sparkles size={8} />
                                                                    {m.task_details.status === 'APPROVED' ? 'Assigned' : 'Review Ready'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <h4 className="font-bold text-[var(--text-main)] text-sm group-hover/milestone:text-violet-600 dark:group-hover/milestone:text-violet-300 transition-colors line-clamp-1">{m.title}</h4>
                                                    <div className="mt-3">
                                                        <div className="flex justify-between text-[10px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-tighter">
                                                            <span>Mastery</span>
                                                            <span className={m.current_mastery >= 0.8 ? 'text-emerald-400' : 'text-violet-400'}>{Math.round(m.current_mastery * 100)}%</span>
                                                        </div>
                                                        <div className="h-1 bg-[var(--bg-muted)] rounded-full overflow-hidden">
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
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-[var(--text-dim)] hidden sm:block">
                                    Assigned Work
                                </span>
                            </div>
                        </div>

                        {/* Filter Bar */}
                        <div className="mb-6 bg-[var(--bg-muted)]/50 border border-[var(--border-color)] rounded-2xl p-3 backdrop-blur-md flex flex-wrap items-center gap-3">
                            {/* Search */}
                            <div className="relative flex-1 min-w-[200px]">
                                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                                <input
                                    type="text"
                                    placeholder="Search tasks..."
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setTaskPage(1); }}
                                    className="w-full pl-9 pr-4 py-2 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
                                />
                            </div>

                            {/* Status Filter */}
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setTaskPage(1); }}
                                className="px-4 py-2 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-violet-500/40 cursor-pointer appearance-none"
                            >
                                <option value="ALL">All Status</option>
                                <option value="ASSIGNED">Assigned</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="SUBMITTED">Submitted</option>
                                <option value="COMPLETED">Completed</option>
                            </select>

                            {/* Project Filter */}
                            <select
                                value={projectFilter}
                                onChange={(e) => { setProjectFilter(e.target.value); setTaskPage(1); }}
                                className="px-4 py-2 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-violet-500/40 cursor-pointer appearance-none"
                            >
                                <option value="ALL">All Projects</option>
                                {[...new Set(tasks.map(t => t.project?.name).filter(Boolean))].map(p => (
                                    <option key={p} value={p || ''}>{p}</option>
                                ))}
                            </select>

                            {/* Clear Filters */}
                            {(statusFilter !== 'ALL' || projectFilter !== 'ALL' || searchQuery !== '') && (
                                <button
                                    onClick={() => { setStatusFilter('ALL'); setProjectFilter('ALL'); setSearchQuery(''); setTaskPage(1); }}
                                    className="p-2 rounded-xl hover:bg-red-500/10 text-red-400 transition-all active:scale-90"
                                    title="Clear Filters"
                                >
                                    <X size={16} />
                                </button>
                            )}
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
                                
                                    {(() => {
                                        const filteredTasks = tasks.filter(task => {
                                            const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;
                                            const matchesProject = projectFilter === 'ALL' || task.project?.name === projectFilter;
                                            const matchesSearch = searchQuery === '' || 
                                                task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                task.description.toLowerCase().includes(searchQuery.toLowerCase());
                                            return matchesStatus && matchesProject && matchesSearch;
                                        });
                                        const totalPages = Math.ceil(filteredTasks.length / TASKS_PER_PAGE);
                                        
                                        return (
                                            <>
                                                <div className="space-y-2">
                                                    {filteredTasks
                                                        .sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime())
                                                        .slice((taskPage - 1) * TASKS_PER_PAGE, taskPage * TASKS_PER_PAGE)
                                                        .map(task => (
                                                            <TaskCard
                                                                key={task.id}
                                                                task={task}
                                                                onClick={() => setActiveTaskModal(task)}
                                                            />
                                                        ))
                                                    }

                                                    {/* Start node - only on the last page */}
                                                    {taskPage === totalPages && filteredTasks.length > 0 && (
                                                        <div className="flex items-start gap-6 pt-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] flex items-center justify-center flex-shrink-0 shadow-lg relative z-10">
                                                                <div className="w-2 h-2 rounded-full text-[var(--text-muted)] bg-[var(--text-muted)]" />
                                                            </div>
                                                            <div className="py-3">
                                                                <p className="text-sm font-bold text-[var(--text-muted)] tracking-tight uppercase">
                                                                    Onboarding Reached
                                                                </p>
                                                                <p className="text-xs text-[var(--text-muted)] mt-1">Foundation established</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {filteredTasks.length > TASKS_PER_PAGE && (
                                                    <div className="flex items-center justify-center gap-4 mt-8 pt-4 border-t border-[var(--border-color)]">
                                                        <button
                                                            onClick={() => setTaskPage(p => Math.max(1, p - 1))}
                                                            disabled={taskPage === 1}
                                                            className="px-4 py-2 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-color)] text-[var(--text-dim)] text-xs font-bold uppercase tracking-widest hover:bg-[var(--bg-muted)]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                                        >
                                                            Previous
                                                        </button>
                                                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
                                                            Page {taskPage} of {totalPages}
                                                        </span>
                                                        <button
                                                            onClick={() => setTaskPage(p => Math.min(totalPages, p + 1))}
                                                            disabled={taskPage === totalPages}
                                                            className="px-4 py-2 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-color)] text-[var(--text-dim)] text-xs font-bold uppercase tracking-widest hover:bg-[var(--bg-muted)]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                                        >
                                                            Next
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {filteredTasks.length === 0 && (
                                                    <div className="flex flex-col items-center justify-center py-12 text-[var(--text-dim)]">
                                                        <X size={32} className="mb-2 opacity-20" />
                                                        <p className="text-sm font-medium">No tasks match your filters</p>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-[var(--bg-muted)]/50 border border-[var(--border-color)] border-dashed">
                                <Activity size={40} className="text-[var(--text-muted)] mb-3" />
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
                            <div className="group relative rounded-3xl bg-[var(--card-bg)] border border-[var(--border-color)] p-6 overflow-hidden backdrop-blur-xl transition-all duration-300 hover:border-indigo-500/30">
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
                                                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-[var(--bg-muted)]" />
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
                            <div className="rounded-3xl bg-[var(--card-bg)] border border-[var(--border-color)] p-5 overflow-hidden backdrop-blur-xl transition-all duration-300 hover:border-violet-500/30">
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
                                            <div key={task.id} onClick={() => setActiveTaskModal(task)} className={`group cursor-pointer flex flex-col p-3 rounded-xl border transition-all hover:scale-[1.02] ${isOverdue ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40' : 'bg-[var(--bg-muted)] border-[var(--border-color)] hover:border-blue-500/20'}`}>
                                                <div className="flex justify-between items-start mb-2 gap-2">
                                                    <span className="text-xs font-bold text-[var(--text-main)] group-hover:text-[var(--text-main)] line-clamp-1 flex-1">{task.title}</span>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                        {task.status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-semibold">
                                                    <Clock size={12} className={isOverdue ? "text-red-400" : "text-[var(--text-muted)]"} />
                                                    <span className={isOverdue ? "text-red-400" : "text-[var(--text-muted)]"}>Due: {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
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
                                <div className="flex items-center gap-6">
                                    {/* SVG ring */}
                                    <div className="relative w-24 h-24 flex-shrink-0">
                                        <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                                            {/* Background Track */}
                                            <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-[var(--bg-color)]" strokeWidth="3.5" />
                                            
                                            {(() => {
                                                const total = tasks.length || 1;
                                                const cPct = (tasksCompleted / total) * 100;
                                                const iPct = (tasksInProgress / total) * 100;
                                                const rPct = (tasksRemaining / total) * 100;
                                                
                                                return (
                                                    <>
                                                        {/* Remaining Segment */}
                                                        <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-[var(--bg-muted)]" strokeWidth="3.5"
                                                            strokeDasharray={`${rPct} ${100 - rPct}`}
                                                            strokeDashoffset={-(cPct + iPct)}
                                                            strokeLinecap="round" />
                                                        
                                                        {/* In Progress Segment */}
                                                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#8b5cf6" strokeWidth="3.5"
                                                            strokeDasharray={`${iPct} ${100 - iPct}`}
                                                            strokeDashoffset={-cPct}
                                                            strokeLinecap="round" />
                                                            
                                                        {/* Completed Segment */}
                                                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="3.5"
                                                            strokeDasharray={`${cPct} ${100 - cPct}`}
                                                            strokeLinecap="round" />
                                                    </>
                                                );
                                            })()}
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-base font-black text-[var(--text-main)]">
                                                {tasks.length > 0 ? Math.round((tasksCompleted / tasks.length) * 100) : 0}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center justify-between group/stat">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                                <span className="text-xs font-bold text-[var(--text-dim)] group-hover/stat:text-[var(--text-main)] transition-colors tracking-tight">Completed</span>
                                            </div>
                                            <span className="text-xs font-black text-[var(--text-main)]">{tasksCompleted}</span>
                                        </div>
                                        <div className="flex items-center justify-between group/stat">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.4)]" />
                                                <span className="text-xs font-bold text-[var(--text-dim)] group-hover/stat:text-[var(--text-main)] transition-colors tracking-tight">In Progress</span>
                                            </div>
                                            <span className="text-xs font-black text-violet-400">{tasksInProgress}</span>
                                        </div>
                                        <div className="flex items-center justify-between group/stat">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-[var(--bg-muted)] border border-[var(--border-color)]" />
                                                <span className="text-xs font-bold text-[var(--text-dim)] group-hover/stat:text-[var(--text-main)] transition-colors tracking-tight">Remaining</span>
                                            </div>
                                            <span className="text-xs font-black text-[var(--text-muted)]">{tasksRemaining}</span>
                                        </div>
                                        <div className="pt-1 mt-1 border-t border-[var(--border-color)]/30">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total Volume</span>
                                                <span className="text-[10px] font-black text-[var(--text-main)]">{tasks.length} Tasks</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                </div>

            <Modal
                isOpen={!!activeStatModal}
                onClose={() => setActiveStatModal(null)}
                title={`${activeStatModal} Analysis`}
                size="md"
            >
                <div className="space-y-6">
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
                                You have mastered {path.milestones?.filter(m => m.status === 'COMPLETED').length || 0} out of {path.total_milestones} required skills for the {path.target_role} role.
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
                                Total estimated effort: {path.milestones?.reduce((s, m) => s + m.estimated_hours, 0) || 0} hours for {path.total_milestones} milestones.
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
                                            <span className="text-xs text-[var(--text-muted)] w-8 text-right">{pct.toFixed(0)}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeStatModal === 'Hours Left' && path && (
                        <div className="space-y-4">
                            <p className="text-sm text-[var(--text-dim)] leading-relaxed">
                                Approximately {path.milestones?.filter(m => m.status !== 'COMPLETED').reduce((s, m) => s + m.estimated_hours, 0) || 0} hours remaining.
                            </p>
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-2xl font-black text-amber-500">{path.milestones?.filter(m => m.status !== 'COMPLETED').reduce((s, m) => s + m.estimated_hours, 0) || 0}h</p>
                                    <p className="text-xs font-semibold text-amber-500/70 uppercase tracking-wider mt-1">Remaining Time</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 mt-6 border-t border-[var(--border-color)]">
                        <Button
                            onClick={() => setActiveStatModal(null)}
                            variant="outline"
                            fullWidth
                        >
                            Close Analysis
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={!!activeTaskModal}
                onClose={() => setActiveTaskModal(null)}
                title={activeTaskModal?.title || 'Task Details'}
                size="lg"
            >
                {activeTaskModal && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[var(--bg-muted)]/50 border border-[var(--border-color)] rounded-2xl">
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
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                                            ${activeTaskModal.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 
                                              activeTaskModal.status === 'SUBMITTED' ? 'bg-blue-500/20 text-blue-400' : 
                                              activeTaskModal.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-400' : 
                                              'bg-indigo-500/20 text-indigo-400'}`}>
                                            {activeTaskModal.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-[var(--text-dim)]">
                                        {activeTaskModal.project && <span className="text-indigo-400 font-medium">{activeTaskModal.project.name}</span>}
                                        {activeTaskModal.project && <span>•</span>}
                                        <span className="flex items-center gap-1"><Target size={14} /> Due: {new Date(activeTaskModal.due_date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Description */}
                        <div>
                            <h3 className="text-sm font-semibold text-[var(--text-dim)] mb-2 uppercase tracking-widest">Description</h3>
                            <div className="bg-[var(--bg-muted)] p-4 rounded-xl border border-[var(--border-color)]">
                                <p className="text-[var(--text-main)] text-sm whitespace-pre-wrap leading-relaxed">{activeTaskModal.description}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-sm font-semibold text-[var(--text-dim)] mb-2 uppercase tracking-widest">Time Tracking</h3>
                                <div className="bg-[var(--bg-muted)] p-4 rounded-xl border border-[var(--border-color)] space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[var(--text-dim)]">Estimated Effort</span>
                                        <span className="font-bold text-[var(--text-main)]">{activeTaskModal.estimated_hours} hrs</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[var(--text-dim)]">Logged Hours</span>
                                        <span className="font-bold text-indigo-400">{activeTaskModal.actual_hours || 0} hrs</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-[var(--text-dim)] mb-2 uppercase tracking-widest">Evaluation</h3>
                                <div className="bg-[var(--bg-muted)] p-4 rounded-xl border border-[var(--border-color)] space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[var(--text-dim)]">Quality Grade</span>
                                        <div className="flex items-center gap-1">
                                            {activeTaskModal.quality_rating ? (
                                                <>
                                                    <span className="font-bold text-yellow-500">{activeTaskModal.quality_rating}/5</span>
                                                    <Star size={14} className="text-yellow-400 fill-yellow-400/20" />
                                                </>
                                            ) : <span className="text-[var(--text-muted)]">Awaiting Rating</span>}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[var(--text-dim)]">Code Review</span>
                                        <div className="flex items-center gap-1">
                                            {activeTaskModal.code_review_score ? (
                                                <>
                                                    <span className="font-bold text-emerald-400">{activeTaskModal.code_review_score}%</span>
                                                    <Cpu size={14} className="text-emerald-400" />
                                                </>
                                            ) : <span className="text-[var(--text-muted)]">No Data</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 mt-6 border-t border-[var(--border-color)]">
                            <Button onClick={() => setActiveTaskModal(null)} variant="outline" fullWidth>
                                Close Details
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={!!activeMilestoneModal}
                onClose={() => setActiveMilestoneModal(null)}
                title={activeMilestoneModal?.title || 'Milestone Details'}
                size="lg"
            >
                {activeMilestoneModal && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[var(--bg-muted)]/50 border border-[var(--border-color)] rounded-2xl">
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
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_BG[activeMilestoneModal.difficulty] || DIFFICULTY_BG[3]}`}>
                                            {DIFFICULTY_LABELS[activeMilestoneModal.difficulty]}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-[var(--text-dim)]">
                                        <span className="flex items-center gap-1"><Clock size={14} /> {activeMilestoneModal.estimated_hours} hours required</span>
                                        <span>•</span>
                                        <span className={`${activeMilestoneModal.status === 'COMPLETED' ? 'text-emerald-400' : activeMilestoneModal.status === 'IN_PROGRESS' ? 'text-violet-400 animate-pulse' : 'text-slate-500'} font-bold`}>
                                            {activeMilestoneModal.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Outcome */}
                        <div>
                            <h3 className="text-sm font-semibold text-[var(--text-dim)] mb-2 uppercase tracking-widest">Objective</h3>
                            <div className="bg-[var(--bg-muted)] p-4 rounded-xl border border-[var(--border-color)]">
                                <p className="text-[var(--text-main)] text-sm whitespace-pre-wrap leading-relaxed">{activeMilestoneModal.description}</p>
                            </div>
                        </div>

                        {/* Mastery Target vs Current */}
                        <div className="p-4 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl">
                            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">Mastery Progress: {activeMilestoneModal.skill}</h3>
                            <div className="flex items-center justify-between text-sm mb-2">
                                <span className={activeMilestoneModal.current_mastery >= activeMilestoneModal.mastery_target ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}>
                                    {Math.round(activeMilestoneModal.current_mastery * 100)}% Current Mastery
                                </span>
                                <span className="text-[var(--text-dim)] font-bold">
                                    Target: {Math.round(activeMilestoneModal.mastery_target * 100)}%
                                </span>
                            </div>
                            <div className="h-2 bg-[var(--bg-muted)] rounded-full overflow-hidden relative border border-[var(--border-color)]">
                                <div 
                                    className="absolute top-0 bottom-0 left-0 bg-slate-700/50" 
                                    style={{ width: `${Math.round(activeMilestoneModal.mastery_target * 100)}%` }}
                                />
                                <div 
                                    className={`absolute top-0 bottom-0 left-0 transition-all duration-1000 ${activeMilestoneModal.current_mastery >= activeMilestoneModal.mastery_target ? 'bg-emerald-500' : 'bg-violet-500'}`} 
                                    style={{ width: `${Math.min(100, Math.round(activeMilestoneModal.current_mastery * 100))}%` }}
                                />
                            </div>
                        </div>

                        {/* AI Generated Task & Script Section */}
                        <div className="pt-4 border-t border-[var(--border-color)]">
                            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2 mb-4 uppercase tracking-widest">
                                <Sparkles size={18} className="text-purple-400" />
                                Hands-on Project Task
                            </h3>

                            {activeMilestoneModal.task_details ? (
                                <div className="space-y-4 animate-scale-in">
                                    {(isManagerOrAdmin || activeMilestoneModal.task_details.status === 'APPROVED') ? (
                                        <>
                                            <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
                                                <h4 className="font-bold text-sm text-indigo-300 mb-2">{activeMilestoneModal.task_details.title}</h4>
                                                <p className="text-xs text-[var(--text-dim)] leading-relaxed whitespace-pre-wrap">{activeMilestoneModal.task_details.description}</p>
                                            </div>
                                            
                                            <div>
                                                <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">Starter Script</h4>
                                                <div className="relative group">
                                                    <pre className="p-4 bg-slate-950 rounded-xl text-xs text-indigo-300 font-mono overflow-x-auto border border-slate-800 custom-scrollbar">
                                                        <code>{activeMilestoneModal.task_details.starter_script}</code>
                                                    </pre>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="p-6 text-center bg-violet-500/5 border border-dashed border-violet-500/20 rounded-xl">
                                            <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
                                                <Clock size={20} className="text-violet-400 animate-pulse" />
                                            </div>
                                            <p className="text-xs text-violet-300 font-bold uppercase tracking-widest mb-1">Awaiting Review</p>
                                            <p className="text-[11px] text-[var(--text-muted)]">Your mentor is currently reviewing the practical task for this milestone.</p>
                                        </div>
                                    )}

                                    {isManagerOrAdmin && activeMilestoneModal.task_details.status === 'PENDING' && (
                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                onClick={() => handleReviewMilestoneTask(path?.milestones.findIndex(m => m.skill === activeMilestoneModal.skill) ?? -1, 'APPROVE')}
                                                gradient="emerald"
                                                fullWidth
                                                disabled={isReviewingTask}
                                                className="h-[40px] flex items-center justify-center gap-2"
                                            >
                                                {isReviewingTask ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                                {isReviewingTask ? 'Assigning...' : 'Approve & Assign'}
                                            </Button>
                                            <Button
                                                onClick={() => handleReviewMilestoneTask(path?.milestones.findIndex(m => m.skill === activeMilestoneModal.skill) ?? -1, 'REJECT')}
                                                variant="outline"
                                                disabled={isReviewingTask}
                                                className="px-4 text-red-400 border-red-500/30 hover:bg-red-500/5"
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-6 text-center bg-amber-500/5 border border-dashed border-amber-500/20 rounded-xl">
                                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                                        <Loader2 size={20} className="text-amber-400 animate-spin" />
                                    </div>
                                    <p className="text-xs text-amber-300 font-bold uppercase tracking-widest mb-1">Task Generating…</p>
                                    <p className="text-[11px] text-[var(--text-muted)] mb-3">The AI is building a hands-on task for this milestone.</p>
                                    {isManagerOrAdmin && (
                                        <Button
                                            onClick={() => handleGenerateMilestoneTask(activeMilestoneModal.skill, path?.milestones.findIndex(m => m.skill === activeMilestoneModal.skill) ?? -1)}
                                            gradient="purple"
                                            size="sm"
                                            disabled={isGeneratingTask}
                                            className="mx-auto"
                                        >
                                            {isGeneratingTask ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                                            Generate Now
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Dependencies */}
                        <div>
                            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 px-1">Required Dependencies</h3>
                            {activeMilestoneModal.prerequisites.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {activeMilestoneModal.prerequisites.map(p => {
                                        const prereqNode = path?.milestones.find(m => m.skill === p);
                                        const isDone = prereqNode?.status === 'COMPLETED';
                                        return (
                                            <div key={p} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${isDone ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-[var(--bg-muted)] border-[var(--border-color)] text-[var(--text-dim)]'}`}>
                                                {isDone ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                                {p}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-[var(--text-muted)] px-1">No mandatory prerequisites.</p>
                            )}
                        </div>

                        {/* Learning Resources */}
                        {activeMilestoneModal.resources.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 px-1">Learning Resources</h3>
                                <div className="space-y-2">
                                    {activeMilestoneModal.resources.map((r, i) => (
                                        <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                                            className="group flex items-center justify-between p-3 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-color)] hover:border-violet-500/30 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-[var(--bg-color)] rounded-lg text-violet-400 group-hover:text-violet-300">
                                                    {r.type.toLowerCase() === 'video' ? <Play size={16} /> : <BookOpen size={16} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[var(--text-main)] group-hover:text-violet-400 transition-colors uppercase tracking-tight">{r.title}</p>
                                                    <p className="text-[10px] text-[var(--text-muted)] font-mono truncate max-w-[200px] sm:max-w-xs">{r.url}</p>
                                                </div>
                                            </div>
                                            <span className="px-2 py-1 bg-[var(--bg-color)] border border-[var(--border-color)] rounded text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                                                {r.type}
                                            </span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-4 mt-6 border-t border-[var(--border-color)]">
                            <Button onClick={() => setActiveMilestoneModal(null)} variant="outline" fullWidth>
                                Close Milestone
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default LearningPath;
