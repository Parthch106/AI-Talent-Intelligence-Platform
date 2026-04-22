import React, { useEffect, useState, useCallback } from 'react';
import RedFlagAlert from '../components/reports/RedFlagAlert';
import WeeklyReportCard from '../components/reports/WeeklyReportCard';
import { fetchAllReportsV2 } from '../api/reports';
import type { WeeklyReportV2 } from '../types/reports';
import { useNavigate } from 'react-router-dom';
import { Card, StatsCard, LoadingSpinner, Badge } from '../components/common';
import { Activity, AlertCircle, CheckCircle2, Search, TrendingUp, Users, Clock, Flag } from 'lucide-react';

const WeeklyReportsManagerPage: React.FC = () => {
  const [reports, setReports]       = useState<WeeklyReportV2[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filterIntern, setFilterIntern] = useState('');
  const navigate = useNavigate();

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllReportsV2({ is_auto_generated: true });
      // Support both paginated and non-paginated responses
      const results = Array.isArray(data) ? data : (data?.results || []);
      setReports(results);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const redFlagReports = (reports || []).filter(r => r?.red_flag);
  const normalReports  = (reports || []).filter(r => !r?.red_flag);

  const filtered = (list: WeeklyReportV2[]) => {
    if (!list) return [];
    return filterIntern
      ? list.filter(r => r?.intern_name?.toLowerCase().includes(filterIntern.toLowerCase()))
      : list;
  };

  const stats = [
    { title: 'Total Reports', value: reports.length, icon: <Activity size={24} />, gradient: 'from-blue-500 to-indigo-500' },
    { title: 'Red Flags', value: redFlagReports.length, icon: <Flag size={24} />, gradient: 'from-red-500 to-orange-500' },
    { title: 'Reviewed', value: reports.filter(r => r.manager_reviewed).length, icon: <CheckCircle2 size={24} />, gradient: 'from-emerald-500 to-teal-500' },
    { title: 'Pending Review', value: reports.filter(r => !r.manager_reviewed).length, icon: <Clock size={24} />, gradient: 'from-amber-500 to-orange-500' },
  ];

  if (loading && reports.length === 0) {
      return (
          <div className="flex items-center justify-center min-h-[60vh]">
              <div className="flex flex-col items-center gap-4">
                  <LoadingSpinner />
                  <p className="text-[var(--text-dim)] animate-pulse uppercase text-xs font-black tracking-widest">Compiling Feed...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-heading font-black tracking-tighter text-[var(--text-main)] mb-2 uppercase">
            Manager <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">Feed</span>
          </h1>
          <p className="text-[var(--text-dim)] font-bold uppercase text-[10px] tracking-[0.2em]">Weekly intelligence and performance monitoring</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <StatsCard key={i} {...stat} />
        ))}
      </div>

      {/* Search/Filter Container */}
      <div className="relative group max-w-2xl">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-purple-400 transition-colors">
              <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Filter by intern name..."
            value={filterIntern}
            onChange={e => setFilterIntern(e.target.value)}
            className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[20px] pl-14 pr-6 py-4 text-[var(--text-main)] text-sm focus:ring-2 focus:ring-purple-500/40 outline-none transition-all placeholder:text-[var(--text-muted)] backdrop-blur-xl"
          />
      </div>

      {/* Red flag section */}
      {filtered(redFlagReports).length > 0 && (
        <section className="animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-500/10 rounded-lg animate-pulse">
                    <Flag size={20} className="text-red-400" />
                </div>
                <div>
                    <h2 className="text-xl font-heading font-bold text-[var(--text-main)] uppercase tracking-tight">Critical Interventions</h2>
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Active red flags requiring attention</p>
                </div>
            </div>

          <div className="grid grid-cols-1 gap-4">
              {filtered(redFlagReports).map(r => (
                <RedFlagAlert
                  key={r.id}
                  internName={r.intern_name}
                  weekStart={r.week_start}
                  reasons={r.red_flag_reasons}
                  onView={() => setFilterIntern(r.intern_name)} 
                  isConsecutive={false}
                />
              ))}
          </div>
        </section>
      )}

      {/* All reports */}
      <section className="animate-slide-up delay-100">
        <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Activity size={20} className="text-purple-400" />
                </div>
                <div>
                    <h2 className="text-xl font-heading font-bold text-[var(--text-main)] uppercase tracking-tight">All Reports</h2>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Complete weekly report index</p>
                </div>
            </div>

        <div className="grid grid-cols-1 gap-6">
            {filtered([...redFlagReports, ...normalReports]).length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center gap-3">
                    <Search size={40} className="text-[var(--text-muted)] opacity-20" />
                    <p className="text-[var(--text-muted)] font-black uppercase text-xs tracking-widest">No matching reports found</p>
                </div>
            ) : filtered([...redFlagReports, ...normalReports]).map((r) => (
              <WeeklyReportCard
                key={r.id}
                report={r}
                priorReports={[]}
                isManagerView={true}
                onReviewedChange={loadReports}
              />
            ))}
        </div>
      </section>
    </div>
  );
};

export default WeeklyReportsManagerPage;
