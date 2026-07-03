import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { Card, Button } from '../components/common';
import { Target, ArrowLeft, Plus, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ProjectAssignment {
    id: number;
    project: {
        id: number;
        name: string;
    };
    intern?: {
        id: number | { id: number };
    } | number;
}

interface ProjectModule {
    id: number;
    name: string;
}

const EditTaskPage: React.FC = () => {
    const { taskId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Form state
    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        priority: 'MEDIUM',
        due_date: '',
        estimated_hours: 1,
        project_assignment_id: '',
        project_module_id: '',
        skills_required: [] as string[],
        parent_task_id: ''
    });

    const [projects, setProjects] = useState<ProjectAssignment[]>([]);
    const [modules, setModules] = useState<ProjectModule[]>([]);
    const [availableSkills, setAvailableSkills] = useState<string[]>([]);
    
    const [skillSearch, setSkillSearch] = useState('');
    const [showSkillDropdown, setShowSkillDropdown] = useState(false);

    useEffect(() => {
        fetchInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskId]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [projectsRes, skillsRes, taskRes] = await Promise.all([
                axios.get('/projects/assignments/'),
                axios.get('/analytics/skills/'),
                axios.get(`/analytics/tasks/${taskId}/`)
            ]);
            
            setProjects(projectsRes.data.results || []);
            setAvailableSkills(skillsRes.data.skills || []);

            const task = taskRes.data;
            setTaskForm({
                title: task.title || '',
                description: task.description || '',
                priority: task.priority || 'MEDIUM',
                due_date: task.due_date ? task.due_date.split('T')[0] : '',
                estimated_hours: task.estimated_hours || 1,
                project_assignment_id: task.project?.id?.toString() || '',
                project_module_id: task.module?.id?.toString() || '',
                skills_required: task.skills_required || [],
                parent_task_id: task.parent_task_id?.toString() || ''
            });

            if (task.project?.id) {
                fetchModules(task.project.id);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load task details');
            navigate(-1);
        } finally {
            setLoading(false);
        }
    };

    const fetchModules = async (projectId: number): Promise<void> => {
        try {
            const response = await axios.get(`/projects/modules/?project_id=${projectId}`);
            setModules(response.data || []);
        } catch (err) {
            console.error('Failed to fetch modules:', err);
        }
    };

    const handleProjectChange = (projectId: string) => {
        setTaskForm(prev => ({ ...prev, project_assignment_id: projectId, project_module_id: '' }));
        if (projectId) {
            // Find the actual project ID from the assignment
            const assignment = projects.find(p => p.id.toString() === projectId);
            if (assignment?.project?.id) {
                fetchModules(assignment.project.id);
            }
        } else {
            setModules([]);
        }
    };

    const toggleSkill = (skill: string) => {
        setTaskForm(prev => ({
            ...prev,
            skills_required: prev.skills_required.includes(skill)
                ? prev.skills_required.filter(s => s !== skill)
                : [...prev.skills_required, skill]
        }));
    };

    const filteredSkills = availableSkills.filter(skill => 
        skill.toLowerCase().includes(skillSearch.toLowerCase()) && 
        !taskForm.skills_required.includes(skill)
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const taskPayload: Record<string, string | number | string[]> = {
                title: taskForm.title,
                description: taskForm.description,
                priority: taskForm.priority,
                due_date: taskForm.due_date,
                estimated_hours: taskForm.estimated_hours,
                skills_required: taskForm.skills_required
            };
            if (taskForm.project_assignment_id) {
                taskPayload.project_assignment_id = parseInt(taskForm.project_assignment_id);
            } else {
                taskPayload.project_assignment_id = '';
            }
            if (taskForm.project_module_id) {
                taskPayload.project_module_id = parseInt(taskForm.project_module_id);
            } else {
                taskPayload.project_module_id = '';
            }
            if (taskForm.parent_task_id) {
                taskPayload.parent_task_id = parseInt(taskForm.parent_task_id);
            } else {
                taskPayload.parent_task_id = '';
            }

            await axios.patch(`/analytics/tasks/${taskId}/`, taskPayload);
            toast.success('Task successfully updated');
            navigate(-1);
        } catch (err) {
            console.error(err);
            toast.error('Failed to update task');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in p-6 max-w-5xl mx-auto">
            <button 
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-[var(--text-muted)] hover:text-purple-400 transition-colors group mb-4"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-bold tracking-widest uppercase">Back</span>
            </button>

            <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <Target size={32} className="text-purple-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-[var(--text-main)] mb-1">Edit Task Sequence</h1>
                    <p className="text-sm text-[var(--text-dim)] uppercase tracking-widest font-bold">
                        Modifying neural parameters for task {taskId}
                    </p>
                </div>
            </div>

            <Card className="p-8 border-[var(--border-color)]">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-2">
                            <label className="block text-sm font-black uppercase tracking-widest text-[var(--text-dim)]">Title</label>
                            <input
                                type="text"
                                required
                                value={taskForm.title}
                                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                                className="w-full px-5 py-4 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl text-[var(--text-main)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium text-lg"
                                placeholder="Enter task title"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-black uppercase tracking-widest text-[var(--text-dim)]">Priority</label>
                            <select
                                value={taskForm.priority}
                                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                                className="w-full px-5 py-4 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl text-[var(--text-main)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium text-lg"
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-black uppercase tracking-widest text-[var(--text-dim)]">Description</label>
                        <textarea
                            rows={6}
                            value={taskForm.description}
                            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                            className="w-full px-5 py-4 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl text-[var(--text-main)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium resize-none custom-scrollbar"
                            placeholder="Detailed task description..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-black uppercase tracking-widest text-[var(--text-dim)]">Project context</label>
                            <select
                                value={taskForm.project_assignment_id}
                                onChange={(e) => handleProjectChange(e.target.value)}
                                className="w-full px-5 py-4 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl text-[var(--text-main)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium"
                            >
                                <option value="">None (General Task)</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.project?.name || `Assignment #${p.id}`}</option>
                                ))}
                            </select>
                        </div>
                        
                        {taskForm.project_assignment_id && modules.length > 0 && (
                            <div className="space-y-2 animate-fade-in">
                                <label className="block text-sm font-black uppercase tracking-widest text-[var(--text-dim)]">Module context</label>
                                <select
                                    value={taskForm.project_module_id}
                                    onChange={(e) => setTaskForm({ ...taskForm, project_module_id: e.target.value })}
                                    className="w-full px-5 py-4 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl text-[var(--text-main)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium"
                                >
                                    <option value="">No Module Link</option>
                                    {modules.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-sm font-black uppercase tracking-widest text-[var(--text-dim)]">Parent subtask</label>
                            <input
                                type="number"
                                placeholder="Parent Task ID (Optional)"
                                value={taskForm.parent_task_id}
                                onChange={(e) => setTaskForm({ ...taskForm, parent_task_id: e.target.value })}
                                className="w-full px-5 py-4 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl text-[var(--text-main)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-black uppercase tracking-widest text-[var(--text-dim)]">Required skills</label>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {taskForm.skills_required.map(skill => (
                                <span key={skill} className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl text-sm font-bold flex items-center gap-2">
                                    {skill}
                                    <button type="button" onClick={() => toggleSkill(skill)} className="hover:text-red-400 transition-colors">
                                        &times;
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search to add skills..."
                                value={skillSearch}
                                onChange={(e) => {
                                    setSkillSearch(e.target.value);
                                    setShowSkillDropdown(true);
                                }}
                                onFocus={() => setShowSkillDropdown(true)}
                                className="w-full px-5 py-4 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl text-[var(--text-main)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium"
                            />
                            {showSkillDropdown && (skillSearch || filteredSkills.length > 0) && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40" 
                                        onClick={() => setShowSkillDropdown(false)}
                                    />
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-muted)]/95 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl shadow-2xl z-[101] max-h-[250px] overflow-y-auto custom-scrollbar animate-scale-in p-2">
                                        {filteredSkills.length > 0 ? (
                                            filteredSkills.map(skill => (
                                                <button
                                                    key={skill}
                                                    type="button"
                                                    onClick={() => toggleSkill(skill)}
                                                    className="w-full flex items-center justify-between p-3 hover:bg-purple-500/10 rounded-xl text-sm font-medium text-left text-[var(--text-dim)] hover:text-purple-400 transition-colors"
                                                >
                                                    {skill}
                                                    <Plus size={16} className="opacity-50" />
                                                </button>
                                            ))
                                        ) : skillSearch && (
                                            <div className="p-4 text-center text-[var(--text-muted)] text-sm font-medium">
                                                No matching skills found
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[var(--border-color)]">
                        <div className="space-y-2">
                            <label className="block text-sm font-black uppercase tracking-widest text-[var(--text-dim)]">Deadline</label>
                            <input
                                type="date"
                                required
                                value={taskForm.due_date}
                                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                                className="w-full px-5 py-4 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl text-[var(--text-main)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium text-lg"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-black uppercase tracking-widest text-[var(--text-dim)]">Time allocation (hours)</label>
                            <input
                                type="number"
                                required
                                min="1"
                                step="1"
                                value={taskForm.estimated_hours}
                                onChange={(e) => setTaskForm({ ...taskForm, estimated_hours: parseInt(e.target.value) || 1 })}
                                className="w-full px-5 py-4 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl text-[var(--text-main)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium text-lg"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-8">
                        <Button type="button" variant="secondary" onClick={() => navigate(-1)} className="px-8 py-4 text-sm tracking-widest rounded-2xl font-black uppercase">
                            Discard
                        </Button>
                        <Button type="submit" variant="primary" className="px-10 py-4 text-sm tracking-widest rounded-2xl font-black uppercase bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] flex items-center gap-3">
                            {saving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Check size={20} />
                            )}
                            Save Adjustments
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default EditTaskPage;
