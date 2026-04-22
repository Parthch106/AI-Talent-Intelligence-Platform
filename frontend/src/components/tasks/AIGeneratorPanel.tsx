import React, { useState, useEffect } from 'react';
import { 
    X, Sparkles, Loader2, Plus, Clock
} from 'lucide-react';
import axios from '../../api/axios';
import toast from 'react-hot-toast';

interface AITaskSuggestion {
    title: string;
    description: string;
    priority: string;
    estimated_hours: number;
    due_date: string;
    skills_required: string[];
    rationale: string;
}

interface AIGeneratorPanelProps {
    internId?: number;
    projectFilter?: number | null;
    onClose: () => void;
    onTasksGenerated?: () => void;
}

const AIGeneratorPanel: React.FC<AIGeneratorPanelProps> = ({ 
    internId, 
    projectFilter, 
    onClose, 
    onTasksGenerated 
}) => {
    const [selectedIntern, setSelectedIntern] = useState<number | null>(internId || null);
    const [projects, setProjects] = useState<{id: number; name: string}[]>([]);
    const [selectedProject, setSelectedProject] = useState<number | null>(projectFilter || null);
    const [modules, setModules] = useState<{id: number; name: string}[]>([]);
    const [selectedModule, setSelectedModule] = useState<number | null>(null);
    const [taskContext, setTaskContext] = useState<string>('');
    
    const [generating, setGenerating] = useState(false);
    const [aiTasks, setAiTasks] = useState<AITaskSuggestion[]>([]);
    const [assigning, setAssigning] = useState<number | null>(null);

    useEffect(() => {
        if (selectedIntern) {
            fetchInternContext();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedIntern]);

    useEffect(() => {
        if (selectedProject) {
            fetchModules();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProject]);

    const fetchInternContext = async () => {
        if (!selectedIntern) return;
        try {
            const res = await axios.get('/projects/assignments/', { params: { intern_id: selectedIntern } });
            const assignments = res.data.results || res.data;
            const uniqueProjects = Array.from(new Set(assignments.map((a: { project: { id: number; name: string } }) => JSON.stringify({id: a.project.id, name: a.project.name}))))
                .map((s: unknown) => JSON.parse(s as string));
            setProjects(uniqueProjects);
        } catch {
            console.error("Error fetching intern context");
        }
    };

    const fetchModules = async () => {
        if (!selectedProject || !selectedIntern) return;
        try {
            const res = await axios.get('/projects/modules/', { 
                params: { project_id: selectedProject, intern_id: selectedIntern } 
            });
            setModules(res.data.results || res.data);
        } catch {
            console.error("Error fetching modules");
        }
    };

    const generateTasks = async () => {
        if (!selectedIntern) {
            toast.error("Please select an intern first");
            return;
        }
        
        setGenerating(true);
        setAiTasks([]);
        
        try {
            const response = await axios.post('/analytics/llm/generate-tasks/', {
                intern_id: selectedIntern,
                module_id: selectedModule || undefined,
                task_context: taskContext || undefined,
                num_suggestions: 3
            });
            
            setAiTasks(response.data.tasks || []);
            
            if (response.data.tasks.length === 0) {
                toast.error("No suggestions generated for this context.");
            } else {
                toast.success("AI Generation Complete", { icon: '✨' });
            }
        } catch {
            toast.error("Failed to generate tasks");
        } finally {
            setGenerating(false);
        }
    };

    const assignTask = async (task: AITaskSuggestion, index: number) => {
        if (!selectedIntern) return;
        
        setAssigning(index);
        try {
            await axios.post('/analytics/tasks/', {
                intern_id: selectedIntern,
                title: task.title,
                description: task.description,
                priority: task.priority,
                due_date: task.due_date,
                estimated_hours: task.estimated_hours,
                project_assignment_id: selectedProject ? 
                    (await axios.get('/projects/assignments/', { 
                        params: { intern_id: selectedIntern, project_id: selectedProject } 
                    })).data.results?.[0]?.id : undefined,
                module_id: selectedModule || undefined,
            });
            
            setAiTasks(prev => prev.filter((_, i) => i !== index));
            toast.success("Task assigned successfully");
            if (onTasksGenerated) onTasksGenerated();
        } catch {
            toast.error("Failed to assign task");
        } finally {
            setAssigning(null);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
            <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-[var(--bg-color)] border-l border-[var(--border-color)] z-50 shadow-2xl animate-slide-in overflow-y-auto">
                <div className="sticky top-0 bg-[var(--bg-color)] border-b border-[var(--border-color)] p-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                        <Sparkles size={20} className="text-purple-400" />
                        <h2 className="text-lg font-bold text-[var(--text-main)]">AI Task Generator</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-muted)] rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-dim)] mb-2">Select Intern</label>
                        <select
                            value={selectedIntern || ''}
                            onChange={(e) => setSelectedIntern(e.target.value ? parseInt(e.target.value) : null)}
                            className="w-full px-3 py-2 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-main)] focus:outline-none focus:border-purple-500"
                        >
                            <option value="">Select an intern...</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-[var(--text-dim)] mb-2">Project</label>
                        <select
                            value={selectedProject || ''}
                            onChange={(e) => setSelectedProject(e.target.value ? parseInt(e.target.value) : null)}
                            className="w-full px-3 py-2 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-main)] focus:outline-none focus:border-purple-500"
                        >
                            <option value="">Any project...</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-[var(--text-dim)] mb-2">Module (Optional)</label>
                        <select
                            value={selectedModule || ''}
                            onChange={(e) => setSelectedModule(e.target.value ? parseInt(e.target.value) : null)}
                            className="w-full px-3 py-2 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-main)] focus:outline-none focus:border-purple-500"
                            disabled={!selectedProject}
                        >
                            <option value="">Any module...</option>
                            {modules.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-[var(--text-dim)] mb-2">Task Context</label>
                        <textarea
                            value={taskContext}
                            onChange={(e) => setTaskContext(e.target.value)}
                            placeholder="Describe the type of tasks you want AI to suggest..."
                            rows={3}
                            className="w-full px-3 py-2 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-purple-500 resize-none"
                        />
                    </div>

                    <button
                        onClick={generateTasks}
                        disabled={generating || !selectedIntern}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium text-sm disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        {generating ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Sparkles size={18} />
                        )}
                        {generating ? 'Generating...' : 'Generate Tasks'}
                    </button>

                    {aiTasks.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-[var(--border-color)]">
                            <h3 className="text-sm font-semibold text-[var(--text-main)]">Suggested Tasks</h3>
                            {aiTasks.map((task, idx) => (
                                <div key={idx} className="p-3 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4 className="text-sm font-medium text-[var(--text-main)]">{task.title}</h4>
                                            <p className="text-xs text-[var(--text-dim)] mt-1 line-clamp-2">{task.description}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${
                                            task.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                                            task.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                                            task.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-blue-500/20 text-blue-400'
                                        }`}>
                                            {task.priority}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] mb-2">
                                        <span className="flex items-center gap-1">
                                            <Clock size={10} /> {task.estimated_hours}h
                                        </span>
                                        <span>{task.due_date}</span>
                                    </div>
                                    <button
                                        onClick={() => assignTask(task, idx)}
                                        disabled={assigning === idx}
                                        className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-600/30 transition-colors disabled:opacity-50"
                                    >
                                        {assigning === idx ? (
                                            <Loader2 size={12} className="animate-spin" />
                                        ) : (
                                            <Plus size={12} />
                                        )}
                                        Assign Task
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default AIGeneratorPanel;
