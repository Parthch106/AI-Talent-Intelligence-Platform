import React, { useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
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
    monthFilter: number | 'all';
    setMonthFilter: (value: number | 'all') => void;
    yearFilter: number | 'all';
    setYearFilter: (value: number | 'all') => void;
}

const AttendanceTab: React.FC<AttendanceTabProps> = ({ 
    attendance, 
    onMarkAttendance,
    monthFilter,
    setMonthFilter,
    yearFilter,
    setYearFilter
}) => {
    // Ensure attendance is always an array
    const attendanceArray = Array.isArray(attendance) ? attendance : [];

    // State for local table UI only
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const ITEMS_PER_PAGE = 10;

    // Auto-select the most recent month/year if data exists and current filter is empty
    React.useEffect(() => {
        if (attendanceArray.length > 0 && (monthFilter === 'all' || yearFilter === 'all')) {
            // Only auto-select if we don't have results for the current "all" selection (which shouldn't happen)
            // Or if we want to avoid showing "All" by default. 
            // The user requested an "All" option, so we should stay on "all" if that's the current state.
            // However, the earlier logic was trying to be helpful by jumping to data.
            // Let's refine: if we are on 'all' and there is data, that's fine.
            // If we are on a specific month/year and there's NO data, jump to latest.
            
            if (monthFilter !== 'all' && yearFilter !== 'all') {
                const currentYields = attendanceArray.filter(record => {
                    const d = new Date(record.date);
                    return d.getMonth() + 1 === monthFilter && d.getFullYear() === yearFilter;
                });

                if (currentYields.length === 0) {
                    // Sort to find the latest record
                    const sortedRecords = [...attendanceArray].sort(
                        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                    );
                    const latestDate = new Date(sortedRecords[0].date);
                    setMonthFilter(latestDate.getMonth() + 1);
                    setYearFilter(latestDate.getFullYear());
                }
            }
        }
    }, [attendanceArray, monthFilter, yearFilter]);

    // Filter by month and year
    const monthYearFiltered = attendanceArray.filter(record => {
        const recordDate = new Date(record.date);
        const recordMonth = recordDate.getMonth() + 1;
        const recordYear = recordDate.getFullYear();
        
        const monthMatch = monthFilter === 'all' || recordMonth === monthFilter;
        const yearMatch = yearFilter === 'all' || recordYear === yearFilter;
        
        return monthMatch && yearMatch;
    });

    // Filter by status
    const filteredAttendance = statusFilter
        ? monthYearFiltered.filter(record => record.status === statusFilter)
        : monthYearFiltered;

    // Reset pagination when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, monthFilter, yearFilter]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredAttendance.length / ITEMS_PER_PAGE);
    const paginatedAttendance = filteredAttendance.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'purple'> = {
            'PRESENT': 'success',
            'ABSENT': 'danger',
            'LATE': 'warning',
            'WORK_FROM_HOME': 'purple',
        };
        return variants[status] || 'info';
    };

    const getStatCardClass = (status: string | null) => {
        const isActive = statusFilter === status;
        const colorMap: Record<string, string> = {
            'ALL': 'from-purple-500/10 to-pink-500/10 border-purple-500/20',
            'PRESENT': 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20',
            'ABSENT': 'from-red-500/10 to-rose-500/10 border-red-500/20',
            'LATE': 'from-amber-500/10 to-orange-500/10 border-amber-500/20',
            'WORK_FROM_HOME': 'from-indigo-500/10 to-violet-500/10 border-indigo-500/20',
        };
        const activeColorMap: Record<string, string> = {
            'ALL': 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)] bg-purple-500/10',
            'PRESENT': 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] bg-emerald-500/10',
            'ABSENT': 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)] bg-red-500/10',
            'LATE': 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)] bg-amber-500/10',
            'WORK_FROM_HOME': 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)] bg-indigo-500/10',
        };

        const baseColor = colorMap[status || 'ALL'];
        const activeColor = activeColorMap[status || 'ALL'];

        return `relative rounded-3xl border backdrop-blur-xl bg-[var(--card-bg)] p-6 text-center cursor-pointer transition-all duration-300 hover:scale-105 group overflow-hidden ${isActive ? activeColor : `border-[var(--border-color)] hover:${baseColor}`}`;
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        } catch (e) {
            return dateString;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-main)]">Attendance Tracking</h2>
                    <p className="text-[var(--text-dim)] mt-1">Monitor daily attendance records</p>
                </div>
                <Button
                    onClick={onMarkAttendance}
                    icon={<Plus size={18} />}
                    gradient="emerald"
                >
                    Mark Attendance
                </Button>
            </div>

            {/* Filters Redesign */}
            <div className="flex flex-wrap items-center gap-6 p-1">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Time Window</span>
                    <div className="flex bg-[var(--bg-muted)] border border-[var(--border-color)] p-1 rounded-2xl">
                        <select
                            value={monthFilter === 'all' ? 'all' : monthFilter}
                            onChange={(e) => setMonthFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                            className="bg-transparent border-none text-[var(--text-main)] text-xs font-bold px-3 py-1.5 focus:outline-none cursor-pointer"
                        >
                            <option value="all">All Months</option>
                            <option value={1}>January</option>
                            <option value={2}>February</option>
                            <option value={3}>March</option>
                            <option value={4}>April</option>
                            <option value={5}>May</option>
                            <option value={6}>June</option>
                            <option value={7}>July</option>
                            <option value={8}>August</option>
                            <option value={9}>September</option>
                            <option value={10}>October</option>
                            <option value={11}>November</option>
                            <option value={12}>December</option>
                        </select>
                        <div className="w-px bg-white/5 my-1" />
                        <select
                            value={yearFilter === 'all' ? 'all' : yearFilter}
                            onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                            className="bg-transparent border-none text-[var(--text-main)] text-xs font-bold px-3 py-1.5 focus:outline-none cursor-pointer"
                        >
                            <option value="all">All Years</option>
                            <option value={2024}>2024</option>
                            <option value={2025}>2025</option>
                            <option value={2026}>2026</option>
                            <option value={2027}>2027</option>
                            <option value={2028}>2028</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Attendance Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <button
                    onClick={() => setStatusFilter(null)}
                    className={getStatCardClass(null)}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                        <p className="text-3xl font-black text-[var(--text-main)] tracking-tighter italic">{monthYearFiltered.length}</p>
                        <p className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest mt-1">Total Logs</p>
                    </div>
                </button>
                <button
                    onClick={() => setStatusFilter(statusFilter === 'PRESENT' ? null : 'PRESENT')}
                    className={getStatCardClass('PRESENT')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                        <p className="text-3xl font-black text-emerald-500 tracking-tighter italic">{monthYearFiltered.filter(a => a.status === 'PRESENT').length}</p>
                        <p className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest mt-1">Present</p>
                    </div>
                </button>
                <button
                    onClick={() => setStatusFilter(statusFilter === 'ABSENT' ? null : 'ABSENT')}
                    className={getStatCardClass('ABSENT')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                        <p className="text-3xl font-black text-red-500 tracking-tighter italic">{monthYearFiltered.filter(a => a.status === 'ABSENT').length}</p>
                        <p className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest mt-1">Absent</p>
                    </div>
                </button>
                <button
                    onClick={() => setStatusFilter(statusFilter === 'LATE' ? null : 'LATE')}
                    className={getStatCardClass('LATE')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                        <p className="text-3xl font-black text-amber-500 tracking-tighter italic">{monthYearFiltered.filter(a => a.status === 'LATE').length}</p>
                        <p className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest mt-1">Late</p>
                    </div>
                </button>
                <button
                    onClick={() => setStatusFilter(statusFilter === 'WORK_FROM_HOME' ? null : 'WORK_FROM_HOME')}
                    className={getStatCardClass('WORK_FROM_HOME')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                        <p className="text-3xl font-black text-indigo-500 tracking-tighter italic">{monthYearFiltered.filter(a => a.status === 'WORK_FROM_HOME').length}</p>
                        <p className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest mt-1">Remote</p>
                    </div>
                </button>
            </div>

            {/* Attendance List Redesign */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-6 mb-2">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Chronological Log</h3>
                    <div className="text-[10px] font-bold text-slate-500 bg-white/5 px-3 py-1 rounded-full">{filteredAttendance.length} Records Found</div>
                </div>

                <div className="space-y-3">
                    {paginatedAttendance.length > 0 ? (
                        paginatedAttendance.map((record) => (
                            <div key={record.id} className="bg-[var(--card-bg)] hover:bg-white/[0.02] border border-[var(--border-color)] hover:border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all group">
                                {/* Date Column */}
                                <div className="w-48 shrink-0 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 group-hover:bg-emerald-400/10 transition-colors">
                                        <Calendar size={18} />
                                    </div>
                                    <span className="text-sm font-black text-[var(--text-main)] font-mono tracking-tighter">{formatDate(record.date)}</span>
                                </div>

                                {/* Status Column */}
                                <div className="w-40 shrink-0 flex justify-center">
                                    <Badge variant={getStatusBadge(record.status)} size="lg" className="px-5 py-1.5 rounded-full uppercase italic font-black tracking-widest text-[10px] min-w-[120px] text-center shadow-sm">
                                        {record.status.replace(/_/g, ' ')}
                                    </Badge>
                                </div>

                                {/* Time Columns */}
                                <div className="w-36 shrink-0 flex flex-col items-center">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Check In</span>
                                    <span className="text-sm font-bold text-[var(--text-main)] font-mono">{record.check_in_time || '--- ---'}</span>
                                </div>
                                
                                <div className="w-36 shrink-0 flex flex-col items-center">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Check Out</span>
                                    <span className="text-sm font-bold text-[var(--text-main)] font-mono">{record.check_out_time || '--- ---'}</span>
                                </div>

                                {/* Payload Column */}
                                <div className="w-40 shrink-0 flex flex-col items-center border-l border-white/5 pl-4">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Total Payload</span>
                                    <span className="text-sm font-black text-emerald-400 font-mono tracking-tighter">{record.working_hours}h</span>
                                </div>

                                {/* Quick Actions */}
                                <div className="w-32 shrink-0 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="sm" variant="secondary" className="rounded-xl bg-white/5 border-none text-[10px] uppercase font-black tracking-widest px-6">Details</Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-[var(--card-bg)] border border-dashed border-[var(--border-color)] rounded-3xl p-20 text-center">
                            <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-600">
                                <Calendar size={32} />
                            </div>
                            <h3 className="text-lg font-black text-[var(--text-main)] uppercase italic tracking-tighter">No Records Found</h3>
                            <p className="text-[var(--text-dim)] mt-2 italic">Try adjusting your filters to find existing logs.</p>
                        </div>
                    )}
                </div>

                {filteredAttendance.length > 0 && totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-8">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Page <span className="text-white">{currentPage}</span> <span className="mx-2">/</span> {totalPages}
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed text-slate-500' : 'bg-white/5 hover:bg-emerald-500/10 text-white hover:text-emerald-400'}`}
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed text-slate-500' : 'bg-white/5 hover:bg-emerald-500/10 text-white hover:text-emerald-400'}`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceTab;
