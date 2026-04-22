import React, { useEffect, useState, useCallback } from 'react';
import ReportTimeline from '../components/reports/ReportTimeline';
import { fetchMyReportsV2, submitSelfReportV2 } from '../api/reports';
import type { WeeklyReportV2, SelfReportFormData } from '../types/reports';
import { Card, Button, StatsCard, LoadingSpinner } from '../components/common';
import { FileText, Plus, X, Calendar, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

const WeeklyReportsInternPage: React.FC = () => {
  const [reports, setReports]     = useState<WeeklyReportV2[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm]           = useState<SelfReportFormData>({
    week_start: '',
    tasks_assigned: 0,
    tasks_completed: 0,
    tasks_in_progress: 0,
    tasks_overdue: 0,
    attendance_days: 0,
    total_actual_hours: 0,
  });

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyReportsV2();
      // Support both paginated and non-paginated responses
      const results = Array.isArray(data) ? data : (data?.results || []);
      setReports(results);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    toast.promise(submitSelfReportV2(form), {
      loading: 'Transmitting performance disclosure to server...',
      success: () => {
        setShowForm(false);
        loadReports();
        setSubmitting(false);
        return 'Report submitted successfully';
      },
      error: (err) => {
        setSubmitting(false);
        return (err as Error).message || 'Failed to submit report';
      }
    });
  };

  const autoReports = reports.filter(r => r.is_auto_generated);
  const selfReports = reports.filter(r => !r.is_auto_generated);

  if (loading && reports.length === 0) {
      return (
          <div className="flex items-center justify-center min-h-[60vh]">
              <div className="flex flex-col items-center gap-4">
                  <LoadingSpinner />
                  <p className="text-[var(--text-dim)] animate-pulse uppercase text-xs font-black tracking-widest">Retrieving Weekly Logs...</p>
              </div>
          </div>
      );
  }

  const stats = [
    { title: 'System Reports', value: autoReports.length, icon: <Activity size={24} />, gradient: 'from-blue-500 to-indigo-500' },
    { title: 'Self Reports', value: selfReports.length, icon: <FileText size={24} />, gradient: 'from-emerald-500 to-teal-500' },
    { title: 'Red Flags', value: reports.filter(r => r.red_flag).length, icon: <AlertCircle size={24} />, gradient: 'from-red-500 to-rose-500' },
    { title: 'Mismatches', value: reports.filter(r => r.self_report_mismatch).length, icon: <RefreshCw size={24} />, gradient: 'from-amber-500 to-orange-500' },
  ];

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-heading font-black tracking-tighter text-[var(--text-main)] mb-2 uppercase">
            Weekly <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Reports</span>
          </h1>
          <p className="text-[var(--text-dim)] font-bold uppercase text-[10px] tracking-[0.2em]">Automated and self-submitted performance logs</p>
        </div>
        <Button
          onClick={() => setShowForm(f => !f)}
          className={`flex items-center gap-2 group transition-all duration-500 ${showForm ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white' : ''}`}
        >
          {showForm ? <X size={16} /> : <Plus size={16} className="group-hover:rotate-90 transition-transform" />}
          <span>{showForm ? 'Cancel' : 'Submit Self-Report'}</span>
        </Button>
      </div>

      {/* Self-report form */}
      {showForm && (
        <Card padding="none" className="border-[var(--border-color)] bg-[var(--card-bg)] backdrop-blur-xl animate-slide-down">
          <div className="p-6 border-b border-[var(--border-color)] flex items-center gap-2 bg-white/[0.02]">
            <div className="p-2 bg-purple-500/10 rounded-lg">
                <FileText size={18} className="text-purple-400" />
            </div>
            <h3 className="font-heading font-bold text-[var(--text-main)] uppercase tracking-tight">Manual Performance Disclosure</h3>
          </div>
          <form onSubmit={handleSubmit} className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {([
                ['week_start', 'Week Start Date', 'date'],
                ['tasks_assigned',   'Tasks Assigned',    'number'],
                ['tasks_completed',  'Tasks Completed',   'number'],
                ['tasks_in_progress','In Progress', 'number'],
                ['tasks_overdue',    'Overdue',     'number'],
                ['attendance_days',  'Days Present',      'number'],
                ['total_actual_hours','Actual Hours Worked','number'],
              ] as [keyof SelfReportFormData, string, string][]).map(([key, label, type]) => (
                <div key={key} className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">{label}</label>
                  <input
                    type={type}
                    value={form[key] as string | number}
                    onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                    required
                    className="w-full bg-white/5 border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)] text-sm focus:ring-2 focus:ring-purple-500/40 outline-none transition-all"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-4 border-t border-[var(--border-color)]">
                <Button
                type="submit"
                disabled={submitting}
                className="btn-primary-premium min-w-[200px]"
                >
                {submitting ? 'Authenticating Data...' : 'Confirm Submission'}
                </Button>
            </div>
          </form>
        </Card>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <StatsCard key={i} {...stat} />
        ))}
      </div>

      {/* Report Timeline Container */}
      <div className="animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <Calendar size={20} className="text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-xl font-heading font-bold text-[var(--text-main)] uppercase tracking-tight">Timeline Logs</h2>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Chronological record of weekly performance</p>
                </div>
            </div>
            <ReportTimeline
                reports={reports}
                isManagerView={false}
                loading={loading}
            />
      </div>
    </div>
  );
};

export default WeeklyReportsInternPage;
