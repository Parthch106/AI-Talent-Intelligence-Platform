import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { User, Star, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { CustomSelect } from '../components/common';
import toast from 'react-hot-toast';
import '../quill-compat';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
// @ts-ignore
import ImageResize from 'quill-image-resize-module-react';

Quill.register('modules/imageResize', ImageResize);
import { EvidenceUploader, ImageEditorModal, ImageToolbar } from '../components/common';

interface UserType {
    id: number;
    full_name: string;
    email: string;
    role: string;
}

interface NewFeedback {
    recipient_id: number;
    task_id?: number;
    feedback_type: string;
    task_status?: string;
    rating: number;
    comments: string;
    strengths: string;
    areas_for_improvement: string;
    parent_feedback_id?: number | null;
    evidence_ids?: number[];
}

const CreateFeedbackPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const quillRef = useRef<ReactQuill>(null);

    const [interns, setInterns] = useState<UserType[]>([]);
    const [managers, setManagers] = useState<UserType[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [evidenceIds, setEvidenceIds] = useState<number[]>([]);
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [selectedImg, setSelectedImg] = useState<{ element: HTMLImageElement; rect: DOMRect } | null>(null);
    const [showCropper, setShowCropper] = useState(false);

    const [newFeedback, setNewFeedback] = useState<NewFeedback>({
        recipient_id: 0,
        feedback_type: 'WEEKLY',
        task_status: '',
        rating: 5,
        comments: '',
        strengths: '',
        areas_for_improvement: '',
    });

    useEffect(() => {
        // Handle state passed from FeedbackPage for replies
        if (location.state) {
            if (location.state.replyTo) {
                setReplyingTo(location.state.replyTo);
            }
            if (location.state.recipientId) {
                setNewFeedback(prev => ({ ...prev, recipient_id: location.state.recipientId }));
            }
        }
    }, [location.state]);

    const handleEditorClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'IMG') {
            const img = target as HTMLImageElement;
            setSelectedImg({
                element: img,
                rect: img.getBoundingClientRect()
            });
        } else {
            setSelectedImg(null);
        }
    };

    const handleImageEdit = (newSrc: string) => {
        if (!selectedImg) return;
        const quill = quillRef.current?.getEditor();
        if (quill) {
            const blot = Quill.find(selectedImg.element) as any;
            if (blot) {
                const index = quill.getIndex(blot);
                quill.deleteText(index, 1);
                quill.insertEmbed(index, 'image', newSrc);
            }
        }
        setShowCropper(false);
        setSelectedImg(null);
    };

    const handleImageDelete = () => {
        if (!selectedImg) return;
        const quill = quillRef.current?.getEditor();
        if (quill) {
            const blot = Quill.find(selectedImg.element) as any;
            if (blot) {
                const index = quill.getIndex(blot);
                quill.deleteText(index, 1);
            }
        }
        setSelectedImg(null);
    };

    const handleImageReplace = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                handleImageEdit(reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const quillModules = useMemo(() => ({
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            ['link', 'image'],
            ['clean']
        ],
        imageResize: {}
    }), []);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                if (user?.role === 'MANAGER') {
                    const internsRes = await api.get('/interns/department-interns/');
                    setInterns(internsRes.data);
                } else {
                    const internsRes = await api.get('/accounts/users/?role=INTERN');
                    setInterns(internsRes.data);
                }

                if (user?.role === 'ADMIN') {
                    const managersRes = await api.get('/accounts/users/');
                    const allManagers = managersRes.data.filter((u: UserType) => u.role === 'MANAGER');
                    setManagers(allManagers);
                }
            } catch (err) {
                console.error('Failed to fetch users', err);
            }
        };

        fetchUsers();
    }, [user?.role]);

    const getRecipients = () => {
        if (user?.role === 'ADMIN') {
            return [...interns, ...managers];
        }
        return interns;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        if (!newFeedback.recipient_id) {
            setError('Please select a recipient');
            setSubmitting(false);
            return;
        }
        if (!newFeedback.comments) {
            setError('Please provide comments');
            setSubmitting(false);
            return;
        }

        try {
            const feedbackData = {
                ...newFeedback,
                ...(newFeedback.feedback_type !== 'TASK' && { task_status: null }),
                evidence_ids: evidenceIds,
                parent_feedback_id: replyingTo
            };

            await api.post('/feedback/', feedbackData);
            
            toast.success(replyingTo ? 'Reply successfully archived' : 'Performance feedback successfully archived');
            navigate('/directory/feedback');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Failed to archive feedback');
            toast.error(err.response?.data?.error || err.message || 'Failed to archive feedback');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-6 animate-fade-in">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => navigate('/directory/feedback')}
                    className="p-2 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/30 transition-all text-[var(--text-muted)]"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">
                        {replyingTo ? 'Reply to Feedback' : 'Give Feedback'}
                    </h1>
                    <p className="text-[var(--text-dim)]">
                        {replyingTo ? 'Provide a response to existing feedback' : 'Provide constructive feedback to your team members'}
                    </p>
                </div>
            </div>

            <Card className="p-8 border-purple-500/20">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">
                                {user?.role === 'ADMIN' ? 'Recipient (Manager or Intern)' : 'Recipient (Intern)'} *
                            </label>
                            <CustomSelect
                                options={[
                                    { value: '', label: 'Select recipient...', disabled: true },
                                    ...getRecipients().map(u => ({ value: String(u.id), label: `${u.full_name} (${u.role})` }))
                                ]}
                                value={String(newFeedback.recipient_id || '')}
                                onChange={(v) => setNewFeedback(prev => ({ ...prev, recipient_id: parseInt(v) }))}
                                placeholder="Select recipient..."
                                accent="purple"
                                icon={<User size={16} />}
                                disabled={replyingTo !== null} // Disable changing recipient if replying
                            />
                        </div>

                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Feedback Type *</label>
                            <CustomSelect
                                options={[
                                    { value: 'WEEKLY', label: 'Weekly Check-in' },
                                    { value: 'PROJECT', label: 'Project Review' },
                                    { value: 'MID_TERM', label: 'Mid-term Evaluation' },
                                    { value: 'FINAL', label: 'Final Evaluation' },
                                    { value: 'MANAGER_REVIEW', label: 'Manager Review' },
                                    { value: 'TASK', label: 'Task Feedback' },
                                ]}
                                value={newFeedback.feedback_type}
                                onChange={(v) => setNewFeedback(prev => ({ ...prev, feedback_type: v }))}
                                accent="purple"
                            />
                        </div>
                    </div>

                    {/* Task Status - Show when TASK feedback type is selected */}
                    {newFeedback.feedback_type === 'TASK' && (
                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Task Status *</label>
                            <CustomSelect
                                options={[
                                    { value: 'IN_PROGRESS', label: 'In Progress' },
                                    { value: 'COMPLETED_APPROVED', label: 'Complete - Approved' },
                                    { value: 'COMPLETED_REWORK', label: 'Complete - Needs Rework' },
                                ]}
                                value={newFeedback.task_status || 'IN_PROGRESS'}
                                onChange={(v) => setNewFeedback(prev => ({ ...prev, task_status: v }))}
                                accent="purple"
                            />
                        </div>
                    )}

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-3">Rating *</label>
                        <div className="flex items-center gap-2 bg-[var(--bg-muted)] p-4 rounded-xl border border-[var(--border-color)]">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setNewFeedback(prev => ({ ...prev, rating: star }))}
                                    className="p-1 transition-all hover:scale-110 active:scale-95"
                                >
                                    <Star
                                        size={32}
                                        fill={star <= newFeedback.rating ? '#f59e0b' : 'transparent'}
                                        color="#f59e0b"
                                        className={star <= newFeedback.rating ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'opacity-40'}
                                    />
                                </button>
                            ))}
                            <span className="ml-4 text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent w-8 text-center">{newFeedback.rating}</span>
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Comments *</label>
                        <div 
                            onClick={handleEditorClick}
                            className="bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl overflow-hidden text-[var(--text-main)] [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-[var(--border-color)] [&_.ql-container]:border-none [&_.ql-editor]:min-h-[200px]"
                        >
                            <ReactQuill
                                ref={quillRef}
                                theme="snow"
                                value={newFeedback.comments}
                                onChange={content => setNewFeedback(prev => ({ ...prev, comments: content }))}
                                modules={quillModules}
                                placeholder="Provide detailed feedback..."
                            />
                        </div>
                    </div>
                    
                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Evidence Documents (Optional)</label>
                        <EvidenceUploader
                            onUploadComplete={ids => setEvidenceIds(ids)}
                            documentType="FEEDBACK_EVIDENCE"
                            label="evidence"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Strengths</label>
                            <textarea
                                value={newFeedback.strengths}
                                onChange={e => setNewFeedback(prev => ({ ...prev, strengths: e.target.value }))}
                                rows={4}
                                placeholder="What they do well..."
                                className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none font-medium text-sm text-emerald-400"
                            />
                        </div>
                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Areas for Improvement</label>
                            <textarea
                                value={newFeedback.areas_for_improvement}
                                onChange={e => setNewFeedback(prev => ({ ...prev, areas_for_improvement: e.target.value }))}
                                rows={4}
                                placeholder="What they can improve..."
                                className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none font-medium text-sm text-amber-400"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-[var(--border-color)] justify-end">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => navigate('/directory/feedback')}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            gradient="purple"
                            disabled={submitting}
                        >
                            {submitting ? 'Submitting...' : 'Submit Feedback'}
                        </Button>
                    </div>
                </form>
            </Card>

            {selectedImg && (
                <ImageToolbar
                    rect={selectedImg.rect}
                    onEdit={() => setShowCropper(true)}
                    onReplace={handleImageReplace}
                    onDelete={handleImageDelete}
                    onClose={() => setSelectedImg(null)}
                />
            )}

            {showCropper && selectedImg && (
                <ImageEditorModal
                    imageSrc={selectedImg.element.src}
                    onClose={() => setShowCropper(false)}
                    onSave={handleImageEdit}
                />
            )}
        </div>
    );
};

export default CreateFeedbackPage;
