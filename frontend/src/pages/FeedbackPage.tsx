import React, { useEffect, useState } from 'react';
import { MessageSquare, Plus, X, Star, User, Calendar, ThumbsUp, TrendingUp } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

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
                const internsRes = await api.get('/interns/department-interns/');
                setInterns(internsRes.data);
            } else {
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

    const getFeedbackBadge = (type: string) => {
        switch (type) {
            case 'WEEKLY': return <Badge variant="purple" withDot>Weekly Check-in</Badge>;
            case 'PROJECT': return <Badge variant="success" withDot>Project Review</Badge>;
            case 'MID_TERM': return <Badge variant="warning" withDot>Mid-term</Badge>;
            case 'FINAL': return <Badge variant="danger" withDot>Final</Badge>;
            case 'MANAGER_REVIEW': return <Badge variant="indigo" withDot>Manager Review</Badge>;
            default: return <Badge variant="default">{type}</Badge>;
        }
    };

    const getInitials = (name: string) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'NA';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                    <p className="text-slate-400 animate-pulse">Loading feedback...</p>
                </div>
            </div>
        );
    }

    const canGiveFeedback = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    // Filter feedback based on tab
    const givenFeedback = feedback.filter(f => f.reviewer.id === user?.id);
    const receivedFeedback = feedback.filter(f => f.recipient.id === user?.id);

    const getRecipients = () => {
        if (user?.role === 'ADMIN') {
            return [...interns, ...managers];
        }
        return interns;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Feedback <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Center</span>
                    </h1>
                    <p className="text-slate-400">View and manage performance feedback</p>
                </div>
                {canGiveFeedback && (
                    <Button
                        onClick={() => setShowModal(true)}
                        gradient="purple"
                        icon={<Plus size={18} />}
                    >
                        Give Feedback
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 p-1 bg-slate-800/50 rounded-xl border border-slate-700 w-fit">
                {canGiveFeedback && (
                    <button
                        onClick={() => setActiveTab('given')}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 ${activeTab === 'given'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Given ({givenFeedback.length})
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('received')}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 ${activeTab === 'received'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                        : 'text-slate-400 hover:text-white'
                        }`}
                >
                    Received ({receivedFeedback.length})
                </button>
            </div>

            {/* Feedback List */}
            <div className="space-y-4">
                {(activeTab === 'given' ? givenFeedback : receivedFeedback).length === 0 ? (
                    <Card className="text-center py-12">
                        <div className="w-20 h-20 mx-auto mb-4 bg-slate-800/50 rounded-2xl flex items-center justify-center">
                            <MessageSquare size={32} className="text-slate-500" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">No feedback {activeTab === 'given' ? 'given' : 'received'} yet</h3>
                        <p className="text-slate-400 mb-6">
                            {activeTab === 'given'
                                ? 'Start giving feedback to your team members'
                                : 'Feedback you receive will appear here'}
                        </p>
                        {activeTab === 'given' && canGiveFeedback && (
                            <Button
                                onClick={() => setShowModal(true)}
                                gradient="purple"
                                icon={<Plus size={18} />}
                            >
                                Give Feedback
                            </Button>
                        )}
                    </Card>
                ) : (
                    (activeTab === 'given' ? givenFeedback : receivedFeedback).map((item) => (
                        <Card key={item.id} hover className="group">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                {/* User Info */}
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                                        <div className="relative w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                                            {getInitials(activeTab === 'given' ? item.recipient.full_name : item.reviewer.full_name)}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white group-hover:text-purple-200 transition-colors">
                                            {activeTab === 'given'
                                                ? `To: ${item.recipient.full_name}`
                                                : `From: ${item.reviewer.full_name}`
                                            }
                                        </h3>
                                        <p className="text-sm text-slate-400">
                                            {item.reviewer.role === 'MANAGER' ? 'Manager' :
                                                item.reviewer.role === 'ADMIN' ? 'Admin' : 'Intern'}
                                        </p>
                                    </div>
                                </div>

                                {/* Rating & Type */}
                                <div className="flex items-center gap-4">
                                    {getFeedbackBadge(item.feedback_type)}
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                        <Star size={16} className="text-amber-400 fill-amber-400" />
                                        <span className="font-bold text-amber-400">{item.rating}/5</span>
                                    </div>
                                </div>
                            </div>

                            {/* Comments */}
                            <div className="mt-4 p-4 bg-slate-800/30 rounded-xl border border-white/5">
                                <p className="text-slate-300">{item.comments}</p>
                            </div>

                            {/* Strengths & Improvements */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {item.strengths && (
                                    <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <ThumbsUp size={14} className="text-emerald-400" />
                                            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Strengths</span>
                                        </div>
                                        <p className="text-sm text-slate-300">{item.strengths}</p>
                                    </div>
                                )}
                                {item.areas_for_improvement && (
                                    <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp size={14} className="text-indigo-400" />
                                            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Areas to Improve</span>
                                        </div>
                                        <p className="text-sm text-slate-300">{item.areas_for_improvement}</p>
                                    </div>
                                )}
                            </div>

                            {/* Date */}
                            <div className="flex items-center justify-end gap-2 mt-4 text-sm text-slate-500">
                                <Calendar size={14} />
                                {new Date(item.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Give Feedback Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
                    <div className="relative bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-purple-500/20 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-between px-6 py-4 border-b border-white/10 z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                                    <MessageSquare size={18} className="text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Give Feedback</h2>
                                    <p className="text-xs text-slate-400">Share your thoughts and help others grow</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-white/5 rounded-xl transition-colors group"
                            >
                                <X size={20} className="text-slate-400 group-hover:text-white transition-colors" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                                    <X size={16} />
                                    {error}
                                </div>
                            )}

                            <div className="group">
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    {user?.role === 'ADMIN' ? 'Recipient (Manager or Intern)' : 'Recipient (Intern)'} *
                                </label>
                                <select
                                    required
                                    value={newFeedback.recipient_id || ''}
                                    onChange={e => setNewFeedback(prev => ({ ...prev, recipient_id: parseInt(e.target.value) }))}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Select recipient...</option>
                                    {getRecipients().map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.full_name} ({u.role})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="group">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Feedback Type *</label>
                                <select
                                    value={newFeedback.feedback_type}
                                    onChange={e => setNewFeedback(prev => ({ ...prev, feedback_type: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all appearance-none cursor-pointer"
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

                            <div className="group">
                                <label className="block text-sm font-medium text-slate-300 mb-3">Rating *</label>
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setNewFeedback(prev => ({ ...prev, rating: star }))}
                                            className="p-1 hover:scale-110 transition-transform"
                                        >
                                            <Star
                                                size={32}
                                                fill={star <= newFeedback.rating ? '#f59e0b' : 'transparent'}
                                                color="#f59e0b"
                                                className="transition-all"
                                            />
                                        </button>
                                    ))}
                                    <span className="ml-2 text-lg font-bold text-amber-400">{newFeedback.rating}/5</span>
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Comments *</label>
                                <textarea
                                    required
                                    value={newFeedback.comments}
                                    onChange={e => setNewFeedback(prev => ({ ...prev, comments: e.target.value }))}
                                    rows={4}
                                    placeholder="Provide detailed feedback..."
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="group">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Strengths</label>
                                    <textarea
                                        value={newFeedback.strengths}
                                        onChange={e => setNewFeedback(prev => ({ ...prev, strengths: e.target.value }))}
                                        rows={3}
                                        placeholder="What they do well..."
                                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none"
                                    />
                                </div>
                                <div className="group">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Areas for Improvement</label>
                                    <textarea
                                        value={newFeedback.areas_for_improvement}
                                        onChange={e => setNewFeedback(prev => ({ ...prev, areas_for_improvement: e.target.value }))}
                                        rows={3}
                                        placeholder="What they can improve..."
                                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowModal(false)}
                                    fullWidth
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    gradient="purple"
                                    loading={submitting}
                                    fullWidth
                                >
                                    Submit Feedback
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeedbackPage;
