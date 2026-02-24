import React, { useEffect, useState } from 'react';
import { UserPlus, Search, Filter, X, Mail, Phone, Building, ArrowRight, Eye, Edit } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

interface InternProfile {
    id: number;
    user: {
        id: number;
        email: string;
        full_name: string;
        role: string;
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

    const fetchAvailableInterns = async () => {
        try {
            const response = await api.get('/interns/available-interns/');
            setAvailableInterns(response.data);
        } catch (err) {
            console.error('Error fetching available interns:', err);
            setAvailableInterns([]);
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
                    <p className="text-slate-400 animate-pulse">Loading interns...</p>
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
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Intern <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Directory</span>
                    </h1>
                    <p className="text-slate-400">
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
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search interns by name, email, university..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                    />
                </div>
                {user?.role === 'ADMIN' && (
                    <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
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
                            <div className="w-16 h-16 mx-auto mb-4 bg-slate-800/50 rounded-full flex items-center justify-center">
                                <Search size={24} className="text-slate-500" />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">No interns found</h3>
                            <p className="text-slate-400">Try adjusting your search or filter criteria</p>
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
                                            <h3 className="font-semibold text-white group-hover:text-purple-200 transition-colors truncate">
                                                {intern.user?.full_name || 'N/A'}
                                            </h3>
                                            <p className="text-sm text-slate-400 truncate">{intern.user?.email || 'N/A'}</p>
                                        </div>
                                        {getStatusBadge(intern.status)}
                                    </div>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="mt-4 space-y-2">
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <Building size={14} className="text-purple-400" />
                                    <span>{intern.university || 'No university specified'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-400">
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
                                        <span className="px-2 py-1 text-xs font-medium bg-slate-700/50 text-slate-400 rounded-lg">
                                            +{intern.skills.length - 3} more
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                <button className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 group/btn">
                                    View Profile
                                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                </button>
                                <div className="flex items-center gap-1">
                                    <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                                        <Eye size={16} />
                                    </button>
                                    <button className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all">
                                        <Edit size={16} />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Add Intern Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
                    <div className="relative bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-purple-500/20 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-between px-6 py-4 border-b border-white/10 z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                                    <UserPlus size={18} className="text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">
                                        {isManager ? 'Add Existing Intern' : 'Add New Intern'}
                                    </h2>
                                    <p className="text-xs text-slate-400">
                                        {isManager
                                            ? 'Select an intern from your department'
                                            : 'Fill in the details below'
                                        }
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-white/5 rounded-xl transition-colors group"
                            >
                                <X size={20} className="text-slate-400 group-hover:text-white transition-colors" />
                            </button>
                        </div>

                        <form onSubmit={handleAddIntern} className="p-6 space-y-6">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                                    <X size={16} />
                                    {error}
                                </div>
                            )}

                            {isManager ? (
                                // Manager: Show dropdown of available interns
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                        <div className="w-1 h-4 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full"></div>
                                        Select Intern
                                    </h4>

                                    {availableInterns.length === 0 ? (
                                        <div className="text-center py-8">
                                            <div className="w-16 h-16 mx-auto mb-4 bg-slate-800/50 rounded-full flex items-center justify-center">
                                                <UserPlus size={24} className="text-slate-500" />
                                            </div>
                                            <h3 className="text-lg font-medium text-white mb-2">No interns available</h3>
                                            <p className="text-slate-400">All interns in your department have already been added</p>
                                        </div>
                                    ) : (
                                        <div className="group">
                                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                                Available Interns
                                            </label>
                                            <select
                                                value={selectedInternId}
                                                onChange={(e) => setSelectedInternId(Number(e.target.value) || '')}
                                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
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
                                // Admin: Show full form to create new intern
                                <>
                                    {/* User Information Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                            <div className="w-1 h-4 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full"></div>
                                            User Information
                                        </h4>

                                        <div className="group">
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Full Name *</label>
                                            <input
                                                type="text"
                                                required
                                                value={newIntern.user.full_name}
                                                onChange={e => setNewIntern(prev => ({
                                                    ...prev,
                                                    user: { ...prev.user, full_name: e.target.value }
                                                }))}
                                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                                placeholder="John Doe"
                                            />
                                        </div>

                                        <div className="group">
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Email *</label>
                                            <div className="relative">
                                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                                <input
                                                    type="email"
                                                    required
                                                    value={newIntern.user.email}
                                                    onChange={e => setNewIntern(prev => ({
                                                        ...prev,
                                                        user: { ...prev.user, email: e.target.value }
                                                    }))}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                                    placeholder="john@example.com"
                                                />
                                            </div>
                                        </div>

                                        <div className="group">
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Password *</label>
                                            <input
                                                type="password"
                                                required
                                                minLength={8}
                                                value={newIntern.user.password}
                                                onChange={e => setNewIntern(prev => ({
                                                    ...prev,
                                                    user: { ...prev.user, password: e.target.value }
                                                }))}
                                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                                placeholder="••••••••"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
                                        </div>
                                    </div>

                                    {/* Profile Information Section */}
                                    <div className="space-y-4 pt-4 border-t border-white/5">
                                        <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                            <div className="w-1 h-4 bg-gradient-to-b from-indigo-400 to-purple-400 rounded-full"></div>
                                            Profile Information
                                        </h4>

                                        <div className="group">
                                            <label className="block text-sm font-medium text-slate-300 mb-2">University</label>
                                            <div className="relative">
                                                <Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                                <input
                                                    type="text"
                                                    value={newIntern.profile.university}
                                                    onChange={e => setNewIntern(prev => ({
                                                        ...prev,
                                                        profile: { ...prev.profile, university: e.target.value }
                                                    }))}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                                    placeholder="Stanford University"
                                                />
                                            </div>
                                        </div>

                                        <div className="group">
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
                                            <div className="relative">
                                                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                                <input
                                                    type="text"
                                                    value={newIntern.profile.phone_number}
                                                    onChange={e => setNewIntern(prev => ({
                                                        ...prev,
                                                        profile: { ...prev.profile, phone_number: e.target.value }
                                                    }))}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                                    placeholder="+1 (555) 000-0000"
                                                />
                                            </div>
                                        </div>

                                        <div className="group">
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Skills</label>
                                            <input
                                                type="text"
                                                placeholder="Python, JavaScript, React..."
                                                value={newIntern.profile.skills.join(', ')}
                                                onChange={handleSkillChange}
                                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">Separate skills with commas</p>
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
                    </div>
                </div>
            )}
        </div>
    );
};

export default InternList;
