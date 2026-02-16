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
    // Ensure attendance is always an array
    const attendanceArray = Array.isArray(attendance) ? attendance : [];

    console.log('[AttendanceTab] Received attendance prop:', attendance);
    console.log('[AttendanceTab] attendanceArray:', attendanceArray);

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
                    <h2 className="text-2xl font-bold text-white">Attendance Tracking</h2>
                    <p className="text-slate-400 mt-1">Monitor daily attendance records</p>
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
                <div className="relative rounded-2xl border backdrop-blur-xl bg-slate-800/30 border-white/5 p-5 text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-5/5 pointer-events-none rounded-2xl"></div>
                    <div className="relative">
                        <p className="text-2xl font-bold text-emerald-400">{attendanceArray.filter(a => a.status === 'PRESENT').length}</p>
                        <p className="text-sm text-slate-400">Present</p>
                    </div>
                </div>
                <div className="relative rounded-2xl border backdrop-blur-xl bg-slate-800/30 border-white/5 p-5 text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-rose-5/5 pointer-events-none rounded-2xl"></div>
                    <div className="relative">
                        <p className="text-2xl font-bold text-red-400">{attendanceArray.filter(a => a.status === 'ABSENT').length}</p>
                        <p className="text-sm text-slate-400">Absent</p>
                    </div>
                </div>
                <div className="relative rounded-2xl border backdrop-blur-xl bg-slate-800/30 border-white/5 p-5 text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-5/5 pointer-events-none rounded-2xl"></div>
                    <div className="relative">
                        <p className="text-2xl font-bold text-amber-400">{attendanceArray.filter(a => a.status === 'LATE').length}</p>
                        <p className="text-sm text-slate-400">Late</p>
                    </div>
                </div>
                <div className="relative rounded-2xl border backdrop-blur-xl bg-slate-800/30 border-white/5 p-5 text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-5/5 pointer-events-none rounded-2xl"></div>
                    <div className="relative">
                        <p className="text-2xl font-bold text-purple-400">{attendanceArray.filter(a => a.status === 'WORK_FROM_HOME').length}</p>
                        <p className="text-sm text-slate-400">WFH</p>
                    </div>
                </div>
            </div>

            {/* Attendance Table */}
            <div className="relative rounded-2xl border backdrop-blur-xl bg-slate-800/30 border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50 border-b border-white/10">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Check In</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Check Out</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Hours</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {attendanceArray.slice(0, 10).map((record) => (
                                <tr key={record.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-white">{record.date}</td>
                                    <td className="px-6 py-4">
                                        <Badge variant={getStatusBadge(record.status)}>
                                            {record.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-300">{record.check_in_time || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-slate-300">{record.check_out_time || '-'}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-white">{record.working_hours}h</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {attendanceArray.length === 0 && (
                    <div className="text-center py-12">
                        <Calendar size={48} className="mx-auto mb-4 text-slate-600" />
                        <p className="text-lg font-medium text-white">No attendance records</p>
                        <p className="text-sm text-slate-400 mt-1">Records will appear here once marked</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceTab;
