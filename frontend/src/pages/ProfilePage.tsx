import React, { useState, useEffect } from 'react';
import { User, Mail, Building, Phone, BookOpen, Award, Settings, Save, X, Shield, Briefcase, Calendar, Search, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Card from '../components/common/Card';
import { CustomSelect } from '../components/common';
import Button from '../components/common/Button';

interface UserProfile {
    id: number;
    email: string;
    full_name: string;
    role: string;
    department: string;
    email_notifications_enabled?: boolean;
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

const DEPARTMENT_SKILLS: Record<string, string[]> = {
    'Development (Web/Application)': [
        'JavaScript', 'TypeScript', 'React', 'Node.js', 'Next.js', 'Django', 
        'Python', 'HTML/CSS', 'PostgreSQL', 'MongoDB', 'REST APIs', 'GraphQL', 'Git'
    ],
    'AI/ML Department': [
        'Python', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 
        'Scikit-learn', 'NLP', 'Computer Vision', 'Pandas', 'NumPy', 'Data Science'
    ],
    'Data Analytics': [
        'SQL', 'Python', 'R', 'Tableau', 'Power BI', 'Data Visualization', 
        'Excel', 'Statistics', 'Pandas', 'Data Warehousing'
    ],
    'Cloud & DevOps': [
        'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Linux', 
        'CI/CD', 'Jenkins', 'Terraform', 'Bash', 'Networking'
    ],
    'UI/UX': [
        'Figma', 'Adobe XD', 'Sketch', 'Wireframing', 'Prototyping', 
        'User Research', 'UI/UX Design', 'HTML/CSS', 'Web Design'
    ],
    'SOC': [
        'Cybersecurity', 'SIEM', 'Network Security', 'Splunk', 'Wireshark', 
        'Incident Response', 'Linux', 'Threat Hunting', 'Firewalls'
    ],
    'VAPT': [
        'Penetration Testing', 'Ethical Hacking', 'Burp Suite', 'Metasploit', 
        'OWASP', 'Vulnerability Assessment', 'Kali Linux', 'Web App Security'
    ],
    'Other': [
        'Agile', 'Scrum', 'Project Management', 'Communication', 'Leadership'
    ]
};

const ALL_SKILLS = Array.from(new Set(Object.values(DEPARTMENT_SKILLS).flat()));

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
            email_notifications_enabled: true,
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

    const [skillSearch, setSkillSearch] = useState('');
    const [showSkillDropdown, setShowSkillDropdown] = useState(false);
    const skillDropdownRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (skillDropdownRef.current && !skillDropdownRef.current.contains(event.target as Node)) {
                setShowSkillDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                        email_notifications_enabled: data.user.email_notifications_enabled ?? true,
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
            } else {
                setFormData({
                    user: {
                        full_name: data.user.full_name,
                        department: data.user.department,
                        email_notifications_enabled: data.user.email_notifications_enabled ?? true,
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

        toast.promise(api.patch('/interns/my-profile/', formData), {
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

    const handleAddSkill = (skill: string) => {
        if (skill.trim() && !formData.profile.skills.includes(skill.trim())) {
            handleInputChange('profile', 'skills', [...formData.profile.skills, skill.trim()]);
        }
        setSkillSearch('');
        setShowSkillDropdown(false);
    };

    const handleRemoveSkill = (skillToRemove: string) => {
        const newSkills = formData.profile.skills.filter(s => s !== skillToRemove);
        handleInputChange('profile', 'skills', newSkills);
    };

    const handleInputChange = (section: 'user' | 'profile', field: string, value: string | string[] | boolean) => {
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

    const getRoleDisplayName = (role?: string) => {
        switch (role) {
            case 'ADMIN': return 'Super Admin';
            case 'MANAGER': return 'Admin';
            case 'INTERN': return 'Intern';
            default: return role || 'N/A';
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
                                {getRoleDisplayName(userData?.role)}
                            </span>
                            {userData?.role !== 'ADMIN' && (
                                <span className="flex items-center gap-1 text-[var(--text-dim)]">
                                    <Building size={14} className="text-purple-400" />
                                    {userData?.department || 'No department'}
                                </span>
                            )}
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

                        {/* Email Notifications Toggle */}
                        <div className="flex items-center justify-between p-4 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl">
                            <div>
                                <h4 className="text-sm font-bold text-[var(--text-main)]">Email Notifications</h4>
                                <p className="text-xs text-[var(--text-dim)] font-medium mt-0.5">Receive task updates, assignments, and alerts via email.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleInputChange('user', 'email_notifications_enabled', !formData.user.email_notifications_enabled)}
                                className={`w-12 h-6 rounded-full transition-all duration-300 relative shadow-inner ${formData.user.email_notifications_enabled ? 'bg-purple-500 shadow-purple-500/20' : 'bg-slate-600'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-sm ${formData.user.email_notifications_enabled ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        {userData?.role === 'MANAGER' && (
                            <div className="group">
                                <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Department</label>
                                <CustomSelect
                                    options={[
                                        { value: 'Development (Web/Application)', label: 'Development (Web/Application)' },
                                        { value: 'AI/ML Department', label: 'AI/ML Department' },
                                        { value: 'Data Analytics', label: 'Data Analytics' },
                                        { value: 'Cloud & DevOps', label: 'Cloud & DevOps' },
                                        { value: 'UI/UX', label: 'UI/UX' },
                                        { value: 'SOC', label: 'SOC' },
                                        { value: 'VAPT', label: 'VAPT' },
                                    ]}
                                    value={formData.user.department}
                                    onChange={(val) => handleInputChange('user', 'department', val)}
                                    placeholder="Select Department"
                                    accent="purple"
                                    icon={<Building size={16} />}
                                />
                            </div>
                        )}
                    </div>
                </Card>

                {/* Professional Details */}
                <Card icon={<Briefcase size={20} />} title="Professional Details" subtitle="Your work and education information" overflowVisible={true}>
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

                                <div className="group" ref={skillDropdownRef}>
                                    <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Skills</label>
                                    
                                    {/* Selected Skills Badges */}
                                    {formData.profile.skills.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {formData.profile.skills.map(skill => (
                                                <span key={skill} className="px-3 py-1 text-sm font-medium bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/30 flex items-center gap-1">
                                                    {skill}
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemoveSkill(skill)}
                                                        className="hover:bg-purple-500/20 rounded-full p-0.5 transition-colors"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Search Input */}
                                    <div className="relative">
                                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-purple-400 transition-colors" />
                                        <input
                                            type="text"
                                            value={skillSearch}
                                            onChange={(e) => {
                                                setSkillSearch(e.target.value);
                                                setShowSkillDropdown(true);
                                            }}
                                            onFocus={() => setShowSkillDropdown(true)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && skillSearch.trim()) {
                                                    e.preventDefault();
                                                    handleAddSkill(skillSearch);
                                                }
                                            }}
                                            className="w-full pl-12 pr-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all hover:border-purple-500/30"
                                            placeholder="Search or type a skill and press Enter..."
                                        />
                                        
                                        {/* Dropdown Menu */}
                                        {showSkillDropdown && (
                                            <div className="absolute z-50 w-full mt-2 bg-[var(--bg-color)] border border-purple-500/30 rounded-xl shadow-2xl shadow-black/50 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar animate-scale-in">
                                                <div className="p-0">
                                                    {skillSearch.trim() && !ALL_SKILLS.some(s => s.toLowerCase() === skillSearch.toLowerCase()) && !formData.profile.skills.some(s => s.toLowerCase() === skillSearch.toLowerCase()) && (
                                                        <div className="p-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAddSkill(skillSearch)}
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                                                            >
                                                                <Award size={16} />
                                                                Add "{skillSearch}"
                                                            </button>
                                                        </div>
                                                    )}
                                                    
                                                    {skillSearch.trim() ? (
                                                        <div className="p-2">
                                                            {ALL_SKILLS
                                                                .filter(skill => skill.toLowerCase().includes(skillSearch.toLowerCase()) && !formData.profile.skills.includes(skill))
                                                                .map(skill => (
                                                                    <button
                                                                        key={skill}
                                                                        type="button"
                                                                        onClick={() => handleAddSkill(skill)}
                                                                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-left text-[var(--text-main)] hover:bg-purple-500/10 hover:text-purple-300 rounded-lg transition-colors"
                                                                    >
                                                                        {skill}
                                                                        <Check size={14} className="opacity-0 group-hover:opacity-100" />
                                                                    </button>
                                                                ))
                                                            }
                                                            {ALL_SKILLS.filter(skill => skill.toLowerCase().includes(skillSearch.toLowerCase()) && !formData.profile.skills.includes(skill)).length === 0 && (
                                                                <div className="px-3 py-2 text-sm text-[var(--text-dim)] text-center">
                                                                    Press Enter to add this custom skill
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="py-2">
                                                            {[
                                                                ...(userData?.department && DEPARTMENT_SKILLS[userData.department] ? [[userData.department, DEPARTMENT_SKILLS[userData.department]]] : []),
                                                                ...Object.entries(DEPARTMENT_SKILLS).filter(([d]) => d !== userData?.department)
                                                            ].map(([dept, skills]) => {
                                                                const availableSkills = (skills as string[]).filter(s => !formData.profile.skills.includes(s));
                                                                if (availableSkills.length === 0) return null;
                                                                return (
                                                                    <div key={dept as string} className="mb-4 last:mb-0">
                                                                        <div className="px-4 py-1.5 text-xs font-black text-purple-400/80 uppercase tracking-widest bg-purple-500/5 border-y border-purple-500/10 sticky top-0 z-10 backdrop-blur-sm">
                                                                            {dept as string}
                                                                        </div>
                                                                        <div className="px-2 pt-1">
                                                                            {availableSkills.map(skill => (
                                                                                <button
                                                                                    key={skill}
                                                                                    type="button"
                                                                                    onClick={() => handleAddSkill(skill)}
                                                                                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-left text-[var(--text-main)] hover:bg-purple-500/10 hover:text-purple-300 rounded-lg transition-colors group"
                                                                                >
                                                                                    {skill}
                                                                                    <Check size={14} className="opacity-0 group-hover:opacity-100 text-purple-400" />
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
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
