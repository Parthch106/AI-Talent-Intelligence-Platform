import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { X, Calendar, ExternalLink, FolderKanban, Sparkles, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import { Card, Button, CustomSelect } from '../components/common';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface NewProject {
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    repository_url: string;
    tech_stack: string;
    status: string;
}

const CreateProjectPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
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

    useEffect(() => {
        if (location.state?.suggestion) {
            const suggestion = location.state.suggestion;
            setNewProject({
                name: suggestion.name || '',
                description: suggestion.description || '',
                start_date: suggestion.start_date || '',
                end_date: suggestion.end_date || '',
                repository_url: '',
                tech_stack: Array.isArray(suggestion.tech_stack) ? suggestion.tech_stack.join(', ') : (suggestion.tech_stack || ''),
                status: 'PLANNED',
            });
        }
    }, [location.state]);

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
            return response.data;
        };

        toast.promise(savePromise(), {
            loading: 'Initializing project sequence...',
            success: () => {
                navigate('/directory/projects');
                return 'Project successfully created';
            },
            error: (err) => {
                setSubmitting(false);
                const apiError = err as { response?: { data?: { name?: string[], error?: string, detail?: string } } };
                const errorData = apiError.response?.data;
                if (errorData) {
                    if (errorData.name) return `Name error: ${errorData.name[0]}`;
                    if (errorData.error) return errorData.error;
                    if (errorData.detail) return errorData.detail;
                }
                return 'Failed to create project';
            }
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-6">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm font-medium text-[var(--text-dim)] hover:text-purple-400 transition-colors"
            >
                <ArrowLeft size={16} /> Back to Projects
            </button>

            <div>
                <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2 flex items-center gap-3">
                    <FolderKanban className="text-purple-500" />
                    Create New <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Project</span>
                </h1>
                <p className="text-[var(--text-dim)]">Define the parameters for a new project engagement.</p>
            </div>

            <Card padding="lg" className="border-purple-500/10">
                <form onSubmit={handleAddProject} className="space-y-6">
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
                                value={newProject.name}
                                onChange={e => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                                placeholder="e.g., Nexus Analytics Dashboard"
                            />
                        </div>

                        <div className="md:col-span-2 group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Description *</label>
                            <textarea
                                required
                                value={newProject.description}
                                onChange={e => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                                rows={4}
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none font-medium"
                                placeholder="Describe the objectives and scope of this project..."
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

                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Tech Stack</label>
                            <input
                                type="text"
                                placeholder="React, Node.js, PostgreSQL..."
                                value={newProject.tech_stack}
                                onChange={e => setNewProject(prev => ({ ...prev, tech_stack: e.target.value }))}
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-1">Separate technologies with commas</p>
                        </div>

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
                                    className="w-full pl-12 pr-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
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
                                    className="w-full pl-12 pr-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                                    placeholderText="Select end date"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2 group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Repository URL</label>
                            <div className="relative">
                                <ExternalLink size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                <input
                                    type="url"
                                    placeholder="https://github.com/..."
                                    value={newProject.repository_url}
                                    onChange={e => setNewProject(prev => ({ ...prev, repository_url: e.target.value }))}
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
                            icon={<Sparkles size={18} />}
                        >
                            Initialize Project
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default CreateProjectPage;
