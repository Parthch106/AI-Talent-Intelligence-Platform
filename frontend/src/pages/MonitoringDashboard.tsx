import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useMonitoring } from '../context/MonitoringContext';
import { Modal, Button } from '../components/common';
import {
    OverviewTab, TasksTab, AttendanceTab,
    PerformanceTab, WeeklyReportsTab
} from '../components/monitoring';
import { Home, Target, Calendar, TrendingUp, FileText, CheckCircle, ChevronDown, X, Plus, FileUp } from 'lucide-react';

// Types
interface Task {
    id: number;
    task_id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    due_date: string;
    estimated_hours: number;
    actual_hours: number;
    quality_rating: number | null;
    code_review_score: number | null;
    bug_count: number;
    mentor_feedback: string;
    rework_required: boolean;
}

interface Attendance {
    id: number;
    date: string;
    status: string;
    check_in_time: string;
    check_out_time: string;
    working_hours: number;
}

interface WeeklyReport {
    id: number;
    week_start_date: string;
    week_end_date: string;
    tasks_completed: number;
    tasks_in_progress: number;
    tasks_blocked: number;
    accomplishments: string;
    challenges?: string;
    learnings?: string;
    next_week_goals?: string;
    self_rating: number | null;
    is_submitted: boolean;
    is_reviewed?: boolean;
    pdf_url: string | null;
    submitted_at?: string;
}

interface PerformanceMetric {
    overall_performance_score: number;
    productivity_score: number;
    quality_score: number;
    engagement_score: number;
    growth_score: number;
    task_completion_rate: number;
    attendance_rate: number;
    dropout_risk: string;
    dropout_risk_score: number;
    full_time_readiness_score: number;
    promotion_probability: number;
    // Added for dashboard compatibility
    performance_status?: string;
    reasoning?: string;
}

interface Intern {
    id: number;
    email: string;
    full_name: string | null;
    department: string | null;
}

type ModalType = 'task' | 'attendance' | 'report' | null;

const MonitoringDashboard: React.FC = () => {
    const tabs = useMemo(() => [
        { id: 'overview', label: 'Overview', icon: Home },
        { id: 'tasks', label: 'Tasks', icon: Target },
        { id: 'attendance', label: 'Attendance', icon: Calendar },
        { id: 'performance', label: 'Performance', icon: TrendingUp },
        { id: 'weekly-reports', label: 'Weekly Reports', icon: FileText },
    ], []);

    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Global Monitoring Context
    const { selectedInternId: selectedIntern, setSelectedInternId: setSelectedIntern, interns } = useMonitoring();

    // State
    const [activeTab, setActiveTab] = useState<string>('overview');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [performance, setPerformance] = useState<PerformanceMetric | null>(null);
    const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [success, setSuccess] = useState<string>('');
    const [showInternDropdown, setShowInternDropdown] = useState(false);
    
    // Super Admin Filters
    const [departmentFilter, setDepartmentFilter] = useState<string>('');
    const [departmentsList, setDepartmentsList] = useState<string[]>([]);
    
    // Filtering states shared between tabs
    const [monthFilter, setMonthFilter] = useState<number | 'all'>(new Date().getMonth() + 1);
    const [yearFilter, setYearFilter] = useState<number | 'all'>(new Date().getFullYear());

    // API Functions
    useEffect(() => {
        if (user?.role === 'ADMIN') {
            axios.get('/accounts/departments/')
                .then(res => setDepartmentsList(res.data.departments || []))
                .catch(err => console.error('Error fetching departments:', err));
        }
    }, [user?.role]);

    const fetchData = useCallback(async (): Promise<void> => {
        setLoading(true);
        if ((user?.role === 'ADMIN' || user?.role === 'MANAGER') && !selectedIntern) {
            setLoading(false);
            return;
        }
        const targetId = (user?.role === 'INTERN' ? user.id : selectedIntern) as number;
        try {
            const [tasksRes, attendanceRes, performanceRes, reportsRes] = await Promise.all([
                axios.get('/analytics/tasks/', { params: { intern_id: targetId } }),
                axios.get('/analytics/attendance/', { params: { intern_id: targetId } }),
                axios.get(`/analytics/performance/dashboard/${targetId}/?all_time=true`),
                axios.get('/analytics/weekly-reports/', { params: { intern_id: targetId } })
            ]);
            const tasks = Array.isArray(tasksRes.data.tasks) ? tasksRes.data.tasks : [];
            const attendance = Array.isArray(attendanceRes.data.attendance) ? attendanceRes.data.attendance : [];
            const dashboardData = performanceRes.data;
            const performance: PerformanceMetric | null = dashboardData ? {
                overall_performance_score: (dashboardData.performance_score || 0) * 100,
                productivity_score: (dashboardData.metrics?.completion_rate || 0) * 100,
                quality_score: (dashboardData.metrics?.quality_score || 0) * 100,
                engagement_score: (dashboardData.metrics?.engagement || 0) * 100,
                growth_score: (dashboardData.metrics?.growth_velocity || 0) * 100,
                task_completion_rate: (dashboardData.metrics?.completion_rate || 0) * 100,
                attendance_rate: (dashboardData.metrics?.engagement || 0) * 100,
                dropout_risk: dashboardData.performance_status === 'High Risk' ? 'HIGH' : 
                             dashboardData.performance_status === 'Struggling' ? 'MEDIUM' : 'LOW',
                dropout_risk_score: (dashboardData.metrics?.dropout_risk || 0) * 100,
                full_time_readiness_score: (dashboardData.performance_score || 0) * 100,
                promotion_probability: (dashboardData.performance_score || 0) * 100,
                performance_status: dashboardData.performance_status,
                reasoning: dashboardData.reasoning
            } : null;
            const weeklyReports = Array.isArray(reportsRes.data.weekly_reports) ? reportsRes.data.weekly_reports : [];
            setTasks(tasks);
            setAttendance(attendance);
            setPerformance(performance);
            setWeeklyReports(weeklyReports);
        } catch (err: unknown) {
            const apiError = err as { message?: string; response?: { data?: unknown; status?: number } };
            console.error('[fetchData] Error fetching data:', apiError.message || apiError);
        }
        setLoading(false);
    }, [user?.role, user?.id, selectedIntern]);

    // Form states
    const [attendanceForm, setAttendanceForm] = useState({
        date: new Date().toISOString().split('T')[0], status: 'PRESENT', check_in_time: '', check_out_time: '', notes: '',
    });
    const [pdfFile, setPdfFile] = useState<File | null>(null);


    useEffect(() => {
        const path = location.pathname.split('/').pop();
        if (path && tabs.some(t => t.id === path)) {
            setActiveTab(path);
        } else {
            setActiveTab('overview');
        }
    }, [location.pathname, tabs]);

    // Fetch data when page loads (for interns/managers)
    useEffect(() => {
        if (user?.role === 'INTERN') {
            // For interns, fetch data directly
            fetchData();
        }
    }, [user?.role, user?.id, fetchData]);

    // Fetch data when tab changes or selectedIntern is set - with proper chaining
    useEffect(() => {
        // For managers, ensure an intern is selected
        if ((user?.role === 'ADMIN' || user?.role === 'MANAGER')) {
            if (interns.length > 0 && !selectedIntern) {
                setSelectedIntern(interns[0].id);
            } else if (selectedIntern) {
                fetchData();
            }
        } else if (user?.role === 'INTERN') {
            // For interns, always fetch data
            fetchData();
        }
    }, [selectedIntern, activeTab, user?.role, interns, fetchData]);


    // Handlers
    const handleTabChange = (tabId: string): void => {
        setActiveTab(tabId);
        setActiveModal(null);
        navigate(`/monitoring/${tabId}`);

        // For managers/admins, ensure an intern is selected before fetching data
        if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
            if (!selectedIntern && interns.length > 0) {
                setSelectedIntern(interns[0].id);
            }
            if (selectedIntern) {
                fetchData();
            }
        } else if (user?.role === 'INTERN') {
            // For interns, always fetch data
            fetchData();
        }
    };

    const openModal = (modalType: ModalType): void => {
        setActiveModal(modalType);
    };
    const closeModal = (): void => setActiveModal(null);

    const handleMarkAttendance = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        try {
            // For managers/admins, include the selected intern's ID
            const attendanceData = {
                ...attendanceForm,
                ...((user?.role === 'ADMIN' || user?.role === 'MANAGER') && selectedIntern ? { intern_id: selectedIntern } : {})
            };
            await axios.post('/analytics/attendance/mark/', attendanceData);
            setSuccess('Attendance marked successfully!');
            closeModal();
            setAttendanceForm({ date: new Date().toISOString().split('T')[0], status: 'PRESENT', check_in_time: '', check_out_time: '', notes: '' });
            fetchData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error marking attendance:', err);
        }
    };

    const handleSubmitReport = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        if (!pdfFile) {
            setSuccess('Please select a PDF file to upload');
            return;
        }
        try {
            const formData = new FormData();
            formData.append('pdf_report', pdfFile);
            await axios.post('/analytics/weekly-reports/submit/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSuccess('Weekly report submitted successfully!');
            closeModal();
            setPdfFile(null);
            fetchData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error submitting report:', err);
        }
    };

    const handleTaskStatusChange = async (taskId: number, newStatus: string): Promise<void> => {
        // Optimistic UI update to prevent abrupt re-renders
        setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        
        try {
            await axios.patch(`/analytics/tasks/${taskId}/update-status/`, {
                status: newStatus
            });
            setSuccess(`Task status updated to ${newStatus.replace('_', ' ')}`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error updating task status:', err);
            setSuccess('Failed to update task status');
            fetchData(); // Revert on failure
            setTimeout(() => setSuccess(''), 3000);
        }
    };

    const getSelectedInternName = () => {
        const intern = interns.find(i => i.id === selectedIntern);
        return intern?.full_name || intern?.email || 'Select Intern';
    };

    const getGradient = (name: string): string => {
        const colors = [
            'from-purple-500 via-pink-500 to-rose-500',
            'from-blue-500 via-cyan-500 to-teal-500',
            'from-amber-500 via-orange-500 to-red-500',
            'from-emerald-500 via-green-500 to-lime-500',
            'from-indigo-500 via-violet-500 to-purple-500',
        ];
        const index = (name?.charCodeAt(0) || 0) % colors.length;
        return colors[index];
    };

    const getInitials = (name: string | null) => {
        if (!name) return 'NA';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };



    return (
        <div className="min-h-screen animate-fade-in overflow-visible">
            {/* Header */}
            <div className="bg-[var(--card-bg)] px-8 py-8 backdrop-blur-3xl border-b border-[var(--border-color)] overflow-visible z-30 relative mb-8 rounded-[2rem] mx-6 mt-6 glass-card">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 overflow-visible">
                    <div>
                        <h1 className="text-4xl font-heading font-black tracking-tighter text-[var(--text-main)] uppercase leading-none mb-3">
                            {activeTab === 'overview' ? (
                                <>Internship <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Monitoring</span></>
                            ) : activeTab === 'tasks' ? (
                                <>Task <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Management</span></>
                            ) : activeTab === 'attendance' ? (
                                <>Attendance <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Tracker</span></>
                            ) : activeTab === 'reports' || activeTab === 'weekly-reports' ? (
                                <>Weekly <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Reports</span></>
                            ) : (
                                <><span className="capitalize">{activeTab}</span> <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Dashboard</span></>
                            )}
                        </h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-dim)]">
                            {activeTab === 'overview' ? 'Operation: Talent Intelligence • Status: Active' : `Module: ${activeTab.replace('-', ' ')} • Status: Active`}
                        </p>
                    </div>
                    {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                        <div className="flex items-center gap-3 relative z-30">
                            {user?.role === 'ADMIN' && (
                                <select
                                    value={departmentFilter}
                                    onChange={(e) => {
                                        setDepartmentFilter(e.target.value);
                                        setSelectedIntern(null);
                                    }}
                                    className="bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-main)] px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-purple-500"
                                >
                                    <option value="">All Departments</option>
                                    {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            )}
                            <div className="relative z-30">
                                <button
                                    onClick={() => setShowInternDropdown(!showInternDropdown)}
                                    className="flex items-center gap-3 px-4 py-2.5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl hover:border-purple-500/50 transition-all"
                                >
                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getGradient(getSelectedInternName())} flex items-center justify-center text-white font-bold text-xs`}>
                                        {getInitials(interns.find(i => i.id === selectedIntern)?.full_name || null)}
                                    </div>
                                    <span className="text-[var(--text-main)]">{getSelectedInternName()}</span>
                                    <ChevronDown size={16} className={`text-[var(--text-dim)] transition-transform ${showInternDropdown ? 'rotate-180' : ''}`} />
                                </button>
                                {showInternDropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-muted)] backdrop-blur-xl border border-[var(--border-color)] rounded-xl shadow-xl z-[9999] isolate animate-scale-in max-h-64 overflow-y-auto">
                                        <div className="p-2">
                                            {interns
                                                .filter(intern => departmentFilter ? intern.department === departmentFilter : true)
                                                .map((intern) => (
                                            <button
                                                key={intern.id}
                                                onClick={() => {
                                                    setSelectedIntern(intern.id);
                                                    setShowInternDropdown(false);
                                                }}
                                                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${selectedIntern === intern.id ? 'bg-purple-500/20' : 'hover:bg-[var(--bg-color)]'}`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getGradient(intern.full_name || intern.email)} flex items-center justify-center text-white font-bold text-xs`}>
                                                    {getInitials(intern.full_name)}
                                                </div>
                                                <span className="text-[var(--text-main)] text-sm">{intern.full_name || intern.email}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>

            {/* Success Message */}
            {success && (
                <div className="mx-6 mt-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-2 animate-slide-up">
                    <CheckCircle size={18} />
                    {success}
                </div>
            )}



            {/* Content */}
            <div className="p-6">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                            <p className="text-[var(--text-dim)]">Loading data...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'overview' && (
                            <OverviewTab tasks={tasks} attendance={attendance} performance={performance} />
                        )}
                        {activeTab === 'tasks' && (
                             <TasksTab
                                tasks={tasks}
                                onAddTask={() => navigate(selectedIntern ? `/management/tasks/create/${selectedIntern}` : '/management/tasks/create')}
                                canCreate={user?.role === 'ADMIN' || user?.role === 'MANAGER'}
                                onStatusChange={handleTaskStatusChange}
                                onRefresh={fetchData}
                                internId={selectedIntern || undefined}
                                internName={interns.find(i => i.id === selectedIntern)?.full_name || interns.find(i => i.id === selectedIntern)?.email || undefined}
                                monthFilter={monthFilter}
                                setMonthFilter={setMonthFilter}
                                yearFilter={yearFilter}
                                setYearFilter={setYearFilter}
                            />
                        )}
                        {activeTab === 'attendance' && (
                            <AttendanceTab
                                attendance={attendance}
                                onMarkAttendance={() => openModal('attendance')}
                                monthFilter={monthFilter}
                                setMonthFilter={setMonthFilter}
                                yearFilter={yearFilter}
                                setYearFilter={setYearFilter}
                                internId={selectedIntern || undefined}
                            />
                        )}
                        {activeTab === 'performance' && (
                            <PerformanceTab
                                performance={performance}
                                selectedInternId={selectedIntern}
                                onRefresh={fetchData}
                            />
                        )}
                        {activeTab === 'weekly-reports' && (
                            <WeeklyReportsTab
                                reports={weeklyReports}
                                onSubmitReport={() => openModal('report')}
                                showSubmit={user?.role === 'INTERN'}
                            />
                        )}
                    </>
                )}
            </div>



            {/* Attendance Modal */}
            <Modal
                isOpen={activeModal === 'attendance'}
                onClose={closeModal}
                title="Mark Attendance"
                gradient="emerald"
            >
                <form onSubmit={handleMarkAttendance} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Date</label>
                        <input
                            type="date"
                            required
                            value={attendanceForm.date}
                            onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
                            className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Status</label>
                        <select
                            value={attendanceForm.status}
                            onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })}
                            className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                        >
                            <option value="PRESENT">Present</option>
                            <option value="ABSENT">Absent</option>
                            <option value="LATE">Late</option>
                            <option value="WORK_FROM_HOME">Work From Home</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Check In</label>
                            <input
                                type="time"
                                value={attendanceForm.check_in_time}
                                onChange={(e) => setAttendanceForm({ ...attendanceForm, check_in_time: e.target.value })}
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Check Out</label>
                            <input
                                type="time"
                                value={attendanceForm.check_out_time}
                                onChange={(e) => setAttendanceForm({ ...attendanceForm, check_out_time: e.target.value })}
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button type="button" onClick={closeModal} variant="outline" fullWidth>
                            Cancel
                        </Button>
                        <Button type="submit" gradient="emerald" fullWidth>
                            Submit
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Report Modal - Only for Interns */}
            {user?.role === 'INTERN' && (
                <Modal
                    isOpen={activeModal === 'report'}
                    onClose={closeModal}
                    title="Submit Weekly Report"
                    gradient="violet"
                    size="md"
                >
                    <form onSubmit={handleSubmitReport} className="space-y-5">
                        <div className="bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl p-4">
                            <p className="text-sm text-[var(--text-dim)]">
                                Upload your weekly report as a PDF. Our AI engine will automatically parse it to synchronize with system task records.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">
                                <FileUp size={14} className="inline mr-1" />
                                PDF Document
                            </label>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                                    className="w-full px-4 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-500/20 file:text-purple-400 hover:file:bg-purple-500/30 cursor-pointer"
                                />
                                {pdfFile && (
                                    <div className="mt-2 flex items-center gap-2 text-emerald-400">
                                        <CheckCircle size={16} />
                                        <span className="text-sm">{pdfFile.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                onClick={closeModal}
                                variant="outline"
                                fullWidth
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                gradient="purple"
                                fullWidth
                                disabled={loading || !pdfFile}
                            >
                                {loading ? 'Processing...' : 'Upload & Sync'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default MonitoringDashboard;
