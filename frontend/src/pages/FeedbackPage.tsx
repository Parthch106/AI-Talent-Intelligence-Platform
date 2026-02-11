import React, { useEffect, useState } from 'react';
import { MessageSquare, Plus, X, Star, User } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

interface User {
    id: number;
    full_name: string;
    email: string;
    role: string;
}

interface Feedback {
    id: number;
    reviewer: User;
    recipient: User;
    feedback_type: string;
    rating: number;
    comments: string;
    strengths: string;
    areas_for_improvement: string;
    created_at: string;
}

interface NewFeedback {
    recipient_id: number;
    feedback_type: string;
    rating: number;
    comments: string;
    strengths: string;
    areas_for_improvement: string;
}

const FeedbackPage: React.FC = () => {
    const { user } = useAuth();
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [interns, setInterns] = useState<User[]>([]);
    const [managers, setManagers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'given' | 'received'>('given');

    const [newFeedback, setNewFeedback] = useState<NewFeedback>({
        recipient_id: 0,
        feedback_type: 'WEEKLY',
        rating: 5,
        comments: '',
        strengths: '',
        areas_for_improvement: '',
    });

    const fetchData = async () => {
        try {
            const feedbackRes = await api.get('/feedback/');
            setFeedback(feedbackRes.data);

            // Fetch interns based on role
            if (user?.role === 'MANAGER') {
                // Managers get interns from their department via the profiles endpoint
                const internsRes = await api.get('/interns/profiles/');
                // Extract user objects from intern profiles
                setInterns(internsRes.data.map((p: any) => p.user));
            } else {
                // Admin gets all interns
                const internsRes = await api.get('/interns/profiles/');
                setInterns(internsRes.data.map((p: any) => p.user));
            }

            // For admin, also fetch managers
            if (user?.role === 'ADMIN') {
                const managersRes = await api.get('/accounts/users/');
                const allManagers = managersRes.data.filter((u: User) => u.role === 'MANAGER');
                setManagers(allManagers);
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.role]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            await api.post('/feedback/', newFeedback);
            setShowModal(false);
            setNewFeedback({
                recipient_id: 0,
                feedback_type: 'WEEKLY',
                rating: 5,
                comments: '',
                strengths: '',
                areas_for_improvement: '',
            });
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to submit feedback');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (type: string) => {
        switch (type) {
            case 'WEEKLY': return '#6366f1';
            case 'PROJECT': return '#10b981';
            case 'MID_TERM': return '#f59e0b';
            case 'FINAL': return '#ef4444';
            case 'MANAGER_REVIEW': return '#8b5cf6';
            default: return '#6b7280';
        }
    };

    if (loading) return <div>Loading feedback...</div>;

    const canGiveFeedback = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    // Filter feedback based on tab
    const givenFeedback = feedback.filter(f => f.reviewer.id === user?.id);
    const receivedFeedback = feedback.filter(f => f.recipient.id === user?.id);

    const getRecipients = () => {
        if (user?.role === 'ADMIN') {
            return [...interns, ...managers];
        }
        return interns; // Managers can only give feedback to interns
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Feedback</h2>
                {canGiveFeedback && (
                    <button
                        onClick={() => setShowModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Plus size={18} /> Give Feedback
                    </button>
                )}
            </div>

            {/* Tabs for viewing feedback */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {canGiveFeedback && (
                    <button
                        onClick={() => setActiveTab('given')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            border: 'none',
                            borderRadius: '0.5rem',
                            background: activeTab === 'given' ? 'var(--primary-color)' : 'var(--card-bg)',
                            color: activeTab === 'given' ? 'white' : 'var(--text)',
                            cursor: 'pointer',
                        }}
                    >
                        Given ({givenFeedback.length})
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('received')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        border: 'none',
                        borderRadius: '0.5rem',
                        background: activeTab === 'received' ? 'var(--primary-color)' : 'var(--card-bg)',
                        color: activeTab === 'received' ? 'white' : 'var(--text)',
                        cursor: 'pointer',
                    }}
                >
                    Received ({receivedFeedback.length})
                </button>
            </div>

            {/* Feedback List */}
            <div style={{ display: 'grid', gap: '1rem' }}>
                {(activeTab === 'given' ? givenFeedback : receivedFeedback).length === 0 ? (
                    <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                        <MessageSquare size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <p>No feedback {activeTab === 'given' ? 'given' : 'received'} yet.</p>
                    </div>
                ) : (
                    (activeTab === 'given' ? givenFeedback : receivedFeedback).map((item) => (
                        <div key={item.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        background: 'var(--primary-color)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <User size={24} color="white" />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0 }}>
                                            {activeTab === 'given'
                                                ? `To: ${item.recipient.full_name}`
                                                : `From: ${item.reviewer.full_name}`
                                            }
                                        </h4>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                            {item.reviewer.role === 'MANAGER' ? 'Manager' :
                                                item.reviewer.role === 'ADMIN' ? 'Admin' : 'Intern'} • {item.reviewer.role}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '1rem',
                                        background: `${getStatusColor(item.feedback_type)}20`,
                                        color: getStatusColor(item.feedback_type),
                                        marginBottom: '0.5rem',
                                        display: 'inline-block'
                                    }}>
                                        {item.feedback_type.replace('_', ' ')}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.5rem' }}>
                                        <Star size={16} fill="#f59e0b" color="#f59e0b" />
                                        <span style={{ fontWeight: 600 }}>{item.rating}/5</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>{item.comments}</p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                {item.strengths && (
                                    <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.5rem' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>STRENGTHS</span>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text)', margin: '0.25rem 0 0 0' }}>{item.strengths}</p>
                                    </div>
                                )}
                                {item.areas_for_improvement && (
                                    <div style={{ padding: '0.75rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '0.5rem' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 600 }}>AREAS TO IMPROVE</span>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text)', margin: '0.25rem 0 0 0' }}>{item.areas_for_improvement}</p>
                                    </div>
                                )}
                            </div>

                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'right' }}>
                                {new Date(item.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Give Feedback Modal */}
            {showModal && (
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
                    <div className="card" style={{ width: '550px', maxHeight: '90vh', overflow: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Give Feedback</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'transparent', padding: '0.5rem' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {error && (
                            <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                    {user?.role === 'ADMIN' ? 'Recipient (Manager or Intern)' : 'Recipient (Intern)'} *
                                </label>
                                <select
                                    required
                                    value={newFeedback.recipient_id || ''}
                                    onChange={e => setNewFeedback(prev => ({ ...prev, recipient_id: parseInt(e.target.value) }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                >
                                    <option value="">Select recipient...</option>
                                    {getRecipients().map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.full_name} ({u.role})
                                        </option>
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
                                    {user?.role === 'ADMIN' ? (
                                        <>
                                            <option value="WEEKLY">Weekly Check-in</option>
                                            <option value="PROJECT">Project Review</option>
                                            <option value="MID_TERM">Mid-term Evaluation</option>
                                            <option value="FINAL">Final Evaluation</option>
                                            <option value="MANAGER_REVIEW">Manager Review</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="WEEKLY">Weekly Check-in</option>
                                            <option value="PROJECT">Project Review</option>
                                            <option value="MID_TERM">Mid-term Evaluation</option>
                                            <option value="FINAL">Final Evaluation</option>
                                        </>
                                    )}
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
                                                size={32}
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
                                    rows={4}
                                    placeholder="Provide detailed feedback..."
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Strengths</label>
                                    <textarea
                                        value={newFeedback.strengths}
                                        onChange={e => setNewFeedback(prev => ({ ...prev, strengths: e.target.value }))}
                                        rows={3}
                                        placeholder="What they do well..."
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Areas for Improvement</label>
                                    <textarea
                                        value={newFeedback.areas_for_improvement}
                                        onChange={e => setNewFeedback(prev => ({ ...prev, areas_for_improvement: e.target.value }))}
                                        rows={3}
                                        placeholder="What they can improve..."
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.25rem', border: 'none', background: 'var(--primary-color)', color: 'white', cursor: 'pointer' }}
                                >
                                    {submitting ? 'Submitting...' : 'Submit Feedback'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeedbackPage;
