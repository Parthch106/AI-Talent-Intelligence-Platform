import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
    Brain, Sparkles, Wand2, Loader2, ChevronLeft, 
    Target, Clock, CheckCircle, Award, Code, 
    Star, Bug, LayoutGrid, List, MessageSquare,
    AlertTriangle, PlayCircle, Plus, Save, 
    Layers, Cpu, Zap, Search, Filter, History,
    ChevronDown
} from 'lucide-react';
import axios from '../api/axios';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useMonitoring } from '../context/MonitoringContext';

interface AITaskSuggestion {
    title: string;
    description: string;
    priority: string;
    estimated_hours: number;
    due_date: string;
    skills_required: string[];
    rationale: string;
}

const AITaskGenerator: React.FC = () => {
    const { internId: urlInternIdParam } = useParams();
    const urlInternId = urlInternIdParam && !urlInternIdParam.startsWith(':') ? parseInt(urlInternIdParam) : null;
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Global State from context
    const { selectedInternId: contextInternId, setSelectedInternId, interns } = useMonitoring();
    
    // States
    const [selectedIntern, setSelectedInternLocal] = useState<number | null>(urlInternId ? urlInternId : contextInternId);
    const [internDetails, setInternDetails] = useState<any>(null);
    
    const [projects, setProjects] = useState<{id: number; name: string}[]>([]);
    const [selectedProject, setSelectedProject] = useState<number | null>(null);
    const [modules, setModules] = useState<{id: number; name: string}[]>([]);
    const [selectedModule, setSelectedModule] = useState<number | null>(null);
    const [taskContext, setTaskContext] = useState<string>('');
    
    const [generating, setGenerating] = useState(false);
    const [aiTasks, setAiTasks] = useState<AITaskSuggestion[]>([]);
    const [aiSummary, setAiSummary] = useState<string>('');
    const [ongoingHistory, setOngoingHistory] = useState<any[]>([]);
    const [completedHistory, setCompletedHistory] = useState<any[]>([]);
    
    const [assigning, setAssigning] = useState<string | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValues, setEditValues] = useState<{title: string, description: string}>({title: '', description: ''});

    // Sync local selectedIntern with URL param OR context
    useEffect(() => {
        if (urlInternId) {
            setSelectedInternLocal(urlInternId);
        } else if (contextInternId && !urlInternIdParam) {
            // Only sync from context if there's no ID in the URL at all
            setSelectedInternLocal(contextInternId);
        }
    }, [urlInternId, contextInternId, urlInternIdParam]);

    // Update global context when local selection changes
    useEffect(() => {
        if (selectedIntern !== contextInternId) {
            setSelectedInternId(selectedIntern);
        }
    }, [selectedIntern, contextInternId, setSelectedInternId]);

    // Set intern details when interns list or selectedIntern changes
    useEffect(() => {
        if (selectedIntern && interns.length > 0) {
            const intern = interns.find(i => i.id === selectedIntern);
            if (intern) setInternDetails(intern);
        }
    }, [selectedIntern, interns]);

    // fetchInterns is now handled by MonitoringContext

    // Fetch Intern Details & Projects when intern selected
    useEffect(() => {
        if (!selectedIntern) return;
        
        const fetchInternContext = async () => {
            try {
                const intern = interns.find(i => i.id === selectedIntern);
                if (intern) setInternDetails(intern);
                
                const res = await axios.get('/projects/assignments/', { params: { intern_id: selectedIntern } });
                const assignments = res.data.results || res.data;
                const uniqueProjects = Array.from(new Set(assignments.map((a: any) => JSON.stringify({id: a.project.id, name: a.project.name}))))
                    .map((s: any) => JSON.parse(s));
                setProjects(uniqueProjects);
            } catch (err) {
                console.error("Error fetching intern context", err);
            }
        };
        fetchInternContext();
    }, [selectedIntern, interns]);

    // Fetch Modules when project selected
    useEffect(() => {
        if (!selectedProject) {
            setModules([]);
            setSelectedModule(null);
            return;
        }
        const fetchModules = async () => {
            try {
                const res = await axios.get('/projects/modules/', { 
                    params: { 
                        project_id: selectedProject,
                        intern_id: selectedIntern 
                    } 
                });
                setModules(res.data.results || res.data);
            } catch (err) {
                console.error("Error fetching modules", err);
            }
        };
        fetchModules();
    }, [selectedProject, selectedIntern]);

    // Set selected project from URL parameter
    useEffect(() => {
        const projectParam = searchParams.get('project');
        if (projectParam && projects.length > 0) {
            const projectId = parseInt(projectParam);
            const projectExists = projects.find(p => p.id === projectId);
            if (projectExists) {
                setSelectedProject(projectId);
            }
        }
    }, [searchParams, projects]);

    const handleInternChange = (id: number | null) => {
        setSelectedInternLocal(id);
        setSelectedProject(null);
        setModules([]);
        setSelectedModule(null);
        
        if (id) {
            navigate(`/tools/ai-task-generator/${id}`, { replace: true });
        } else {
            navigate('/tools/ai-task-generator', { replace: true });
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
            setAiSummary(response.data.summary || '');
            setOngoingHistory(response.data.ongoing_tasks || []);
            setCompletedHistory(response.data.completed_tasks || []);
            
            if (response.data.tasks.length === 0) {
                toast.error("No suggestions generated for this context.");
            } else {
                toast.success("AI Generation Complete", { icon: '✨' });
            }
        } catch (err) {
            console.error("AI Generation failed", err);
            toast.error("Failed to generate AI tasks.");
        } finally {
            setGenerating(false);
        }
    };

    const assignTask = async (task: AITaskSuggestion, index: number) => {
        if (!selectedIntern) return;
        
        // Use edited values if this task is being edited or was edited
        const finalTask = {
            ...task,
            title: editingIndex === index ? editValues.title : task.title,
            description: editingIndex === index ? editValues.description : task.description
        };

        try {
            setAssigning(task.title);
            await axios.post('/analytics/tasks/create/', {
                ...finalTask,
                status: 'ASSIGNED',
                intern_id: selectedIntern,
                project_module_id: selectedModule || undefined
            });
            
            toast.success("Task assigned successfully!");
            setAiTasks(prev => prev.filter((_, i) => i !== index));
            if (editingIndex === index) setEditingIndex(null);
        } catch (err) {
            console.error("Assignment failed", err);
            toast.error("Failed to assign task.");
        } finally {
            setAssigning(null);
        }
    };

    const startEditing = (index: number) => {
        setEditingIndex(index);
        setEditValues({
            title: aiTasks[index].title,
            description: aiTasks[index].description
        });
    };

    const saveEdit = (index: number) => {
        const updatedTasks = [...aiTasks];
        updatedTasks[index] = {
            ...updatedTasks[index],
            title: editValues.title,
            description: editValues.description
        };
        setAiTasks(updatedTasks);
        setEditingIndex(null);
        toast.success("Changes staged", { icon: '📝' });
    };

    return (
        <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-main)] overflow-x-hidden selection:bg-purple-500/30 transition-colors duration-500">
            {/* Ambient Background Glows */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
            
            {/* Content Container */}
            <div className="relative max-w-[1600px] mx-auto min-h-screen flex flex-col">
                
                {/* Header */}
                <header className="px-8 py-6 flex items-center justify-between border-b border-[var(--border-color)] backdrop-blur-md sticky top-0 z-50 bg-[var(--header-bg)]">
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={() => navigate(-1)}
                            className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-color)] hover:bg-[var(--card-bg)] transition-all text-[var(--text-dim)] hover:text-[var(--text-main)]"
                        >
                            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-medium">Back</span>
                        </button>
                        <div className="h-8 w-px bg-[var(--border-color)]" />
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg shadow-purple-500/20">
                                <Brain size={24} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-heading font-black tracking-tighter text-[var(--text-main)] flex items-center gap-2 uppercase leading-none">
                                    AI Task Generator
                                    <span className="text-[8px] uppercase tracking-[0.2em] bg-purple-500/10 px-2 py-0.5 rounded-full text-purple-400 border border-purple-500/20 font-black">BETA</span>
                                </h1>
                                <p className="text-[10px] text-[var(--text-dim)] font-black uppercase tracking-[0.2em]">Operation: Intelligence Synthesis</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-[400px_1fr] h-full overflow-hidden">
                    
                    {/* Left Panel: Configuration */}
                    <aside className="border-r border-[var(--border-color)] bg-[var(--sidebar-bg)] backdrop-blur-3xl overflow-y-auto p-8 custom-scrollbar">
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400 mb-6 flex items-center gap-2">
                                    <Cpu size={14} /> Task Settings
                                </h2>
                                
                                <div className="space-y-6">
                                    <div className="group">
                                        <label className="block text-xs font-bold text-[var(--text-dim)] mb-2 ml-1 flex items-center gap-2 transition-colors group-focus-within:text-purple-500">
                                            Target Intern
                                        </label>
                                        <div className="relative">
                                            <select 
                                                value={selectedIntern || ''}
                                                onChange={(e) => handleInternChange(e.target.value ? parseInt(e.target.value) : null)}
                                                className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl px-4 py-3.5 text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all cursor-pointer appearance-none hover:bg-[var(--card-bg)]"
                                            >
                                                <option value="" className="bg-[var(--bg-color)] text-[var(--text-main)]">Select Candidate...</option>
                                                {interns.map(i => (
                                                    <option key={i.id} value={i.id} className="bg-[var(--bg-color)] text-[var(--text-main)]">{i.full_name || i.email}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="group">
                                        <label className="block text-xs font-bold text-[var(--text-dim)] mb-2 ml-1 flex items-center gap-2 transition-colors group-focus-within:text-blue-500">
                                            Domain / Project
                                        </label>
                                        <div className="relative">
                                            <select 
                                                value={selectedProject || ''}
                                                onChange={(e) => setSelectedProject(e.target.value ? parseInt(e.target.value) : null)}
                                                disabled={!selectedIntern}
                                                className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl px-4 py-3.5 text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed appearance-none hover:bg-[var(--card-bg)]"
                                            >
                                                <option value="" className="bg-[var(--bg-color)] text-[var(--text-main)]">Any Project</option>
                                                {projects.map(p => (
                                                    <option key={p.id} value={p.id} className="bg-[var(--bg-color)] text-[var(--text-main)]">{p.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="group">
                                        <label className="block text-xs font-bold text-[var(--text-dim)] mb-2 ml-1 flex items-center gap-2 transition-colors group-focus-within:text-emerald-500">
                                            Specific Module
                                        </label>
                                        <div className="relative">
                                            <select 
                                                value={selectedModule || ''}
                                                onChange={(e) => setSelectedModule(e.target.value ? parseInt(e.target.value) : null)}
                                                disabled={!selectedProject}
                                                className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl px-4 py-3.5 text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed appearance-none hover:bg-[var(--card-bg)]"
                                            >
                                                <option value="" className="bg-[var(--bg-color)] text-[var(--text-main)]">Full Project Scope</option>
                                                {modules.map(m => (
                                                    <option key={m.id} value={m.id} className="bg-[var(--bg-color)] text-[var(--text-main)]">{m.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="group">
                                        <label className="block text-xs font-bold text-[var(--text-dim)] mb-2 ml-1 flex items-center gap-2 transition-colors group-focus-within:text-orange-500">
                                            Context & Technical Focus
                                        </label>
                                        <textarea 
                                            value={taskContext}
                                            onChange={(e) => setTaskContext(e.target.value)}
                                            placeholder="Enter requirements, technologies, or challenges for the AI to consider..."
                                            rows={5}
                                            className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl px-5 py-4 text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all resize-none hover:bg-[var(--card-bg)] placeholder:[var(--text-dim)] leading-relaxed text-sm"
                                        />
                                    </div>

                                    <button 
                                        onClick={generateTasks}
                                        disabled={generating || !selectedIntern}
                                        className={`group relative w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 overflow-hidden transition-all duration-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                                            ${generating ? 'bg-[var(--bg-muted)] text-[var(--text-muted)]' : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-xl shadow-purple-500/20'}`}
                                    >
                                        <div className="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {generating ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin text-purple-600 dark:text-purple-400" />
                                                <span>Generating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Zap size={20} className="group-hover:scale-125 transition-transform" />
                                                <span>Generate Tasks</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Intern Workspace Stats */}
                            {internDetails && (
                                <div className="pt-8 border-t border-[var(--border-color)] space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-dim)] mb-4">Workspace Info</h3>
                                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)]">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 border border-[var(--border-color)] flex items-center justify-center text-xl font-bold text-[var(--text-main)] uppercase">
                                            {internDetails.full_name?.charAt(0) || internDetails.username?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[var(--text-main)]">{internDetails.full_name || internDetails.username}</p>
                                            <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-widest leading-none mt-1 font-mono">{internDetails.department || 'General Development'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* Main Workspace: History & Suggestions */}
                    <main className="bg-[var(--bg-color)] relative overflow-y-auto custom-scrollbar p-10 flex flex-col items-center">
                        
                        <div className="max-w-4xl w-full flex flex-col h-full">
                            {/* Suggestions Header */}
                            <div className="flex items-center justify-between mb-10 w-full animate-fade-in">
                                <h2 className="text-3xl font-black text-[var(--text-main)] flex items-center gap-4">
                                    <Sparkles size={32} className="text-purple-500 dark:text-purple-400" />
                                    AI Suggestions
                                </h2>
                                {aiTasks.length > 0 && <span className="bg-[var(--bg-muted)] border border-[var(--border-color)] px-4 py-1.5 rounded-full text-xs font-bold text-purple-600 dark:text-purple-400 font-mono tracking-tighter uppercase">{aiTasks.length} Suggestions</span>}
                            </div>

                            {!generating && aiTasks.length === 0 && (
                                <div className="flex-1 flex flex-col items-center justify-center py-20 px-10 text-center animate-fade-in group">
                                    <div className="relative w-48 h-48 mb-10">
                                        <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-3xl animate-pulse group-hover:bg-purple-500/20 transition-all duration-700" />
                                        <div className="absolute inset-0 border-2 border-dashed border-[var(--border-color)] rounded-full animate-[spin_20s_linear_infinite]" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Layers size={64} className="text-[var(--text-muted)] group-hover:text-purple-600 transition-colors duration-500 opacity-20" />
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-bold text-[var(--text-dim)] mb-3 tracking-tight uppercase">Ready to Generate</h3>
                                    <p className="text-[var(--text-muted)] max-w-sm leading-relaxed text-sm font-medium">
                                        Select an intern and project on the left to generate customized tasks.
                                    </p>
                                </div>
                            )}

                            {generating && (
                                <div className="flex-1 flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                                    <div className="relative flex items-center justify-center mb-10">
                                        <div className="w-32 h-32 rounded-full border-b-2 border-purple-500 border-t-2 border-transparent animate-spin" />
                                        <Brain size={48} className="absolute text-purple-600 dark:text-purple-400 animate-pulse" />
                                        <div className="absolute -top-4 -right-4 w-3 h-3 bg-blue-500 rounded-full animate-ping" />
                                        <div className="absolute -bottom-4 -left-4 w-2 h-2 bg-purple-500 rounded-full animate-ping delay-300" />
                                    </div>
                                    <h3 className="text-2xl font-black text-[var(--text-main)] mb-2 tracking-tighter uppercase">Generating...</h3>
                                    <p className="text-[var(--text-muted)] text-sm animate-pulse font-mono tracking-widest uppercase">Checking context and history...</p>
                                </div>
                            )}

                            {/* Suggestions List */}
                            <div className="space-y-8 pb-20 w-full animate-fade-in">
                                {aiTasks.map((task, idx) => (
                                    <div 
                                        key={idx} 
                                        className="group relative bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[32px] overflow-hidden transition-all duration-700 hover:bg-purple-500/[0.02] hover:border-purple-500/30 hover:shadow-[0_0_50px_rgba(168,85,247,0.1)] active:scale-[0.99]"
                                    >
                                        <div className="p-10">
                                            <div className="flex items-start justify-between gap-6 mb-8">
                                                <div className="space-y-4 flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm
                                                            ${task.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-500 border-red-500/20' : 
                                                              task.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border-orange-500/20' : 
                                                              'bg-blue-500/20 text-blue-400 border-blue-500/20'}`}>
                                                            {task.priority} Priority
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-muted)] px-4 py-1.5 rounded-full border border-[var(--border-color)]">
                                                            <Clock size={12} />
                                                            {task.estimated_hours}H EST.
                                                        </div>
                                                    </div>
                                                    {editingIndex === idx ? (
                                                        <input 
                                                            value={editValues.title}
                                                            onChange={(e) => setEditValues({...editValues, title: e.target.value})}
                                                            className="w-full bg-[var(--bg-color)] border border-purple-500/30 rounded-xl px-4 py-2 text-2xl font-black text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/30 uppercase tracking-tighter"
                                                            placeholder="Task Title"
                                                        />
                                                    ) : (
                                                        <h3 className="text-3xl font-black text-[var(--text-main)] tracking-tighter leading-none group-hover:text-purple-400 transition-colors uppercase">
                                                            {task.title}
                                                        </h3>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <button 
                                                        onClick={() => assignTask(task, idx)}
                                                        disabled={!!assigning}
                                                        className="shrink-0 flex items-center justify-center gap-3 px-8 py-4 bg-[var(--text-main)] text-[var(--bg-color)] font-black uppercase tracking-widest text-xs rounded-full hover:bg-purple-600 hover:text-white transition-all duration-500 active:scale-90 disabled:opacity-50 shadow-lg shadow-purple-500/10"
                                                    >
                                                        {assigning === task.title ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                                        {assigning === task.title ? 'ASSIGNING...' : 'ASSIGN TASK'}
                                                    </button>
                                                    {editingIndex === idx ? (
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => saveEdit(idx)}
                                                                className="flex-1 py-2 px-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                                                            >
                                                                SAVE
                                                            </button>
                                                            <button 
                                                                onClick={() => setEditingIndex(null)}
                                                                className="flex-1 py-2 px-4 bg-[var(--bg-muted)] text-[var(--text-muted)] border border-[var(--border-color)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--card-bg)] transition-all"
                                                            >
                                                                CANCEL
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => startEditing(idx)}
                                                            className="py-2 px-4 bg-[var(--bg-muted)] text-[var(--text-dim)] border border-[var(--border-color)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-500/20 transition-all"
                                                        >
                                                            EDIT TASK
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
                                                <div className="space-y-6">
                                                    {editingIndex === idx ? (
                                                        <textarea 
                                                            value={editValues.description}
                                                            onChange={(e) => setEditValues({...editValues, description: e.target.value})}
                                                            rows={6}
                                                            className="w-full bg-[var(--bg-color)] border border-purple-500/30 rounded-2xl px-5 py-4 text-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all resize-none font-medium leading-relaxed"
                                                            placeholder="Task description..."
                                                        />
                                                    ) : (
                                                        <p className="text-lg text-[var(--text-dim)] leading-relaxed font-medium line-clamp-4 group-hover:line-clamp-none transition-all duration-1000">
                                                            {task.description}
                                                        </p>
                                                    )}
                                                    <div className="flex flex-wrap gap-2">
                                                        {task.skills_required.map((skill, sIdx) => (
                                                            <span key={sIdx} className="text-[10px] font-black text-[var(--text-dim)] bg-[var(--bg-muted)] border border-[var(--border-color)] px-4 py-2 rounded-xl uppercase tracking-widest group-hover:border-purple-500/30 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-all duration-500">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-4 lg:mt-0 space-y-6">
                                                    <div className="p-6 rounded-3xl bg-purple-500/[0.03] border border-purple-500/10 group-hover:border-purple-500/30 transition-colors duration-500 shadow-sm shadow-purple-500/5">
                                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600 dark:text-purple-500 mb-4 flex items-center gap-2">
                                                            <Cpu size={12} /> AI Rationale
                                                        </h4>
                                                        <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                                                            "{task.rationale}"
                                                        </p>
                                                    </div>
                                                    
                                                    {/* Success Checkmarks */}
                                                    <div className="flex items-center gap-6 px-4">
                                                        <div className="flex flex-col items-center">
                                                            <div className="w-8 h-8 rounded-full border border-[var(--border-color)] flex items-center justify-center mb-2">
                                                                <Star size={12} className="text-[var(--text-muted)]" />
                                                            </div>
                                                            <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Context</span>
                                                        </div>
                                                        <div className="flex flex-col items-center">
                                                            <div className="w-8 h-8 rounded-full border border-[var(--border-color)] flex items-center justify-center mb-2">
                                                                <Zap size={12} className="text-[var(--text-muted)]" />
                                                            </div>
                                                            <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Impact</span>
                                                        </div>
                                                        <div className="flex flex-col items-center">
                                                            <div className="w-8 h-8 rounded-full border border-[var(--border-color)] flex items-center justify-center mb-2">
                                                                <Target size={12} className="text-[var(--text-muted)]" />
                                                            </div>
                                                            <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Goal</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* History Section Redesign */}
                            {(ongoingHistory.length > 0 || completedHistory.length > 0) && (
                                <div className="mt-auto pt-20 pb-10 space-y-6 animate-fade-in">
                                    <div className="flex items-center gap-4 mb-4">
                                        <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--text-muted)] flex items-center gap-3">
                                            <History size={16} /> Intern Task History
                                        </h3>
                                        <div className="flex-1 h-px bg-[var(--border-color)]" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-6 rounded-[32px] bg-[var(--card-bg)] border border-[var(--border-color)] space-y-4">
                                            <div className="flex items-center justify-between px-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500/80">Ongoing Tasks</span>
                                                <Badge variant="info" size="sm">{ongoingHistory.length}</Badge>
                                            </div>
                                            <div className="space-y-3">
                                                {ongoingHistory.map((t, i) => (
                                                    <div key={i} className="group/item flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)] hover:border-blue-500/20 transition-all cursor-default">
                                                        <p className="text-sm font-bold text-[var(--text-dim)] truncate group-hover/item:text-[var(--text-main)] transition-colors capitalize">{t.title}</p>
                                                        <span className="text-[10px] font-mono text-[var(--text-muted)]">{t.due_date}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="p-6 rounded-[32px] bg-[var(--card-bg)] border border-[var(--border-color)] space-y-4">
                                            <div className="flex items-center justify-between px-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/80">Completed Tasks</span>
                                                <Badge variant="success" size="sm">{completedHistory.length}</Badge>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                {completedHistory.slice(0, 3).map((t, i) => (
                                                    <div key={i} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)] relative group/hist">
                                                        <Star size={16} fill="currentColor" className="text-amber-500 mb-2 group-hover/hist:scale-125 transition-transform" />
                                                        <span className="text-[10px] font-bold text-[var(--text-muted)] truncate w-full text-center px-1" title={t.title}>{t.title}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default AITaskGenerator;
