import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, User, TrendingUp, Brain, Award, AlertTriangle, CheckCircle, ChevronDown, RefreshCw, FileText, Target, Shield, Zap, Mail, Building, Briefcase, Code, GraduationCap, ExternalLink } from 'lucide-react';
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
        // v2.0 new fields
        suitability: number;
        growth: number;
        authenticity: number;
        semantic_match: number;
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
    resume_document?: {
        id: number;
        url: string;
        filename: string;
        uploaded_at: string | null;
    };
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
        // v2.0 new fields
        model_type?: string;
        growth_score?: number;
        authenticity_score?: number;
        semantic_match_score?: number;
        confidence_score?: number;
    };
    structured_resume?: {
        skills: Array<{ name: string; category: string; is_major: boolean }>;
        experience: Array<{
            title: string;
            company: string;
            location: string;
            start_date: string;
            end_date: string;
            duration?: string;       // simple parser field
            is_current: boolean;
            is_internship: boolean;
            description: string;
            technologies: string[];
        }>;
        projects: Array<{
            name: string;
            description: string;
            technologies: string[];
            github_url: string;
            impact: string;
            date?: string;           // simple parser field
        }>;
        education: Array<{
            degree: string;
            field_of_study: string;
            institution: string;
            start_year: string;
            end_year: string;
            year?: string;           // simple parser field
            gpa: string;
            honors: string;
        }>;
        certifications: Array<{
            name: string;
            issuer: string;
            date: string;
        }>;
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

    const fetchIntelligence = useCallback(async (internId: number) => {
        setLoading(true);
        setError('');
        try {
            // Include job_role in query params to get the correct application
            const params = new URLSearchParams();
            params.append('intern_id', internId.toString());
            if (selectedJobRole) {
                params.append('job_role', selectedJobRole);
            }
            const response = await api.get(`/analytics/intelligence/?${params.toString()}`);
            setIntelligence(response.data);
        } catch (err: unknown) {
            console.error('Intelligence API Error:', err);
            const apiError = err as { response?: { data?: { detail?: string } } };
            setError(apiError.response?.data?.detail || 'Failed to fetch intelligence data');
            setIntelligence(null);
        } finally {
            setLoading(false);
        }
    }, [selectedJobRole]);

    useEffect(() => {
        if (selectedInternId) {
            fetchIntelligence(selectedInternId);
        } else {
            setIntelligence(null);
        }
    }, [selectedInternId, selectedJobRole, fetchIntelligence]);

    const computeIntelligence = async (internId: number) => {
        setComputing(true);
        setError('');
        setSuccessMessage('');
        try {
            // First, trigger the computation
            const response = await api.post(`/analytics/intelligence/compute/${internId}/`, {
                job_role: selectedJobRole
            });
            
            // Immediately update with data from POST to show results on cards faster
            if (response.data) {
                // If the response follows the expected format or partially matches
                setIntelligence(prev => ({
                    ...prev,
                    ...response.data,
                    // Ensure scores are prioritized from the response
                    scores: response.data.scores || prev?.scores
                }));
            }
            
            setSuccessMessage('Intelligence computed successfully!');
            
            // Then fetch complete fresh data from GET endpoint (bypass cache with timestamp)
            try {
                const fetchResponse = await api.get(`/analytics/intelligence/?intern_id=${internId}&job_role=${selectedJobRole}&_t=${Date.now()}`);
                setIntelligence(fetchResponse.data);
            } catch {
                console.warn('Failed to fetch complete fresh data, using compute response as fallback');
            }
        } catch (err: unknown) {
            console.error('Compute Intelligence Error:', err);
            const apiError = err as { response?: { data?: { error?: string; detail?: string } } };
            setError(apiError.response?.data?.error || apiError.response?.data?.detail || 'Failed to compute intelligence');
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
        if (score >= 0.7) return 'text-emerald-600 dark:text-emerald-400';
        if (score >= 0.5) return 'text-amber-600 dark:text-amber-400';
        return 'text-red-600 dark:text-red-400';
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
        if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
        if (score >= 60) return 'text-amber-600 dark:text-amber-400';
        return 'text-red-600 dark:text-red-400';
    };

    const getDecisionBadge = (decision?: string) => {
        switch (decision) {
            case 'INTERVIEW_SHORTLIST': return <Badge variant="success" withDot>Interview Shortlist</Badge>;
            case 'TECHNICAL_ASSIGNMENT': return <Badge variant="purple" withDot>Technical Assignment</Badge>;
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
                    <h2 className="text-xl font-bold text-[var(--text-main)] mb-2">Access Denied</h2>
                    <p className="text-[var(--text-dim)]">You don't have permission to view this page.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2">
                        Intern <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Analysis</span>
                    </h1>
                    <p className="text-[var(--text-dim)]">
                        {user?.role === 'ADMIN'
                            ? 'View analytics for all interns across the organization'
                            : `View analytics for interns in your department (${user?.department})`}
                    </p>
                </div>
                {/* Model Version Badge - v2.0 */}
                {intelligence && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 rounded-full">
                        <Brain size={14} className="text-violet-400" />
                        <span className="text-sm font-medium text-violet-300">Transformer XGB v2</span>
                    </div>
                )}
            </div>

            {/* Intern Selection */}
            <div className="relative max-w-md">
                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Select Intern</label>
                <div className="relative">
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-left hover:border-purple-500/50 transition-all"
                    >
                        <User size={20} className="text-purple-500" />
                        <span className={`flex-1 ${selectedIntern ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                            {selectedIntern
                                ? `${selectedIntern.full_name} (${selectedIntern.department})`
                                : 'Search or select an intern...'}
                        </span>
                        <ChevronDown size={20} className={`text-[var(--text-dim)] transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-color)] backdrop-blur-xl border border-[var(--border-color)] rounded-xl shadow-2xl shadow-purple-500/10 z-50 overflow-hidden animate-scale-in">
                            <div className="p-3 border-b border-[var(--border-color)]">
                                <div className="flex items-center gap-2">
                                    <Search size={18} className="text-[var(--text-muted)]" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, email, or department..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="flex-1 bg-transparent border-none outline-none text-[var(--text-main)] placeholder-[var(--text-muted)]"
                                    />
                                </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {filteredInterns.length === 0 ? (
                                    <div className="p-4 text-center text-[var(--text-dim)]">No interns found</div>
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
                                            <div className="font-medium text-[var(--text-main)]">{intern.full_name}</div>
                                            <div className="text-sm text-[var(--text-dim)]">{intern.email} • {intern.department}</div>
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
                                <h2 className="text-xl font-bold text-[var(--text-main)]">{selectedIntern?.full_name}</h2>
                                <div className="flex items-center gap-4 text-sm text-[var(--text-dim)] mt-1">
                                    <span className="flex items-center gap-1"><Mail size={14} className="text-purple-500" />{selectedIntern?.email}</span>
                                    <span className="flex items-center gap-1"><Building size={14} className="text-purple-500" />{selectedIntern?.department}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Job Role Selector */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-[var(--text-dim)]">Target Role</label>
                                <select
                                    value={selectedJobRole}
                                    onChange={(e) => setSelectedJobRole(e.target.value)}
                                    className="bg-[var(--bg-muted)] border border-[var(--border-color)] text-[var(--text-main)] text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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

                    {/* Resume Preview */}
                    {intelligence.resume_document && (
                        <Card className="border-l-4 border-l-blue-500">
                            <div className="flex items-center gap-2 mb-4">
                                <FileText size={20} className="text-blue-500" />
                                <h3 className="text-lg font-semibold text-[var(--text-main)]">Resume Document</h3>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-[var(--bg-muted)] rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-blue-500/15 rounded-lg flex items-center justify-center">
                                        <FileText size={24} className="text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-[var(--text-main)]">{intelligence.resume_document!.filename || 'Resume'}</p>
                                        <p className="text-sm text-[var(--text-dim)]">Document ID: {intelligence.resume_document!.id}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        try {
                                            const response = await api.get(`/documents/files/${intelligence.resume_document!.id}/download/`);
                                            // Open the authenticated URL
                                            window.open(response.data.url, '_blank');
                                        } catch (err: unknown) {
                                            console.error('Error fetching resume URL:', err);
                                        }
                                    }}
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    View Resume
                                </button>
                            </div>
                        </Card>
                    )}

                    {/* Score Cards - v2.0 with Transformer Embeddings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Suitability', score: intelligence.scores.suitability || intelligence.resume_analysis?.suitability_score || 0, icon: Target, color: 'from-emerald-500 to-teal-500' },
                            { label: 'Semantic Match', score: intelligence.scores.semantic_match || intelligence.resume_analysis?.semantic_match_score || 0, icon: Brain, color: 'from-violet-500 to-purple-500' },
                            { label: 'Growth Potential', score: intelligence.scores.growth || intelligence.resume_analysis?.growth_score || intelligence.scores.predicted_growth || 0, icon: Award, color: 'from-amber-500 to-orange-500' },
                            { label: 'Authenticity', score: intelligence.scores.authenticity || intelligence.resume_analysis?.authenticity_score || intelligence.resume_analysis?.resume_authenticity_score || 0, icon: Shield, color: 'from-cyan-500 to-blue-500' },
                        ].map((item) => (
                            <Card key={item.label} hover className="group">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className={`p-2 rounded-lg bg-gradient-to-br ${item.color}`}>
                                        <item.icon size={16} className="text-white" />
                                    </div>
                                    <span className="text-sm text-[var(--text-dim)]">{item.label}</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-3xl font-bold ${getScoreColor(item.score)}`}>
                                        {(item.score * 100).toFixed(0)}%
                                    </span>
                                    <span className="text-sm text-[var(--text-muted)]">{getScoreLabel(item.score)}</span>
                                </div>
                                <div className="mt-3 h-2 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${getScoreBgColor(item.score)} transition-all duration-500`}
                                        style={{ width: `${item.score * 100}%` }}
                                    />
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Additional Scores - v2.0 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { label: 'Confidence Score', score: intelligence.resume_analysis?.confidence_score || 0 },
                            { label: 'Technical', score: intelligence.scores?.technical || 0 },
                        ].map((item) => (
                            <Card key={item.label} className="flex items-center justify-between">
                                <span className="text-[var(--text-dim)]">{item.label}</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-24 h-2 bg-[var(--bg-muted)] rounded-full overflow-hidden">
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
                                            <span className={`text-4xl font-bold ${getSuitabilityColor((intelligence.resume_analysis?.suitability_score || 0) * 100)}`}>
                                                {((intelligence.resume_analysis?.suitability_score || 0) * 100).toFixed(0)}
                                            </span>
                                            <span className="text-xl text-slate-500">/100</span>
                                        </div>
                                        <div className="mt-3 h-3 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${getScoreBgColor((intelligence.resume_analysis?.suitability_score || 0))} transition-all`}
                                            style={{ width: `${(intelligence.resume_analysis?.suitability_score || 0) * 100}%` }}
                                        />
                                    </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-[var(--text-dim)] mb-2">Decision</p>
                                        <div className="flex items-center gap-3">
                                            {getDecisionBadge(intelligence.resume_analysis?.decision)}
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Skill Matching */}
                            <Card icon={<Target size={20} />} title="Skill-to-Role Matching">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Skill Match', value: `${intelligence.resume_analysis?.skill_match_percentage?.toFixed(0) || 0}%` },
                                        { label: 'Core Skills', value: `${((intelligence.resume_analysis?.core_skill_match_score || 0) * 100).toFixed(0)}%` },
                                        { label: 'Critical Gaps', value: intelligence.resume_analysis?.critical_skill_gap_count || 0, highlight: true },
                                        { label: 'Domain Relevance', value: `${((intelligence.resume_analysis?.domain_relevance_score || 0) * 100).toFixed(0)}%` },
                                    ].map((item) => (
                                        <div key={item.label} className="p-3 bg-[var(--bg-muted)] rounded-xl">
                                            <p className="text-xs text-[var(--text-dim)] mb-1">{item.label}</p>
                                            <p className={`text-xl font-bold ${item.highlight ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-main)]'}`}>{item.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Production Tools (Optional - doesn't affect suitability) */}
                            {intelligence.resume_analysis?.production_tools_percentage && intelligence.resume_analysis?.production_tools_percentage?.percentage !== undefined && (
                                <Card icon={<Zap size={20} />} title="Production Tools Usage">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-3 bg-[var(--bg-muted)] rounded-xl">
                                            <p className="text-xs text-[var(--text-dim)] mb-1">Overall Score</p>
                                            <p className="text-xl font-bold text-[var(--text-main)]">
                                                {intelligence.resume_analysis?.production_tools_percentage?.percentage?.toFixed(0) || 0}%
                                            </p>
                                        </div>
                                        <div className="p-3 bg-[var(--bg-muted)] col-span-2">
                                            <p className="text-xs text-[var(--text-dim)] mb-1">Tools Found</p>
                                            <p className="text-sm font-medium text-[var(--text-main)]">
                                                {(intelligence.resume_analysis?.production_tools_percentage?.tools_found?.length ?? 0) > 0
                                                    ? (intelligence.resume_analysis?.production_tools_percentage?.tools_found ?? []).join(', ')
                                                    : 'None'}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Tool Categories Breakdown */}
                                    {intelligence.resume_analysis?.production_tools_percentage?.tool_categories && (
                                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {Object.entries(intelligence.resume_analysis?.production_tools_percentage?.tool_categories || {}).map(([category, tools]) => (
                                                tools.length > 0 && (
                                                    <div key={category} className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                                        <p className="text-xs text-purple-600 dark:text-purple-400 capitalize">{category.replace('_', ' ')}</p>
                                                        <p className="text-xs text-[var(--text-dim)]">{tools.join(', ')}</p>
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
                                        { label: 'Authenticity', value: intelligence.resume_analysis?.resume_authenticity_score },
                                        { label: 'Role Alignment', value: intelligence.resume_analysis?.role_alignment_score },
                                        { label: 'Technical Clarity', value: intelligence.resume_analysis?.technical_clarity_score },
                                    ].map((item) => (
                                        <div key={item.label} className="p-3 bg-[var(--bg-muted)] rounded-xl">
                                            <p className="text-xs text-[var(--text-dim)] mb-1">{item.label}</p>
                                            <p className="text-xl font-bold text-[var(--text-main)]">{((item.value || 0) * 100).toFixed(0)}%</p>
                                        </div>
                                    ))}
                                    {/* Optional: Achievement Oriented */}
                                    {intelligence.resume_analysis?.achievement_orientation_score !== undefined && (
                                        <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                                            <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">
                                                Achievement Oriented <span className="text-[var(--text-muted)]">(Optional)</span>
                                            </p>
                                            <p className="text-xl font-bold text-[var(--text-main)]">{((intelligence.resume_analysis?.achievement_orientation_score || 0) * 100).toFixed(0)}%</p>
                                        </div>
                                    )}
                                </div>
                                {intelligence.resume_analysis?.keyword_stuffing_flag && (
                                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
                                        <AlertTriangle size={16} />
                                        Warning: Potential keyword stuffing detected
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {/* Domain Strengths */}
                    {intelligence.domain_strengths && intelligence.domain_strengths.length > 0 && (
                        <Card className="border-l-4 border-l-green-500">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp size={20} className="text-green-500" />
                                <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">Domain Strengths</h3>
                            </div>
                            <div className="space-y-2">
                                {intelligence.domain_strengths.map((strength, index) => (
                                    <div key={index} className="p-3 bg-green-500/10 rounded-xl">
                                        <p className="font-medium text-[var(--text-main)]">{strength}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Structured Resume Profile (New Phase 4 UI) */}
                    {intelligence.structured_resume && (
                        <div className="space-y-6 animate-slide-up">
                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-[var(--border-color)]"></div>
                                <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest">Candidate Profile</h3>
                                <div className="h-px flex-1 bg-[var(--border-color)]"></div>
                            </div>

                            {/* Skills Section */}
                            <Card icon={<Code size={20} className="text-blue-400" />} title="Technical Skills">
                                <div className="flex flex-wrap gap-2">
                                    {intelligence.structured_resume.skills.map((skill, index) => (
                                        <div key={index} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${skill.is_major ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
                                            <span className={`text-sm font-medium ${skill.is_major ? 'text-blue-300' : 'text-slate-300'}`}>{skill.name}</span>
                                            {skill.category && <span className="text-[10px] px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">{skill.category}</span>}
                                        </div>
                                    ))}
                                    {intelligence.structured_resume.skills.length === 0 && <p className="text-slate-500">No skills extracted</p>}
                                </div>
                            </Card>

                            {/* Experience Section */}
                            <Card icon={<Briefcase size={20} className="text-emerald-400" />} title="Work Experience">
                                <div className="space-y-6">
                                    {intelligence.structured_resume.experience.map((exp, index) => (
                                        <div key={index} className="relative pl-6 border-l border-slate-700 last:border-0 pb-6 last:pb-0">
                                            <div className="absolute top-0 -left-1.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-lg shadow-emerald-500/20"></div>
                                            <div className="flex flex-col md:flex-row md:justify-between gap-1 mb-2">
                                                <div>
                                                    <h4 className="font-bold text-white">{exp.title}</h4>
                                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                                        <span className="text-emerald-400 font-medium">{exp.company}</span>
                                                        <span>•</span>
                                                        <span>{exp.location}</span>
                                                    </div>
                                                </div>
                                                <div className="text-sm font-medium text-slate-500 bg-slate-800/50 px-2.5 py-1 rounded-md h-fit">
                                                    {exp.start_date && exp.end_date
                                                        ? `${exp.start_date} — ${exp.is_current ? 'Present' : exp.end_date}`
                                                        : exp.duration || 'Date not specified'
                                                    }
                                                </div>
                                            </div>
                                            <p className="text-sm text-[var(--text-dim)] leading-relaxed mb-3 whitespace-pre-wrap">{exp.description}</p>
                                            {exp.technologies && exp.technologies.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {exp.technologies.map((tech, tIdx) => (
                                                        <span key={tIdx} className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] bg-[var(--bg-muted)] px-2 py-0.5 rounded">
                                                            {tech}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {intelligence.structured_resume.experience.length === 0 && <p className="text-slate-500">No experience record found</p>}
                                </div>
                            </Card>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Projects Section */}
                                <Card icon={<Zap size={20} className="text-amber-400" />} title="Key Projects">
                                    <div className="space-y-4">
                                        {intelligence.structured_resume.projects.map((project, index) => (
                                            <div key={index} className="p-4 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-muted)]/80 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-[var(--text-main)]">{project.name}</h4>
                                                    {project.github_url && (
                                                        <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                                                            <ExternalLink size={16} />
                                                        </a>
                                                    )}
                                                </div>
                                                <p className="text-xs text-[var(--text-dim)] mb-2 line-clamp-2">{project.description}</p>
                                                {(project.date || project.impact) && (
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {project.date && <span className="text-[11px] text-[var(--text-muted)] font-medium">{project.date}</span>}
                                                        {project.impact && <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">{project.impact}</span>}
                                                    </div>
                                                )}
                                                <div className="flex flex-wrap gap-1">
                                                    {project.technologies.map((tech, tIdx) => (
                                                        <span key={tIdx} className="text-[9px] bg-[var(--bg-muted)] text-[var(--text-dim)] px-1.5 py-0.5 rounded">
                                                            {tech}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {intelligence.structured_resume.projects.length === 0 && <p className="text-slate-500">No projects found</p>}
                                    </div>
                                </Card>

                                {/* Education Section */}
                                <Card icon={<GraduationCap size={20} className="text-purple-400" />} title="Education & Certs">
                                    <div className="space-y-4">
                                        {/* Education */}
                                        {intelligence.structured_resume.education.map((edu, index) => (
                                            <div key={index} className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-[var(--text-main)] text-sm">{edu.degree} in {edu.field_of_study}</h4>
                                                        <p className="text-xs text-purple-600 dark:text-purple-400">{edu.institution}</p>
                                                    </div>
                                                    <div className="text-xs text-[var(--text-muted)]">
                                                        {edu.start_year && edu.end_year
                                                            ? `${edu.start_year} - ${edu.end_year}`
                                                            : edu.year || ''}
                                                    </div>
                                                </div>
                                                {edu.gpa && <div className="mt-2 text-xs font-medium text-[var(--text-dim)]">GPA: {edu.gpa}</div>}
                                                {edu.honors && <p className="mt-1 text-[10px] text-[var(--text-muted)] uppercase tracking-tight">{edu.honors}</p>}
                                            </div>
                                        ))}
                                        
                                        {/* Certifications */}
                                        {intelligence.structured_resume.certifications.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                                                <h5 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">Certifications</h5>
                                                <div className="space-y-2">
                                                    {intelligence.structured_resume.certifications.map((cert, index) => (
                                                        <div key={index} className="flex justify-between text-xs">
                                                            <span className="text-[var(--text-main)] font-medium">{cert.name}</span>
                                                            <span className="text-[var(--text-muted)]">{cert.issuer} • {cert.date}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {intelligence.structured_resume.education.length === 0 && intelligence.structured_resume.certifications.length === 0 && (
                                            <p className="text-slate-500">No education records found</p>
                                        )}
                                    </div>
                                </Card>
                            </div>
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
                                {intelligence.risk_flags.map((flag: string | { type: string; severity: string; message: string }, index: number) => (
                                    <div key={index} className="p-3 bg-red-500/10 rounded-xl">
                                        <p className="font-medium text-white capitalize">
                                            {typeof flag === 'string' 
                                                ? flag.replace(/_/g, ' ').split(':')[0] 
                                                : (flag.type || '').replace(/_/g, ' ')}
                                        </p>
                                        <p className="text-sm text-slate-400">
                                            {typeof flag === 'string' 
                                                ? (flag.split(':')[1] || '').trim() 
                                                : (flag.message || '')}
                                        </p>
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
            ) : selectedInternId ? (
                <Card className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 bg-amber-500/10 rounded-2xl flex items-center justify-center">
                        <AlertTriangle size={32} className="text-amber-400" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No Analysis Found</h3>
                    <p className="text-slate-400 mb-6">Click the button below to compute intelligence for this intern.</p>

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
