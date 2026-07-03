import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Upload, X, Paperclip, Send } from 'lucide-react';
import '../quill-compat';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
// @ts-ignore
import ImageResize from 'quill-image-resize-module-react';

Quill.register('modules/imageResize', ImageResize);
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import EvidenceUploader from '../components/common/EvidenceUploader';
import toast from 'react-hot-toast';
import { ImageEditorModal, ImageToolbar } from '../components/common';

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
    comments: string;
    task?: { id: number; title: string } | null;
    project?: { id: number; name: string } | null;
}

const FeedbackReplyPage: React.FC = () => {
    const { user } = useAuth();
    const { feedbackId } = useParams<{ feedbackId: string }>();
    const navigate = useNavigate();
    const quillRef = useRef<ReactQuill>(null);

    const [selectedImg, setSelectedImg] = useState<{ element: HTMLImageElement; rect: DOMRect } | null>(null);
    const [showCropper, setShowCropper] = useState(false);

    const [originalFeedback, setOriginalFeedback] = useState<Feedback | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [replyComments, setReplyComments] = useState('');
    const [evidenceIds, setEvidenceIds] = useState<number[]>([]);

    useEffect(() => {
        const fetchOriginalFeedback = async () => {
            try {
                const res = await api.get(`/feedback/${feedbackId}/`);
                setOriginalFeedback(res.data);
            } catch (err) {
                console.error('Failed to fetch original feedback', err);
                toast.error('Failed to load feedback details');
                navigate('/directory/feedback');
            } finally {
                setLoading(false);
            }
        };

        if (feedbackId) {
            fetchOriginalFeedback();
        }
    }, [feedbackId, navigate]);

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
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            ['link', 'image'],
            ['clean']
        ],
        imageResize: {}
    }), []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyComments.trim() || replyComments === '<p><br></p>') {
            toast.error('Please enter comments for your reply');
            return;
        }

        setSubmitting(true);
        try {
            const recipientId = originalFeedback?.reviewer.id === user?.id
                ? originalFeedback?.recipient.id
                : originalFeedback?.reviewer.id;

            await api.post('/feedback/', {
                parent_feedback_id: originalFeedback?.id,
                recipient_id: recipientId,
                feedback_type: originalFeedback?.feedback_type,
                comments: replyComments.trim(),
                task_id: originalFeedback?.task?.id ?? null,
                project_id: originalFeedback?.project?.id ?? null,
                evidence_ids: evidenceIds
            });

            toast.success('Reply submitted successfully');
            navigate('/directory/feedback');
        } catch (err) {
            console.error('Failed to submit reply', err);
            toast.error('Failed to submit reply');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-purple-500/10 border-t-purple-500 rounded-full animate-spin"></div>
                    <p className="text-[var(--text-dim)] animate-pulse">Loading feedback context...</p>
                </div>
            </div>
        );
    }

    if (!originalFeedback) return null;

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/directory/feedback')}
                    className="p-2 hover:bg-[var(--bg-muted)] rounded-xl text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors border border-[var(--border-color)]"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">Reply to Feedback</h1>
                    <p className="text-sm text-[var(--text-dim)]">Create a threaded reply and upload documentation</p>
                </div>
            </div>

            {/* Original Feedback Context */}
            <Card className="mb-6 border-l-4 border-purple-500 bg-purple-500/5">
                <div className="flex items-center gap-2 mb-3 text-purple-400">
                    <MessageSquare size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Original Feedback</span>
                </div>
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <span className="font-semibold text-sm text-[var(--text-main)]">
                            From: {originalFeedback.reviewer.full_name}
                        </span>
                        <span className="text-[var(--text-dim)] text-xs ml-2">
                            ({originalFeedback.reviewer.role === 'MANAGER' ? 'Manager' : 'Admin'})
                        </span>
                    </div>
                </div>
                <div 
                    className="text-sm text-[var(--text-dim)] prose prose-sm dark:prose-invert max-w-none bg-[var(--bg-color)]/50 p-3 rounded-lg border border-[var(--border-color)]"
                    dangerouslySetInnerHTML={{ __html: originalFeedback.comments }}
                />
            </Card>

            {/* Reply Form */}
            <Card>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-[var(--text-main)] mb-2">
                            Your Reply
                        </label>
                        <div 
                            onClick={handleEditorClick}
                            className="bg-[var(--bg-color)] rounded-xl overflow-hidden border border-[var(--border-color)]"
                        >
                            <ReactQuill
                                ref={quillRef}
                                theme="snow"
                                value={replyComments}
                                onChange={setReplyComments}
                                modules={quillModules}
                                placeholder="Type your reply here..."
                                className="quill-editor"
                            />
                        </div>
                    </div>

                    {/* Upload Section */}
                    <div>
                        <label className="block text-sm font-semibold text-[var(--text-main)] mb-2">
                            Attachments (PDF, Doc, Images)
                        </label>
                        <EvidenceUploader
                            onUploadComplete={ids => setEvidenceIds(ids)}
                            documentType="FEEDBACK_EVIDENCE"
                            label="evidence"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => navigate('/directory/feedback')}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            gradient="purple"
                            icon={<Send size={16} />}
                            disabled={submitting || !replyComments.trim() || replyComments === '<p><br></p>'}
                        >
                            {submitting ? 'Submitting...' : 'Submit Reply'}
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

export default FeedbackReplyPage;
