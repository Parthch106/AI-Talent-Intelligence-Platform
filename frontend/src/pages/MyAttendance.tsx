import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, FileText, TrendingUp } from 'lucide-react';

interface AttendanceRecord {
    id: number;
    intern: { id: number; name: string; email: string };
    date: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';
    check_in_time: string;
    check_out_time: string;
    notes: string;
}

const MyAttendance: React.FC = () => {
    const { user } = useAuth();
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });

    useEffect(() => {
        fetchMyAttendance();
    }, []);

    const fetchMyAttendance = async () => {
        try {
            const response = await axios.get('/analytics/attendance/my-attendance/');
            const data = response.data;
            
            // Check if response is an array or contains error
            if (!Array.isArray(data)) {
                console.error('Invalid response:', data);
                setAttendance([]);
                return;
            }
            
            setAttendance(data);

            // Calculate stats
            const present = data.filter((a: AttendanceRecord) => a.status === 'PRESENT').length;
            const absent = data.filter((a: AttendanceRecord) => a.status === 'ABSENT').length;
            const late = data.filter((a: AttendanceRecord) => a.status === 'LATE' || a.status === 'HALF_DAY').length;
            setStats({ present, absent, late, total: data.length });
        } catch (err: any) {
            console.error('Error fetching attendance:', err);
            // Show error message from server if available
            if (err.response?.data?.error) {
                alert('Error: ' + err.response.data.error);
            }
            setAttendance([]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PRESENT': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'ABSENT': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'LATE': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'HALF_DAY': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PRESENT': return <CheckCircle size={14} />;
            case 'ABSENT': return <XCircle size={14} />;
            case 'LATE': return <Clock size={14} />;
            case 'HALF_DAY': return <AlertCircle size={14} />;
            default: return <Calendar size={14} />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
                <div className="text-slate-400">Loading attendance...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">My Attendance</h1>
                    <p className="text-slate-400">View your attendance records</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                <CheckCircle className="text-emerald-400" size={24} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">Present</p>
                                <p className="text-2xl font-bold text-white">{stats.present}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                                <XCircle className="text-red-400" size={24} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">Absent</p>
                                <p className="text-2xl font-bold text-white">{stats.absent}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                                <Clock className="text-amber-400" size={24} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">Late</p>
                                <p className="text-2xl font-bold text-white">{stats.late}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                <TrendingUp className="text-purple-400" size={24} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">Attendance Rate</p>
                                <p className="text-2xl font-bold text-white">
                                    {stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attendance Records */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                        <h2 className="text-xl font-semibold text-white">Attendance History</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-800/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Date</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Status</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Check In</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Check Out</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {Array.isArray(attendance) && attendance.length > 0 ? (
                                    attendance.map((record) => (
                                        <tr key={record.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 text-white">
                                                {new Date(record.date).toLocaleDateString('en-US', {
                                                    weekday: 'short',
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                                                    {getStatusIcon(record.status)}
                                                    {record.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">
                                                {record.check_in_time ? record.check_in_time : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">
                                                {record.check_out_time ? record.check_out_time : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 text-sm">
                                                {record.notes || '-'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <Calendar size={48} className="text-slate-600" />
                                                <p>No attendance records found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyAttendance;
