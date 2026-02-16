import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Modal, Button } from '../components/common';
import {
    OverviewTab, TasksTab, AttendanceTab,
    PerformanceTab, WeeklyReportsTab
} from '../components/monitoring';
import { Home, Target, Calendar, TrendingUp, FileText, CheckCircle, ChevronDown } from 'lucide-react';

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
}

interface Intern {
    id: number;
    email: string;
    full_name: string | null;
    department: string | null;
}

type ModalType = 'task' | 'attendance' | 'report' | null;

const MonitoringDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // State
    const [activeTab, setActiveTab] = useState<string>('overview');
    const [selectedIntern, setSelectedIntern] = useState<number | null>(null);
    const [interns, setInterns] = useState<Intern[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [performance, setPerformance] = useState<PerformanceMetric | null>(null);
    const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [success, setSuccess] = useState<string>('');
    const [showInternDropdown, setShowInternDropdown] = useState(false);

    // Form states
    const [taskForm, setTaskForm] = useState({
        title: '', description: '', priority: 'MEDIUM', due_date: '', estimated_hours: 0,
    });
    const [attendanceForm, setAttendanceForm] = useState({
        date: new Date().toISOString().split('T')[0], status: 'PRESENT', check_in_time: '', check_out_time: '', notes: '',
    });
    const [reportForm, setReportForm] = useState({
        week_start_date: '', week_end_date: '', tasks_completed: 0, tasks_in_progress: 0, tasks_blocked: 0,
        accomplishments: '', challenges: '', learnings: '', next_week_goals: '', self_rating: 5,
    });
    const [pdfFile, setPdfFile] = useState<File | null>(null);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Home },
        { id: 'tasks', label: 'Tasks', icon: Target },
        { id: 'attendance', label: 'Attendance', icon: Calendar },
        { id: 'performance', label: 'Performance', icon: TrendingUp },
        { id: 'weekly-reports', label: 'Weekly Reports', icon: FileText },
    ];

    useEffect(() => {
        const path = location.pathname.split('/').pop();
        if (path && tabs.some(t => t.id === path)) {
            setActiveTab(path);
        } else {
            setActiveTab('overview');
        }
    }, [location.pathname]);

    // Fetch interns when page loads (for managers/admins)
    useEffect(() => {
        if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
            fetchInterns();
        } else if (user?.role === 'INTERN') {
            // For interns, fetch data directly
            fetchData();
        }
    }, [user?.role]);

    // Fetch data when tab changes or selectedIntern is set - with proper chaining
    useEffect(() => {
        console.log('[useEffect] Running with selectedIntern:', selectedIntern, 'interns:', interns.length);

        // For managers, ensure an intern is selected
        if ((user?.role === 'ADMIN' || user?.role === 'MANAGER')) {
            if (interns.length > 0 && !selectedIntern) {
                console.log('[useEffect] Setting first intern as selected');
                setSelectedIntern(interns[0].id);
            } else if (selectedIntern) {
                console.log('[useEffect] Intern selected, fetching data for:', selectedIntern);
                fetchData();
            } else {
                console.log('[useEffect] No interns available or no intern selected yet');
            }
        } else if (user?.role === 'INTERN') {
            // For interns, always fetch data
            fetchData();
        }
    }, [selectedIntern, activeTab, user?.role, interns]);

    // API Functions
    const fetchInterns = async (): Promise<void> => {
        if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
            try {
                const response = await axios.get('/accounts/users/', {
                    params: { role: 'INTERN', department: user.role === 'MANAGER' ? user.department : undefined }
                });
                const data = response.data.results || response.data;
                setInterns(data);
                if (data.length > 0 && !selectedIntern) {
                    setSelectedIntern(data[0].id);
                }
            } catch (err) {
                console.error('Error fetching interns:', err);
            }
        }
    };

    const fetchData = async (): Promise<void> => {
        setLoading(true);

        // For managers, require an intern to be selected
        if ((user?.role === 'ADMIN' || user?.role === 'MANAGER') && !selectedIntern) {
            console.log('[fetchData] No intern selected for manager, skipping data fetch');
            setLoading(false);
            return;
        }

        const targetId = selectedIntern || user?.id;
        console.log('===========================================');
        console.log('[fetchData] targetId:', targetId);
        console.log('[fetchData] selectedIntern:', selectedIntern);
        console.log('[fetchData] user?.id:', user?.id);
        console.log('===========================================');

        try {
            console.log('[fetchData] Fetching tasks...');
            const tasksRes = await axios.get('/analytics/tasks/', { params: { intern_id: targetId } });
            console.log('[fetchData] Tasks response:', tasksRes.data);

            console.log('[fetchData] Fetching attendance...');
            const attendanceRes = await axios.get('/analytics/attendance/', { params: { intern_id: targetId } });
            console.log('[fetchData] Attendance response:', attendanceRes.data);

            console.log('[fetchData] Fetching performance...');
            const performanceRes = await axios.get('/analytics/performance/', { params: { intern_id: targetId } });
            console.log('[fetchData] Performance response:', performanceRes.data);

            console.log('[fetchData] Fetching weekly reports...');
            const reportsRes = await axios.get('/analytics/weekly-reports/', { params: { intern_id: targetId } });
            console.log('[fetchData] Weekly reports response:', reportsRes.data);

            // Ensure data is always arrays/objects before setting state
            const tasks = Array.isArray(tasksRes.data.tasks) ? tasksRes.data.tasks : [];
            const attendance = Array.isArray(attendanceRes.data.attendance) ? attendanceRes.data.attendance : [];
            const performance = performanceRes.data.performance_metrics || null;
            const weeklyReports = Array.isArray(reportsRes.data.weekly_reports) ? reportsRes.data.weekly_reports : [];

            console.log('[fetchData] Processed data - tasks:', tasks.length, 'attendance:', attendance.length, 'reports:', weeklyReports.length);

            setTasks(tasks);
            setAttendance(attendance);
            setPerformance(performance);
            setWeeklyReports(weeklyReports);
            console.log('[fetchData] State updated successfully');
        } catch (err: any) {
            console.error('[fetchData] Error fetching data:', err.message || err);
            if (err.response) {
                console.error('[fetchData] Response:', err.response.data);
                console.error('[fetchData] Status:', err.response.status);
            }
        }
        setLoading(false);
    };

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

    const openModal = (modalType: ModalType): void => setActiveModal(modalType);
    const closeModal = (): void => setActiveModal(null);

    const handleCreateTask = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        try {
            await axios.post('/analytics/tasks/create/', { ...taskForm, intern_id: selectedIntern });
            setSuccess('Task created successfully!');
            closeModal();
            setTaskForm({ title: '', description: '', priority: 'MEDIUM', due_date: '', estimated_hours: 0 });
            fetchData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error creating task:', err);
        }
    };

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
        try {
            await axios.patch(`/analytics/tasks/${taskId}/update-status/`, {
                status: newStatus
            });
            setSuccess(`Task status updated to ${newStatus.replace('_', ' ')}`);
            fetchData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error updating task status:', err);
            setSuccess('Failed to update task status');
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
            <div className="bg-slate-800/30 border-b-0 px-6 py-4 backdrop-blur-xl overflow-visible z-30 relative">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 overflow-visible">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            Internship <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Monitoring</span>
                        </h1>
                        <p className="text-slate-400 mt-1">Track progress, attendance, and performance</p>
                    </div>
                    {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                        <div className="relative z-30">
                            <button
                                onClick={() => setShowInternDropdown(!showInternDropdown)}
                                className="flex items-center gap-3 px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-purple-500/50 transition-all"
                            >
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getGradient(getSelectedInternName())} flex items-center justify-center text-white font-bold text-xs`}>
                                    {getInitials(interns.find(i => i.id === selectedIntern)?.full_name || null)}
                                </div>
                                <span className="text-white">{getSelectedInternName()}</span>
                                <ChevronDown size={16} className={`text-slate-400 transition-transform ${showInternDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showInternDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-xl z-[9999] isolate animate-scale-in">
                                    <div className="p-2">
                                        {interns.map((intern) => (
                                            <button
                                                key={intern.id}
                                                onClick={() => {
                                                    setSelectedIntern(intern.id);
                                                    setShowInternDropdown(false);
                                                }}
                                                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${selectedIntern === intern.id ? 'bg-purple-500/20' : 'hover:bg-slate-700'}`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getGradient(intern.full_name || intern.email)} flex items-center justify-center text-white font-bold text-xs`}>
                                                    {getInitials(intern.full_name)}
                                                </div>
                                                <span className="text-white text-sm">{intern.full_name || intern.email}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
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

            {/* Tabs */}
            <div className="bg-slate-800/20 border-b border-slate-700/50 px-6 py-3 sticky top-0 z-20 backdrop-blur-xl">
                <div className="flex gap-2 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all duration-200 ${activeTab === tab.id
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                            <p className="text-slate-400">Loading data...</p>
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
                                onAddTask={() => openModal('task')}
                                canCreate={user?.role === 'ADMIN' || user?.role === 'MANAGER'}
                                onStatusChange={handleTaskStatusChange}
                                onRefresh={fetchData}
                            />
                        )}
                        {activeTab === 'attendance' && (
                            <AttendanceTab
                                attendance={attendance}
                                onMarkAttendance={() => openModal('attendance')}
                            />
                        )}
                        {activeTab === 'performance' && (
                            <PerformanceTab performance={performance} />
                        )}
                        {activeTab === 'weekly-reports' && (
                            <WeeklyReportsTab
                                reports={weeklyReports}
                                onSubmitReport={() => openModal('report')}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Task Modal */}
            <Modal
                isOpen={activeModal === 'task'}
                onClose={closeModal}
                title="Assign New Task"
                gradient="violet"
            >
                <form onSubmit={handleCreateTask} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                        <input
                            type="text"
                            required
                            placeholder="Enter task title"
                            value={taskForm.title}
                            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                        <textarea
                            placeholder="Enter task description"
                            value={taskForm.description}
                            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none"
                            rows={3}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
                            <select
                                value={taskForm.priority}
                                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="CRITICAL">Critical</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Due Date</label>
                        <input
                            type="date"
                            required
                            value={taskForm.due_date}
                            onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button type="button" onClick={closeModal} variant="outline" fullWidth>
                            Cancel
                        </Button>
                        <Button type="submit" gradient="purple" fullWidth>
                            Create Task
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Attendance Modal */}
            <Modal
                isOpen={activeModal === 'attendance'}
                onClose={closeModal}
                title="Mark Attendance"
                gradient="emerald"
            >
                <form onSubmit={handleMarkAttendance} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Date</label>
                        <input
                            type="date"
                            required
                            value={attendanceForm.date}
                            onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                        <select
                            value={attendanceForm.status}
                            onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                        >
                            <option value="PRESENT">Present</option>
                            <option value="ABSENT">Absent</option>
                            <option value="LATE">Late</option>
                            <option value="WORK_FROM_HOME">Work From Home</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Check In</label>
                            <input
                                type="time"
                                value={attendanceForm.check_in_time}
                                onChange={(e) => setAttendanceForm({ ...attendanceForm, check_in_time: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Check Out</label>
                            <input
                                type="time"
                                value={attendanceForm.check_out_time}
                                onChange={(e) => setAttendanceForm({ ...attendanceForm, check_out_time: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
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

            {/* Report Modal */}
            <Modal
                isOpen={activeModal === 'report'}
                onClose={closeModal}
                title="Submit Weekly Report"
                gradient="violet"
                size="md"
            >
                <form onSubmit={handleSubmitReport} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Upload Weekly Report (PDF) *</label>
                        <input
                            type="file"
                            accept=".pdf"
                            required
                            onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-500/20 file:text-violet-400 hover:file:bg-violet-500/30"
                        />
                        <p className="text-xs text-slate-500 mt-2">Upload your weekly report as a PDF file</p>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button type="button" onClick={closeModal} variant="outline" fullWidth>
                            Cancel
                        </Button>
                        <Button type="submit" gradient="indigo" fullWidth>
                            Submit Report
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default MonitoringDashboard;
