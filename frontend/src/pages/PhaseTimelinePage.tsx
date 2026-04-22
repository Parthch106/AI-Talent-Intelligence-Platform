import React, { useEffect, useState, useCallback } from 'react';
import PhaseTimeline from '../components/phases/PhaseTimeline';
import { fetchMyStages, fetchMyEvaluations } from '../api/reports';
import type { EmploymentStage, PhaseEvaluation } from '../types/reports';
import { useAuth } from '../context/AuthContext';
import { Card, LoadingSpinner, Badge } from '../components/common';
import { Activity, Target, CheckCircle2, AlertCircle, TrendingUp, Clock } from 'lucide-react';

const PhaseTimelinePage: React.FC = () => {
  const { user } = useAuth();
  const [stages, setStages]           = useState<EmploymentStage[]>([]);
  const [evaluations, setEvaluations] = useState<PhaseEvaluation[]>([]);
  const [loading, setLoading]         = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, e] = await Promise.all([fetchMyStages(), fetchMyEvaluations()]);
      setStages(s);
      setEvaluations(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle different potential user object structures
  const currentStatus = (user as any)?.internprofile_status || (user as any)?.status || 'ACTIVE_INTERN';

  if (loading && stages.length === 0) {
      return (
          <div className="flex items-center justify-center min-h-[60vh]">
              <div className="flex flex-col items-center gap-4">
                  <LoadingSpinner />
                  <p className="text-[var(--text-dim)] animate-pulse uppercase text-xs font-black tracking-widest">Mapping Journey...</p>
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
            Phase <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Timeline</span>
          </h1>
          <p className="text-[var(--text-dim)] font-bold uppercase text-[10px] tracking-[0.2em]">Your 12-month evolution roadmap</p>
        </div>
      </div>

      <Card className="border-[var(--border-color)] bg-[var(--card-bg)] backdrop-blur-xl">
          <PhaseTimeline
            stages={stages}
            currentStatus={currentStatus}
            conversionScore={null}   // Wired up in Sprint 5 when ConversionScore model is built
          />
      </Card>

      {/* Phase Evaluations */}
      {evaluations.length > 0 && (
        <div className="animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Target size={20} className="text-blue-400" />
                </div>
                <div>
                    <h2 className="text-xl font-heading font-bold text-[var(--text-main)] uppercase tracking-tight">Gate Evaluations</h2>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Performance checkpoint results</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {evaluations.map(ev => (
                <div key={ev.id} className={`group p-6 rounded-[24px] border transition-all duration-300 flex items-center gap-6 flex-wrap ${ev.criteria_met ? 'bg-emerald-500/[0.03] border-emerald-500/20 hover:border-emerald-500/40' : 'bg-red-500/[0.03] border-red-500/20 hover:border-red-500/40'}`}>
                  <div className={`p-4 rounded-2xl flex flex-col items-center justify-center min-w-[100px] border ${ev.criteria_met ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {ev.criteria_met ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                    <span className="text-[10px] font-black uppercase tracking-widest mt-2">{ev.criteria_met ? 'PASSED' : 'NOT PASSED'}</span>
                  </div>

                  <div className="flex-1">
                    <div className="text-lg font-heading font-bold text-[var(--text-main)] uppercase tracking-tight mb-1">
                      {ev.decision_display}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                      <Clock size={12} />
                      Evaluated {new Date(ev.evaluated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {ev.evaluated_by_name && ` • BY ${ev.evaluated_by_name.toUpperCase()}`}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-3xl font-heading font-black tracking-tighter ${ev.overall_score >= 75 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {ev.overall_score.toFixed(1)}%
                    </div>
                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">Overall Score</div>
                  </div>
                </div>
              ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default PhaseTimelinePage;
