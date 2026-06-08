import React, { useEffect, useRef, useState, useCallback } from 'react';
import { UserPlus, Search, Shield, Building, X, Trash2, ChevronDown, ChevronUp, Save, Upload, Download, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';

interface AdminUser {
    id: number;
    email: string;
    full_name: string;
    role: string;
    department: string;
    can_create_project?: boolean;
    can_assign_tasks?: boolean;
}

const AdminManagement: React.FC = () => {
    const { user } = useAuth();
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Bulk Upload States
    const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [adminFormData, setAdminFormData] = useState({
        email: '',
        full_name: '',
        password: '',
        department: '',
        can_create_project: true,
        can_assign_tasks: true,
    });
    const [editingAdminId, setEditingAdminId] = useState<number | null>(null);
    const [openDeptDropdown, setOpenDeptDropdown] = useState<'inline' | 'modal' | null>(null);

    const deptDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target as Node)) {
                setOpenDeptDropdown(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetchAdmins = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/accounts/managers/');
            setAdmins(response.data);
        } catch (err) {
            console.error('Failed to fetch admins:', err);
            toast.error('Failed to load admins');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchDepartments = useCallback(async () => {
        const defaultDepts = [
            "Development (Web/Application)",
            "AI/ML Department",
            "Data Analytics",
            "Cloud & DevOps",
            "UI/UX",
            "SOC",
            "VAPT"
        ];
        try {
            const response = await api.get('/accounts/departments/');
            const fetched = response.data.departments || [];
            const merged = Array.from(new Set([...defaultDepts, ...fetched])).sort();
            setDepartments(merged);
        } catch (err) {
            console.error('Failed to fetch departments:', err);
            setDepartments(defaultDepts);
        }
    }, []);

    useEffect(() => {
        if (user?.role === 'ADMIN') {
            fetchAdmins();
            fetchDepartments();
        }
    }, [user, fetchAdmins, fetchDepartments]);

    const handleSubmitAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            if (editingAdminId) {
                // Remove password if empty for edit
                const patchData: Partial<typeof adminFormData> = { ...adminFormData };
                if (!patchData.password) {
                    delete patchData.password;
                }
                await api.patch(`/accounts/managers/${editingAdminId}/`, patchData);
                toast.success('Admin settings updated successfully');
            } else {
                await api.post('/accounts/managers/', adminFormData);
                toast.success('Admin created successfully');
            }
            setShowAddModal(false);
            setAdminFormData({ email: '', full_name: '', password: '', department: '', can_create_project: true, can_assign_tasks: true });
            setEditingAdminId(null);
            fetchAdmins();
        } catch (err) {
            const e = err as { response?: { data?: { email?: string[], error?: string } } };
            const errorMsg = e.response?.data?.email?.[0] || e.response?.data?.error || 'Failed to save admin';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const toggleEditAdmin = (admin: AdminUser) => {
        if (editingAdminId === admin.id) {
            setEditingAdminId(null);
        } else {
            setAdminFormData({
                email: admin.email,
                full_name: admin.full_name,
                password: '', // Leave blank when editing
                department: admin.department || '',
                can_create_project: admin.can_create_project ?? true,
                can_assign_tasks: admin.can_assign_tasks ?? true,
            });
            setEditingAdminId(admin.id);
        }
    };

    const handleDeleteAdmin = async (id: number) => {
        if (window.confirm('Are you sure you want to remove this Admin? This action cannot be undone.')) {
            try {
                await api.delete(`/accounts/managers/${id}/`);
                toast.success('Admin removed successfully');
                fetchAdmins();
            } catch {
                toast.error('Failed to remove admin');
            }
        }
    };

    const filteredAdmins = admins.filter(admin => 
        admin.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin.department?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getInitials = (name: string) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'NA';
    };

    const handleDownloadTemplate = () => {
        const headers = ['email', 'full_name', 'department', 'can_create_project', 'can_assign_tasks'];
        const csvContent = 'data:text/csv;charset=utf-8,' + headers.join(',') + '\n' +
            'manager1@example.com,John Doe,Development (Web/Application),true,true\n' +
            'manager2@example.com,Jane Smith,,,';
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'admin_bulk_upload_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleBulkUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile) {
            toast.error('Please select a file to upload');
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        
        // Simulate progress for UI engagement
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) return prev;
                return prev + Math.floor(Math.random() * 10) + 5;
            });
        }, 300);

        const formData = new FormData();
        formData.append('file', uploadFile);

        const uploadPromise = api.post('/accounts/managers/bulk-upload/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        toast.promise(uploadPromise, {
            loading: 'Uploading and creating admins...',
            success: (response) => {
                clearInterval(progressInterval);
                setUploadProgress(100);
                setTimeout(() => {
                    fetchAdmins();
                    setShowBulkUploadModal(false);
                    setUploadFile(null);
                    setUploading(false);
                    setUploadProgress(0);
                }, 500);
                
                let msg = response.data.message || 'Admins uploaded successfully';
                if (response.data.errors && response.data.errors.length > 0) {
                    msg += ` (${response.data.errors.length} skipped)`;
                    console.warn('Upload errors:', response.data.errors);
                }
                return msg;
            },
            error: (err) => {
                clearInterval(progressInterval);
                setUploading(false);
                setUploadProgress(0);
                return err.response?.data?.error || 'Failed to upload admins';
            }
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                    <p className="text-[var(--text-muted)] animate-pulse">Loading admins...</p>
                </div>
            </div>
        );
    }

    if (user?.role !== 'ADMIN') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <Shield size={64} className="text-red-500/50 mb-4" />
                <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Access Denied</h2>
                <p className="text-[var(--text-dim)]">Only Super Admins can access this page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in p-2 md:p-6 lg:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2">
                        Admin <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Management</span>
                    </h1>
                    <p className="text-[var(--text-dim)]">Manage platform administrators and their access</p>
                </div>
                <div className="flex gap-3">
                    <Button 
                        onClick={() => setShowBulkUploadModal(true)}
                        variant="outline"
                        icon={<Upload size={18} />}
                    >
                        Bulk Upload
                    </Button>
                    <Button 
                        onClick={() => {
                            setEditingAdminId(null);
                            setAdminFormData({ email: '', full_name: '', password: '', department: '', can_create_project: true, can_assign_tasks: true });
                            setShowAddModal(true);
                        }} 
                        gradient="blue" 
                        icon={<UserPlus size={18} />}
                    >
                        Create Admin
                    </Button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-indigo-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search admins by name, email, or department..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    />
                </div>
            </div>

            {/* List Layout */}
            <div className="flex flex-col gap-4">
                {filteredAdmins.length === 0 ? (
                    <Card className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 bg-[var(--bg-muted)] rounded-full flex items-center justify-center">
                            <Shield size={24} className="text-[var(--text-muted)]" />
                        </div>
                        <h3 className="text-lg font-medium text-[var(--text-main)] mb-2">No admins found</h3>
                        <p className="text-[var(--text-dim)]">Create an admin to grant management access</p>
                    </Card>
                ) : (
                    filteredAdmins.map((admin) => (
                        <Card key={admin.id} className="p-0 overflow-hidden">
                            {/* Row Header */}
                            <div 
                                className={`p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer transition-colors ${editingAdminId === admin.id ? 'bg-[var(--bg-muted)]/30' : 'hover:bg-[var(--bg-muted)]/10'}`}
                                onClick={() => toggleEditAdmin(admin)}
                            >
                                <div className="flex items-center gap-4 flex-1 w-full">
                                    <div className="relative shrink-0">
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-40"></div>
                                        <div className="relative w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                            {getInitials(admin.full_name || '')}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-[var(--text-main)] truncate text-lg">
                                            {admin.full_name || 'N/A'}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <p className="text-sm text-[var(--text-dim)] truncate">{admin.email || 'N/A'}</p>
                                            <Badge variant="purple" className="text-xs shrink-0">Admin</Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                    <div className="flex flex-wrap items-center justify-end gap-2 max-w-[250px] md:max-w-md">
                                        {admin.department ? (
                                            admin.department.split(',').map((dept, idx) => (
                                                <div key={idx} className="flex items-center gap-1.5 text-sm text-[var(--text-dim)] bg-[var(--bg-muted)] px-3 py-1.5 rounded-lg border border-[var(--border-color)]">
                                                    <Building size={14} className="text-indigo-400" />
                                                    <span className="truncate max-w-[120px]">{dept.trim()}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-sm text-[var(--text-dim)] bg-[var(--bg-muted)] px-3 py-1.5 rounded-lg border border-[var(--border-color)]">
                                                <Building size={14} className="text-indigo-400" />
                                                <span>All Departments</span>
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                        className="p-2 text-[var(--text-muted)] hover:text-indigo-400 transition-colors"
                                        aria-label="Expand settings"
                                    >
                                        {editingAdminId === admin.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Settings Panel */}
                            {editingAdminId === admin.id && (
                                <div className="p-4 md:p-6 border-t border-[var(--border-color)] bg-[var(--bg-color)] animate-fade-in">
                                    <form onSubmit={handleSubmitAdmin} className="space-y-6">
                                        {error && (
                                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                                                <X size={16} />
                                                {error}
                                            </div>
                                        )}
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="group">
                                                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Full Name *</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={adminFormData.full_name}
                                                    onChange={e => setAdminFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                                    className="w-full px-4 py-2.5 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                                    placeholder="Admin Name"
                                                />
                                            </div>

                                            <div className="group">
                                                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Email *</label>
                                                <input
                                                    type="email"
                                                    required
                                                    value={adminFormData.email}
                                                    onChange={e => setAdminFormData(prev => ({ ...prev, email: e.target.value }))}
                                                    className="w-full px-4 py-2.5 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                                    placeholder="admin@example.com"
                                                />
                                            </div>

                                            <div className="group">
                                                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">
                                                    New Password (leave blank to keep current)
                                                </label>
                                                <input
                                                    type="password"
                                                    minLength={8}
                                                    value={adminFormData.password}
                                                    onChange={e => setAdminFormData(prev => ({ ...prev, password: e.target.value }))}
                                                    className="w-full px-4 py-2.5 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                                    placeholder="••••••••"
                                                />
                                            </div>

                                            <div className="group">
                                                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Department</label>
                                                
                                                {adminFormData.department && (
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        {adminFormData.department.split(',').map(d => d.trim()).filter(Boolean).map(dept => (
                                                            <Badge key={dept} variant="purple" className="flex items-center gap-1.5 px-2 py-1">
                                                                {dept}
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => {
                                                                        const newDepts = adminFormData.department.split(',').map(d => d.trim()).filter(d => d && d !== dept);
                                                                        setAdminFormData(prev => ({ ...prev, department: newDepts.join(', ') }));
                                                                    }}
                                                                    className="hover:text-red-400 transition-colors"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => setOpenDeptDropdown(openDeptDropdown === 'inline' ? null : 'inline')}
                                                            className="w-full flex items-center gap-3 pl-10 pr-4 py-2.5 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-muted)] hover:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                                                        >
                                                            <Building size={15} className="absolute left-3 text-[var(--text-muted)]" />
                                                            <span className="flex-1 text-left">Add a department...</span>
                                                            <ChevronDown size={15} className={`text-[var(--text-muted)] transition-transform duration-200 ${openDeptDropdown === 'inline' ? 'rotate-180' : ''}`} />
                                                        </button>

                                                        {openDeptDropdown === 'inline' && (
                                                            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[var(--bg-color)] border border-indigo-500/30 rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-scale-in">
                                                                <div className="py-1 max-h-[220px] overflow-y-auto custom-scrollbar">
                                                                    {departments.map(dept => {
                                                                        const currentDepts = adminFormData.department.split(',').map(d => d.trim()).filter(Boolean);
                                                                        const isSelected = currentDepts.includes(dept);
                                                                        return (
                                                                            <button
                                                                                key={dept}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    if (!isSelected) {
                                                                                        setAdminFormData(prev => ({ ...prev, department: [...currentDepts, dept].join(', ') }));
                                                                                    }
                                                                                    setOpenDeptDropdown(null);
                                                                                }}
                                                                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all ${
                                                                                    isSelected
                                                                                        ? 'text-indigo-400 bg-indigo-500/10 cursor-default'
                                                                                        : 'text-[var(--text-main)] hover:bg-indigo-500/10 hover:text-indigo-300'
                                                                                }`}
                                                                            >
                                                                                <span>{dept}</span>
                                                                                {isSelected && (
                                                                                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                                                )}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-[var(--border-color)]">
                                            <h3 className="text-sm font-semibold text-[var(--text-main)] mb-4">Access Permissions</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <label className="flex items-center gap-3 cursor-pointer group bg-[var(--bg-muted)]/50 p-3 rounded-xl hover:bg-[var(--bg-muted)] transition-colors">
                                                    <div className="relative flex items-center">
                                                        <input 
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={adminFormData.can_create_project}
                                                            onChange={(e) => setAdminFormData(prev => ({ ...prev, can_create_project: e.target.checked }))}
                                                        />
                                                        <div className="w-10 h-5 bg-[var(--bg-color)] border border-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500 peer-checked:border-indigo-500"></div>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-[var(--text-main)]">Can Create Projects</span>
                                                        <span className="text-xs text-[var(--text-dim)]">Allow this admin to create new projects.</span>
                                                    </div>
                                                </label>

                                                <label className="flex items-center gap-3 cursor-pointer group bg-[var(--bg-muted)]/50 p-3 rounded-xl hover:bg-[var(--bg-muted)] transition-colors">
                                                    <div className="relative flex items-center">
                                                        <input 
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={adminFormData.can_assign_tasks}
                                                            onChange={(e) => setAdminFormData(prev => ({ ...prev, can_assign_tasks: e.target.checked }))}
                                                        />
                                                        <div className="w-10 h-5 bg-[var(--bg-color)] border border-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500 peer-checked:border-indigo-500"></div>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-[var(--text-main)]">Can Assign Tasks</span>
                                                        <span className="text-xs text-[var(--text-dim)]">Allow this admin to assign interns to tasks.</span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--border-color)]">
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteAdmin(admin.id)}
                                                className="flex items-center gap-2 px-4 py-2 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors w-full sm:w-auto justify-center"
                                            >
                                                <Trash2 size={16} />
                                                <span>Remove Admin</span>
                                            </button>
                                            <div className="flex gap-3 w-full sm:w-auto">
                                                <Button type="button" variant="ghost" onClick={() => setEditingAdminId(null)} fullWidth>
                                                    Cancel
                                                </Button>
                                                <Button type="submit" gradient="blue" loading={submitting} icon={<Save size={16} />} fullWidth>
                                                    Save Changes
                                                </Button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </Card>
                    ))
                )}
            </div>

            {/* Create Admin Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Create New Admin"
                size="md"
                gradient="blue"
            >
                <form onSubmit={handleSubmitAdmin} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                            <X size={16} />
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Full Name *</label>
                            <input
                                type="text"
                                required
                                value={adminFormData.full_name}
                                onChange={e => setAdminFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                placeholder="Admin Name"
                            />
                        </div>

                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Email *</label>
                            <input
                                type="email"
                                required
                                value={adminFormData.email}
                                onChange={e => setAdminFormData(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                placeholder="admin@example.com"
                            />
                        </div>

                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Password *</label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={adminFormData.password}
                                onChange={e => setAdminFormData(prev => ({ ...prev, password: e.target.value }))}
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                placeholder="••••••••"
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-1">Minimum 8 characters</p>
                        </div>

                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Department</label>
                            
                            {adminFormData.department && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {adminFormData.department.split(',').map(d => d.trim()).filter(Boolean).map(dept => (
                                        <Badge key={dept} variant="purple" className="flex items-center gap-1.5 px-2 py-1">
                                            {dept}
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    const newDepts = adminFormData.department.split(',').map(d => d.trim()).filter(d => d && d !== dept);
                                                    setAdminFormData(prev => ({ ...prev, department: newDepts.join(', ') }));
                                                }}
                                                className="hover:text-red-400 transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <button
                                        type="button"
                                        onClick={() => setOpenDeptDropdown(openDeptDropdown === 'modal' ? null : 'modal')}
                                        className="w-full flex items-center gap-3 pl-12 pr-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-muted)] hover:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                                    >
                                        <Building size={18} className="absolute left-4 text-[var(--text-muted)]" />
                                        <span className="flex-1 text-left">Add a department...</span>
                                        <ChevronDown size={16} className={`text-[var(--text-muted)] transition-transform duration-200 ${openDeptDropdown === 'modal' ? 'rotate-180' : ''}`} />
                                    </button>

                                    {openDeptDropdown === 'modal' && (
                                        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[var(--bg-color)] border border-indigo-500/30 rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-scale-in">
                                            <div className="py-1 max-h-[240px] overflow-y-auto custom-scrollbar">
                                                {departments.map(dept => {
                                                    const currentDepts = adminFormData.department.split(',').map(d => d.trim()).filter(Boolean);
                                                    const isSelected = currentDepts.includes(dept);
                                                    return (
                                                        <button
                                                            key={dept}
                                                            type="button"
                                                            onClick={() => {
                                                                if (!isSelected) {
                                                                    setAdminFormData(prev => ({ ...prev, department: [...currentDepts, dept].join(', ') }));
                                                                }
                                                                setOpenDeptDropdown(null);
                                                            }}
                                                            className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-all ${
                                                                isSelected
                                                                    ? 'text-indigo-400 bg-indigo-500/10 cursor-default'
                                                                    : 'text-[var(--text-main)] hover:bg-indigo-500/10 hover:text-indigo-300'
                                                            }`}
                                                        >
                                                            <span>{dept}</span>
                                                            {isSelected && (
                                                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                        </div>

                        <div className="pt-4 border-t border-[var(--border-color)] space-y-4">
                            <h3 className="text-sm font-semibold text-[var(--text-main)]">Access Permissions</h3>
                            
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input 
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={adminFormData.can_create_project}
                                        onChange={(e) => setAdminFormData(prev => ({ ...prev, can_create_project: e.target.checked }))}
                                    />
                                    <div className="w-10 h-5 bg-[var(--bg-muted)] border border-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500 peer-checked:border-indigo-500"></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-[var(--text-main)]">Can Create Projects</span>
                                    <span className="text-xs text-[var(--text-dim)]">Allow this admin to create new projects and define modules.</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input 
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={adminFormData.can_assign_tasks}
                                        onChange={(e) => setAdminFormData(prev => ({ ...prev, can_assign_tasks: e.target.checked }))}
                                    />
                                    <div className="w-10 h-5 bg-[var(--bg-muted)] border border-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500 peer-checked:border-indigo-500"></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-[var(--text-main)]">Can Assign Tasks</span>
                                    <span className="text-xs text-[var(--text-dim)]">Allow this admin to assign interns to projects and tasks.</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)} fullWidth>
                            Cancel
                        </Button>
                        <Button type="submit" gradient="blue" loading={submitting} fullWidth>
                            Create Admin
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Bulk Upload Modal */}
            <Modal
                isOpen={showBulkUploadModal}
                onClose={() => {
                    setShowBulkUploadModal(false);
                    setUploadFile(null);
                }}
                title="Bulk Upload Admins"
                size="md"
            >
                <div className="space-y-6">
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                        <div className="flex gap-3">
                            <FileText className="text-indigo-400 shrink-0" size={20} />
                            <div>
                                <h3 className="text-sm font-bold text-indigo-400 mb-1">CSV Format Required</h3>
                                <p className="text-xs text-[var(--text-dim)] mb-3">
                                    Required headers: <code className="text-indigo-300">email</code>, <code className="text-indigo-300">full_name</code>.<br/>
                                    Optional headers: <code className="text-indigo-300">department</code>, <code className="text-indigo-300">can_create_project</code>, <code className="text-indigo-300">can_assign_tasks</code>.
                                </p>
                                <Button 
                                    onClick={handleDownloadTemplate} 
                                    variant="outline" 
                                    size="sm" 
                                    icon={<Download size={14} />}
                                >
                                    Download Template
                                </Button>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleBulkUpload} className="space-y-4">
                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">CSV File *</label>
                            {uploading ? (
                                <div className="relative border-2 border-dashed border-[var(--border-color)] rounded-xl p-8 text-center transition-all duration-300">
                                    <div className="max-w-xs mx-auto">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-[var(--text-main)]">Uploading...</span>
                                            <span className="text-sm font-bold text-blue-400">{uploadProgress}%</span>
                                        </div>
                                        <div className="w-full h-3 bg-[var(--bg-muted)] rounded-full overflow-hidden shadow-inner">
                                            <div 
                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ease-out relative"
                                                style={{ width: `${uploadProgress}%` }}
                                            >
                                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)] mt-4 animate-pulse">Processing bulk records and generating secure access tokens...</p>
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer group ${uploadFile ? 'border-green-500 bg-green-500/5' : 'border-[var(--border-color)] hover:border-indigo-500/50'}`}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input 
                                        type="file" 
                                        accept=".csv" 
                                        className="hidden" 
                                        ref={fileInputRef}
                                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                    />
                                    
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors ${uploadFile ? 'bg-green-500/20 text-green-500' : 'bg-[var(--bg-muted)] group-hover:bg-indigo-500/10 text-[var(--text-muted)] group-hover:text-indigo-400'}`}>
                                        <Upload size={24} />
                                    </div>
                                    
                                    <h4 className={`text-sm font-bold mb-1 ${uploadFile ? 'text-green-500' : 'text-[var(--text-main)]'}`}>
                                        {uploadFile ? uploadFile.name : 'Click to select CSV file'}
                                    </h4>
                                    <p className={`text-xs ${uploadFile ? 'text-green-500/80 font-medium' : 'text-[var(--text-dim)]'}`}>
                                        {uploadFile ? 'File uploaded and ready!' : 'Only .csv files are supported'}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="ghost" onClick={() => { setShowBulkUploadModal(false); setUploadFile(null); }} fullWidth>
                                Cancel
                            </Button>
                            <Button type="submit" gradient="blue" loading={uploading} disabled={!uploadFile} fullWidth>
                                Upload & Create
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
};

export default AdminManagement;
