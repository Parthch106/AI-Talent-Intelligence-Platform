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

interface RLRecommendation {
    action: string;
    difficulty: number;
    reasoning: string;
    q_values: number[];
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
    const [rlRecommendation, setRlRecommendation] = useState<RLRecommendation | null>(null);
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
            const perfRes = await api.get(`/analytics/performance/dashboard/${selectedInternId}/`);
            setPerformanceData(perfRes.data);
            
            // Fetch learning path with skills (non-essential)
            try {
                const pathRes = await api.get(`/analytics/learning-path/${selectedInternId}/progress/`);
                setLearningPath(pathRes.data);
                
                // Extract skills from learning path milestones
                if (pathRes.data?.milestones) {
                    const skillsFromMilestones = pathRes.data.milestones.map((m: any) => ({
                        skill_name: m.skill || m.area || 'Unknown Skill',
                        mastery_level: m.mastery || 0,
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
            
            // Try RL recommendation (optional)
            try {
                const rlRes = await api.post('/analytics/rl/assign-task/', { intern_id: selectedInternId });
                setRlRecommendation(rlRes.data);
            } catch (e) {
                console.warn('RL recommendation unavailable');
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
                        <Activity className="text-purple-500" />
                        Performance Analytics
                    </h1>
                    <p className="text-[var(--text-dim)] mt-1">Comprehensive intern performance insights and recommendations</p>
                </div>
                
                {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                    <div className="flex items-center gap-3">
                        <select
                            value={selectedInternId || ''}
                            onChange={(e) => setSelectedInternId(Number(e.target.value))}
                            className="bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-main)] focus:outline-none focus:border-purple-500"
                        >
                            <option value="">Select Intern</option>
                            {interns.map(intern => (
                                <option key={intern.id} value={intern.id}>
                                    {intern.full_name || intern.email}
                                </option>
                            ))}
                        </select>
                        <Button onClick={fetchAllData} variant="secondary" icon={<Activity size={18} />}>
                            Refresh
                        </Button>
                    </div>
                )}
            </div>

            <div className="glass-card-hover p-6 bg-gradient-to-br from-purple-600/10 via-transparent to-indigo-600/10 border-purple-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[100px] -mr-32 -mt-32 rounded-full"></div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-glow animate-float">
                            {(getInternName() || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-heading font-black text-white">{getInternName()}</h2>
                                <Badge variant={getStatusBadge(performanceData?.performance_status || 'UNKNOWN')}>
                                    {toTitleCase(performanceData?.performance_status || 'Not Evaluated')}
                                </Badge>
                            </div>
                            <p className="text-slate-400 mt-1 flex items-center gap-2">
                                <Calendar size={14} />
                                Data evaluated as of {performanceData?.evaluated_at ? new Date(performanceData.evaluated_at).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2 bg-black/20 px-10 py-5 rounded-3xl border border-white/5 backdrop-blur-xl">
                        <div className="text-center">
                            <p className="label-premium mb-1">Overall Readiness</p>
                            <p className={`text-5xl font-heading font-black tracking-tighter ${getReadinessColor(readinessScore)}`}>
                                {readinessScore}%
                            </p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-1">
                                {getPerformanceCategory(readinessScore)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="stats-card-premium group">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Award className="text-amber-400" size={24} />
                    </div>
                    <p className="label-premium mb-1">Quality Score</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-heading font-black text-white">
                            {Math.round((performanceData?.metrics?.quality_score ?? 0.0) * 100)}%
                        </p>
                        <span className="text-[10px] font-bold text-amber-400 capitalize opacity-80">
                            {getPerformanceCategory(Math.round((performanceData?.metrics?.quality_score ?? 0.0) * 100))}
                        </span>
                    </div>
                    <div className="w-full mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${(performanceData?.metrics?.quality_score ?? 0.0) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="stats-card-premium group">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <CheckCircle className="text-emerald-400" size={24} />
                    </div>
                    <p className="label-premium mb-1">Completion Rate</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-heading font-black text-white">
                            {Math.round((performanceData?.metrics?.completion_rate ?? 0.0) * 100)}%
                        </p>
                        <span className="text-[10px] font-bold text-emerald-400 capitalize opacity-80">
                            {getPerformanceCategory(Math.round((performanceData?.metrics?.completion_rate ?? 0.0) * 100))}
                        </span>
                    </div>
                    <div className="w-full mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${(performanceData?.metrics?.completion_rate ?? 0.0) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="stats-card-premium group">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <TrendingUp className="text-blue-400" size={24} />
                    </div>
                    <p className="label-premium mb-1">Growth Velocity</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-heading font-black text-white">
                            {Math.round((performanceData?.metrics?.growth_velocity ?? 0.0) * 100)}%
                        </p>
                        <span className="text-[10px] font-bold text-blue-400 capitalize opacity-80">
                            {getPerformanceCategory(Math.round((performanceData?.metrics?.growth_velocity ?? 0.0) * 100))}
                        </span>
                    </div>
                    <div className="w-full mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(performanceData?.metrics?.growth_velocity ?? 0.0) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="stats-card-premium group">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Activity className="text-purple-400" size={24} />
                    </div>
                    <p className="label-premium mb-1">Engagement</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-heading font-black text-white">
                            {Math.round((performanceData?.metrics?.engagement ?? 0.0) * 100)}%
                        </p>
                        <span className="text-[10px] font-bold text-purple-400 capitalize opacity-80">
                            {getPerformanceCategory(Math.round((performanceData?.metrics?.engagement ?? 0.0) * 100))}
                        </span>
                    </div>
                    <div className="w-full mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${(performanceData?.metrics?.engagement ?? 0.0) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-5">
                        <h3 className="text-lg font-semibold text-[var(--text-main)] mb-4 flex items-center gap-2">
                            <Brain className="text-purple-500" />
                            Skill Proficiency
                        </h3>
                        <div className="space-y-3">
                            {skillProfiles.length > 0 ? skillProfiles.slice(0, 8).map((skill, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className="w-32 text-sm text-[var(--text-dim)] truncate">{skill.skill_name}</div>
                                    <div className="flex-1 h-3 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${
                                                skill.mastery_level >= 0.8 ? 'bg-emerald-500' :
                                                skill.mastery_level >= 0.5 ? 'bg-blue-500' :
                                                'bg-yellow-500'
                                            }`}
                                            style={{ width: `${Math.min((skill.mastery_level || 0) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <div className="w-12 text-right text-sm text-[var(--text-dim)]">
                                        {Math.round((skill.mastery_level || 0) * 100)}%
                                    </div>
                                </div>
                            )) : (learningPath as any)?.milestones && (learningPath as any).milestones.length > 0 ? (
                                (learningPath as any).milestones.slice(0, 8).map((milestone: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className="w-32 text-sm text-[var(--text-dim)] truncate">{milestone.skill || 'Skill'}</div>
                                        <div className="flex-1 h-3 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                                            <div 
                                                className="h-full rounded-full bg-blue-500"
                                                style={{ width: '50%' }}
                                            />
                                        </div>
                                        <div className="w-12 text-right text-sm text-[var(--text-dim)]">
                                            {milestone.difficulty || 1}/5
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-4">
                                    <Award className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                                    <p className="text-[var(--text-dim)] text-sm">No skill data available</p>
                                    <p className="text-[var(--text-muted)] text-xs mt-1">Assign a learning path to track skills</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="p-5">
                        <h3 className="text-lg font-semibold text-[var(--text-main)] mb-4 flex items-center gap-2">
                            <BookOpen className="text-green-500" />
                            Learning Path Progress
                        </h3>
                        {learningPath ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-white font-medium">{learningPath.target_role_title || 'Target Role'}</span>
                                    <span className="text-purple-400 font-bold">{Math.round(learningPath.completion_percentage)}% Complete</span>
                                </div>
                                <div className="h-3 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                                        style={{ width: `${learningPath.completion_percentage}%` }}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="bg-[var(--bg-muted)] rounded-lg p-3">
                                        <p className="text-2xl font-bold text-[var(--text-main)]">{learningPath.milestones?.length || 0}</p>
                                        <p className="text-xs text-[var(--text-dim)]">Total</p>
                                    </div>
                                    <div className="bg-[var(--bg-muted)] rounded-lg p-3">
                                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{learningPath.completed_milestones?.length || 0}</p>
                                        <p className="text-xs text-[var(--text-dim)]">Done</p>
                                    </div>
                                    <div className="bg-[var(--bg-muted)] rounded-lg p-3">
                                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{learningPath.current_position || 0}</p>
                                        <p className="text-xs text-[var(--text-dim)]">Current</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-400">No learning path assigned yet</p>
                        )}
                    </Card>

                    <Card className="p-5">
                        <h3 className="text-lg font-semibold text-[var(--text-main)] mb-4 flex items-center gap-2">
                            <ListChecks className="text-orange-400" />
                            Recent Task History
                        </h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {taskHistory.length > 0 ? taskHistory.map((t) => (
                                <div key={t.id} className="flex items-center justify-between p-3 bg-[var(--bg-muted)] rounded-lg">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[var(--text-main)] text-sm font-medium truncate">{t.title}</p>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            {t.assigned_at ? new Date(t.assigned_at).toLocaleDateString() : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={getStatusBadge(t.status)} size="sm">
                                            {t.status}
                                        </Badge>
                                        {t.quality_rating && (
                                            <div className="flex items-center gap-1 text-amber-400">
                                                <Star size={12} fill="currentColor" />
                                                <span className="text-xs">{t.quality_rating}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <p className="text-[var(--text-dim)] text-sm">No task history available</p>
                            )}
                        </div>
                    </Card>

                    <div className="glass-card-hover p-6">
                        <h3 className="text-xl font-heading font-black text-white mb-6 flex items-center gap-3">
                            <BarChart3 className="text-cyan-400" />
                            Performance Trends
                        </h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-black/30 rounded-3xl p-6 border border-white/5 text-center">
                                <p className="label-premium mb-2">Completed</p>
                                <p className="text-4xl font-heading font-black text-white">
                                    {performanceData?.metrics?.completed_tasks ?? 0}
                                </p>
                            </div>
                            <div className="bg-black/30 rounded-3xl p-6 border border-white/5 text-center">
                                <p className="label-premium mb-2">In Progress</p>
                                <p className="text-4xl font-heading font-black text-blue-400">
                                    {performanceData?.metrics?.in_progress_tasks ?? 0}
                                </p>
                            </div>
                            <div className="bg-black/30 rounded-3xl p-6 border border-white/5 text-center">
                                <p className="label-premium mb-2">Quality</p>
                                <p className="text-4xl font-heading font-black text-amber-400">
                                    {performanceData?.metrics?.avg_quality !== undefined
                                        ? performanceData.metrics.avg_quality.toFixed(1)
                                        : '0.0'}
                                </p>
                            </div>
                            <div className="bg-black/30 rounded-3xl p-6 border border-white/5 text-center">
                                <p className="label-premium mb-2">Retention</p>
                                <p className={`text-4xl font-heading font-black ${
                                    (performanceData?.metrics?.dropout_risk ?? 0) > 0.6 ? 'text-red-400' :
                                    (performanceData?.metrics?.dropout_risk ?? 0) > 0.3 ? 'text-yellow-400' : 'text-emerald-400'
                                }`}>
                                    {Math.round((1 - (performanceData?.metrics?.dropout_risk ?? 0)) * 100)}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <Card className="p-5 bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/30">
                        <h3 className="text-lg font-semibold text-[var(--text-main)] mb-4 flex items-center gap-2">
                            <Sparkles className="text-purple-400" />
                            AI Insights
                        </h3>
                        <div className="space-y-3">
                            {performanceData?.reasoning ? (
                                typeof performanceData.reasoning === 'string' ? 
                                performanceData.reasoning.split('. ').filter(Boolean).slice(0, 4).map((insight: string, idx: number) => (
                                    <div key={idx} className="flex items-start gap-2 text-sm">
                                        <ChevronRight className="text-purple-400 flex-shrink-0 mt-0.5" size={16} />
                                        <p className="text-[var(--text-dim)]">{insight.trim()}</p>
                                    </div>
                                )) : (
                                    <div className="flex items-start gap-2 text-sm">
                                        <ChevronRight className="text-purple-400 flex-shrink-0 mt-0.5" size={16} />
                                        <p className="text-[var(--text-dim)]">{String(performanceData.reasoning)}</p>
                                    </div>
                                )
                            ) : performanceData?.diagnosis ? (
                                <div className="flex items-start gap-2 text-sm">
                                    <ChevronRight className="text-purple-400 flex-shrink-0 mt-0.5" size={16} />
                                    <p className="text-[var(--text-dim)]">{performanceData.diagnosis.summary || JSON.stringify(performanceData.diagnosis)}</p>
                                </div>
                            ) : (
                                <p className="text-[var(--text-dim)] text-sm">No insights available</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-5">
                        <h3 className="text-lg font-semibold text-[var(--text-main)] mb-4 flex items-center gap-2">
                            <Zap className="text-yellow-400" />
                            Recommendations
                        </h3>
                        <div className="space-y-2">
                            {performanceData?.recommendations?.length > 0 ? (
                                performanceData.recommendations.slice(0, 5).map((suggestion: string, idx: number) => (
                                    <div key={idx} className="flex items-start gap-2 p-2 bg-[var(--bg-muted)] rounded-lg">
                                        <Target className="text-yellow-400 flex-shrink-0 mt-0.5" size={14} />
                                        <p className="text-sm text-[var(--text-dim)]">{suggestion}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[var(--text-dim)] text-sm">No recommendations</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-5">
                        <h3 className="text-lg font-semibold text-[var(--text-main)] mb-4 flex items-center gap-2">
                            <Brain className="text-green-400" />
                            RL Recommended Task
                        </h3>
                        {rlRecommendation ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Badge variant="info">{rlRecommendation.action}</Badge>
                                    <span className="text-xs text-[var(--text-dim)]">Difficulty: {rlRecommendation.difficulty}/5</span>
                                </div>
                                <p className="text-sm text-[var(--text-dim)]">{rlRecommendation.reasoning}</p>
                                {rlRecommendation.q_values && rlRecommendation.q_values.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
                                        <p className="text-xs text-[var(--text-dim)] mb-1">Q-Values (action probabilities)</p>
                                        <div className="flex gap-1">
                                            {rlRecommendation.q_values.slice(0, 5).map((q, idx) => (
                                                <div key={idx} className="flex-1 bg-[var(--bg-muted)] rounded px-2 py-1 text-center">
                                                    <p className="text-xs text-[var(--text-dim)]">{q.toFixed(2)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <Brain className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                                <p className="text-[var(--text-dim)] text-sm">No RL recommendation available</p>
                                <p className="text-[var(--text-muted)] text-xs mt-1">Complete more tasks to get personalized recommendations</p>
                            </div>
                        )}
                    </Card>

                    <Card className="p-5">
                        <h3 className="text-lg font-semibold text-[var(--text-main)] mb-4 flex items-center gap-2">
                            <AlertTriangle className="text-orange-400" />
                            Status
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[var(--text-dim)]">Performance</span>
                                <Badge variant={getStatusBadge(performanceData?.performance_status || 'UNKNOWN')}>
                                    {performanceData?.performance_status || 'Not Evaluated'}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[var(--text-dim)]">Dropout Risk</span>
                                <span className={`font-medium ${
                                    (performanceData?.metrics?.dropout_risk ?? performanceData?.metrics?.risk ?? 0) < 30 ? 'text-emerald-400' :
                                    (performanceData?.metrics?.dropout_risk ?? performanceData?.metrics?.risk ?? 0) < 60 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                    {(performanceData?.metrics?.dropout_risk ?? performanceData?.metrics?.risk ?? 0) < 30 ? 'Low' :
                                     (performanceData?.metrics?.dropout_risk ?? performanceData?.metrics?.risk ?? 0) < 60 ? 'Medium' : 'High'}
                                </span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PerformanceAnalytics;
