import React, { useEffect, useState } from 'react';
import { Plus, LayoutGrid, List as ListIcon, Users, X, Edit, UserPlus } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return '#10b981';
            case 'IN_PROGRESS': return '#6366f1';
            case 'ON_HOLD': return '#f59e0b';
            default: return '#6b7280';
        }
    };

    if (loading) return <div>Loading projects...</div>;

    const showAddButton = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    return (
        <div>
            <div className="header">
                <h2 style={{ margin: 0 }}>Projects</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button style={{ background: 'var(--card-bg)', padding: '0.5rem' }}><LayoutGrid size={18} /></button>
                    <button style={{ background: 'var(--card-bg)', padding: '0.5rem' }}><ListIcon size={18} /></button>
                    {showAddButton && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Plus size={18} /> New Project
                        </button>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                {projects.length === 0 ? (
                    <div>No projects found.</div>
                ) : (
                    projects.map((project) => (
                        <div key={project.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                <h4 style={{ margin: 0, color: 'var(--primary-color)' }}>{project.name}</h4>
                                <span style={{
                                    fontSize: '0.75rem',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '1rem',
                                    background: `${getStatusColor(project.status)}20`,
                                    color: getStatusColor(project.status)
                                }}>
                                    {project.status.replace('_', ' ')}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
                                {project.description || 'No description'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
                                Mentor: {project.mentor?.full_name || 'Unassigned'}
                            </div>
                            {project.tech_stack && project.tech_stack.length > 0 && (
                                <div style={{ marginBottom: '0.5rem' }}>
                                    {project.tech_stack.slice(0, 3).map((tech, index) => (
                                        <span key={index} style={{
                                            fontSize: '0.7rem',
                                            padding: '0.1rem 0.4rem',
                                            borderRadius: '0.25rem',
                                            background: 'var(--primary-color)',
                                            color: 'white',
                                            marginRight: '0.25rem'
                                        }}>
                                            {tech}
                                        </span>
                                    ))}
                                    {project.tech_stack.length > 3 && (
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginLeft: '0.25rem' }}>
                                            +{project.tech_stack.length - 3} more
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Assigned Interns */}
                            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Users size={14} />
                                        Assigned Interns ({project.assignments?.length || 0})
                                    </span>
                                    {showAddButton && (
                                        <button
                                            onClick={() => openAssignModal(project)}
                                            style={{ background: 'transparent', color: 'var(--primary-color)', padding: 0, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px' }}
                                        >
                                            <UserPlus size={12} /> Add
                                        </button>
                                    )}
                                </div>
                                {project.assignments && project.assignments.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                        {project.assignments.map((assignment) => (
                                            <span key={assignment.id} style={{
                                                fontSize: '0.7rem',
                                                padding: '0.2rem 0.4rem',
                                                borderRadius: '0.25rem',
                                                background: 'rgba(99, 102, 241, 0.1)',
                                                color: '#6366f1',
                                            }}>
                                                {assignment.intern?.full_name || 'Unknown'}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>No interns assigned</span>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                                    {project.start_date ? new Date(project.start_date).toLocaleDateString() : ''}
                                </div>
                                {showAddButton && (
                                    <button
                                        onClick={() => openEditModal(project)}
                                        style={{ background: 'transparent', color: 'var(--primary-color)', padding: 0, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <Edit size={14} /> Edit
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Project Modal */}
            {showAddModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ width: '550px', maxHeight: '90vh', overflow: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Create New Project</h3>
                            <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', padding: '0.5rem' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {error && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

                        <form onSubmit={handleAddProject}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Project Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={newProject.name}
                                    onChange={e => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Description *</label>
                                <textarea
                                    required
                                    value={newProject.description}
                                    onChange={e => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Status *</label>
                                <select
                                    value={newProject.status}
                                    onChange={e => setNewProject(prev => ({ ...prev, status: e.target.value }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                >
                                    <option value="PLANNED">Planned</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="ON_HOLD">On Hold</option>
                                    <option value="COMPLETED">Completed</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Start Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={newProject.start_date}
                                        onChange={e => setNewProject(prev => ({ ...prev, start_date: e.target.value }))}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>End Date</label>
                                    <input
                                        type="date"
                                        value={newProject.end_date}
                                        onChange={e => setNewProject(prev => ({ ...prev, end_date: e.target.value }))}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                    />
                                </div>
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Repository URL</label>
                                <input
                                    type="url"
                                    placeholder="https://github.com/..."
                                    value={newProject.repository_url}
                                    onChange={e => setNewProject(prev => ({ ...prev, repository_url: e.target.value }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Tech Stack (comma-separated)</label>
                                <input
                                    type="text"
                                    placeholder="React, Node.js, PostgreSQL, ..."
                                    value={newProject.tech_stack}
                                    onChange={e => setNewProject(prev => ({ ...prev, tech_stack: e.target.value }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.25rem', border: 'none', background: 'var(--primary-color)', color: 'white', cursor: 'pointer' }}
                                >
                                    {submitting ? 'Creating...' : 'Create Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Project Modal */}
            {showEditModal && selectedProject && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ width: '550px', maxHeight: '90vh', overflow: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Edit Project</h3>
                            <button onClick={() => setShowEditModal(false)} style={{ background: 'transparent', padding: '0.5rem' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {error && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

                        <form onSubmit={handleEditProject}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Project Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={editProject.name}
                                    onChange={e => setEditProject(prev => ({ ...prev, name: e.target.value }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Description *</label>
                                <textarea
                                    required
                                    value={editProject.description}
                                    onChange={e => setEditProject(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Status *</label>
                                <select
                                    value={editProject.status}
                                    onChange={e => setEditProject(prev => ({ ...prev, status: e.target.value }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                >
                                    <option value="PLANNED">Planned</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="ON_HOLD">On Hold</option>
                                    <option value="COMPLETED">Completed</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Start Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={editProject.start_date}
                                        onChange={e => setEditProject(prev => ({ ...prev, start_date: e.target.value }))}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>End Date</label>
                                    <input
                                        type="date"
                                        value={editProject.end_date}
                                        onChange={e => setEditProject(prev => ({ ...prev, end_date: e.target.value }))}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                    />
                                </div>
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Repository URL</label>
                                <input
                                    type="url"
                                    placeholder="https://github.com/..."
                                    value={editProject.repository_url}
                                    onChange={e => setEditProject(prev => ({ ...prev, repository_url: e.target.value }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Tech Stack (comma-separated)</label>
                                <input
                                    type="text"
                                    placeholder="React, Node.js, PostgreSQL, ..."
                                    value={editProject.tech_stack}
                                    onChange={e => setEditProject(prev => ({ ...prev, tech_stack: e.target.value }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.25rem', border: 'none', background: 'var(--primary-color)', color: 'white', cursor: 'pointer' }}
                                >
                                    {submitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Intern Modal */}
            {showAssignModal && selectedProject && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ width: '450px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Assign Intern to Project</h3>
                            <button onClick={() => setShowAssignModal(false)} style={{ background: 'transparent', padding: '0.5rem' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--card-bg)', borderRadius: '0.25rem' }}>
                            <strong>{selectedProject.name}</strong>
                        </div>

                        {error && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

                        <form onSubmit={handleAssignIntern}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Select Intern *</label>
                                <select
                                    required
                                    value={assignIntern.intern_id || ''}
                                    onChange={e => setAssignIntern(prev => ({ ...prev, intern_id: parseInt(e.target.value) }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                >
                                    <option value="">Choose an intern...</option>
                                    {interns
                                        .filter(intern => !selectedProject.assignments?.some(a => a.intern.id === intern.id))
                                        .map(intern => (
                                            <option key={intern.id} value={intern.id}>{intern.full_name}</option>
                                        ))
                                    }
                                </select>
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Role (e.g., Frontend Developer)</label>
                                <input
                                    type="text"
                                    placeholder="Role in project"
                                    value={assignIntern.role}
                                    onChange={e => setAssignIntern(prev => ({ ...prev, role: e.target.value }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAssignModal(false)}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.25rem', border: 'none', background: 'var(--primary-color)', color: 'white', cursor: 'pointer' }}
                                >
                                    {submitting ? 'Assigning...' : 'Assign Intern'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectList;
