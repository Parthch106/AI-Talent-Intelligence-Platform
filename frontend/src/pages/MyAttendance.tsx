import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { AttendanceHeatmap, Card } from '../components/common';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, ChevronLeft, ChevronRight, Filter, Home } from 'lucide-react';

interface AttendanceRecord {
    id: number;
    date: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'WORK_FROM_HOME';
    check_in_time: string;
    check_out_time: string;
    notes: string;
}

interface PaginationInfo {
    page: number;
    limit: number;
    total_records: number;
    total_pages: number;
}

const MyAttendance: React.FC = () => {
    const { user } = useAuth();
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [heatmapData, setHeatmapData] = useState<Record<string, { status: string; value: number; hours: number }>>({});
    const [loading, setLoading] = useState(true);
    const [heatmapLoading, setHeatmapLoading] = useState(true);
    const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, wfh: 0, total: 0 });
    const [pagination, setPagination] = useState<PaginationInfo>({
        page: 1,
        limit: 15,
        total_records: 0,
        total_pages: 0
    });
    
    // Filter state
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);


    // Fetch data when month/year changes
    useEffect(() => {
        if (user) {
            fetchMyAttendance();
            fetchHeatmapData();
        }
    }, [user, selectedMonth, selectedYear]);

    // Filter locally when status changes (no API call needed)
    useEffect(() => {
        // Filter from allAttendance based on selectedStatus
        let filtered = [...allAttendance];
        
        if (selectedStatus) {
            if (selectedStatus === 'LATE') {
                filtered = allAttendance.filter(a => a.status === 'LATE' || a.status === 'HALF_DAY');
            } else if (selectedStatus === 'WORK_FROM_HOME') {
                filtered = allAttendance.filter(a => a.status === 'WORK_FROM_HOME');
            } else {
                filtered = allAttendance.filter(a => a.status === selectedStatus);
            }
        }
        
        // Reset to page 1 when filter changes
        const newPage = 1;
        const offset = (newPage - 1) * pagination.limit;
        const paginatedData = filtered.slice(offset, offset + pagination.limit);
        setAttendance(paginatedData);
        
        // Update pagination
        setPagination(prev => ({
            ...prev,
            page: newPage,
            total_records: filtered.length,
            total_pages: Math.ceil(filtered.length / prev.limit) || 1
        }));
    }, [selectedStatus, allAttendance]);

    const fetchMyAttendance = async () => {
        try {
            setLoading(true);
            
            // Build params - fetch all data for the selected period (limit=1000 to get all records)
            const params: any = {
                page: 1,
                limit: 1000  // Get all records for local filtering
            };
            
            // Add intern_id only for MANAGER or ADMIN
            if (user?.role === 'MANAGER' || user?.role === 'ADMIN') {
                params.intern_id = user?.id;
            }
            
            // Add month filter if selected
            if (selectedMonth) {
                params.start_date = `${selectedMonth}-01`;
                // Get last day of month
                const [year, month] = selectedMonth.split('-').map(Number);
                const lastDay = new Date(year, month, 0).getDate();
                params.end_date = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
            } else if (selectedYear) {
                // Filter by year if no month selected
                params.start_date = `${selectedYear}-01-01`;
                params.end_date = `${selectedYear}-12-31`;
            }
            
            const response = await api.get('/analytics/attendance/', { params });
            
            // Store all fetched data
            const attendanceData = response.data.attendance || [];
            setAllAttendance(attendanceData);
            
            // Calculate stats from all data
            const statsData = response.data.stats || {
                present: 0,
                absent: 0,
                late: 0,
                wfh: 0,
                total: attendanceData.length
            };
            setStats(statsData);
            
            // Set initial pagination
            setPagination({
                page: 1,
                limit: 15,
                total_records: attendanceData.length,
                total_pages: Math.ceil(attendanceData.length / 15)
            });
            
        } catch (err: any) {
            console.error('Error fetching attendance:', err);
            if (err.response?.data?.error) {
                alert('Error: ' + err.response.data.error);
            }
            setAllAttendance([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchHeatmapData = async () => {
        setHeatmapLoading(true);
        try {
            // Calculate date range based on filters
            let startDate: string;
            let endDate: string;
            
            if (selectedMonth) {
                // Single month selected
                startDate = `${selectedMonth}-01`;
                const [year, month] = selectedMonth.split('-').map(Number);
                const lastDay = new Date(year, month, 0).getDate();
                endDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
            } else if (selectedYear) {
                // Full year selected
                startDate = `${selectedYear}-01-01`;
                endDate = `${selectedYear}-12-31`;
            } else {
                // Default to last 6 months
                startDate = '';
                endDate = '';
            }
            
            const params: any = { months: 6 };
            if (startDate && endDate) {
                params.start_date = startDate;
                params.end_date = endDate;
            }
            
            const response = await api.get('/analytics/heatmap/attendance/', { params });
            setHeatmapData(response.data.heatmap || {});
        } catch (error) {
            console.error('Error fetching heatmap data:', error);
        } finally {
            setHeatmapLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.total_pages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    const handleFilterChange = () => {
        // Reset to page 1 when filter changes
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PRESENT': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'ABSENT': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'LATE': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'HALF_DAY': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'WORK_FROM_HOME': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PRESENT': return <CheckCircle size={14} />;
            case 'ABSENT': return <XCircle size={14} />;
            case 'LATE': return <Clock size={14} />;
            case 'HALF_DAY': return <AlertCircle size={14} />;
            case 'WORK_FROM_HOME': return <Home size={14} />;
            default: return <Calendar size={14} />;
        }
    };

    // Generate month options for the last 12 months
    const getMonthOptions = () => {
        const options = [];
        for (let i = 0; i < 12; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            options.push({ value, label });
        }
        return options;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                    <p className="text-slate-400 animate-pulse">Loading attendance...</p>
                </div>
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

                {/* Stats Cards - Clickable */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <button
                        onClick={() => {
                            setSelectedStatus(selectedStatus === 'PRESENT' ? '' : 'PRESENT');
                            handleFilterChange();
                        }}
                        className={`bg-slate-900/50 backdrop-blur-xl rounded-2xl border p-6 text-left transition-all hover:-translate-y-1 hover:shadow-lg ${
                            selectedStatus === 'PRESENT' 
                            ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/20' 
                            : 'border-white/5 hover:border-emerald-500/30'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                <CheckCircle className="text-emerald-400" size={24} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">Present</p>
                                <p className="text-2xl font-bold text-white">{stats.present}</p>
                            </div>
                        </div>
                    </button>
                    <button
                        onClick={() => {
                            setSelectedStatus(selectedStatus === 'ABSENT' ? '' : 'ABSENT');
                            handleFilterChange();
                        }}
                        className={`bg-slate-900/50 backdrop-blur-xl rounded-2xl border p-6 text-left transition-all hover:-translate-y-1 hover:shadow-lg ${
                            selectedStatus === 'ABSENT' 
                            ? 'border-red-500/50 shadow-lg shadow-red-500/20' 
                            : 'border-white/5 hover:border-red-500/30'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                                <XCircle className="text-red-400" size={24} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">Absent</p>
                                <p className="text-2xl font-bold text-white">{stats.absent}</p>
                            </div>
                        </div>
                    </button>
                    <button
                        onClick={() => {
                            setSelectedStatus(selectedStatus === 'LATE' ? '' : 'LATE');
                            handleFilterChange();
                        }}
                        className={`bg-slate-900/50 backdrop-blur-xl rounded-2xl border p-6 text-left transition-all hover:-translate-y-1 hover:shadow-lg ${
                            selectedStatus === 'LATE' 
                            ? 'border-amber-500/50 shadow-lg shadow-amber-500/20' 
                            : 'border-white/5 hover:border-amber-500/30'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                                <Clock className="text-amber-400" size={24} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">Late</p>
                                <p className="text-2xl font-bold text-white">{stats.late}</p>
                            </div>
                        </div>
                    </button>
                    <button
                        onClick={() => {
                            setSelectedStatus(selectedStatus === 'WORK_FROM_HOME' ? '' : 'WORK_FROM_HOME');
                            handleFilterChange();
                        }}
                        className={`bg-slate-900/50 backdrop-blur-xl rounded-2xl border p-6 text-left transition-all hover:-translate-y-1 hover:shadow-lg ${
                            selectedStatus === 'WORK_FROM_HOME' 
                            ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/20' 
                            : 'border-white/5 hover:border-cyan-500/30'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                                <Home className="text-cyan-400" size={24} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">WFH</p>
                                <p className="text-2xl font-bold text-white">{stats.wfh}</p>
                            </div>
                        </div>
                    </button>
                    <button
                        onClick={() => {
                            setSelectedStatus('');
                            handleFilterChange();
                        }}
                        className={`bg-slate-900/50 backdrop-blur-xl rounded-2xl border p-6 text-left transition-all hover:-translate-y-1 hover:shadow-lg ${
                            selectedStatus === '' 
                            ? 'border-purple-500/50 shadow-lg shadow-purple-500/20' 
                            : 'border-white/5 hover:border-purple-500/30'
                        }`}
                    >
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
                    </button>
                </div>

                {/* Attendance Heatmap */}
                <Card className="mb-6 p-4">
                    {heatmapLoading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                        </div>
                    ) : (
                        <AttendanceHeatmap
                            data={heatmapData}
                            year={selectedYear}
                            title="Attendance Overview"
                        />
                    )}
                </Card>

                {/* Filter Section */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6 mb-6">
                    <div className="flex items-center gap-4 flex-wrap">
                        <Filter className="text-slate-400" size={20} />
                        <div className="flex items-center gap-4">
                            <div>
                                <label className="text-slate-400 text-sm block mb-1">Month</label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => {
                                        setSelectedMonth(e.target.value);
                                        handleFilterChange();
                                    }}
                                    className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                                >
                                    <option value="">All Months</option>
                                    {getMonthOptions().map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm block mb-1">Year</label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => {
                                        setSelectedYear(Number(e.target.value));
                                        handleFilterChange();
                                    }}
                                    className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                                >
                                    {[2024, 2025, 2026].map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                            {selectedStatus && (
                                <div>
                                    <label className="text-slate-400 text-sm block mb-1">Status</label>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-2 rounded-xl text-white bg-slate-700 border border-slate-600`}>
                                            {selectedStatus === 'LATE' ? 'Late/Half Day' : selectedStatus === 'WORK_FROM_HOME' ? 'WFH' : selectedStatus}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setSelectedStatus('');
                                                handleFilterChange();
                                            }}
                                            className="px-2 py-2 text-slate-400 hover:text-white transition-colors"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Attendance Records */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-white">Attendance History</h2>
                        <div className="text-slate-400 text-sm">
                            Showing {attendance.length} of {pagination.total_records} records
                        </div>
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
                    
                    {/* Pagination */}
                    {pagination.total_pages > 1 && (
                        <div className="p-4 border-t border-white/5 flex justify-between items-center">
                            <div className="text-slate-400 text-sm">
                                Page {pagination.page} of {pagination.total_pages}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                    className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                        pagination.page <= 1 
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                        : 'bg-slate-800 text-white hover:bg-slate-700'
                                    }`}
                                >
                                    <ChevronLeft size={16} />
                                    Previous
                                </button>
                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.total_pages}
                                    className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                        pagination.page >= pagination.total_pages 
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                        : 'bg-slate-800 text-white hover:bg-slate-700'
                                    }`}
                                >
                                    Next
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyAttendance;
