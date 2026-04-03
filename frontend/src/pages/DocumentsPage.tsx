import React, { useEffect, useState } from 'react';
import { Upload, FileText, Download, Trash2, X, FolderOpen, File, FilePlus, Calendar, User, ExternalLink, Search, ChevronDown } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';

interface User {
    id: number;
    full_name: string;
    email: string;
    role: string;
    department?: string;
}

interface Document {
    id: number;
    title: string;
    document_type: string;
    file: string;
    uploaded_by: {
        id: number;
        full_name: string;
        email: string;
        role: string;
    };
    owner: {
        id: number;
        full_name: string;
    } | null;
    description: string;
    created_at: string;
}

const DocumentsPage: React.FC = () => {
    const { user } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDocType, setSelectedDocType] = useState<string>('ALL');
    const [selectedOwnerType, setSelectedOwnerType] = useState<string>('all');
    const [showDocTypeDropdown, setShowDocTypeDropdown] = useState(false);
    const [showOwnerTypeDropdown, setShowOwnerTypeDropdown] = useState(false);

    const [newDocument, setNewDocument] = useState({
        title: '',
        document_type: '',
        file: null as File | null,
        description: '',
    });

    // Document types based on role
    const getDocumentTypes = () => {
        if (user?.role === 'INTERN') {
            return [
                { value: 'RESUME', label: 'Resume' },
                { value: 'GOVERNMENT_ID', label: 'Government ID' },
                { value: 'ACADEMIC_CERTIFICATE', label: 'Academic Certificate' },
                { value: 'INTERNSHIP_CERTIFICATE', label: 'Internship Certificate' },
                { value: 'PROJECT_REPORT', label: 'Project Report' },
                { value: 'PRESENTATION', label: 'Presentation' },
                { value: 'CODE_REPO_LINK', label: 'Code Repository Link' },
                { value: 'PROJECT_COMPLETION', label: 'Project Completion Evidence' },
                { value: 'WEEKLY_PROGRESS', label: 'Weekly Progress Report' },
                { value: 'TASK_SUBMISSION', label: 'Task Submission' },
                { value: 'SELF_ASSESSMENT', label: 'Self Assessment Report' },
                { value: 'RECOMMENDATION_LETTER', label: 'Recommendation Letter' },
                { value: 'ACHIEVEMENT_CERTIFICATE', label: 'Achievement Certificate' },
                { value: 'OTHER', label: 'Other' },
            ];
        } else if (user?.role === 'MANAGER') {
            return [
                { value: 'FEEDBACK_REPORT', label: 'Feedback Report' },
                { value: 'PERFORMANCE_REVIEW', label: 'Performance Review' },
                { value: 'MONTHLY_ASSESSMENT', label: 'Monthly Assessment' },
                { value: 'PROJECT_ASSIGNMENT', label: 'Project Assignment Brief' },
                { value: 'REQUIREMENT_DOC', label: 'Requirement Document' },
                { value: 'SOP_GUIDELINES', label: 'SOP/Guidelines' },
                { value: 'MENTOR_NOTES', label: 'Mentor Notes' },
                { value: 'IMPROVEMENT_PLAN', label: 'Improvement Plan' },
                { value: 'OTHER', label: 'Other' },
            ];
        } else {
            // Admin
            return [
                { value: 'INTERNSHIP_POLICY', label: 'Internship Policy' },
                { value: 'CODE_OF_CONDUCT', label: 'Code of Conduct' },
                { value: 'NDA_TEMPLATE', label: 'NDA Template' },
                { value: 'TALENT_REPORT', label: 'Talent Report' },
                { value: 'ANALYTICS_EXPORT', label: 'Analytics Export' },
                { value: 'AUDIT_LOG', label: 'Audit Log' },
                { value: 'BULK_USER_UPLOAD', label: 'Bulk User Upload CSV' },
                { value: 'ROLE_CONFIG', label: 'Role Configuration' },
                { value: 'OTHER', label: 'Other' },
            ];
        }
    };

    // Get document type counts for dropdown
    const getDocumentTypeCounts = () => {
        const typeCounts: { [key: string]: number } = {};
        const allowedTypes = getDocumentTypes().map(t => t.value);

        // Initialize counts
        allowedTypes.forEach(type => {
            typeCounts[type] = 0;
        });

        // Count documents by type (filtered by owner type)
        documents.forEach(doc => {
            if (allowedTypes.includes(doc.document_type)) {
                if (selectedOwnerType === 'own') {
                    // Check both uploaded_by and owner for the current user
                    if (doc.uploaded_by?.id === user?.id || doc.owner?.id === user?.id) {
                        typeCounts[doc.document_type]++;
                    }
                } else if (selectedOwnerType === 'managers') {
                    if (doc.uploaded_by?.role === 'MANAGER') {
                        typeCounts[doc.document_type]++;
                    }
                } else if (selectedOwnerType === 'interns') {
                    if (doc.uploaded_by?.role === 'INTERN') {
                        typeCounts[doc.document_type]++;
                    }
                } else {
                    typeCounts[doc.document_type]++;
                }
            }
        });

        // Return as array with labels
        return [
            { type: 'ALL', label: 'All Types', count: filteredDocuments.length },
            ...allowedTypes.map(type => ({
                type,
                label: getDocumentTypes().find(t => t.value === type)?.label || type,
                count: typeCounts[type]
            }))
        ];
    };

    const fetchDocuments = async () => {
        try {
            const response = await api.get('/documents/files/');
            setDocuments(response.data);
        } catch (err) {
            console.error('Failed to fetch documents', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, [user?.role]);

    // Apply filters whenever filters or search change
    useEffect(() => {
        applyFilters();
    }, [documents, selectedDocType, selectedOwnerType, searchQuery]);

    const applyFilters = () => {
        let filtered = documents;

        // Filter by document type
        if (selectedDocType !== 'ALL') {
            filtered = filtered.filter(doc => doc.document_type === selectedDocType);
        }

        // Filter by owner type
        if (selectedOwnerType === 'own') {
            filtered = filtered.filter(doc =>
                doc.uploaded_by?.id === user?.id || doc.owner?.id === user?.id
            );
        } else if (selectedOwnerType === 'managers') {
            filtered = filtered.filter(doc => doc.uploaded_by?.role === 'MANAGER');
        } else if (selectedOwnerType === 'interns') {
            filtered = filtered.filter(doc => doc.uploaded_by?.role === 'INTERN');
        }

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(doc =>
                doc.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredDocuments(filtered);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setNewDocument(prev => ({ ...prev, file: e.target.files![0] }));
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDocument.file || !newDocument.title || !newDocument.document_type) {
            setError('Please fill in all required fields');
            return;
        }

        setSubmitting(true);
        setError('');
        setSuccess('');

        try {
            const formData = new FormData();
            formData.append('title', newDocument.title);
            formData.append('document_type', newDocument.document_type);
            formData.append('file', newDocument.file);
            formData.append('description', newDocument.description);

            await api.post('/documents/files/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setSuccess('Document uploaded successfully!');
            setShowUploadModal(false);
            setNewDocument({ title: '', document_type: '', file: null, description: '' });
            fetchDocuments();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to upload document');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this document?')) return;

        try {
            await api.delete(`/documents/files/${id}/`);
            fetchDocuments();
        } catch (err) {
            console.error('Failed to delete document', err);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getTypeLabel = (type: string) => {
        const types = getDocumentTypes();
        return types.find(t => t.value === type)?.label || type;
    };

    const getFileIcon = (type: string) => {
        switch (type) {
            case 'RESUME':
            case 'ACADEMIC_CERTIFICATE':
            case 'INTERNSHIP_CERTIFICATE':
            case 'ACHIEVEMENT_CERTIFICATE':
                return <FileText size={20} className="text-purple-500" />;
            case 'PROJECT_REPORT':
            case 'WEEKLY_PROGRESS':
            case 'TASK_SUBMISSION':
                return <File size={20} className="text-blue-500" />;
            default:
                return <File size={20} className="text-[var(--text-dim)]" />;
        }
    };

    const documentTypeOptions = getDocumentTypeCounts();
    const ownerTypeOptions = getOwnerTypeFilters();
    const selectedDocTypeLabel = documentTypeOptions.find(o => o.type === selectedDocType)?.label || 'All Types';

    function getOwnerTypeFilters() {
        if (user?.role === 'ADMIN') {
            return [
                { value: 'all', label: 'All Documents' },
                { value: 'own', label: 'My Documents' },
                { value: 'managers', label: 'Managers' },
                { value: 'interns', label: 'Interns' },
            ];
        } else if (user?.role === 'MANAGER') {
            return [
                { value: 'all', label: 'All Documents' },
                { value: 'own', label: 'My Documents' },
                { value: 'interns', label: 'My Interns' },
            ];
        } else {
            return [
                { value: 'own', label: 'My Documents' },
            ];
        }
    }

    const selectedOwnerTypeLabel = ownerTypeOptions.find(o => o.value === selectedOwnerType)?.label || 'All Documents';

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-purple-500/10 border-t-purple-500 rounded-full animate-spin"></div>
                    <p className="text-[var(--text-dim)] animate-pulse">Loading documents...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2">
                        Document <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Center</span>
                    </h1>
                    <p className="text-[var(--text-dim)]">Manage and organize your documents</p>
                </div>
                <Button
                    onClick={() => setShowUploadModal(true)}
                    gradient="purple"
                    icon={<Upload size={18} />}
                >
                    Upload Document
                </Button>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-4">
                {/* Owner Type Dropdown */}
                {ownerTypeOptions.length > 1 && (
                    <div className="relative">
                        <button
                            onClick={() => setShowOwnerTypeDropdown(!showOwnerTypeDropdown)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] hover:border-purple-500/50 transition-all"
                        >
                            <span className="text-[var(--text-dim)]">Filter by:</span>
                            <span className="font-medium">{selectedOwnerTypeLabel}</span>
                            <ChevronDown size={16} className={`text-[var(--text-dim)] transition-transform ${showOwnerTypeDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showOwnerTypeDropdown && (
                            <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl shadow-xl z-20 overflow-hidden">
                                {ownerTypeOptions.map(option => (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            setSelectedOwnerType(option.value);
                                            setShowOwnerTypeDropdown(false);
                                        }}
                                        className={`w-full px-4 py-3 text-left hover:bg-[var(--bg-muted)] transition-colors ${selectedOwnerType === option.value ? 'text-purple-600 dark:text-purple-400 bg-purple-500/10' : 'text-[var(--text-main)]'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Document Type Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowDocTypeDropdown(!showDocTypeDropdown)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] hover:border-purple-500/50 transition-all"
                    >
                        <span className="text-[var(--text-dim)]">Type:</span>
                        <span className="font-medium">{selectedDocTypeLabel}</span>
                        <ChevronDown size={16} className={`text-[var(--text-dim)] transition-transform ${showDocTypeDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showDocTypeDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-72 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl shadow-xl z-20 overflow-hidden max-h-80 overflow-y-auto">
                            {documentTypeOptions.map(option => (
                                <button
                                    key={option.type}
                                    onClick={() => {
                                        setSelectedDocType(option.type);
                                        setShowDocTypeDropdown(false);
                                    }}
                                    className={`w-full px-4 py-3 text-left hover:bg-[var(--bg-muted)] transition-colors flex items-center justify-between ${selectedDocType === option.type ? 'text-purple-600 dark:text-purple-400 bg-purple-500/10' : 'text-[var(--text-main)]'
                                        }`}
                                >
                                    <span>{option.label}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${option.count > 0 ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300' : 'bg-[var(--bg-muted)] text-[var(--text-muted)]'
                                        }`}>
                                        {option.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-2.5 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                    />
                </div>
            </div>

            {/* Documents Grid */}
            {filteredDocuments.length === 0 ? (
                <Card className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 bg-[var(--bg-muted)] rounded-2xl flex items-center justify-center">
                        <FolderOpen size={32} className="text-[var(--text-muted)]" />
                    </div>
                    <h3 className="text-lg font-medium text-[var(--text-main)] mb-2">No documents found</h3>
                    <p className="text-[var(--text-dim)] mb-6">
                        {searchQuery ? 'Try adjusting your search criteria' : 'Upload your first document to get started'}
                    </p>
                    {!searchQuery && (
                        <Button
                            onClick={() => setShowUploadModal(true)}
                            gradient="purple"
                            icon={<Upload size={18} />}
                        >
                            Upload Document
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDocuments.map((doc) => (
                        <Card key={doc.id} hover className="group">
                            <div className="flex items-start gap-4">
                                {/* File Icon */}
                                <div className="relative">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-0 group-hover:opacity-40 transition-opacity"></div>
                                    <div className="relative w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center border border-purple-500/20">
                                        {getFileIcon(doc.document_type)}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-[var(--text-main)] group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors truncate">
                                        {doc.title}
                                    </h3>
                                    <Badge variant="purple" size="sm" className="mt-1">
                                        {getTypeLabel(doc.document_type)}
                                    </Badge>
                                </div>
                            </div>

                            {/* Description */}
                            {doc.description && (
                                <p className="text-sm text-[var(--text-dim)] mt-4 line-clamp-2">
                                    {doc.description}
                                </p>
                            )}

                            {/* Meta Info */}
                            <div className="mt-4 space-y-2">
                                <div className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
                                    <User size={14} className="text-purple-500" />
                                    <span>Uploaded by {doc.uploaded_by?.full_name || 'Unknown'}</span>
                                    {doc.uploaded_by?.role === 'MANAGER' && (
                                        <Badge variant="indigo" size="sm">Manager</Badge>
                                    )}
                                    {doc.uploaded_by?.role === 'INTERN' && (
                                        <Badge variant="success" size="sm">Intern</Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
                                    <Calendar size={14} className="text-purple-500" />
                                    <span>{formatDate(doc.created_at)}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-color)]">
                                <a
                                    href={doc.file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                                >
                                    <ExternalLink size={14} />
                                    View
                                </a>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={doc.file}
                                        download
                                        className="p-2 text-[var(--text-dim)] hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all"
                                    >
                                        <Download size={16} />
                                    </a>
                                    <button
                                        onClick={() => handleDelete(doc.id)}
                                        className="p-2 text-[var(--text-dim)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Modal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                title="Upload Document"
                size="md"
            >
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
                            className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                            placeholder="Document title"
                        />
                    </div>

                    <div className="group">
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Document Type *</label>
                        <select
                            required
                            value={newDocument.document_type}
                            onChange={e => setNewDocument(prev => ({ ...prev, document_type: e.target.value }))}
                            className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">Select type...</option>
                            {getDocumentTypes().map(type => (
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
                                id="file-upload"
                            />
                            <label
                                htmlFor="file-upload"
                                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--border-color)] rounded-xl cursor-pointer hover:border-purple-500/50 hover:bg-[var(--bg-muted)] transition-all"
                            >
                                {newDocument.file ? (
                                    <div className="flex items-center gap-3">
                                        <FileText size={24} className="text-purple-500" />
                                        <span className="text-[var(--text-main)] whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                                            {newDocument.file.name}
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        <FilePlus size={24} className="text-[var(--text-muted)] mb-2" />
                                        <span className="text-sm text-[var(--text-dim)] text-center">Click to upload or drag and drop</span>
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
                            className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowUploadModal(false)}
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
                            Upload
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default DocumentsPage;
