import React, { useState, useEffect } from 'react';
import { User, Mail, Building, Phone, BookOpen, Award, Settings, Save, X, Shield, Briefcase, Calendar, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Card from '../components/common/Card';

import Button from '../components/common/Button';

interface UserProfile {
    id: number;
    email: string;
    full_name: string;
    role: string;
    department: string;
}

interface InternProfile {
    university: string;
    phone_number: string;
    skills: string[];
    status: string;
    gpa?: number;
    graduation_year?: number;
    github_profile?: string;
    linkedin_profile?: string;
}

const ProfilePage: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [userData, setUserData] = useState<UserProfile | null>(null);
    const [internProfile, setInternProfile] = useState<InternProfile | null>(null);

    const [formData, setFormData] = useState({
        user: {
            full_name: '',
            department: '',
        },
        profile: {
            university: '',
            phone_number: '',
            skills: [] as string[],
            gpa: '',
            graduation_year: '',
            github_profile: '',
            linkedin_profile: '',
        }
    });

    // Separate state for raw skills input to allow typing commas
    const [skillsInput, setSkillsInput] = useState('');

    useEffect(() => {
        fetchProfile();
    }, [user]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await api.get('/interns/my-profile/');
            const data = response.data;

            setUserData(data.user);
            if (data.profile) {
                setInternProfile(data.profile);
                setFormData({
                    user: {
                        full_name: data.user.full_name,
                        department: data.user.department,
                    },
                    profile: {
                        university: data.profile.university || '',
                        phone_number: data.profile.phone_number || '',
                        skills: data.profile.skills || [],
                        gpa: data.profile.gpa?.toString() || '',
                        graduation_year: data.profile.graduation_year?.toString() || '',
                        github_profile: data.profile.github_profile || '',
                        linkedin_profile: data.profile.linkedin_profile || '',
                    }
                });
                // Set raw skills input for comma-separated editing
                setSkillsInput((data.profile.skills || []).join(', '));
            } else {
                setFormData({
                    user: {
                        full_name: data.user.full_name,
                        department: data.user.department,
                    },
                    profile: {
                        university: '',
                        phone_number: '',
                        skills: [],
                        gpa: '',
                        graduation_year: '',
                        github_profile: '',
                        linkedin_profile: '',
                    }
                });
                setSkillsInput('');
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            setError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccess('');

        // Parse skills from raw input before saving
        const skills = skillsInput.split(',').map(s => s.trim()).filter(s => s);

        toast.promise(api.patch('/interns/my-profile/', {
            ...formData,
            profile: {
                ...formData.profile,
                skills: skills
            }
        }), {
            loading: 'Synchronizing profile intelligence...',
            success: () => {
                fetchProfile();
                setSaving(false);
                return 'Profile updated successfully!';
            },
            error: (err) => {
                setSaving(false);
                const error = err as { response?: { data?: { message?: string } } };
                return error.response?.data?.message || 'Failed to update profile';
            }
        });
    };

    const handleSkillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSkillsInput(value);
        // Only parse skills when saving, not on every keystroke
    };



    const handleInputChange = (section: 'user' | 'profile', field: string, value: string | string[]) => {
        setFormData(prev => ({
            ...prev,
            [section]: { ...prev[section], [field]: value }
        }));
    };

    const getRoleBadgeStyle = () => {
        switch (user?.role) {
            case 'ADMIN':
                return 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-500/30';
            case 'MANAGER':
                return 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30';
            default:
                return 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                    <p className="text-[var(--text-dim)] animate-pulse">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2">
                    My <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Profile</span>
                </h1>
                <p className="text-[var(--text-dim)]">Manage your personal information and preferences</p>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2 animate-shake">
                    <X size={18} />
                    {error}
                </div>
            )}

            {success && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-2">
                    <Shield size={18} />
                    {success}
                </div>
            )}

            {/* Profile Header Card */}
            <Card className="border-l-4 border-l-purple-500">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-40"></div>
                        <div className="relative w-24 h-24 bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                            {userData?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'NA'}
                        </div>
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-[var(--text-main)]">{userData?.full_name || 'N/A'}</h2>
                        <div className="flex items-center gap-3 mt-2">
                            <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getRoleBadgeStyle()}`}>
                                {userData?.role || 'N/A'}
                            </span>
                            <span className="flex items-center gap-1 text-[var(--text-dim)]">
                                <Building size={14} className="text-purple-400" />
                                {userData?.department || 'No department'}
                            </span>
                        </div>
                    </div>
                    <Button
                        onClick={handleSave}
                        loading={saving}
                        gradient="purple"
                        icon={<Save size={18} />}
                    >
                        Save Changes
                    </Button>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Account Information */}
                <Card icon={<User size={20} />} title="Account Information" subtitle="Basic account details">
                    <div className="space-y-4">
                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Full Name</label>
                            <div className="relative">
                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-purple-400 transition-colors" />
                                <input
                                    type="text"
                                    value={formData.user.full_name}
                                    onChange={(e) => handleInputChange('user', 'full_name', e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all hover:border-purple-500/30"
                                />
                            </div>
                        </div>

                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Email</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                <input
                                    type="email"
                                    value={userData?.email || ''}
                                    disabled
                                    className="w-full pl-12 pr-4 py-3 bg-[var(--bg-color)] opacity-50 border border-[var(--border-color)] rounded-xl text-[var(--text-dim)] cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {userData?.role !== 'INTERN' && (
                            <div className="group">
                                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Department</label>
                                <div className="relative">
                                    <Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-purple-400 transition-colors" />
                                    <select
                                        value={formData.user.department}
                                        onChange={(e) => handleInputChange('user', 'department', e.target.value)}
                                        disabled={user?.role !== 'ADMIN'}
                                        className={`w-full pl-12 pr-10 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none transition-all appearance-none ${user?.role === 'ADMIN' ? 'focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 hover:border-purple-500/30 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                                    >
                                        <option value="" disabled>Select Department</option>
                                        <option value="Web Development">Web Development</option>
                                        <option value="AI/ML Department">AI/ML Department</option>
                                        <option value="Data Science">Data Science</option>
                                        <option value="Cloud & DevOps">Cloud & DevOps</option>
                                        <option value="Mobile Applications">Mobile Applications</option>
                                        <option value="Software Engineering">Software Engineering</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                        <ChevronDown size={18} className="text-[var(--text-muted)]" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Professional Details */}
                <Card icon={<Briefcase size={20} />} title="Professional Details" subtitle="Your work and education information">
                    <div className="space-y-4">
                        {userData?.role === 'INTERN' ? (
                            <>
                                <div className="group">
                                    <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">University</label>
                                    <div className="relative">
                                        <BookOpen size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-purple-400 transition-colors" />
                                        <input
                                            type="text"
                                            value={formData.profile.university}
                                            onChange={(e) => handleInputChange('profile', 'university', e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all hover:border-purple-500/30"
                                            placeholder={formData.profile.university || "Enter your university"}
                                        />
                                    </div>
                                </div>

                                <div className="group">
                                    <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Phone Number</label>
                                    <div className="relative">
                                        <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-purple-400 transition-colors" />
                                        <input
                                            type="text"
                                            value={formData.profile.phone_number}
                                            onChange={(e) => handleInputChange('profile', 'phone_number', e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all hover:border-purple-500/30"
                                            placeholder={formData.profile.phone_number || "Enter your phone number"}
                                        />
                                    </div>
                                </div>

                                <div className="group">
                                    <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Skills</label>
                                    <input
                                        type="text"
                                        value={skillsInput}
                                        onChange={handleSkillChange}
                                        className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all hover:border-purple-500/30"
                                        placeholder="Python, JavaScript, React..."
                                    />
                                    <p className="text-xs text-[var(--text-dim)] mt-1">Separate skills with commas</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="group">
                                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">GPA</label>
                                        <div className="relative">
                                            <Award size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-purple-400 transition-colors" />
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="4"
                                                value={formData.profile.gpa}
                                                onChange={(e) => handleInputChange('profile', 'gpa', e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all hover:border-purple-500/30"
                                                placeholder="3.50"
                                            />
                                        </div>
                                    </div>

                                    <div className="group">
                                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Graduation Year</label>
                                        <div className="relative">
                                            <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-purple-400 transition-colors" />
                                            <input
                                                type="number"
                                                min="2000"
                                                max="2100"
                                                value={formData.profile.graduation_year}
                                                onChange={(e) => handleInputChange('profile', 'graduation_year', e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all hover:border-purple-500/30"
                                                placeholder="2025"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="p-4 bg-[var(--bg-color)] rounded-xl text-[var(--text-dim)] text-center border border-[var(--border-color)]">
                                <Settings size={32} className="mx-auto mb-2 opacity-50" />
                                <p>Admin and Manager profiles are limited to basic account information.</p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Social Links (Interns only) */}
                {userData?.role === 'INTERN' && (
                    <Card icon={<Award size={20} />} title="Social & Professional Links" subtitle="Your online presence">
                        <div className="space-y-4">
                            <div className="group">
                                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">GitHub Profile</label>
                                <input
                                    type="url"
                                    value={formData.profile.github_profile}
                                    onChange={(e) => handleInputChange('profile', 'github_profile', e.target.value)}
                                    className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all hover:border-purple-500/30"
                                    placeholder="https://github.com/username"
                                />
                            </div>

                            <div className="group">
                                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">LinkedIn Profile</label>
                                <input
                                    type="url"
                                    value={formData.profile.linkedin_profile}
                                    onChange={(e) => handleInputChange('profile', 'linkedin_profile', e.target.value)}
                                    className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all hover:border-purple-500/30"
                                    placeholder="https://linkedin.com/in/username"
                                />
                            </div>
                        </div>
                    </Card>
                )}

                {/* Skills Preview (Interns only) */}
                {userData?.role === 'INTERN' && internProfile?.skills && internProfile.skills.length > 0 && (
                    <Card icon={<Award size={20} />} title="Skills Overview" subtitle="Your current skills">
                        <div className="flex flex-wrap gap-2">
                            {internProfile.skills.map((skill, index) => (
                                <span key={index} className="px-3 py-1 text-sm font-medium bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 rounded-lg border border-purple-500/30">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;
