import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Zap, RefreshCw, Sparkles, AlertCircle, Cpu, Brain, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useMonitoring } from '../context/MonitoringContext';
import { CustomSelect, Button } from '../components/common';

const CreateLearningPathPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedInternId: activeInternId } = useMonitoring();

    const [jobRoles, setJobRoles] = useState<{id: number; role_title: string; role_description: string}[]>([]);
    const [targetRole, setTargetRole] = useState('');
    const [loadingGenerate, setLoadingGenerate] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);

    const [availableSkills, setAvailableSkills] = useState<string[]>([]);
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [customPathTitle, setCustomPathTitle] = useState('');
    const [aiGoal, setAiGoal] = useState('');
    const [aiRationale, setAiRationale] = useState('');
    const [basicsOnly, setBasicsOnly] = useState(false);
    
    const [error, setError] = useState('');

    const effectiveInternId = activeInternId || (user?.role === 'INTERN' ? user.id : null);

    useEffect(() => {
        const fetchJobRoles = async () => {
            try {
                const res = await api.get('/analytics/job-roles/');
                if (res.data?.job_roles) {
                    setJobRoles(res.data.job_roles);
                }
            } catch (err: unknown) {
                console.error('Failed to fetch job roles', err);
            }
        };
        fetchJobRoles();

        const fetchAvailableSkills = async () => {
            try {
                const response = await api.get('/analytics/skills/');
                setAvailableSkills(response.data.skills);
            } catch (err: unknown) {
                console.error("Error fetching skills:", err);
            }
        };
        fetchAvailableSkills();
    }, []);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (loadingGenerate) {
            setGenerationProgress(5);
            interval = setInterval(() => {
                setGenerationProgress(prev => {
                    if (prev >= 95) return prev;
                    return prev + (95 - prev) * 0.1;
                });
            }, 500);
        } else {
            setGenerationProgress(100);
            const timeout = setTimeout(() => setGenerationProgress(0), 500);
            return () => clearTimeout(timeout);
        }
        return () => clearInterval(interval);
    }, [loadingGenerate]);

    const generatePath = async (type: 'role' | 'skill' = 'role') => {
        if (!effectiveInternId) { setError('Select an intern first in the dashboard'); return; }
        
        if (type === 'role' && !targetRole.trim()) { 
            setError(jobRoles.length > 0 ? 'Select a target role from the dropdown' : 'Enter a target role (e.g., BACKEND_DEVELOPER)'); 
            return; 
        }

        if (type === 'skill' && selectedSkills.length === 0) {
            setError('Please select at least one skill.');
            return;
        }

        const payload = type === 'role' 
            ? { target_role: targetRole }
            : { type: 'skill', skills: selectedSkills, title: customPathTitle || 'Custom Skill Path', basics_only: basicsOnly };

        const internIdNum = Number(effectiveInternId);
        setLoadingGenerate(true);
        toast.promise(
            api.post(`/analytics/learning-path/${internIdNum}/`, payload).then(res => {
                navigate('/analytics/learning-paths');
                return res;
            }).finally(() => {
                setLoadingGenerate(false);
            }),
            {
                loading: 'Synthesizing adaptive roadmap through neural graph...',
                success: type === 'role' ? 'Learning path successfully anchored' : 'Custom skill path successfully anchored',
                error: 'Failed to synthesize adaptive roadmap'
            }
        );
    };

    const handleSuggestSkills = async () => {
        if (!aiGoal) {
            setError("Please enter a goal for the AI to analyze.");
            return;
        }
        if (!effectiveInternId) { setError('Select an intern first in the dashboard'); return; }

        toast.promise(api.post('/analytics/llm/suggest-path/', {
            intern_id: effectiveInternId,
            goal: aiGoal,
            basics_only: basicsOnly
        }), {
            loading: 'Querying neural matrix for optimal skill sequences...',
            success: (response) => {
                if (response.data.suggested_skills) {
                    setSelectedSkills(response.data.suggested_skills);
                    setAiRationale(response.data.rationale);
                    setCustomPathTitle(`${aiGoal} Focus`);
                    return 'AI suggestions successfully synthesized';
                }
                return 'Synthesis complete with zero findings';
            },
            error: 'Neural matrix query interrupted'
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-6">
            <button
                onClick={() => navigate('/analytics/learning-paths')}
                className="flex items-center gap-2 text-sm font-medium text-[var(--text-dim)] hover:text-purple-400 transition-colors"
            >
                <ArrowLeft size={16} /> Back to Learning Paths
            </button>

            <div>
                <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2 flex items-center gap-3">
                    <Brain className="text-violet-500" />
                    Create <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Learning Path</span>
                </h1>
                <p className="text-[var(--text-dim)]">Synthesize a new adaptive roadmap based on roles or skills.</p>
            </div>

            {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            <div className="space-y-8 mt-6">
                {/* Generate Path Form */}
                <div className="bg-violet-600/10 border border-violet-500/20 rounded-2xl p-6 relative overflow-hidden group hover:border-violet-500/40 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                <Target size={16} className="text-white" />
                            </div>
                            <h2 className="text-base font-bold text-[var(--text-main)]">Generate Role-based Path</h2>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4">
                            {jobRoles.length > 0 ? (
                                <CustomSelect
                                    options={[
                                        { value: '', label: 'Select a specific job role focus...', disabled: true },
                                        ...jobRoles.map(role => ({ value: role.role_title, label: role.role_title }))
                                    ]}
                                    value={targetRole}
                                    onChange={setTargetRole}
                                    accent="violet"
                                    className="flex-1"
                                />
                            ) : (
                                <input
                                    type="text"
                                    placeholder="Enter target role (e.g. Fullstack Engineer)"
                                    value={targetRole}
                                    onChange={e => setTargetRole(e.target.value)}
                                    className="flex-1 px-5 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl text-[var(--text-main)] text-sm font-medium placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 transition-all"
                                />
                            )}
                            <button
                                onClick={() => generatePath('role')}
                                disabled={loadingGenerate}
                                className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600 text-white text-sm font-black rounded-2xl transition-all duration-300 shadow-xl shadow-violet-500/20 disabled:opacity-50 active:scale-95"
                            >
                                {loadingGenerate
                                    ? <RefreshCw size={18} className="animate-spin" />
                                    : <Zap size={18} className="fill-current" />
                                }
                                {loadingGenerate ? 'Reconfiguring...' : 'Synthesize Path'}
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className={`transition-all duration-500 overflow-hidden ${loadingGenerate ? 'opacity-100 h-14' : 'opacity-0 h-0'}`}>
                            <div className="pt-4">
                                <div className="flex justify-between text-xs font-bold text-violet-400 mb-2 uppercase tracking-widest">
                                    <span>Synthesizing Learning Path</span>
                                    <span>{Math.round(generationProgress)}%</span>
                                </div>
                                <div className="h-2 bg-[var(--bg-color)] rounded-full overflow-hidden border border-[var(--border-color)]">
                                    <div 
                                        className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500 ease-out relative"
                                        style={{ width: `${generationProgress}%` }}
                                    >
                                        <div className="absolute top-0 bottom-0 left-0 right-0 overflow-hidden rounded-full">
                                            <div className="w-full h-full bg-white/20 animate-pulse" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <div className="px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-[10px] font-bold text-violet-400 uppercase tracking-widest">A* SEARCH ENABLED</div>
                            <p className="text-[11px] text-[var(--text-muted)] font-medium">Optimal skill sequence calculation based on global prerequisite graphs.</p>
                        </div>
                    </div>
                </div>

                {/* Custom Skill Selection Section */}
                <div className="relative rounded-3xl bg-[var(--bg-muted)] border border-[var(--border-color)] p-6 backdrop-blur-md overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-purple-500/20 rounded-xl">
                                <Target className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold font-heading text-[var(--text-main)]">Focus on Specific Skills</h3>
                                <p className="text-[var(--text-dim)] text-sm">Select languages or frameworks for a custom path</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* AI Suggestion Input */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-[var(--text-dim)] block">AI-Powered Suggestions</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Focus on Basics</span>
                                        <button 
                                            onClick={() => setBasicsOnly(!basicsOnly)}
                                            className={`w-10 h-5 rounded-full relative transition-all duration-300 ${basicsOnly ? 'bg-violet-500' : 'bg-slate-700'}`}
                                        >
                                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${basicsOnly ? 'left-6' : 'left-1'}`} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                                        <input
                                            type="text"
                                            value={aiGoal}
                                            onChange={(e) => setAiGoal(e.target.value)}
                                            placeholder="e.g., Become a Backend Expert, Master React..."
                                            className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl py-2 pl-10 pr-4 text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-[var(--text-muted)]"
                                        />
                                    </div>
                                    <Button onClick={handleSuggestSkills} variant="secondary">
                                        Ask AI
                                    </Button>
                                </div>
                                {aiRationale && (
                                    <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                                        <p className="text-sm text-purple-300">
                                            <strong className="text-purple-400">AI Rationale:</strong> {aiRationale}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <hr className="border-[var(--border-color)]" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Available Skills List */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-dim)] block">Available Skills</label>
                                    <div className="h-64 overflow-y-auto custom-scrollbar border border-[var(--border-color)] rounded-xl p-2 bg-[var(--bg-color)] space-y-1">
                                        {availableSkills.filter(s => !selectedSkills.includes(s)).map(skill => (
                                            <button
                                                key={skill}
                                                onClick={() => setSelectedSkills([...selectedSkills, skill])}
                                                className="w-full text-left px-3 py-2 text-sm text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--bg-muted)] rounded-lg transition-colors flex justify-between items-center group"
                                            >
                                                {skill}
                                                <span className="text-[10px] text-purple-500 opacity-0 group-hover:opacity-100 uppercase tracking-widest font-bold">Add</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Selected Skills List */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-dim)] block">Selected Path ({selectedSkills.length})</label>
                                    <div className="h-64 overflow-y-auto custom-scrollbar border border-[var(--border-color)] rounded-xl p-2 bg-[var(--bg-color)] space-y-2">
                                        {selectedSkills.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] p-4 text-center">
                                                <Cpu className="w-8 h-8 mb-2 opacity-50" />
                                                <p className="text-sm font-medium">No skills selected</p>
                                                <p className="text-xs mt-1">Select from the list or ask AI</p>
                                            </div>
                                        ) : (
                                            selectedSkills.map((skill, idx) => (
                                                <div key={skill} className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-lg p-2 group">
                                                    <span className="flex items-center justify-center w-5 h-5 rounded-md bg-purple-500/20 text-purple-400 text-[10px] font-bold">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="flex-1 text-sm text-[var(--text-main)] font-medium">{skill}</span>
                                                    <button
                                                        onClick={() => setSelectedSkills(selectedSkills.filter(s => s !== skill))}
                                                        className="p-1 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                                    >
                                                        <AlertCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 items-center">
                                <input
                                    type="text"
                                    value={customPathTitle}
                                    onChange={(e) => setCustomPathTitle(e.target.value)}
                                    placeholder="Path Title (Optional)"
                                    className="flex-1 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl py-2 px-4 text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-[var(--text-muted)]"
                                />
                                <Button
                                    onClick={() => generatePath('skill')}
                                    disabled={selectedSkills.length === 0 || loadingGenerate}
                                    gradient="purple"
                                    className="whitespace-nowrap"
                                >
                                    {loadingGenerate ? 'Generating...' : 'Create Custom Path'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateLearningPathPage;
