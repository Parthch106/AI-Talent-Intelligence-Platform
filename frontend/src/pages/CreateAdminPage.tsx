import React, { useState, useEffect } from 'react';
import { UserPlus, Upload, Shield, Building, X, ChevronDown, ArrowLeft, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';

const CreateAdminPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
    const [submitting, setSubmitting] = useState(false);
    
    // Single Admin State
    const [adminFormData, setAdminFormData] = useState({
        email: '',
        full_name: '',
        password: '',
        department: '',
        can_create_project: true,
        can_assign_tasks: true,
    });
    const [departments, setDepartments] = useState<string[]>([]);
    const [openDeptDropdown, setOpenDeptDropdown] = useState<boolean>(false);

    // Bulk Upload State
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        const fetchDepartments = async () => {
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
        };
        fetchDepartments();
    }, []);

    const handleSubmitAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await api.post('/accounts/managers/', adminFormData);
            toast.success('Admin created successfully');
            navigate('/management/admins');
        } catch (err) {
            const error = err as { response?: { data?: { email?: string[], error?: string } } };
            const errorMsg = error.response?.data?.email?.[0] || error.response?.data?.error || 'Failed to save admin';
            toast.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
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
                    navigate('/management/admins');
                }, 1000);
                
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
        <div className="max-w-4xl mx-auto space-y-6 p-6 animate-fade-in">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => navigate('/management/admins')}
                    className="p-2 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/30 transition-all text-[var(--text-muted)]"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">
                        Create Admin
                    </h1>
                    <p className="text-[var(--text-dim)]">Add new administrators to the platform</p>
                </div>
            </div>

            <div className="flex gap-4 border-b border-[var(--border-color)] pb-4">
                <button 
                    onClick={() => setActiveTab('single')}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                        activeTab === 'single' 
                            ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                            : 'bg-[var(--bg-muted)] text-[var(--text-dim)] hover:bg-[var(--bg-color)]'
                    }`}
                >
                    <UserPlus size={16} />
                    Single Registration
                </button>
                <button 
                    onClick={() => setActiveTab('bulk')}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                        activeTab === 'bulk' 
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                            : 'bg-[var(--bg-muted)] text-[var(--text-dim)] hover:bg-[var(--bg-color)]'
                    }`}
                >
                    <Users size={16} />
                    Bulk Upload
                </button>
            </div>

            <div className="mt-6">
                {activeTab === 'single' ? (
                    <Card className="p-8 border-indigo-500/20">
                        <form onSubmit={handleSubmitAdmin} className="space-y-6">
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
                                                onClick={() => setOpenDeptDropdown(!openDeptDropdown)}
                                                className="w-full flex items-center gap-3 pl-12 pr-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-muted)] hover:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                                            >
                                                <Building size={18} className="absolute left-4 text-[var(--text-muted)]" />
                                                <span className="flex-1 text-left">Add a department...</span>
                                                <ChevronDown size={16} className={`text-[var(--text-muted)] transition-transform duration-200 ${openDeptDropdown ? 'rotate-180' : ''}`} />
                                            </button>

                                            {openDeptDropdown && (
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
                                                                        setOpenDeptDropdown(false);
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
                            </div>

                            <div className="pt-6 border-t border-[var(--border-color)] space-y-4">
                                <h3 className="text-sm font-semibold text-[var(--text-main)]">Access Permissions</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="flex items-center gap-3 cursor-pointer group bg-[var(--bg-muted)]/50 p-4 rounded-xl hover:bg-[var(--bg-muted)] transition-colors">
                                        <div className="relative flex items-center">
                                            <input 
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={adminFormData.can_create_project}
                                                onChange={(e) => setAdminFormData(prev => ({ ...prev, can_create_project: e.target.checked }))}
                                            />
                                            <div className="w-11 h-6 bg-[var(--bg-color)] border border-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 peer-checked:border-indigo-500"></div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-[var(--text-main)]">Can Create Projects</span>
                                            <span className="text-xs text-[var(--text-dim)]">Allow this admin to create new projects.</span>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer group bg-[var(--bg-muted)]/50 p-4 rounded-xl hover:bg-[var(--bg-muted)] transition-colors">
                                        <div className="relative flex items-center">
                                            <input 
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={adminFormData.can_assign_tasks}
                                                onChange={(e) => setAdminFormData(prev => ({ ...prev, can_assign_tasks: e.target.checked }))}
                                            />
                                            <div className="w-11 h-6 bg-[var(--bg-color)] border border-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 peer-checked:border-indigo-500"></div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-[var(--text-main)]">Can Assign Tasks</span>
                                            <span className="text-xs text-[var(--text-dim)]">Allow this admin to assign interns to tasks.</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-6 border-t border-[var(--border-color)] justify-end">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => navigate('/management/admins')}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    gradient="indigo"
                                    loading={submitting}
                                    icon={<UserPlus size={18} />}
                                >
                                    Create Admin
                                </Button>
                            </div>
                        </form>
                    </Card>
                ) : (
                    <Card className="p-8 border-blue-500/20">
                        <div className="space-y-6">
                            <div className="bg-[var(--bg-muted)] rounded-xl p-4 border border-[var(--border-color)]">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-semibold text-[var(--text-main)]">CSV Template Format</h4>
                                    <button 
                                        onClick={handleDownloadTemplate}
                                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20"
                                    >
                                        <Upload size={12} className="rotate-180" />
                                        Download Sample
                                    </button>
                                </div>
                                <p className="text-[var(--text-dim)] text-xs mb-4">
                                    The file must include headers for <strong>email</strong>, <strong>full_name</strong>, <strong>department</strong>, <strong>can_create_project</strong>, and <strong>can_assign_tasks</strong>.
                                </p>

                                <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="bg-[var(--bg-color)]">
                                            <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                                                <th className="py-3 px-4 font-medium text-[var(--text-main)]">email <span className="text-red-400">*</span></th>
                                                <th className="py-3 px-4 font-medium text-[var(--text-main)]">full_name <span className="text-red-400">*</span></th>
                                                <th className="py-3 px-4 font-medium text-[var(--text-main)]">department</th>
                                                <th className="py-3 px-4 font-medium">can_create_project</th>
                                                <th className="py-3 px-4 font-medium">can_assign_tasks</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-[var(--text-dim)] font-mono">
                                            <tr>
                                                <td className="py-3 px-4">manager1@example.com</td>
                                                <td className="py-3 px-4">John Doe</td>
                                                <td className="py-3 px-4">Development (Web/Application)</td>
                                                <td className="py-3 px-4">true</td>
                                                <td className="py-3 px-4">true</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <div className="group">
                                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Upload CSV File *</label>
                                {uploading ? (
                                    <div className="relative border-2 border-dashed border-[var(--border-color)] rounded-xl p-12 text-center transition-all duration-300">
                                        <div className="max-w-xs mx-auto">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-medium text-[var(--text-main)]">Uploading...</span>
                                                <span className="text-sm font-bold text-blue-400">{uploadProgress}%</span>
                                            </div>
                                            <div className="w-full h-3 bg-[var(--bg-muted)] rounded-full overflow-hidden shadow-inner border border-[var(--border-color)]">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ease-out relative"
                                                    style={{ width: `${uploadProgress}%` }}
                                                >
                                                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${uploadFile ? 'border-green-500 bg-green-500/5' : 'border-[var(--border-color)] hover:border-blue-500/50 bg-[var(--bg-color)]'}`}>
                                        <input
                                            type="file"
                                            accept=".csv"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                        />
                                        <div className="flex flex-col items-center gap-4">
                                            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${uploadFile ? 'bg-green-500/20 text-green-500 shadow-lg shadow-green-500/20' : 'bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/10'}`}>
                                                <Upload size={32} />
                                            </div>
                                            <div>
                                                <p className={`font-bold text-lg ${uploadFile ? 'text-green-500' : 'text-[var(--text-main)]'}`}>
                                                    {uploadFile ? uploadFile.name : 'Click to upload or drag and drop'}
                                                </p>
                                                <p className={`text-sm mt-1 ${uploadFile ? 'text-green-500/80 font-medium' : 'text-[var(--text-muted)]'}`}>
                                                    {uploadFile ? 'File uploaded and ready!' : 'CSV files only'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-6 border-t border-[var(--border-color)] justify-end">
                                <Button
                                    variant="ghost"
                                    onClick={() => navigate('/management/admins')}
                                    disabled={uploading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleBulkUpload}
                                    gradient="blue"
                                    disabled={!uploadFile || uploading}
                                    icon={<Upload size={18} />}
                                >
                                    {uploading ? 'Uploading...' : 'Upload Data'}
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default CreateAdminPage;
