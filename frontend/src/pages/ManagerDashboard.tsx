import React, { useState, useEffect } from 'react';
import { Users, ClipboardList, MessageSquare, Plus, X, Star, Mail, Building } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

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
    const { } = useAuth();
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

    const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
        switch (status) {
            case 'ACTIVE': return 'success';
            case 'ONBOARDING': return 'warning';
            case 'COMPLETED': return 'default';
            case 'INACTIVE': return 'danger';
            default: return 'default';
        }
    };

    const getAssessmentTypeColor = (type: string): string => {
        switch (type) {
            case 'TECHNICAL': return 'from-purple-500 to-indigo-500';
            case 'CODING': return 'from-emerald-500 to-teal-500';
            case 'BEHAVIORAL': return 'from-amber-500 to-orange-500';
            case 'PROJECT': return 'from-pink-500 to-rose-500';
            default: return 'from-slate-500 to-slate-600';
        }
    };

    const getInitials = (name: string) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'NA';
    };

    const getGradient = (name: string): string => {
        const colors = [
            'from-purple-500 via-pink-500 to-rose-500',
            'from-blue-500 via-cyan-500 to-teal-500',
            'from-amber-500 via-orange-500 to-red-500',
            'from-emerald-500 via-green-500 to-lime-500',
            'from-indigo-500 via-violet-500 to-purple-500',
        ];
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                    <p className="text-[var(--text-muted)]">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2">
                    Manager <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Dashboard</span>
                </h1>
                <p className="text-[var(--text-dim)]">Manage your intern team, assessments, and feedback</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Total Interns', value: interns.length, icon: Users, color: 'from-purple-500 to-indigo-500' },
                    { label: 'Assessments', value: assessments.length, icon: ClipboardList, color: 'from-pink-500 to-rose-500' },
                    { label: 'Feedback Given', value: feedback.length, icon: MessageSquare, color: 'from-amber-500 to-orange-500' },
                ].map((stat) => (
                    <Card key={stat.label} hover className="group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)] mb-1">{stat.label}</p>
                                <p className="text-3xl font-bold text-[var(--text-main)]">{stat.value}</p>
                            </div>
                            <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                <stat.icon size={24} className="text-white" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
                {[
                    { id: 'interns', label: 'Interns', icon: Users, count: interns.length },
                    { id: 'assessments', label: 'Assessments', icon: ClipboardList, count: assessments.length },
                    { id: 'feedback', label: 'Feedback', icon: MessageSquare, count: feedback.length },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${activeTab === tab.id
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                            : 'bg-[var(--bg-muted)] text-[var(--text-dim)] hover:bg-[var(--card-bg)] hover:text-[var(--text-main)] border border-[var(--border-color)]'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        <Badge variant={activeTab === tab.id ? 'purple' : 'default'} size="sm">
                            {tab.count}
                        </Badge>
                    </button>
                ))}
            </div>

            {/* Interns Tab */}
            {activeTab === 'interns' && (
                <Card padding="none">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] text-sm">
                                    <th className="text-left p-4 font-medium">Intern</th>
                                    <th className="text-left p-4 font-medium">Contact</th>
                                    <th className="text-left p-4 font-medium">University</th>
                                    <th className="text-left p-4 font-medium">Status</th>
                                    <th className="text-left p-4 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {interns.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">
                                            <Users size={48} className="mx-auto mb-3 opacity-50" />
                                            <p>No interns found in your department</p>
                                        </td>
                                    </tr>
                                ) : (
                                    interns.map((intern) => (
                                        <tr key={intern.id} className="border-b border-[var(--border-color)] hover:bg-purple-500/[0.02] transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getGradient(intern.user.full_name)} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                                                        {getInitials(intern.user.full_name)}
                                                    </div>
                                                    <span className="font-medium text-[var(--text-main)]">{intern.user.full_name}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-[var(--text-muted)]">
                                                    <Mail size={14} />
                                                    {intern.user.email}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-[var(--text-dim)]">
                                                    <Building size={14} className="text-purple-400" />
                                                    {intern.university}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <Badge variant={getStatusVariant(intern.status)}>
                                                    {intern.status}
                                                </Badge>
                                            </td>
                                            <td className="p-4">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setNewFeedback(prev => ({ ...prev, recipient_id: intern.id }));
                                                        setActiveTab('feedback');
                                                    }}
                                                    icon={<MessageSquare size={14} />}
                                                >
                                                    Give Feedback
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Assessments Tab */}
            {activeTab === 'assessments' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-[var(--text-main)]">All Assessments</h3>
                        <Button
                            onClick={() => setShowAssessmentModal(true)}
                            gradient="purple"
                            icon={<Plus size={16} />}
                        >
                            New Assessment
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {assessments.length === 0 ? (
                            <Card className="col-span-full py-12 text-center">
                                <ClipboardList size={48} className="mx-auto mb-3 text-[var(--text-muted)] opacity-50" />
                                <p className="text-[var(--text-muted)]">No assessments created yet</p>
                                <Button
                                    onClick={() => setShowAssessmentModal(true)}
                                    gradient="purple"
                                    icon={<Plus size={16} />}
                                    className="mt-4"
                                >
                                    Create First Assessment
                                </Button>
                            </Card>
                        ) : (
                            assessments.map((assessment) => (
                                <Card key={assessment.id} hover className="group">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={`p-2 rounded-lg bg-gradient-to-br ${getAssessmentTypeColor(assessment.assessment_type)}`}>
                                            <ClipboardList size={16} className="text-white" />
                                        </div>
                                        <Badge variant="default" size="sm">{assessment.assessment_type}</Badge>
                                    </div>
                                    <h4 className="font-semibold text-[var(--text-main)] mb-1 group-hover:text-purple-400 transition-colors">
                                        {assessment.title}
                                    </h4>
                                    <p className="text-sm text-[var(--text-muted)] mb-4">
                                        {new Date(assessment.created_at).toLocaleDateString()}
                                    </p>
                                    <Button size="sm" variant="ghost" className="w-full">
                                        View Details
                                    </Button>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Feedback Tab */}
            {activeTab === 'feedback' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-[var(--text-main)]">Feedback Given</h3>
                        <Button
                            onClick={() => setShowFeedbackModal(true)}
                            gradient="purple"
                            icon={<Plus size={16} />}
                        >
                            Give Feedback
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {feedback.length === 0 ? (
                            <Card className="col-span-full py-12 text-center">
                                <MessageSquare size={48} className="mx-auto mb-3 text-[var(--text-muted)] opacity-50" />
                                <p className="text-[var(--text-muted)]">No feedback given yet</p>
                                <Button
                                    onClick={() => setShowFeedbackModal(true)}
                                    gradient="purple"
                                    icon={<Plus size={16} />}
                                    className="mt-4"
                                >
                                    Give First Feedback
                                </Button>
                            </Card>
                        ) : (
                            feedback.map((item) => (
                                <Card key={item.id} hover>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getGradient(item.recipient.full_name)} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                                                {getInitials(item.recipient.full_name)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-[var(--text-main)]">{item.recipient.full_name}</p>
                                                <Badge variant="purple" size="sm">{item.feedback_type.replace(/_/g, ' ')}</Badge>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    size={16}
                                                    fill={star <= item.rating ? '#f59e0b' : 'transparent'}
                                                    color="#f59e0b"
                                                />
                                            ))}
                                            <span className="text-sm font-medium text-[var(--text-main)] ml-1">{item.rating}/5</span>
                                        </div>
                                    </div>
                                    <p className="text-[var(--text-dim)] mb-3">{item.comments}</p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {new Date(item.created_at).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Create Assessment Modal */}
            {showAssessmentModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <Card className="w-full max-w-md animate-scale-in" padding="lg">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-semibold text-[var(--text-main)]">Create Assessment</h3>
                            <button
                                onClick={() => setShowAssessmentModal(false)}
                                className="p-2 rounded-lg hover:bg-[var(--bg-muted)] transition-colors"
                            >
                                <X size={20} className="text-[var(--text-muted)]" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateAssessment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={newAssessment.title}
                                    onChange={e => setNewAssessment(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                                    placeholder="Enter assessment title"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Type *</label>
                                <select
                                    value={newAssessment.assessment_type}
                                    onChange={e => setNewAssessment(prev => ({ ...prev, assessment_type: e.target.value }))}
                                    className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                                >
                                    <option value="TECHNICAL">Technical Quiz</option>
                                    <option value="CODING">Coding Challenge</option>
                                    <option value="BEHAVIORAL">Behavioral</option>
                                    <option value="PROJECT">Project Evaluation</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Description</label>
                                <textarea
                                    value={newAssessment.description}
                                    onChange={e => setNewAssessment(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none"
                                    placeholder="Enter description"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="button"
                                    onClick={() => setShowAssessmentModal(false)}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    gradient="purple"
                                    className="flex-1"
                                >
                                    {submitting ? 'Creating...' : 'Create'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Give Feedback Modal */}
            {showFeedbackModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in" padding="lg">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-semibold text-[var(--text-main)]">Give Feedback</h3>
                            <button
                                onClick={() => setShowFeedbackModal(false)}
                                className="p-2 rounded-lg hover:bg-[var(--bg-muted)] transition-colors"
                            >
                                <X size={20} className="text-[var(--text-muted)]" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateFeedback} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Intern *</label>
                                <select
                                    required
                                    value={newFeedback.recipient_id || ''}
                                    onChange={e => setNewFeedback(prev => ({ ...prev, recipient_id: parseInt(e.target.value) }))}
                                    className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                                >
                                    <option value="">Select intern...</option>
                                    {interns.map(intern => (
                                        <option key={intern.id} value={intern.id}>{intern.user.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Feedback Type *</label>
                                <select
                                    value={newFeedback.feedback_type}
                                    onChange={e => setNewFeedback(prev => ({ ...prev, feedback_type: e.target.value }))}
                                    className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                                >
                                    <option value="WEEKLY">Weekly Check-in</option>
                                    <option value="PROJECT">Project Review</option>
                                    <option value="MID_TERM">Mid-term Evaluation</option>
                                    <option value="FINAL">Final Evaluation</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Rating *</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setNewFeedback(prev => ({ ...prev, rating: star }))}
                                            className="p-1 transition-transform hover:scale-110"
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
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Comments *</label>
                                <textarea
                                    required
                                    value={newFeedback.comments}
                                    onChange={e => setNewFeedback(prev => ({ ...prev, comments: e.target.value }))}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none"
                                    placeholder="Enter your feedback comments"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Strengths</label>
                                <textarea
                                    value={newFeedback.strengths}
                                    onChange={e => setNewFeedback(prev => ({ ...prev, strengths: e.target.value }))}
                                    rows={2}
                                    className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none"
                                    placeholder="List areas of strength"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Areas for Improvement</label>
                                <textarea
                                    value={newFeedback.areas_for_improvement}
                                    onChange={e => setNewFeedback(prev => ({ ...prev, areas_for_improvement: e.target.value }))}
                                    rows={2}
                                    className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none"
                                    placeholder="List areas for improvement"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="button"
                                    onClick={() => setShowFeedbackModal(false)}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    gradient="purple"
                                    className="flex-1"
                                >
                                    {submitting ? 'Submitting...' : 'Submit'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ManagerDashboard;
