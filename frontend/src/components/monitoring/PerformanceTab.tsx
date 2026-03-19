import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Award, RefreshCw, Loader2, Brain, Target, Lightbulb, BookOpen, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import Card from '../common/Card';
import axios from '../../api/axios';

interface PerformanceMetric {
    overall_performance_score: number;
    productivity_score: number;
    quality_score: number;
    engagement_score: number;
    growth_score: number;
    dropout_risk: string;
    dropout_risk_score: number;
    full_time_readiness_score: number;
    promotion_probability: number;
}

// RL Evaluation Types
interface RLPerformanceEvaluation {
    intern_id: number;
    intern_name: string;
    intern_email: string;
    performance_status: string;
    performance_score: number;
    reasoning: string;
    metrics: {
        quality_score: number;
        completion_rate: number;
        growth_velocity: number;
        engagement: number;
        difficulty_handled: number;
        dropout_risk: number;
    };
    diagnosis: {
        weak_areas: string[];
        possible_causes: Record<string, string[]>;
    };
    recommendations: string[];
    learning_path: {
        has_path: boolean;
        target_role: string | null;
        milestones: any[];
        current_position: number;
        progress: any;
    };
    next_task_type: string;
    optimal_difficulty: number;
    evaluated_at: string;
}

interface PerformanceTabProps {
    performance: PerformanceMetric | null;
    selectedInternId?: number | null;
    onRefresh?: () => void;
}

const PerformanceTab: React.FC<PerformanceTabProps> = ({ performance, selectedInternId, onRefresh }) => {
    const [recomputing, setRecomputing] = useState(false);
    const [evaluating, setEvaluating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [rlEvaluation, setRlEvaluation] = useState<RLPerformanceEvaluation | null>(null);
    const [showAIDetails, setShowAIDetails] = useState(false);

    // Fetch RL evaluation when selectedInternId changes
    useEffect(() => {
        if (selectedInternId) {
            fetchRLEvaluation();
        }
    }, [selectedInternId]);

    const fetchRLEvaluation = async () => {
        if (!selectedInternId) return;
        
        setEvaluating(true);
        try {
            const response = await axios.get(`/analytics/performance/dashboard/${selectedInternId}/`);
            if (response.data) {
                setRlEvaluation(response.data);
            }
        } catch (error: any) {
            console.error('Error fetching RL evaluation:', error);
            // Try alternative endpoint
            try {
                const response = await axios.post('/analytics/performance/evaluate/', {
                    intern_id: selectedInternId
                });
                if (response.data) {
                    setRlEvaluation(response.data);
                }
            } catch (err2) {
                console.error('Error fetching evaluation (alt):', err2);
            }
        } finally {
            setEvaluating(false);
        }
    };

    const handleRecompute = async () => {
        if (!selectedInternId) {
            setMessage({ type: 'error', text: 'Please select an intern first' });
            setTimeout(() => setMessage(null), 3000);
            return;
        }

        setRecomputing(true);
        setMessage(null);

        try {
            const today = new Date();
            const dayOfWeek = today.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = new Date(today);
            monday.setDate(today.getDate() + mondayOffset);
            const periodStart = monday.toISOString().split('T')[0];

            await axios.post('/analytics/performance/compute/', {
                intern_id: selectedInternId,
                period_type: 'WEEKLY',
                period_start: periodStart
            });

            setMessage({ type: 'success', text: 'Performance metrics recomputed successfully!' });
            
            // Refresh RL evaluation after recomputing
            setTimeout(() => fetchRLEvaluation(), 1000);
            
            if (onRefresh) {
                onRefresh();
            }
        } catch (error: any) {
            console.error('Error recomputing performance:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to recompute performance metrics'
            });
        } finally {
            setRecomputing(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const getRiskColor = (risk: string) => {
        const colors: Record<string, string> = {
            'LOW': 'bg-emerald-500',
            'MEDIUM': 'bg-amber-500',
            'HIGH': 'bg-red-500',
        };
        return colors[risk] || 'bg-gray-500';
    };

    // Get status color based on RL performance status
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Thriving': return 'from-emerald-500 to-teal-500';
            case 'Coping Well': return 'from-blue-500 to-cyan-500';
            case 'Struggling': return 'from-amber-500 to-orange-500';
            case 'High Risk': return 'from-red-500 to-rose-500';
            default: return 'from-purple-500 to-pink-500';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Thriving': return <CheckCircle className="w-6 h-6" />;
            case 'Coping Well': return <TrendingUp className="w-6 h-6" />;
            case 'Struggling': return <HelpCircle className="w-6 h-6" />;
            case 'High Risk': return <XCircle className="w-6 h-6" />;
            default: return <Brain className="w-6 h-6" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-main)]">Performance Analytics</h2>
                    <p className="text-[var(--text-dim)] mt-1">AI-Powered Performance Insights & Recommendations</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => fetchRLEvaluation()}
                        disabled={evaluating}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                            evaluating
                                ? 'bg-[var(--bg-muted)] text-[var(--text-muted)] cursor-not-allowed'
                                : 'bg-[var(--bg-muted)] text-[var(--text-dim)] hover:bg-purple-500/10 hover:text-[var(--text-main)] border border-[var(--border-color)]'
                        }`}
                    >
                        {evaluating ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Brain size={18} />
                        )}
                        <span>AI Analysis</span>
                    </button>
                    <button
                        onClick={handleRecompute}
                        disabled={recomputing}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                            recomputing
                                ? 'bg-[var(--bg-muted)] text-[var(--text-muted)] cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg dark:hover:shadow-purple-900/20'
                        }`}
                    >
                        {recomputing ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Recomputing...</span>
                            </>
                        ) : (
                            <>
                                <RefreshCw size={18} />
                                <span>Recompute</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {message && (
                <div className={`px-4 py-3 rounded-xl flex items-center gap-2 animate-slide-up ${
                    message.type === 'success'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                    {message.text}
                </div>
            )}

            {/* RL AI Evaluation Section */}
            {rlEvaluation && (
                <div className="space-y-6">
                    {/* AI Status Card */}
                    <Card padding="lg">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            {/* Status Badge */}
                            <div className={`w-32 h-32 rounded-2xl bg-gradient-to-br ${getStatusColor(rlEvaluation.performance_status)} flex flex-col items-center justify-center shadow-xl`}>
                                <div className="text-white">
                                    {getStatusIcon(rlEvaluation.performance_status)}
                                </div>
                                <span className="text-white font-bold text-lg mt-2 text-center px-2">
                                    {rlEvaluation.performance_status}
                                </span>
                            </div>
                            
                            {/* Details */}
                            <div className="flex-1 w-full">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-[var(--text-main)]">AI Performance Assessment</h3>
                                    <span className="text-sm text-[var(--text-dim)]">
                                        Score: {Math.round(rlEvaluation.performance_score * 100)}%
                                    </span>
                                </div>
                                <p className="text-[var(--text-dim)] mb-4">{rlEvaluation.reasoning}</p>
                                
                                {/* Key Metrics */}
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: 'Completion', value: rlEvaluation.metrics.completion_rate },
                                        { label: 'Quality', value: rlEvaluation.metrics.quality_score },
                                        { label: 'Growth', value: rlEvaluation.metrics.growth_velocity },
                                    ].map((m) => (
                                        <div key={m.label} className="bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-lg p-3 text-center">
                                            <div className="text-2xl font-bold text-[var(--text-main)]">{Math.round(m.value * 100)}%</div>
                                            <div className="text-xs text-[var(--text-muted)]">{m.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Toggle AI Details */}
                    <button
                        onClick={() => setShowAIDetails(!showAIDetails)}
                        className="w-full flex items-center justify-between p-4 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl hover:bg-purple-500/[0.03] transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Brain className="text-purple-500 dark:text-purple-400" size={20} />
                            <span className="text-[var(--text-main)] font-medium">View Detailed AI Analysis</span>
                        </div>
                        <div className={`transform transition-transform ${showAIDetails ? 'rotate-180' : ''}`}>
                            <svg className="w-5 h-5 text-[var(--text-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </button>

                    {/* Detailed AI Analysis */}
                    {showAIDetails && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Weak Areas & Diagnosis */}
                            <Card padding="lg">
                                <h3 className="font-semibold text-[var(--text-main)] mb-4 flex items-center gap-2">
                                    <AlertTriangle size={18} className="text-amber-500" />
                                    Performance Diagnosis
                                </h3>
                                {rlEvaluation.diagnosis.weak_areas.length > 0 ? (
                                    <div className="space-y-4">
                                        {rlEvaluation.diagnosis.weak_areas.map((area, idx) => (
                                            <div key={idx} className="bg-[var(--bg-muted)] rounded-lg p-3 border border-[var(--border-color)]">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                    <span className="text-amber-600 dark:text-amber-400 font-medium text-sm">{area}</span>
                                                </div>
                                                {rlEvaluation.diagnosis.possible_causes[area] && (
                                                    <ul className="ml-4 space-y-1">
                                                        {rlEvaluation.diagnosis.possible_causes[area].map((cause, cIdx) => (
                                                            <li key={cIdx} className="text-[var(--text-dim)] text-sm">• {cause}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-emerald-400 flex items-center gap-2">
                                        <CheckCircle size={16} />
                                        No significant weak areas detected
                                    </p>
                                )}
                            </Card>

                            {/* AI Recommendations */}
                            <Card padding="lg">
                                <h3 className="font-semibold text-[var(--text-main)] mb-4 flex items-center gap-2">
                                    <Lightbulb size={18} className="text-yellow-500" />
                                    AI Improvement Suggestions
                                </h3>
                                {rlEvaluation.recommendations.length > 0 ? (
                                    <ul className="space-y-3">
                                        {rlEvaluation.recommendations.slice(0, 6).map((rec, idx) => (
                                            <li key={idx} className="flex items-start gap-3 text-[var(--text-dim)]">
                                                <span className="w-6 h-6 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs flex-shrink-0 font-bold">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-sm">{rec}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-[var(--text-muted)]">No specific recommendations at this time</p>
                                )}
                            </Card>

                            {/* Learning Path */}
                            <Card padding="lg" className="md:col-span-2">
                                <h3 className="font-semibold text-[var(--text-main)] mb-4 flex items-center gap-2">
                                    <BookOpen size={18} className="text-blue-500" />
                                    Personalized Learning Path
                                </h3>
                                {rlEvaluation.learning_path.has_path ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="text-[var(--text-dim)]">Target Role:</span>
                                            <span className="text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10 px-3 py-1 rounded-full text-sm border border-blue-500/20">
                                                {rlEvaluation.learning_path.target_role}
                                            </span>
                                        </div>
                                        {rlEvaluation.learning_path.milestones && rlEvaluation.learning_path.milestones.slice(0, 4).map((milestone: any, idx: number) => (
                                            <div 
                                                key={idx} 
                                                className={`flex items-center gap-4 p-3 rounded-lg border ${
                                                    idx < rlEvaluation.learning_path.current_position
                                                        ? 'bg-emerald-500/10 border-emerald-500/20'
                                                        : idx === rlEvaluation.learning_path.current_position
                                                            ? 'bg-blue-500/10 border-blue-500/20 shadow-sm'
                                                            : 'bg-[var(--bg-muted)] border-[var(--border-color)]'
                                                }`}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                    idx < rlEvaluation.learning_path.current_position
                                                        ? 'bg-emerald-500 text-white'
                                                        : idx === rlEvaluation.learning_path.current_position
                                                            ? 'bg-blue-500 text-white'
                                                            : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500'
                                                }`}>
                                                    {idx < rlEvaluation.learning_path.current_position ? (
                                                        <CheckCircle size={16} />
                                                    ) : (
                                                        <span className="text-sm font-bold">{idx + 1}</span>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-[var(--text-main)] font-semibold">{milestone.skill_name || milestone.title || `Step ${idx + 1}`}</div>
                                                    {milestone.topics && (
                                                        <div className="text-[var(--text-muted)] text-sm">
                                                            {milestone.topics.slice(0, 3).join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-[var(--text-muted)]">
                                        <BookOpen size={32} className="mx-auto mb-2 opacity-20" />
                                        <p>No learning path generated yet</p>
                                        <p className="text-sm">Generate one from the Learning Path page</p>
                                    </div>
                                )}
                            </Card>

                            {/* Next Task Recommendation */}
                            <Card padding="lg" className="md:col-span-2">
                                <h3 className="font-semibold text-[var(--text-main)] mb-4 flex items-center gap-2">
                                    <Target size={18} className="text-pink-500" />
                                    Recommended Next Task
                                </h3>
                                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-500/5 to-purple-500/5 border border-pink-500/20 rounded-xl">
                                    <div>
                                        <div className="text-[var(--text-muted)] text-sm uppercase tracking-wider font-bold">Task Type</div>
                                        <div className="text-[var(--text-main)] font-black text-xl">
                                            {rlEvaluation.next_task_type.replace('_', ' ')}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[var(--text-muted)] text-sm uppercase tracking-wider font-bold">Optimal Difficulty</div>
                                        <div className="text-[var(--text-main)] font-black text-xl">
                                            Level {rlEvaluation.optimal_difficulty} / 5
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            )}

            {/* Loading State for RL Evaluation */}
            {evaluating && !rlEvaluation && (
                <div className="flex justify-center items-center py-12">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                        <p className="text-[var(--text-dim)] font-medium">Analyzing intern performance with AI...</p>
                    </div>
                </div>
            )}

            {/* Legacy Performance Display (if no RL evaluation) */}
            {performance && !rlEvaluation && !evaluating && (
                <>
                    {/* Overall Score Circle */}
                    <Card padding="lg">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="relative w-40 h-40">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="80" cy="80" r="70" fill="none" stroke="#334155" strokeWidth="14" />
                                    <circle
                                        cx="80" cy="80" r="70" fill="none"
                                        stroke={performance.overall_performance_score >= 80 ? '#10b981' : performance.overall_performance_score >= 60 ? '#3b82f6' : '#f59e0b'}
                                        strokeWidth="14"
                                        strokeDasharray={`${performance.overall_performance_score * 4.4} 440`}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-bold text-[var(--text-main)]">{Math.round(performance.overall_performance_score)}</span>
                                    <span className="text-sm text-[var(--text-muted)]">out of 100</span>
                                </div>
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                                {[
                                    { label: 'Productivity', value: performance.productivity_score, color: 'bg-blue-500' },
                                    { label: 'Quality', value: performance.quality_score, color: 'bg-emerald-500' },
                                    { label: 'Engagement', value: performance.engagement_score, color: 'bg-violet-500' },
                                    { label: 'Growth', value: performance.growth_score, color: 'bg-amber-500' },
                                ].map((metric) => (
                                    <div key={metric.label} className="bg-slate-800/30 rounded-xl p-4 border border-white/5">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-slate-300">{metric.label}</span>
                                            <span className="text-lg font-bold text-white">{Math.round(metric.value)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-700/50 rounded-full h-2">
                                            <div className={`${metric.color} h-2 rounded-full transition-all duration-500`} style={{ width: `${metric.value}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    {/* Risk & PPO Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card padding="lg">
                            <h3 className="font-semibold text-[var(--text-main)] mb-4 flex items-center gap-2">
                                <AlertTriangle size={18} className="text-amber-500" />
                                Risk Assessment
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className={`w-16 h-16 rounded-full ${getRiskColor(performance.dropout_risk)} flex items-center justify-center`}>
                                    <AlertTriangle size={28} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-[var(--text-main)]">{performance.dropout_risk} Risk</p>
                                    <p className="text-sm text-[var(--text-dim)]">Score: {Math.round(performance.dropout_risk_score)}%</p>
                                </div>
                            </div>
                        </Card>
                        <Card padding="lg">
                            <h3 className="font-semibold text-[var(--text-main)] mb-4 flex items-center gap-2">
                                <Award size={18} className="text-teal-500" />
                                PPO Eligibility
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                                    <Award size={28} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-[var(--text-main)]">{Math.round(performance.promotion_probability)}%</p>
                                    <p className="text-sm text-[var(--text-dim)]">Full-Time Readiness</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </>
            )}

            {/* No Data State */}
            {!performance && !rlEvaluation && !evaluating && (
                <div className="text-center py-16 text-[var(--text-muted)] animate-fade-in">
                    <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium text-[var(--text-main)]">No performance data available</p>
                    <p className="text-sm">Data will appear once metrics are computed</p>
                </div>
            )}
        </div>
    );
};

export default PerformanceTab;
