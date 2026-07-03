import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Phone, Building, Calendar, Search, Star, Clock, Award, BookOpen, Activity, Users } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge } from '../components/common';

interface Project {
    id: number;
    name: string;
    status: string;
    role: string;
}

interface Task {
    id: number;
    title: string;
    status: string;
    due_date: string;
}

interface InternProfileDetails {
    id: number;
    user: {
        id: number;
        email: string;
        full_name: string;
        role: string;
        department?: string;
    };
    university: string;
    phone_number: string;
    status: string;
    skills: string[];
    gpa?: string;
    graduation_year?: string;
    github_profile?: string;
    linkedin_profile?: string;
    projects: Project[];
    tasks: Task[];
    attendance_rate: number;
    average_rating: number;
}

const InternDetailPage: React.FC = () => {
    const { user: authUser } = useAuth();
    const navigate = useNavigate();
    const { internId } = useParams<{ internId: string }>();

    const [intern, setIntern] = useState<InternProfileDetails | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchInternProfile = useCallback(async () => {
        if (!internId) return;
        setLoading(true);
        try {
            // Fetch detailed profile data
            const profileResponse = await api.get(`/interns/profile-by-user/${internId}/`);
            const profile = profileResponse.data;

            // Fetch projects assigned
            let projects: Project[] = [];
            try {
                const projectsResponse = await api.get(`/projects/assignments/?intern_id=${internId}`);
                const assignments = Array.isArray(projectsResponse.data) ? projectsResponse.data : (projectsResponse.data?.results || []);
                projects = assignments.map((a: any) => ({
                    id: a.id,
                    name: a.project?.name || 'Unknown Project',
                    status: a.status,
                    role: a.role
                }));
            } catch (e) {
                console.error('Error fetching projects:', e);
            }

            // Fetch tasks
            let tasks: Task[] = [];
            try {
                const tasksResponse = await api.get(`/analytics/tasks/?intern_id=${internId}`);
                tasks = tasksResponse.data?.tasks || [];
            } catch (e) {
                console.error('Error fetching tasks:', e);
            }

            // Fetch performance stats
            let attendanceRate = 0;
            let averageRating = 0;
            try {
                const perfResponse = await api.get(`/analytics/performance/dashboard/${internId}/`);
                const data = perfResponse.data;
                const metrics = data?.metrics;
                if (metrics) {
                    attendanceRate = Math.round((metrics.engagement || 0) * 100);
                    averageRating = metrics.avg_quality || 0;
                }
            } catch (e) {
                console.error('Error fetching performance:', e);
            }

            setIntern({
                id: profile.id,
                user: {
                    id: Number(internId),
                    email: profile.user?.email || '',
                    full_name: profile.user?.full_name || '',
                    role: profile.user?.role || 'INTERN',
                    department: profile.user?.department || profile.university || ''
                },
                university: profile.university || '',
                phone_number: profile.phone_number || '',
                status: profile.status || 'ACTIVE',
                skills: profile.skills || [],
                gpa: profile.gpa,
                graduation_year: profile.graduation_year,
                github_profile: profile.github_profile,
                linkedin_profile: profile.linkedin_profile,
                projects,
                tasks,
                attendance_rate: attendanceRate,
                average_rating: averageRating
            });

        } catch (err) {
            console.error("Failed to load intern details", err);
            toast.error("Failed to load intern profile");
            navigate('/directory/interns');
        } finally {
            setLoading(false);
        }
    }, [internId, navigate]);

    useEffect(() => {
        fetchInternProfile();
    }, [fetchInternProfile]);

    const handleDeleteIntern = async (userId: number) => {
        if (!window.confirm("Are you sure you want to remove this intern?")) return;
        try {
            await api.delete(`/interns/profile-by-user/${userId}/`);
            toast.success("Intern successfully deleted");
            navigate('/directory/interns');
        } catch {
            toast.error("Failed to delete intern");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                    <p className="text-[var(--text-dim)] animate-pulse">Loading intern profile details...</p>
                </div>
            </div>
        );
    }

    if (!intern) return null;

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in p-6">
            <button
                onClick={() => navigate('/directory/interns')}
                className="flex items-center gap-2 text-sm font-medium text-[var(--text-dim)] hover:text-purple-400 transition-colors"
            >
                <ArrowLeft size={16} /> Back to Directory
            </button>

            {/* Header info */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[var(--border-color)]">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-main)] mb-1 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                            <span className="text-xl font-bold text-purple-300">
                                {intern.user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'AJ'}
                            </span>
                        </div>
                        {intern.user.full_name}
                    </h1>
                    <p className="text-sm text-[var(--text-dim)] flex items-center gap-2 mt-1">
                        <span>{intern.user.email}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Building size={14} /> {intern.user.department || intern.university}</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button 
                        variant="outline" 
                        icon={<Activity size={16} />}
                        onClick={() => navigate(`/career/phase-timeline/${intern.user.id}`)}
                        className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                    >
                        Career Timeline
                    </Button>
                    {authUser?.role === 'ADMIN' && (
                        <Button
                            variant="outline"
                            onClick={() => handleDeleteIntern(intern.user.id)}
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-500"
                        >
                            Delete
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <Card className="p-5 flex flex-col items-center justify-center text-center bg-gradient-to-br from-purple-500/5 to-transparent border-purple-500/10">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mb-3">
                        <Star className="text-purple-400" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-[var(--text-main)]">
                        {intern.average_rating !== undefined ? intern.average_rating.toFixed(1) : 'N/A'}
                    </div>
                    <div className="text-xs text-[var(--text-dim)] uppercase tracking-wider font-semibold mt-1">Avg Rating</div>
                </Card>
                <Card className="p-5 flex flex-col items-center justify-center text-center bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/10">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
                        <Clock className="text-blue-400" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-[var(--text-main)]">
                        {intern.attendance_rate !== undefined ? `${intern.attendance_rate}%` : 'N/A'}
                    </div>
                    <div className="text-xs text-[var(--text-dim)] uppercase tracking-wider font-semibold mt-1">Attendance</div>
                </Card>
                <Card className="p-5 flex flex-col items-center justify-center text-center bg-gradient-to-br from-pink-500/5 to-transparent border-pink-500/10">
                    <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center mb-3">
                        <Award className="text-pink-400" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-[var(--text-main)]">
                        {intern.projects?.length || 0}
                    </div>
                    <div className="text-xs text-[var(--text-dim)] uppercase tracking-wider font-semibold mt-1">Projects</div>
                </Card>
                <Card className="p-5 flex flex-col items-center justify-center text-center bg-gradient-to-br from-indigo-500/5 to-transparent border-indigo-500/10">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center mb-3">
                        <BookOpen className="text-indigo-400" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-[var(--text-main)]">
                        {intern.tasks?.length || 0}
                    </div>
                    <div className="text-xs text-[var(--text-dim)] uppercase tracking-wider font-semibold mt-1">Tasks</div>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Personal Info & Skills */}
                <div className="space-y-6">
                    <Card padding="lg" className="space-y-4">
                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-2 flex items-center gap-2">
                            <Users size={18} className="text-purple-400" />
                            Personal Details
                        </h3>
                        <div className="space-y-4">
                            {intern.phone_number && (
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center">
                                        <Phone size={14} className="text-[var(--text-muted)]" />
                                    </div>
                                    <span className="text-[var(--text-main)]">{intern.phone_number}</span>
                                </div>
                            )}
                            {intern.university && (
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center">
                                        <Building size={14} className="text-[var(--text-muted)]" />
                                    </div>
                                    <span className="text-[var(--text-main)]">{intern.university}</span>
                                </div>
                            )}
                            {(intern.graduation_year || intern.gpa) && (
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center">
                                        <Calendar size={14} className="text-[var(--text-muted)]" />
                                    </div>
                                    <span className="text-[var(--text-main)]">
                                        Class of {intern.graduation_year || 'N/A'} {intern.gpa && `• ${intern.gpa} GPA`}
                                    </span>
                                </div>
                            )}
                            {intern.github_profile && (
                                <a href={intern.github_profile} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm group hover:bg-purple-500/5 p-1 rounded-lg transition-colors -ml-1">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-colors shrink-0">
                                        <Search size={14} className="text-[var(--text-muted)] group-hover:text-purple-400 transition-colors" />
                                    </div>
                                    <span className="text-[var(--text-main)] group-hover:text-purple-400 transition-colors truncate">GitHub</span>
                                </a>
                            )}
                            {intern.linkedin_profile && (
                                <a href={intern.linkedin_profile} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm group hover:bg-blue-500/5 p-1 rounded-lg transition-colors -ml-1">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors shrink-0">
                                        <Search size={14} className="text-[var(--text-muted)] group-hover:text-blue-400 transition-colors" />
                                    </div>
                                    <span className="text-[var(--text-main)] group-hover:text-blue-400 transition-colors truncate">LinkedIn</span>
                                </a>
                            )}
                        </div>
                    </Card>

                    <Card padding="lg" className="space-y-4">
                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-2 flex items-center gap-2">
                            <Award size={18} className="text-pink-400" />
                            Skills
                        </h3>
                        {intern.skills && intern.skills.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {intern.skills.map((skill, index) => (
                                    <span key={index} className="px-3 py-1.5 text-sm font-medium bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20 shadow-sm">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-[var(--text-dim)]">No skills listed</p>
                        )}
                    </Card>
                </div>

                {/* Right Column: Projects & Tasks */}
                <div className="md:col-span-2 space-y-6">
                    <Card padding="lg" className="flex flex-col h-full max-h-[400px]">
                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-4 flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
                            <BookOpen size={18} className="text-indigo-400" />
                            Assigned Projects
                        </h3>
                        <div className="overflow-y-auto pr-1 space-y-3 flex-1 custom-scrollbar">
                            {intern.projects && intern.projects.length > 0 ? (
                                intern.projects.map((project) => (
                                    <div key={project.id} className="p-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl hover:border-purple-500/30 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-semibold text-[var(--text-main)] text-sm">{project.name}</h4>
                                            <Badge variant={project.status === 'ACTIVE' ? 'success' : 'default'} size="sm">{project.status}</Badge>
                                        </div>
                                        <p className="text-xs text-[var(--text-dim)] mt-1">Role: <span className="text-[var(--text-main)] font-medium">{project.role}</span></p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-[var(--text-dim)] text-sm">
                                    No projects assigned yet
                                </div>
                            )}
                        </div>
                    </Card>
                    
                    <Card padding="lg" className="flex flex-col h-full max-h-[400px]">
                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-4 flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
                            <Clock size={18} className="text-blue-400" />
                            Recent Tasks
                        </h3>
                        <div className="overflow-y-auto pr-1 space-y-3 flex-1 custom-scrollbar">
                            {intern.tasks && intern.tasks.length > 0 ? (
                                intern.tasks.slice(0, 5).map((task) => (
                                    <div key={task.id} className="p-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl hover:border-purple-500/30 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-semibold text-[var(--text-main)] text-sm">{task.title}</h4>
                                            <Badge variant={
                                                task.status === 'COMPLETED' ? 'success' : 
                                                task.status === 'IN_PROGRESS' ? 'warning' : 'default'
                                            } size="sm">{task.status}</Badge>
                                        </div>
                                        <p className="text-xs text-[var(--text-dim)] mt-1">Due: <span className="text-[var(--text-main)] font-medium">{new Date(task.due_date).toLocaleDateString()}</span></p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-[var(--text-dim)] text-sm">
                                    No tasks assigned yet
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default InternDetailPage;
