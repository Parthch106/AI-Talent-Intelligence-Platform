import React, { useState, useEffect, useMemo } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useMonitoring } from '../context/MonitoringContext';
import { TasksTab } from '../components/monitoring';
import { useSearchParams } from 'react-router-dom';
import { Card, ContributionHeatmap, Modal, Button } from '../components/common';
import { ChevronDown, Search, Check, X, Plus, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Types (matching MonitoringDashboard)
interface Task {
    id: number;
    task_id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    due_date: string;
    assigned_at?: string;
    completed_at?: string;
    estimated_hours: number;
    actual_hours: number;
    quality_rating: number | null;
    code_review_score: number | null;
    bug_count: number;
    mentor_feedback: string;
    rework_required: boolean;
}

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

const MonitoringTasksPage: React.FC = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const urlInternId = searchParams.get('internId');
    const viewParam = searchParams.get('view') as 'grid' | 'list' | 'board' | null;
    
    // State
    // Global State from context
    const { selectedInternId: selectedIntern, setSelectedInternId: setSelectedIntern, interns } = useMonitoring();
    
    // Local State
    const [tasks, setTasks] = useState<Task[]>([]);
    const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [monthFilter, setMonthFilter] = useState<number | 'all'>('all');
    const [yearFilter, setYearFilter] = useState<number | 'all'>(new Date().getFullYear());
    const [heatmapLoading, setHeatmapLoading] = useState<boolean>(false);
    const [filterDate, setFilterDate] = useState<string | null>(null);
    const [showInternDropdown, setShowInternDropdown] = useState(false);
    const [internSearch, setInternSearch] = useState('');
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [projects, setProjects] = useState<ProjectAssignment[]>([]);
    const [modules, setModules] = useState<ProjectModule[]>([]);
    const [availableSkills, setAvailableSkills] = useState<string[]>([]);
    const [skillSearch, setSkillSearch] = useState('');
    const [showSkillDropdown, setShowSkillDropdown] = useState(false);
    const [taskForm, setTaskForm] = useState({
        title: '', description: '', priority: 'LOW', due_date: '', estimated_hours: 0, project_assignment_id: '', project_module_id: '', skills_required: [] as string[],
    });
    const [globalStatusFilter, setGlobalStatusFilter] = useState<string | null>(null);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);


    const fetchAvailableSkills = async (internId?: number): Promise<void> => {
        try {
            const params = internId ? { intern_id: internId } : {};
            const response = await axios.get('/analytics/skills/', { params });
            setAvailableSkills(response.data.skills || []);
        } catch (err) {
            console.error('Error fetching skills:', err);
        }
    };


    // Effect to handle URL intern ID parameter
    useEffect(() => {
        if (urlInternId && (user?.role === 'ADMIN' || user?.role === 'MANAGER')) {
            setSelectedIntern(parseInt(urlInternId));
        }
    }, [urlInternId, setSelectedIntern, user?.role]);

    const fetchProjects = async (): Promise<void> => {
        try {
            const response = await axios.get('/projects/assignments/');
            setProjects(response.data.results || response.data || []);
        } catch (err) {
            console.error('Error fetching projects:', err);
        }
    };

    const fetchModules = async (projectId: string): Promise<void> => {
        if (!projectId) {
            setModules([]);
            return;
        }
        try {
            const response = await axios.get(`/projects/modules/?project_id=${projectId}`);
            setModules(response.data || []);
        } catch (err) {
            console.error('Error fetching modules:', err);
        }
    };

    const openModal = (modalType: string): void => {
        if (modalType === 'task') {
            fetchProjects();
        }
        setActiveModal(modalType);
    };

    const closeModal = (): void => {
        setActiveModal(null);
    };

    const handleCreateTask = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        const taskPayload: Record<string, string | number | string[]> = {
            title: taskForm.title,
            description: taskForm.description,
            priority: taskForm.priority,
            due_date: taskForm.due_date,
            estimated_hours: taskForm.estimated_hours,
            intern_id: selectedIntern || 0,
            skills_required: taskForm.skills_required
        };
        if (taskForm.project_assignment_id) {
            taskPayload.project_assignment_id = parseInt(taskForm.project_assignment_id);
        }
        if (taskForm.project_module_id) {
            taskPayload.project_module_id = parseInt(taskForm.project_module_id);
        }

        toast.promise(axios.post('/analytics/tasks/create/', taskPayload), {
            loading: 'Injecting task parameters into the neural pipeline...',
            success: () => {
                closeModal();
                setTaskForm({ title: '', description: '', priority: 'MEDIUM', due_date: '', estimated_hours: 0, project_assignment_id: '', project_module_id: '', skills_required: [] });
                fetchData();
                return 'Task successfully initialized and assigned';
            },
            error: (err) => {
                return (err as Error).message || 'Failed to initialize task sequence';
            }
        });
    };

    const fetchHeatmapData = React.useCallback(async (targetId: number): Promise<void> => {
        setHeatmapLoading(true);
        try {
            const params: Record<string, string | number> = { intern_id: targetId };
            
            if (yearFilter !== 'all') {
                params.start_date = `${yearFilter}-01-01`;
                params.end_date = `${yearFilter}-12-31`;
            } else {
                params.months = 12;
            }

            const response = await axios.get('/analytics/heatmap/tasks/', { params });
            setHeatmapData(response.data.heatmap || {});
        } catch (error) {
            console.error('Error fetching heatmap data:', error);
            setHeatmapData({});
        } finally {
            setHeatmapLoading(false);
        }
    }, [yearFilter]);

    const fetchData = React.useCallback(async (): Promise<void> => {
        setLoading(true);
        try {
            const targetId = user?.role === 'INTERN' ? user.id : selectedIntern;
            if (!targetId) {
                setLoading(false);
                return;
            }

            fetchHeatmapData(targetId);

            const params: Record<string, string | number> = { 
                intern_id: targetId,
                limit: 1000
            };

            if (monthFilter !== 'all') params.month = monthFilter;
            if (yearFilter !== 'all') params.year = yearFilter;

            const tasksRes = await axios.get('/analytics/tasks/', { params });
            const tasksData = Array.isArray(tasksRes.data.tasks) ? tasksRes.data.tasks : [];
            setTasks(tasksData);
        } catch (err) {
            console.error('[fetchData] Error fetching tasks:', err);
        }
        setLoading(false);
    }, [user, selectedIntern, monthFilter, yearFilter, fetchHeatmapData]);

    // Fetch data when page loads (for interns) or when selectedIntern changes
    useEffect(() => {
        fetchData();
        const targetId = user?.role === 'INTERN' ? user?.id : selectedIntern;
        if (targetId) {
            fetchAvailableSkills(targetId);
        }
    }, [fetchData, user?.role, user?.id, selectedIntern]);


    const handleTaskStatusChange = async (taskId: number, newStatus: string): Promise<void> => {
        toast.promise(axios.patch(`/analytics/tasks/${taskId}/`, { status: newStatus }), {
            loading: 'Synchronizing task state transition...',
            success: () => {
                fetchData();
                return `Task status successfully migrated to ${newStatus.replace('_', ' ')}`;
            },
            error: (err) => {
                return (err as Error).message || 'State transition failed';
            }
        });
    };

    const getSelectedInternName = (): string => {
        if (user?.role === 'INTERN') return user.full_name || user.email;
        const selected = interns.find(i => i.id === selectedIntern);
        return selected?.full_name || selected?.email || 'Select Intern';
    };

    const handleHeatmapClick = (date: string) => {
        if (filterDate === date) {
            setFilterDate(null);
        } else {
            setFilterDate(date);
        }
    };

    const getGradient = (name: string): string => {
        const colors = [
            'from-pink-500 to-rose-500', 'from-purple-500 to-indigo-500',
            'from-blue-500 to-cyan-500', 'from-green-500 to-emerald-500',
            'from-yellow-500 to-orange-500', 'from-red-500 to-pink-500'
        ];
        const index = name ? name.charCodeAt(0) % colors.length : 0;
        return colors[index];
    };

    const getInitials = (name: string | null): string => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const filteredSkills = useMemo(() => {
        return availableSkills.filter(skill => 
            skill.toLowerCase().includes(skillSearch.toLowerCase()) &&
            !taskForm.skills_required.includes(skill)
        );
    }, [availableSkills, skillSearch, taskForm.skills_required]);

    const filteredInterns = useMemo(() => {
        if (!internSearch) return interns;
        return interns.filter(intern => 
            (intern.full_name?.toLowerCase() || '').includes(internSearch.toLowerCase()) ||
            (intern.email?.toLowerCase() || '').includes(internSearch.toLowerCase())
        );
    }, [interns, internSearch]);

    const toggleSkill = (skill: string) => {
        setTaskForm(prev => {
            const exists = prev.skills_required.includes(skill);
            if (exists) {
                return { ...prev, skills_required: prev.skills_required.filter(s => s !== skill) };
            } else {
                return { ...prev, skills_required: [...prev.skills_required, skill] };
            }
        });
        setSkillSearch('');
    };

    return (
        <div className="min-h-screen animate-fade-in overflow-visible">
            {/* Header */}
            <div className="bg-[var(--bg-muted)] border-b-0 px-6 py-4 backdrop-blur-xl overflow-visible z-30 relative">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 overflow-visible">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-main)]">
                            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Tasks</span>
                        </h1>
                        <p className="text-[var(--text-dim)] mt-1">Manage and track intern tasks</p>
                    </div>
                    {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                        <div className="flex items-center gap-3 overflow-visible">
                            {/* Status Filter Dropdown */}
                            <div className="relative z-30">
                                <button
                                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                    className="flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-muted)]/50 border border-[var(--border-color)] rounded-xl hover:border-purple-500/50 transition-all font-bold text-xs uppercase tracking-widest text-[var(--text-dim)]"
                                >
                                    <Filter size={14} className="text-purple-400" />
                                    <span>{globalStatusFilter ? globalStatusFilter.replace('_', ' ') : 'All Status'}</span>
                                    <ChevronDown size={16} className={`transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                                </button>
                                {showStatusDropdown && (
                                    <div className="absolute top-full right-0 mt-2 w-48 bg-[var(--bg-muted)]/95 backdrop-blur-xl border border-[var(--border-color)] rounded-xl shadow-xl z-[9999] animate-scale-in">
                                        <div className="p-1">
                                            {['ALL', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'BLOCKED', 'REWORK'].map((status) => (
                                                <button
                                                    key={status}
                                                    onClick={() => {
                                                        setGlobalStatusFilter(status === 'ALL' ? null : status);
                                                        setShowStatusDropdown(false);
                                                    }}
                                                    className={`w-full flex items-center justify-between p-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${globalStatusFilter === status || (status === 'ALL' && !globalStatusFilter) ? 'bg-purple-500/10 text-purple-400' : 'text-[var(--text-muted)] hover:bg-[var(--bg-color)] hover:text-white'}`}
                                                >
                                                    {status.replace('_', ' ')}
                                                    {(globalStatusFilter === status || (status === 'ALL' && !globalStatusFilter)) && <Check size={14} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Intern Selector */}
                            <div className="relative z-30">
                                <button
                                    onClick={() => setShowInternDropdown(!showInternDropdown)}
                                    className="flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-muted)]/50 border border-[var(--border-color)] rounded-xl hover:border-purple-500/50 transition-all"
                                >
                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getGradient(getSelectedInternName())} flex items-center justify-center text-[var(--text-main)] font-bold text-xs`}>
                                        {getInitials(interns.find(i => i.id === selectedIntern)?.full_name || null)}
                                    </div>
                                    <span className="text-[var(--text-main)] truncate max-w-[150px]">{getSelectedInternName()}</span>
                                    <ChevronDown size={16} className={`text-[var(--text-dim)] transition-transform ${showInternDropdown ? 'rotate-180' : ''}`} />
                                </button>
                                {showInternDropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-muted)]/95 backdrop-blur-xl border border-[var(--border-color)] rounded-xl shadow-xl z-[9999] isolate animate-scale-in max-h-[400px] overflow-y-auto custom-scrollbar">
                                        <div className="p-2">
                                            <div className="relative mb-2">
                                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                                <input
                                                    type="text"
                                                    placeholder="Search interns..."
                                                    value={internSearch}
                                                    onChange={(e) => setInternSearch(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-purple-500"
                                                />
                                            </div>
                                            {filteredInterns.map((intern) => (
                                                <button
                                                    key={intern.id}
                                                    onClick={() => {
                                                        setSelectedIntern(intern.id);
                                                        setShowInternDropdown(false);
                                                        setInternSearch('');
                                                    }}
                                                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${selectedIntern === intern.id ? 'bg-purple-500/20' : 'hover:bg-[var(--bg-muted)]'}`}
                                                >
                                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getGradient(intern.full_name || intern.email)} flex items-center justify-center text-[var(--text-main)] font-bold text-xs`}>
                                                        {getInitials(intern.full_name)}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[var(--text-main)] text-sm">{intern.full_name || intern.email}</p>
                                                        {intern.department && (
                                                            <p className="text-xs text-[var(--text-muted)]">{intern.department}</p>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                            <p className="text-[var(--text-dim)]">Loading tasks...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <Card className="mb-6 p-4">
                            {heatmapLoading ? (
                                <div className="flex items-center justify-center h-32">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
                                </div>
                            ) : (
                                <ContributionHeatmap
                                    data={heatmapData}
                                    year={yearFilter === 'all' ? new Date().getFullYear() : yearFilter}
                                    title={`Task Contribution ${yearFilter !== 'all' ? `(${yearFilter})` : '(Last 12 Months)'}`}
                                    colorScheme="green"
                                    onCellClick={handleHeatmapClick}
                                />
                            )}
                        </Card>

                        {filterDate && (
                            <div className="flex items-center gap-3 mb-6 animate-slide-in">
                                <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                                    <span className="text-xs font-black text-purple-400 uppercase tracking-widest">Showing Activity for:</span>
                                    <span className="text-sm font-bold text-[var(--text-main)]">{new Date(filterDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                                <button 
                                    onClick={() => setFilterDate(null)}
                                    className="text-xs font-black text-[var(--text-muted)] hover:text-[var(--text-main)] uppercase tracking-widest transition-colors flex items-center gap-1"
                                >
                                    Clear Filter
                                </button>
                            </div>
                        )}

                        <TasksTab
                            tasks={tasks}
                            onAddTask={() => openModal('task')}
                            canCreate={user?.role === 'MANAGER'}
                            userRole={user?.role || 'INTERN'}
                            onStatusChange={handleTaskStatusChange}
                            onRefresh={fetchData}
                            internId={selectedIntern || undefined}
                            monthFilter={monthFilter}
                            setMonthFilter={setMonthFilter}
                            yearFilter={yearFilter}
                            setYearFilter={setYearFilter}
                            dateFilter={filterDate}
                            setDateFilter={setFilterDate}
                            initialView={viewParam || undefined}
                            externalStatusFilter={globalStatusFilter}
                        />
                    </>
                )}
            </div>

            {/* Task Creation Modal */}
            <Modal
                isOpen={activeModal === 'task'}
                onClose={closeModal}
                title="Assign New Task"
                gradient="violet"
                size="xl"
            >
                <form onSubmit={handleCreateTask} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Title</label>
                            <input
                                type="text"
                                required
                                placeholder="Enter task title"
                                value={taskForm.title}
                                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Priority</label>
                            <select
                                value={taskForm.priority}
                                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="CRITICAL">Critical</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Description</label>
                        <textarea
                            placeholder="Enter task description"
                            value={taskForm.description}
                            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                            className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none"
                            rows={2}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Project (Optional)</label>
                            <select
                                value={taskForm.project_assignment_id}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const selectedProj = projects.find((p) => p.id === parseInt(val));
                                    const projectId = selectedProj?.project?.id;
                                    setTaskForm({ ...taskForm, project_assignment_id: val, project_module_id: '' });
                                    fetchModules(projectId ? String(projectId) : '');
                                }}
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                            >
                                <option value="">
                                    {selectedIntern ? 'Select Project (Intern\'s Projects Only)' : 'No Project'}
                                </option>
                                {projects
                                    .filter((p) => {
                                        // If no intern selected, show all projects
                                        if (!selectedIntern) return true;
                                        // Only show projects assigned to the selected intern
                                        const internId = typeof p.intern === 'object' ? p.intern?.id : p.intern;
                                        return internId === selectedIntern;
                                    })
                                    .map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.project?.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Module {taskForm.project_assignment_id ? '' : '(Select a project first)'}</label>
                            <select
                                value={taskForm.project_module_id}
                                onChange={(e) => setTaskForm({ ...taskForm, project_module_id: e.target.value })}
                                disabled={!taskForm.project_assignment_id}
                                className={`w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all ${!taskForm.project_assignment_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <option value="">{taskForm.project_assignment_id ? 'Select Module' : 'No project selected'}</option>
                                {modules.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="relative">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Skills Developed (Select from list)</label>
                        <div className="min-h-[44px] p-1.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl flex flex-wrap gap-2 focus-within:border-purple-500 transition-all">
                            {taskForm.skills_required.map(skill => (
                                <span key={skill} className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-sm group animate-scale-in">
                                    {skill}
                                    <button 
                                        type="button"
                                        onClick={() => toggleSkill(skill)}
                                        className="hover:text-white transition-colors"
                                    >
                                        <X size={14} />
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
                                    className="w-full bg-transparent border-none outline-none text-[var(--text-main)] placeholder-[var(--text-dim)] py-1"
                                />
                                {showSkillDropdown && (skillSearch || filteredSkills.length > 0) && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-[100]" 
                                            onClick={() => setShowSkillDropdown(false)}
                                        />
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-muted)]/95 backdrop-blur-xl border border-[var(--border-color)] rounded-xl shadow-2xl z-[101] max-h-[200px] overflow-y-auto custom-scrollbar animate-scale-in">
                                            {filteredSkills.length > 0 ? (
                                                <div className="p-1">
                                                    {filteredSkills.map(skill => (
                                                        <button
                                                            key={skill}
                                                            type="button"
                                                            onClick={() => toggleSkill(skill)}
                                                            className="w-full flex items-center justify-between p-2 hover:bg-purple-500/10 rounded-lg text-sm text-left text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors"
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
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Due Date</label>
                            <input
                                type="date"
                                required
                                value={taskForm.due_date}
                                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Estimated Hours</label>
                            <input
                                type="number"
                                required
                                min="1"
                                step="0.5"
                                value={taskForm.estimated_hours}
                                onChange={(e) => setTaskForm({ ...taskForm, estimated_hours: parseFloat(e.target.value) })}
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
                        <Button type="button" onClick={closeModal} variant="outline" fullWidth>
                            Cancel
                        </Button>
                        <Button type="submit" gradient="purple" fullWidth>
                            Create Task
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default MonitoringTasksPage;
