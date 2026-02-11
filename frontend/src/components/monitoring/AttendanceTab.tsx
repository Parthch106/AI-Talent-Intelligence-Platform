import React from 'react';
import { Plus, Calendar, CheckCircle, X, Clock, Home } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';

interface Attendance {
    id: number;
    date: string;
    status: string;
    check_in_time: string;
    check_out_time: string;
    working_hours: number;
}

interface AttendanceTabProps {
    attendance: Attendance[];
    onMarkAttendance: () => void;
}

const AttendanceTab: React.FC<AttendanceTabProps> = ({ attendance, onMarkAttendance }) => {
    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'purple'> = {
            'PRESENT': 'success',
            'ABSENT': 'danger',
            'LATE': 'warning',
            'WORK_FROM_HOME': 'purple',
        };
        return variants[status] || 'info';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Attendance Tracking</h2>
                    <p className="text-gray-500 mt-1">Monitor daily attendance records</p>
                </div>
                <Button
                    onClick={onMarkAttendance}
                    icon={<Plus size={18} />}
                    gradient="emerald"
                >
                    Mark Attendance
                </Button>
            </div>

            {/* Attendance Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card padding="md" className="text-center">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle size={24} className="text-emerald-600" />
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">{attendance.filter(a => a.status === 'PRESENT').length}</p>
                    <p className="text-sm text-gray-500">Present</p>
                </Card>
                <Card padding="md" className="text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <X size={24} className="text-red-600" />
                    </div>
                    <p className="text-2xl font-bold text-red-600">{attendance.filter(a => a.status === 'ABSENT').length}</p>
                    <p className="text-sm text-gray-500">Absent</p>
                </Card>
                <Card padding="md" className="text-center">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Clock size={24} className="text-amber-600" />
                    </div>
                    <p className="text-2xl font-bold text-amber-600">{attendance.filter(a => a.status === 'LATE').length}</p>
                    <p className="text-sm text-gray-500">Late</p>
                </Card>
                <Card padding="md" className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Home size={24} className="text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-purple-600">{attendance.filter(a => a.status === 'WORK_FROM_HOME').length}</p>
                    <p className="text-sm text-gray-500">WFH</p>
                </Card>
            </div>

            {/* Attendance Table */}
            <Card padding="none">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Check In</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Check Out</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Hours</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {attendance.slice(0, 10).map((record) => (
                                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{record.date}</td>
                                    <td className="px-6 py-4">
                                        <Badge variant={getStatusBadge(record.status)}>
                                            {record.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{record.check_in_time || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{record.check_out_time || '-'}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{record.working_hours}h</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {attendance.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No attendance records</p>
                        <p className="text-sm">Records will appear here once marked</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AttendanceTab;
