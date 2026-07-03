import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Sparkles, FolderKanban, Clock, History, X } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Card, Button, CustomSelect } from '../components/common';

interface ProjectModule {
    id: number;
    name: string;
    description: string;
    order?: number;
    estimated_hours?: number;
}

interface AISuggestion {
    name: string;
    description: string;
    estimated_duration: number;
    difficulty: number;
    tech_stack: string[];
    learning_objectives: string[];
    business_value: string;
    modules: ProjectModule[];
}

interface ProjectHistoryEntry {
    timestamp: string;
    suggestions: AISuggestion[];
}

const AIProjectSuggestionsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [generating, setGenerating] = useState(false);
    const [aiInput, setAiInput] = useState({
        description: '',
        skills: '',
        duration: '3 months',
    });
    
    const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
    const [projectHistory, setProjectHistory] = useState<ProjectHistoryEntry[]>([]);

    useEffect(() => {
        const history = localStorage.getItem('aims_project_suggestion_history');
        if (history) {
            try {
                setProjectHistory(JSON.parse(history));
            } catch (err) {
                console.error("Failed to parse project suggestion history", err);
            }
        }
    }, []);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setGenerating(true);

        const suggestionPromise = async () => {
            const department = user?.department || 'Development (Web/Application)';
            const requestData: Record<string, string | number> = {
                department: department,
                experience_level: 'BEGINNER',
                num_suggestions: 3,
                duration: aiInput.duration
            };

            if (aiInput.description.trim()) requestData.description = aiInput.description.trim();
            if (aiInput.skills.trim()) requestData.skills = aiInput.skills.trim();

            const response = await api.post('/projects/projects/suggest_projects/', requestData);
            if (response.data.error) throw new Error(response.data.error);
            return response.data;
        };

        toast.promise(suggestionPromise(), {
            loading: 'Generating AI project suggestions...',
            success: (data) => {
                const generatedSuggestions = data.projects || [];
                setAiSuggestions(generatedSuggestions);
                
                if (generatedSuggestions.length > 0) {
                    const newEntry = {
                        timestamp: new Date().toLocaleString(),
                        suggestions: generatedSuggestions
                    };
                    setProjectHistory(prev => {
                        const newHistory = [newEntry, ...prev].slice(0, 10);
                        localStorage.setItem('aims_project_suggestion_history', JSON.stringify(newHistory));
                        return newHistory;
                    });
                }

                setAiInput({ description: '', skills: '', duration: '3 months' });
                setGenerating(false);
                return 'AI suggestions generated';
            },
            error: (err) => {
                setGenerating(false);
                return err.message || 'Failed to generate AI suggestions';
            }
        });
    };

    const handleCreateProjectFromSuggestion = (suggestion: AISuggestion) => {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + (suggestion.estimated_duration * 7));

        const formattedSuggestion = {
            ...suggestion,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
        };

        navigate('/directory/projects/create', { state: { suggestion: formattedSuggestion } });
    };

    const getDifficultyBadge = (difficulty: number) => {
        const colors = {
            1: 'bg-green-500/10 text-green-600 border-green-500/20',
            2: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
            3: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
            4: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
            5: 'bg-red-500/10 text-red-600 border-red-500/20'
        };
        const labels = {1: 'Beginner', 2: 'Easy', 3: 'Medium', 4: 'Hard', 5: 'Expert'};
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-lg border ${colors[difficulty as keyof typeof colors] || colors[3]}`}>
                {labels[difficulty as keyof typeof labels] || 'Medium'}
            </span>
        );
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in p-6">
            <button
                onClick={() => navigate('/directory/projects')}
                className="flex items-center gap-2 text-sm font-medium text-[var(--text-dim)] hover:text-purple-400 transition-colors"
            >
                <ArrowLeft size={16} /> Back to Projects
            </button>

            <div>
                <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2 flex items-center gap-3">
                    <Sparkles className="text-purple-500" />
                    AI Project <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Suggestions</span>
                </h1>
                <p className="text-[var(--text-dim)]">Generate tailored project templates matching required skills and duration.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Card */}
                <div className="lg:col-span-2 space-y-6">
                    <Card padding="lg" className="border-purple-500/10 bg-[var(--card-bg)]">
                        <form onSubmit={handleGenerate} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
                                    Project Description (Optional)
                                </label>
                                <textarea
                                    value={aiInput.description}
                                    onChange={(e) => setAiInput(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Describe the type of project you want suggestions for..."
                                    className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none"
                                    rows={4}
                                />
                                <p className="text-xs text-[var(--text-dim)] mt-1">
                                    E.g., "Build a task management app" or "Create a data visualization dashboard"
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
                                    Required Skills (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={aiInput.skills}
                                    onChange={(e) => setAiInput(prev => ({ ...prev, skills: e.target.value }))}
                                    placeholder="Enter skills separated by commas..."
                                    className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                />
                                <p className="text-xs text-[var(--text-dim)] mt-1">
                                    E.g., "React, Node.js, Python" or "HTML, CSS, JavaScript"
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
                                    Project Duration
                                </label>
                                <CustomSelect
                                    value={aiInput.duration}
                                    onChange={(v) => setAiInput(prev => ({ ...prev, duration: v }))}
                                    options={[
                                        { value: '1 month', label: '1 Month' },
                                        { value: '2 months', label: '2 Months' },
                                        { value: '3 months', label: '3 Months' },
                                        { value: '6 months', label: '6 Months' },
                                    ]}
                                    accent="purple"
                                />
                            </div>

                            <Button
                                type="submit"
                                gradient="purple"
                                disabled={generating}
                                fullWidth
                                icon={<Sparkles size={18} />}
                            >
                                {generating ? 'Generating Suggestions...' : 'Generate Suggestions'}
                            </Button>
                        </form>
                    </Card>
                </div>

                {/* Info and History Column */}
                <div className="space-y-6">
                    {/* How It Works Banner */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5">
                        <div className="flex gap-3">
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                                i
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-blue-300 mb-1">How it works</h4>
                                <p className="text-xs text-blue-200/80 leading-relaxed">
                                    Suggestions are customized based on the department **{user?.department || 'Development (Web/Application)'}**.
                                    Providing skills or a description helps tailor the templates closer to your target parameters.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Project History */}
                    {projectHistory.length > 0 && (
                        <Card padding="md" className="border-[var(--border-color)]">
                            <h4 className="text-sm font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
                                <History size={16} className="text-purple-500" />
                                Past Generations
                            </h4>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                {projectHistory.map((entry, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => setAiSuggestions(entry.suggestions)}
                                        className="p-3 bg-[var(--bg-muted)] hover:bg-[var(--bg-color)] rounded-xl border border-[var(--border-color)] hover:border-purple-500/30 transition-all cursor-pointer flex justify-between items-center group"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-[var(--text-muted)] font-medium mb-1">{entry.timestamp}</p>
                                            <p className="text-sm text-[var(--text-main)] font-semibold truncate group-hover:text-purple-400 transition-colors">
                                                {entry.suggestions[0]?.name || "Project Idea"}
                                            </p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-all shrink-0 ml-3">
                                            <FolderKanban size={14} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {/* Generated Suggestions Output Section */}
            {aiSuggestions.length > 0 && (
                <div className="space-y-6 pt-6 border-t border-[var(--border-color)]">
                    <h2 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
                        <Sparkles size={20} className="text-yellow-400 animate-pulse" />
                        AI Suggestions Output
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {aiSuggestions.map((suggestion, index) => (
                            <Card key={index} className="flex flex-col h-full border-purple-500/10 hover:border-purple-500/30 transition-all">
                                <div className="p-6 flex flex-col h-full space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0">
                                            <FolderKanban size={20} className="text-purple-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-base text-[var(--text-main)] leading-snug">
                                                {suggestion.name}
                                            </h3>
                                            <div className="mt-1">
                                                {getDifficultyBadge(suggestion.difficulty)}
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-sm text-[var(--text-dim)] leading-relaxed flex-1">
                                        {suggestion.description}
                                    </p>

                                    <div className="space-y-3 pt-3 border-t border-[var(--border-color)]">
                                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                            <Clock size={12} />
                                            <span>Duration: {suggestion.estimated_duration} weeks</span>
                                        </div>

                                        <div className="flex flex-wrap gap-1">
                                            {suggestion.tech_stack.map((tech, techIdx) => (
                                                <span key={techIdx} className="px-2 py-0.5 text-[10px] font-semibold bg-purple-500/10 text-purple-300 rounded border border-purple-500/20 uppercase tracking-tight">
                                                    {tech}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="space-y-1">
                                            <h4 className="text-[10px] font-bold text-[var(--text-main)] uppercase tracking-wider">Objectives:</h4>
                                            <ul className="text-xs text-[var(--text-dim)] space-y-1">
                                                {suggestion.learning_objectives.slice(0, 3).map((obj, objIdx) => (
                                                    <li key={objIdx} className="flex items-start gap-2">
                                                        <div className="w-1 h-1 bg-purple-500 rounded-full mt-1.5 shrink-0" />
                                                        <span className="truncate">{obj}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <Button
                                            gradient="purple"
                                            fullWidth
                                            onClick={() => handleCreateProjectFromSuggestion(suggestion)}
                                        >
                                            Use This Idea
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIProjectSuggestionsPage;
