import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Clock, ExternalLink, FolderKanban, Users, LayoutGrid, Plus, UserPlus } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge } from '../components/common';

interface User {
    id: number;
    full_name: string;
    email: string;
    department?: string;
}

interface ProjectAssignment {
    id: number;
    project: { id: number; name: string };
    intern: User;
    role: string;
    status: string;
    assigned_at: string;
}

interface Project {
    id: number;
    name: string;
    status: string;
    description: string;
    start_date: string;
    end_date: string;
    repository_url: string;
    tech_stack: string[];
    mentor: {
        id: number;
        full_name: string;
    } | null;
    assignments?: ProjectAssignment[];
}

interface ProjectModule {
    id: number;
    name: string;
    description: string;
    order?: number;
    estimated_hours?: number;
}

const ProjectDetailPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId: string }>();

    const [project, setProject] = useState<Project | null>(null);
    const [projectModules, setProjectModules] = useState<ProjectModule[]>([]);
    const [newModule, setNewModule] = useState({ name: '', description: '' });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const showAddButton = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    const fetchProjectModules = useCallback(async (id: number) => {
        try {
            const response = await api.get(`/projects/projects/${id}/modules/`);
            setProjectModules(response.data || []);
        } catch {
            setProjectModules([]);
        }
    }, []);

    const fetchProjectDetails = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const response = await api.get(`/projects/projects/${projectId}/`);
            setProject(response.data);
            await fetchProjectModules(Number(projectId));
        } catch (err) {
            console.error("Failed to load project details", err);
            toast.error("Failed to load project details");
            navigate('/directory/projects');
        } finally {
            setLoading(false);
        }
    }, [projectId, navigate, fetchProjectModules]);

    useEffect(() => {
        fetchProjectDetails();
    }, [fetchProjectDetails]);

    const handleAddModule = async () => {
        if (!project || !newModule.name) return;
        setSubmitting(true);
        toast.promise(api.post('/projects/modules/', {
            ...newModule,
            project_id: project.id
        }), {
            loading: 'Adding module to project scope...',
            success: () => {
                setNewModule({ name: '', description: '' });
                fetchProjectModules(project.id);
                setSubmitting(false);
                return 'Module added successfully';
            },
            error: (err) => {
                setSubmitting(false);
                const apiError = err as { response?: { data?: Record<string, unknown> } };
                const errorData = apiError.response?.data;
                if (errorData) {
                    return Object.entries(errorData)
                        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                        .join(', ');
                }
                return 'Failed to add module';
            }
        });
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
            PLANNED: 'info',
            IN_PROGRESS: 'success',
            ON_HOLD: 'warning',
            COMPLETED: 'success'
        };
        const labels: Record<string, string> = {
            PLANNED: 'Planned',
            IN_PROGRESS: 'In Progress',
            ON_HOLD: 'On Hold',
            COMPLETED: 'Completed'
        };
        return <Badge variant={variants[status] || 'info'}>{labels[status] || status}</Badge>;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                    <p className="text-[var(--text-dim)] animate-pulse">Loading project details...</p>
                </div>
            </div>
        );
    }

    if (!project) return null;

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in p-6">
            <button
                onClick={() => navigate('/directory/projects')}
                className="flex items-center gap-2 text-sm font-medium text-[var(--text-dim)] hover:text-purple-400 transition-colors"
            >
                <ArrowLeft size={16} /> Back to Projects
            </button>

            <div>
                <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2 flex items-center gap-3">
                    <FolderKanban className="text-purple-500" />
                    {project.name}
                </h1>
                <p className="text-[var(--text-dim)]">Detailed overview, assignments, and modules for the project.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Project Info */}
                <div className="lg:col-span-2 space-y-6">
                    <Card padding="lg" className="border-purple-500/10 bg-[var(--card-bg)] space-y-6">
                        {/* Highlights Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-[var(--bg-muted)] rounded-xl border border-[var(--border-color)]">
                                <p className="text-xs text-[var(--text-dim)] mb-1">Status</p>
                                {getStatusBadge(project.status)}
                            </div>
                            <div className="p-4 bg-[var(--bg-muted)] rounded-xl border border-[var(--border-color)]">
                                <p className="text-xs text-[var(--text-dim)] mb-1">Mentor</p>
                                <p className="text-sm font-medium text-[var(--text-main)] truncate">
                                    {project.mentor?.full_name || 'Unassigned'}
                                </p>
                            </div>
                            <div className="p-4 bg-[var(--bg-muted)] rounded-xl border border-[var(--border-color)]">
                                <p className="text-xs text-[var(--text-dim)] mb-1">Start Date</p>
                                <p className="text-sm font-medium text-[var(--text-main)]">
                                    {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}
                                </p>
                            </div>
                            <div className="p-4 bg-[var(--bg-muted)] rounded-xl border border-[var(--border-color)]">
                                <p className="text-xs text-[var(--text-dim)] mb-1">End Date</p>
                                <p className="text-sm font-medium text-[var(--text-main)]">
                                    {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set'}
                                </p>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <h3 className="text-sm font-semibold text-[var(--text-main)] mb-2">Description</h3>
                            <p className="text-sm text-[var(--text-dim)] leading-relaxed bg-[var(--bg-muted)] p-5 rounded-xl border border-[var(--border-color)]">
                                {project.description || 'No description provided.'}
                            </p>
                        </div>

                        {/* Tech Stack */}
                        {project.tech_stack && project.tech_stack.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-[var(--text-main)] mb-2">Tech Stack</h3>
                                <div className="flex flex-wrap gap-2">
                                    {project.tech_stack.map((tech, index) => (
                                        <span key={index} className="px-3 py-1.5 text-xs font-medium bg-purple-500/10 text-purple-300 rounded-lg border border-purple-500/20 shadow-sm">
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Repository */}
                        {project.repository_url && (
                            <div>
                                <h3 className="text-sm font-semibold text-[var(--text-main)] mb-2">Repository</h3>
                                <a
                                    href={project.repository_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors p-4 bg-[var(--bg-muted)] rounded-xl border border-purple-500/10 hover:border-purple-500/30 group"
                                >
                                    <ExternalLink size={16} className="text-purple-500 group-hover:text-purple-400 transition-transform" />
                                    <span className="truncate">{project.repository_url}</span>
                                </a>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Column: Assigned Interns & Modules */}
                <div className="space-y-6">
                    {/* Assigned Interns */}
                    <Card padding="md" className="border-[var(--border-color)]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                                <Users size={16} className="text-indigo-400" />    
                                Assigned Interns ({project.assignments?.length || 0})
                            </h3>
                            {showAddButton && (
                                <button
                                    onClick={() => navigate(`/directory/projects/${project.id}/assign-intern`)}
                                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors bg-purple-500/10 px-2.5 py-1.5 rounded-lg border border-purple-500/20"
                                >
                                    <UserPlus size={12} />
                                    Add Intern
                                </button>
                            )}
                        </div>
                        <div className="overflow-y-auto max-h-[220px] pr-1 custom-scrollbar">
                            {project.assignments && project.assignments.length > 0 ? (
                                <div className="space-y-2">
                                    {project.assignments.map((assignment) => (
                                        <div key={assignment.id} className="flex items-center justify-between p-3 bg-[var(--bg-muted)] hover:bg-[var(--bg-color)] rounded-xl border border-[var(--border-color)] transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center border border-indigo-500/30 shrink-0">
                                                    <span className="text-xs font-bold text-indigo-300">
                                                        {assignment.intern?.full_name?.charAt(0) || '?'}
                                                    </span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-[var(--text-main)] truncate">{assignment.intern?.full_name || 'Unknown'}</p>
                                                    <p className="text-xs text-[var(--text-dim)] truncate mt-0.5">{assignment.role || 'No role'}</p>
                                                </div>
                                            </div>
                                            <Badge variant={assignment.status === 'ACTIVE' ? 'success' : 'warning'}>
                                                {assignment.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-6 flex flex-col items-center text-center text-[var(--text-muted)] bg-[var(--bg-muted)] rounded-xl border border-[var(--border-color)]">
                                    <Users size={20} className="mb-2 opacity-50 text-indigo-400" />
                                    <p className="text-sm">No interns assigned</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Modules Card */}
                    <Card padding="md" className="border-[var(--border-color)]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                                <LayoutGrid size={16} className="text-pink-400" />
                                Modules ({projectModules.length})
                            </h3>
                        </div>
                        
                        {/* Add Module Form */}
                        {showAddButton && (
                            <div className="mb-4 p-4 bg-[var(--bg-muted)] border border-pink-500/10 rounded-xl space-y-3">
                                <p className="text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5"><Plus size={12} className="text-pink-400"/> New Module</p>
                                <input
                                    type="text"
                                    value={newModule.name}
                                    onChange={e => setNewModule(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Module name"
                                    className="w-full px-3 py-2 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-pink-500/50"
                                />
                                <input
                                    type="text"
                                    value={newModule.description}
                                    onChange={e => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Module description (optional)"
                                    className="w-full px-3 py-2 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-pink-500/50"
                                />
                                <Button
                                    onClick={handleAddModule}
                                    gradient="purple"
                                    size="sm"
                                    loading={submitting}
                                    disabled={!newModule.name}
                                    fullWidth
                                >
                                    Save Module
                                </Button>
                            </div>
                        )}

                        <div className="overflow-y-auto max-h-[220px] pr-1 custom-scrollbar">
                            {projectModules.length > 0 ? (
                                <div className="space-y-2">
                                    {projectModules.map((module) => (
                                        <div key={module.id} className="p-3 bg-[var(--bg-muted)] hover:bg-[var(--bg-color)] rounded-xl border border-[var(--border-color)] transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="min-w-0 pr-2">
                                                    <p className="text-sm font-medium text-[var(--text-main)] truncate">{module.name}</p>
                                                    <p className="text-xs text-[var(--text-dim)] mt-1 truncate">{module.description || 'No description'}</p>
                                                </div>
                                                <span className="text-xs font-medium bg-[var(--bg-color)] px-2 py-1 rounded text-[var(--text-muted)] shrink-0">Ord: {module.order || 0}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-6 flex flex-col items-center text-center text-[var(--text-muted)] bg-[var(--bg-muted)] rounded-xl border border-[var(--border-color)]">
                                    <LayoutGrid size={20} className="mb-2 opacity-50 text-pink-400" />
                                    <p className="text-sm">No modules created</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailPage;
