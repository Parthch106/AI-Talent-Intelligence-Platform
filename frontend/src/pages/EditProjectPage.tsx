import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { X, Calendar, ExternalLink, FolderKanban, Save, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import { Card, Button, CustomSelect } from '../components/common';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface EditProject {
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    repository_url: string;
    tech_stack: string;
    status: string;
}

const EditProjectPage: React.FC = () => {
    const navigate = useNavigate();
    const { projectId: id } = useParams<{ projectId: string }>();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [editProject, setEditProject] = useState<EditProject>({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        repository_url: '',
        tech_stack: '',
        status: 'PLANNED',
    });

    useEffect(() => {
        const fetchProject = async () => {
            try {
                // Since there is a trailing slash commonly required in Django/DRF, adding it here:
                const response = await api.get(`/projects/projects/${id}/`);
                const project = response.data;
                setEditProject({
                    name: project.name || '',
                    description: project.description || '',
                    start_date: project.start_date || '',
                    end_date: project.end_date || '',
                    repository_url: project.repository_url || '',
                    tech_stack: project.tech_stack?.join(', ') || '',
                    status: project.status || 'PLANNED',
                });
            } catch (err) {
                console.error("Failed to load project details", err);
                toast.error("Failed to load project details");
                navigate('/directory/projects');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchProject();
        }
    }, [id, navigate]);

    const handleEditProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        const techStackArray = editProject.tech_stack
            ? editProject.tech_stack.split(',').map(s => s.trim()).filter(Boolean)
            : [];

        toast.promise(api.patch(`/projects/projects/${id}/`, {
            ...editProject,
            tech_stack: techStackArray,
        }), {
            loading: 'Syncing project modifications...',
            success: () => {
                navigate('/directory/projects');
                return 'Project updated successfully';
            },
            error: (err) => {
                setSubmitting(false);
                const apiError = err as { response?: { data?: { detail?: string } } };
                return apiError.response?.data?.detail || 'Failed to update project';
            }
        });
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

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-6">
            <button
                onClick={() => navigate('/directory/projects')}
                className="flex items-center gap-2 text-sm font-medium text-[var(--text-dim)] hover:text-purple-400 transition-colors"
            >
                <ArrowLeft size={16} /> Back to Projects
            </button>

            <div>
                <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2 flex items-center gap-3">
                    <FolderKanban className="text-purple-500" />
                    Edit <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Project</span>
                </h1>
                <p className="text-[var(--text-dim)]">Modify the parameters for the project engagement.</p>
            </div>

            <Card padding="lg" className="border-purple-500/10">
                <form onSubmit={handleEditProject} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                            <X size={16} />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Project Name *</label>
                            <input
                                type="text"
                                required
                                value={editProject.name}
                                onChange={e => setEditProject(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                            />
                        </div>

                        <div className="md:col-span-2 group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Description *</label>
                            <textarea
                                required
                                value={editProject.description}
                                onChange={e => setEditProject(prev => ({ ...prev, description: e.target.value }))}
                                rows={4}
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none font-medium"
                            />
                        </div>

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
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Tech Stack</label>
                            <input
                                type="text"
                                placeholder="React, Node.js, PostgreSQL..."
                                value={editProject.tech_stack}
                                onChange={e => setEditProject(prev => ({ ...prev, tech_stack: e.target.value }))}
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-1">Separate technologies with commas</p>
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
                                    className="w-full pl-12 pr-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                                    required
                                />
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
                                    className="w-full pl-12 pr-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2 group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Repository URL</label>
                            <div className="relative">
                                <ExternalLink size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                <input
                                    type="url"
                                    value={editProject.repository_url}
                                    onChange={e => setEditProject(prev => ({ ...prev, repository_url: e.target.value }))}
                                    className="w-full pl-12 pr-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-color)]">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => navigate('/directory/projects')}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            gradient="purple"
                            loading={submitting}
                            icon={<Save size={18} />}
                        >
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default EditProjectPage;
