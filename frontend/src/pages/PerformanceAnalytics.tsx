import React, { useState, useEffect } from 'react';
import { 
    User, TrendingUp, Brain, Award, AlertTriangle, CheckCircle, 
    Clock, Target, Zap, BookOpen, Activity, BarChart3, Star,
    ChevronRight, Sparkles, Users, Calendar, ListChecks
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

interface Intern {
    id: number;
    full_name: string;
    email: string;
    department: string;
}

interface SkillProfile {
    skill_name: string;
    mastery_level: number;
    learning_rate: number;
}

interface LearningPath {
    id: number;
    target_role_title: string;
    milestones: Milestone[];
    current_position: number;
    completed_milestones: string[];
    completion_percentage: number;
}

interface Milestone {
    skill: string;
    difficulty: number;
    estimated_hours: number;
    description: string;
}

interface TaskItem {
    id: number;
    title: string;
    status: string;
    priority: string;
    quality_rating: number | null;
    completed_at: string | null;
    assigned_at: string;
}

interface ActivityItem {
    type: string;
    title: string;
    description: string;
    timestamp: string;
}

const PerformanceAnalytics: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [selectedInternId, setSelectedInternId] = useState<number | null>(null);
    const [interns, setInterns] = useState<Intern[]>([]);
    
    const [performanceData, setPerformanceData] = useState<any>(null);
    const [skillProfiles, setSkillProfiles] = useState<SkillProfile[]>([]);
    const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
    const [taskHistory, setTaskHistory] = useState<TaskItem[]>([]);
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

    useEffect(() => {
        if (!user) return;
        
        if (user.role === 'INTERN') {
            setSelectedInternId(user.id);
        } else if (user.role === 'ADMIN' || user.role === 'MANAGER') {
            fetchInterns();
        }
    }, [user]);

    // Handle loading state when no intern selected
    useEffect(() => {
        // For managers/admins, wait for interns to load
        if ((user?.role === 'ADMIN' || user?.role === 'MANAGER') && interns.length === 0) {
            // Don't set loading false yet - still fetching interns
            return;
        }
        
        // For interns or when interns are loaded, if no intern selected, show empty state
        if (!selectedInternId) {
            setLoading(false);
        }
    }, [interns, selectedInternId, user]);

    // Fetch data when intern is selected
    useEffect(() => {
        if (selectedInternId && selectedInternId > 0) {
            // Set loading true before fetching
            setLoading(true);
            fetchAllData();
        } else {
            // No intern selected - stop loading
            setLoading(false);
        }
    }, [selectedInternId]);

    const fetchInterns = async () => {
        if (!user) return;
        try {
            let res;
            if (user.role === 'ADMIN') {
                // Admin gets all users with INTERN role
                res = await api.get('/accounts/users/?role=INTERN');
            } else if (user.role === 'MANAGER') {
                // Manager gets interns in their department
                res = await api.get('/interns/department-interns/');
            }
            
            if (res) {
                const internData = Array.isArray(res.data) ? res.data : res.data.results || [];
                setInterns(internData);
                
                // Only set selected intern if not already set and data is available
                if (internData.length > 0 && !selectedInternId) {
                    setSelectedInternId(internData[0].id);
                }
            }
        } catch (error) {
            console.error('Error fetching interns:', error);
            // Even on error, set loading to false to prevent infinite loading
            setLoading(false);
        }
    };

    const fetchAllData = async () => {
        if (!selectedInternId) return;
        setLoading(true);
        
        // Add timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
            console.warn('Data fetch timeout - setting loading to false');
            setLoading(false);
        }, 15000); // 15 second timeout
        
        try {
            // Fetch core data first (essential)
            const perfRes = await api.get(`/analytics/performance/dashboard/${selectedInternId}/?all_time=true`);
            setPerformanceData(perfRes.data);
            
            // Fetch learning path with skills (non-essential)
            try {
                const pathRes = await api.get(`/analytics/learning-path/${selectedInternId}/progress/`);
                setLearningPath(pathRes.data);
                
                // Extract skills from learning path milestones
                if (pathRes.data?.milestones) {
                    const skillsFromMilestones = pathRes.data.milestones.map((m: any) => ({
                        skill_name: m.skill || m.area || 'Unknown Skill',
                        mastery_level: m.current_mastery || m.mastery || 0,
                        learning_rate: 0
                    }));
                    setSkillProfiles(skillsFromMilestones);
                }
            } catch (e) {
                console.warn('Learning path unavailable');
            }
            
            // Fetch tasks (non-essential)
            try {
                const tasksRes = await api.get('/analytics/tasks/', { 
                    params: { 
                        intern_id: selectedInternId,
                        limit: 1000 
                    } 
                });
                const tasksData = Array.isArray(tasksRes.data.tasks) ? tasksRes.data.tasks : [];
                // Sort by completed_at or assigned_at to show most recent first
                const sortedTasks = tasksData.sort((a: any, b: any) => {
                    const dateA = a.completed_at || a.assigned_at || '';
                    const dateB = b.completed_at || b.assigned_at || '';
                    return new Date(dateB).getTime() - new Date(dateA).getTime();
                });
                setTaskHistory(sortedTasks.slice(0, 20));
            } catch (e) {
                console.warn('Tasks unavailable', e);
                setTaskHistory([]);
            }
            
            clearTimeout(timeoutId);
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('Error fetching performance data:', error);
            // Set some default data to prevent infinite loading
            setPerformanceData(null);
        } finally {
            setLoading(false);
        }
    };

    const getInternName = () => {
        if (user?.role === 'INTERN') return user.full_name || user.email;
        const intern = interns.find(i => i.id === selectedInternId);
        return intern?.full_name || intern?.email || 'Select Intern';
    };

    const calculateReadinessScore = () => {
        if (!performanceData) return 0;
        
        // If backend already provides the final score, use it (it's 0.0-1.0)
        if (performanceData.performance_score !== undefined) {
            return Math.round(performanceData.performance_score * 100);
        }
        
        if (!performanceData.metrics) return 0;
        const metrics = performanceData.metrics;
        
        // Handle both flat metrics and nested metrics structure (all 0.0-1.0)
        const quality = metrics.quality_score ?? metrics.quality ?? 0.0;
        const completion = metrics.completion_rate ?? metrics.completion ?? 0.0;
        const growth = metrics.growth_velocity ?? metrics.growth ?? 0.0;
        const engage = metrics.engagement ?? metrics.attendance_rate ?? 0.0;
        const difficulty = metrics.difficulty_handled ?? metrics.difficulty ?? 0.0;
        const risk = metrics.dropout_risk ?? metrics.risk ?? 0;
        
        const score = (
            quality * 0.25 +
            completion * 0.25 +
            growth * 0.15 +
            engage * 0.15 +
            difficulty * 0.10 +
            (1 - risk) * 0.10
        ) * 100;
        
        return Math.round(score);
    };

    const getReadinessColor = (score: number) => {
        if (score >= 75) return 'text-emerald-600 dark:text-emerald-400';
        if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
            'COMPLETED': 'success',
            'IN_PROGRESS': 'info',
            'ASSIGNED': 'default',
            'SUBMITTED': 'warning',
            'THRIVING': 'success',
            'STRUGGLING': 'danger',
            'COPING': 'warning',
            'DONE': 'success',
            'PENDING': 'warning',
            'ACTIVE': 'info'
        };
        return variants[status?.toUpperCase() || ''] || 'default';
    };

    // Helper to check if task is completed
    const isTaskCompleted = (status: string) => {
        const completedStatuses = ['COMPLETED', 'DONE', 'FINISHED', 'SUCCESS'];
        return completedStatuses.includes(status?.toUpperCase() || '');
    };

    const getPerformanceCategory = (score: number) => {
        if (score >= 90) return 'Excellent';
        if (score >= 75) return 'Good';
        if (score >= 50) return 'Fair';
        if (score > 0) return 'Needs Improvement';
        return 'No Data';
    };

    const toTitleCase = (str: string) => {
        if (!str) return '';
        return str.replace(
            /\w\S*/g,
            (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        ).replace(/_/g, ' ');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    // Show message when no intern selected
    if (!selectedInternId) {
        const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
        if (isManagerOrAdmin && interns.length === 0) {
            return (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Activity className="text-purple-400" />
                                Performance Analytics
                            </h1>
                            <p className="text-slate-400 mt-1">Comprehensive intern performance insights and recommendations</p>
                        </div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-8 text-center">
                        <Users className="mx-auto h-16 w-16 text-[var(--text-muted)] mb-4" />
                        <h3 className="text-xl font-semibold text-[var(--text-main)] mb-2">No Interns Found</h3>
                        <p className="text-[var(--text-dim)]">There are no interns in your department yet. Add interns to view their performance analytics.</p>
                    </div>
                </div>
            );
        }
        
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center animate-fade-in">
                    <div className="w-24 h-24 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-6 border border-purple-500/20">
                        <Users className="h-10 w-10 text-purple-400 opacity-50" />
                    </div>
                    <h2 className="text-2xl font-heading font-bold text-[var(--text-main)] mb-2">No Intern Selected</h2>
                    <p className="text-[var(--text-dim)] max-w-sm mx-auto">Please select an intern from the dropdown above to view their comprehensive performance analytics.</p>
                </div>
            </div>
        );
    }

    const readinessScore = calculateReadinessScore();

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                <div className="animate-slide-up">
                    <h1 className="text-3xl font-heading font-black text-[var(--text-main)] tracking-tighter flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
                            <Activity className="text-purple-400" size={24} />
                        </div>
                        PERFORMANCE <span className="text-purple-500">ANALYTICS</span>
                    </h1>
                    <p className="text-[var(--text-dim)] mt-1.5 font-medium text-sm">Real-time performance intelligence and AI-driven growth metrics</p>
                </div>
                
                {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                    <div className="flex items-center gap-4 animate-slide-in-right">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-purple-500/20 blur-xl group-hover:bg-purple-500/30 transition-all rounded-full"></div>
                            <select
                                value={selectedInternId || ''}
                                onChange={(e) => setSelectedInternId(Number(e.target.value))}
                                className="relative bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-2xl px-6 py-3 text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-bold text-sm min-w-[200px] cursor-pointer appearance-none"
                            >
                                <option value="">Select Intern</option>
                                {interns.map(intern => (
                                    <option key={intern.id} value={intern.id}>
                                        {intern.full_name || intern.email}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                                <Users size={16} />
                            </div>
                        </div>
                        <Button 
                            onClick={fetchAllData} 
                            variant="secondary" 
                            className="rounded-2xl px-6 py-3 font-bold text-xs uppercase tracking-widest border-[var(--border-color)] hover:bg-white/5 text-[var(--text-main)]"
                            icon={<Zap size={16} className="text-yellow-400" />}
                        >
                            Sync
                        </Button>
                    </div>
                )}
            </div>

            {/* Mission Control Hero Board */}
            <div className="relative group mb-8">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-[32px] blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                <div className="relative glass-card bg-[var(--card-bg)] backdrop-blur-3xl p-6 border-[var(--border-color)] overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-600/10 blur-[120px] -mr-48 -mt-48 rounded-full"></div>
                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-600/10 blur-[100px] -ml-32 -mb-32 rounded-full"></div>
                    
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-white/20 blur-2xl animate-pulse rounded-full"></div>
                                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-glow animate-float relative z-10 border border-white/20">
                                    {(getInternName() || 'U')[0].toUpperCase()}
                                </div>
                            </div>
                            
                            <div className="text-center md:text-left">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                    <h2 className="text-3xl md:text-4xl font-heading font-black text-[var(--text-main)] tracking-tighter">
                                        {getInternName()}
                                    </h2>
                                    <Badge variant={getStatusBadge(performanceData?.performance_status || 'UNKNOWN')} className="px-3 py-1 text-[10px] font-black rounded-xl border-[var(--border-color)]">
                                        {toTitleCase(performanceData?.performance_status || 'Not Evaluated')}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 mt-4">
                                    <p className="text-[var(--text-dim)] flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
                                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></div>
                                        Live Intelligence
                                    </p>
                                    <p className="text-[var(--text-muted)] flex items-center gap-2 text-sm">
                                        <Calendar size={16} />
                                        Updated: {performanceData?.evaluated_at ? new Date(performanceData.evaluated_at).toLocaleDateString(undefined, {month: 'long', day: 'numeric', year: 'numeric'}) : 'Waiting for sync...'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-center justify-center md:items-end w-full lg:w-auto">
                            <div className="bg-[var(--bg-muted)] border border-[var(--border-color)] backdrop-blur-2xl p-5 rounded-[32px] min-w-[240px] shadow-2xl relative overflow-hidden group/readiness">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover/readiness:opacity-100 transition-opacity duration-700"></div>
                                <div className="text-center relative z-10">
                                    <p className="label-premium mb-1 opacity-60">Overall Talent Score</p>
                                    <div className="flex items-center justify-center gap-1">
                                        <p className={`text-5xl font-heading font-black tracking-tighter leading-none ${getReadinessColor(readinessScore)}`}>
                                            {readinessScore}
                                        </p>
                                        <span className={`text-xl font-black self-end mb-1 ${getReadinessColor(readinessScore)}`}>%</span>
                                    </div>
                                    <div className="mt-3 flex items-center justify-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full mb-0.5 ${readinessScore >= 75 ? 'bg-emerald-500' : readinessScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)]">
                                            {getPerformanceCategory(readinessScore)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="stats-card-premium group relative overflow-hidden bg-[var(--card-bg)] border-[var(--border-color)] transition-all duration-700 p-4">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-3xl -mr-12 -mt-12 rounded-full group-hover:bg-amber-500/10 transition-all"></div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-lg shadow-amber-500/5">
                        <Award className="text-amber-400" size={20} />
                    </div>
                    <p className="label-premium mb-0.5 opacity-60">Quality Output</p>
                    <div className="flex items-baseline gap-1">
                        <p className="text-3xl font-heading font-black text-[var(--text-main)] tracking-tighter">
                            {Math.round((performanceData?.metrics?.quality_score ?? 0.0) * 100)}<span className="text-base opacity-40">%</span>
                        </p>
                    </div>
                    <div className="w-full mt-4 h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-1000"
                            style={{ width: `${(performanceData?.metrics?.quality_score ?? 0.0) * 100}%` }}
                        />
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500/60 mt-2">
                        {getPerformanceCategory(Math.round((performanceData?.metrics?.quality_score ?? 0.0) * 100))}
                    </p>
                </div>

                <div className="stats-card-premium group relative overflow-hidden bg-white/[0.02] border-white/5 hover:border-emerald-500/30 transition-all duration-700 p-4">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl -mr-12 -mt-12 rounded-full group-hover:bg-emerald-500/10 transition-all"></div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 shadow-lg shadow-emerald-500/5">
                        <CheckCircle className="text-emerald-400" size={20} />
                    </div>
                    <p className="label-premium mb-0.5 text-[var(--text-dim)] opacity-80">Completion Rate</p>
                    <div className="flex items-baseline gap-1">
                        <p className="text-3xl font-heading font-black text-[var(--text-main)] tracking-tighter">
                            {Math.round((performanceData?.metrics?.completion_rate ?? 0.0) * 100)}<span className="text-base opacity-40">%</span>
                        </p>
                    </div>
                    <div className="w-full mt-4 h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000"
                            style={{ width: `${(performanceData?.metrics?.completion_rate ?? 0.0) * 100}%` }}
                        />
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/60 mt-2">
                        {getPerformanceCategory(Math.round((performanceData?.metrics?.completion_rate ?? 0.0) * 100))}
                    </p>
                </div>

                <div className="stats-card-premium group relative overflow-hidden bg-white/[0.02] border-white/5 hover:border-blue-500/30 transition-all duration-700 p-4">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl -mr-12 -mt-12 rounded-full group-hover:bg-blue-500/10 transition-all"></div>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-lg shadow-blue-500/5">
                        <TrendingUp className="text-blue-400" size={20} />
                    </div>
                    <p className="label-premium mb-0.5 text-[var(--text-dim)] opacity-80">Growth Velocity</p>
                    <div className="flex items-baseline gap-1">
                        <p className="text-3xl font-heading font-black text-[var(--text-main)] tracking-tighter">
                            {Math.round((performanceData?.metrics?.growth_velocity ?? 0.0) * 100)}<span className="text-base opacity-40">%</span>
                        </p>
                    </div>
                    <div className="w-full mt-4 h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000"
                            style={{ width: `${(performanceData?.metrics?.growth_velocity ?? 0.0) * 100}%` }}
                        />
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500/60 mt-2">
                        {getPerformanceCategory(Math.round((performanceData?.metrics?.growth_velocity ?? 0.0) * 100))}
                    </p>
                </div>

                <div className="stats-card-premium group relative overflow-hidden bg-white/[0.02] border-white/5 hover:border-purple-500/30 transition-all duration-700 p-4">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-3xl -mr-12 -mt-12 rounded-full group-hover:bg-purple-500/10 transition-all"></div>
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 shadow-lg shadow-purple-500/5">
                        <Activity className="text-purple-400" size={20} />
                    </div>
                    <p className="label-premium mb-0.5 text-[var(--text-dim)] opacity-80">Engagement</p>
                    <div className="flex items-baseline gap-1">
                        <p className="text-3xl font-heading font-black text-[var(--text-main)] tracking-tighter">
                            {Math.round((performanceData?.metrics?.engagement ?? 0.0) * 100)}<span className="text-base opacity-40">%</span>
                        </p>
                    </div>
                    <div className="w-full mt-4 h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)] transition-all duration-1000"
                            style={{ width: `${(performanceData?.metrics?.engagement ?? 0.0) * 100}%` }}
                        />
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-500/60 mt-2">
                        {getPerformanceCategory(Math.round((performanceData?.metrics?.engagement ?? 0.0) * 100))}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Development Center */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Skill Proficiency & Learning Path Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass-card bg-[var(--card-bg)] border-[var(--border-color)] p-5 hover:border-purple-500/20 transition-all">
                            <h3 className="text-lg font-heading font-black text-[var(--text-main)] mb-5 flex items-center gap-3">
                                <Brain className="text-purple-400" size={18} />
                                Skill Proficiency
                            </h3>
                            <div className="space-y-5">
                                {skillProfiles.length > 0 ? skillProfiles.slice(0, 6).map((skill, idx) => (
                                    <div key={idx} className="group">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm font-bold text-[var(--text-dim)] group-hover:text-purple-400 transition-colors uppercase tracking-wider">{skill.skill_name}</span>
                                            <span className="text-sm font-black text-[var(--text-main)]">{Math.round((skill.mastery_level || 0) * 100)}%</span>
                                        </div>
                                        <div className="h-2 bg-[var(--bg-muted)] rounded-full overflow-hidden border border-[var(--border-color)]">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ${
                                                    skill.mastery_level >= 0.8 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' :
                                                    skill.mastery_level >= 0.5 ? 'bg-gradient-to-r from-blue-600 to-blue-400' :
                                                    'bg-gradient-to-r from-amber-600 to-amber-400'
                                                }`}
                                                style={{ width: `${Math.min((skill.mastery_level || 0) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-10 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                                        <Award className="mx-auto h-10 w-10 text-slate-700 mb-3" />
                                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">No Intelligence Data</p>
                                        <p className="text-slate-600 text-xs mt-1">Acquire skills through tasks to see analytics</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="glass-card bg-[var(--card-bg)] border-[var(--border-color)] p-5 hover:border-emerald-500/20 transition-all">
                            <h3 className="text-lg font-heading font-black text-[var(--text-main)] mb-5 flex items-center gap-3">
                                <BookOpen className="text-emerald-400" size={18} />
                                Learning Journey
                            </h3>
                            {learningPath ? (
                                <div className="space-y-6">
                                    <div className="p-4 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-2xl">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <Target className="text-emerald-400" size={16} />
                                                <span className="text-[var(--text-main)] font-black text-sm uppercase tracking-tighter">{learningPath.target_role_title || 'Target Role'}</span>
                                            </div>
                                            <span className="text-emerald-400 font-black text-lg">{Math.round(learningPath.completion_percentage)}%</span>
                                        </div>
                                        <div className="h-3 bg-[var(--bg-color)] rounded-full overflow-hidden p-0.5 border border-[var(--border-color)]">
                                            <div 
                                                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                                style={{ width: `${learningPath.completion_percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-2xl p-4 text-center group cursor-pointer hover:bg-white/[0.04] transition-all">
                                            <p className="text-2xl font-black text-white group-hover:scale-110 transition-transform">{learningPath.milestones?.length || 0}</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Total</p>
                                        </div>
                                    <div className="bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-2xl p-4 text-center group cursor-pointer hover:bg-white/[0.04] transition-all">
                                            <p className="text-2xl font-black text-emerald-400 group-hover:scale-110 transition-transform">{learningPath.completed_milestones?.length || 0}</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Done</p>
                                        </div>
                                    <div className="bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-2xl p-4 text-center group cursor-pointer hover:bg-white/[0.04] transition-all">
                                            <p className="text-2xl font-black text-blue-400 group-hover:scale-110 transition-transform">{learningPath.current_position || 1}</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Stage</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                                    <Zap className="mx-auto h-10 w-10 text-slate-700 mb-3" />
                                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Growth Path Pending</p>
                                    <p className="text-slate-600 text-xs mt-1">Assign a target role to unlock trajectory</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Task History Section */}
                    <div className="glass-card bg-[var(--card-bg)] border-[var(--border-color)] p-5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-heading font-black text-[var(--text-main)] flex items-center gap-3">
                                <ListChecks className="text-blue-400" size={18} />
                                EXECUTION LOG
                            </h3>
                            <button className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-blue-400 transition-colors">Archive</button>
                        </div>
                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                            {taskHistory.length > 0 ? taskHistory.map((t) => (
                                <div key={t.id} className="group relative bg-[var(--bg-muted)] border border-[var(--border-color)] hover:border-blue-500/20 p-4 rounded-[20px] transition-all duration-300 hover:translate-x-1">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-[var(--text-main)] font-bold truncate text-sm group-hover:text-blue-400 transition-colors uppercase tracking-tight">{t.title}</p>
                                                <Badge variant={getStatusBadge(t.status)} className="px-2 py-0.5 text-[8px] font-black rounded-lg uppercase">
                                                    {t.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1">
                                                    <Calendar size={10} />
                                                    {t.assigned_at ? new Date(t.assigned_at).toLocaleDateString() : 'N/A'}
                                                </p>
                                                {t.quality_rating && (
                                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/5 border border-amber-500/10 rounded-full">
                                                        <Star size={10} className="text-amber-500" fill="currentColor" />
                                                        <span className="text-[9px] font-black text-amber-500">{t.quality_rating.toFixed(1)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-all">
                                            <ChevronRight size={16} />
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-6 opacity-40 text-[var(--text-muted)] text-xs">No activity detected.</div>
                            )}
                        </div>
                    </div>

                    {/* Meta Performance Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="glass-card bg-[var(--bg-muted)] border border-[var(--border-color)] p-4 text-center hover:bg-white/[0.03] transition-all">
                            <p className="text-2xl font-heading font-black text-[var(--text-main)]">{performanceData?.metrics?.completed_tasks ?? 0}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">Completed</p>
                        </div>
                        <div className="glass-card bg-[var(--bg-muted)] border border-[var(--border-color)] p-4 text-center hover:bg-white/[0.03] transition-all">
                            <p className="text-2xl font-heading font-black text-blue-400">{performanceData?.metrics?.in_progress_tasks ?? 0}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">Active</p>
                        </div>
                        <div className="glass-card bg-[var(--bg-muted)] border border-[var(--border-color)] p-4 text-center hover:bg-white/[0.03] transition-all">
                            <p className="text-2xl font-heading font-black text-amber-400">
                                {performanceData?.metrics?.avg_quality !== undefined ? performanceData.metrics.avg_quality.toFixed(1) : '0.0'}
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">Avg Quality</p>
                        </div>
                        <div className="glass-card bg-[var(--bg-muted)] border border-[var(--border-color)] p-4 text-center hover:bg-white/[0.03] transition-all">
                            <p className={`text-2xl font-heading font-black ${
                                (performanceData?.metrics?.dropout_risk ?? 0) > 0.6 ? 'text-red-500' :
                                (performanceData?.metrics?.dropout_risk ?? 0) > 0.3 ? 'text-yellow-500' : 'text-emerald-500'
                            }`}>
                                {Math.round((1 - (performanceData?.metrics?.dropout_risk ?? 0)) * 100)}%
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">Integrity</p>
                        </div>
                    </div>
                </div>

                {/* Right Column: AI Copilot Portal */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="relative group sticky top-8">
                        <div className="absolute -inset-0.5 bg-gradient-to-b from-purple-600/30 to-blue-600/30 rounded-[32px] blur opacity-50"></div>
                        <div className="relative glass-card bg-[var(--card-bg)] backdrop-blur-3xl p-6 border border-[var(--border-color)] overflow-hidden min-h-[500px]">
                            {/* AI Scanning Effect */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-pulse shadow-[0_0_15px_rgba(139,92,246,0.5)]"></div>
                            
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                    <Sparkles className="text-white" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-heading font-black text-[var(--text-main)] tracking-tighter">AI COPILOT</h3>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">Analysis Active</p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <section>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Brain className="text-purple-400" size={14} />
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Diagnostic Insights</h4>
                                    </div>
                                    <div className="space-y-3">
                                        {performanceData?.reasoning ? (
                                            typeof performanceData.reasoning === 'string' ? 
                                            performanceData.reasoning.split('. ').filter(Boolean).slice(0, 5).map((insight: string, idx: number) => (
                                                <div key={idx} className="flex items-start gap-3 p-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-[20px] transition-all hover:bg-white/[0.04]">
                                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]"></div>
                                                    <p className="text-xs text-[var(--text-dim)] leading-relaxed font-medium">{insight.trim()}.</p>
                                                </div>
                                            )) : (
                                                <div className="p-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-[20px]">
                                                    <p className="text-xs text-[var(--text-dim)]">Processing neural patterns...</p>
                                                </div>
                                            )
                                        ) : (
                                            <div className="text-center py-6 opacity-30 text-[var(--text-muted)] text-xs">Awaiting diagnostic sequence...</div>
                                        )}
                                    </div>
                                </section>

                                <section>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Zap className="text-yellow-400" size={14} />
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Growth Strategies</h4>
                                    </div>
                                    <div className="space-y-2">
                                        {performanceData?.recommendations?.length > 0 ? (
                                            performanceData.recommendations.map((suggestion: string, idx: number) => (
                                                <div key={idx} className="flex items-center gap-3 p-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-[20px] group cursor-pointer hover:border-yellow-500/30 transition-all">
                                                    <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-400 group-hover:bg-yellow-500/20 transition-all">
                                                        <Target size={12} />
                                                    </div>
                                                    <p className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-tight">{suggestion}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-4 border border-dashed border-[var(--border-color)] rounded-[20px] text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">No strategic path ready</div>
                                        )}
                                    </div>
                                </section>

                                <section>
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle className="text-orange-400" size={14} />
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Real-time Status</h4>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between p-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-2xl">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Performance</span>
                                            <Badge variant={getStatusBadge(performanceData?.performance_status || 'UNKNOWN')} className="px-2 py-0.5 text-[9px] font-black rounded-lg">
                                                {performanceData?.performance_status || 'N/A'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-2xl">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Attrition Risk</span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                                                (performanceData?.metrics?.dropout_risk ?? performanceData?.metrics?.risk ?? 0) < 0.3 ? 'text-emerald-400' :
                                                (performanceData?.metrics?.dropout_risk ?? performanceData?.metrics?.risk ?? 0) < 0.6 ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                                {(performanceData?.metrics?.dropout_risk ?? performanceData?.metrics?.risk ?? 0) < 0.3 ? 'Low Risk' :
                                                 (performanceData?.metrics?.dropout_risk ?? performanceData?.metrics?.risk ?? 0) < 0.6 ? 'Elevated' : 'Critical'}
                                            </span>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PerformanceAnalytics;
