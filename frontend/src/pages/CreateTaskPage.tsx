import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { X, Plus, Target, Calendar, ArrowLeft } from 'lucide-react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Card, Button, CustomSelect } from '../components/common';

interface Project {
    id: number;
    project: {
        id: number;
        name: string;
    };
}

interface ProjectModule {
    id: number;
    name: string;
}

interface InternUser {
    id: number;
    full_name?: string;
    email: string;
}

const CreateTaskPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { internId: urlInternId } = useParams();
    
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    
    const [interns, setInterns] = useState<InternUser[]>([]);
    const [selectedIntern, setSelectedIntern] = useState<number | ''>('');
    const [projects, setProjects] = useState<any[]>([]);
    const [modules, setModules] = useState<ProjectModule[]>([]);
    const [availableSkills, setAvailableSkills] = useState<string[]>([]);
    const [skillSearch, setSkillSearch] = useState('');
    const [showSkillDropdown, setShowSkillDropdown] = useState(false);

    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        priority: 'MEDIUM',
        due_date: '',
        estimated_hours: 0,
        project_assignment_id: '',
        project_module_id: '',
        skills_required: [] as string[],
    });

    useEffect(() => {
        fetchInterns();
    }, []);

    useEffect(() => {
        if (urlInternId) {
            setSelectedIntern(Number(urlInternId));
        } else if (interns.length > 0 && !selectedIntern) {
            setSelectedIntern(interns[0].id);
        }
    }, [urlInternId, interns]);

    useEffect(() => {
        if (selectedIntern) {
            fetchProjects(Number(selectedIntern));
            fetchAvailableSkills(Number(selectedIntern));
        }
    }, [selectedIntern]);

    const fetchInterns = async () => {
        try {
            if (user?.role === 'MANAGER') {
                const deptInternsRes = await axios.get('/interns/department-interns/');
                setInterns(deptInternsRes.data || []);
            } else {
                const internsRes = await axios.get('/accounts/users/?role=INTERN');
                setInterns(internsRes.data || []);
            }
        } catch (error) {
            console.error('Error fetching interns:', error);
        }
    };

    const fetchProjects = async (targetInternId: number) => {
        try {
            const response = await axios.get('/projects/assignments/', { params: { intern_id: targetInternId } });
            const assignments = response.data.results || response.data;
            // Clean/unique list of projects
            if (Array.isArray(assignments)) {
                setProjects(assignments);
            } else {
                setProjects([]);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
            setProjects([]);
        }
    };

    const fetchModules = async (assignmentId: string) => {
        if (!assignmentId) {
            setModules([]);
            return;
        }
        try {
            const assignment = projects.find(p => String(p.id) === assignmentId);
            if (assignment && assignment.project) {
                const res = await axios.get(`/projects/projects/${assignment.project.id}/modules/`);
                setModules(res.data || []);
            }
        } catch (err) {
            console.error('Error fetching modules:', err);
            setModules([]);
        }
    };

    const fetchAvailableSkills = async (targetInternId: number) => {
        try {
            const response = await axios.get(`/analytics/performance/dashboard/${targetInternId}/`);
            if (response.data?.learning_path?.milestones) {
                const skills = response.data.learning_path.milestones.map((m: any) => m.skill || m.area).filter(Boolean);
                setAvailableSkills(Array.from(new Set(skills)));
            } else {
                setAvailableSkills([]);
            }
        } catch (err) {
            console.error('Error fetching available skills:', err);
            setAvailableSkills([]);
        }
    };

    const toggleSkill = (skill: string) => {
        setTaskForm(prev => {
            const exists = prev.skills_required.includes(skill);
            return {
                ...prev,
                skills_required: exists 
                    ? prev.skills_required.filter(s => s !== skill)
                    : [...prev.skills_required, skill]
            };
        });
        setSkillSearch('');
        setShowSkillDropdown(false);
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedIntern) {
            setError('Please select an intern to assign this task');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const taskPayload: Record<string, any> = {
                title: taskForm.title,
                description: taskForm.description,
                priority: taskForm.priority,
                due_date: taskForm.due_date,
                estimated_hours: taskForm.estimated_hours,
                intern_id: Number(selectedIntern),
                skills_required: taskForm.skills_required
            };

            if (taskForm.project_assignment_id) {
                const assignment = projects.find(p => String(p.id) === taskForm.project_assignment_id);
                if (assignment && assignment.project) {
                    taskPayload.project_id = assignment.project.id;
                }
            }

            if (taskForm.project_module_id) {
                taskPayload.module_id = Number(taskForm.project_module_id);
            }

            const savePromise = axios.post('/analytics/tasks/', taskPayload);

            toast.promise(savePromise, {
                loading: 'Assigning new task scope...',
                success: () => {
                    navigate('/monitoring/tasks');
                    return 'Task assigned successfully';
                },
                error: (err) => {
                    setSubmitting(false);
                    const apiError = err as { response?: { data?: { detail?: string } } };
                    const msg = apiError.response?.data?.detail || 'Failed to assign task';
                    setError(msg);
                    return msg;
                }
            });
        } catch (err: any) {
            setSubmitting(false);
            setError(err.message || 'An error occurred');
        }
    };

    const filteredSkills = availableSkills.filter(skill => 
        skill.toLowerCase().includes(skillSearch.toLowerCase()) && 
        !taskForm.skills_required.includes(skill)
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-6">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm font-medium text-[var(--text-dim)] hover:text-purple-400 transition-colors"
            >
                <ArrowLeft size={16} /> Back to Tasks
            </button>

            <div>
                <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2 flex items-center gap-3">
                    <Target className="text-purple-500" />
                    Assign New <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Task</span>
                </h1>
                <p className="text-[var(--text-dim)]">Create and dispatch a new work package to an intern's queue.</p>
            </div>

            <Card padding="lg" className="border-purple-500/10">
                <form onSubmit={handleCreateTask} className="space-y-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                            <X size={16} />
                            {error}
                        </div>
                    )}

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Assign To Intern *</label>
                        <CustomSelect
                            options={[
                                { value: '', label: 'Select an intern...', disabled: true },
                                ...interns.map(intern => ({
                                    value: String(intern.id),
                                    label: `${intern.full_name || 'N/A'} (${intern.email})`
                                }))
                            ]}
                            value={String(selectedIntern)}
                            onChange={(v) => setSelectedIntern(Number(v))}
                            placeholder="Select an intern..."
                            accent="purple"
                        />
                    </div>

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Title *</label>
                        <input
                            type="text"
                            required
                            placeholder="Enter task title"
                            value={taskForm.title}
                            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                            className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                        />
                    </div>

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Description</label>
                        <textarea
                            placeholder="Enter task description"
                            value={taskForm.description}
                            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                            className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none font-medium"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Priority</label>
                            <select
                                value={taskForm.priority}
                                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                                className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all appearance-none cursor-pointer font-medium"
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="CRITICAL">Critical</option>
                            </select>
                        </div>

                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Project (Optional)</label>
                            <select
                                value={taskForm.project_assignment_id}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setTaskForm({ ...taskForm, project_assignment_id: val, project_module_id: '' });
                                    fetchModules(val);
                                }}
                                className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all appearance-none cursor-pointer font-medium"
                            >
                                <option value="">No Project</option>
                                {projects.map((p: any) => (
                                    <option key={p.id} value={p.id}>
                                        {p.project?.name || 'Unknown Project'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {modules.length > 0 && (
                            <div className="group md:col-span-2">
                                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Module</label>
                                <select
                                    value={taskForm.project_module_id}
                                    onChange={(e) => setTaskForm({ ...taskForm, project_module_id: e.target.value })}
                                    className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all appearance-none cursor-pointer font-medium"
                                >
                                    <option value="">Select Module</option>
                                    {modules.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Skills Developed (Select from list)</label>
                        <div className="min-h-[44px] p-2 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-purple-500/50 focus-within:border-purple-500 transition-all">
                            {taskForm.skills_required.map(skill => (
                                <span key={skill} className="flex items-center gap-1 px-2.5 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-bold uppercase tracking-wider animate-scale-in">
                                    {skill}
                                    <button 
                                        type="button"
                                        onClick={() => toggleSkill(skill)}
                                        className="hover:text-white transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                            <div className="flex-1 min-w-[120px] relative">
                                <input
                                    type="text"
                                    placeholder={taskForm.skills_required.length === 0 ? "Search skills..." : ""}
                                    value={skillSearch}
                                    onChange={(e) => {
                                        setSkillSearch(e.target.value);
                                        setShowSkillDropdown(true);
                                    }}
                                    onFocus={() => setShowSkillDropdown(true)}
                                    className="w-full bg-transparent border-none outline-none text-[var(--text-main)] placeholder-[var(--text-muted)] py-1 font-medium text-sm"
                                />
                                {showSkillDropdown && (skillSearch || filteredSkills.length > 0) && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-[100]" 
                                            onClick={() => setShowSkillDropdown(false)}
                                        />
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-muted)] backdrop-blur-xl border border-[var(--border-color)] rounded-xl shadow-2xl z-[101] max-h-[200px] overflow-y-auto custom-scrollbar animate-scale-in">
                                            {filteredSkills.length > 0 ? (
                                                <div className="p-1">
                                                    {filteredSkills.map(skill => (
                                                        <button
                                                            key={skill}
                                                            type="button"
                                                            onClick={() => toggleSkill(skill)}
                                                            className="w-full flex items-center justify-between p-2.5 hover:bg-purple-500/10 rounded-lg text-sm text-left text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors font-medium"
                                                        >
                                                            {skill}
                                                            <Plus size={14} className="opacity-50" />
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : skillSearch && (
                                                <div className="p-4 text-center text-[var(--text-muted)] text-sm">
                                                    No matching skills found
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Estimated Hours</label>
                            <input
                                type="number"
                                min={0}
                                value={taskForm.estimated_hours}
                                onChange={(e) => setTaskForm({ ...taskForm, estimated_hours: Number(e.target.value) })}
                                className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                            />
                        </div>

                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Due Date *</label>
                            <input
                                type="date"
                                required
                                value={taskForm.due_date}
                                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                                className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6 border-t border-[var(--border-color)]">
                        <Button type="button" onClick={() => navigate(-1)} variant="ghost" className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" gradient="purple" loading={submitting} className="flex-1">
                            Create Task
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default CreateTaskPage;
