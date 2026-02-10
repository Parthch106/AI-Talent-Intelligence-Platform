import React, { useEffect, useState } from 'react';
import { UserPlus, Search, Filter, X } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

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
            const response = await api.get('/interns/profiles/');
            setInterns(response.data);
        } catch (error) {
            console.error("Failed to fetch interns", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInterns();
    }, []);

    const handleAddIntern = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            await api.post('/interns/create/', newIntern);
            setShowAddModal(false);
            setNewIntern({
                user: { email: '', full_name: '', password: '' },
                profile: { university: '', phone_number: '', skills: [] },
            });
            fetchInterns();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to create intern');
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

    if (loading) return <div>Loading interns...</div>;

    const showAddButton = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    return (
        <div>
            <div className="header" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                    <div className="card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <Search size={18} color="var(--text-dim)" />
                        <input
                            type="text"
                            placeholder="Search interns by name, university..."
                            style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%' }}
                        />
                    </div>
                    <button style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Filter size={18} /> Filter
                    </button>
                </div>
                {showAddButton && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '1rem' }}
                    >
                        <UserPlus size={18} /> Add Intern
                    </button>
                )}
            </div>

            <div className="card" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ color: 'var(--text-dim)', fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '1rem' }}>Name</th>
                            <th style={{ padding: '1rem' }}>Email</th>
                            <th style={{ padding: '1rem' }}>University</th>
                            <th style={{ padding: '1rem' }}>Status</th>
                            <th style={{ padding: '1rem' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {interns.length === 0 ? (
                            <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center' }}>No interns found.</td></tr>
                        ) : (
                            interns.map((intern) => (
                                <tr key={intern.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1rem' }}>{intern.user?.full_name || 'N/A'}</td>
                                    <td style={{ padding: '1rem' }}>{intern.user?.email || 'N/A'}</td>
                                    <td style={{ padding: '1rem' }}>{intern.university}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '0.25rem',
                                            background: 'rgba(16, 185, 129, 0.1)',
                                            color: '#10b981',
                                            fontSize: '0.75rem'
                                        }}>
                                            {intern.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <button style={{ background: 'transparent', color: 'var(--primary-color)', padding: 0 }}>View Profile</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Intern Modal */}
            {showAddModal && (
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
                            <h3 style={{ margin: 0 }}>Add New Intern</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                style={{ background: 'transparent', padding: '0.5rem' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {error && (
                            <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleAddIntern}>
                            <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-dim)', fontSize: '0.875rem' }}>User Information</h4>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={newIntern.user.full_name}
                                    onChange={e => setNewIntern(prev => ({
                                        ...prev,
                                        user: { ...prev.user, full_name: e.target.value }
                                    }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={newIntern.user.email}
                                    onChange={e => setNewIntern(prev => ({
                                        ...prev,
                                        user: { ...prev.user, email: e.target.value }
                                    }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Password *</label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={newIntern.user.password}
                                    onChange={e => setNewIntern(prev => ({
                                        ...prev,
                                        user: { ...prev.user, password: e.target.value }
                                    }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>

                            <h4 style={{ marginBottom: '0.5rem', marginTop: '1.5rem', color: 'var(--text-dim)', fontSize: '0.875rem' }}>Profile Information</h4>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>University</label>
                                <input
                                    type="text"
                                    value={newIntern.profile.university}
                                    onChange={e => setNewIntern(prev => ({
                                        ...prev,
                                        profile: { ...prev.profile, university: e.target.value }
                                    }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Phone Number</label>
                                <input
                                    type="text"
                                    value={newIntern.profile.phone_number}
                                    onChange={e => setNewIntern(prev => ({
                                        ...prev,
                                        profile: { ...prev.profile, phone_number: e.target.value }
                                    }))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Skills (comma-separated)</label>
                                <input
                                    type="text"
                                    placeholder="Python, JavaScript, React..."
                                    value={newIntern.profile.skills.join(', ')}
                                    onChange={handleSkillChange}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'white' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.25rem', border: 'none', background: 'var(--primary-color)', color: 'white', cursor: 'pointer' }}
                                >
                                    {submitting ? 'Creating...' : 'Create Intern'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InternList;
