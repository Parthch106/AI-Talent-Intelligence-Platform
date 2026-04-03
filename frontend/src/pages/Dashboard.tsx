import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, TrendingUp, Users, CheckCircle2, FolderKanban, Zap, ArrowRight, Clock, Award, Activity, FileText, CheckSquare } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import StatsCard from '../components/common/StatsCard';

interface Project {
    id: number;
    name: string;
    status: string;
    description: string;
    tech_stack: string[];
    mentor: {
        full_name: string;
    } | null;
}

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>({});
    const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Don't fetch until we have user info
        if (!user) {
            setLoading(false);
            return;
        }
        
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch all data with individual error handling
                let statsData = {};
                let projectsData: any[] = [];
                let activities: any[] = [];
                let alerts: any[] = [];

                try {
                    const res = await api.get('/analytics/summary/');
                    statsData = res.data;
                } catch (e) {
                    console.warn('Failed to fetch stats:', e);
                }

                try {
                    const res = await api.get('/projects/projects/');
                    projectsData = res.data;
                } catch (e) {
                    console.warn('Failed to fetch projects:', e);
                }

                try {
                    const res = await api.get('/notifications/activity/');
                    activities = res.data.activities || [];
                } catch (e) {
                    console.warn('Failed to fetch activities:', e);
                }

                try {
                    const res = await api.get('/notifications/dashboard/');
                    alerts = res.data.alerts || [];
                } catch (e) {
                    console.warn('Failed to fetch alerts:', e);
                }

                setStats(statsData);
                setActivities(activities);
                setAlerts(alerts);

                // For interns, filter to show only assigned projects
                if (user?.role === 'INTERN') {
                    setAssignedProjects(projectsData);
                }
            } catch (error: any) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user?.id]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED': return <Badge variant="success" withDot>Completed</Badge>;
            case 'IN_PROGRESS': return <Badge variant="purple" withDot pulse>In Progress</Badge>;
            case 'ON_HOLD': return <Badge variant="warning" withDot>On Hold</Badge>;
            default: return <Badge variant="default">{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                    <p className="text-[var(--text-dim)] animate-pulse">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    let statItems: any[] = [];

    if (user?.role === 'ADMIN') {
        statItems = [
            { label: 'Total Managers', value: stats.total_managers ?? '...', icon: <Users size={24} />, color: 'from-pink-500 to-rose-500', trend: '+12%', trendUp: true },
            { label: 'Total Interns', value: stats.total_interns ?? '...', icon: <Users size={24} />, color: 'from-purple-500 to-indigo-500', trend: '+8%', trendUp: true },
            { label: 'Total Projects', value: stats.total_projects ?? '...', icon: <FolderKanban size={24} />, color: 'from-blue-500 to-cyan-500', trend: '+5', trendUp: true },
            { label: 'Active Projects', value: stats.active_projects ?? '...', icon: <TrendingUp size={24} />, color: 'from-emerald-500 to-teal-500', trend: 'Active', trendUp: true },
        ];
    } else if (user?.role === 'MANAGER') {
        statItems = [
            { label: 'My Interns', value: stats.total_interns ?? '0', icon: <Users size={24} />, color: 'from-purple-500 to-pink-500', trend: 'Assigned', trendUp: true },
            { label: 'My Projects', value: stats.total_projects ?? '0', icon: <FolderKanban size={24} />, color: 'from-blue-500 to-indigo-500', trend: 'Mentored', trendUp: true },
            { label: 'Active Projects', value: stats.active_projects ?? '0', icon: <Activity size={24} />, color: 'from-emerald-500 to-green-500', trend: 'Ongoing', trendUp: true },
            { label: 'Pending Reviews', value: stats.pending_reviews ?? '0', icon: <AlertCircle size={24} />, color: 'from-amber-500 to-orange-500', trend: 'Action Needed', trendUp: false },
        ];
    } else if (user?.role === 'INTERN') {
        statItems = [
            { label: 'Assigned Projects', value: stats.assigned_projects ?? '0', icon: <FolderKanban size={24} />, color: 'from-purple-500 to-indigo-500', trend: 'To Do', trendUp: true },
            { label: 'Completed', value: stats.completed_projects ?? '0', icon: <CheckCircle2 size={24} />, color: 'from-emerald-500 to-teal-500', trend: 'Done', trendUp: true },
            { label: 'Feedback Score', value: stats.average_score ?? 'N/A', icon: <Award size={24} />, color: 'from-amber-500 to-yellow-500', trend: 'Performance', trendUp: true },
        ];
    }

    return (
        <div className="space-y-10 animate-fade-in pb-12">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-heading font-black tracking-tighter text-[var(--text-main)] mb-2 uppercase">
                        Dashboard <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Overview</span>
                    </h1>
                    <p className="text-[var(--text-dim)] font-bold uppercase text-[10px] tracking-[0.2em]">Welcome back, Commander</p>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl text-xs font-black uppercase tracking-widest text-[var(--text-dim)]">
                    <Clock size={14} className="text-purple-500" />
                    Last Sync: Just now
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {statItems.map((stat, i) => (
                    <StatsCard
                        key={i}
                        title={stat.label}
                        value={stat.value}
                        icon={stat.icon}
                        gradient={stat.color}
                        trend={{
                            value: typeof stat.trend === 'string' ? (parseInt(stat.trend) || 0) : (stat.trend || 0),
                            isPositive: !!stat.trendUp
                        }}
                    />
                ))}
            </div>

            {/* Assigned Projects Section for Interns */}
            {user?.role === 'INTERN' && assignedProjects.length > 0 && (
                <div className="animate-slide-up">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl">
                                <FolderKanban size={20} className="text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-[var(--text-main)]">My Assigned Projects</h2>
                                <p className="text-sm text-[var(--text-dim)]">Your current project assignments</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {assignedProjects.map((project) => (
                            <Card key={project.id} hover className="group">
                                <div className="flex items-start justify-between mb-4">
                                    <h4 className="font-semibold text-[var(--text-main)] group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">{project.name}</h4>
                                    {getStatusBadge(project.status)}
                                </div>
                                <p className="text-sm text-[var(--text-dim)] mb-4 line-clamp-2">
                                    {project.description?.substring(0, 100)}...
                                </p>
                                {project.tech_stack && project.tech_stack.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {project.tech_stack.slice(0, 3).map((tech, index) => (
                                            <span key={index} className="px-2 py-1 text-xs font-medium bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 rounded-lg border border-purple-500/20">
                                                {tech}
                                            </span>
                                        ))}
                                        {project.tech_stack.length > 3 && (
                                            <span className="px-2 py-1 text-xs font-medium bg-[var(--bg-muted)] text-[var(--text-dim)] rounded-lg">
                                                +{project.tech_stack.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-sm text-[var(--text-dim)] pt-4 border-t border-[var(--border-color)]">
                                    <Users size={14} className="text-purple-400" />
                                    Mentor: {project.mentor?.full_name || 'Unassigned'}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Activity and Alerts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <Card className="lg:col-span-2" icon={<Activity size={20} />} title="Recent Activity" subtitle="Your latest updates">
                    <div className="space-y-4">
                        {activities.length > 0 ? (
                            activities.slice(0, 5).map((activity, i) => (
                                <div 
                                    key={i} 
                                    className="flex items-center gap-4 p-4 rounded-xl bg-[var(--card-bg)] hover:bg-purple-500/[0.05] transition-colors cursor-pointer group border border-[var(--border-color)]"
                                    onClick={() => activity.link && navigate(activity.link)}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                                        activity.color === 'green' ? 'bg-emerald-500/20 border-emerald-500/20' :
                                        activity.color === 'purple' ? 'bg-purple-500/20 border-purple-500/20' :
                                        'bg-blue-500/20 border-blue-500/20'
                                    }`}>
                                        {activity.icon === 'check-circle' ? (
                                            <CheckSquare size={16} className="text-emerald-400" />
                                        ) : activity.icon === 'clipboard' ? (
                                            <FileText size={16} className="text-purple-400" />
                                        ) : (
                                            <Zap size={16} className="text-purple-400" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-[var(--text-main)] group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors uppercase tracking-tight">
                                            {activity.description}
                                        </p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">
                                            {new Date(activity.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <ArrowRight size={16} className="text-[var(--text-muted)] group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-[var(--text-muted)]">
                                <Activity size={32} className="mx-auto mb-2 opacity-50" />
                                <p>No recent activity</p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Alerts */}
                <Card
                    className="border-red-500/20"
                    icon={<AlertCircle size={20} className="text-red-400" />}
                    title="Alerts"
                    subtitle="Important notifications"
                >
                    <div className="space-y-3">
                        {alerts.length > 0 ? (
                            alerts.map((alert, i) => (
                                <div key={i} className={`p-4 rounded-xl border ${
                                    alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                                    alert.type === 'error' ? 'bg-red-500/10 border-red-500/20' :
                                    'bg-blue-500/10 border-blue-500/20'
                                }`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${
                                            alert.type === 'warning' ? 'bg-amber-500' :
                                            alert.type === 'error' ? 'bg-red-500' :
                                            'bg-blue-500'
                                        }`}></div>
                                        <span className={`text-sm font-medium ${
                                            alert.type === 'warning' ? 'text-amber-400' :
                                            alert.type === 'error' ? 'text-red-400' :
                                            'text-blue-400'
                                        }`}>
                                            {alert.title}
                                        </span>
                                    </div>
                                    <p className="text-sm text-[var(--text-dim)]">
                                        {alert.message}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">All Clear</span>
                                </div>
                                <p className="text-sm text-[var(--text-dim)]">
                                    No alerts at this time.
                                </p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
