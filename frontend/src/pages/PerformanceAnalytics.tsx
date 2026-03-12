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
                const tasksRes = await api.get(`/analytics/tasks/?intern_id=${selectedInternId}&limit=50`);
                const tasks = Array.isArray(tasksRes.data) ? tasksRes.data : 
                              tasksRes.data?.results || [];
                // Sort by completed_at or assigned_at to show most recent first
                const sortedTasks = tasks.sort((a: any, b: any) => {
                    const dateA = a.completed_at || a.assigned_at || '';
                    const dateB = b.completed_at || b.assigned_at || '';
                    return new Date(dateB).getTime() - new Date(dateA).getTime();
                });
                setTaskHistory(sortedTasks.slice(0, 15));
            } catch (e) {
                console.warn('Tasks unavailable');
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
        if (!performanceData?.metrics) return 0;
        const metrics = performanceData.metrics;
        // Handle both flat metrics and nested metrics structure
        const quality = metrics.quality_score ?? metrics.quality ?? 0;
        const completion = metrics.completion_rate ?? metrics.completion ?? 0;
        const growth = metrics.growth_velocity ?? metrics.growth ?? 0;
        const engage = metrics.engagement ?? metrics.attendance_rate ?? 0;
        const difficulty = metrics.difficulty_handled ?? metrics.difficulty ?? 0;
        const risk = metrics.dropout_risk ?? metrics.risk ?? 0;
        
        const score = (
            quality * 0.25 +
            completion * 0.25 +
            growth * 0.15 +
            engage * 0.15 +
            difficulty * 0.10 +
            ((100 - risk) / 100) * 0.10
        ) * 100;
        return Math.round(score);
    };

    const getReadinessColor = (score: number) => {
        if (score >= 75) return 'text-emerald-400';
        if (score >= 50) return 'text-yellow-400';
        return 'text-red-400';
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    // Show message when no intern selected (for managers/admins with no interns)
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
                        <Users className="mx-auto h-16 w-16 text-slate-400 mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No Interns Found</h3>
                        <p className="text-slate-400">There are no interns in your department yet. Add interns to view their performance analytics.</p>
                    </div>
                </div>
            );
        }
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Activity className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                    <p className="text-slate-400">Select an intern to view performance data</p>
                </div>
            </div>
        );
    }

    const readinessScore = calculateReadinessScore();

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
                
                {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                    <div className="flex items-center gap-3">
                        <select
                            value={selectedInternId || ''}
                            onChange={(e) => setSelectedInternId(Number(e.target.value))}
                            className="bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
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

            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            {(getInternName() || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-white">{getInternName()}</h2>
                            <p className="text-sm text-slate-400">{performanceData?.performance_status || 'Performance Overview'}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-400">Overall Readiness Score</p>
                        <p className={`text-4xl font-bold ${getReadinessColor(readinessScore)}`}>
                            {readinessScore}%
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-400">Quality Score</p>
                            <p className="text-2xl font-bold text-white">
                                {Math.round((performanceData?.metrics?.quality_score ?? performanceData?.metrics?.quality ?? 0) * 100)}%
                            </p>
                        </div>
                        <Award className="text-amber-400" size={24} />
                    </div>
                    <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                            style={{ width: `${(performanceData?.metrics?.quality_score ?? performanceData?.metrics?.quality ?? 0) * 100}%` }}
                        />
                    </div>
                </Card>

                <Card className="p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-400">Completion Rate</p>
                            <p className="text-2xl font-bold text-white">
                                {Math.round((performanceData?.metrics?.completion_rate ?? performanceData?.metrics?.completion ?? 0) * 100)}%
                            </p>
                        </div>
                        <CheckCircle className="text-emerald-400" size={24} />
                    </div>
                    <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                            style={{ width: `${(performanceData?.metrics?.completion_rate ?? performanceData?.metrics?.completion ?? 0) * 100}%` }}
                        />
                    </div>
                </Card>

                <Card className="p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-400">Growth Velocity</p>
                            <p className="text-2xl font-bold text-white">
                                {Math.round((performanceData?.metrics?.growth_velocity ?? performanceData?.metrics?.growth ?? 0) * 100)}%
                            </p>
                        </div>
                        <TrendingUp className="text-blue-400" size={24} />
                    </div>
                    <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                            style={{ width: `${(performanceData?.metrics?.growth_velocity ?? performanceData?.metrics?.growth ?? 0) * 100}%` }}
                        />
                    </div>
                </Card>

                <Card className="p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-400">Engagement</p>
                            <p className="text-2xl font-bold text-white">
                                {Math.round((performanceData?.metrics?.engagement ?? performanceData?.metrics?.attendance_rate ?? 0) * 100)}%
                            </p>
                        </div>
                        <Activity className="text-purple-400" size={24} />
                    </div>
                    <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                            style={{ width: `${(performanceData?.metrics?.engagement ?? performanceData?.metrics?.attendance_rate ?? 0) * 100}%` }}
                        />
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-5">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Brain className="text-purple-400" />
                            Skill Proficiency
                        </h3>
                        <div className="space-y-3">
                            {skillProfiles.length > 0 ? skillProfiles.slice(0, 8).map((skill, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className="w-32 text-sm text-slate-300 truncate">{skill.skill_name}</div>
                                    <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${
                                                skill.mastery_level >= 0.8 ? 'bg-emerald-500' :
                                                skill.mastery_level >= 0.5 ? 'bg-blue-500' :
                                                'bg-yellow-500'
                                            }`}
                                            style={{ width: `${Math.min((skill.mastery_level || 0) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <div className="w-12 text-right text-sm text-slate-400">
                                        {Math.round((skill.mastery_level || 0) * 100)}%
                                    </div>
                                </div>
                            )) : (learningPath as any)?.milestones && (learningPath as any).milestones.length > 0 ? (
                                (learningPath as any).milestones.slice(0, 8).map((milestone: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className="w-32 text-sm text-slate-300 truncate">{milestone.skill || 'Skill'}</div>
                                        <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full rounded-full bg-blue-500"
                                                style={{ width: '50%' }}
                                            />
                                        </div>
                                        <div className="w-12 text-right text-sm text-slate-400">
                                            {milestone.difficulty || 1}/5
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-4">
                                    <Award className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                                    <p className="text-slate-400 text-sm">No skill data available</p>
                                    <p className="text-slate-500 text-xs mt-1">Assign a learning path to track skills</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="p-5">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <BookOpen className="text-green-400" />
                            Learning Path Progress
                        </h3>
                        {learningPath ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-white font-medium">{learningPath.target_role_title || 'Target Role'}</span>
                                    <span className="text-purple-400 font-bold">{Math.round(learningPath.completion_percentage)}% Complete</span>
                                </div>
                                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                                        style={{ width: `${learningPath.completion_percentage}%` }}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <p className="text-2xl font-bold text-white">{learningPath.milestones?.length || 0}</p>
                                        <p className="text-xs text-slate-400">Total</p>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <p className="text-2xl font-bold text-emerald-400">{learningPath.completed_milestones?.length || 0}</p>
                                        <p className="text-xs text-slate-400">Done</p>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <p className="text-2xl font-bold text-blue-400">{learningPath.current_position || 0}</p>
                                        <p className="text-xs text-slate-400">Current</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-400">No learning path assigned yet</p>
                        )}
                    </Card>

                    <Card className="p-5">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <ListChecks className="text-orange-400" />
                            Recent Task History
                        </h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {taskHistory.length > 0 ? taskHistory.map((t) => (
                                <div key={t.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">{t.title}</p>
                                        <p className="text-xs text-slate-500">
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
                                <p className="text-slate-400 text-sm">No task history available</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-5">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <BarChart3 className="text-cyan-400" />
                            Performance Trends
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                                <p className="text-3xl font-bold text-white">{taskHistory.filter(t => isTaskCompleted(t.status)).length}</p>
                                <p className="text-xs text-slate-400 mt-1">Tasks Completed</p>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                                <p className="text-3xl font-bold text-blue-400">{taskHistory.filter(t => t.status === 'IN_PROGRESS').length}</p>
                                <p className="text-xs text-slate-400 mt-1">In Progress</p>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                                <p className="text-3xl font-bold text-yellow-400">
                                    {taskHistory.length > 0 
                                        ? (taskHistory.reduce((sum, t) => sum + (t.quality_rating || 0), 0) / taskHistory.filter(t => t.quality_rating).length || 0).toFixed(1)
                                        : 'N/A'}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">Avg Quality</p>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                                <p className={`text-3xl font-bold ${
                                    (performanceData?.metrics?.dropout_risk ?? performanceData?.metrics?.risk ?? 0) < 30 ? 'text-emerald-400' :
                                    (performanceData?.metrics?.dropout_risk ?? performanceData?.metrics?.risk ?? 0) < 60 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                    {Math.round(100 - (performanceData?.metrics?.dropout_risk ?? performanceData?.metrics?.risk ?? 0))}%
                                </p>
                                <p className="text-xs text-slate-400 mt-1">Retention</p>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-5 bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/30">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Sparkles className="text-purple-400" />
                            AI Insights
                        </h3>
                        <div className="space-y-3">
                            {performanceData?.reasoning ? (
                                typeof performanceData.reasoning === 'string' ? 
                                performanceData.reasoning.split('. ').filter(Boolean).slice(0, 4).map((insight: string, idx: number) => (
                                    <div key={idx} className="flex items-start gap-2 text-sm">
                                        <ChevronRight className="text-purple-400 flex-shrink-0 mt-0.5" size={16} />
                                        <p className="text-slate-300">{insight.trim()}</p>
                                    </div>
                                )) : (
                                    <div className="flex items-start gap-2 text-sm">
                                        <ChevronRight className="text-purple-400 flex-shrink-0 mt-0.5" size={16} />
                                        <p className="text-slate-300">{String(performanceData.reasoning)}</p>
                                    </div>
                                )
                            ) : performanceData?.diagnosis ? (
                                <div className="flex items-start gap-2 text-sm">
                                    <ChevronRight className="text-purple-400 flex-shrink-0 mt-0.5" size={16} />
                                    <p className="text-slate-300">{performanceData.diagnosis.summary || JSON.stringify(performanceData.diagnosis)}</p>
                                </div>
                            ) : (
                                <p className="text-slate-400 text-sm">No insights available</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-5">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Zap className="text-yellow-400" />
                            Recommendations
                        </h3>
                        <div className="space-y-2">
                            {performanceData?.recommendations?.length > 0 ? (
                                performanceData.recommendations.slice(0, 5).map((suggestion: string, idx: number) => (
                                    <div key={idx} className="flex items-start gap-2 p-2 bg-slate-800/30 rounded-lg">
                                        <Target className="text-yellow-400 flex-shrink-0 mt-0.5" size={14} />
                                        <p className="text-sm text-slate-300">{suggestion}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-400 text-sm">No recommendations</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-5">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Brain className="text-green-400" />
                            RL Recommended Task
                        </h3>
                        {rlRecommendation ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Badge variant="info">{rlRecommendation.action}</Badge>
                                    <span className="text-xs text-slate-400">Difficulty: {rlRecommendation.difficulty}/5</span>
                                </div>
                                <p className="text-sm text-slate-300">{rlRecommendation.reasoning}</p>
                                {rlRecommendation.q_values && rlRecommendation.q_values.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-slate-700">
                                        <p className="text-xs text-slate-400 mb-1">Q-Values (action probabilities)</p>
                                        <div className="flex gap-1">
                                            {rlRecommendation.q_values.slice(0, 5).map((q, idx) => (
                                                <div key={idx} className="flex-1 bg-slate-700 rounded px-2 py-1 text-center">
                                                    <p className="text-xs text-slate-300">{q.toFixed(2)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <Brain className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                                <p className="text-slate-400 text-sm">No RL recommendation available</p>
                                <p className="text-slate-500 text-xs mt-1">Complete more tasks to get personalized recommendations</p>
                            </div>
                        )}
                    </Card>

                    <Card className="p-5">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <AlertTriangle className="text-orange-400" />
                            Status
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">Performance</span>
                                <Badge variant={getStatusBadge(performanceData?.performance_status || 'UNKNOWN')}>
                                    {performanceData?.performance_status || 'Not Evaluated'}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">Dropout Risk</span>
                                <span className={`font-medium ${
                                    (performanceData?.metrics?.dropout_risk ?? performanceData?.metrics?.risk ?? 0) < 30 ? 'text-emerald-400' :
                                    (performanceData?.metrics?.dropout_risk ?? performanceData?.metrics?.risk ?? 0) < 60 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                    {(performanceData?.metrics?.dropout_risk ?? performanceData?.metrics?.risk ?? 0) < 30 ? 'Low' :
                                     (performanceData?.metrics?.dropout_risk ?? performanceData?.metrics?.risk ?? 0) < 60 ? 'Medium' : 'High'}
                                </span>
                            </div>
                            {performanceData?.next_task_type && (
                                <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                                    <span className="text-slate-400">Recommended Task</span>
                                    <span className="text-white text-sm">{performanceData.next_task_type}</span>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PerformanceAnalytics;
