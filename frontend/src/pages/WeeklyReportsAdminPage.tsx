import React, { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fetchAllReportsV2 } from '../api/reports';
import type { WeeklyReportV2 } from '../types/reports';
import { Card, StatsCard, LoadingSpinner } from '../components/common';
import { Activity, Users, AlertCircle, BarChart3, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';

const WeeklyReportsAdminPage: React.FC = () => {
  const [reports, setReports] = useState<WeeklyReportV2[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading && reports.length === 0) return (
      <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
              <LoadingSpinner />
              <p className="text-[var(--text-dim)] animate-pulse uppercase text-xs font-black tracking-widest">Aggregating Cohort Data...</p>
          </div>
      </div>
  );

  // Aggregate metrics for the cohort
  const safeReports   = reports || [];
  const totalInterns  = new Set(safeReports.map(r => r.intern)).size;
  const avgOverall    = safeReports.reduce((sum, r) => sum + (r.overall_weekly_score ?? 0), 0) / (safeReports.length || 1);
  const redFlagPct    = safeReports.length ? (safeReports.filter(r => r.red_flag).length / safeReports.length) * 100 : 0;
  const reviewedPct   = safeReports.length ? (safeReports.filter(r => r.manager_reviewed).length / safeReports.length) * 100 : 0;

  const stats = [
    { title: 'Active Interns', value: totalInterns, icon: <Users size={24} />, gradient: 'from-blue-500 to-indigo-500' },
    { title: 'Avg Weekly Score', value: `${avgOverall.toFixed(1)}%`, icon: <TrendingUp size={24} />, gradient: avgOverall >= 75 ? 'from-emerald-500 to-teal-500' : avgOverall >= 50 ? 'from-amber-500 to-orange-500' : 'from-red-500 to-rose-500' },
    { title: 'Red Flag Rate', value: `${redFlagPct.toFixed(0)}%`, icon: <AlertCircle size={24} />, gradient: 'from-red-500 to-pink-500' },
    { title: 'Review Coverage', value: `${reviewedPct.toFixed(0)}%`, icon: <CheckCircle2 size={24} />, gradient: 'from-purple-500 to-pink-500' },
  ];

  // Score distribution buckets
  const buckets = [
    { label: '90–100%', min: 90, max: 101, color: '#34d399' },
    { label: '75–89%',  min: 75, max: 90,  color: '#818cf8' },
    { label: '50–74%',  min: 50, max: 75,  color: '#fbbf24' },
    { label: '0–49%',   min: 0,  max: 50,  color: '#f87171' },
  ].map(b => ({
    ...b,
    count: safeReports.filter(r => (r.overall_weekly_score ?? 0) >= b.min && (r.overall_weekly_score ?? 0) < b.max).length,
  }));

  // Weekly trend (last 8 weeks average)
  const weeklyAvgs = Array.from(
    safeReports.reduce((map, r) => {
      const key = r.week_start;
      const prev = map.get(key) ?? { total: 0, count: 0 };
      map.set(key, { total: prev.total + (r.overall_weekly_score ?? 0), count: prev.count + 1 });
      return map;
    }, new Map<string, { total: number; count: number }>())
  )
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([week, { total, count }]) => ({
      week: new Date(week).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).toUpperCase(),
      avg: parseFloat((total / count).toFixed(1)),
    }))
    .slice(-8);

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-heading font-black tracking-tighter text-[var(--text-main)] mb-2 uppercase">
            Cohort <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Analytics</span>
          </h1>
          <p className="text-[var(--text-dim)] font-bold uppercase text-[10px] tracking-[0.2em]">Aggregate performance and weekly metrics</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <StatsCard key={i} {...stat} />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Score Distribution */}
        <Card padding="none" className="border-[var(--border-color)] bg-[var(--card-bg)] backdrop-blur-xl">
          <div className="p-6 border-b border-[var(--border-color)] flex items-center gap-2 bg-white/[0.02]">
            <div className="p-2 bg-purple-500/10 rounded-lg">
                <BarChart3 size={18} className="text-purple-400" />
            </div>
            <h3 className="font-heading font-bold text-[var(--text-main)] uppercase tracking-tight">Score Distribution</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={240}>
                <BarChart data={buckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fill: 'var(--text-dim)', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{ background: 'var(--bg-muted)', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '12px', color: 'var(--text-main)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    itemStyle={{ fontWeight: 800, textTransform: 'uppercase' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {buckets.map((b, i) => <Cell key={i} fill={b.color} fillOpacity={0.8} />)}
                </Bar>
                </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Weekly Trend */}
        <Card padding="none" className="border-[var(--border-color)] bg-[var(--card-bg)] backdrop-blur-xl">
          <div className="p-6 border-b border-[var(--border-color)] flex items-center gap-2 bg-white/[0.02]">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Calendar size={18} className="text-indigo-400" />
            </div>
            <h3 className="font-heading font-bold text-[var(--text-main)] uppercase tracking-tight">Cohort Weekly Trend</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={240}>
                <BarChart data={weeklyAvgs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="week" tick={{ fill: 'var(--text-dim)', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-dim)', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{ background: 'var(--bg-muted)', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '12px', color: 'var(--text-main)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    itemStyle={{ fontWeight: 800, textTransform: 'uppercase' }}
                />
                <Bar dataKey="avg" fill="var(--primary-color)" radius={[6, 6, 0, 0]} fillOpacity={0.8} />
                </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default WeeklyReportsAdminPage;
