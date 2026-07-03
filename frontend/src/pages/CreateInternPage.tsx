import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { X, Mail, Phone, Building, UserPlus, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Card, Button, CustomSelect } from '../components/common';

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

interface AvailableIntern {
    id: number;
    full_name: string;
    email: string;
}

const CreateInternPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [availableInterns, setAvailableInterns] = useState<AvailableIntern[]>([]);
    const [selectedInternId, setSelectedInternId] = useState<number | ''>('');
    const [skillsText, setSkillsText] = useState('');
    
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

    const isManager = user?.role === 'MANAGER';

    useEffect(() => {
        if (isManager) {
            fetchAvailableInterns();
        }
    }, [isManager]);

    const fetchAvailableInterns = async () => {
        try {
            const response = await api.get('/interns/available-for-assignment/');
            setAvailableInterns(response.data || []);
        } catch (e) {
            console.error('Error fetching available interns:', e);
            // Fallback: if endpoint doesn't exist yet, try all interns list
            try {
                const response = await api.get('/accounts/users/?role=INTERN');
                setAvailableInterns(response.data || []);
            } catch (fallbackError) {
                console.error('Fallback fetching interns failed:', fallbackError);
            }
        }
    };

    const handleSkillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSkillsText(e.target.value);
        const skills = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
        setNewIntern(prev => ({
            ...prev,
            profile: { ...prev.profile, skills }
        }));
    };

    const handleAddIntern = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        const actionPromise = async () => {
            if (isManager) {
                if (!selectedInternId) throw new Error('Please select an intern');
                await api.post('/interns/assign-intern/', { intern_id: selectedInternId });
            } else {
                await api.post('/interns/create/', newIntern);
            }
        };

        toast.promise(actionPromise(), {
            loading: isManager ? 'Assigning intern to department...' : 'Initializing new intern node...',
            success: () => {
                navigate('/directory/interns');
                return isManager ? 'Intern assigned successfully' : 'Intern created successfully';
            },
            error: (err) => {
                setSubmitting(false);
                const apiError = err as { response?: { data?: { detail?: string, error?: string } } };
                return apiError.response?.data?.detail || apiError.response?.data?.error || err.message || 'Failed to add intern';
            }
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-6">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm font-medium text-[var(--text-dim)] hover:text-purple-400 transition-colors"
            >
                <ArrowLeft size={16} /> Back to Directory
            </button>

            <div>
                <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2 flex items-center gap-3">
                    <UserPlus className="text-purple-500" />
                    {isManager ? 'Add Existing' : 'Create New'} <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Intern</span>
                </h1>
                <p className="text-[var(--text-dim)]">
                    {isManager 
                        ? 'Select and assign an existing intern to your department.' 
                        : 'Register a new intern account and set up their profile credentials.'}
                </p>
            </div>

            <Card padding="lg" className="border-purple-500/10">
                <form onSubmit={handleAddIntern} className="space-y-6" autoComplete="off">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                            <X size={16} />
                            {error}
                        </div>
                    )}

                    {isManager ? (
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
                                    <p className="text-[var(--text-dim)]">All available interns have already been assigned.</p>
                                </div>
                            ) : (
                                <div className="group">
                                    <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">
                                        Available Interns
                                    </label>
                                    <CustomSelect
                                        options={[
                                            { value: '', label: 'Select an intern...', disabled: true },
                                            ...availableInterns.map((intern) => ({
                                                value: String(intern.id),
                                                label: `${intern.full_name || 'N/A'} (${intern.email})`
                                            }))
                                        ]}
                                        value={String(selectedInternId || '')}
                                        onChange={(v) => setSelectedInternId(Number(v))}
                                        placeholder="Select an intern..."
                                        accent="purple"
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2 space-y-4">
                                    <h4 className="text-sm font-semibold text-[var(--text-dim)] flex items-center gap-2">
                                        <div className="w-1 h-4 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full"></div>
                                        Basic Information
                                    </h4>
                                </div>

                                <div className="group">
                                    <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        autoComplete="off"
                                        value={newIntern.user.full_name}
                                        onChange={e => setNewIntern(prev => ({
                                            ...prev,
                                            user: { ...prev.user, full_name: e.target.value }
                                        }))}
                                        className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
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
                                            autoComplete="off"
                                            value={newIntern.user.email}
                                            onChange={e => setNewIntern(prev => ({
                                                ...prev,
                                                user: { ...prev.user, email: e.target.value }
                                            }))}
                                            className="w-full pl-12 pr-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="group md:col-span-2">
                                    <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Password *</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={8}
                                        autoComplete="new-password"
                                        value={newIntern.user.password}
                                        onChange={e => setNewIntern(prev => ({
                                            ...prev,
                                            user: { ...prev.user, password: e.target.value }
                                        }))}
                                        className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                                        placeholder="••••••••"
                                    />
                                    <p className="text-xs text-[var(--text-muted)] mt-1">Minimum 8 characters</p>
                                </div>

                                <div className="md:col-span-2 space-y-4 pt-4 border-t border-[var(--border-color)]">
                                    <h4 className="text-sm font-semibold text-[var(--text-dim)] flex items-center gap-2">
                                        <div className="w-1 h-4 bg-gradient-to-b from-indigo-400 to-purple-400 rounded-full"></div>
                                        Profile Information
                                    </h4>
                                </div>

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
                                            className="w-full pl-12 pr-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
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
                                            className="w-full pl-12 pr-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>
                                </div>

                                <div className="group md:col-span-2">
                                    <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Skills</label>
                                    <input
                                        type="text"
                                        placeholder="Python, JavaScript, React..."
                                        value={skillsText}
                                        onChange={handleSkillChange}
                                        className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                                    />
                                    <p className="text-xs text-[var(--text-muted)] mt-1">Separate skills with commas</p>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex gap-4 pt-6 border-t border-[var(--border-color)]">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => navigate('/directory/interns')}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            gradient="purple"
                            loading={submitting}
                            disabled={isManager && availableInterns.length === 0}
                            className="flex-1"
                        >
                            {isManager ? 'Add Intern' : 'Create Intern'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default CreateInternPage;
