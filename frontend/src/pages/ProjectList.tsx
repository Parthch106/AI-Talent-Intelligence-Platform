import React, { useEffect, useState } from 'react';
import { Plus, LayoutGrid, List as ListIcon, Users, X, Edit, UserPlus, Calendar, ExternalLink, FolderKanban, Clock } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

interface User {
    id: number;
    full_name: string;
    email: string;
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

interface NewProject {
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    repository_url: string;
    tech_stack: string;
    status: string;
}

interface AssignIntern {
    intern_id: number;
    role: string;
}

const ProjectList: React.FC = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [interns, setInterns] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const [newProject, setNewProject] = useState<NewProject>({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        repository_url: '',
        tech_stack: '',
        status: 'PLANNED',
    });

    const [editProject, setEditProject] = useState<NewProject>({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        repository_url: '',
        tech_stack: '',
        status: 'PLANNED',
    });

    const [assignIntern, setAssignIntern] = useState<AssignIntern>({
        intern_id: 0,
        role: '',
    });

    const fetchData = async () => {
        try {
            const projectsRes = await api.get('/projects/projects/');

            // Fetch assignments for each project
            const assignmentsRes = await api.get('/projects/assignments/');
            const assignments = assignmentsRes.data;

            // Map assignments to projects
            const projectsWithAssignments = projectsRes.data.map((project: Project) => ({
                ...project,
                assignments: assignments.filter((a: ProjectAssignment) =>
                    a.project && a.project.id === project.id
                ),
            }));

            setProjects(projectsWithAssignments);

            // Fetch interns based on role
            if (user?.role === 'MANAGER') {
                // Managers get interns from their department
                const deptInternsRes = await api.get('/interns/department-interns/');
                setInterns(deptInternsRes.data);
            } else {
                // Admin gets all interns
                const internsRes = await api.get('/interns/profiles/');
                setInterns(internsRes.data.map((profile: any) => profile.user));
            }
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.role]);

    const handleAddProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        const techStackArray = newProject.tech_stack
            .split(',')
            .map(t => t.trim())
            .filter(t => t);

        try {
            await api.post('/projects/projects/', {
                ...newProject,
                tech_stack: techStackArray,
            });
            setShowAddModal(false);
            setNewProject({
                name: '',
                description: '',
                start_date: '',
                end_date: '',
                repository_url: '',
                tech_stack: '',
                status: 'PLANNED',
            });
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to create project');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject) return;
        setSubmitting(true);
        setError('');

        const techStackArray = editProject.tech_stack
            .split(',')
            .map(t => t.trim())
            .filter(t => t);

        try {
            await api.patch(`/projects/projects/${selectedProject.id}/`, {
                ...editProject,
                tech_stack: techStackArray,
            });
            setShowEditModal(false);
            setSelectedProject(null);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to update project');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAssignIntern = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject) return;
        setSubmitting(true);
        setError('');

        try {
            await api.post('/projects/assignments/', {
                project_id: selectedProject.id,
                intern_id: assignIntern.intern_id,
                role: assignIntern.role,
            });
            setShowAssignModal(false);
            setSelectedProject(null);
            setAssignIntern({ intern_id: 0, role: '' });
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to assign intern');
        } finally {
            setSubmitting(false);
        }
    };

    const openEditModal = (project: Project) => {
        setSelectedProject(project);
        setEditProject({
            name: project.name,
            description: project.description,
            start_date: project.start_date || '',
            end_date: project.end_date || '',
            repository_url: project.repository_url || '',
            tech_stack: project.tech_stack?.join(', ') || '',
            status: project.status,
        });
        setShowEditModal(true);
    };

    const openAssignModal = (project: Project) => {
        setSelectedProject(project);
        setShowAssignModal(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED': return <Badge variant="success" withDot>Completed</Badge>;
            case 'IN_PROGRESS': return <Badge variant="purple" withDot pulse>In Progress</Badge>;
            case 'ON_HOLD': return <Badge variant="warning" withDot>On Hold</Badge>;
            default: return <Badge variant="info" withDot>Planned</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                    <p className="text-slate-400 animate-pulse">Loading projects...</p>
                </div>
            </div>
        );
    }

    const showAddButton = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Project <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Management</span>
                    </h1>
                    <p className="text-slate-400">Track and manage all projects</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex items-center bg-slate-800/50 rounded-xl p-1 border border-slate-700">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:text-white'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:text-white'}`}
                        >
                            <ListIcon size={18} />
                        </button>
                    </div>
                    {showAddButton && (
                        <Button
                            onClick={() => setShowAddModal(true)}
                            gradient="purple"
                            icon={<Plus size={18} />}
                        >
                            New Project
                        </Button>
                    )}
                </div>
            </div>

            {/* Projects Grid */}
            {projects.length === 0 ? (
                <Card className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-slate-800/50 rounded-full flex items-center justify-center">
                        <FolderKanban size={24} className="text-slate-500" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No projects found</h3>
                    <p className="text-slate-400">Create your first project to get started</p>
                </Card>
            ) : (
                <div className={viewMode === 'grid'
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    : "space-y-4"
                }>
                    {projects.map((project) => (
                        <Card key={project.id} hover className="group">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/20">
                                        <FolderKanban size={20} className="text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white group-hover:text-purple-200 transition-colors">
                                            {project.name}
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                            <Clock size={12} />
                                            {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'No date'}
                                        </div>
                                    </div>
                                </div>
                                {getStatusBadge(project.status)}
                            </div>

                            {/* Description */}
                            <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                                {project.description || 'No description provided'}
                            </p>

                            {/* Tech Stack */}
                            {project.tech_stack && project.tech_stack.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {project.tech_stack.slice(0, 3).map((tech, index) => (
                                        <span key={index} className="px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-300 rounded-lg border border-purple-500/20">
                                            {tech}
                                        </span>
                                    ))}
                                    {project.tech_stack.length > 3 && (
                                        <span className="px-2 py-1 text-xs font-medium bg-slate-700/50 text-slate-400 rounded-lg">
                                            +{project.tech_stack.length - 3} more
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Mentor */}
                            <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                                <Users size={14} className="text-purple-400" />
                                <span>Mentor: {project.mentor?.full_name || 'Unassigned'}</span>
                            </div>

                            {/* Assigned Interns */}
                            <div className="pt-4 border-t border-white/5">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-slate-400 flex items-center gap-2">
                                        <Users size={14} className="text-indigo-400" />
                                        Assigned ({project.assignments?.length || 0})
                                    </span>
                                    {showAddButton && (
                                        <button
                                            onClick={() => openAssignModal(project)}
                                            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                                        >
                                            <UserPlus size={12} />
                                            Add
                                        </button>
                                    )}
                                </div>
                                {project.assignments && project.assignments.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {project.assignments.map((assignment) => (
                                            <span key={assignment.id} className="px-2 py-1 text-xs font-medium bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-500/20">
                                                {assignment.intern?.full_name || 'Unknown'}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500">No interns assigned</p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                                {project.repository_url && (
                                    <a
                                        href={project.repository_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-slate-400 hover:text-purple-400 flex items-center gap-1 transition-colors"
                                    >
                                        <ExternalLink size={14} />
                                        Repository
                                    </a>
                                )}
                                {showAddButton && (
                                    <button
                                        onClick={() => openEditModal(project)}
                                        className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors ml-auto"
                                    >
                                        <Edit size={14} />
                                        Edit
                                    </button>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add Project Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
                    <div className="relative bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-purple-500/20 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-between px-6 py-4 border-b border-white/10 z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                                    <Plus size={18} className="text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Create New Project</h2>
                                    <p className="text-xs text-slate-400">Fill in the project details</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-white/5 rounded-xl transition-colors group"
                            >
                                <X size={20} className="text-slate-400 group-hover:text-white transition-colors" />
                            </button>
                        </div>

                        <form onSubmit={handleAddProject} className="p-6 space-y-5">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                                    <X size={16} />
                                    {error}
                                </div>
                            )}

                            <div className="group">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Project Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={newProject.name}
                                    onChange={e => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                    placeholder="My Awesome Project"
                                />
                            </div>

                            <div className="group">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Description *</label>
                                <textarea
                                    required
                                    value={newProject.description}
                                    onChange={e => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none"
                                    placeholder="Describe your project..."
                                />
                            </div>

                            <div className="group">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Status *</label>
                                <select
                                    value={newProject.status}
                                    onChange={e => setNewProject(prev => ({ ...prev, status: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="PLANNED">Planned</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="ON_HOLD">On Hold</option>
                                    <option value="COMPLETED">Completed</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="group">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Start Date *</label>
                                    <div className="relative">
                                        <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="date"
                                            required
                                            value={newProject.start_date}
                                            onChange={e => setNewProject(prev => ({ ...prev, start_date: e.target.value }))}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="group">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">End Date</label>
                                    <div className="relative">
                                        <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="date"
                                            value={newProject.end_date}
                                            onChange={e => setNewProject(prev => ({ ...prev, end_date: e.target.value }))}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Repository URL</label>
                                <div className="relative">
                                    <ExternalLink size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="url"
                                        placeholder="https://github.com/..."
                                        value={newProject.repository_url}
                                        onChange={e => setNewProject(prev => ({ ...prev, repository_url: e.target.value }))}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Tech Stack</label>
                                <input
                                    type="text"
                                    placeholder="React, Node.js, PostgreSQL..."
                                    value={newProject.tech_stack}
                                    onChange={e => setNewProject(prev => ({ ...prev, tech_stack: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                />
                                <p className="text-xs text-slate-500 mt-1">Separate technologies with commas</p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowAddModal(false)}
                                    fullWidth
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    gradient="purple"
                                    loading={submitting}
                                    fullWidth
                                >
                                    Create Project
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Project Modal */}
            {showEditModal && selectedProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
                    <div className="relative bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-purple-500/20 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-between px-6 py-4 border-b border-white/10 z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
                                    <Edit size={18} className="text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Edit Project</h2>
                                    <p className="text-xs text-slate-400">Update project details</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="p-2 hover:bg-white/5 rounded-xl transition-colors group"
                            >
                                <X size={20} className="text-slate-400 group-hover:text-white transition-colors" />
                            </button>
                        </div>

                        <form onSubmit={handleEditProject} className="p-6 space-y-5">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                                    <X size={16} />
                                    {error}
                                </div>
                            )}

                            <div className="group">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Project Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={editProject.name}
                                    onChange={e => setEditProject(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                />
                            </div>

                            <div className="group">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Description *</label>
                                <textarea
                                    required
                                    value={editProject.description}
                                    onChange={e => setEditProject(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none"
                                />
                            </div>

                            <div className="group">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Status *</label>
                                <select
                                    value={editProject.status}
                                    onChange={e => setEditProject(prev => ({ ...prev, status: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="PLANNED">Planned</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="ON_HOLD">On Hold</option>
                                    <option value="COMPLETED">Completed</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="group">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Start Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={editProject.start_date}
                                        onChange={e => setEditProject(prev => ({ ...prev, start_date: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                    />
                                </div>
                                <div className="group">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">End Date</label>
                                    <input
                                        type="date"
                                        value={editProject.end_date}
                                        onChange={e => setEditProject(prev => ({ ...prev, end_date: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Repository URL</label>
                                <input
                                    type="url"
                                    placeholder="https://github.com/..."
                                    value={editProject.repository_url}
                                    onChange={e => setEditProject(prev => ({ ...prev, repository_url: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                />
                            </div>

                            <div className="group">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Tech Stack</label>
                                <input
                                    type="text"
                                    placeholder="React, Node.js, PostgreSQL..."
                                    value={editProject.tech_stack}
                                    onChange={e => setEditProject(prev => ({ ...prev, tech_stack: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowEditModal(false)}
                                    fullWidth
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    gradient="indigo"
                                    loading={submitting}
                                    fullWidth
                                >
                                    Update Project
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Intern Modal */}
            {showAssignModal && selectedProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAssignModal(false)}></div>
                    <div className="relative bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-purple-500/20 w-full max-w-md animate-scale-in">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 rounded-xl flex items-center justify-center">
                                    <UserPlus size={18} className="text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Assign Intern</h2>
                                    <p className="text-xs text-slate-400">to {selectedProject.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="p-2 hover:bg-white/5 rounded-xl transition-colors group"
                            >
                                <X size={20} className="text-slate-400 group-hover:text-white transition-colors" />
                            </button>
                        </div>

                        <form onSubmit={handleAssignIntern} className="p-6 space-y-5">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                                    <X size={16} />
                                    {error}
                                </div>
                            )}

                            <div className="group">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Select Intern *</label>
                                <select
                                    value={assignIntern.intern_id}
                                    onChange={e => setAssignIntern(prev => ({ ...prev, intern_id: Number(e.target.value) }))}
                                    required
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value={0}>Choose an intern...</option>
                                    {interns.map((intern) => (
                                        <option key={intern.id} value={intern.id}>
                                            {intern.full_name} ({intern.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="group">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Role *</label>
                                <input
                                    type="text"
                                    value={assignIntern.role}
                                    onChange={e => setAssignIntern(prev => ({ ...prev, role: e.target.value }))}
                                    required
                                    placeholder="e.g., Frontend Developer"
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowAssignModal(false)}
                                    fullWidth
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    gradient="indigo"
                                    loading={submitting}
                                    fullWidth
                                >
                                    Assign Intern
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectList;
