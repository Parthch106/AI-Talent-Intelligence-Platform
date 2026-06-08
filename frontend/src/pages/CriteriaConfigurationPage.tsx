import React, { useEffect, useState, useCallback } from 'react';
import { fetchCriteria, updateCriteria, createCriteria, previewCriteria } from '../api/criteria';
import type { CertificationCriteria, CriteriaPreview } from '../api/criteria';
import { Card, Button, Badge, LoadingSpinner } from '../components/common';
import { useAuth } from '../context/AuthContext';
import { Settings2, Target, Zap, Gem, Users, Calendar, BarChart3, AlertCircle, Save, Eye, Activity, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

const CriteriaConfigurationPage: React.FC = () => {
  const [criteriaList, setCriteriaList] = useState<CertificationCriteria[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [selectedPhase, setSelectedPhase] = useState<'PHASE_1' | 'PHASE_2' | 'PPO'>('PHASE_1');
  const [activeCriteria, setActiveCriteria] = useState<Partial<CertificationCriteria>>({});
  const [preview, setPreview] = useState<CriteriaPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCriteria();
      setCriteriaList(data);
      const active = data.find(c => c.phase === selectedPhase && c.is_active);
      if (active) setActiveCriteria(active);
    } catch (error) {
      console.error('Failed to load criteria:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPhase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePreview = async () => {
    setPreviewLoading(true);
    toast.promise(previewCriteria({ ...activeCriteria, phase: selectedPhase }), {
      loading: 'Analyzing cohort impact...',
      success: (result) => {
        setPreview(result);
        setPreviewLoading(false);
        return 'Impact analysis complete';
      },
      error: () => {
        setPreviewLoading(false);
        return 'Failed to generate preview';
      }
    });
  };

  const handleSave = async () => {
    const dataToSave = { ...activeCriteria, phase: selectedPhase, is_active: true };
    const saveAction = activeCriteria.id 
      ? createCriteria({ ...dataToSave, id: undefined })
      : createCriteria(dataToSave);

    toast.promise(saveAction, {
      loading: 'Updating protocol thresholds...',
      success: () => {
        loadData();
        return 'Criteria updated successfully';
      },
      error: 'Failed to save criteria. Thresholds may be locked by issued certificates.'
    });
  };

  const updateField = (field: keyof CertificationCriteria, value: number | string | boolean) => {
    setActiveCriteria(prev => ({ ...prev, [field]: value }));
  };

  if (loading && criteriaList.length === 0) {
      return (
          <div className="flex items-center justify-center min-h-[60vh]">
              <div className="flex flex-col items-center gap-4">
                  <LoadingSpinner />
                  <p className="text-[var(--text-dim)] animate-pulse uppercase text-xs font-black tracking-widest">Loading Configuration...</p>
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
            Certification <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">Criteria</span>
          </h1>
          <p className="text-[var(--text-dim)] font-bold uppercase text-[10px] tracking-[0.2em]">Protocol thresholds for career progression</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-[var(--border-color)] overflow-x-auto pb-px">
        {(['PHASE_1', 'PHASE_2', 'PPO'] as const).map(phase => (
          <button
            key={phase}
            onClick={() => setSelectedPhase(phase)}
            className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${
              selectedPhase === phase 
              ? 'border-purple-500 text-purple-400 bg-purple-500/5' 
              : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text-main)]'
            }`}
          >
            {phase.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card padding="none" className="border-[var(--border-color)] bg-[var(--card-bg)] backdrop-blur-xl">
            <div className="p-6 border-b border-[var(--border-color)] flex items-center gap-2 bg-white/[0.02]">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Settings2 size={18} className="text-purple-400" />
                </div>
                <h3 className="font-heading font-bold text-[var(--text-main)] uppercase tracking-tight">Threshold Settings</h3>
            </div>
            
            <div className="p-8 space-y-10">
              {[
                { label: 'Minimum Overall Score', field: 'min_overall_score', icon: <Target size={16} /> },
                { label: 'Productivity Floor', field: 'min_productivity_score', icon: <Zap size={16} /> },
                { label: 'Quality Floor', field: 'min_quality_score', icon: <Gem size={16} /> },
                { label: 'Engagement Floor', field: 'min_engagement_score', icon: <Users size={16} /> },
                { label: 'Attendance Floor', field: 'min_attendance_pct', icon: <Calendar size={16} /> },
              ].map(item => (
                <div key={item.field} className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] flex items-center gap-2">
                      <span className="text-purple-400">{item.icon}</span> {item.label}
                    </label>
                    <span className="text-purple-400 font-heading font-black text-xl tracking-tighter">
                      {activeCriteria[item.field as keyof CertificationCriteria] ?? 0}%
                    </span>
                  </div>
                  <div className="relative group">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={activeCriteria[item.field as keyof CertificationCriteria] as number ?? 0}
                        onChange={(e) => updateField(item.field as keyof CertificationCriteria, parseInt(e.target.value))}
                        className={`w-full h-2 bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-full appearance-none transition-all ${user?.role === 'ADMIN' ? 'cursor-pointer accent-purple-500 hover:accent-purple-400' : 'cursor-not-allowed opacity-50 accent-gray-500'}`}
                        disabled={user?.role !== 'ADMIN'}
                      />
                  </div>
                </div>
              ))}

              <div className="space-y-3 pt-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] ml-1">Protocol Justification</label>
                <textarea
                  value={activeCriteria.description ?? ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Provide rationale for these threshold adjustments..."
                  className={`w-full bg-white/5 border border-[var(--border-color)] rounded-2xl p-4 text-sm text-[var(--text-main)] outline-none h-32 transition-all placeholder:text-[var(--text-muted)] ${user?.role === 'ADMIN' ? 'focus:ring-2 focus:ring-purple-500/40' : 'cursor-not-allowed opacity-50'}`}
                  disabled={user?.role !== 'ADMIN'}
                />
              </div>
            </div>

            <div className="p-6 border-t border-[var(--border-color)] flex gap-4 bg-white/[0.01]">
              {user?.role === 'ADMIN' && (
                <Button onClick={handleSave} className="flex-1 btn-primary-premium flex items-center justify-center gap-2">
                    <Save size={16} />
                    <span>Commit Changes</span>
                </Button>
              )}
              <Button variant="outline" onClick={handlePreview} className="flex-1 flex items-center justify-center gap-2">
                  <Eye size={16} />
                  <span>Run Preview</span>
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <Card padding="none" className="border-purple-500/20 bg-purple-500/[0.02] relative overflow-hidden group">
            <div className="p-6 border-b border-purple-500/10 flex items-center gap-2">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                    <BarChart3 size={18} className="text-purple-400" />
                </div>
                <h3 className="font-heading font-bold text-[var(--text-main)] uppercase tracking-tight text-xs">Cohort Impact Analysis</h3>
            </div>
            
            <div className="p-6">
                {previewLoading ? (
                <div className="py-12 flex justify-center"><LoadingSpinner /></div>
                ) : preview ? (
                <div className="space-y-6 animate-scale-in">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 text-center">
                            <div className="text-3xl font-heading font-black text-emerald-400 tracking-tighter">{preview.would_pass}</div>
                            <div className="text-[9px] text-emerald-400/60 uppercase font-black tracking-widest mt-1">Would Pass</div>
                        </div>
                        <div className="bg-red-500/10 p-5 rounded-2xl border border-red-500/20 text-center">
                            <div className="text-3xl font-heading font-black text-red-400 tracking-tighter">{preview.would_fail}</div>
                            <div className="text-[9px] text-red-400/60 uppercase font-black tracking-widest mt-1">Would Fail</div>
                        </div>
                    </div>
                    
                    <div className="bg-[var(--card-bg)] p-5 rounded-2xl border border-[var(--border-color)]">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Impact Delta</span>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${preview.delta >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {preview.delta > 0 ? '+' : ''}{preview.delta} COHORT SIZE
                            </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-dim)] leading-relaxed italic">
                            Adjusting to these protocols would result in {Math.abs(preview.delta)} {preview.delta >= 0 ? 'more' : 'fewer'} interns meeting gate requirements.
                        </p>
                    </div>
                </div>
                ) : (
                <div className="py-12 text-center text-[var(--text-muted)] italic text-sm flex flex-col items-center gap-3">
                    <Activity size={32} className="opacity-20" />
                    <p className="text-xs font-black uppercase tracking-tighter">Run preview to visualize cohort impact</p>
                </div>
                )}
            </div>
          </Card>

          <Card padding="none" className="border-[var(--border-color)] bg-[var(--card-bg)]">
             <div className="p-6 border-b border-[var(--border-color)] flex items-center gap-2">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <Clock size={18} className="text-indigo-400" />
                </div>
                <h3 className="font-heading font-bold text-[var(--text-main)] uppercase tracking-tight text-xs">Version Control History</h3>
            </div>
            <div className="p-6 space-y-6">
              {criteriaList.filter(c => c.phase === selectedPhase && !c.is_active).slice(0, 3).map(hist => (
                <div key={hist.id} className="group relative pl-6 py-1 border-l-2 border-[var(--border-color)] hover:border-purple-500 transition-colors">
                  <div className="absolute top-2 -left-[5px] w-2 h-2 rounded-full bg-[var(--border-color)] group-hover:bg-purple-500 transition-colors" />
                  <div className="text-[11px] text-[var(--text-main)] font-bold uppercase tracking-tight">Threshold: {hist.min_overall_score}%</div>
                  <div className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest mt-1">Deactivated {new Date(hist.created_at).toLocaleDateString()}</div>
                </div>
              ))}
              {criteriaList.filter(c => c.phase === selectedPhase && !c.is_active).length === 0 && (
                <div className="py-4 text-center text-[var(--text-muted)] italic text-xs uppercase font-black tracking-widest flex flex-col items-center gap-2">
                    <AlertCircle size={20} className="opacity-20" />
                    <span>No legacy versions</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CriteriaConfigurationPage;
