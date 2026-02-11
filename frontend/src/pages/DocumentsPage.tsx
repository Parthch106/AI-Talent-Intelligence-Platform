import React, { useEffect, useState } from 'react';
import { Upload, FileText, Download, Trash2, X, FolderOpen } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

interface User {
    id: number;
    full_name: string;
    email: string;
    role: string;
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
    const [interns, setInterns] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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

    const fetchInterns = async () => {
        try {
            if (user?.role === 'MANAGER') {
                const response = await api.get('/interns/profiles/');
                setInterns(response.data.map((p: any) => p.user));
            } else if (user?.role === 'ADMIN') {
                const response = await api.get('/accounts/users/');
                const allInterns = response.data.filter((u: User) => u.role === 'INTERN');
                setInterns(allInterns);
            }
        } catch (err) {
            console.error('Failed to fetch interns', err);
        }
    };

    useEffect(() => {
        fetchDocuments();
        fetchInterns();
    }, [user?.role]);

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

    if (loading) return <div>Loading documents...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Documents</h2>
                <button
                    onClick={() => setShowUploadModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Upload size={18} /> Upload Document
                </button>
            </div>

            {documents.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                    <FolderOpen size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>No documents found.</p>
                </div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-dim)', fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '1rem' }}>Document</th>
                                <th style={{ padding: '1rem' }}>Type</th>
                                <th style={{ padding: '1rem' }}>Owner</th>
                                <th style={{ padding: '1rem' }}>Uploaded By</th>
                                <th style={{ padding: '1rem' }}>Date</th>
                                <th style={{ padding: '1rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map((doc) => (
                                <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '8px',
                                                background: 'var(--card-bg)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <FileText size={20} color="var(--primary-color)" />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 500 }}>{doc.title}</div>
                                                {doc.description && (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{doc.description}</div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '0.25rem',
                                            background: 'rgba(99, 102, 241, 0.1)',
                                            color: 'var(--primary-color)',
                                            fontSize: '0.75rem'
                                        }}>
                                            {getTypeLabel(doc.document_type)}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {doc.owner ? (
                                            <span style={{ color: 'var(--text)' }}>{doc.owner.full_name}</span>
                                        ) : (
                                            <span style={{ color: 'var(--text-dim)' }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div>{doc.uploaded_by?.full_name || 'N/A'}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                            {doc.uploaded_by?.email}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>{formatDate(doc.created_at)}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <a
                                                href={doc.file}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: 'var(--primary-color)', textDecoration: 'none' }}
                                            >
                                                <Download size={18} />
                                            </a>
                                            <button
                                                onClick={() => handleDelete(doc.id)}
                                                style={{ background: 'transparent', color: '#ef4444', padding: 0 }}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
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
                            <h3 style={{ margin: 0 }}>Upload Document</h3>
                            <button onClick={() => setShowUploadModal(false)} style={{ background: 'transparent', padding: '0.5rem' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {error && (
                            <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>
                                {error}
                            </div>
                        )}
                        {success && (
                            <div style={{ color: '#10b981', marginBottom: '1rem', fontSize: '0.875rem' }}>
                                {success}
                            </div>
                        )}

                        <form onSubmit={handleUpload}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={newDocument.title}
                                    onChange={e => setNewDocument(prev => ({ ...prev, title: e.target.value }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Document Type *</label>
                                <select
                                    required
                                    value={newDocument.document_type}
                                    onChange={e => setNewDocument(prev => ({ ...prev, document_type: e.target.value }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                >
                                    <option value="">Select type...</option>
                                    {getDocumentTypes().map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>File *</label>
                                <input
                                    type="file"
                                    required
                                    onChange={handleFileChange}
                                    accept=".pdf,.doc,.docx,.ppt,.pptx,.csv"
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Description</label>
                                <textarea
                                    value={newDocument.description}
                                    onChange={e => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    placeholder="Optional description..."
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowUploadModal(false)}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.25rem', border: 'none', background: 'var(--primary-color)', color: 'white', cursor: 'pointer' }}
                                >
                                    {submitting ? 'Uploading...' : 'Upload'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentsPage;
