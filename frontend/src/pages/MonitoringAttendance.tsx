import React, { useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useMonitoring } from '../context/MonitoringContext';
import { AttendanceTab } from '../components/monitoring';
import { Card, AttendanceHeatmap, Modal, Button } from '../components/common';
import { ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Types (matching MonitoringDashboard)
interface Attendance {
    id: number;
    date: string;
    status: string;
    check_in_time: string;
    check_out_time: string;
    working_hours: number;
}


const MonitoringAttendancePage: React.FC = () => {
    const { user } = useAuth();
    
    // State
    // Global State from context
    const { selectedInternId: selectedIntern, setSelectedInternId: setSelectedIntern, interns } = useMonitoring();
    
    // Local State
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [monthFilter, setMonthFilter] = useState<number | 'all'>('all');
    const [yearFilter, setYearFilter] = useState<number | 'all'>(new Date().getFullYear());
    const [heatmapData, setHeatmapData] = useState<Record<string, { status: string; value: number; hours: number }>>({});
    const [heatmapLoading, setHeatmapLoading] = useState<boolean>(false);
    const [showInternDropdown, setShowInternDropdown] = useState(false);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [attendanceForm, setAttendanceForm] = useState({
        date: new Date().toISOString().split('T')[0],
        status: 'PRESENT',
        check_in_time: '09:00',
        check_out_time: '17:00'
    });

    const openModal = () => setActiveModal('attendance');
    const closeModal = () => {
        setActiveModal(null);
        setAttendanceForm({
            date: new Date().toISOString().split('T')[0],
            status: 'PRESENT',
            check_in_time: '09:00',
            check_out_time: '17:00'
        });
    };

    const fetchHeatmapData = useCallback(async (targetId: number): Promise<void> => {
        setHeatmapLoading(true);
        try {
            const params: Record<string, unknown> = { intern_id: targetId };
            
            if (yearFilter !== 'all') {
                params.start_date = `${yearFilter}-01-01`;
                params.end_date = `${yearFilter}-12-31`;
            } else {
                params.months = 12;
            }

            const response = await axios.get('/analytics/heatmap/attendance/', { params });
            setHeatmapData(response.data.heatmap || {});
        } catch (error) {
            console.error('Error fetching heatmap data:', error);
            setHeatmapData({});
        } finally {
            setHeatmapLoading(false);
        }
    }, [yearFilter]);

    const fetchData = useCallback(async (): Promise<void> => {
        setLoading(true);
        try {
            const targetId = user?.role === 'INTERN' ? user?.id : selectedIntern;
            if (!targetId) return;

            fetchHeatmapData(targetId);

            const params: Record<string, unknown> = { 
                intern_id: targetId,
                limit: 1000,
                page: 1
            };

            if (monthFilter !== 'all') params.month = monthFilter;
            if (yearFilter !== 'all') params.year = yearFilter;

            const attendanceRes = await axios.get('/analytics/attendance/', { params });
            const attendance = Array.isArray(attendanceRes.data.attendance) ? attendanceRes.data.attendance : [];
            setAttendance(attendance);
        } catch (err: unknown) {
            const apiError = err as { message?: string };
            console.error('[fetchData] Error fetching attendance:', apiError.message || err);
        }
        setLoading(false);
    }, [user?.role, user?.id, selectedIntern, monthFilter, yearFilter, fetchHeatmapData]);

    const handleMarkAttendance = async (e: React.FormEvent) => {
        e.preventDefault();
        toast.promise(axios.post('/analytics/attendance/mark/', {
            intern_id: selectedIntern,
            ...attendanceForm
        }), {
            loading: 'Registering biometric log entry...',
            success: () => {
                closeModal();
                fetchData();
                return 'Attendance record successfully synchronized';
            },
            error: (err) => {
                return (err as Error).message || 'Failed to register attendance log';
            }
        });
    };

    // Fetch data when page loads (for interns) or when selectedIntern changes
    useEffect(() => {
        if (user?.role === 'INTERN') {
            fetchData();
        } else if (selectedIntern) {
            fetchData();
        }
    }, [selectedIntern, user?.role, fetchData]);

    // Re-fetch when filters change
    useEffect(() => {
        const targetId = user?.role === 'INTERN' ? user.id : selectedIntern;
        if (targetId) {
            fetchData();
        }
    }, [monthFilter, yearFilter, fetchData, user?.role, user?.id, selectedIntern]);

    const getSelectedInternName = (): string => {
        if (user?.role === 'INTERN') return user.full_name || user.email;
        const selected = interns.find(i => i.id === selectedIntern);
        return selected?.full_name || selected?.email || 'Select Intern';
    };

    const getGradient = (name: string): string => {
        const colors = [
            'from-pink-500 to-rose-500', 'from-purple-500 to-indigo-500',
            'from-blue-500 to-cyan-500', 'from-green-500 to-emerald-500',
            'from-yellow-500 to-orange-500', 'from-red-500 to-pink-500'
        ];
        const index = name ? name.charCodeAt(0) % colors.length : 0;
        return colors[index];
    };

    const getInitials = (name: string | null): string => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="min-h-screen animate-fade-in overflow-visible pb-20">
            {/* Header Area */}
            <div className="bg-[var(--bg-muted)] border-b-0 px-6 py-6 backdrop-blur-xl overflow-visible z-30 relative">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 overflow-visible">
                    <div>
                        <h1 className="text-4xl font-black text-[var(--text-main)] tracking-tighter uppercase">
                            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Attendance</span>
                        </h1>
                        <p className="text-[var(--text-dim)] mt-4 font-medium max-w-md leading-relaxed">Track intern attendance and working hours.</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-6 w-full xl:w-auto">
                        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                            <div className="relative z-30">
                                <button
                                    onClick={() => setShowInternDropdown(!showInternDropdown)}
                                    className="flex items-center gap-3 px-5 py-3 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-2xl hover:border-emerald-500/50 transition-all shadow-lg backdrop-blur-md group"
                                >
                                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getGradient(getSelectedInternName())} flex items-center justify-center text-white font-black text-xs shadow-lg group-hover:scale-110 transition-transform`}>
                                        {getInitials(interns.find(i => i.id === selectedIntern)?.full_name || null)}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">Selected Intern</p>
                                        <span className="text-[var(--text-main)] font-bold text-sm">{getSelectedInternName()}</span>
                                    </div>
                                    <ChevronDown size={16} className={`text-[var(--text-muted)] ml-2 transition-transform duration-300 ${showInternDropdown ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {showInternDropdown && (
                                    <div className="absolute top-full right-0 left-0 xl:left-auto xl:w-64 mt-3 bg-[var(--card-bg)] backdrop-blur-2xl border border-[var(--border-color)] rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-scale-in">
                                        <div className="p-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                            <p className="px-4 py-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-color)] mb-1">Select Intern</p>
                                            {interns.map((intern) => (
                                                <button
                                                    key={intern.id}
                                                    onClick={() => {
                                                        setSelectedIntern(intern.id);
                                                        setShowInternDropdown(false);
                                                    }}
                                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedIntern === intern.id ? 'bg-emerald-500/20 text-emerald-400' : 'text-[var(--text-dim)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-main)]'}`}
                                                >
                                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getGradient(intern.full_name || intern.email)} flex items-center justify-center text-white font-bold text-[10px]`}>
                                                        {getInitials(intern.full_name)}
                                                    </div>
                                                    <span className="text-sm font-bold truncate">{intern.full_name || intern.email}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-96 gap-6">
                        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin shadow-2xl shadow-emerald-500/20"></div>
                        <p className="text-[var(--text-dim)] font-black uppercase tracking-[0.3em] animate-pulse">Synchronizing Data</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        <Card className="relative overflow-hidden group border-emerald-500/5 hover:border-emerald-500/20 transition-all duration-700 shadow-2xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            <div className="p-1">
                                {heatmapLoading ? (
                                    <div className="flex items-center justify-center h-48">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
                                    </div>
                                ) : (
                                    <AttendanceHeatmap
                                        data={heatmapData}
                                        year={yearFilter === 'all' ? new Date().getFullYear() : yearFilter}
                                        title={`Attendance Distribution ${yearFilter !== 'all' ? `(${yearFilter})` : '(12 Month Cycle)'}`}
                                    />
                                )}
                            </div>
                        </Card>
                        
                        <div className="relative animate-slide-up">
                            <AttendanceTab 
                                attendance={attendance} 
                                onMarkAttendance={openModal} 
                                canEdit={user?.role === 'MANAGER' || user?.role === 'INTERN'}
                                monthFilter={monthFilter}
                                setMonthFilter={setMonthFilter}
                                yearFilter={yearFilter}
                                setYearFilter={setYearFilter}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Mark Attendance Modal */}
            <Modal
                isOpen={activeModal === 'attendance'}
                onClose={closeModal}
                title="Mark Attendance"
                gradient="emerald"
                size="xl"
            >
                <form onSubmit={handleMarkAttendance} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Date</label>
                            <input
                                type="date"
                                required
                                value={attendanceForm.date}
                                onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Status</label>
                            <select
                                value={attendanceForm.status}
                                onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })}
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                            >
                                <option value="PRESENT">Present</option>
                                <option value="ABSENT">Absent</option>
                                <option value="LATE">Late</option>
                                <option value="WORK_FROM_HOME">Work from Home</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Check In Time</label>
                            <input
                                type="time"
                                required={attendanceForm.status !== 'ABSENT'}
                                disabled={attendanceForm.status === 'ABSENT'}
                                value={attendanceForm.check_in_time}
                                onChange={(e) => setAttendanceForm({ ...attendanceForm, check_in_time: e.target.value })}
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Check Out Time</label>
                            <input
                                type="time"
                                required={attendanceForm.status !== 'ABSENT'}
                                disabled={attendanceForm.status === 'ABSENT'}
                                value={attendanceForm.check_out_time}
                                onChange={(e) => setAttendanceForm({ ...attendanceForm, check_out_time: e.target.value })}
                                className="w-full px-4 py-3 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="button" onClick={closeModal} variant="outline" fullWidth>
                            Cancel
                        </Button>
                        <Button type="submit" gradient="emerald" fullWidth>
                            Mark Attendance
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default MonitoringAttendancePage;
