import React from 'react';
import { Plus, Target, Clock, Award } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';

interface Task {
    id: number;
    task_id: string;
    title: string;
    status: string;
    priority: string;
    complexity: string;
    due_date: string;
    quality_rating: number | null;
}

interface TasksTabProps {
    tasks: Task[];
    onAddTask: () => void;
    canCreate: boolean;
}

const TasksTab: React.FC<TasksTabProps> = ({ tasks, onAddTask, canCreate }) => {
    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
            'COMPLETED': 'success',
            'IN_PROGRESS': 'info',
            'BLOCKED': 'danger',
            'ASSIGNED': 'default',
        };
        return variants[status] || 'default';
    };

    const getPriorityBadge = (priority: string) => {
        const variants: Record<string, 'danger' | 'warning' | 'info' | 'default'> = {
            'CRITICAL': 'danger',
            'HIGH': 'warning',
            'MEDIUM': 'info',
            'LOW': 'default',
        };
        return variants[priority] || 'default';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Task Management</h2>
                    <p className="text-gray-500 mt-1">Track and manage assigned tasks</p>
                </div>
                {canCreate && (
                    <Button
                        onClick={onAddTask}
                        icon={<Plus size={18} />}
                        gradient="blue"
                    >
                        Assign New Task
                    </Button>
                )}
            </div>

            {/* Task Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card padding="md" className="text-center">
                    <p className="text-2xl font-bold text-gray-800">{tasks.length}</p>
                    <p className="text-sm text-gray-500">Total Tasks</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{tasks.filter(t => t.status === 'IN_PROGRESS').length}</p>
                    <p className="text-sm text-gray-500">In Progress</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-2xl font-bold text-emerald-600">{tasks.filter(t => t.status === 'COMPLETED').length}</p>
                    <p className="text-sm text-gray-500">Completed</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-2xl font-bold text-red-600">{tasks.filter(t => t.status === 'BLOCKED').length}</p>
                    <p className="text-sm text-gray-500">Blocked</p>
                </Card>
            </div>

            {/* Task Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {tasks.map((task) => (
                    <Card key={task.id} hover padding="md">
                        <div className="flex justify-between items-start mb-3">
                            <span className="text-xs text-gray-400 font-mono">{task.task_id}</span>
                            <Badge variant={getStatusBadge(task.status)}>
                                {task.status.replace('_', ' ')}
                            </Badge>
                        </div>
                        <h3 className="font-semibold text-lg text-gray-800 mb-3">{task.title}</h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                            <Badge variant={getPriorityBadge(task.priority)} size="sm">
                                {task.priority}
                            </Badge>
                            <Badge variant="default" size="sm">
                                {task.complexity}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Clock size={14} />
                                <span>Due: {task.due_date}</span>
                            </div>
                            {task.quality_rating && (
                                <div className="flex items-center gap-1">
                                    <Award size={14} className="text-amber-500" />
                                    <span className="text-sm font-medium">{task.quality_rating}/5</span>
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
                {tasks.length === 0 && (
                    <div className="col-span-3 text-center py-12 text-gray-500">
                        <Target size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No tasks found</p>
                        <p className="text-sm">Tasks will appear here once assigned</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TasksTab;
