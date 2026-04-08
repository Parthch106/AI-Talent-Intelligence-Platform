import React, { useEffect, useState } from 'react';
import { Plus, LayoutGrid, List as ListIcon, Users, X, Edit, UserPlus, Calendar, ExternalLink, FolderKanban, Clock, Sparkles } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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

interface AISuggestion {
    name: string;
    description: string;
    estimated_duration: number;
    difficulty: number;
    tech_stack: string[];
    learning_objectives: string[];
    business_value: string;
    modules: {
        name: string;
        description: string;
        estimated_hours: number;
    }[];
}

const ProjectList: React.FC = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [interns, setInterns] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showAISuggestionsModal, setShowAISuggestionsModal] = useState(false);
    const [showAIInputModal, setShowAIInputModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [projectModules, setProjectModules] = useState<any[]>([]);
    const [newModule, setNewModule] = useState({ name: '', description: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
    const [generatingAISuggestions, setGeneratingAISuggestions] = useState(false);
    const [aiInput, setAiInput] = useState({
        description: '',
        skills: '',
        duration: '3 months'
    });
    const [aiSuggestedModules, setAiSuggestedModules] = useState<any[]>([]);

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
            const response = await api.post('/projects/projects/', {
                ...newProject,
                tech_stack: techStackArray,
            });

            const createdProject = response.data;

            // Create AI-suggested modules if any
            if (aiSuggestedModules.length > 0) {
                for (const module of aiSuggestedModules) {
                    try {
                        await api.post('/projects/modules/', {
                            name: module.name,
                            description: module.description,
                            project_id: createdProject.id
                        });
                    } catch (moduleErr) {
                        console.error('Failed to create module:', module.name, moduleErr);
                        // Continue with other modules even if one fails
                    }
                }
            }

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
            setAiSuggestedModules([]); // Clear suggested modules
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

    const fetchProjectModules = async (projectId: number) => {
        try {
            const response = await api.get(`/projects/projects/${projectId}/modules/`);
            setProjectModules(response.data);
        } catch (err) {
            setProjectModules([]);
        }
    };

    const handleOpenDetailModal = (project: Project) => {
        setSelectedProject(project);
        setShowDetailModal(true);
        fetchProjectModules(project.id);
    };

    const handleAddModule = async () => {
        if (!selectedProject || !newModule.name) return;
        setSubmitting(true);
        try {
            // Use the modules endpoint directly with project_id
            await api.post('/projects/modules/', {
                ...newModule,
                project_id: selectedProject.id
            });
            setNewModule({ name: '', description: '' });
            fetchProjectModules(selectedProject.id);
        } catch (err: any) {
            console.error('Add module error:', err.response?.data);
            const errorData = err.response?.data;
            if (typeof errorData === 'object' && errorData !== null) {
                const errorMessages = Object.entries(errorData).map(([key, value]) => `${key}: ${value}`).join(', ');
                setError(errorMessages);
            } else {
                setError(err.response?.data?.detail || 'Failed to add module');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenAIInputModal = () => {
        setShowAIInputModal(true);
    };

    const handleGenerateAISuggestions = async () => {
        setGeneratingAISuggestions(true);
        setError('');
        setShowAIInputModal(false);

        try {
            // Get department from user profile - assuming it's available
            const department = user?.department || 'Web Development'; // Default fallback

            const requestData: any = {
                department: department,
                experience_level: 'BEGINNER',
                num_suggestions: 1,  // Reduced to avoid token limits
                duration: aiInput.duration
            };

            // Add optional fields if provided
            if (aiInput.description.trim()) {
                requestData.description = aiInput.description.trim();
            }
            if (aiInput.skills.trim()) {
                requestData.skills = aiInput.skills.trim();
            }

            const response = await api.post('/projects/projects/suggest_projects/', requestData);

            if (response.data.error) {
                setError(response.data.error);
                return;
            }

            setAiSuggestions(response.data.projects || []);
            setShowAISuggestionsModal(true);

            // Reset input for next use
            setAiInput({ description: '', skills: '', duration: '3 months' });
        } catch (err: any) {
            console.error('AI suggestion error:', err);
            setError(err.response?.data?.error || 'Failed to generate AI suggestions');
        } finally {
            setGeneratingAISuggestions(false);
        }
    };

    const handleCreateProjectFromSuggestion = (suggestion: AISuggestion) => {
        setNewProject({
            name: suggestion.name,
            description: suggestion.description,
            start_date: '',
            end_date: '',
            repository_url: '',
            tech_stack: suggestion.tech_stack.join(', '),
            status: 'PLANNED',
        });
        setAiSuggestedModules(suggestion.modules || []);
        setShowAISuggestionsModal(false);
        setShowAddModal(true);
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
                                onClick={handleOpenAIInputModal}
                                variant="outline"
                                icon={<Sparkles size={18} />}
                                disabled={generatingAISuggestions}
                            >
                                AI Suggestions
                            </Button>
                            <Button
                                onClick={() => setShowAddModal(true)}
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
                        <div key={project.id} onClick={() => handleOpenDetailModal(project)} className="cursor-pointer">
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
                                        className="text-sm text-[var(--text-dim)] hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-1 transition-colors"
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
                        <select
                            value={newProject.status}
                            onChange={e => setNewProject(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all appearance-none cursor-pointer font-medium"
                        >
                            <option value="PLANNED">Planned</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="ON_HOLD">On Hold</option>
                            <option value="COMPLETED">Completed</option>
                        </select>
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
                            <select
                                value={editProject.status}
                                onChange={e => setEditProject(prev => ({ ...prev, status: e.target.value }))}
                                className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all appearance-none cursor-pointer font-medium"
                            >
                                <option value="PLANNED">Planned</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="ON_HOLD">On Hold</option>
                                <option value="COMPLETED">Completed</option>
                            </select>
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

            {/* Assign Intern Modal */}
            <Modal
                isOpen={showAssignModal}
                onClose={() => setShowAssignModal(false)}
                title="Assign Intern to Project"
                size="md"
                gradient="violet"
            >
                <form onSubmit={handleAssignIntern} className="space-y-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                            <X size={16} />
                            {error}
                        </div>
                    )}

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Select Intern *</label>
                        <select
                            required
                            value={assignIntern.intern_id}
                            onChange={e => setAssignIntern(prev => ({ ...prev, intern_id: Number(e.target.value) }))}
                            className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none cursor-pointer font-medium"
                        >
                            <option value={0}>Select an intern...</option>
                            {interns
                                .filter(intern => !selectedProject?.assignments?.some(a => a.intern?.id === intern.id))
                                .map(intern => (
                                <option key={intern.id} value={intern.id}>
                                    {intern.full_name} ({intern.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Role in Project *</label>
                        <input
                            type="text"
                            required
                            value={assignIntern.role}
                            onChange={e => setAssignIntern(prev => ({ ...prev, role: e.target.value }))}
                            placeholder="e.g. Frontend Developer"
                            className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium"
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
                            gradient="purple"
                            loading={submitting}
                            fullWidth
                        >
                            Assign Intern
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Project Detail Modal */}
            <Modal
                isOpen={showDetailModal && !!selectedProject}
                onClose={() => setShowDetailModal(false)}
                title={selectedProject?.name || 'Project Details'}
                size="2xl"
                gradient="purple"
            >
                {selectedProject && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                {/* Project Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-[var(--bg-muted)] rounded-xl border border-transparent hover:border-[var(--border-color)] transition-all">
                                        <p className="text-xs text-[var(--text-dim)] mb-1">Status</p>
                                        {getStatusBadge(selectedProject.status)}
                                    </div>
                                    <div className="p-4 bg-[var(--bg-muted)] rounded-xl border border-transparent hover:border-[var(--border-color)] transition-all">
                                        <p className="text-xs text-[var(--text-dim)] mb-1">Mentor</p>
                                        <p className="text-sm font-medium text-[var(--text-main)] truncate">{selectedProject.mentor?.full_name || 'Unassigned'}</p>
                                    </div>
                                    <div className="p-4 bg-[var(--bg-muted)] rounded-xl border border-transparent hover:border-[var(--border-color)] transition-all">
                                        <p className="text-xs text-[var(--text-dim)] mb-1">Start Date</p>
                                        <p className="text-sm font-medium text-[var(--text-main)]">{selectedProject.start_date ? new Date(selectedProject.start_date).toLocaleDateString() : 'Not set'}</p>
                                    </div>
                                    <div className="p-4 bg-[var(--bg-muted)] rounded-xl border border-transparent hover:border-[var(--border-color)] transition-all">
                                        <p className="text-xs text-[var(--text-dim)] mb-1">End Date</p>
                                        <p className="text-sm font-medium text-[var(--text-main)]">{selectedProject.end_date ? new Date(selectedProject.end_date).toLocaleDateString() : 'Not set'}</p>
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <h3 className="text-sm font-semibold text-[var(--text-main)] mb-2">Description</h3>
                                    <p className="text-sm text-[var(--text-dim)] bg-[var(--bg-muted)] p-5 rounded-xl border border-transparent">
                                        {selectedProject.description || 'No description provided'}
                                    </p>
                                </div>

                                {/* Tech Stack */}
                                {selectedProject.tech_stack && selectedProject.tech_stack.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-[var(--text-main)] mb-2">Tech Stack</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedProject.tech_stack.map((tech, index) => (
                                                <span key={index} className="px-3 py-1.5 text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-300 rounded-lg border border-purple-500/20 shadow-sm">
                                                    {tech}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Repository */}
                                {selectedProject.repository_url && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-[var(--text-main)] mb-2">Repository</h3>
                                        <a
                                            href={selectedProject.repository_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors p-4 bg-[var(--bg-muted)] rounded-xl border border-purple-500/10 hover:border-purple-500/30 group"
                                        >
                                            <ExternalLink size={16} className="text-purple-500 group-hover:text-purple-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                            <span className="truncate">{selectedProject.repository_url}</span>
                                        </a>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">
                                {/* Assigned Interns */}
                                <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                                            <Users size={16} className="text-indigo-400" />    
                                            Assigned Interns ({selectedProject.assignments?.length || 0})
                                        </h3>
                                        {showAddButton && (
                                            <button
                                                onClick={() => {
                                                    setShowDetailModal(false);
                                                    openAssignModal(selectedProject);
                                                }}
                                                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors bg-purple-500/10 px-2 py-1 rounded-md"
                                            >
                                                <UserPlus size={12} />
                                                Add Intern
                                            </button>
                                        )}
                                    </div>
                                    <div className="overflow-y-auto max-h-[220px] pr-2 custom-scrollbar">
                                        {selectedProject.assignments && selectedProject.assignments.length > 0 ? (
                                            <div className="space-y-2">
                                                {selectedProject.assignments.map((assignment) => (
                                                    <div key={assignment.id} className="flex items-center justify-between p-3 bg-[var(--bg-muted)] hover:bg-[var(--bg-color)] rounded-xl border border-transparent hover:border-indigo-500/20 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center border border-indigo-500/30">
                                                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">
                                                                    {assignment.intern?.full_name?.charAt(0) || '?'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-[var(--text-main)]">{assignment.intern?.full_name || 'Unknown'}</p>
                                                                <p className="text-xs text-[var(--text-dim)] mt-0.5">{assignment.role || 'No role'}</p>
                                                            </div>
                                                        </div>
                                                        <Badge variant={assignment.status === 'ACTIVE' ? 'success' : 'warning'}>
                                                            {assignment.status}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-6 flex flex-col items-center text-center text-[var(--text-muted)] bg-[var(--bg-muted)] rounded-xl">
                                                <Users size={20} className="mb-2 opacity-50 text-indigo-400" />
                                                <p className="text-sm">No interns assigned</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Modules */}
                                <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                                            <LayoutGrid size={16} className="text-pink-400" />
                                            Modules ({projectModules.length})
                                        </h3>
                                        {showAddButton && (
                                            <button
                                                onClick={() => {
                                                    document.getElementById('module-name-input')?.focus();
                                                }}
                                                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors bg-purple-500/10 px-2 py-1 rounded-md"
                                            >
                                                <Plus size={12} />
                                                Add Module
                                            </button>
                                        )}
                                    </div>
                                    
                                    {/* Add Module Form */}
                                    {showAddButton && (
                                        <div className="mb-4 p-4 bg-[var(--bg-muted)] border border-pink-500/10 rounded-xl">
                                            <p className="text-xs font-medium text-[var(--text-dim)] mb-3 flex items-center gap-1.5"><Plus size={12} className="text-pink-400"/> New Module</p>
                                            <div className="space-y-3">
                                                <input
                                                    id="module-name-input"
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
                                        </div>
                                    )}

                                    <div className="overflow-y-auto max-h-[220px] pr-2 custom-scrollbar">
                                        {projectModules.length > 0 ? (
                                            <div className="space-y-2">
                                                {projectModules.map((module: any) => (
                                                    <div key={module.id} className="p-3 bg-[var(--bg-muted)] hover:bg-[var(--bg-color)] rounded-xl border border-transparent hover:border-pink-500/20 transition-colors">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="text-sm font-medium text-[var(--text-main)]">{module.name}</p>
                                                                <p className="text-xs text-[var(--text-dim)] mt-1">{module.description || 'No description'}</p>
                                                            </div>
                                                            <span className="text-xs font-medium bg-[var(--bg-color)] px-2 py-1 rounded text-[var(--text-muted)]">Ord: {module.order || 0}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-6 flex flex-col items-center text-center text-[var(--text-muted)] bg-[var(--bg-muted)] rounded-xl">
                                                <LayoutGrid size={20} className="mb-2 opacity-50 text-pink-400" />
                                                <p className="text-sm">No modules created</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        {showAddButton && (
                            <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-color)]">
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowDetailModal(false)}
                                    className="w-32"
                                >
                                    Close
                                </Button>
                                <Button
                                    gradient="purple"
                                    onClick={() => {
                                        setShowDetailModal(false);
                                        openEditModal(selectedProject);
                                    }}
                                    className="w-48"
                                    icon={<Edit size={16} />}
                                >
                                    Edit Project
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* AI Input Modal */}
            <Modal
                isOpen={showAIInputModal}
                onClose={() => setShowAIInputModal(false)}
                title="AI Project Suggestions"
                size="md"
                gradient="purple"
            >
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
                            Project Description (Optional)
                        </label>
                        <textarea
                            value={aiInput.description}
                            onChange={(e) => setAiInput(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Describe the type of project you want suggestions for..."
                            className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none"
                            rows={3}
                        />
                        <p className="text-xs text-[var(--text-dim)] mt-1">
                            E.g., "Build a task management app" or "Create a data visualization dashboard"
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
                            Required Skills (Optional)
                        </label>
                        <input
                            type="text"
                            value={aiInput.skills}
                            onChange={(e) => setAiInput(prev => ({ ...prev, skills: e.target.value }))}
                            placeholder="Enter skills separated by commas..."
                            className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                        />
                        <p className="text-xs text-[var(--text-dim)] mt-1">
                            E.g., "React, Node.js, Python" or "HTML, CSS, JavaScript"
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
                            Project Duration
                        </label>
                        <select
                            value={aiInput.duration}
                            onChange={(e) => setAiInput(prev => ({ ...prev, duration: e.target.value }))}
                            className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all appearance-none cursor-pointer"
                        >
                            <option value="1 month">1 Month</option>
                            <option value="2 months">2 Months</option>
                            <option value="3 months">3 Months</option>
                            <option value="6 months">6 Months</option>
                        </select>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                                <span className="text-white text-xs font-bold">i</span>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                                    How it works
                                </h4>
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                    AI will generate project suggestions based on your department ({user?.department || 'Web Development'}).
                                    Providing description or skills will make suggestions more tailored to your needs.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                        <Button
                            variant="ghost"
                            onClick={() => setShowAIInputModal(false)}
                            fullWidth
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleGenerateAISuggestions}
                            gradient="purple"
                            disabled={generatingAISuggestions}
                            fullWidth
                        >
                            {generatingAISuggestions ? 'Generating...' : 'Generate Suggestions'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* AI Project Suggestions Modal */}
            <Modal
                isOpen={showAISuggestionsModal}
                onClose={() => setShowAISuggestionsModal(false)}
                title="AI Project Suggestions"
                size="2xl"
                gradient="purple"
            >
                <div className="space-y-6">
                    {aiSuggestions.length === 0 ? (
                        <div className="text-center py-12">
                            <Sparkles size={48} className="mx-auto mb-4 text-[var(--text-muted)] opacity-20" />
                            <h3 className="text-lg font-medium text-[var(--text-main)] mb-2">No suggestions available</h3>
                            <p className="text-[var(--text-dim)]">Try generating new suggestions</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {aiSuggestions.map((suggestion, index) => (
                                <Card key={index} hover className="group h-auto">
                                    <div className="p-6 h-full flex flex-col">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                                                    <FolderKanban size={20} className="text-purple-600 dark:text-purple-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-[var(--text-main)] mb-1 leading-tight">
                                                        {suggestion.name}
                                                    </h3>
                                                    {getDifficultyBadge(suggestion.difficulty)}
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-sm text-[var(--text-dim)] mb-4 line-clamp-3">
                                            "{suggestion.description}"
                                        </p>

                                        <div className="space-y-4 flex-1">
                                            <div className="flex items-center gap-2 text-sm text-[var(--text-dim)] font-medium">
                                                <Clock size={14} className="text-purple-500" />
                                                <span>{suggestion.estimated_duration} weeks</span>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {suggestion.tech_stack.slice(0, 3).map((tech, techIndex) => (
                                                    <span key={techIndex} className="px-2 py-1 text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-300 rounded border border-purple-500/20 uppercase tracking-tight">
                                                        {tech}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">Learning Objectives:</h4>
                                                <ul className="text-xs text-[var(--text-dim)] space-y-1">
                                                    {suggestion.learning_objectives.slice(0, 2).map((objective, objIndex) => (
                                                        <li key={objIndex} className="flex items-start gap-2">
                                                            <div className="w-1 h-1 bg-purple-500 rounded-full mt-1.5 shrink-0" />
                                                            <span>{objective}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="pt-6 mt-auto">
                                            <Button
                                                size="sm"
                                                gradient="purple"
                                                fullWidth
                                                onClick={() => handleCreateProjectFromSuggestion(suggestion)}
                                            >
                                                Use This Idea
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                        <Button
                            variant="ghost"
                            onClick={() => setShowAISuggestionsModal(false)}
                            className="w-32"
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default ProjectList;
