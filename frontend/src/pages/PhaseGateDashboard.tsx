import React, { useEffect, useState, useCallback } from 'react';
import { fetchAllReportsV2 } from '../api/reports';
import { Card, Button, Badge, LoadingSpinner, StatsCard } from '../components/common';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

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

  if (loading) return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-100 tracking-tight">Phase Gate Dashboard</h1>
          <p className="text-gray-400 mt-1">Review and approve career progression for interns reaching major milestones.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard label="Awaiting Evaluation" value={interns.length} color="#fbbf24" />
        <StatsCard label="Phase 1 Gates" value={interns.filter(i => i.current_phase === 'PHASE_1').length} color="#818cf8" />
        <StatsCard label="Phase 2 Gates" value={interns.filter(i => i.current_phase === 'PHASE_2').length} color="#34d399" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {interns.map((intern) => (
          <Card key={intern.id} className="group overflow-hidden border-gray-800 bg-gray-900/40 hover:border-indigo-500/50 transition-all duration-500">
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-gray-100 group-hover:text-indigo-400 transition-colors">
                    {intern.user.full_name}
                  </h3>
                  <p className="text-xs text-gray-500">{intern.user.email}</p>
                </div>
                <Badge variant={intern.current_phase === 'PHASE_1' ? 'primary' : 'success'}>
                  {intern.current_phase.replace('_', ' ')}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Tenure</span>
                  <span className="text-gray-300 font-medium">{intern.months_active} Months</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Cumulative Score</span>
                  <span className={`font-bold ${intern.overall_score >= 75 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {intern.overall_score}%
                  </span>
                </div>
                <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${intern.overall_score >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ width: `${intern.overall_score}%` }}
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  className="w-full bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                  onClick={() => navigate(`/analytics/evaluations/new/${intern.user.id}`)}
                >
                  Conduct Gate Review
                </Button>
              </div>
            </div>
            
            <div className="bg-gray-800/50 px-5 py-3 border-t border-gray-800 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${intern.is_eligible ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">
                {intern.is_eligible ? 'Eligible for Promotion' : 'Time Milestone Not Reached'}
              </span>
            </div>
          </Card>
        ))}
        {interns.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="text-5xl opacity-20">🏝️</div>
            <p className="text-gray-500 italic">No interns currently awaiting gate evaluations.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhaseGateDashboard;
