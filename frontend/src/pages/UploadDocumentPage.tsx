import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { X, FileText, FilePlus, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import { Card, Button } from '../components/common';

const documentTypes = [
    { value: 'OFFER_LETTER', label: 'Offer Letter' },
    { value: 'ONBOARDING', label: 'Onboarding Document' },
    { value: 'TRAINING', label: 'Training Material' },
    { value: 'EVALUATION', label: 'Evaluation Report' },
    { value: 'OTHER', label: 'Other Document' }
];

const UploadDocumentPage: React.FC = () => {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [newDocument, setNewDocument] = useState<{
        title: string;
        document_type: string;
        description: string;
        file: File | null;
    }>({
        title: '',
        document_type: '',
        description: '',
        file: null
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setNewDocument(prev => ({ ...prev, file: e.target.files![0] }));
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDocument.file) {
            setError('Please select a file');
            return;
        }

        setSubmitting(true);
        setError('');
        setSuccess('');

        const formData = new FormData();
        formData.append('title', newDocument.title);
        formData.append('document_type', newDocument.document_type);
        formData.append('description', newDocument.description);
        formData.append('file', newDocument.file);

        const uploadPromise = api.post('/documents/documents/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        toast.promise(uploadPromise, {
            loading: 'Uploading and scanning document...',
            success: () => {
                setSuccess('Document uploaded successfully!');
                setTimeout(() => {
                    navigate('/directory/documents');
                }, 1000);
                return 'Document uploaded successfully';
            },
            error: (err) => {
                setSubmitting(false);
                const apiError = err as { response?: { data?: { detail?: string } } };
                const msg = apiError.response?.data?.detail || 'Failed to upload document';
                setError(msg);
                return msg;
            }
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-6">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm font-medium text-[var(--text-dim)] hover:text-purple-400 transition-colors"
            >
                <ArrowLeft size={16} /> Back to Documents
            </button>

            <div>
                <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2 flex items-center gap-3">
                    <FilePlus className="text-purple-500" />
                    Upload <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Document</span>
                </h1>
                <p className="text-[var(--text-dim)]">Publish resources, contracts, or reference guides to the platform repository.</p>
            </div>

            <Card padding="lg" className="border-purple-500/10">
                <form onSubmit={handleUpload} className="space-y-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                            <X size={16} />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm">
                            {success}
                        </div>
                    )}

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Title *</label>
                        <input
                            type="text"
                            required
                            value={newDocument.title}
                            onChange={e => setNewDocument(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                            placeholder="Document title"
                        />
                    </div>

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Document Type *</label>
                        <select
                            required
                            value={newDocument.document_type}
                            onChange={e => setNewDocument(prev => ({ ...prev, document_type: e.target.value }))}
                            className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all appearance-none cursor-pointer font-medium"
                        >
                            <option value="">Select type...</option>
                            {documentTypes.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">File *</label>
                        <div className="relative">
                            <input
                                type="file"
                                required
                                onChange={handleFileChange}
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.csv"
                                className="hidden"
                                id="file-upload-page"
                            />
                            <label
                                htmlFor="file-upload-page"
                                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--border-color)] rounded-xl cursor-pointer hover:border-purple-500/50 hover:bg-[var(--bg-muted)] transition-all"
                            >
                                {newDocument.file ? (
                                    <div className="flex items-center gap-3">
                                        <FileText size={24} className="text-purple-500" />
                                        <span className="text-[var(--text-main)] whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] font-medium">
                                            {newDocument.file.name}
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        <FilePlus size={24} className="text-[var(--text-muted)] mb-2" />
                                        <span className="text-sm text-[var(--text-dim)] text-center font-medium">Click to upload or drag and drop</span>
                                        <span className="text-xs text-[var(--text-muted)] mt-1">PDF, DOC, DOCX, PPT, PPTX, CSV</span>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Description</label>
                        <textarea
                            value={newDocument.description}
                            onChange={e => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            placeholder="Optional description..."
                            className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none font-medium"
                        />
                    </div>

                    <div className="flex gap-4 pt-6 border-t border-[var(--border-color)]">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => navigate('/directory/documents')}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            gradient="purple"
                            loading={submitting}
                            className="flex-1"
                        >
                            Upload
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default UploadDocumentPage;
