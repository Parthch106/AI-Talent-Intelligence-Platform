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

    const getStatCardClass = (status: string) => {
        const isActive = statusFilter === status;
        return `relative rounded-2xl border backdrop-blur-xl bg-[var(--card-bg)] border-[var(--border-color)] p-5 text-center cursor-pointer transition-all hover:scale-105 ${isActive ? 'border-purple-500/50 bg-purple-500/5 shadow-lg' : ''}`;
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

            {/* Month/Year Filter */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-[var(--text-dim)]">Month:</label>
                    <select
                        value={monthFilter === 'all' ? 'all' : monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                        className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] text-sm focus:outline-none focus:border-purple-500 hover:bg-purple-500/5 transition-colors"
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
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-[var(--text-dim)]">Year:</label>
                    <select
                        value={yearFilter === 'all' ? 'all' : yearFilter}
                        onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                        className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] text-sm focus:outline-none focus:border-purple-500 hover:bg-purple-500/5 transition-colors"
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

            {/* Attendance Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <button
                    onClick={() => setStatusFilter(statusFilter === null ? null : null)}
                    className={getStatCardClass('ALL')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none rounded-2xl"></div>
                    <div className="relative">
                        <p className="text-2xl font-bold text-[var(--text-main)]">{monthYearFiltered.length}</p>
                        <p className="text-sm text-[var(--text-dim)]">Total</p>
                    </div>
                </button>
                <button
                    onClick={() => setStatusFilter(statusFilter === 'PRESENT' ? null : 'PRESENT')}
                    className={getStatCardClass('PRESENT')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-5/5 pointer-events-none rounded-2xl"></div>
                    <div className="relative">
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{monthYearFiltered.filter(a => a.status === 'PRESENT').length}</p>
                        <p className="text-sm text-[var(--text-dim)]">Present</p>
                    </div>
                </button>
                <button
                    onClick={() => setStatusFilter(statusFilter === 'ABSENT' ? null : 'ABSENT')}
                    className={getStatCardClass('ABSENT')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-rose-500/5 pointer-events-none rounded-2xl"></div>
                    <div className="relative">
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{monthYearFiltered.filter(a => a.status === 'ABSENT').length}</p>
                        <p className="text-sm text-[var(--text-dim)]">Absent</p>
                    </div>
                </button>
                <button
                    onClick={() => setStatusFilter(statusFilter === 'LATE' ? null : 'LATE')}
                    className={getStatCardClass('LATE')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 pointer-events-none rounded-2xl"></div>
                    <div className="relative">
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{monthYearFiltered.filter(a => a.status === 'LATE').length}</p>
                        <p className="text-sm text-[var(--text-dim)]">Late</p>
                    </div>
                </button>
                <button
                    onClick={() => setStatusFilter(statusFilter === 'WORK_FROM_HOME' ? null : 'WORK_FROM_HOME')}
                    className={getStatCardClass('WORK_FROM_HOME')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-500/5 pointer-events-none rounded-2xl"></div>
                    <div className="relative">
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{monthYearFiltered.filter(a => a.status === 'WORK_FROM_HOME').length}</p>
                        <p className="text-sm text-[var(--text-dim)]">WFH</p>
                    </div>
                </button>
            </div>

            {/* Attendance Table */}
            <div className="relative rounded-2xl border backdrop-blur-xl bg-[var(--card-bg)] border-[var(--border-color)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[var(--bg-muted)] border-b border-[var(--border-color)]">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Check In</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Check Out</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Hours</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                             {paginatedAttendance.map((record) => (
                                <tr key={record.id} className="hover:bg-purple-500/[0.02] transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-[var(--text-main)]">{record.date}</td>
                                    <td className="px-6 py-4">
                                        <Badge variant={getStatusBadge(record.status)}>
                                            {record.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-[var(--text-dim)]">{record.check_in_time || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-[var(--text-dim)]">{record.check_out_time || '-'}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-[var(--text-main)]">{record.working_hours}h</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredAttendance.length > 0 && totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 bg-[var(--bg-muted)] border-t border-[var(--border-color)]">
                        <div className="text-sm text-[var(--text-dim)]">
                            Showing <span className="text-[var(--text-main)] font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-[var(--text-main)] font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredAttendance.length)}</span> of <span className="text-[var(--text-main)] font-medium">{filteredAttendance.length}</span> results
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <span className="text-sm text-[var(--text-dim)] px-2">
                                Page {currentPage} of {totalPages}
                            </span>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceTab;
