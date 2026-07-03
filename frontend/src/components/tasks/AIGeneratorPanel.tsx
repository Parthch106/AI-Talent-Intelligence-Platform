import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Sparkles, Loader2, Plus, Clock, History
} from 'lucide-react';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import { useMonitoring } from '../../context/MonitoringContext';

interface AITaskSuggestion {
    title: string;
    description: string;
    priority: string;
    estimated_hours: number;
    due_date: string;
    skills_required: string[];
    rationale: string;
}

interface AITaskPathway {
    name: string;
    description: string;
    tasks: AITaskSuggestion[];
}

interface AIGeneratorPanelProps {
    internId?: number;
    projectFilter?: number | null;
    onClose: () => void;
    onTasksGenerated?: () => void;
}

const AIGeneratorPanel: React.FC<AIGeneratorPanelProps> = ({ 
    internId: initialInternId, 
    projectFilter: initialProjectId, 
    onClose, 
    onTasksGenerated 
}) => {
    const [selectedInterns, setSelectedInterns] = useState<number[]>(initialInternId ? [initialInternId] : []);
    const [projects, setProjects] = useState<{id: number; name: string}[]>([]);
    const [selectedProject, setSelectedProject] = useState<number | null>(initialProjectId || null);
    const [modules, setModules] = useState<{id: number; name: string}[]>([]);
    const [selectedModule, setSelectedModule] = useState<number | null>(null);
    const [taskContext, setTaskContext] = useState<string>('');
    const [customDueDate, setCustomDueDate] = useState<string>('');
    const { interns } = useMonitoring();
    
    const [generating, setGenerating] = useState(false);
    const [aiPathways, setAiPathways] = useState<AITaskPathway[]>([]);
    const [assigning, setAssigning] = useState<string | null>(null);
    const [assigningPathway, setAssigningPathway] = useState<number | null>(null);

    // Persistent Pathway History
    const [pathwayHistory, setPathwayHistory] = useState<{timestamp: string; pathways: AITaskPathway[]}[]>([]);

    useEffect(() => {
        if (selectedInterns.length > 0) {
            const firstIntern = selectedInterns[0];
            const saved = localStorage.getItem(`aims_pathway_history_${firstIntern}`);
            if (saved) {
                try {
                    setPathwayHistory(JSON.parse(saved));
                } catch (e) {
                    console.error("Failed to parse history", e);
                }
            } else {
                setPathwayHistory([]);
            }
        } else {
            setPathwayHistory([]);
        }
    }, [selectedInterns]);

    useEffect(() => {
        const fetchInternContext = async () => {
            if (selectedInterns.length === 0) {
                setProjects([]);
                setSelectedProject(null);
                setModules([]);
                setSelectedModule(null);
                return;
            }
            try {
                const firstIntern = selectedInterns[0];
                const res = await axios.get('/projects/assignments/', { params: { intern_id: firstIntern } });
                const assignments = res.data.results || res.data;
                const uniqueProjects = Array.from(new Set(assignments.map((a: { project: { id: number; name: string } }) => JSON.stringify({id: a.project.id, name: a.project.name}))))
                    .map((s: unknown) => JSON.parse(s as string));
                setProjects(uniqueProjects);
            } catch (err) {
                console.error("Error fetching intern context", err);
            }
        };
        fetchInternContext();
    }, [selectedInterns]);

    useEffect(() => {
        if (selectedProject && selectedInterns.length > 0) {
            fetchModules();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProject, selectedInterns]);

    const fetchModules = async () => {
        if (!selectedProject || selectedInterns.length === 0) return;
        try {
            const res = await axios.get('/projects/modules/', { 
                params: { project_id: selectedProject, intern_id: selectedInterns[0] } 
            });
            setModules(res.data.results || res.data);
        } catch {
            console.error("Error fetching modules");
        }
    };

    const generateTasks = async () => {
        if (selectedInterns.length === 0) {
            toast.error("Critical missing parameter: Target Intern selection required");
            return;
        }
        
        setGenerating(true);
        setAiPathways([]);
        
        try {
            const response = await axios.post('/analytics/llm/generate-tasks/', {
                intern_id: selectedInterns[0],
                project_id: selectedProject || undefined,
                module_id: selectedModule || undefined,
                task_context: taskContext || undefined,
                num_suggestions: 5
            });
            
            setAiPathways(response.data.pathways || []);
            
            if (response.data.pathways && response.data.pathways.length > 0) {
                setPathwayHistory(prev => {
                    const newEntry = { timestamp: new Date().toLocaleString(), pathways: response.data.pathways };
                    const newHistory = [newEntry, ...prev].slice(0, 10);
                    if (selectedInterns.length > 0) {
                        localStorage.setItem(`aims_pathway_history_${selectedInterns[0]}`, JSON.stringify(newHistory));
                    }
                    return newHistory;
                });
            }
            
            if (!response.data.pathways || response.data.pathways.length === 0) {
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

    const assignTask = async (task: AITaskSuggestion, pathwayIndex: number, taskIndex: number) => {
        if (selectedInterns.length === 0) return;
        
        const assignId = `${pathwayIndex}-${taskIndex}`;
        setAssigning(assignId);
        try {
            const formattedDueDate = customDueDate 
                ? new Date(customDueDate).toISOString() 
                : (task.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

            await Promise.all(selectedInterns.map(async (internId) => {
                let projectAssignmentId = undefined;
                if (selectedProject) {
                    const res = await axios.get('/projects/assignments/', { 
                        params: { intern_id: internId, project_id: selectedProject } 
                    });
                    projectAssignmentId = res.data.results?.[0]?.id;
                }

                return axios.post('/analytics/tasks/', {
                    intern_id: internId,
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    due_date: formattedDueDate,
                    estimated_hours: task.estimated_hours,
                    project_assignment_id: projectAssignmentId,
                    project_module_id: selectedModule || undefined,
                });
            }));
            
            // Remove the assigned task from the pathway
            const newPathways = [...aiPathways];
            newPathways[pathwayIndex].tasks = newPathways[pathwayIndex].tasks.filter((_, i) => i !== taskIndex);
            // If pathway is empty, remove the pathway
            if (newPathways[pathwayIndex].tasks.length === 0) {
                newPathways.splice(pathwayIndex, 1);
            }
            setAiPathways(newPathways);
            
            toast.success("Task assigned successfully to " + selectedInterns.length + " intern(s)");
            if (onTasksGenerated) onTasksGenerated();
        } catch {
            toast.error("Failed to assign task");
        } finally {
            setAssigning(null);
        }
    };

    const assignPathway = async (pIdx: number) => {
        if (selectedInterns.length === 0) return;
        const pathway = aiPathways[pIdx];
        if (!pathway || pathway.tasks.length === 0) return;

        setAssigningPathway(pIdx);

        try {
            const formattedDueDate = customDueDate 
                ? new Date(customDueDate).toISOString() 
                : (new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

            await toast.promise(
                Promise.all(selectedInterns.map(async (internId) => {
                    let projectAssignmentId = undefined;
                    if (selectedProject) {
                        const res = await axios.get('/projects/assignments/', { 
                            params: { intern_id: internId, project_id: selectedProject } 
                        });
                        projectAssignmentId = res.data.results?.[0]?.id;
                    }

                    return Promise.all(pathway.tasks.map(task => 
                        axios.post('/analytics/tasks/create/', {
                            ...task,
                            due_date: customDueDate ? new Date(customDueDate).toISOString() : (task.due_date || formattedDueDate),
                            status: 'ASSIGNED',
                            intern_id: internId,
                            project_assignment_id: projectAssignmentId,
                            project_module_id: selectedModule || undefined
                        })
                    ));
                })), {
                    loading: `Transmitting Pathway to ${selectedInterns.length} intern(s)...`,
                    success: () => {
                        const newPathways = [...aiPathways];
                        newPathways.splice(pIdx, 1);
                        setAiPathways(newPathways);
                        setAssigningPathway(null);
                        if (onTasksGenerated) onTasksGenerated();
                        return `Pathway fully anchored for ${selectedInterns.length} intern(s)`;
                    },
                    error: (err) => {
                        setAssigningPathway(null);
                        return (err as Error).message || 'Transmission failure during bulk pathway assignment';
                    }
                }
            );
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {
            setAssigningPathway(null);
            toast.error("Failed to prepare pathway assignment");
        }
    };

    return createPortal(
        <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
            <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-[var(--bg-color)] border-l border-[var(--border-color)] z-[60] shadow-2xl animate-slide-in overflow-y-auto">
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
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-medium text-[var(--text-dim)]">Select Intern(s)</label>
                            {selectedInterns.length > 0 && (
                                <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium">
                                    {selectedInterns.length} selected
                                </span>
                            )}
                        </div>
                        <div className="w-full bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-lg max-h-40 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {interns.map(i => (
                                <label key={i.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--bg-color)] rounded-md cursor-pointer transition-colors">
                                    <input 
                                        type="checkbox"
                                        checked={selectedInterns.includes(i.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedInterns(prev => [...prev, i.id]);
                                            } else {
                                                setSelectedInterns(prev => prev.filter(id => id !== i.id));
                                            }
                                        }}
                                        className="rounded border-[var(--border-color)] text-purple-600 focus:ring-purple-500 bg-[var(--bg-color)]"
                                    />
                                    <span className="text-sm text-[var(--text-main)] truncate">
                                        {i.full_name || i.email}
                                    </span>
                                </label>
                            ))}
                            {interns.length === 0 && (
                                <div className="text-xs text-[var(--text-muted)] text-center py-2">No interns available</div>
                            )}
                        </div>
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

                    <div>
                        <label className="block text-xs font-medium text-[var(--text-dim)] mb-2">Set Due Date for Assigned Tasks (Optional)</label>
                        <input
                            type="date"
                            value={customDueDate}
                            onChange={(e) => setCustomDueDate(e.target.value)}
                            className="w-full px-3 py-2 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-main)] focus:outline-none focus:border-purple-500"
                        />
                    </div>

                    <button
                        onClick={generateTasks}
                        disabled={generating || selectedInterns.length === 0}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium text-sm disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        {generating ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Sparkles size={18} />
                        )}
                        {generating ? 'Generating...' : 'Generate Tasks'}
                    </button>

                    {aiPathways.length > 0 && (
                        <div className="space-y-6 pt-4 border-t border-[var(--border-color)]">
                            <h3 className="text-sm font-semibold text-[var(--text-main)]">Suggested Pathways</h3>
                            {aiPathways.map((pathway, pIdx) => (
                                <div key={pIdx} className="space-y-3">
                                    <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl mb-4 flex flex-col gap-3">
                                        <div>
                                            <h4 className="text-sm font-bold text-purple-400">{pathway.name}</h4>
                                            <p className="text-xs text-purple-300/70 mt-1">{pathway.description}</p>
                                        </div>
                                        <button 
                                            onClick={() => assignPathway(pIdx)}
                                            disabled={assigningPathway === pIdx}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50"
                                        >
                                            {assigningPathway === pIdx ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                            {assigningPathway === pIdx ? 'Assigning...' : 'Assign Full Pathway'}
                                        </button>
                                    </div>
                                    <div className="space-y-3 pl-4 border-l-2 border-[var(--border-color)]">
                                        {pathway.tasks.map((task, tIdx) => (
                                            <div key={tIdx} className="p-3 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <h5 className="text-sm font-medium text-[var(--text-main)]">{task.title}</h5>
                                                        <p className="text-xs text-[var(--text-dim)] mt-1 line-clamp-2">{task.description}</p>
                                                    </div>
                                                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${
                                                        task.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                                                        task.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                                                        task.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-blue-500/20 text-blue-400'
                                                    }`}>
                                                        {task.priority || 'NORMAL'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] mb-2">
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={10} /> {task.estimated_hours}h
                                                    </span>
                                                    {task.due_date && <span>{task.due_date}</span>}
                                                </div>
                                                <button
                                                    onClick={() => assignTask(task, pIdx, tIdx)}
                                                    disabled={assigning === `${pIdx}-${tIdx}`}
                                                    className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-600/30 transition-colors disabled:opacity-50"
                                                >
                                                    {assigning === `${pIdx}-${tIdx}` ? (
                                                        <Loader2 size={12} className="animate-spin" />
                                                    ) : (
                                                        <Plus size={12} />
                                                    )}
                                                    Assign Task
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {pathwayHistory.length > 0 && (
                        <div className="space-y-4 pt-6 border-t border-[var(--border-color)]">
                            <h3 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2">
                                <History size={16} /> Pathway History
                            </h3>
                            <div className="space-y-3">
                                {pathwayHistory.map((historyItem, idx) => (
                                    <div key={idx} className="p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{historyItem.timestamp}</span>
                                            <span className="text-[10px] font-medium px-2 py-0.5 bg-[var(--bg-muted)] text-[var(--text-dim)] rounded-md">{historyItem.pathways.length} Pathways</span>
                                        </div>
                                        <button 
                                            onClick={() => setAiPathways(historyItem.pathways)}
                                            className="w-full py-2 bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-lg hover:bg-[var(--bg-muted)] transition-colors"
                                        >
                                            Restore Pathways
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>,
        document.body
    );
};

export default AIGeneratorPanel;
