import React, { useEffect, useState } from 'react';
import { UserPlus, Search, Filter, X, Mail, Phone, Building, ArrowRight, Eye, Edit, Award, BookOpen, Calendar, Clock, Star } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';

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
    const [interns, setInterns] = useState<InternProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState<string>('');
    const [departments, setDepartments] = useState<string[]>([]);
    const [availableInterns, setAvailableInterns] = useState<AvailableIntern[]>([]);
    const [selectedInternId, setSelectedInternId] = useState<number | ''>('');
    
    // View Profile Modal State
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [selectedIntern, setSelectedIntern] = useState<DetailedInternProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);

    const fetchAvailableInterns = async () => {
        try {
            const response = await api.get('/interns/available-interns/');
            setAvailableInterns(response.data);
        } catch (err) {
            console.error('Error fetching available interns:', err);
            setAvailableInterns([]);
        }
    };

    const viewInternProfile = async (intern: InternProfile) => {
        setProfileLoading(true);
        setShowProfileModal(true);
        setSelectedIntern(null);
        
        try {
            // Fetch detailed profile data
            const profileResponse = await api.get(`/interns/profile-by-user/${intern.user.id}/`);
            const profile = profileResponse.data;
            
            // Fetch projects assigned to this intern
            let projects: any[] = [];
            try {
                const projectsResponse = await api.get(`/projects/assignments/?intern_id=${intern.user.id}`);
                const assignments = Array.isArray(projectsResponse.data) ? projectsResponse.data : (projectsResponse.data?.results || []);
                projects = assignments.map((a: any) => ({
                    id: a.id,
                    name: a.project?.name || 'Unknown Project',
                    status: a.status,
                    role: a.role
                }));
            } catch (e) {
                console.error('Error fetching projects:', e);
            }
            
            // Fetch tasks for this intern
            let tasks: any[] = [];
            try {
                const tasksResponse = await api.get(`/analytics/tasks/?intern_id=${intern.user.id}`);
                tasks = tasksResponse.data?.tasks || [];
            } catch (e) {
                console.error('Error fetching tasks:', e);
            }
            
            // Fetch performance stats and skills
            let performanceStats = { attendance_rate: 0, average_rating: 0, skills: [] as string[] };
            try {
                const perfResponse = await api.get(`/analytics/performance/dashboard/${intern.user.id}/`);
                const data = perfResponse.data;
                const metrics = data?.metrics;
                if (metrics) {
                    performanceStats.attendance_rate = Math.round((metrics.engagement || 0) * 100);
                    performanceStats.average_rating = metrics.avg_quality || 0;
                }
                
                // Extract skills from learning path if available
                if (data?.learning_path?.milestones) {
                    performanceStats.skills = data.learning_path.milestones.map((m: any) => m.skill || m.area).filter(Boolean);
                }
            } catch (e) {
                console.error('Error fetching performance:', e);
            }
            
            setSelectedIntern({
                id: profile.id,
                user: {
                    id: intern.user.id,
                    email: intern.user.email,
                    full_name: intern.user.full_name,
                    role: intern.user.role,
                    department: intern.user.department || profile.university || ''
                },
                university: profile.university || intern.university || '',
                phone_number: profile.phone_number || intern.phone_number || '',
                status: profile.status || intern.status || 'ACTIVE',
                skills: performanceStats.skills.length > 0 ? performanceStats.skills : (profile.skills || intern.skills || []),
                gpa: profile.gpa,
                graduation_year: profile.graduation_year,
                github_profile: profile.github_profile,
                linkedin_profile: profile.linkedin_profile,
                projects: projects,
                tasks: tasks,
                attendance_rate: performanceStats.attendance_rate,
                average_rating: performanceStats.average_rating
            });
        } catch (err) {
            console.error('Error fetching intern profile:', err);
            // Fallback to basic data using provided intern object
            setSelectedIntern({
                id: intern.id,
                user: {
                    ...intern.user,
                    department: intern.user.department || intern.university || user?.department || ''
                },
                university: intern.university,
                phone_number: intern.phone_number,
                status: intern.status,
                skills: intern.skills,
                projects: [],
                tasks: [],
                attendance_rate: 0,
                average_rating: 0
            });
        } finally {
            setProfileLoading(false);
        }
    };

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
            let allInterns: InternProfile[] = [];

            if (user?.role === 'ADMIN') {
                try {
                    const response = await api.get('/interns/all-by-department/');
                    const byDepartment = response.data;

                    // Get all departments
                    const depts = Object.keys(byDepartment);
                    setDepartments(depts);

                    // Build allInterns from all departments
                    depts.forEach(dept => {
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
                    });
                } catch (e) {
                    console.error('Error fetching all interns by department:', e);
                }
            } else if (user?.role === 'MANAGER' || user?.role === 'INTERN') {
                // For managers and interns: fetch all interns in department
                try {
                    const response = await api.get('/interns/department-interns/');
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
                        } catch (profileErr) {
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
    }, [user, selectedDepartment]);

    const handleAddIntern = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            if (user?.role === 'MANAGER') {
                // For managers, assign existing intern
                if (!selectedInternId) {
                    setError('Please select an intern');
                    setSubmitting(false);
                    return;
                }
                await api.post('/interns/assign-intern/', { intern_id: selectedInternId });
            } else {
                // For admins, create new intern
                await api.post('/interns/create/', newIntern);
            }
            setShowAddModal(false);
            setNewIntern({
                user: { email: '', full_name: '', password: '' },
                profile: { university: '', phone_number: '', skills: [] },
            });
            setSelectedInternId('');
            fetchInterns();
        } catch (err: any) {
            setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to add intern');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSkillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const skills = e.target.value.split(',').map(s => s.trim()).filter(s => s);
        setNewIntern(prev => ({
            ...prev,
            profile: { ...prev.profile, skills }
        }));
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
                    <Button
                        onClick={openAddModal}
                        gradient="purple"
                        icon={<UserPlus size={18} />}
                    >
                        Add Intern
                    </Button>
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
                    <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                    >
                        <option value="">All Departments</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
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
                                    onClick={() => viewInternProfile(intern)}
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

            {/* Add Intern Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title={isManager ? 'Add Existing Intern' : 'Add New Intern'}
                size="lg"
                gradient="purple"
            >
                <form onSubmit={handleAddIntern} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                            <X size={16} />
                            {error}
                        </div>
                    )}

                    {isManager ? (
                        // Manager: Show dropdown of available interns
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-[var(--text-dim)] flex items-center gap-2">
                                <div className="w-1 h-4 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full"></div>
                                Select Intern
                            </h4>

                            {availableInterns.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-[var(--bg-muted)] rounded-full flex items-center justify-center">
                                        <UserPlus size={24} className="text-[var(--text-muted)]" />
                                    </div>
                                    <h3 className="text-lg font-medium text-[var(--text-main)] mb-2">No interns available</h3>
                                    <p className="text-[var(--text-dim)]">All interns in your department have already been added</p>
                                </div>
                            ) : (
                                <div className="group">
                                    <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">
                                        Available Interns
                                    </label>
                                    <select
                                        value={selectedInternId}
                                        onChange={(e) => setSelectedInternId(Number(e.target.value) || '')}
                                        className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                        required
                                    >
                                        <option value="">Select an intern...</option>
                                        {availableInterns.map((intern) => (
                                            <option key={intern.id} value={intern.id}>
                                                {intern.full_name} ({intern.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Admin: Show create intern form
                        <>
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-[var(--text-dim)] flex items-center gap-2">
                                    <div className="w-1 h-4 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full"></div>
                                    Basic Information
                                </h4>

                                <div className="group">
                                    <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newIntern.user.full_name}
                                        onChange={e => setNewIntern(prev => ({
                                            ...prev,
                                            user: { ...prev.user, full_name: e.target.value }
                                        }))}
                                        className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div className="group">
                                    <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Email *</label>
                                    <div className="relative">
                                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                        <input
                                            type="email"
                                            required
                                            value={newIntern.user.email}
                                            onChange={e => setNewIntern(prev => ({
                                                ...prev,
                                                user: { ...prev.user, email: e.target.value }
                                            }))}
                                            className="w-full pl-12 pr-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="group">
                                    <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Password *</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={8}
                                        value={newIntern.user.password}
                                        onChange={e => setNewIntern(prev => ({
                                            ...prev,
                                            user: { ...prev.user, password: e.target.value }
                                        }))}
                                        className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                        placeholder="••••••••"
                                    />
                                    <p className="text-xs text-[var(--text-muted)] mt-1">Minimum 8 characters</p>
                                </div>
                            </div>

                            {/* Profile Information Section */}
                            <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                                <h4 className="text-sm font-semibold text-[var(--text-dim)] flex items-center gap-2">
                                    <div className="w-1 h-4 bg-gradient-to-b from-indigo-400 to-purple-400 rounded-full"></div>
                                    Profile Information
                                </h4>

                                <div className="group">
                                    <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">University</label>
                                    <div className="relative">
                                        <Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                        <input
                                            type="text"
                                            value={newIntern.profile.university}
                                            onChange={e => setNewIntern(prev => ({
                                                ...prev,
                                                profile: { ...prev.profile, university: e.target.value }
                                            }))}
                                            className="w-full pl-12 pr-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                            placeholder="Stanford University"
                                        />
                                    </div>
                                </div>

                                <div className="group">
                                    <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Phone Number</label>
                                    <div className="relative">
                                        <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                        <input
                                            type="text"
                                            value={newIntern.profile.phone_number}
                                            onChange={e => setNewIntern(prev => ({
                                                ...prev,
                                                profile: { ...prev.profile, phone_number: e.target.value }
                                            }))}
                                            className="w-full pl-12 pr-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>
                                </div>

                                <div className="group">
                                    <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Skills</label>
                                    <input
                                        type="text"
                                        placeholder="Python, JavaScript, React..."
                                        value={newIntern.profile.skills.join(', ')}
                                        onChange={handleSkillChange}
                                        className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                    />
                                    <p className="text-xs text-[var(--text-muted)] mt-1">Separate skills with commas</p>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setShowAddModal(false)}
                            fullWidth
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            gradient="purple"
                            loading={submitting}
                            disabled={isManager && availableInterns.length === 0}
                            fullWidth
                        >
                            {isManager ? 'Add Intern' : 'Create Intern'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* View Profile Modal */}
            <Modal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
                title={selectedIntern ? selectedIntern.user?.full_name : 'Loading Profile...'}
                size="2xl"
                gradient="blue"
            >
                <div className="space-y-8">
                    {profileLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                            <p className="text-[var(--text-dim)] animate-pulse font-medium">Fetching detailed insights...</p>
                        </div>
                    ) : selectedIntern ? (
                        <>
                            {/* Header-like Profile Info */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                                    {getInitials(selectedIntern.user?.full_name || '')}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-3">
                                        {selectedIntern.user?.full_name}
                                        {getStatusBadge(selectedIntern.status)}
                                    </h2>
                                    <p className="text-sm text-[var(--text-muted)] mt-1 flex items-center gap-4">
                                        <span className="flex items-center gap-1"><Mail size={14} /> {selectedIntern.user?.email}</span>
                                        <span className="flex items-center gap-1"><Building size={14} /> {selectedIntern.user?.department || selectedIntern.university}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card className="p-4 flex flex-col items-center justify-center text-center bg-gradient-to-br from-purple-500/5 to-transparent border-purple-500/10">
                                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mb-2">
                                        <Star className="text-purple-400" size={20} />
                                    </div>
                                    <div className="text-2xl font-bold text-[var(--text-main)]">
                                        {selectedIntern.average_rating !== undefined ? selectedIntern.average_rating.toFixed(1) : 'N/A'}
                                    </div>
                                    <div className="text-xs text-[var(--text-dim)] uppercase tracking-wider font-semibold mt-1">Avg Rating</div>
                                </Card>
                                <Card className="p-4 flex flex-col items-center justify-center text-center bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/10">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
                                        <Clock className="text-blue-400" size={20} />
                                    </div>
                                    <div className="text-2xl font-bold text-[var(--text-main)]">
                                        {selectedIntern.attendance_rate !== undefined ? `${selectedIntern.attendance_rate}%` : 'N/A'}
                                    </div>
                                    <div className="text-xs text-[var(--text-dim)] uppercase tracking-wider font-semibold mt-1">Attendance</div>
                                </Card>
                                <Card className="p-4 flex flex-col items-center justify-center text-center bg-gradient-to-br from-pink-500/5 to-transparent border-pink-500/10">
                                    <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center mb-2">
                                        <Award className="text-pink-400" size={20} />
                                    </div>
                                    <div className="text-2xl font-bold text-[var(--text-main)]">
                                        {selectedIntern.projects?.length || 0}
                                    </div>
                                    <div className="text-xs text-[var(--text-dim)] uppercase tracking-wider font-semibold mt-1">Projects</div>
                                </Card>
                                <Card className="p-4 flex flex-col items-center justify-center text-center bg-gradient-to-br from-indigo-500/5 to-transparent border-indigo-500/10">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center mb-2">
                                        <BookOpen className="text-indigo-400" size={20} />
                                    </div>
                                    <div className="text-2xl font-bold text-[var(--text-main)]">
                                        {selectedIntern.tasks?.length || 0}
                                    </div>
                                    <div className="text-xs text-[var(--text-dim)] uppercase tracking-wider font-semibold mt-1">Tasks</div>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Left Column: Personal Info & Skills */}
                                <div className="space-y-6">
                                    <Card className="p-5">
                                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
                                            <UserPlus size={18} className="text-purple-400" />
                                            Personal Details
                                        </h3>
                                        <div className="space-y-3">
                                            {selectedIntern.phone_number && (
                                                <div className="flex items-center gap-3 text-sm">
                                                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center">
                                                        <Phone size={14} className="text-[var(--text-muted)]" />
                                                    </div>
                                                    <span className="text-[var(--text-main)]">{selectedIntern.phone_number}</span>
                                                </div>
                                            )}
                                            {selectedIntern.university && (
                                                <div className="flex items-center gap-3 text-sm">
                                                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center">
                                                        <Building size={14} className="text-[var(--text-muted)]" />
                                                    </div>
                                                    <span className="text-[var(--text-main)]">{selectedIntern.university}</span>
                                                </div>
                                            )}
                                            {(selectedIntern.graduation_year || selectedIntern.gpa) && (
                                                <div className="flex items-center gap-3 text-sm">
                                                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center">
                                                        <Calendar size={14} className="text-[var(--text-muted)]" />
                                                    </div>
                                                    <span className="text-[var(--text-main)]">
                                                        Class of {selectedIntern.graduation_year || 'N/A'} {selectedIntern.gpa && `• ${selectedIntern.gpa} GPA`}
                                                    </span>
                                                </div>
                                            )}
                                            {selectedIntern.github_profile && (
                                                <a href={selectedIntern.github_profile} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm group/link hover:bg-purple-500/5 p-1 rounded-lg transition-colors -ml-1 flex-1 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center group-hover/link:bg-purple-500/20 group-hover/link:text-purple-400 transition-colors shrink-0">
                                                        <Search size={14} className="text-[var(--text-muted)] group-hover/link:text-purple-400 transition-colors" />
                                                    </div>
                                                    <span className="text-[var(--text-main)] group-hover/link:text-purple-400 transition-colors truncate">GitHub</span>
                                                </a>
                                            )}
                                            {selectedIntern.linkedin_profile && (
                                                <a href={selectedIntern.linkedin_profile} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm group/link hover:bg-blue-500/5 p-1 rounded-lg transition-colors -ml-1 flex-1 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center group-hover/link:bg-blue-500/20 group-hover/link:text-blue-400 transition-colors shrink-0">
                                                        <Search size={14} className="text-[var(--text-muted)] group-hover/link:text-blue-400 transition-colors" />
                                                    </div>
                                                    <span className="text-[var(--text-main)] group-hover/link:text-blue-400 transition-colors truncate">LinkedIn</span>
                                                </a>
                                            )}
                                        </div>
                                    </Card>

                                    <Card className="p-5">
                                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
                                            <Award size={18} className="text-pink-400" />
                                            Skills
                                        </h3>
                                        {selectedIntern.skills && selectedIntern.skills.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {selectedIntern.skills.map((skill, index) => (
                                                    <span key={index} className="px-3 py-1.5 text-sm font-medium bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20 shadow-sm">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-[var(--text-dim)]">No skills listed</p>
                                        )}
                                    </Card>
                                </div>

                                {/* Right Column: Projects & Tasks */}
                                <div className="md:col-span-2 space-y-6">
                                    <Card className="p-5 flex flex-col h-full max-h-[400px]">
                                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-4 flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
                                            <BookOpen size={18} className="text-indigo-400" />
                                            Assigned Projects
                                        </h3>
                                        <div className="overflow-y-auto pr-2 space-y-3 flex-1 custom-scrollbar">
                                            {selectedIntern.projects && selectedIntern.projects.length > 0 ? (
                                                selectedIntern.projects.map((project) => (
                                                    <div key={project.id} className="p-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl hover:border-purple-500/30 transition-colors">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h4 className="font-semibold text-[var(--text-main)] text-sm">{project.name}</h4>
                                                            <Badge variant={project.status === 'ACTIVE' ? 'success' : 'default'} size="sm">{project.status}</Badge>
                                                        </div>
                                                        <p className="text-xs text-[var(--text-dim)] mt-1">Role: <span className="text-[var(--text-main)] font-medium">{project.role}</span></p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-6 text-[var(--text-dim)] text-sm">
                                                    No projects assigned yet
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                    
                                    <Card className="p-5 flex flex-col h-full max-h-[400px]">
                                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-4 flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
                                            <Clock size={18} className="text-blue-400" />
                                            Recent Tasks
                                        </h3>
                                        <div className="overflow-y-auto pr-2 space-y-3 flex-1 custom-scrollbar">
                                            {selectedIntern.tasks && selectedIntern.tasks.length > 0 ? (
                                                selectedIntern.tasks.slice(0, 5).map((task) => (
                                                    <div key={task.id} className="p-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl hover:border-purple-500/30 transition-colors">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h4 className="font-semibold text-[var(--text-main)] text-sm">{task.title}</h4>
                                                            <Badge variant={
                                                                task.status === 'COMPLETED' ? 'success' : 
                                                                task.status === 'IN_PROGRESS' ? 'warning' : 'default'
                                                            } size="sm">{task.status}</Badge>
                                                        </div>
                                                        <p className="text-xs text-[var(--text-dim)] mt-1">Due: <span className="text-[var(--text-main)] font-medium">{new Date(task.due_date).toLocaleDateString()}</span></p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-6 text-[var(--text-dim)] text-sm">
                                                    No tasks assigned yet
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-[var(--text-dim)]">Failed to load intern data. Please try again.</p>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default InternList;
