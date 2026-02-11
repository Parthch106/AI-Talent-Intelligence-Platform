import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Modal, Button } from '../components/common';
import {
    OverviewTab, TasksTab, AttendanceTab,
    PerformanceTab, WeeklyReportsTab
} from '../components/monitoring';
import { Home, Target, Calendar, TrendingUp, FileText, CheckCircle, User, ChevronDown } from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';

// Types
interface Task {
    id: number;
    task_id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    complexity: string;
    due_date: string;
    quality_rating: number | null;
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
    challenges: string;
    learnings: string;
    next_week_goals: string;
    self_rating: number | null;
    is_submitted: boolean;
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
        title: '', description: '', priority: 'MEDIUM', complexity: 'MODERATE', due_date: '', estimated_hours: 0,
    });
    const [attendanceForm, setAttendanceForm] = useState({
        date: new Date().toISOString().split('T')[0], status: 'PRESENT', check_in_time: '', check_out_time: '', notes: '',
    });
    const [reportForm, setReportForm] = useState({
        week_start_date: '', week_end_date: '', tasks_completed: 0, tasks_in_progress: 0, tasks_blocked: 0,
        accomplishments: '', challenges: '', learnings: '', next_week_goals: '', self_rating: 5,
    });

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
        fetchInterns();
    }, [location.pathname]);

    useEffect(() => {
        fetchData();
    }, [selectedIntern, activeTab]);

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
        const targetId = selectedIntern || user?.id;

        try {
            const [tasksRes, attendanceRes, performanceRes, reportsRes] = await Promise.all([
                axios.get('/analytics/tasks/', { params: { intern_id: targetId } }),
                axios.get('/analytics/attendance/', { params: { intern_id: targetId } }),
                axios.get('/analytics/performance/', { params: { intern_id: targetId } }),
                axios.get('/analytics/weekly-reports/', { params: { intern_id: targetId } }),
            ]);

            setTasks(tasksRes.data.tasks || []);
            setAttendance(attendanceRes.data.attendance || []);
            setPerformance(performanceRes.data.performance_metrics || null);
            setWeeklyReports(reportsRes.data.weekly_reports || []);
        } catch (err) {
            console.error('Error fetching data:', err);
        }
        setLoading(false);
    };

    // Handlers
    const handleTabChange = (tabId: string): void => {
        setActiveTab(tabId);
        setActiveModal(null);
        navigate(`/monitoring/${tabId}`);
    };

    const openModal = (modalType: ModalType): void => setActiveModal(modalType);
    const closeModal = (): void => setActiveModal(null);

    const handleCreateTask = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        try {
            await axios.post('/analytics/tasks/create/', { ...taskForm, intern_id: selectedIntern });
            setSuccess('Task created successfully!');
            closeModal();
            setTaskForm({ title: '', description: '', priority: 'MEDIUM', complexity: 'MODERATE', due_date: '', estimated_hours: 0 });
            fetchData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error creating task:', err);
        }
    };

    const handleMarkAttendance = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        try {
            await axios.post('/analytics/attendance/mark/', attendanceForm);
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
        try {
            await axios.post('/analytics/weekly-reports/submit/', reportForm);
            setSuccess('Weekly report submitted successfully!');
            closeModal();
            setReportForm({ week_start_date: '', week_end_date: '', tasks_completed: 0, tasks_in_progress: 0, tasks_blocked: 0, accomplishments: '', challenges: '', learnings: '', next_week_goals: '', self_rating: 5 });
            fetchData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error submitting report:', err);
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
        <div className="min-h-screen animate-fade-in">
            {/* Header */}
            <div className="bg-slate-800/30 border-b border-slate-700/50 px-6 py-4 backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            Internship <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Monitoring</span>
                        </h1>
                        <p className="text-slate-400 mt-1">Track progress, attendance, and performance</p>
                    </div>
                    {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                        <div className="relative">
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
                                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-scale-in">
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
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Complexity</label>
                            <select
                                value={taskForm.complexity}
                                onChange={(e) => setTaskForm({ ...taskForm, complexity: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                            >
                                <option value="SIMPLE">Simple</option>
                                <option value="MODERATE">Moderate</option>
                                <option value="COMPLEX">Complex</option>
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
                gradient="indigo"
                size="xl"
            >
                <form onSubmit={handleSubmitReport} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Week Start</label>
                            <input
                                type="date"
                                required
                                value={reportForm.week_start_date}
                                onChange={(e) => setReportForm({ ...reportForm, week_start_date: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Week End</label>
                            <input
                                type="date"
                                required
                                value={reportForm.week_end_date}
                                onChange={(e) => setReportForm({ ...reportForm, week_end_date: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Completed</label>
                            <input
                                type="number"
                                min="0"
                                value={reportForm.tasks_completed}
                                onChange={(e) => setReportForm({ ...reportForm, tasks_completed: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">In Progress</label>
                            <input
                                type="number"
                                min="0"
                                value={reportForm.tasks_in_progress}
                                onChange={(e) => setReportForm({ ...reportForm, tasks_in_progress: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Blocked</label>
                            <input
                                type="number"
                                min="0"
                                value={reportForm.tasks_blocked}
                                onChange={(e) => setReportForm({ ...reportForm, tasks_blocked: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Accomplishments *</label>
                        <textarea
                            required
                            placeholder="What did you accomplish this week?"
                            value={reportForm.accomplishments}
                            onChange={(e) => setReportForm({ ...reportForm, accomplishments: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all resize-none"
                            rows={3}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Challenges</label>
                            <textarea
                                placeholder="What challenges did you face?"
                                value={reportForm.challenges}
                                onChange={(e) => setReportForm({ ...reportForm, challenges: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all resize-none"
                                rows={2}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Learnings</label>
                            <textarea
                                placeholder="What did you learn?"
                                value={reportForm.learnings}
                                onChange={(e) => setReportForm({ ...reportForm, learnings: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all resize-none"
                                rows={2}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Next Week Goals</label>
                        <textarea
                            placeholder="What are your goals for next week?"
                            value={reportForm.next_week_goals}
                            onChange={(e) => setReportForm({ ...reportForm, next_week_goals: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all resize-none"
                            rows={2}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Self Rating: {reportForm.self_rating}/10</label>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={reportForm.self_rating}
                            onChange={(e) => setReportForm({ ...reportForm, self_rating: parseInt(e.target.value) })}
                            className="w-full accent-violet-500"
                        />
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
