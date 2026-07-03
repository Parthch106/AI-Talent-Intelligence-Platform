import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, List as ListIcon, Users, X, Edit, UserPlus, Calendar, ExternalLink, FolderKanban, Clock, Sparkles, History } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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

interface ProjectModule {
    id: number;
    name: string;
    description: string;
    order?: number;
    estimated_hours?: number;
}

interface AISuggestion {
    name: string;
    description: string;
    estimated_duration: number;
    difficulty: number;
    tech_stack: string[];
    learning_objectives: string[];
    business_value: string;
    modules: ProjectModule[];
}

interface ProjectHistoryEntry {
    timestamp: string;
    suggestions: AISuggestion[];
}

const ProjectList: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [interns, setInterns] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [projectModules, setProjectModules] = useState<ProjectModule[]>([]);
    const [newModule, setNewModule] = useState({ name: '', description: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [aiSuggestedModules, setAiSuggestedModules] = useState<ProjectModule[]>([]);

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

    const fetchData = React.useCallback(async () => {
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
                const internsRes = await api.get('/accounts/users/?role=INTERN');
                setInterns(internsRes.data);
            }
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    }, [user?.role]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        const techStackArray = newProject.tech_stack
            ? newProject.tech_stack.split(',').map(s => s.trim()).filter(Boolean)
            : [];

        const savePromise = async () => {
            const response = await api.post('/projects/projects/', {
                ...newProject,
                tech_stack: techStackArray,
            });

            const createdProject = response.data;

            if (aiSuggestedModules.length > 0) {
                for (const module of aiSuggestedModules) {
                    await api.post('/projects/modules/', {
                        name: module.name,
                        description: module.description,
                        project_id: createdProject.id
                    });
                }
            }
            return createdProject;
        };

        toast.promise(savePromise(), {
            loading: 'Initializing project architecture...',
            success: () => {
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
                setAiSuggestedModules([]);
                fetchData();
                setSubmitting(false);
                return 'Project created successfully';
            },
            error: (err) => {
                setSubmitting(false);
                const apiError = err as { response?: { data?: { detail?: string } } };
                return apiError.response?.data?.detail || 'Failed to create project';
            }
        });
    };

    const handleEditProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject) return;
        setSubmitting(true);

        const techStackArray = editProject.tech_stack
            ? editProject.tech_stack.split(',').map(s => s.trim()).filter(Boolean)
            : [];

        toast.promise(api.patch(`/projects/projects/${selectedProject.id}/`, {
            ...editProject,
            tech_stack: techStackArray,
        }), {
            loading: 'Syncing project modifications...',
            success: () => {
                setShowEditModal(false);
                setSelectedProject(null);
                fetchData();
                setSubmitting(false);
                return 'Project updated successfully';
            },
            error: (err) => {
                setSubmitting(false);
                const apiError = err as { response?: { data?: { detail?: string } } };
                return apiError.response?.data?.detail || 'Failed to update project';
            }
        });
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



    const fetchProjectModules = async (projectId: number) => {
        try {
            const response = await api.get(`/projects/projects/${projectId}/modules/`);
            setProjectModules(response.data);
        } catch {
            setProjectModules([]);
        }
    };



    const handleAddModule = async () => {
        if (!selectedProject || !newModule.name) return;
        setSubmitting(true);
        toast.promise(api.post('/projects/modules/', {
            ...newModule,
            project_id: selectedProject.id
        }), {
            loading: 'Injecting module into project scope...',
            success: () => {
                setNewModule({ name: '', description: '' });
                fetchProjectModules(selectedProject.id);
                setSubmitting(false);
                return 'Module added successfully';
            },
            error: (err) => {
                setSubmitting(false);
                const apiError = err as { response?: { data?: Record<string, unknown> } };
                const errorData = apiError.response?.data;
                if (typeof errorData === 'object' && errorData !== null && Object.keys(errorData).length > 0) {
                    return Object.entries(errorData)
                        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                        .join(', ');
                }
                return (apiError.response?.data as { detail?: string })?.detail || 'Failed to add module';
            }
        });
    };



    const getDifficultyBadge = (difficulty: number) => {
        const colors = {
            1: 'bg-green-500/10 text-green-600 border-green-500/20',
            2: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
            3: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
            4: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
            5: 'bg-red-500/10 text-red-600 border-red-500/20'
        };
        const labels = {1: 'Beginner', 2: 'Easy', 3: 'Medium', 4: 'Hard', 5: 'Expert'};
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-lg border ${colors[difficulty as keyof typeof colors] || colors[3]}`}>
                {labels[difficulty as keyof typeof labels] || 'Medium'}
            </span>
        );
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
                    <p className="text-[var(--text-dim)] animate-pulse">Loading projects...</p>
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
                    <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2">
                        Project <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Management</span>
                    </h1>
                    <p className="text-[var(--text-dim)]">Track and manage all projects</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex items-center bg-[var(--bg-muted)] rounded-xl p-1 border border-[var(--border-color)]">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-purple-500/20 text-purple-400' : 'text-[var(--text-dim)] hover:text-[var(--text-main)]'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-purple-500/20 text-purple-400' : 'text-[var(--text-dim)] hover:text-[var(--text-main)]'}`}
                        >
                            <ListIcon size={18} />
                        </button>
                    </div>
                    {showAddButton && (
                        <>
                            <Button
                                onClick={() => navigate('/directory/projects/ai-suggestions')}
                                variant="outline"
                                icon={<Sparkles size={18} />}
                            >
                                AI Suggestions
                            </Button>
                            <Button
                                onClick={() => navigate('/directory/projects/create')}
                                gradient="purple"
                                icon={<Plus size={18} />}
                            >
                                New Project
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Projects Grid */}
            {projects.length === 0 ? (
                <Card className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-[var(--bg-muted)] rounded-full flex items-center justify-center">
                        <FolderKanban size={24} className="text-[var(--text-muted)]" />
                    </div>
                    <h3 className="text-lg font-medium text-[var(--text-main)] mb-2">No projects found</h3>
                    <p className="text-[var(--text-dim)]">Create your first project to get started</p>
                </Card>
            ) : (
                <div className={viewMode === 'grid'
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    : "space-y-4"
                }>
                    {projects.map((project) => (
                        <div key={project.id} onClick={() => navigate(`/directory/projects/${project.id}`)} className="cursor-pointer">
                        <Card hover className="group">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/10">
                                        <FolderKanban size={20} className="text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-[var(--text-main)] group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                            {project.name}
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs text-[var(--text-dim)] mt-1">
                                            <Clock size={12} />
                                            {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'No date'}
                                        </div>
                                    </div>
                                </div>
                                {getStatusBadge(project.status)}
                            </div>

                            {/* Description */}
                            <p className="text-sm text-[var(--text-dim)] mb-4 line-clamp-2">
                                {project.description || 'No description provided'}
                            </p>

                            {/* Tech Stack */}
                            {project.tech_stack && project.tech_stack.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {project.tech_stack.slice(0, 3).map((tech, index) => (
                                        <span key={index} className="px-2 py-1 text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-300 rounded-lg border border-purple-500/20">
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

                            {/* Mentor */}
                            <div className="flex items-center gap-2 text-sm text-[var(--text-dim)] mb-4">
                                <Users size={14} className="text-purple-600 dark:text-purple-400" />
                                <span>Mentor: {project.mentor?.full_name || 'Unassigned'}</span>
                            </div>

                            {/* Assigned Interns */}
                            <div className="pt-4 border-t border-[var(--border-color)]">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-[var(--text-dim)] flex items-center gap-2">
                                        <Users size={14} className="text-indigo-600 dark:text-indigo-400" />
                                        Assigned ({project.assignments?.length || 0})
                                    </span>
                                    {showAddButton && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/directory/projects/${project.id}/assign-intern`);
                                            }}
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
                                            <span key={assignment.id} className="px-2 py-1 text-xs font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 rounded-lg border border-indigo-500/20">
                                                {assignment.intern?.full_name || 'Unknown'}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-[var(--text-muted)]">No interns assigned</p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-color)]">
                                {project.repository_url && (
                                    <a
                                        href={project.repository_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-sm text-[var(--text-dim)] hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-1 transition-colors"
                                    >
                                        <ExternalLink size={14} />
                                        Repository
                                    </a>
                                )}
                                {showAddButton && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/directory/projects/${project.id}/edit`);
                                        }}
                                        className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors ml-auto"
                                    >
                                        <Edit size={14} />
                                        Edit
                                    </button>
                                )}
                            </div>
                        </Card>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Project Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => {
                    setShowAddModal(false);
                    setAiSuggestedModules([]);
                }}
                title="Create New Project"
                size="lg"
                gradient="purple"
            >
                <form onSubmit={handleAddProject} className="space-y-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                            <X size={16} />
                            {error}
                        </div>
                    )}

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Project Name *</label>
                        <input
                            type="text"
                            required
                            value={newProject.name}
                            onChange={e => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                            placeholder="My Awesome Project"
                        />
                    </div>

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Description *</label>
                        <textarea
                            required
                            value={newProject.description}
                            onChange={e => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none font-medium"
                            placeholder="Describe your project..."
                        />
                    </div>

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Status *</label>
                        <CustomSelect
                            value={newProject.status}
                            onChange={(v) => setNewProject(prev => ({ ...prev, status: v }))}
                            options={[
                                { value: 'PLANNED', label: 'Planned' },
                                { value: 'IN_PROGRESS', label: 'In Progress' },
                                { value: 'ON_HOLD', label: 'On Hold' },
                                { value: 'COMPLETED', label: 'Completed' },
                            ]}
                            accent="purple"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Start Date *</label>
                            <div className="relative">
                                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] z-10" />
                                <DatePicker
                                    selected={newProject.start_date ? new Date(newProject.start_date) : null}
                                    onChange={(date: Date | null) => {
                                        if (date) {
                                            const formattedDate = date.toISOString().split('T')[0];
                                            setNewProject(prev => ({ ...prev, start_date: formattedDate }));
                                        }
                                    }}
                                    dateFormat="yyyy-MM-dd"
                                    className="datepicker-input"
                                    placeholderText="Select start date"
                                    required
                                />
                            </div>
                        </div>
                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">End Date</label>
                            <div className="relative">
                                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] z-10" />
                                <DatePicker
                                    selected={newProject.end_date ? new Date(newProject.end_date) : null}
                                    onChange={(date: Date | null) => {
                                        if (date) {
                                            const formattedDate = date.toISOString().split('T')[0];
                                            setNewProject(prev => ({ ...prev, end_date: formattedDate }));
                                        } else {
                                            setNewProject(prev => ({ ...prev, end_date: '' }));
                                        }
                                    }}
                                    dateFormat="yyyy-MM-dd"
                                    className="datepicker-input"
                                    placeholderText="Select end date"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Repository URL</label>
                        <div className="relative">
                            <ExternalLink size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input
                                type="url"
                                placeholder="https://github.com/..."
                                value={newProject.repository_url}
                                onChange={e => setNewProject(prev => ({ ...prev, repository_url: e.target.value }))}
                                className="w-full pl-12 pr-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Tech Stack</label>
                        <input
                            type="text"
                            placeholder="React, Node.js, PostgreSQL..."
                            value={newProject.tech_stack}
                            onChange={e => setNewProject(prev => ({ ...prev, tech_stack: e.target.value }))}
                            className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                        />
                        <p className="text-xs text-[var(--text-muted)] mt-1">Separate technologies with commas</p>
                    </div>

                    {aiSuggestedModules.length > 0 && (
                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-3">
                                <span className="flex items-center gap-2">
                                    <FolderKanban size={16} className="text-purple-600 dark:text-purple-400" />
                                    AI-Suggested Modules
                                </span>
                            </label>
                            <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                {aiSuggestedModules.map((module, index) => (
                                    <div key={index} className="bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-medium text-[var(--text-main)]">{module.name}</h4>
                                            <span className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-300 px-2 py-1 rounded-lg border border-purple-500/20">
                                                {module.estimated_hours} hours
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--text-dim)]">{module.description}</p>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 flex items-center gap-1">
                                <Sparkles size={12} />
                                These modules will be automatically added to your project
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setShowAddModal(false);
                                setAiSuggestedModules([]);
                            }}
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
            </Modal>

            {/* Edit Project Modal */}
            <Modal
                isOpen={showEditModal && !!selectedProject}
                onClose={() => setShowEditModal(false)}
                title="Edit Project"
                size="lg"
                gradient="purple"
            >
                <form onSubmit={handleEditProject} className="space-y-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                            <X size={16} />
                            {error}
                        </div>
                    )}

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Project Name *</label>
                        <input
                            type="text"
                            required
                            value={editProject.name}
                            onChange={e => setEditProject(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                        />
                    </div>

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Description *</label>
                        <textarea
                            required
                            value={editProject.description}
                            onChange={e => setEditProject(prev => ({ ...prev, description: e.target.value }))}
                            rows={4}
                            className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none font-medium"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Status *</label>
                            <CustomSelect
                                value={editProject.status}
                                onChange={(v) => setEditProject(prev => ({ ...prev, status: v }))}
                                options={[
                                    { value: 'PLANNED', label: 'Planned' },
                                    { value: 'IN_PROGRESS', label: 'In Progress' },
                                    { value: 'ON_HOLD', label: 'On Hold' },
                                    { value: 'COMPLETED', label: 'Completed' },
                                ]}
                                accent="purple"
                            />
                        </div>
                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Start Date *</label>
                            <div className="relative">
                                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] z-10" />
                                <DatePicker
                                    selected={editProject.start_date ? new Date(editProject.start_date) : null}
                                    onChange={(date: Date | null) => {
                                        if (date) {
                                            const formattedDate = date.toISOString().split('T')[0];
                                            setEditProject(prev => ({ ...prev, start_date: formattedDate }));
                                        }
                                    }}
                                    dateFormat="yyyy-MM-dd"
                                    className="datepicker-input"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">End Date</label>
                        <div className="relative">
                            <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] z-10" />
                            <DatePicker
                                selected={editProject.end_date ? new Date(editProject.end_date) : null}
                                onChange={(date: Date | null) => {
                                    if (date) {
                                        const formattedDate = date.toISOString().split('T')[0];
                                        setEditProject(prev => ({ ...prev, end_date: formattedDate }));
                                    } else {
                                        setEditProject(prev => ({ ...prev, end_date: '' }));
                                    }
                                }}
                                dateFormat="yyyy-MM-dd"
                                className="datepicker-input"
                            />
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Repository URL</label>
                        <input
                            type="url"
                            value={editProject.repository_url || ''}
                            onChange={e => setEditProject(prev => ({ ...prev, repository_url: e.target.value }))}
                            placeholder="https://github.com/..."
                            className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
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
                            gradient="purple"
                            loading={submitting}
                            fullWidth
                        >
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Modal>





        </div>
    );
};

export default ProjectList;
