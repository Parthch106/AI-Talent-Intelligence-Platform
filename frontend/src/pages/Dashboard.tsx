import React, { useEffect, useState } from 'react';
import { AlertCircle, TrendingUp, Users, CheckCircle2, FolderKanban } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

interface User {
    id: number;
    full_name: string;
    email: string;
}

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
    const [stats, setStats] = useState<any>({});
    const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const statsRes = api.get('/analytics/summary/');
                const projectsRes = api.get('/projects/projects/');

                const [statsData, projectsData] = await Promise.all([statsRes, projectsRes]);

                setStats(statsData.data);

                // For interns, filter to show only assigned projects
                if (user?.role === 'INTERN') {
                    setAssignedProjects(projectsData.data);
                }
            } catch (error: any) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user?.role]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return '#10b981';
            case 'IN_PROGRESS': return '#6366f1';
            case 'ON_HOLD': return '#f59e0b';
            default: return '#6b7280';
        }
    };

    if (loading) return <div>Loading dashboard...</div>;

    let statItems: any[] = [];

    if (user?.role === 'ADMIN') {
        statItems = [
            { label: 'Total Managers', value: stats.total_managers ?? '...', icon: <Users className="text-secondary" />, trend: 'System' },
            { label: 'Total Interns', value: stats.total_interns ?? '...', icon: <Users className="text-primary" />, trend: 'System' },
            { label: 'Total Projects', value: stats.total_projects ?? '...', icon: <FolderKanban />, trend: 'System' },
            { label: 'Active Projects', value: stats.active_projects ?? '...', icon: <TrendingUp />, trend: 'Active' },
        ];
    } else if (user?.role === 'MANAGER') {
        statItems = [
            { label: 'My Interns', value: stats.total_interns ?? '0', icon: <Users className="text-primary" />, trend: 'Assigned' },
            { label: 'My Projects', value: stats.total_projects ?? '0', icon: <FolderKanban />, trend: 'Mentored' },
            { label: 'Active Projects', value: stats.active_projects ?? '0', icon: <TrendingUp />, trend: 'Ongoing' },
            { label: 'Pending Reviews', value: stats.pending_reviews ?? '0', icon: <AlertCircle style={{ color: '#ef4444' }} />, trend: 'Action Needed' },
        ];
    } else if (user?.role === 'INTERN') {
        statItems = [
            { label: 'Assigned Projects', value: stats.assigned_projects ?? '0', icon: <FolderKanban />, trend: 'To Do' },
            { label: 'Completed', value: stats.completed_projects ?? '0', icon: <CheckCircle2 />, trend: 'Done' },
            { label: 'Feedback Score', value: stats.average_score ?? 'N/A', icon: <TrendingUp />, trend: 'Performance' },
        ];
    }

    return (
        <div>
            <div className="stats-grid">
                {statItems.map((stat, i) => (
                    <div key={i} className="card stat-card">
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                            {stat.icon}
                        </div>
                        <div className="stat-value">{stat.value}</div>
                        <div className="stat-label">{stat.label}</div>
                        <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>{stat.trend}</div>
                    </div>
                ))}
            </div>

            {/* Assigned Projects Section for Interns */}
            {user?.role === 'INTERN' && assignedProjects.length > 0 && (
                <div className="card" style={{ marginTop: '1.5rem' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>My Assigned Projects</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                        {assignedProjects.map((project) => (
                            <div key={project.id} style={{ padding: '1rem', background: 'var(--card-bg)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                    <h4 style={{ margin: 0, color: 'var(--primary-color)' }}>{project.name}</h4>
                                    <span style={{
                                        fontSize: '0.7rem',
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '1rem',
                                        background: `${getStatusColor(project.status)}20`,
                                        color: getStatusColor(project.status)
                                    }}>
                                        {project.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
                                    {project.description?.substring(0, 100)}...
                                </p>
                                {project.tech_stack && project.tech_stack.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem' }}>
                                        {project.tech_stack.slice(0, 3).map((tech, index) => (
                                            <span key={index} style={{
                                                fontSize: '0.65rem',
                                                padding: '0.1rem 0.3rem',
                                                borderRadius: '0.25rem',
                                                background: 'var(--primary-color)',
                                                color: 'white',
                                            }}>
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                    Mentor: {project.mentor?.full_name || 'Unassigned'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginTop: '1.5rem' }}>
                <div className="card">
                    <h3 style={{ marginTop: 0 }}>Recent Activity</h3>
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                        {user?.role === 'ADMIN' && "System-wide activity log."}
                        {user?.role === 'MANAGER' && "Recent submissions from your interns."}
                        {user?.role === 'INTERN' && "Your recent updates."}
                    </div>
                </div>

                <div className="card" style={{ borderColor: '#ef4444' }}>
                    <h3 style={{ marginTop: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={20} />
                        Alerts
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>
                        System alerts will appear here.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
