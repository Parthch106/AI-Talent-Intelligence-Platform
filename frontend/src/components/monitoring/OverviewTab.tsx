import React from 'react';
import { Briefcase, Calendar, BarChart2, AlertTriangle, Target, Award, Users, TrendingUp } from 'lucide-react';
import StatsCard from '../common/StatsCard';
import Card from '../common/Card';
import Badge from '../common/Badge';
import { useNavigate } from 'react-router-dom';

interface Task {
    id: number;
    task_id: string;
    title: string;
    status: string;
    due_date: string;
}

interface Attendance {
    id: number;
    date: string;
    status: string;
}

interface PerformanceMetric {
    overall_performance_score: number;
    productivity_score: number;
    quality_score: number;
    engagement_score: number;
    growth_score: number;
    dropout_risk: string;
}

interface OverviewTabProps {
    tasks: Task[];
    attendance: Attendance[];
    performance: PerformanceMetric | null;
    selectedInternId?: number | null;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ tasks, attendance, performance, selectedInternId }) => {
    const navigate = useNavigate();
    // Ensure data is always arrays
    const tasksArray = Array.isArray(tasks) ? tasks : [];
    const attendanceArray = Array.isArray(attendance) ? attendance : [];

    const activeTasks = tasksArray.filter(t => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED').length;
    const completedTasks = tasksArray.filter(t => t.status === 'COMPLETED').length;
    const presentDays = attendanceArray.filter(a => a.status === 'PRESENT').length;
    const attendanceRate = attendanceArray.length > 0 ? Math.round((presentDays / attendanceArray.length) * 100) : 0;

    const handleTaskClick = (taskId: number) => {
        if (selectedInternId) {
            navigate(`/tasks?internId=${selectedInternId}&taskId=${taskId}`);
        } else {
            navigate('/tasks');
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
            'COMPLETED': 'success',
            'IN_PROGRESS': 'info',
            'BLOCKED': 'danger',
            'ASSIGNED': 'default',
        };
        return variants[status] || 'default';
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatsCard
                    title="Active Tasks"
                    value={activeTasks}
                    subtitle={`${completedTasks} completed`}
                    icon={<Briefcase size={20} />}
                    gradient="from-blue-500 via-blue-600 to-indigo-700"
                />
                <StatsCard
                    title="Attendance Rate"
                    value={`${attendanceRate}%`}
                    subtitle={`${presentDays} days present`}
                    icon={<Calendar size={20} />}
                    gradient="from-emerald-500 via-emerald-600 to-teal-700"
                />
                <StatsCard
                    title="Performance"
                    value={performance ? `${Math.round(performance.overall_performance_score)}%` : '0%'}
                    subtitle="Overall score"
                    icon={<BarChart2 size={20} />}
                    gradient="from-violet-500 via-violet-600 to-purple-700"
                />
                <StatsCard
                    title="Dropout Risk"
                    value={performance?.dropout_risk || 'N/A'}
                    subtitle="Risk level"
                    icon={<AlertTriangle size={20} />}
                    gradient="from-rose-500 via-rose-600 to-pink-700"
                />
            </div>

            {/* Performance Bars */}
            {performance && (
                <Card title="Performance Metrics" icon={<TrendingUp size={20} className="text-blue-500" />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Productivity', value: performance.productivity_score, color: 'from-blue-500 to-blue-600', icon: Target },
                            { label: 'Quality', value: performance.quality_score, color: 'from-emerald-500 to-emerald-600', icon: Award },
                            { label: 'Engagement', value: performance.engagement_score, color: 'from-violet-500 to-violet-600', icon: Users },
                            { label: 'Growth', value: performance.growth_score, color: 'from-amber-500 to-amber-600', icon: TrendingUp },
                        ].map((metric) => (
                            <div key={metric.label} className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--border-color)]">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <metric.icon size={16} className="text-[var(--text-muted)]" />
                                        <span className="text-sm font-medium text-[var(--text-dim)]">{metric.label}</span>
                                    </div>
                                    <span className="text-lg font-bold text-[var(--text-main)]">{Math.round(metric.value)}%</span>
                                </div>
                                <div className="w-full bg-[var(--bg-muted)] rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className={`bg-gradient-to-r ${metric.color} h-2.5 rounded-full transition-all duration-500`}
                                        style={{ width: `${metric.value}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Recent Tasks */}
            <Card title="Recent Tasks" icon={<Target size={20} className="text-blue-500" />}>
                <div className="space-y-3">
                    {tasksArray.slice(0, 5).map((task) => (
                        <div 
                            key={task.id} 
                            onClick={() => handleTaskClick(task.id)}
                            className="flex items-center justify-between p-4 bg-[var(--card-bg)] hover:bg-purple-500/[0.05] cursor-pointer hover:scale-[1.01] transition-all border border-[var(--border-color)] rounded-xl group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-2 h-2 rounded-full ${task.status === 'COMPLETED' ? 'bg-emerald-500' : task.status === 'BLOCKED' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                <div>
                                    <p className="font-medium text-[var(--text-main)] group-hover:text-purple-400 transition-colors">{task.title}</p>
                                    <p className="text-sm text-[var(--text-dim)]">Due: {task.due_date}</p>
                                </div>
                            </div>
                            <Badge variant={getStatusBadge(task.status)}>
                                {task.status.replace('_', ' ')}
                            </Badge>
                        </div>
                    ))}
                    {tasksArray.length === 0 && (
                        <div className="text-center py-8 text-[var(--text-muted)]">
                            <Target size={40} className="mx-auto mb-3 opacity-30" />
                            <p>No tasks assigned yet</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default OverviewTab;
