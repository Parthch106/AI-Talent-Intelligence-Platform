import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
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
    canEdit?: boolean;
}

// Sub-component for individual Stat Cards
interface StatCardProps {
    label: string;
    count: number;
    status: string | null;
    currentStatus: string | null;
    setStatus: (status: string | null) => void;
    colorClass: string;
    activeClass: string;
    iconColor?: string;
}

const StatCard = ({ label, count, status, currentStatus, setStatus, colorClass, activeClass, iconColor }: StatCardProps) => {
    const isActive = currentStatus === status;
    return (
        <button
            onClick={() => setStatus(currentStatus === status ? null : status)}
            className={`relative rounded-3xl border backdrop-blur-xl bg-[var(--card-bg)] p-6 text-center cursor-pointer transition-all duration-300 hover:scale-105 group overflow-hidden ${isActive ? activeClass : `border-[var(--border-color)] hover:${colorClass}`}`}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${colorClass.split(' ')[0]} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className="relative">
                <p className={`text-3xl font-black ${iconColor || 'text-[var(--text-main)]'} tracking-tighter`}>{count}</p>
                <p className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest mt-1">{label}</p>
            </div>
        </button>
    );
};

const AttendanceTab: React.FC<AttendanceTabProps> = ({ 
    attendance, 
    onMarkAttendance,
    monthFilter,
    setMonthFilter,
    yearFilter,
    setYearFilter,
    canEdit
}) => {
    const attendanceArray = useMemo(() => Array.isArray(attendance) ? attendance : [], [attendance]);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const ITEMS_PER_PAGE = 10;

    // Auto-select latest month/year if current selection has no data
    useEffect(() => {
        if (attendanceArray.length > 0 && monthFilter !== 'all' && yearFilter !== 'all') {
            const hasData = attendanceArray.some(record => {
                const d = new Date(record.date);
                return d.getMonth() + 1 === monthFilter && d.getFullYear() === yearFilter;
            });

            if (!hasData) {
                const sorted = [...attendanceArray].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const latest = new Date(sorted[0].date);
                setMonthFilter(latest.getMonth() + 1);
                setYearFilter(latest.getFullYear());
            }
        }
    }, [attendanceArray, monthFilter, yearFilter, setMonthFilter, setYearFilter]);

    // Optimized filtering using useMemo
    const monthYearFiltered = useMemo(() => {
        return attendanceArray.filter(record => {
            const d = new Date(record.date);
            const mMatch = monthFilter === 'all' || (d.getMonth() + 1) === monthFilter;
            const yMatch = yearFilter === 'all' || d.getFullYear() === yearFilter;
            return mMatch && yMatch;
        });
    }, [attendanceArray, monthFilter, yearFilter]);

    const filteredAttendance = useMemo(() => {
        return statusFilter
            ? monthYearFiltered.filter(record => record.status === statusFilter)
            : monthYearFiltered;
    }, [monthYearFiltered, statusFilter]);

    const stats = useMemo(() => ({
        total: monthYearFiltered.length,
        present: monthYearFiltered.filter(a => a.status === 'PRESENT').length,
        absent: monthYearFiltered.filter(a => a.status === 'ABSENT').length,
        late: monthYearFiltered.filter(a => a.status === 'LATE').length,
        remote: monthYearFiltered.filter(a => a.status === 'WORK_FROM_HOME').length,
    }), [monthYearFiltered]);

    const totalPages = Math.ceil(filteredAttendance.length / ITEMS_PER_PAGE);
    const paginatedAttendance = useMemo(() => {
        return filteredAttendance.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    }, [filteredAttendance, currentPage]);

    // Reset pagination on filter change
    useEffect(() => setCurrentPage(1), [statusFilter, monthFilter, yearFilter]);

    const getStatusBadge = (status: string) => {
        const variants: Record<string, string> = { 'PRESENT': 'success', 'ABSENT': 'danger', 'LATE': 'warning', 'WORK_FROM_HOME': 'purple' };
        return variants[status] || 'info';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-main)]">Attendance Tracking</h2>
                    <p className="text-[var(--text-dim)] mt-1">Monitor daily attendance records</p>
                </div>
                {canEdit && <Button onClick={onMarkAttendance} icon={<Plus size={18} />} gradient="emerald">Mark Attendance</Button>}
            </div>

            <div className="flex flex-wrap items-center gap-6 p-1">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Time Window</span>
                    <div className="flex bg-[var(--bg-muted)] border border-[var(--border-color)] p-1 rounded-2xl">
                        <select
                            value={monthFilter}
                            onChange={(e) => setMonthFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                            className="bg-transparent border-none text-[var(--text-main)] text-xs font-bold px-3 py-1.5 focus:outline-none cursor-pointer"
                        >
                            <option value="all">All Months</option>
                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                                <option key={m} value={m}>{new Date(2000, m-1).toLocaleString('default', {month:'long'})}</option>
                            ))}
                        </select>
                        <div className="w-px bg-[var(--border-color)] my-1" />
                        <select
                            value={yearFilter}
                            onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                            className="bg-transparent border-none text-[var(--text-main)] text-xs font-bold px-3 py-1.5 focus:outline-none cursor-pointer"
                        >
                            <option value="all">All Years</option>
                            {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label="Total Logs" count={stats.total} status={null} currentStatus={statusFilter} setStatus={setStatusFilter} colorClass="from-purple-500/10 to-pink-500/10 border-purple-500/20" activeClass="border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)] bg-purple-500/10" />
                <StatCard label="Present" count={stats.present} status="PRESENT" currentStatus={statusFilter} setStatus={setStatusFilter} colorClass="from-emerald-500/10 to-teal-500/10 border-emerald-500/20" activeClass="border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] bg-emerald-500/10" iconColor="text-emerald-500" />
                <StatCard label="Absent" count={stats.absent} status="ABSENT" currentStatus={statusFilter} setStatus={setStatusFilter} colorClass="from-red-500/10 to-rose-500/10 border-red-500/20" activeClass="border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)] bg-red-500/10" iconColor="text-red-500" />
                <StatCard label="Late" count={stats.late} status="LATE" currentStatus={statusFilter} setStatus={setStatusFilter} colorClass="from-amber-500/10 to-orange-500/10 border-amber-500/20" activeClass="border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)] bg-amber-500/10" iconColor="text-amber-500" />
                <StatCard label="Remote" count={stats.remote} status="WORK_FROM_HOME" currentStatus={statusFilter} setStatus={setStatusFilter} colorClass="from-indigo-500/10 to-violet-500/10 border-indigo-500/20" activeClass="border-indigo-500 shadow-[0_0_20_rgba(99,102,241,0.2)] bg-indigo-500/10" iconColor="text-indigo-500" />
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between px-6 mb-2">
                    <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Chronological Log</h3>
                    <div className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-muted)] px-3 py-1 rounded-full">{filteredAttendance.length} Records Found</div>
                </div>

                <div className="space-y-3">
                    {paginatedAttendance.length > 0 ? (
                        paginatedAttendance.map((record) => (
                            <div key={record.id} className="bg-[var(--card-bg)] hover:bg-white/[0.02] border border-[var(--border-color)] hover:border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all group">
                                <div className="w-48 shrink-0 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-muted)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-emerald-400 group-hover:bg-emerald-400/10 transition-colors">
                                        <Calendar size={18} />
                                    </div>
                                    <span className="text-sm font-black text-[var(--text-main)] font-mono tracking-tighter">{record.date}</span>
                                </div>

                                <div className="w-40 shrink-0 flex justify-center">
                                    <Badge variant={getStatusBadge(record.status)} size="lg" className="px-5 py-1.5 rounded-full uppercase font-black tracking-widest text-[10px] min-w-[120px] text-center shadow-sm">
                                        {record.status.replace(/_/g, ' ')}
                                    </Badge>
                                </div>

                                <div className="w-36 shrink-0 flex flex-col items-center">
                                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Check In</span>
                                    <span className="text-sm font-bold text-[var(--text-main)] font-mono">{record.check_in_time || '--:--'}</span>
                                </div>
                                
                                <div className="w-36 shrink-0 flex flex-col items-center">
                                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Check Out</span>
                                    <span className="text-sm font-bold text-[var(--text-main)] font-mono">{record.check_out_time || '--:--'}</span>
                                </div>

                                <div className="w-40 shrink-0 flex flex-col items-center border-l border-[var(--border-color)] pl-4">
                                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Total Payload</span>
                                    <span className="text-sm font-black text-emerald-400 font-mono tracking-tighter">{record.working_hours}h</span>
                                </div>

                                <div className="w-32 shrink-0 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="sm" variant="secondary" className="rounded-xl bg-[var(--bg-muted)] border-none text-[10px] uppercase font-black tracking-widest px-6">Details</Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-[var(--card-bg)] border border-dashed border-[var(--border-color)] rounded-3xl p-20 text-center">
                            <div className="w-16 h-16 bg-[var(--bg-muted)] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[var(--text-muted)]">
                                <Calendar size={32} />
                            </div>
                            <h3 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tighter">No Records Found</h3>
                            <p className="text-[var(--text-dim)] mt-2">Try adjusting your filters to find existing logs.</p>
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-8">
                        <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                            Page <span className="text-[var(--text-main)]">{currentPage}</span> <span className="mx-2">/</span> {totalPages}
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`p-2 rounded-xl transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'bg-[var(--bg-muted)] hover:bg-emerald-500/10 text-[var(--text-main)] hover:text-emerald-400'}`}>
                                <ChevronLeft size={16} />
                            </button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`p-2 rounded-xl transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'bg-[var(--bg-muted)] hover:bg-emerald-500/10 text-[var(--text-main)] hover:text-emerald-400'}`}>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceTab;
