import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { X, UserPlus, ArrowLeft, Sparkles } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Card, Button, CustomSelect } from '../components/common';

interface Intern {
    id: number;
    email: string;
    full_name: string | null;
    department: string | null;
}

interface Project {
    id: number;
    name: string;
    description: string;
    assignments?: Array<{
        intern?: {
            id: number;
        };
    }>;
}

const AssignInternPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [project, setProject] = useState<Project | null>(null);
    const [interns, setInterns] = useState<Intern[]>([]);
    
    const [assignIntern, setAssignIntern] = useState({
        intern_id: 0,
        role: '',
    });

    const fetchProjectAndInterns = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError('');
        try {
            // Fetch project details
            const projectRes = await api.get(`/projects/projects/${projectId}/`);
            setProject(projectRes.data);

            // Fetch interns based on user role
            if (user?.role === 'MANAGER') {
                const deptInternsRes = await api.get('/interns/department-interns/');
                setInterns(deptInternsRes.data || []);
            } else {
                const internsRes = await api.get('/accounts/users/?role=INTERN');
                setInterns(internsRes.data || []);
            }
        } catch (err) {
            console.error("Failed to load details for assignment", err);
            setError("Failed to load project details or intern directories.");
        } finally {
            setLoading(false);
        }
    }, [projectId, user?.role]);

    useEffect(() => {
        fetchProjectAndInterns();
    }, [fetchProjectAndInterns]);

    const handleAssignSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!project || !assignIntern.intern_id || !assignIntern.role) {
            toast.error("Please fill in all required fields.");
            return;
        }

        setSubmitting(true);
        setError('');

        const savePromise = async () => {
            const response = await api.post('/projects/assignments/', {
                project_id: project.id,
                intern_id: assignIntern.intern_id,
                role: assignIntern.role,
            });
            return response.data;
        };

        toast.promise(savePromise(), {
            loading: 'Establishing resource assignment...',
            success: () => {
                navigate(`/directory/projects/${project.id}`);
                return 'Intern assigned successfully';
            },
            error: (err) => {
                setSubmitting(false);
                const apiError = err as { response?: { data?: { detail?: string } } };
                const errorMsg = apiError.response?.data?.detail || 'Failed to assign intern';
                setError(errorMsg);
                return errorMsg;
            }
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                    <p className="text-[var(--text-dim)] animate-pulse">Retrieving project & intern indexes...</p>
                </div>
            </div>
        );
    }

    // Filter out interns who are already assigned to this project
    const availableInterns = interns.filter(
        intern => !project?.assignments?.some(a => a.intern?.id === intern.id)
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-6">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm font-medium text-[var(--text-dim)] hover:text-purple-400 transition-colors"
            >
                <ArrowLeft size={16} /> Back to Details
            </button>

            <div>
                <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2 flex items-center gap-3">
                    <UserPlus className="text-purple-500" />
                    Assign Intern to <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{project?.name}</span>
                </h1>
                <p className="text-[var(--text-dim)]">Link an intern from your department directory to this project scope.</p>
            </div>

            <Card padding="lg" className="border-purple-500/10">
                <form onSubmit={handleAssignSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                            <X size={16} />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Select Intern *</label>
                            <CustomSelect
                                value={assignIntern.intern_id ? String(assignIntern.intern_id) : ''}
                                onChange={(v) => {
                                    const selectedId = Number(v);
                                    const selectedIntern = interns.find(i => i.id === selectedId);
                                    const defaultRole = selectedIntern?.department ? `${selectedIntern.department} Intern` : 'Intern';
                                    setAssignIntern(prev => ({ 
                                        ...prev, 
                                        intern_id: selectedId,
                                        role: defaultRole
                                    }));
                                }}
                                options={[
                                    { value: '', label: 'Select an intern...' },
                                    ...availableInterns.map(intern => ({
                                        value: String(intern.id),
                                        label: `${intern.full_name || 'No Name'} (${intern.email})`
                                    }))
                                ]}
                                accent="purple"
                            />
                            {availableInterns.length === 0 && (
                                <p className="text-xs mt-1.5 text-yellow-500/80">No available unassigned interns found in your scope.</p>
                            )}
                        </div>

                        <div className="md:col-span-2 group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Role in Project *</label>
                            <input
                                type="text"
                                required
                                value={assignIntern.role}
                                onChange={e => setAssignIntern(prev => ({ ...prev, role: e.target.value }))}
                                placeholder="e.g., Frontend Developer"
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-color)]">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => navigate(-1)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            gradient="purple"
                            loading={submitting}
                            disabled={!assignIntern.intern_id || !assignIntern.role}
                            icon={<Sparkles size={18} />}
                        >
                            Assign Intern
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default AssignInternPage;
