import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Modal, Button } from '../components/common';
import {
    OverviewTab, TasksTab, AttendanceTab,
    PerformanceTab, WeeklyReportsTab
} from '../components/monitoring';
import { Home, Target, Calendar, TrendingUp, FileText, CheckCircle } from 'lucide-react';

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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Internship Monitoring</h1>
                        <p className="text-gray-500 mt-1">Track progress, attendance, and performance</p>
                    </div>
                    {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                        <select
                            value={selectedIntern || ''}
                            onChange={(e) => setSelectedIntern(e.target.value ? parseInt(e.target.value) : null)}
                            className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        >
                            <option value="">Select Intern</option>
                            {interns.map((intern) => (
                                <option key={intern.id} value={intern.id}>{intern.full_name || intern.email}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Success Message */}
            {success && (
                <div className="mx-6 mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2">
                    <CheckCircle size={18} />
                    {success}
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white border-b border-gray-100 px-6 py-3 sticky top-16 z-20">
                <div className="flex gap-2 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-100'
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
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
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
                gradient="blue"
            >
                <form onSubmit={handleCreateTask} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            type="text"
                            required
                            placeholder="Enter task title"
                            value={taskForm.title}
                            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            placeholder="Enter task description"
                            value={taskForm.description}
                            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                            <select
                                value={taskForm.priority}
                                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="CRITICAL">Critical</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Complexity</label>
                            <select
                                value={taskForm.complexity}
                                onChange={(e) => setTaskForm({ ...taskForm, complexity: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="SIMPLE">Simple</option>
                                <option value="MODERATE">Moderate</option>
                                <option value="COMPLEX">Complex</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                        <input
                            type="date"
                            required
                            value={taskForm.due_date}
                            onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button type="button" onClick={closeModal} variant="secondary" fullWidth>
                            Cancel
                        </Button>
                        <Button type="submit" gradient="blue" fullWidth>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                            type="date"
                            required
                            value={attendanceForm.date}
                            onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            value={attendanceForm.status}
                            onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                            <option value="PRESENT">Present</option>
                            <option value="ABSENT">Absent</option>
                            <option value="LATE">Late</option>
                            <option value="WORK_FROM_HOME">Work From Home</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Check In</label>
                            <input
                                type="time"
                                value={attendanceForm.check_in_time}
                                onChange={(e) => setAttendanceForm({ ...attendanceForm, check_in_time: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Check Out</label>
                            <input
                                type="time"
                                value={attendanceForm.check_out_time}
                                onChange={(e) => setAttendanceForm({ ...attendanceForm, check_out_time: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button type="button" onClick={closeModal} variant="secondary" fullWidth>
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
                size="xl"
            >
                <form onSubmit={handleSubmitReport} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Week Start</label>
                            <input
                                type="date"
                                required
                                value={reportForm.week_start_date}
                                onChange={(e) => setReportForm({ ...reportForm, week_start_date: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Week End</label>
                            <input
                                type="date"
                                required
                                value={reportForm.week_end_date}
                                onChange={(e) => setReportForm({ ...reportForm, week_end_date: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Completed</label>
                            <input
                                type="number"
                                min="0"
                                value={reportForm.tasks_completed}
                                onChange={(e) => setReportForm({ ...reportForm, tasks_completed: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">In Progress</label>
                            <input
                                type="number"
                                min="0"
                                value={reportForm.tasks_in_progress}
                                onChange={(e) => setReportForm({ ...reportForm, tasks_in_progress: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Blocked</label>
                            <input
                                type="number"
                                min="0"
                                value={reportForm.tasks_blocked}
                                onChange={(e) => setReportForm({ ...reportForm, tasks_blocked: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Accomplishments *</label>
                        <textarea
                            required
                            placeholder="What did you accomplish this week?"
                            value={reportForm.accomplishments}
                            onChange={(e) => setReportForm({ ...reportForm, accomplishments: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            rows={3}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Challenges</label>
                            <textarea
                                placeholder="What challenges did you face?"
                                value={reportForm.challenges}
                                onChange={(e) => setReportForm({ ...reportForm, challenges: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                                rows={2}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Learnings</label>
                            <textarea
                                placeholder="What did you learn?"
                                value={reportForm.learnings}
                                onChange={(e) => setReportForm({ ...reportForm, learnings: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                                rows={2}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Next Week Goals</label>
                        <textarea
                            placeholder="What are your goals for next week?"
                            value={reportForm.next_week_goals}
                            onChange={(e) => setReportForm({ ...reportForm, next_week_goals: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            rows={2}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Self Rating: {reportForm.self_rating}/10</label>
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
                        <Button type="button" onClick={closeModal} variant="secondary" fullWidth>
                            Cancel
                        </Button>
                        <Button type="submit" gradient="violet" fullWidth>
                            Submit Report
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* CSS for animations */}
            <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
        </div>
    );
};

export default MonitoringDashboard;
