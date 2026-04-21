import React, { useEffect, useState, useCallback } from 'react';
import { fetchCriteria, updateCriteria, createCriteria, previewCriteria } from '../api/criteria';
import type { CertificationCriteria, CriteriaPreview } from '../api/criteria';
import { Card, Button, Badge, LoadingSpinner } from '../components/common';

const CriteriaConfigurationPage: React.FC = () => {
  const [criteriaList, setCriteriaList] = useState<CertificationCriteria[]>([]);
  const [loading, setLoading] = useState(true);
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
    try {
      const result = await previewCriteria(activeCriteria);
      setPreview(result);
    } catch (error) {
      alert('Failed to generate preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (activeCriteria.id) {
        // Create new version as criteria are immutable once used
        await createCriteria({ ...activeCriteria, id: undefined, is_active: true });
      } else {
        await createCriteria({ ...activeCriteria, is_active: true });
      }
      alert('Criteria updated successfully');
      loadData();
    } catch (error) {
      alert('Failed to save criteria. Note: Criteria used in issued certificates cannot be edited directly; a new version must be created.');
    }
  };

  const updateField = (field: keyof CertificationCriteria, value: number | string | boolean) => {
    setActiveCriteria(prev => ({ ...prev, [field]: value }));
  };

  if (loading) return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-100 tracking-tight">Certification Criteria</h1>
          <p className="text-gray-400 mt-1">Configure performance thresholds required for phase progression and certification.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-800 pb-px">
        {(['PHASE_1', 'PHASE_2', 'PPO'] as const).map(phase => (
          <button
            key={phase}
            onClick={() => setSelectedPhase(phase)}
            className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
              selectedPhase === phase 
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' 
              : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {phase.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 space-y-6 border-gray-800 bg-gray-900/40 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-gray-200">Threshold Settings</h3>
            
            <div className="space-y-8">
              {[
                { label: 'Minimum Overall Score (%)', field: 'min_overall_score', icon: '🎯' },
                { label: 'Productivity Floor (%)', field: 'min_productivity_score', icon: '⚡' },
                { label: 'Quality Floor (%)', field: 'min_quality_score', icon: '💎' },
                { label: 'Engagement Floor (%)', field: 'min_engagement_score', icon: '🤝' },
                { label: 'Attendance Floor (%)', field: 'min_attendance_pct', icon: '📅' },
              ].map(item => (
                <div key={item.field} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                      <span>{item.icon}</span> {item.label}
                    </label>
                    <span className="text-indigo-400 font-mono font-bold text-lg">
                      {activeCriteria[item.field as keyof CertificationCriteria] ?? 0}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={activeCriteria[item.field as keyof CertificationCriteria] as number ?? 0}
                    onChange={(e) => updateField(item.field as keyof CertificationCriteria, parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
                  />
                </div>
              ))}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Description / Justification</label>
                <textarea
                  value={activeCriteria.description ?? ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Explain why these thresholds are being set..."
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl p-3 text-sm text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button onClick={handleSave} className="flex-1 shadow-lg shadow-indigo-500/20">Save Changes</Button>
              <Button variant="outline" onClick={handlePreview} className="flex-1">Live Preview</Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 border-gray-800 bg-indigo-600/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-1000">
              <span className="text-8xl">📊</span>
            </div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Cohort Impact Preview</h3>
            
            {previewLoading ? (
              <div className="py-12 flex justify-center"><LoadingSpinner /></div>
            ) : preview ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
                    <div className="text-2xl font-black text-emerald-400">{preview.would_pass}</div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Would Pass</div>
                  </div>
                  <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
                    <div className="text-2xl font-black text-rose-400">{preview.would_fail}</div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Would Fail</div>
                  </div>
                </div>
                
                <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-indigo-300 font-medium">Impact Delta</span>
                    <span className={`text-xs font-bold ${preview.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {preview.delta > 0 ? '+' : ''}{preview.delta} Interns
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-400/70 leading-relaxed">
                    Changing these criteria would result in {Math.abs(preview.delta)} fewer interns meeting the gate requirements compared to current settings.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500 italic text-sm">
                Click "Live Preview" to see how many interns would currently meet these thresholds.
              </div>
            )}
          </Card>

          <Card className="p-6 border-gray-800 bg-gray-900/40">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Criteria History</h3>
            <div className="space-y-4">
              {criteriaList.filter(c => c.phase === selectedPhase && !c.is_active).slice(0, 3).map(hist => (
                <div key={hist.id} className="text-xs border-l-2 border-gray-800 pl-3 py-1 space-y-1">
                  <div className="text-gray-300 font-medium">Score Floor: {hist.min_overall_score}%</div>
                  <div className="text-gray-500 italic">Deactivated on {new Date(hist.created_at).toLocaleDateString()}</div>
                </div>
              ))}
              {criteriaList.filter(c => c.phase === selectedPhase && !c.is_active).length === 0 && (
                <div className="text-xs text-gray-600">No previous versions.</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CriteriaConfigurationPage;
