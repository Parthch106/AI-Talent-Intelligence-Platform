import React from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DragEndEvent } from '@dnd-kit/core';
import { Calendar, GripVertical } from 'lucide-react';

interface Task {
    id: number;
    task_id: string;
    title: string;
    status: string;
    priority: string;
    due_date: string;
    quality_rating: number | null;
    project?: {
        id: number;
        name: string;
    } | null;
}

interface KanbanBoardProps {
    tasks: Task[];
    onStatusChange: (taskId: number, newStatus: string) => void;
}

const KANBAN_COLUMNS = [
    { id: 'ASSIGNED', label: 'Assigned', color: 'bg-blue-500' },
    { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-yellow-500' },
    { id: 'SUBMITTED', label: 'Submitted', color: 'bg-orange-500' },
    { id: 'COMPLETED', label: 'Completed', color: 'bg-emerald-500' },
    { id: 'BLOCKED', label: 'Blocked', color: 'bg-red-500' },
];

const PRIORITY_COLORS: Record<string, string> = {
    CRITICAL: 'bg-red-500',
    HIGH: 'bg-orange-400',
    MEDIUM: 'bg-yellow-400',
    LOW: 'bg-blue-400',
};

const formatDate = (dateString: string) => {
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return dateString;
    }
};

interface TaskCardProps {
    task: Task;
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-3 cursor-pointer hover:border-purple-500/30 transition-all group"
        >
            <div className="flex items-start gap-2">
                <button
                    {...attributes}
                    {...listeners}
                    className="mt-1 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-grab active:cursor-grabbing"
                >
                    <GripVertical size={14} />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">{task.task_id}</span>
                        <span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority] || 'bg-gray-400'}`} />
                    </div>
                    <h4 className="text-sm font-medium text-[var(--text-main)] truncate">{task.title}</h4>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-[var(--text-muted)]">
                        <Calendar size={10} />
                        <span>{formatDate(task.due_date)}</span>
                        {task.quality_rating && (
                            <span className="text-amber-400">★ {task.quality_rating.toFixed(1)}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

interface ColumnProps {
    column: typeof KANBAN_COLUMNS[0];
    tasks: Task[];
}

const KanbanColumn: React.FC<ColumnProps> = ({ column, tasks }) => {
    return (
        <div className="flex-shrink-0 w-72">
            <div className={`flex items-center gap-2 mb-3 px-2`}>
                <span className={`w-2 h-2 rounded-full ${column.color}`} />
                <span className="text-sm font-medium text-[var(--text-main)]">{column.label}</span>
                <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-muted)] px-2 py-0.5 rounded-full">
                    {tasks.length}
                </span>
            </div>
            <div className="space-y-2 min-h-[200px] p-2 bg-[var(--bg-muted)]/50 rounded-xl border border-[var(--border-color)]">
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map(task => (
                        <TaskCard key={task.id} task={task} />
                    ))}
                </SortableContext>
                {tasks.length === 0 && (
                    <div className="text-center py-8 text-xs text-[var(--text-muted)]">
                        No tasks
                    </div>
                )}
            </div>
        </div>
    );
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onStatusChange }) => {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        
        if (over && active.id !== over.id) {
            const task = tasks.find(t => t.id === active.id);
            if (task) {
                const newStatus = over.id as string;
                if (KANBAN_COLUMNS.some(col => col.id === newStatus)) {
                    onStatusChange(task.id, newStatus);
                }
            }
        }
    };

    const tasksByStatus = KANBAN_COLUMNS.reduce((acc, column) => {
        acc[column.id] = tasks.filter(task => task.status === column.id);
        return acc;
    }, {} as Record<string, Task[]>);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 overflow-x-auto pb-4">
                {KANBAN_COLUMNS.map(column => (
                    <KanbanColumn
                        key={column.id}
                        column={column}
                        tasks={tasksByStatus[column.id] || []}
                    />
                ))}
            </div>
        </DndContext>
    );
};

export default KanbanBoard;
