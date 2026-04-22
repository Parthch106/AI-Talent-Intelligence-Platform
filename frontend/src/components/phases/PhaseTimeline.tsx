import React from 'react';
import type { EmploymentStage } from '../../types/reports';
import ConversionProbabilityGauge from './ConversionProbabilityGauge';
import { Card, Badge } from '../common';
import { 
  GraduationCap, 
  Briefcase, 
  Rocket, 
  Check, 
  Target, 
  Activity, 
  Calendar,
  ChevronRight,
  TrendingUp,
  Info
} from 'lucide-react';

interface Props {
  stages: EmploymentStage[];
  currentStatus: string;       // From InternProfile.status
  conversionScore?: number | null;
}

const PHASE_META = [
  {
    phase: 'PHASE_1' as const,
    label: 'Standard Internship',
    sublabel: 'Months 1–6',
    icon: <GraduationCap size={20} />,
    color: 'indigo',
  },
  {
    phase: 'PHASE_2' as const,
    label: 'Stipend Internship',
    sublabel: 'Months 7–12',
    icon: <Briefcase size={20} />,
    color: 'blue',
  },
  {
    phase: 'FULL_TIME' as const,
    label: 'Full-Time Transition',
    sublabel: 'Month 13+',
    icon: <Rocket size={20} />,
    color: 'emerald',
  },
];

const PhaseTimeline: React.FC<Props> = ({ stages, currentStatus, conversionScore }) => {
  const stageMap = Object.fromEntries(stages.map(s => [s.phase, s]));

  const getPhaseState = (phase: string): 'completed' | 'active' | 'locked' => {
    if (stageMap[phase]?.phase_end_date) return 'completed';
    if (stageMap[phase]) return 'active';
    return 'locked';
  };

  const getColorClass = (color: string, state: string) => {
    if (state === 'locked') return 'border-[var(--border-color)] text-[var(--text-muted)] bg-[var(--bg-muted)]';
    if (state === 'active') return `border-${color}-500/50 text-${color}-400 bg-${color}-500/10 ring-4 ring-${color}-500/5`;
    return `border-${color}-500 text-white bg-${color}-500 shadow-[0_0_20px_rgba(var(--${color}-500-rgb),0.3)]`;
  };

  return (
    <div className="py-8 space-y-12">
      {/* Phase Track */}
      <div className="flex flex-col lg:flex-row items-start justify-between gap-8 relative px-4">
        {PHASE_META.map((meta, index) => {
          const state = getPhaseState(meta.phase);
          const stage = stageMap[meta.phase];
          const isLast = index === PHASE_META.length - 1;

          return (
            <React.Fragment key={meta.phase}>
              {/* Phase Node */}
              <div className="flex-1 w-full lg:w-auto text-center space-y-4 group">
                <div className="relative inline-block">
                    {/* Visual Connector Line (for mobile) */}
                    {!isLast && (
                        <div className="absolute top-1/2 left-full w-full h-px bg-gradient-to-r from-[var(--border-color)] to-transparent lg:hidden" />
                    )}
                    
                    <div className={`w-16 h-16 rounded-[24px] mx-auto flex items-center justify-center text-xl border-2 transition-all duration-500 relative z-10 ${
                        state === 'completed' ? `bg-${meta.color}-500 border-${meta.color}-400 shadow-[0_0_30px_rgba(var(--${meta.color}-rgb),0.2)]` :
                        state === 'active' ? `bg-${meta.color}-500/10 border-${meta.color}-500/40 animate-pulse` :
                        'bg-white/[0.02] border-[var(--border-color)] opacity-40'
                    }`}>
                        {state === 'completed' ? <Check size={28} className="text-white" /> : 
                         <span className={state === 'active' ? `text-${meta.color}-400` : 'text-[var(--text-muted)]'}>{meta.icon}</span>}
                    </div>
                </div>

                <div className="space-y-1">
                    <h3 className={`font-heading font-black text-sm uppercase tracking-tight transition-colors duration-300 ${state === 'locked' ? 'text-[var(--text-muted)]' : 'text-[var(--text-main)]'}`}>
                        {meta.label}
                    </h3>
                    <p className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest opacity-60">
                        {meta.sublabel}
                    </p>
                </div>

                {stage && (
                  <div className="pt-2 flex flex-col items-center gap-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/[0.03] border border-[var(--border-color)] rounded-full">
                        <Calendar size={10} className="text-[var(--text-muted)]" />
                        <span className="text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest leading-none">
                            {new Date(stage.phase_start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                        {stage.phase_end_date && (
                            <>
                                <ChevronRight size={10} className="text-[var(--text-muted)]" />
                                <span className="text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest leading-none">
                                    {new Date(stage.phase_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                            </>
                        )}
                    </div>
                    {stage.conversion_score !== null && (
                        <Badge className={`text-[9px] font-black ${stage.conversion_score >= 75 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            GATE SCORE: {stage.conversion_score.toFixed(1)}%
                        </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Desktop Connector Line */}
              {!isLast && (
                <div className="hidden lg:block flex-shrink-0 w-12 h-px bg-[var(--border-color)] mt-8" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Conversion Analytics Panel */}
      <div className="relative group mx-4">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-[32px] blur opacity-50"></div>
        <div className="relative glass-card bg-emerald-500/[0.02] border border-emerald-500/20 p-8 rounded-[32px] flex flex-col md:flex-row items-center gap-10">
            <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/10 blur-3xl animate-pulse rounded-full"></div>
                <div className="relative z-10">
                    <ConversionProbabilityGauge score={conversionScore ?? null} size={180} />
                </div>
            </div>
            
            <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-xl">
                        <TrendingUp size={20} className="text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-heading font-black text-emerald-400 uppercase tracking-tight">Transition Probability Intelligence</h3>
                </div>
                
                <p className="text-sm text-[var(--text-dim)] leading-relaxed font-medium">
                    Your conversion score represents an aggregate performance vector derived from <span className="text-[var(--text-main)] font-black italic">velocity, technical mastery, and audit consistency</span>. This metric is refreshed every operational cycle to reflect your real-time trajectory towards full-time absorption.
                </p>

                {conversionScore === null ? (
                    <div className="flex items-center gap-3 p-4 bg-white/[0.03] border border-dashed border-[var(--border-color)] rounded-2xl">
                        <Info size={16} className="text-[var(--text-muted)]" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                            Trajectory data will materialize upon deployment into <span className="text-blue-400">Phase 2 — Stipend Deployment</span>.
                        </p>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                        <Check size={16} className="text-emerald-400" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                            Proprietary AI model has validated your conversion trajectory. Keep maintaining momentum.
                        </p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default PhaseTimeline;
