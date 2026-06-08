import React, { useEffect, useState, useCallback } from 'react';
import { fetchAllReportsV2 } from '../api/reports';
import { Card, Button, Badge, LoadingSpinner, StatsCard } from '../components/common';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { LayoutDashboard, CheckCircle2, Flag, ArrowUpRight, Clock, Award, ShieldCheck, Mail, Target } from 'lucide-react';

interface InternEvaluationState {
  id: number;
  user: {
    id: number;
    full_name: string;
    email: string;
  };
  status: string;
  join_date: string;
  months_active: number;
  current_phase: string;
  overall_score: number;
  is_eligible: boolean;
}

const PhaseGateDashboard: React.FC = () => {
  const [interns, setInterns] = useState<InternEvaluationState[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch interns who are near gate milestones (6 or 12 months)
      const res = await api.get('/analytics/evaluations/eligible/');
      setInterns(res.data);
    } catch (error) {
      console.error('Failed to load eligible interns:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && interns.length === 0) {
      return (
          <div className="flex items-center justify-center min-h-[60vh]">
              <div className="flex flex-col items-center gap-4">
                  <LoadingSpinner />
                  <p className="text-[var(--text-dim)] animate-pulse uppercase text-xs font-black tracking-widest">Scanning Gate Readiness...</p>
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
            Phase Gate <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Control</span>
          </h1>
          <p className="text-[var(--text-dim)] font-bold uppercase text-[10px] tracking-[0.2em]">Milestone review and progression management</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatsCard title="Awaiting Evaluation" value={interns.length} icon={<Clock size={24} />} gradient="from-amber-500 to-orange-600" />
        <StatsCard title="Phase 1 Gates" value={interns.filter(i => i.current_phase === 'PHASE_1').length} icon={<Award size={24} />} gradient="from-indigo-500 to-purple-600" />
        <StatsCard title="Phase 2 Gates" value={interns.filter(i => i.current_phase === 'PHASE_2').length} icon={<ShieldCheck size={24} />} gradient="from-emerald-500 to-teal-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {interns.map((intern) => (
          <Card key={intern.id} padding="none" className="group border-[var(--border-color)] bg-[var(--card-bg)] hover:border-emerald-500/50 transition-all duration-500 backdrop-blur-xl relative overflow-hidden">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-heading font-black text-xl text-[var(--text-main)] group-hover:text-emerald-400 transition-colors uppercase tracking-tight">
                    {intern.user.full_name}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    <Mail size={12} />
                    {intern.user.email}
                  </div>
                </div>
                <Badge className={intern.current_phase === 'PHASE_1' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}>
                  {intern.current_phase.replace('_', ' ')}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white/[0.02] rounded-2xl border border-[var(--border-color)]">
                      <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Tenure</div>
                      <div className="text-lg font-heading font-black text-[var(--text-main)]">{intern.months_active} <span className="text-[10px] text-[var(--text-muted)]">MO</span></div>
                  </div>
                  <div className="p-3 bg-white/[0.02] rounded-2xl border border-[var(--border-color)]">
                      <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Score</div>
                      <div className={`text-lg font-heading font-black ${intern.overall_score >= 75 ? 'text-emerald-400' : 'text-red-400'}`}>{intern.overall_score}%</div>
                  </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">
                  <span>Cumulative Performance</span>
                  <span>Goal: 75%+</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-[var(--border-color)]">
                  <div 
                    className={`h-full transition-all duration-1000 ${intern.overall_score >= 75 ? 'bg-emerald-500' : 'bg-red-500'}`}
                    style={{ width: `${intern.overall_score}%` }}
                  />
                </div>
              </div>

              {user?.role === 'ADMIN' ? (
                <Button 
                  className="w-full btn-primary-premium flex items-center justify-center gap-2"
                  onClick={() => navigate(`/analytics/evaluations/new/${intern.user.id}`)}
                >
                  <span>Conduct Gate Review</span>
                  <ArrowUpRight size={16} />
                </Button>
              ) : (
                <div className="w-full py-3 px-4 bg-white/5 border border-[var(--border-color)] rounded-2xl text-center">
                   <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest italic opacity-40">Review Restricted to Admin</span>
                </div>
              )}
            </div>
            
            <div className="bg-white/[0.02] px-6 py-4 border-t border-[var(--border-color)] flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${intern.is_eligible ? 'bg-emerald-500 animate-pulse' : 'bg-white/10'}`} />
              <span className="text-[10px] uppercase font-black text-[var(--text-dim)] tracking-widest">
                {intern.is_eligible ? 'Eligible for Phase Transition' : 'Maturity Milestone Pending'}
              </span>
            </div>
          </Card>
        ))}
        {interns.length === 0 && (
          <div className="col-span-full py-32 text-center flex flex-col items-center gap-4">
             <div className="p-6 bg-white/[0.02] rounded-full border border-[var(--border-color)] mb-4">
                <Target size={48} className="text-[var(--text-muted)] opacity-20" />
             </div>
             <p className="text-[var(--text-dim)] font-black uppercase text-xs tracking-widest italic">All nodes synchronized • No pending evaluations</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhaseGateDashboard;
