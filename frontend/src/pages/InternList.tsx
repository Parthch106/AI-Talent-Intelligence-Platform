import React, { useEffect, useState } from 'react';
import { UserPlus, Search, Filter, X, Mail, Phone, Building, ArrowRight, Eye, Edit, Award, BookOpen, Calendar, Clock, Star, Activity, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { CustomSelect } from '../components/common';
import { useNavigate } from 'react-router-dom';

interface InternProfile {
    id: number;
    user: {
        id: number;
        email: string;
        full_name: string;
        role: string;
        department?: string;
    };
    university: string;
    phone_number: string;
    status: string;
    skills: string[];
}

interface AvailableIntern {
    id: number;
    email: string;
    full_name: string;
    role: string;
    department: string;
}

interface NewInternData {
    user: {
        email: string;
        full_name: string;
        password: string;
    };
    profile: {
        university: string;
        phone_number: string;
        skills: string[];
    };
}

interface DetailedInternProfile {
    id: number;
    user: {
        id: number;
        email: string;
        full_name: string;
        role: string;
        department: string;
    };
    university: string;
    phone_number: string;
    status: string;
    skills: string[];
    gpa?: number;
    graduation_year?: number;
    github_profile?: string;
    linkedin_profile?: string;
    projects?: Array<{
        id: number;
        name: string;
        status: string;
        role: string;
    }>;
    tasks?: Array<{
        id: number;
        title: string;
        status: string;
        due_date: string;
    }>;
    attendance_rate?: number;
    average_rating?: number;
}

const InternList: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [interns, setInterns] = useState<InternProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState<string>('');
    const [departments, setDepartments] = useState<string[]>([]);
    const [allDepartments, setAllDepartments] = useState<string[]>([]);
    const [availableInterns, setAvailableInterns] = useState<AvailableIntern[]>([]);
    const [selectedInternId, setSelectedInternId] = useState<number | ''>('');
    
    const [selectedIntern, setSelectedIntern] = useState<DetailedInternProfile | null>(null);
    
    // Bulk Upload Modal State
    const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
    const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const fetchAvailableInterns = async () => {
        try {
            const response = await api.get('/interns/available-interns/');
            setAvailableInterns(response.data);
        } catch (err) {
            console.error('Error fetching available interns:', err);
            setAvailableInterns([]);
        }
    };

    useEffect(() => {
        const fetchAllDepartments = async () => {
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
                setAllDepartments(merged);
            } catch (err) {
                console.error('Failed to fetch departments:', err);
                setAllDepartments(defaultDepts);
            }
        };
        fetchAllDepartments();
    }, []);



    const openAddModal = async () => {
        setShowAddModal(true);
        setError('');
        setSelectedInternId('');

        // For managers, fetch available interns
        if (user?.role === 'MANAGER') {
            await fetchAvailableInterns();
        }
    };

    const [newIntern, setNewIntern] = useState<NewInternData>({
        user: {
            email: '',
            full_name: '',
            password: '',
        },
        profile: {
            university: '',
            phone_number: '',
            skills: [],
        },
    });

    const fetchInterns = async () => {
        try {
            const allInterns: InternProfile[] = [];

            if (user?.role === 'ADMIN') {
                try {
                    const response = await api.get('/interns/all-by-department/');
                    const byDepartment = response.data;

                    // Get all departments
                    const depts = Object.keys(byDepartment);
                    setDepartments(depts);

                    // Build allInterns based on selected department filter
                    const deptsToFetch = selectedDepartment ? [selectedDepartment] : depts;
                    deptsToFetch.forEach(dept => {
                        if (byDepartment[dept]) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            byDepartment[dept].forEach((intern: any) => {
                                allInterns.push({
                                    id: intern.id,
                                    user: intern,
                                    university: intern.university || '',
                                    phone_number: intern.phone_number || '',
                                    status: intern.status || 'ACTIVE',
                                    skills: intern.skills || [],
                                });
                            });
                        }
                    });
                } catch (e) {
                    console.error('Error fetching all interns by department:', e);
                }
            } else if (user?.role === 'MANAGER' || user?.role === 'INTERN') {
                // For managers and interns: fetch all interns in department
                try {
                    const response = await api.get('/interns/department-interns/');
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const deptInterns: any[] = Array.isArray(response.data) ? response.data : [];

                    // Fetch profile data for each intern
                    for (const intern of deptInterns) {
                        try {
                            // Try to get profile for this intern
                            const profileResponse = await api.get(`/interns/profile-by-user/${intern.id}/`);
                            const profile = profileResponse.data;
                            allInterns.push({
                                id: profile.id,
                                user: intern,
                                university: profile.university || intern.department || '',
                                phone_number: profile.phone_number || '',
                                status: profile.status || 'ACTIVE',
                                skills: profile.skills || [],
                            });
                        } catch {
                            // No profile exists, create a basic one using User data
                            allInterns.push({
                                id: intern.id,
                                user: intern,
                                university: intern.department || '',  // Use department as university fallback
                                phone_number: '',
                                status: 'ACTIVE',
                                skills: [],
                            });
                        }
                    }
                } catch (e) {
                    console.error('Error fetching department interns:', e);
                }
            }

            // Update state with all interns
            setInterns(allInterns);
        } catch (error) {
            console.error("Failed to fetch interns", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, selectedDepartment]);

    const handleAddIntern = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        const actionPromise = async () => {
            if (user?.role === 'MANAGER') {
                if (!selectedInternId) throw new Error('Please select an intern');
                await api.post('/interns/assign-intern/', { intern_id: selectedInternId });
            } else {
                await api.post('/interns/create/', newIntern);
            }
        };

        toast.promise(actionPromise(), {
            loading: isManager ? 'Assigning intern to department...' : 'Initializing new intern node...',
            success: () => {
                setShowAddModal(false);
                setNewIntern({
                    user: { email: '', full_name: '', password: '' },
                    profile: { university: '', phone_number: '', skills: [] },
                });
                setSelectedInternId('');
                fetchInterns();
                setSubmitting(false);
                return isManager ? 'Intern assigned successfully' : 'Intern created successfully';
            },
            error: (err) => {
                setSubmitting(false);
                return err.message || 'Failed to add intern';
            }
        });
    };

    const handleSkillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const skills = e.target.value.split(',').map(s => s.trim()).filter(s => s);
        setNewIntern(prev => ({
            ...prev,
            profile: { ...prev.profile, skills }
        }));
    };

    const handleBulkUploadSubmit = async () => {
        if (!bulkUploadFile) return;
        
        setIsUploading(true);
        setUploadProgress(0);
        
        // Simulate progress for UI engagement
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) return prev;
                return prev + Math.floor(Math.random() * 10) + 5;
            });
        }, 300);

        const formData = new FormData();
        formData.append('file', bulkUploadFile);
        
        const uploadPromise = api.post('/interns/bulk-upload/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        toast.promise(uploadPromise, {
            loading: 'Uploading and processing interns...',
            success: (response) => {
                clearInterval(progressInterval);
                setUploadProgress(100);
                setTimeout(() => {
                    fetchInterns();
                    setShowBulkUploadModal(false);
                    setBulkUploadFile(null);
                    setIsUploading(false);
                    setUploadProgress(0);
                }, 500);
                
                let msg = response.data.message || 'Bulk upload successful';
                if (response.data.errors && response.data.errors.length > 0) {
                    msg += ` (${response.data.errors.length} skipped)`;
                }
                return msg;
            },
            error: (err) => {
                clearInterval(progressInterval);
                setIsUploading(false);
                setUploadProgress(0);
                return err.response?.data?.error || 'Bulk upload failed';
            }
        });
    };

    const handleDeleteIntern = async (internId: number) => {
        if (!window.confirm("Are you sure you want to permanently delete this intern? This action cannot be undone.")) return;
        
        try {
            await api.delete(`/interns/${internId}/delete/`);
            toast.success('Intern deleted successfully');
            fetchInterns();
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            toast.error(err.response?.data?.error || 'Failed to delete intern');
        }
    };

    const downloadTemplate = () => {
        const headers = ['email', 'full_name', 'department', 'university', 'phone_number', 'skills'];
        const sampleRow1 = ['intern1@example.com', 'John Doe', 'Development (Web/Application)', 'CSU', '+1234567890', 'React;Python'].join(',');
        const sampleRow2 = ['intern2@example.com', 'Jane Smith', '', 'MIT', '', 'Data Analysis'].join(',');
        
        const csvContent = [headers.join(','), sampleRow1, sampleRow2].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "intern_bulk_upload_template.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'active': return <Badge variant="success" withDot>Active</Badge>;
            case 'inactive': return <Badge variant="danger" withDot>Inactive</Badge>;
            case 'pending': return <Badge variant="warning" withDot>Pending</Badge>;
            default: return <Badge variant="default">{status}</Badge>;
        }
    };

    const getInitials = (name: string) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'NA';
    };

    const filteredInterns = interns.filter(intern =>
        intern.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intern.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intern.university?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                    <p className="text-[var(--text-muted)] animate-pulse">Loading interns...</p>
                </div>
            </div>
        );
    }

    const showAddButton = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    const isManager = user?.role === 'MANAGER';

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2">
                        Intern <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Directory</span>
                    </h1>
                    <p className="text-[var(--text-dim)]">
                        {user?.role === 'ADMIN'
                            ? selectedDepartment
                                ? `Interns in ${selectedDepartment}`
                                : 'Manage and view all intern profiles'
                            : user?.role === 'MANAGER'
                                ? `View interns in your department (${user.department || 'N/A'})`
                                : `View interns in your department (${user?.department || 'N/A'})`
                        }
                    </p>
                </div>
                {showAddButton && (
                    <div className="flex gap-2">
                        <Button
                            onClick={() => navigate('/directory/interns/bulk-upload')}
                            variant="outline"
                            icon={<Upload size={18} />}
                        >
                            Bulk Upload
                        </Button>
                        <Button
                            onClick={() => navigate('/directory/interns/create')}
                            gradient="purple"
                            icon={<UserPlus size={18} />}
                        >
                            Add Intern
                        </Button>
                    </div>
                )}
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-purple-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search interns by name, email, university..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                    />
                </div>
                {user?.role === 'ADMIN' && (
                    <div className="w-full md:w-auto">
                        <CustomSelect
                            options={[
                                { value: '', label: 'All Departments' },
                                ...departments.map(dept => ({ value: dept, label: dept }))
                            ]}
                            value={selectedDepartment}
                            onChange={setSelectedDepartment}
                            accent="purple"
                            className="min-w-[200px]"
                        />
                    </div>
                )}
                <Button variant="outline" icon={<Filter size={18} />}>
                    Filters
                </Button>
            </div>

            {/* Interns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInterns.length === 0 ? (
                    <div className="col-span-full">
                        <Card className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 bg-[var(--bg-muted)] rounded-full flex items-center justify-center">
                                <Search size={24} className="text-[var(--text-muted)]" />
                            </div>
                            <h3 className="text-lg font-medium text-[var(--text-main)] mb-2">No interns found</h3>
                            <p className="text-[var(--text-dim)]">Try adjusting your search or filter criteria</p>
                        </Card>
                    </div>
                ) : (
                    filteredInterns.map((intern) => (
                        <Card key={intern.id} hover className="group">
                            <div className="flex items-start gap-4">
                                {/* Avatar */}
                                <div className="relative">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
                                    <div className="relative w-14 h-14 bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                        {getInitials(intern.user?.full_name || '')}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-semibold text-[var(--text-main)] group-hover:text-purple-200 transition-colors truncate">
                                                {intern.user?.full_name || 'N/A'}
                                            </h3>
                                            <p className="text-sm text-[var(--text-dim)] truncate">{intern.user?.email || 'N/A'}</p>
                                        </div>
                                        {getStatusBadge(intern.status)}
                                    </div>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="mt-4 space-y-2">
                                <div className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
                                    <Building size={14} className="text-purple-400" />
                                    <span>{intern.university || 'No university specified'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
                                    <Phone size={14} className="text-purple-400" />
                                    <span>{intern.phone_number || 'No phone number'}</span>
                                </div>
                            </div>

                            {/* Skills */}
                            {intern.skills && intern.skills.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {intern.skills.slice(0, 3).map((skill, index) => (
                                        <span key={index} className="px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-300 rounded-lg border border-purple-500/20">
                                            {skill}
                                        </span>
                                    ))}
                                    {intern.skills.length > 3 && (
                                        <span className="px-2 py-1 text-xs font-medium bg-[var(--bg-muted)] text-[var(--text-dim)] rounded-lg">
                                            +{intern.skills.length - 3} more
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                                <button 
                                    onClick={() => navigate(`/directory/interns/${intern.user.id}`)}
                                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 group/btn"
                                >
                                    View Profile
                                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                </button>
                                <div className="flex items-center gap-1">
                                    <button className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-muted)] rounded-lg transition-all">
                                        <Eye size={16} />
                                    </button>
                                    <button className="p-2 text-[var(--text-muted)] hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all">
                                        <Edit size={16} />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>






        </div>
    );
};

export default InternList;
