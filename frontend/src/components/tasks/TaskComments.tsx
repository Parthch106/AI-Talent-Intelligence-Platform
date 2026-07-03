import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MessageSquare, Send, Paperclip, Calendar, User, CornerDownRight } from 'lucide-react';
import '../../quill-compat';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
// @ts-ignore
import ImageResize from 'quill-image-resize-module-react';

Quill.register('modules/imageResize', ImageResize);
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Card from '../common/Card';
import Button from '../common/Button';
import EvidenceUploader from '../common/EvidenceUploader';
import toast from 'react-hot-toast';
import { ImageEditorModal, ImageToolbar } from '../common';

interface TaskComment {
    id: number;
    task: number;
    author: {
        id: number;
        full_name: string;
        email: string;
        role: string;
    };
    content: string;
    parent: number | null;
    created_at: string;
    evidences_details?: {
        id: number;
        title: string;
        document_type: string;
        url: string;
    }[];
    replies?: TaskComment[];
}

interface TaskCommentsProps {
    taskId: number;
}

export const TaskComments: React.FC<TaskCommentsProps> = ({ taskId }) => {
    const { user } = useAuth();
    const quillRef = useRef<ReactQuill>(null);
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [evidenceIds, setEvidenceIds] = useState<number[]>([]);
    const [showUploader, setShowUploader] = useState(false);
    const [replyingToId, setReplyingToId] = useState<number | null>(null);
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [selectedImg, setSelectedImg] = useState<{ element: HTMLImageElement; rect: DOMRect } | null>(null);
    const [showCropper, setShowCropper] = useState(false);

    const quillModules = useMemo(() => ({
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
        ],
        imageResize: {}
    }), []);

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

    const fetchComments = async () => {
        try {
            const res = await api.get(`/feedback/task-comments/?task=${taskId}`);
            // Filter only parent comments (parent === null) since replies are nested
            const parents = res.data.filter((c: TaskComment) => c.parent === null);
            setComments(parents);
        } catch (err) {
            console.error('Failed to load task comments', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComments();
    }, [taskId]);

    const handlePostComment = async (e: React.FormEvent, parentId: number | null = null) => {
        e.preventDefault();
        const content = parentId ? replyText : newComment;
        if (!content.trim() || content === '<p><br></p>') return;

        setSubmitting(true);
        try {
            await api.post('/feedback/task-comments/', {
                task: taskId,
                content: content.trim(),
                parent: parentId,
                evidence_ids: parentId ? [] : evidenceIds // only attach files to parent comments for simplicity
            });

            if (parentId) {
                setReplyText('');
                setReplyingToId(null);
            } else {
                setNewComment('');
                setEvidenceIds([]);
                setShowUploader(false);
            }
            fetchComments();
            toast.success('Comment posted successfully');
        } catch (err) {
            console.error('Failed to post comment', err);
            toast.error('Failed to post comment');
        } finally {
            setSubmitting(false);
        }
    };

    const getRoleBadge = (role: string) => {
        if (role === 'ADMIN' || role === 'MANAGER') {
            return (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Mentor
                </span>
            );
        }
        return (
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Intern
            </span>
        );
    };

    const renderCommentNode = (comment: TaskComment, isReply = false) => {
        return (
            <div 
                key={comment.id} 
                className={`p-4 rounded-xl border transition-all ${
                    isReply 
                        ? 'bg-[var(--bg-muted)]/20 border-[var(--border-color)]/50 ml-6 mt-3' 
                        : 'bg-[var(--bg-muted)]/40 border-[var(--border-color)] hover:border-purple-500/20'
                }`}
            >
                {/* Comment Header */}
                <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center text-xs font-bold text-purple-400 border border-purple-500/30">
                            {comment.author.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-[var(--text-main)]">
                                    {comment.author.full_name}
                                </span>
                                {getRoleBadge(comment.author.role)}
                            </div>
                            <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                <Calendar size={10} />
                                {new Date(comment.created_at).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {!isReply && (
                        <button
                            onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
                            className="text-xs font-semibold text-purple-500 hover:text-purple-400 transition-colors"
                        >
                            Reply
                        </button>
                    )}
                </div>

                {/* Comment Body */}
                <div 
                    className="text-sm text-[var(--text-dim)] prose prose-sm dark:prose-invert max-w-none mb-3"
                    dangerouslySetInnerHTML={{ __html: comment.content }}
                />

                {/* Attachments */}
                {comment.evidences_details && comment.evidences_details.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {comment.evidences_details.map(ev => (
                            <a 
                                key={ev.id} 
                                href={ev.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/5 text-purple-600 dark:text-purple-400 rounded-lg text-xs hover:bg-purple-500/10 transition-colors border border-purple-500/10"
                            >
                                <Paperclip size={12} />
                                <span className="font-medium truncate max-w-[150px]">{ev.title}</span>
                            </a>
                        ))}
                    </div>
                )}

                {/* Reply Form */}
                {replyingToId === comment.id && (
                    <div className="mt-3 p-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg space-y-2">
                        <textarea
                            rows={2}
                            placeholder="Write a reply..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="w-full px-3 py-2 bg-transparent text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none resize-none"
                        />
                        <div className="flex items-center justify-end gap-2">
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => setReplyingToId(null)}
                            >
                                Cancel
                            </Button>
                            <Button 
                                size="sm" 
                                gradient="purple" 
                                onClick={(e) => handlePostComment(e, comment.id)}
                                disabled={!replyText.trim() || submitting}
                            >
                                Post Reply
                            </Button>
                        </div>
                    </div>
                )}

                {/* Nested Replies */}
                {comment.replies && comment.replies.map(reply => (
                    <div key={reply.id} className="relative">
                        <div className="absolute left-3 top-0 bottom-4 w-0.5 bg-purple-500/10" />
                        <div className="absolute left-3 top-6 w-3 h-0.5 bg-purple-500/10" />
                        {renderCommentNode(reply, true)}
                    </div>
                ))}
            </div>
        );
    };

    if (loading) {
        return <div className="text-center py-6 text-sm text-[var(--text-dim)] animate-pulse">Loading updates...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={18} className="text-purple-500" />
                <h3 className="font-bold text-[var(--text-main)]">Task Discussions & Evidence</h3>
            </div>

            {/* Comment List */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {comments.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-[var(--border-color)] rounded-xl bg-[var(--bg-muted)]/10">
                        <MessageSquare className="mx-auto text-[var(--text-muted)] mb-2" size={24} />
                        <p className="text-xs text-[var(--text-muted)]">No discussions on this task yet. Be the first to post!</p>
                    </div>
                ) : (
                    comments.map(comment => renderCommentNode(comment))
                )}
            </div>

            {/* Editor Box */}
            <Card className="p-4 border-purple-500/20 bg-purple-500/5">
                <form onSubmit={(e) => handlePostComment(e, null)} className="space-y-4">
                    <div 
                        onClick={handleEditorClick}
                        className="bg-[var(--bg-color)] rounded-xl overflow-hidden border border-[var(--border-color)]"
                    >
                        <ReactQuill
                            ref={quillRef}
                            theme="snow"
                            value={newComment}
                            onChange={setNewComment}
                            modules={quillModules}
                            placeholder="Share progress updates or ask questions..."
                            className="quill-editor"
                        />
                    </div>

                    {showUploader ? (
                        <div className="p-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-wider">Attach Evidence Files</span>
                                <button 
                                    type="button" 
                                    onClick={() => setShowUploader(false)}
                                    className="text-xs text-[var(--text-muted)] hover:text-red-500"
                                >
                                    Hide
                                </button>
                            </div>
                            <EvidenceUploader 
                                documentType="TASK_COMMENT_EVIDENCE" 
                                label="evidence"
                                onUploadComplete={(ids) => setEvidenceIds(ids)} 
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => setShowUploader(true)}
                                className="flex items-center gap-1 text-xs font-semibold text-purple-500 hover:text-purple-400 transition-colors"
                            >
                                <Paperclip size={14} />
                                Attach evidence files ({evidenceIds.length})
                            </button>
                            
                            <Button
                                type="submit"
                                gradient="purple"
                                size="sm"
                                icon={<Send size={14} />}
                                disabled={!newComment.trim() || newComment === '<p><br></p>' || submitting}
                            >
                                {submitting ? 'Posting...' : 'Post Update'}
                            </Button>
                        </div>
                    )}
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

export default TaskComments;
