import React, { useEffect, useState, useMemo } from 'react';
import { MessageSquare, Plus, Star, User, Calendar, ThumbsUp, TrendingUp, CheckCircle, Target, Clock } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import { CustomSelect } from '../components/common';
import 'react-quill-new/dist/quill.snow.css';

interface User {
    id: number;
    full_name: string;
    email: string;
    role: string;
}

interface ProjectInfo {
    id: number;
    name: string;
    description: string;
    status: string;
    mentor: number | null;
    mentor_name: string | null;
    repository_url: string | null;
    tech_stack: string[];
    start_date: string;
    end_date: string | null;
}

interface TaskInfo {
    id: number;
    task_id: string;
    title: string;
    description: string;
    intern: User;
    status: string;
    priority: string;
    due_date: string;
    assigned_at: string;
    submitted_at: string | null;
    completed_at: string | null;
    estimated_hours: number;
    actual_hours: number;
    quality_rating: number | null;
    code_review_score: number | null;
    bug_count: number;
    mentor_feedback: string;
    rework_required: boolean;
    project_assignment: number | null;
    project_name: string | null;
    project_description: string | null;
    mentor_name: string | null;
}

interface Feedback {
    id: number;
    reviewer: User;
    recipient: User;
    project: ProjectInfo | null;
    task: TaskInfo | null;
    task_status: string | null;
    feedback_type: string;
    rating: number;
    comments: string;
    strengths: string;
    areas_for_improvement: string;
    is_read: boolean;
    read_at: string | null;
    created_at: string;
    replies?: { id: number; reviewer: User; comments: string; created_at: string; evidences_details?: { id: number; title: string; document_type: string; url: string }[] }[];
    evidences_details?: { id: number; title: string; document_type: string; url: string }[];
}

// Helper function to get task status badge
const getTaskStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
        'COMPLETED_APPROVED': 'success',
        'COMPLETED_REWORK': 'danger',
        'IN_PROGRESS': 'info',
    };
    
    const labels: Record<string, string> = {
        'COMPLETED_APPROVED': 'Approved',
        'COMPLETED_REWORK': 'Needs Rework',
        'IN_PROGRESS': 'In Progress',
    };
    
    return (
        <Badge variant={variants[status] || 'default'}>
            {labels[status] || status}
        </Badge>
    );
};

// Helper function to get task priority badge
const getPriorityBadge = (priority: string | null) => {
    if (!priority) return null;
    
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
        'LOW': 'info',
        'MEDIUM': 'warning',
        'HIGH': 'danger',
        'CRITICAL': 'danger',
    };
    
    return (
        <Badge variant={variants[priority] || 'default'}>
            {priority}
        </Badge>
    );
};

// Helper function to get task status from TaskTracking
const getTaskTrackingBadge = (status: string | null) => {
    if (!status) return null;
    
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
        'COMPLETED': 'success',
        'IN_PROGRESS': 'info',
        'SUBMITTED': 'warning',
        'REVIEWED': 'info',
        'ASSIGNED': 'default',
        'REWORK': 'danger',
    };
    
    return (
        <Badge variant={variants[status] || 'default'}>
            {status}
        </Badge>
    );
};

const FeedbackPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [feedback, setFeedback] = useState<Feedback[]>([]);
            const [loading, setLoading] = useState(true);
                const [activeTab, setActiveTab] = useState<'given' | 'received'>('given');

    // Reply state
    const [replyingToId, setReplyingToId] = useState<number | null>(null);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);

    // Filtering and sorting state
    const [feedbackTypeFilter, setFeedbackTypeFilter] = useState<string>('all');
    const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');
    const [ratingFilter, setRatingFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating_high' | 'rating_low'>('newest');
    const [searchQuery, setSearchQuery] = useState('');
        
    
    
    const fetchData = async () => {
        try {
            const feedbackRes = await api.get('/feedback/');
            setFeedback(feedbackRes.data);

// Fetch interns based on role
            if (user?.role === 'MANAGER') {
                const internsRes = await api.get('/interns/department-interns/');
                            } else {
                const internsRes = await api.get('/accounts/users/?role=INTERN');
                            }

            // For admin, also fetch managers
            if (user?.role === 'ADMIN') {
                const managersRes = await api.get('/accounts/users/');
                const allManagers = managersRes.data.filter((u: User) => u.role === 'MANAGER');
                            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.role]);

    const sendReply = async (parentFeedback: Feedback) => {
        if (!replyText.trim()) return;
        setSendingReply(true);
        try {
            const recipientId = parentFeedback.reviewer.id === user?.id
                ? parentFeedback.recipient.id
                : parentFeedback.reviewer.id;
            await api.post('/feedback/', {
                parent_feedback_id: parentFeedback.id,
                recipient_id: recipientId,
                feedback_type: parentFeedback.feedback_type,
                comments: replyText.trim(),
                task_id: parentFeedback.task?.id ?? null,
                project_id: parentFeedback.project?.id ?? null,
            });
            setReplyingToId(null);
            setReplyText('');
            fetchData();
        } catch (err) {
            console.error('Failed to send reply', err);
        } finally {
            setSendingReply(false);
        }
    };


    const getFeedbackBadge = (type: string) => {
        switch (type) {
            case 'WEEKLY': return <Badge variant="purple" withDot>Weekly Check-in</Badge>;
            case 'PROJECT': return <Badge variant="success" withDot>Project Review</Badge>;
            case 'MID_TERM': return <Badge variant="warning" withDot>Mid-term</Badge>;
            case 'FINAL': return <Badge variant="danger" withDot>Final</Badge>;
            case 'MANAGER_REVIEW': return <Badge variant="indigo" withDot>Manager Review</Badge>;
            case 'TASK': return <Badge variant="success" withDot>Task Feedback</Badge>;
            default: return <Badge variant="default">{type}</Badge>;
        }
    };

    const getInitials = (name: string) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'NA';
    };

    // Filter and sort feedback
    const filteredFeedback = useMemo(() => {
        let filtered = [...feedback];
        
        // Filter based on tab
        if (activeTab === 'given') {
            filtered = filtered.filter(f => f.reviewer.id === user?.id);
        } else {
            filtered = filtered.filter(f => f.recipient.id === user?.id);
        }
        
        // Apply feedback type filter
        if (feedbackTypeFilter !== 'all') {
            filtered = filtered.filter(f => f.feedback_type === feedbackTypeFilter);
        }
        
        // Apply task status filter
        if (taskStatusFilter !== 'all') {
            filtered = filtered.filter(f => f.task_status === taskStatusFilter);
        }
        
        // Apply rating filter
        if (ratingFilter !== 'all') {
            filtered = filtered.filter(f => f.rating === parseInt(ratingFilter));
        }
        
        // Apply search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(f => 
                f.comments.toLowerCase().includes(query) ||
                f.recipient.full_name.toLowerCase().includes(query) ||
                f.reviewer.full_name.toLowerCase().includes(query) ||
                (f.task?.title && f.task.title.toLowerCase().includes(query)) ||
                (f.task?.project_name && f.task.project_name.toLowerCase().includes(query))
            );
        }
        
        // Apply sorting
        switch (sortBy) {
            case 'newest':
                filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                break;
            case 'oldest':
                filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                break;
            case 'rating_high':
                filtered.sort((a, b) => b.rating - a.rating);
                break;
            case 'rating_low':
                filtered.sort((a, b) => a.rating - b.rating);
                break;
        }
        
        return filtered;
    }, [feedback, activeTab, feedbackTypeFilter, taskStatusFilter, ratingFilter, sortBy, searchQuery, user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-purple-500/10 border-t-purple-500 rounded-full animate-spin"></div>
                    <p className="text-[var(--text-dim)] animate-pulse">Loading feedback...</p>
                </div>
            </div>
        );
    }

    const canGiveFeedback = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    // Use filtered feedback
    const displayedFeedback = filteredFeedback;
    
    // Calculate total counts for tabs
    const givenCount = feedback.filter(f => f.reviewer.id === user?.id).length;
    const receivedCount = feedback.filter(f => f.recipient.id === user?.id).length;

        return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2">
                        Feedback <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Center</span>
                    </h1>
                    <p className="text-[var(--text-dim)]">View and manage performance feedback</p>
                </div>
                {canGiveFeedback && (
                    <Button
                        onClick={() => navigate('/directory/feedback/create')}
                        gradient="purple"
                        icon={<Plus size={18} />}
                    >
                        Give Feedback
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 p-1 bg-[var(--bg-muted)] rounded-xl border border-[var(--border-color)] w-fit">
                {canGiveFeedback && (
                    <button
                        onClick={() => setActiveTab('given')}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 ${activeTab === 'given'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                            : 'text-[var(--text-dim)] hover:text-[var(--text-main)]'
                            }`}
                    >
                        Given ({givenCount})
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('received')}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 ${activeTab === 'received'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                        : 'text-[var(--text-dim)] hover:text-[var(--text-main)]'
                        }`}
                >
                    Received ({receivedCount})
                </button>
            </div>

            {/* Filters and Search */}
            <div className="bg-[var(--bg-muted)] rounded-xl p-4 border border-[var(--border-color)]">
                <div className="flex flex-wrap gap-4 items-center">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                        <input
                            type="text"
                            placeholder="Search feedback, names, tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                    </div>

                    {/* Feedback Type Filter */}
                    <CustomSelect
                        options={[
                            { value: 'all', label: 'All Types' },
                            { value: 'WEEKLY', label: 'Weekly' },
                            { value: 'PROJECT', label: 'Project' },
                            { value: 'MID_TERM', label: 'Mid-term' },
                            { value: 'FINAL', label: 'Final' },
                            { value: 'MANAGER_REVIEW', label: 'Manager Review' },
                            { value: 'TASK', label: 'Task' },
                        ]}
                        value={feedbackTypeFilter}
                        onChange={setFeedbackTypeFilter}
                        accent="purple"
                        className="min-w-[150px]"
                    />

                    {/* Task Status Filter */}
                    <CustomSelect
                        options={[
                            { value: 'all', label: 'All Task Status' },
                            { value: 'IN_PROGRESS', label: 'In Progress' },
                            { value: 'COMPLETED_APPROVED', label: 'Approved' },
                            { value: 'COMPLETED_REWORK', label: 'Needs Rework' },
                        ]}
                        value={taskStatusFilter}
                        onChange={setTaskStatusFilter}
                        accent="purple"
                        className="min-w-[160px]"
                    />

                    {/* Rating Filter */}
                    <CustomSelect
                        options={[
                            { value: 'all', label: 'All Ratings' },
                            { value: '5', label: '5 Stars' },
                            { value: '4', label: '4 Stars' },
                            { value: '3', label: '3 Stars' },
                            { value: '2', label: '2 Stars' },
                            { value: '1', label: '1 Star' },
                        ]}
                        value={ratingFilter}
                        onChange={setRatingFilter}
                        accent="purple"
                        className="min-w-[130px]"
                    />

                    {/* Sort */}
                    <CustomSelect
                        options={[
                            { value: 'newest', label: 'Newest First' },
                            { value: 'oldest', label: 'Oldest First' },
                            { value: 'rating_high', label: 'Highest Rated' },
                            { value: 'rating_low', label: 'Lowest Rated' },
                        ]}
                        value={sortBy}
                        onChange={(v) => setSortBy(v as 'newest' | 'oldest' | 'rating_high' | 'rating_low')}
                        accent="purple"
                        className="min-w-[150px]"
                    />
                </div>
            </div>

            {/* Feedback List */}
            <div className="space-y-4">
                {displayedFeedback.length === 0 ? (
                    <Card className="text-center py-12">
                        <div className="w-20 h-20 mx-auto mb-4 bg-[var(--bg-muted)] rounded-2xl flex items-center justify-center">
                            <MessageSquare size={32} className="text-[var(--text-muted)]" />
                        </div>
                        <h3 className="text-lg font-medium text-[var(--text-main)] mb-2">No feedback {activeTab === 'given' ? 'given' : 'received'} yet</h3>
                        <p className="text-[var(--text-dim)] mb-6">
                            {activeTab === 'given'
                                ? 'Start giving feedback to your team members'
                                : 'Feedback you receive will appear here'}
                        </p>
                        {activeTab === 'given' && canGiveFeedback && (
                            <Button
                                onClick={() => navigate('/directory/feedback/create')}
                                gradient="purple"
                                icon={<Plus size={18} />}
                            >
                                Give Feedback
                            </Button>
                        )}
                    </Card>
                ) : (
                    displayedFeedback.map((item) => (
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
                                        <h3 className="font-semibold text-[var(--text-main)] group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                                            {activeTab === 'given'
                                                ? `To: ${item.recipient.full_name}`
                                                : `From: ${item.reviewer.full_name}`
                                            }
                                        </h3>
                                        <p className="text-sm text-[var(--text-dim)]">
                                            {item.reviewer.role === 'MANAGER' ? 'Manager' :
                                                item.reviewer.role === 'ADMIN' ? 'Admin' : 'Intern'}
                                        </p>
                                    </div>
                                </div>

                                {/* Rating & Type */}
                                <div className="flex items-center gap-4">
                                    {getFeedbackBadge(item.feedback_type)}
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                        <Star size={16} className="text-amber-600 dark:text-amber-400 fill-amber-500/30" />
                                        <span className="font-bold text-amber-600 dark:text-amber-400">{item.rating}/5</span>
                                    </div>
                                </div>
                            </div>

                            {/* Task Information - Show if linked to a task */}
                            {item.task && (
                                <div className="mt-3 space-y-3">
                                    {/* Task Header */}
                                    <div className="p-3 bg-purple-500/5 rounded-xl border border-purple-500/10">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Target size={14} className="text-purple-600 dark:text-purple-400" />
                                                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                                    {item.task.title}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getTaskStatusBadge(item.task_status)}
                                                {getTaskTrackingBadge(item.task.status)}
                                            </div>
                                        </div>
                                        
                                        {/* Task ID and Priority */}
                                        <div className="flex items-center gap-4 text-xs text-[var(--text-dim)]">
                                            <span>ID: {item.task.task_id}</span>
                                            {getPriorityBadge(item.task.priority)}
                                        </div>
                                    </div>
                                    
                                    {/* Project Information */}
                                    {item.task.project_name && (
                                        <div className="p-3 bg-[var(--bg-muted)] rounded-xl border border-[var(--border-color)]">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Project</span>
                                            </div>
                                            <p className="text-sm text-[var(--text-main)] font-medium">{item.task.project_name}</p>
                                            {item.task.project_description && (
                                                <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{item.task.project_description}</p>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Task Details Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                        {/* Deadline */}
                                        <div className="p-2 bg-[var(--bg-muted)] rounded-lg">
                                            <div className="flex items-center gap-1 text-[var(--text-dim)] mb-1">
                                                <Clock size={12} />
                                                <span>Due Date</span>
                                            </div>
                                            <p className="text-[var(--text-main)]">
                                                {item.task.due_date ? new Date(item.task.due_date).toLocaleDateString() : 'N/A'}
                                            </p>
                                        </div>
                                        
                                        {/* Hours */}
                                        <div className="p-2 bg-[var(--bg-muted)] rounded-lg">
                                            <div className="flex items-center gap-1 text-[var(--text-dim)] mb-1">
                                                <Clock size={12} />
                                                <span>Est. Hours</span>
                                            </div>
                                            <p className="text-[var(--text-main)]">
                                                {item.task.estimated_hours}h
                                            </p>
                                        </div>
                                        
                                        {/* Quality Rating */}
                                        {item.task.quality_rating !== null && (
                                            <div className="p-2 bg-[var(--bg-muted)] rounded-lg">
                                                <div className="flex items-center gap-1 text-[var(--text-dim)] mb-1">
                                                    <Star size={12} className="text-amber-500" />
                                                    <span>Quality</span>
                                                </div>
                                                <p className="text-[var(--text-main)]">{item.task.quality_rating}/5</p>
                                            </div>
                                        )}
                                        
                                        {/* Code Review */}
                                        {item.task.code_review_score !== null && (
                                            <div className="p-2 bg-[var(--bg-muted)] rounded-lg">
                                                <div className="flex items-center gap-1 text-[var(--text-dim)] mb-1">
                                                    <CheckCircle size={12} className="text-emerald-500" />
                                                    <span>Code Review</span>
                                                </div>
                                                <p className="text-[var(--text-main)]">{item.task.code_review_score}%</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Mentor */}
                                    {item.task.mentor_name && (
                                        <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
                                            <User size={12} />
                                            <span>Mentor: <span className="text-[var(--text-main)]">{item.task.mentor_name}</span></span>
                                        </div>
                                    )}
                                    
                                    {/* Intern */}
                                    {item.task.intern && (
                                        <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
                                            <User size={12} />
                                            <span>Intern: <span className="text-[var(--text-main)]">{item.task.intern.full_name}</span></span>
                                        </div>
                                    )}
                                    
                                    {/* Task Description */}
                                    {item.task.description && (
                                        <div className="p-2 bg-[var(--bg-muted)]/50 rounded-lg">
                                            <p className="text-xs text-[var(--text-muted)] line-clamp-2">{item.task.description}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Comments */}
                            <div className="mt-4 p-4 bg-[var(--bg-muted)] rounded-xl border border-[var(--border-color)]">
                                <div className="text-[var(--text-main)] prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: item.comments }} />
                            </div>

                            {/* Evidences */}
                            {item.evidences_details && item.evidences_details.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {item.evidences_details.map(ev => (
                                        <a key={ev.id} href={ev.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg text-sm hover:bg-purple-500/20 transition-colors">
                                            <span className="font-medium truncate max-w-[200px]">{ev.title}</span>
                                        </a>
                                    ))}
                                </div>
                            )}

                            {/* Replies */}
                            {item.replies && item.replies.length > 0 && (
                                <div className="mt-4 pl-4 border-l-2 border-purple-500/30 space-y-3">
                                    <h4 className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Replies</h4>
                                    {item.replies.map(reply => (
                                        <div key={reply.id} className="p-3 bg-[var(--bg-muted)]/50 rounded-xl">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-[var(--text-main)] text-sm">{reply.reviewer.full_name}</span>
                                                <span className="text-xs text-[var(--text-dim)]">
                                                    {new Date(reply.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="text-sm text-[var(--text-dim)] prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: reply.comments }} />
                                            {reply.evidences_details && reply.evidences_details.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {reply.evidences_details.map(ev => (
                                                        <a key={ev.id} href={ev.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2 py-1 bg-purple-500/5 text-purple-600 dark:text-purple-400 rounded-md text-xs hover:bg-purple-500/10 transition-colors">
                                                            <span className="font-medium truncate max-w-[150px]">{ev.title}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Strengths & Improvements */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {item.strengths && (
                                    <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <ThumbsUp size={14} className="text-emerald-600 dark:text-emerald-400" />
                                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Strengths</span>
                                        </div>
                                        <p className="text-sm text-[var(--text-dim)]">{item.strengths}</p>
                                    </div>
                                )}
                                {item.areas_for_improvement && (
                                    <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp size={14} className="text-indigo-600 dark:text-indigo-400" />
                                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Areas to Improve</span>
                                        </div>
                                        <p className="text-sm text-[var(--text-dim)]">{item.areas_for_improvement}</p>
                                    </div>
                                )}
                            </div>

                            {/* Date and Actions */}
                            <div className="flex items-center justify-between mt-4">
                                <div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => navigate(`/directory/feedback/${item.id}/reply`)}
                                    >
                                        Reply
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                                    <Calendar size={14} />
                                    {new Date(item.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            
        </div>
    );
};

export default FeedbackPage;
