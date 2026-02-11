import React, { useState, useEffect, useMemo } from 'react';
import { Search, User, TrendingUp, Brain, Award, AlertTriangle, CheckCircle, ChevronDown, RefreshCw, FileText, Target, Shield, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

interface Intern {
    id: number;
    full_name: string;
    email: string;
    department: string;
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
    // Phase 2 - Part 1: Resume Analysis Fields
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
        practical_exposure_score?: number;
        problem_solving_depth_score?: number;
        project_complexity_score?: number;
        production_tools_usage_score?: number;
        internship_relevance_score?: number;
        resume_authenticity_score?: number;
        clarity_structure_score?: number;
        keyword_stuffing_flag?: boolean;
        role_alignment_score?: number;
        achievement_orientation_score?: number;
        technical_clarity_score?: number;
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

    // Fetch interns based on role
    useEffect(() => {
        const fetchInterns = async () => {
            // Only fetch interns for admins and managers
            if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
                return;
            }
            try {
                // For now, fetch all interns - backend will filter by department for managers
                const response = await api.get('/accounts/users/?role=INTERN');
                setInterns(response.data.results || response.data);
            } catch (err) {
                console.error('Error fetching interns:', err);
            }
        };
        fetchInterns();
    }, [user]);

    // Fetch intelligence data when intern is selected
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
            setIntelligence(response.data);
        } catch (err: any) {
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
            const response = await api.post(`/analytics/intelligence/compute/${internId}/`);
            setSuccessMessage('Intelligence computed successfully!');
            // Fetch the updated intelligence data
            await fetchIntelligence(internId);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to compute intelligence');
        } finally {
            setComputing(false);
        }
    };

    // Filter interns based on search
    const filteredInterns = useMemo(() => {
        return interns.filter(intern =>
            intern.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            intern.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            intern.department?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [interns, searchTerm]);

    // Get selected intern details
    const selectedIntern = interns.find(i => i.id === selectedInternId);

    // Score color helper
    const getScoreColor = (score: number) => {
        if (score >= 0.7) return '#10b981'; // Green
        if (score >= 0.5) return '#f59e0b'; // Orange
        return '#ef4444'; // Red
    };

    const getScoreLabel = (score: number) => {
        if (score >= 0.7) return 'High';
        if (score >= 0.5) return 'Medium';
        return 'Low';
    };

    // Phase 2 - Part 1: Helper functions for resume analysis
    const getSuitabilityColor = (score: number) => {
        if (score >= 80) return '#10b981'; // Green
        if (score >= 60) return '#f59e0b'; // Orange
        return '#ef4444'; // Red
    };

    const getDecisionBackground = (decision?: string) => {
        switch (decision) {
            case 'INTERVIEW_SHORTLIST':
                return 'rgba(16, 185, 129, 0.1)';
            case 'MANUAL_REVIEW':
                return 'rgba(245, 158, 11, 0.1)';
            case 'REJECT':
                return 'rgba(239, 68, 68, 0.1)';
            case 'NEEDS_IMPROVEMENT':
                return 'rgba(139, 92, 246, 0.1)';
            default:
                return 'var(--bg)';
        }
    };

    const getDecisionBorderColor = (decision?: string) => {
        switch (decision) {
            case 'INTERVIEW_SHORTLIST':
                return '#10b981';
            case 'MANUAL_REVIEW':
                return '#f59e0b';
            case 'REJECT':
                return '#ef4444';
            case 'NEEDS_IMPROVEMENT':
                return '#8b5cf6';
            default:
                return 'var(--border-color)';
        }
    };

    const getDecisionIcon = (decision?: string) => {
        switch (decision) {
            case 'INTERVIEW_SHORTLIST':
                return <CheckCircle size={24} color="#10b981" />;
            case 'MANUAL_REVIEW':
                return <AlertTriangle size={24} color="#f59e0b" />;
            case 'REJECT':
                return <AlertTriangle size={24} color="#ef4444" />;
            case 'NEEDS_IMPROVEMENT':
                return <Zap size={24} color="#8b5cf6" />;
            default:
                return null;
        }
    };

    const getDecisionLabel = (decision?: string) => {
        switch (decision) {
            case 'INTERVIEW_SHORTLIST':
                return 'Interview Shortlist';
            case 'MANUAL_REVIEW':
                return 'Manual Review';
            case 'REJECT':
                return 'Not Suitable';
            case 'NEEDS_IMPROVEMENT':
                return 'Needs Improvement';
            default:
                return 'Pending';
        }
    };

    const getDecisionDescription = (decision?: string) => {
        switch (decision) {
            case 'INTERVIEW_SHORTLIST':
                return 'Candidate meets requirements for interview';
            case 'MANUAL_REVIEW':
                return 'Consider after manual review';
            case 'REJECT':
                return 'Does not meet minimum requirements';
            case 'NEEDS_IMPROVEMENT':
                return 'Needs skill improvement before consideration';
            default:
                return 'Analysis pending';
        }
    };

    // Don't show page for interns
    if (user?.role === 'INTERN') {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                <AlertTriangle size={48} style={{ marginBottom: '1rem' }} />
                <h2>Access Denied</h2>
                <p>You don't have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ marginBottom: '0.5rem' }}>Intern Analysis</h1>
                <p style={{ color: 'var(--text-dim)' }}>
                    {user?.role === 'ADMIN'
                        ? 'View analytics for all interns across the organization'
                        : `View analytics for interns in your department (${user?.department})`}
                </p>
            </div>

            {/* Intern Selection */}
            <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Select Intern
                </label>
                <div style={{ position: 'relative', maxWidth: '400px' }}>
                    <div
                        onClick={() => setShowDropdown(!showDropdown)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            color: selectedIntern ? 'white' : 'var(--text-dim)'
                        }}
                    >
                        <User size={20} />
                        <span style={{ flex: 1 }}>
                            {selectedIntern
                                ? `${selectedIntern.full_name} (${selectedIntern.department})`
                                : 'Search or select an intern...'}
                        </span>
                        <ChevronDown size={20} style={{ transform: showDropdown ? 'rotate(180deg)' : 'none' }} />
                    </div>

                    {/* Search Input */}
                    {showDropdown && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: '0.5rem',
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '0.5rem',
                            zIndex: 100,
                            overflow: 'hidden'
                        }}>
                            <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Search size={18} style={{ color: 'var(--text-dim)' }} />
                                    <input
                                        type="text"
                                        placeholder="Search by name, email, or department..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{
                                            flex: 1,
                                            background: 'transparent',
                                            border: 'none',
                                            outline: 'none',
                                            color: 'white'
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                                {filteredInterns.length === 0 ? (
                                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                                        No interns found
                                    </div>
                                ) : (
                                    filteredInterns.map(intern => (
                                        <div
                                            key={intern.id}
                                            onClick={() => {
                                                setSelectedInternId(intern.id);
                                                setShowDropdown(false);
                                                setSearchTerm('');
                                            }}
                                            style={{
                                                padding: '0.75rem 1rem',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid var(--border-color)',
                                                background: selectedInternId === intern.id ? 'var(--primary-color)' : 'transparent'
                                            }}
                                        >
                                            <div style={{ fontWeight: 500 }}>{intern.full_name}</div>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>
                                                {intern.email} • {intern.department}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    padding: '1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                    color: '#ef4444'
                }}>
                    {error}
                </div>
            )}

            {/* Success Message */}
            {successMessage && (
                <div style={{
                    padding: '1rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid #10b981',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                    color: '#10b981'
                }}>
                    {successMessage}
                </div>
            )}

            {/* Analysis Content */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                    <div style={{ animation: 'pulse 1.5s infinite' }}>Loading analysis...</div>
                </div>
            ) : intelligence && intelligence.scores ? (
                <>
                    {/* Selected Intern Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        padding: '1.5rem',
                        background: 'var(--card-bg)',
                        borderRadius: '0.75rem',
                        marginBottom: '2rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                background: 'var(--primary-color)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem',
                                fontWeight: 'bold'
                            }}>
                                {selectedIntern?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <div>
                                <h2 style={{ margin: 0 }}>{selectedIntern?.full_name}</h2>
                                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-dim)' }}>
                                    {selectedIntern?.email} • {selectedIntern?.department}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => selectedInternId && computeIntelligence(selectedInternId as number)}
                            disabled={computing}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.75rem 1.5rem',
                                background: computing ? 'var(--border-color)' : 'var(--primary-color)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: computing ? 'not-allowed' : 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 500
                            }}
                        >
                            <RefreshCw size={16} style={{ animation: computing ? 'spin 1s linear infinite' : 'none' }} />
                            {computing ? 'Computing...' : 'Recompute Intelligence'}
                        </button>
                    </div>

                    {/* Score Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        marginBottom: '2rem'
                    }}>
                        {/* Technical Score */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <TrendingUp size={20} color="var(--primary-color)" />
                                <h3 style={{ margin: 0, fontSize: '1rem' }}>Technical</h3>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: getScoreColor(intelligence.scores.technical) }}>
                                    {(intelligence.scores.technical * 100).toFixed(0)}%
                                </span>
                                <span style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                                    {getScoreLabel(intelligence.scores.technical)}
                                </span>
                            </div>
                            <div style={{ marginTop: '0.5rem' }}>
                                <div style={{
                                    height: '6px',
                                    background: 'var(--bg)',
                                    borderRadius: '3px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${intelligence.scores.technical * 100}%`,
                                        height: '100%',
                                        background: getScoreColor(intelligence.scores.technical),
                                        transition: 'width 0.3s'
                                    }} />
                                </div>
                            </div>
                        </div>

                        {/* AI Readiness Score */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <Brain size={20} color="#8b5cf6" />
                                <h3 style={{ margin: 0, fontSize: '1rem' }}>AI Readiness</h3>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: getScoreColor(intelligence.scores.ai_readiness) }}>
                                    {(intelligence.scores.ai_readiness * 100).toFixed(0)}%
                                </span>
                                <span style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                                    {getScoreLabel(intelligence.scores.ai_readiness)}
                                </span>
                            </div>
                            <div style={{ marginTop: '0.5rem' }}>
                                <div style={{
                                    height: '6px',
                                    background: 'var(--bg)',
                                    borderRadius: '3px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${intelligence.scores.ai_readiness * 100}%`,
                                        height: '100%',
                                        background: '#8b5cf6',
                                        transition: 'width 0.3s'
                                    }} />
                                </div>
                            </div>
                        </div>

                        {/* Growth Score */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <Award size={20} color="#f59e0b" />
                                <h3 style={{ margin: 0, fontSize: '1rem' }}>Growth Potential</h3>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: getScoreColor(intelligence.scores.predicted_growth) }}>
                                    {(intelligence.scores.predicted_growth * 100).toFixed(0)}%
                                </span>
                                <span style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                                    {getScoreLabel(intelligence.scores.predicted_growth)}
                                </span>
                            </div>
                            <div style={{ marginTop: '0.5rem' }}>
                                <div style={{
                                    height: '6px',
                                    background: 'var(--bg)',
                                    borderRadius: '3px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${intelligence.scores.predicted_growth * 100}%`,
                                        height: '100%',
                                        background: '#f59e0b',
                                        transition: 'width 0.3s'
                                    }} />
                                </div>
                            </div>
                        </div>

                        {/* Leadership Score */}
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <User size={20} color="#06b6d4" />
                                <h3 style={{ margin: 0, fontSize: '1rem' }}>Leadership</h3>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: getScoreColor(intelligence.scores.leadership) }}>
                                    {(intelligence.scores.leadership * 100).toFixed(0)}%
                                </span>
                                <span style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                                    {getScoreLabel(intelligence.scores.leadership)}
                                </span>
                            </div>
                            <div style={{ marginTop: '0.5rem' }}>
                                <div style={{
                                    height: '6px',
                                    background: 'var(--bg)',
                                    borderRadius: '3px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${intelligence.scores.leadership * 100}%`,
                                        height: '100%',
                                        background: '#06b6d4',
                                        transition: 'width 0.3s'
                                    }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Scores Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1rem',
                        marginBottom: '2rem'
                    }}>
                        {/* Communication */}
                        <div className="card" style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Communication</span>
                                <span style={{ fontWeight: 'bold', color: getScoreColor(intelligence.scores.communication) }}>
                                    {(intelligence.scores.communication * 100).toFixed(0)}%
                                </span>
                            </div>
                            <div style={{ marginTop: '0.5rem' }}>
                                <div style={{ height: '4px', background: 'var(--bg)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${intelligence.scores.communication * 100}%`,
                                        height: '100%',
                                        background: getScoreColor(intelligence.scores.communication)
                                    }} />
                                </div>
                            </div>
                        </div>

                        {/* Culture Fit */}
                        <div className="card" style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Culture Fit</span>
                                <span style={{ fontWeight: 'bold', color: getScoreColor(intelligence.scores.culture_fit) }}>
                                    {(intelligence.scores.culture_fit * 100).toFixed(0)}%
                                </span>
                            </div>
                            <div style={{ marginTop: '0.5rem' }}>
                                <div style={{ height: '4px', background: 'var(--bg)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${intelligence.scores.culture_fit * 100}%`,
                                        height: '100%',
                                        background: getScoreColor(intelligence.scores.culture_fit)
                                    }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Phase 2 - Part 1: Resume Analysis Section */}
                    {intelligence.resume_analysis && (
                        <>
                            {/* Suitability Score & Decision */}
                            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--primary-color)' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <FileText size={20} color="var(--primary-color)" />
                                    Resume Suitability Analysis
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                    {/* Suitability Score */}
                                    <div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
                                            Suitability Score
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '3rem', fontWeight: 'bold', color: getSuitabilityColor(intelligence.resume_analysis.suitability_score || 0) }}>
                                                {intelligence.resume_analysis.suitability_score?.toFixed(0) || 0}
                                            </span>
                                            <span style={{ fontSize: '1.5rem', color: 'var(--text-dim)' }}>/100</span>
                                        </div>
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <div style={{
                                                height: '8px',
                                                background: 'var(--bg)',
                                                borderRadius: '4px',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    width: `${intelligence.resume_analysis.suitability_score || 0}%`,
                                                    height: '100%',
                                                    background: getSuitabilityColor(intelligence.resume_analysis.suitability_score || 0),
                                                    transition: 'width 0.3s'
                                                }} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Decision */}
                                    <div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
                                            Suitability Decision
                                        </div>
                                        <div style={{
                                            padding: '1rem',
                                            background: getDecisionBackground(intelligence.resume_analysis.decision),
                                            border: `1px solid ${getDecisionBorderColor(intelligence.resume_analysis.decision)}`,
                                            borderRadius: '0.5rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem'
                                        }}>
                                            {getDecisionIcon(intelligence.resume_analysis.decision)}
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>
                                                    {getDecisionLabel(intelligence.resume_analysis.decision)}
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>
                                                    {getDecisionDescription(intelligence.resume_analysis.decision)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Decision Flags */}
                                {intelligence.resume_analysis.decision_flags && intelligence.resume_analysis.decision_flags.length > 0 && (
                                    <div style={{ marginTop: '1.5rem' }}>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
                                            Decision Flags
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {intelligence.resume_analysis.decision_flags.map((flag, index) => (
                                                <span
                                                    key={index}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        background: 'var(--bg)',
                                                        borderRadius: '2rem',
                                                        fontSize: '0.875rem',
                                                        border: '1px solid var(--border-color)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem'
                                                    }}
                                                >
                                                    <Target size={14} />
                                                    {flag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Skill-to-Role Matching */}
                            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <Target size={20} color="#8b5cf6" />
                                    Skill-to-Role Matching
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '0.5rem' }}>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                                            Skill Match %
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                            {intelligence.resume_analysis.skill_match_percentage?.toFixed(0) || 0}%
                                        </div>
                                    </div>
                                    <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '0.5rem' }}>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                                            Core Skill Match
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                            {((intelligence.resume_analysis.core_skill_match_score || 0) * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                    <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '0.5rem' }}>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                                            Critical Skill Gaps
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: intelligence.resume_analysis.critical_skill_gap_count && intelligence.resume_analysis.critical_skill_gap_count > 0 ? '#ef4444' : '#10b981' }}>
                                            {intelligence.resume_analysis.critical_skill_gap_count || 0}
                                        </div>
                                    </div>
                                    <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '0.5rem' }}>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                                            Domain Relevance
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                            {((intelligence.resume_analysis.domain_relevance_score || 0) * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Project & Experience Depth */}
                            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <Zap size={20} color="#f59e0b" />
                                    Project & Experience Depth
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '0.5rem' }}>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                                            Practical Exposure
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                            {((intelligence.resume_analysis.practical_exposure_score || 0) * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                    <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '0.5rem' }}>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                                            Problem Solving
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                            {((intelligence.resume_analysis.problem_solving_depth_score || 0) * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                    <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '0.5rem' }}>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                                            Project Complexity
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                            {((intelligence.resume_analysis.project_complexity_score || 0) * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                    <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '0.5rem' }}>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                                            Production Tools
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                            {((intelligence.resume_analysis.production_tools_usage_score || 0) * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Resume Quality Indicators */}
                            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <Shield size={20} color="#10b981" />
                                    Resume Quality Indicators
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '0.5rem' }}>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                                            Authenticity
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                            {((intelligence.resume_analysis.resume_authenticity_score || 0) * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                    <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '0.5rem' }}>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                                            Clarity & Structure
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                            {((intelligence.resume_analysis.clarity_structure_score || 0) * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                    <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '0.5rem' }}>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                                            Role Alignment
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                            {((intelligence.resume_analysis.role_alignment_score || 0) * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                    <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '0.5rem' }}>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                                            Achievement Oriented
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                            {((intelligence.resume_analysis.achievement_orientation_score || 0) * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                </div>

                                {/* Keyword Stuffing Warning */}
                                {intelligence.resume_analysis.keyword_stuffing_flag && (
                                    <div style={{
                                        marginTop: '1rem',
                                        padding: '0.75rem',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid #ef4444',
                                        borderRadius: '0.5rem',
                                        color: '#ef4444',
                                        fontSize: '0.875rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <AlertTriangle size={16} />
                                        Warning: Potential keyword stuffing detected in resume
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Risk Flags */}
                    {intelligence.risk_flags && intelligence.risk_flags.length > 0 && (
                        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid #ef4444' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#ef4444' }}>
                                <AlertTriangle size={20} />
                                Risk Flags
                            </h3>
                            {intelligence.risk_flags.map((flag, index) => (
                                <div key={index} style={{
                                    padding: '0.75rem',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: '0.5rem',
                                    marginBottom: '0.5rem'
                                }}>
                                    <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                                        {flag.type.replace(/_/g, ' ')}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>
                                        {flag.message}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Skill Gaps */}
                    {intelligence.skill_gaps && intelligence.skill_gaps.length > 0 && (
                        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                            <h3 style={{ marginBottom: '1rem' }}>Skill Gaps</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {intelligence.skill_gaps.map((gap, index) => (
                                    <span
                                        key={index}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            background: 'var(--bg)',
                                            borderRadius: '2rem',
                                            fontSize: '0.875rem',
                                            border: '1px solid var(--border-color)'
                                        }}
                                    >
                                        {gap}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recommendations */}
                    {intelligence.recommendations && intelligence.recommendations.length > 0 && (
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <CheckCircle size={20} color="#10b981" />
                                Recommendations
                            </h3>
                            <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                                {intelligence.recommendations.map((rec, index) => (
                                    <li key={index} style={{ marginBottom: '0.5rem', color: 'var(--text-dim)' }}>
                                        {rec}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            ) : intelligence ? (
                <div style={{
                    textAlign: 'center',
                    padding: '4rem',
                    color: 'var(--text-dim)',
                    background: 'var(--card-bg)',
                    borderRadius: '0.75rem'
                }}>
                    <AlertTriangle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <h3>No Analysis Data Available</h3>
                    <p>Intelligence data is not available for this intern yet.</p>
                    <button
                        onClick={() => selectedInternId && computeIntelligence(selectedInternId as number)}
                        disabled={computing}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            margin: '1.5rem auto 0',
                            padding: '0.75rem 1.5rem',
                            background: computing ? 'var(--border-color)' : 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: computing ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: 500
                        }}
                    >
                        <RefreshCw size={16} style={{ animation: computing ? 'spin 1s linear infinite' : 'none' }} />
                        {computing ? 'Computing...' : 'Compute Intelligence'}
                    </button>
                </div>
            ) : (
                <div style={{
                    textAlign: 'center',
                    padding: '4rem',
                    color: 'var(--text-dim)',
                    background: 'var(--card-bg)',
                    borderRadius: '0.75rem'
                }}>
                    <User size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <h3>Select an Intern</h3>
                    <p>Choose an intern from the dropdown above to view their analysis</p>
                </div>
            )}
        </div>
    );
};

export default AnalysisPage;
