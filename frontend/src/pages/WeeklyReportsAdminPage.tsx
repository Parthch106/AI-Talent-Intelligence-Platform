import React, { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fetchAllReportsV2 } from '../api/reports';
import type { WeeklyReportV2 } from '../types/reports';

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

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading…</div>
  );

  // Aggregate metrics for the cohort
  const safeReports   = reports || [];
  const totalInterns  = new Set(safeReports.map(r => r.intern)).size;
  const avgOverall    = safeReports.reduce((sum, r) => sum + (r.overall_weekly_score ?? 0), 0) / (safeReports.length || 1);
  const redFlagPct    = safeReports.length ? (safeReports.filter(r => r.red_flag).length / safeReports.length) * 100 : 0;
  const reviewedPct   = safeReports.length ? (safeReports.filter(r => r.manager_reviewed).length / safeReports.length) * 100 : 0;


  // Score distribution buckets
  const buckets = [
    { label: '90–100%', min: 90, max: 100, color: '#34d399' },
    { label: '75–89%',  min: 75, max: 90,  color: '#818cf8' },
    { label: '50–74%',  min: 50, max: 75,  color: '#fbbf24' },
    { label: '0–49%',   min: 0,  max: 50,  color: '#f87171' },
  ].map(b => ({
    ...b,
    count: reports.filter(r => (r.overall_weekly_score ?? 0) >= b.min && (r.overall_weekly_score ?? 0) < b.max).length,
  }));

  // Weekly trend (last 8 weeks average)
  const weeklyAvgs = Array.from(
    reports.reduce((map, r) => {
      const key = r.week_start;
      const prev = map.get(key) ?? { total: 0, count: 0 };
      map.set(key, { total: prev.total + (r.overall_weekly_score ?? 0), count: prev.count + 1 });
      return map;
    }, new Map<string, { total: number; count: number }>())
  )
    .map(([week, { total, count }]) => ({
      week: new Date(week).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      avg: parseFloat((total / count).toFixed(1)),
    }))
    .slice(-8);

  return (
    <div style={{ padding: '28px 24px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#e5e7eb' }}>
        Cohort Analytics (V2)
      </h1>
      <p style={{ margin: '0 0 28px', color: '#6b7280', fontSize: '13px' }}>
        Aggregate performance across all active interns
      </p>

      {/* KPI row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {[
          { label: 'Active Interns', value: totalInterns, color: '#818cf8', suffix: '' },
          { label: 'Avg Weekly Score', value: avgOverall.toFixed(1), color: avgOverall >= 75 ? '#34d399' : avgOverall >= 50 ? '#fbbf24' : '#f87171', suffix: '%' },
          { label: 'Red Flag Rate', value: redFlagPct.toFixed(0), color: '#f87171', suffix: '%' },
          { label: 'Review Coverage', value: reviewedPct.toFixed(0), color: '#34d399', suffix: '%' },
        ].map(({ label, value, color, suffix }) => (
          <div key={label} style={{
            flex: 1, minWidth: '150px',
            background: '#1e1e2e',
            border: '1px solid #2a2a3e',
            borderRadius: '12px',
            padding: '16px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color }}>
              {value}{suffix}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
        {/* Score distribution */}
        <div style={{
          background: '#1e1e2e',
          border: '1px solid #2a2a3e',
          borderRadius: '12px',
          padding: '18px',
        }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Score Distribution
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={buckets} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1e1e2e', border: '1px solid #333', borderRadius: '6px', fontSize: '12px', color: '#fff' }}
                formatter={(v: number) => [v, 'Interns']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {buckets.map((b, i) => <Cell key={i} fill={b.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly average trend */}
        <div style={{
          background: '#1e1e2e',
          border: '1px solid #2a2a3e',
          borderRadius: '12px',
          padding: '18px',
        }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Cohort Weekly Trend
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyAvgs} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
              <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1e1e2e', border: '1px solid #333', borderRadius: '6px', fontSize: '12px', color: '#fff' }}
                formatter={(v: number) => [`${v}%`, 'Avg Score']}
              />
              <Bar dataKey="avg" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default WeeklyReportsAdminPage;
