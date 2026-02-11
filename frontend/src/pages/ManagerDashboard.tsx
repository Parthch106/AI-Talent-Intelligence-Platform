import React, { useState, useEffect } from 'react';
import { Users, ClipboardList, MessageSquare, Plus, X, Star } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

interface Intern {
    id: number;
    user: {
        id: number;
        full_name: string;
        email: string;
    };
    university: string;
    status: string;
}

interface Assessment {
    id: number;
    title: string;
    assessment_type: string;
    created_at: string;
}

interface Feedback {
    id: number;
    recipient: {
        id: number;
        full_name: string;
    };
    feedback_type: string;
    rating: number;
    comments: string;
    created_at: string;
}

interface NewAssessment {
    title: string;
    assessment_type: string;
    description: string;
}

interface NewFeedback {
    recipient_id: number;
    feedback_type: string;
    rating: number;
    comments: string;
    strengths: string;
    areas_for_improvement: string;
}

const ManagerDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'interns' | 'assessments' | 'feedback'>('interns');
    const [interns, setInterns] = useState<Intern[]>([]);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showAssessmentModal, setShowAssessmentModal] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form states
    const [newAssessment, setNewAssessment] = useState<NewAssessment>({
        title: '',
        assessment_type: 'TECHNICAL',
        description: '',
    });

    const [newFeedback, setNewFeedback] = useState<NewFeedback>({
        recipient_id: 0,
        feedback_type: 'WEEKLY',
        rating: 5,
        comments: '',
        strengths: '',
        areas_for_improvement: '',
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [internsRes, assessmentsRes, feedbackRes] = await Promise.all([
                api.get('/interns/profiles/'),
                api.get('/assessments/'),
                api.get('/feedback/'),
            ]);
            setInterns(internsRes.data);
            setAssessments(assessmentsRes.data);
            setFeedback(feedbackRes.data);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateAssessment = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/assessments/', newAssessment);
            setShowAssessmentModal(false);
            setNewAssessment({ title: '', assessment_type: 'TECHNICAL', description: '' });
            fetchData();
        } catch (error) {
            console.error('Failed to create assessment', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/feedback/', {
                ...newFeedback,
                project: null,
            });
            setShowFeedbackModal(false);
            setNewFeedback({
                recipient_id: 0,
                feedback_type: 'WEEKLY',
                rating: 5,
                comments: '',
                strengths: '',
                areas_for_improvement: '',
            });
            fetchData();
        } catch (error) {
            console.error('Failed to create feedback', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem' }}>Manager Dashboard</h2>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <button
                    onClick={() => setActiveTab('interns')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0.75rem 1.5rem',
                        border: 'none',
                        borderRadius: '0.5rem',
                        background: activeTab === 'interns' ? 'var(--primary-color)' : 'var(--card-bg)',
                        color: activeTab === 'interns' ? 'white' : 'var(--text)',
                        cursor: 'pointer',
                    }}
                >
                    <Users size={18} /> Interns
                </button>
                <button
                    onClick={() => setActiveTab('assessments')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0.75rem 1.5rem',
                        border: 'none',
                        borderRadius: '0.5rem',
                        background: activeTab === 'assessments' ? 'var(--primary-color)' : 'var(--card-bg)',
                        color: activeTab === 'assessments' ? 'white' : 'var(--text)',
                        cursor: 'pointer',
                    }}
                >
                    <ClipboardList size={18} /> Assessments
                </button>
                <button
                    onClick={() => setActiveTab('feedback')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0.75rem 1.5rem',
                        border: 'none',
                        borderRadius: '0.5rem',
                        background: activeTab === 'feedback' ? 'var(--primary-color)' : 'var(--card-bg)',
                        color: activeTab === 'feedback' ? 'white' : 'var(--text)',
                        cursor: 'pointer',
                    }}
                >
                    <MessageSquare size={18} /> Feedback
                </button>
            </div>

            {/* Interns Tab */}
            {activeTab === 'interns' && (
                <div className="card" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-dim)', fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '1rem' }}>Name</th>
                                <th style={{ padding: '1rem' }}>Email</th>
                                <th style={{ padding: '1rem' }}>University</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                                <th style={{ padding: '1rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {interns.length === 0 ? (
                                <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center' }}>No interns found.</td></tr>
                            ) : (
                                interns.map((intern) => (
                                    <tr key={intern.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem' }}>{intern.user.full_name}</td>
                                        <td style={{ padding: '1rem' }}>{intern.user.email}</td>
                                        <td style={{ padding: '1rem' }}>{intern.university}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '0.25rem',
                                                background: intern.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                                                color: intern.status === 'ACTIVE' ? '#10b981' : '#6366f1',
                                                fontSize: '0.75rem'
                                            }}>
                                                {intern.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <button
                                                onClick={() => {
                                                    setNewFeedback(prev => ({ ...prev, recipient_id: intern.id }));
                                                    setActiveTab('feedback');
                                                }}
                                                style={{ background: 'transparent', color: 'var(--primary-color)', padding: 0, marginRight: '0.5rem' }}
                                            >
                                                Give Feedback
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Assessments Tab */}
            {activeTab === 'assessments' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0 }}>Assessments</h3>
                        <button
                            onClick={() => setShowAssessmentModal(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Plus size={18} /> New Assessment
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        {assessments.length === 0 ? (
                            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                                No assessments found.
                            </div>
                        ) : (
                            assessments.map((assessment) => (
                                <div key={assessment.id} className="card">
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>{assessment.title}</h4>
                                    <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                                        {assessment.assessment_type}
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                            {new Date(assessment.created_at).toLocaleDateString()}
                                        </span>
                                        <button
                                            onClick={() => {
                                                // Could navigate to assessment details
                                            }}
                                            style={{ background: 'transparent', color: 'var(--primary-color)', padding: 0, fontSize: '0.875rem' }}
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Feedback Tab */}
            {activeTab === 'feedback' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0 }}>Feedback Given</h3>
                        <button
                            onClick={() => setShowFeedbackModal(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Plus size={18} /> Give Feedback
                        </button>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {feedback.length === 0 ? (
                            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                                No feedback given yet.
                            </div>
                        ) : (
                            feedback.map((item) => (
                                <div key={item.id} className="card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                        <div>
                                            <h4 style={{ margin: 0 }}>{item.recipient.full_name}</h4>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{item.feedback_type}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Star size={16} fill="#f59e0b" color="#f59e0b" />
                                            <span style={{ fontWeight: 600 }}>{item.rating}/5</span>
                                        </div>
                                    </div>
                                    <p style={{ color: 'var(--text)', marginBottom: '0.5rem' }}>{item.comments}</p>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Create Assessment Modal */}
            {showAssessmentModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ width: '500px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Create Assessment</h3>
                            <button onClick={() => setShowAssessmentModal(false)} style={{ background: 'transparent', padding: '0.5rem' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateAssessment}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={newAssessment.title}
                                    onChange={e => setNewAssessment(prev => ({ ...prev, title: e.target.value }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Type *</label>
                                <select
                                    value={newAssessment.assessment_type}
                                    onChange={e => setNewAssessment(prev => ({ ...prev, assessment_type: e.target.value }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                >
                                    <option value="TECHNICAL">Technical Quiz</option>
                                    <option value="CODING">Coding Challenge</option>
                                    <option value="BEHAVIORAL">Behavioral</option>
                                    <option value="PROJECT">Project Evaluation</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Description</label>
                                <textarea
                                    value={newAssessment.description}
                                    onChange={e => setNewAssessment(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAssessmentModal(false)}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.25rem', border: 'none', background: 'var(--primary-color)', color: 'white', cursor: 'pointer' }}
                                >
                                    {submitting ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Give Feedback Modal */}
            {showFeedbackModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ width: '500px', maxHeight: '90vh', overflow: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Give Feedback</h3>
                            <button onClick={() => setShowFeedbackModal(false)} style={{ background: 'transparent', padding: '0.5rem' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateFeedback}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Intern *</label>
                                <select
                                    required
                                    value={newFeedback.recipient_id || ''}
                                    onChange={e => setNewFeedback(prev => ({ ...prev, recipient_id: parseInt(e.target.value) }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                >
                                    <option value="">Select intern...</option>
                                    {interns.map(intern => (
                                        <option key={intern.id} value={intern.id}>{intern.user.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Feedback Type *</label>
                                <select
                                    value={newFeedback.feedback_type}
                                    onChange={e => setNewFeedback(prev => ({ ...prev, feedback_type: e.target.value }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                >
                                    <option value="WEEKLY">Weekly Check-in</option>
                                    <option value="PROJECT">Project Review</option>
                                    <option value="MID_TERM">Mid-term Evaluation</option>
                                    <option value="FINAL">Final Evaluation</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Rating *</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setNewFeedback(prev => ({ ...prev, rating: star }))}
                                            style={{ background: 'transparent', padding: '0.25rem' }}
                                        >
                                            <Star
                                                size={24}
                                                fill={star <= newFeedback.rating ? '#f59e0b' : 'transparent'}
                                                color="#f59e0b"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Comments *</label>
                                <textarea
                                    required
                                    value={newFeedback.comments}
                                    onChange={e => setNewFeedback(prev => ({ ...prev, comments: e.target.value }))}
                                    rows={3}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Strengths</label>
                                <textarea
                                    value={newFeedback.strengths}
                                    onChange={e => setNewFeedback(prev => ({ ...prev, strengths: e.target.value }))}
                                    rows={2}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Areas for Improvement</label>
                                <textarea
                                    value={newFeedback.areas_for_improvement}
                                    onChange={e => setNewFeedback(prev => ({ ...prev, areas_for_improvement: e.target.value }))}
                                    rows={2}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowFeedbackModal(false)}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.25rem', border: 'none', background: 'var(--primary-color)', color: 'white', cursor: 'pointer' }}
                                >
                                    {submitting ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagerDashboard;
