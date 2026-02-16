import React, { useState, useEffect, useMemo } from 'react';
import { Search, User, TrendingUp, Brain, Award, AlertTriangle, CheckCircle, ChevronDown, RefreshCw, FileText, Target, Shield, Zap, Mail, Building } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

interface Intern {
    id: number;
    full_name: string;
    email: string;
    department: string;
}

interface JobRole {
    id: number;
    role_title: string;
    role_description: string;
    mandatory_skills: string[];
    preferred_skills: string[];
}

interface IntelligenceData {
    user_id: number;
    scores: {
        technical: number;
        leadership: number;
        communication: number;
        culture_fit: number;
        ai_readiness: number;
        predicted_growth: number;
    };
    skill_profile: Record<string, number>;
    domain_strengths: string[];
    skill_gaps: string[];
    recommendations: string[];
    risk_flags: Array<{
        type: string;
        severity: string;
        message: string;
    }>;
    resume_analysis?: {
        applied_role?: string;
        years_of_education?: number;
        has_internship_experience?: boolean;
        internship_count?: number;
        skill_match_percentage?: number;
        core_skill_match_score?: number;
        optional_skill_bonus_score?: number;
        critical_skill_gap_count?: number;
        domain_relevance_score?: number;
        // Internship Relevance (used in suitability)
        internship_relevance_score?: number;
        // Resume Quality Indicators
        resume_authenticity_score?: number;
        keyword_stuffing_flag?: boolean;
        role_alignment_score?: number;
        achievement_orientation_score?: number;  // Optional - doesn't affect suitability
        technical_clarity_score?: number;
        // Optional: Production Tools Percentage
        production_tools_percentage?: {
            percentage?: number;
            tools_found?: string[];
            tool_categories?: Record<string, string[]>;
            total_tools_found?: number;
        };
        suitability_score?: number;
        decision?: string;
        decision_flags?: string[];
    };
}

const AnalysisPage: React.FC = () => {
    const { user } = useAuth();
    const [interns, setInterns] = useState<Intern[]>([]);
    const [selectedInternId, setSelectedInternId] = useState<number | ''>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [intelligence, setIntelligence] = useState<IntelligenceData | null>(null);
    const [loading, setLoading] = useState(false);
    const [computing, setComputing] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Job role state
    const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
    const [selectedJobRole, setSelectedJobRole] = useState<string>('');

    useEffect(() => {
        const fetchInterns = async () => {
            if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') return;
            try {
                const response = await api.get('/accounts/users/?role=INTERN');
                console.log('Interns API Response:', response.data);
                setInterns(response.data.results || response.data);
            } catch (err) {
                console.error('Error fetching interns:', err);
            }
        };
        fetchInterns();
    }, [user]);

    // Fetch job roles
    useEffect(() => {
        const fetchJobRoles = async () => {
            try {
                const response = await api.get('/analytics/job-roles/');
                console.log('Job Roles API Response:', response.data);
                setJobRoles(response.data.job_roles || []);
                // Auto-select first job role if available
                if (response.data.job_roles?.length > 0) {
                    setSelectedJobRole(response.data.job_roles[0].role_title);
                }
            } catch (err) {
                console.error('Error fetching job roles:', err);
            }
        };
        fetchJobRoles();
    }, []);

    useEffect(() => {
        if (selectedInternId) {
            fetchIntelligence(selectedInternId);
        } else {
            setIntelligence(null);
        }
    }, [selectedInternId]);

    const fetchIntelligence = async (internId: number) => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get(`/analytics/intelligence/?intern_id=${internId}`);
            console.log('Intelligence API Response:', response.data);
            setIntelligence(response.data);
        } catch (err: any) {
            console.error('Intelligence API Error:', err);
            setError(err.response?.data?.detail || 'Failed to fetch intelligence data');
            setIntelligence(null);
        } finally {
            setLoading(false);
        }
    };

    const computeIntelligence = async (internId: number) => {
        setComputing(true);
        setError('');
        setSuccessMessage('');
        try {
            console.log('Computing intelligence for intern:', internId, 'with job role:', selectedJobRole);
            const response = await api.post(`/analytics/intelligence/compute/${internId}/`, {
                job_role: selectedJobRole
            });
            console.log('Compute Intelligence Response:', response.data);
            setSuccessMessage('Intelligence computed successfully!');
            await fetchIntelligence(internId);
        } catch (err: any) {
            console.error('Compute Intelligence Error:', err);
            setError(err.response?.data?.error || 'Failed to compute intelligence');
        } finally {
            setComputing(false);
        }
    };

    const filteredInterns = useMemo(() => {
        return interns.filter(intern =>
            intern.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            intern.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            intern.department?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [interns, searchTerm]);

    const selectedIntern = interns.find(i => i.id === selectedInternId);

    const getScoreColor = (score: number) => {
        if (score >= 0.7) return 'text-emerald-400';
        if (score >= 0.5) return 'text-amber-400';
        return 'text-red-400';
    };

    const getScoreBgColor = (score: number) => {
        if (score >= 0.7) return 'bg-emerald-500';
        if (score >= 0.5) return 'bg-amber-500';
        return 'bg-red-500';
    };

    const getScoreLabel = (score: number) => {
        if (score >= 0.7) return 'High';
        if (score >= 0.5) return 'Medium';
        return 'Low';
    };

    const getSuitabilityColor = (score: number) => {
        if (score >= 80) return 'text-emerald-400';
        if (score >= 60) return 'text-amber-400';
        return 'text-red-400';
    };

    const getDecisionBadge = (decision?: string) => {
        switch (decision) {
            case 'INTERVIEW_SHORTLIST': return <Badge variant="success" withDot>Interview Shortlist</Badge>;
            case 'MANUAL_REVIEW': return <Badge variant="warning" withDot>Manual Review</Badge>;
            case 'REJECT': return <Badge variant="danger" withDot>Not Suitable</Badge>;
            case 'NEEDS_IMPROVEMENT': return <Badge variant="purple" withDot>Needs Improvement</Badge>;
            default: return <Badge variant="default">Pending</Badge>;
        }
    };

    const getInitials = (name: string) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'NA';
    };

    if (user?.role === 'INTERN') {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="text-center py-12 max-w-md">
                    <div className="w-20 h-20 mx-auto mb-4 bg-red-500/10 rounded-2xl flex items-center justify-center">
                        <AlertTriangle size={32} className="text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-slate-400">You don't have permission to view this page.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                    Intern <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Analysis</span>
                </h1>
                <p className="text-slate-400">
                    {user?.role === 'ADMIN'
                        ? 'View analytics for all interns across the organization'
                        : `View analytics for interns in your department (${user?.department})`}
                </p>
            </div>

            {/* Intern Selection */}
            <div className="relative max-w-md">
                <label className="block text-sm font-medium text-slate-300 mb-2">Select Intern</label>
                <div className="relative">
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-left hover:border-purple-500/50 transition-all"
                    >
                        <User size={20} className="text-purple-400" />
                        <span className={`flex-1 ${selectedIntern ? 'text-white' : 'text-slate-400'}`}>
                            {selectedIntern
                                ? `${selectedIntern.full_name} (${selectedIntern.department})`
                                : 'Search or select an intern...'}
                        </span>
                        <ChevronDown size={20} className={`text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl shadow-purple-500/20 z-50 overflow-hidden animate-scale-in">
                            <div className="p-3 border-b border-slate-700">
                                <div className="flex items-center gap-2">
                                    <Search size={18} className="text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, email, or department..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-500"
                                    />
                                </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {filteredInterns.length === 0 ? (
                                    <div className="p-4 text-center text-slate-400">No interns found</div>
                                ) : (
                                    filteredInterns.map(intern => (
                                        <button
                                            key={intern.id}
                                            onClick={() => {
                                                setSelectedInternId(intern.id);
                                                setShowDropdown(false);
                                                setSearchTerm('');
                                            }}
                                            className={`w-full p-3 text-left hover:bg-purple-500/10 transition-colors ${selectedInternId === intern.id ? 'bg-purple-500/20' : ''}`}
                                        >
                                            <div className="font-medium text-white">{intern.full_name}</div>
                                            <div className="text-sm text-slate-400">{intern.email} • {intern.department}</div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2 animate-shake">
                    <AlertTriangle size={18} />
                    {error}
                </div>
            )}
            {successMessage && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-2">
                    <CheckCircle size={18} />
                    {successMessage}
                </div>
            )}

            {/* Analysis Content */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                        <p className="text-slate-400">Loading analysis...</p>
                    </div>
                </div>
            ) : intelligence && intelligence.scores ? (
                <div className="space-y-6">
                    {/* Selected Intern Header */}
                    <Card className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-40"></div>
                                <div className="relative w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                                    {getInitials(selectedIntern?.full_name || '')}
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{selectedIntern?.full_name}</h2>
                                <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                                    <span className="flex items-center gap-1"><Mail size={14} className="text-purple-400" />{selectedIntern?.email}</span>
                                    <span className="flex items-center gap-1"><Building size={14} className="text-purple-400" />{selectedIntern?.department}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Job Role Selector */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-slate-400">Target Role</label>
                                <select
                                    value={selectedJobRole}
                                    onChange={(e) => setSelectedJobRole(e.target.value)}
                                    className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    <option value="">Select role...</option>
                                    {jobRoles.map((role) => (
                                        <option key={role.id} value={role.role_title}>
                                            {role.role_title.replace(/_/g, ' ')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <Button
                                onClick={() => selectedInternId && computeIntelligence(selectedInternId as number)}
                                disabled={computing || !selectedJobRole}
                                gradient="purple"
                                icon={<RefreshCw size={16} className={computing ? 'animate-spin' : ''} />}
                            >
                                {computing ? 'Computing...' : 'Recompute'}
                            </Button>
                        </div>
                    </Card>

                    {/* Score Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Technical', score: intelligence.scores.technical, icon: TrendingUp, color: 'from-purple-500 to-indigo-500' },
                            { label: 'AI Readiness', score: intelligence.scores.ai_readiness, icon: Brain, color: 'from-violet-500 to-purple-500' },
                            { label: 'Growth Potential', score: intelligence.scores.predicted_growth, icon: Award, color: 'from-amber-500 to-orange-500' },
                            { label: 'Leadership', score: intelligence.scores.leadership, icon: User, color: 'from-cyan-500 to-blue-500' },
                        ].map((item) => (
                            <Card key={item.label} hover className="group">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className={`p-2 rounded-lg bg-gradient-to-br ${item.color}`}>
                                        <item.icon size={16} className="text-white" />
                                    </div>
                                    <span className="text-sm text-slate-400">{item.label}</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-3xl font-bold ${getScoreColor(item.score)}`}>
                                        {(item.score * 100).toFixed(0)}%
                                    </span>
                                    <span className="text-sm text-slate-500">{getScoreLabel(item.score)}</span>
                                </div>
                                <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${getScoreBgColor(item.score)} transition-all duration-500`}
                                        style={{ width: `${item.score * 100}%` }}
                                    />
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Additional Scores */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { label: 'Communication', score: intelligence.scores.communication },
                            { label: 'Culture Fit', score: intelligence.scores.culture_fit },
                        ].map((item) => (
                            <Card key={item.label} className="flex items-center justify-between">
                                <span className="text-slate-300">{item.label}</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${getScoreBgColor(item.score)} transition-all`}
                                            style={{ width: `${item.score * 100}%` }}
                                        />
                                    </div>
                                    <span className={`font-bold ${getScoreColor(item.score)}`}>
                                        {(item.score * 100).toFixed(0)}%
                                    </span>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Resume Analysis */}
                    {intelligence.resume_analysis && (
                        <div className="space-y-6">
                            {/* Suitability Score */}
                            <Card className="border-l-4 border-l-purple-500">
                                <div className="flex items-center gap-2 mb-4">
                                    <FileText size={20} className="text-purple-400" />
                                    <h3 className="text-lg font-semibold text-white">Resume Suitability Analysis</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-sm text-slate-400 mb-2">Suitability Score</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className={`text-4xl font-bold ${getSuitabilityColor(intelligence.resume_analysis.suitability_score || 0)}`}>
                                                {intelligence.resume_analysis.suitability_score?.toFixed(0) || 0}
                                            </span>
                                            <span className="text-xl text-slate-500">/100</span>
                                        </div>
                                        <div className="mt-3 h-3 bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${getScoreBgColor((intelligence.resume_analysis.suitability_score || 0) / 100)} transition-all`}
                                                style={{ width: `${intelligence.resume_analysis.suitability_score || 0}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-400 mb-2">Decision</p>
                                        <div className="flex items-center gap-3">
                                            {getDecisionBadge(intelligence.resume_analysis.decision)}
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Skill Matching */}
                            <Card icon={<Target size={20} />} title="Skill-to-Role Matching">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Skill Match', value: `${intelligence.resume_analysis.skill_match_percentage?.toFixed(0) || 0}%` },
                                        { label: 'Core Skills', value: `${((intelligence.resume_analysis.core_skill_match_score || 0) * 100).toFixed(0)}%` },
                                        { label: 'Critical Gaps', value: intelligence.resume_analysis.critical_skill_gap_count || 0, highlight: true },
                                        { label: 'Domain Relevance', value: `${((intelligence.resume_analysis.domain_relevance_score || 0) * 100).toFixed(0)}%` },
                                    ].map((item) => (
                                        <div key={item.label} className="p-3 bg-slate-800/30 rounded-xl">
                                            <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                                            <p className={`text-xl font-bold ${item.highlight ? 'text-red-400' : 'text-white'}`}>{item.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Production Tools (Optional - doesn't affect suitability) */}
                            {intelligence.resume_analysis.production_tools_percentage && intelligence.resume_analysis.production_tools_percentage.percentage !== undefined && (
                                <Card icon={<Zap size={20} />} title="Production Tools Usage">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-3 bg-slate-800/30 rounded-xl">
                                            <p className="text-xs text-slate-400 mb-1">Overall Score</p>
                                            <p className="text-xl font-bold text-white">
                                                {intelligence.resume_analysis.production_tools_percentage.percentage.toFixed(0)}%
                                            </p>
                                        </div>
                                        <div className="p-3 bg-slate-800/30 col-span-2">
                                            <p className="text-xs text-slate-400 mb-1">Tools Found</p>
                                            <p className="text-sm font-medium text-white">
                                                {(intelligence.resume_analysis.production_tools_percentage.tools_found?.length ?? 0) > 0
                                                    ? (intelligence.resume_analysis.production_tools_percentage.tools_found ?? []).join(', ')
                                                    : 'None'}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Tool Categories Breakdown */}
                                    {intelligence.resume_analysis.production_tools_percentage.tool_categories && (
                                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {Object.entries(intelligence.resume_analysis.production_tools_percentage.tool_categories).map(([category, tools]) => (
                                                tools.length > 0 && (
                                                    <div key={category} className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                                        <p className="text-xs text-purple-400 capitalize">{category.replace('_', ' ')}</p>
                                                        <p className="text-xs text-slate-300">{tools.join(', ')}</p>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            )}

                            {/* Resume Quality Indicators */}
                            <Card icon={<Shield size={20} />} title="Resume Quality Indicators">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {[
                                        { label: 'Authenticity', value: intelligence.resume_analysis.resume_authenticity_score },
                                        { label: 'Role Alignment', value: intelligence.resume_analysis.role_alignment_score },
                                        { label: 'Technical Clarity', value: intelligence.resume_analysis.technical_clarity_score },
                                    ].map((item) => (
                                        <div key={item.label} className="p-3 bg-slate-800/30 rounded-xl">
                                            <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                                            <p className="text-xl font-bold text-white">{((item.value || 0) * 100).toFixed(0)}%</p>
                                        </div>
                                    ))}
                                    {/* Optional: Achievement Oriented */}
                                    {intelligence.resume_analysis.achievement_orientation_score !== undefined && (
                                        <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                                            <p className="text-xs text-purple-400 mb-1">
                                                Achievement Oriented <span className="text-slate-500">(Optional)</span>
                                            </p>
                                            <p className="text-xl font-bold text-white">{((intelligence.resume_analysis.achievement_orientation_score || 0) * 100).toFixed(0)}%</p>
                                        </div>
                                    )}
                                </div>
                                {intelligence.resume_analysis.keyword_stuffing_flag && (
                                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
                                        <AlertTriangle size={16} />
                                        Warning: Potential keyword stuffing detected
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {/* Risk Flags */}
                    {intelligence.risk_flags && intelligence.risk_flags.length > 0 && (
                        <Card className="border-l-4 border-l-red-500">
                            <div className="flex items-center gap-2 mb-4">
                                <AlertTriangle size={20} className="text-red-400" />
                                <h3 className="text-lg font-semibold text-red-400">Risk Flags</h3>
                            </div>
                            <div className="space-y-2">
                                {intelligence.risk_flags.map((flag, index) => (
                                    <div key={index} className="p-3 bg-red-500/10 rounded-xl">
                                        <p className="font-medium text-white capitalize">{flag.type.replace(/_/g, ' ')}</p>
                                        <p className="text-sm text-slate-400">{flag.message}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Skill Gaps */}
                    {intelligence.skill_gaps && intelligence.skill_gaps.length > 0 && (
                        <Card title="Skill Gaps">
                            <div className="flex flex-wrap gap-2">
                                {intelligence.skill_gaps.map((gap, index) => (
                                    <Badge key={index} variant="warning">{gap}</Badge>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Recommendations */}
                    {intelligence.recommendations && intelligence.recommendations.length > 0 && (
                        <Card icon={<CheckCircle size={20} className="text-emerald-400" />} title="Recommendations">
                            <ul className="space-y-2">
                                {intelligence.recommendations.map((rec, index) => (
                                    <li key={index} className="flex items-start gap-2 text-slate-300">
                                        <CheckCircle size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                                        {rec}
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                </div>
            ) : intelligence ? (
                <Card className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 bg-amber-500/10 rounded-2xl flex items-center justify-center">
                        <AlertTriangle size={32} className="text-amber-400" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No Analysis Data Available</h3>
                    <p className="text-slate-400 mb-6">Intelligence data is not available for this intern yet.</p>

                    {/* Job Role Selector */}
                    <div className="max-w-xs mx-auto mb-4">
                        <label className="block text-sm text-slate-300 mb-2">Select Target Role</label>
                        <select
                            value={selectedJobRole}
                            onChange={(e) => setSelectedJobRole(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            <option value="">Choose a role...</option>
                            {jobRoles.map((role) => (
                                <option key={role.id} value={role.role_title}>
                                    {role.role_title.replace(/_/g, ' ')}
                                </option>
                            ))}
                        </select>
                    </div>

                    <Button
                        onClick={() => selectedInternId && computeIntelligence(selectedInternId as number)}
                        disabled={computing || !selectedJobRole}
                        gradient="purple"
                        icon={<RefreshCw size={16} className={computing ? 'animate-spin' : ''} />}
                    >
                        {computing ? 'Computing...' : 'Compute Intelligence'}
                    </Button>
                </Card>
            ) : (
                <Card className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 bg-slate-800/50 rounded-2xl flex items-center justify-center">
                        <User size={32} className="text-slate-500" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Select an Intern</h3>
                    <p className="text-slate-400">Choose an intern from the dropdown above to view their analysis</p>
                </Card>
            )}
        </div>
    );
};

export default AnalysisPage;
