import React, { useEffect, useState, useCallback } from 'react';
import { fetchOffers, createOffer, issueOffer } from '../api/offers';
import type { FullTimeOffer } from '../api/offers';
import { Card, Button, Badge, LoadingSpinner, StatsCard } from '../components/common';
import api from '../api/axios';

const FullTimeOfferBuilderPage: React.FC = () => {
  const [offers, setOffers] = useState<FullTimeOffer[]>([]);
  const [eligibleInterns, setEligibleInterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newOffer, setNewOffer] = useState<Partial<FullTimeOffer>>({
    recommended_role_title: 'Junior Software Engineer',
    recommended_department: 'Engineering',
    salary_band_min: '600000',
    salary_band_max: '800000',
    response_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [offersData, internsData] = await Promise.all([
        fetchOffers(),
        api.get('/analytics/evaluations/eligible-ppo/').then(r => r.data)
      ]);
      setOffers(offersData);
      setEligibleInterns(internsData);
    } catch (error) {
      console.error('Failed to load offer data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateOffer = async () => {
    try {
      await createOffer(newOffer);
      setShowModal(false);
      loadData();
    } catch (error) {
      alert('Failed to create offer');
    }
  };

  const handleIssue = async (id: number) => {
    try {
      await issueOffer(id);
      loadData();
    } catch (error) {
      alert('Failed to issue offer');
    }
  };

  if (loading && offers.length === 0) return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-1000">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-100 tracking-tight">PPO Offer Builder</h1>
          <p className="text-gray-400 mt-1">Convert top-performing Phase 2 interns to full-time employees with AI-assisted offers.</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-500/20">
          Create New Offer
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard label="Offers Issued" value={offers.filter(o => o.status === 'ISSUED').length} color="#818cf8" />
        <StatsCard label="Accepted" value={offers.filter(o => o.status === 'ACCEPTED').length} color="#34d399" />
        <StatsCard label="Eligible Interns" value={eligibleInterns.length} color="#fbbf24" />
        <StatsCard label="Conversion Rate" value={offers.length ? `${Math.round((offers.filter(o => o.status === 'ACCEPTED').length / offers.length) * 100)}%` : '0%'} color="#e5e7eb" />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {offers.map((offer) => (
          <Card key={offer.id} className="p-5 border-gray-800 bg-gray-900/40 hover:bg-gray-800/20 transition-all group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-xl border border-indigo-500/20">
                  👤
                </div>
                <div>
                  <h3 className="font-bold text-gray-100">{offer.intern_name}</h3>
                  <p className="text-xs text-gray-500">{offer.recommended_role_title} • {offer.recommended_department}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:flex items-center gap-8">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Salary Range</div>
                  <div className="text-xs font-mono text-gray-300">
                    ₹{(parseInt(offer.salary_band_min)/100000).toFixed(1)}L - {(parseInt(offer.salary_band_max)/100000).toFixed(1)}L
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Deadline</div>
                  <div className="text-xs text-gray-300">{new Date(offer.response_deadline).toLocaleDateString()}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Status</div>
                  <Badge variant={offer.status === 'ACCEPTED' ? 'success' : offer.status === 'ISSUED' ? 'primary' : 'warning'}>
                    {offer.status}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2">
                {offer.status === 'DRAFT' && (
                  <Button size="sm" onClick={() => handleIssue(offer.id)} className="bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white">
                    Issue Offer
                  </Button>
                )}
                <Button size="sm" variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  View Details
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {offers.length === 0 && (
          <div className="py-20 text-center text-gray-500 italic border-2 border-dashed border-gray-800 rounded-3xl">
            No offers created yet. Start by selecting an eligible intern.
          </div>
        )}
      </div>

      {/* Simplified Modal for creation */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-lg p-8 space-y-6 border-gray-700 bg-gray-900 shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white">✕</button>
            
            <h2 className="text-2xl font-bold text-gray-100">Create PPO Offer</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Select Intern</label>
                <select 
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white"
                  onChange={(e) => setNewOffer({...newOffer, intern_id: parseInt(e.target.value)})}
                >
                  <option value="">Choose an eligible intern...</option>
                  {eligibleInterns.map(i => (
                    <option key={i.id} value={i.id}>{i.full_name} (Score: {i.overall_score}%)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Role Title</label>
                  <input 
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white"
                    value={newOffer.recommended_role_title}
                    onChange={(e) => setNewOffer({...newOffer, recommended_role_title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Department</label>
                  <input 
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white"
                    value={newOffer.recommended_department}
                    onChange={(e) => setNewOffer({...newOffer, recommended_department: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Min Salary (Annual)</label>
                  <input 
                    type="number"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white"
                    value={newOffer.salary_band_min}
                    onChange={(e) => setNewOffer({...newOffer, salary_band_min: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Max Salary (Annual)</label>
                  <input 
                    type="number"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white"
                    value={newOffer.salary_band_max}
                    onChange={(e) => setNewOffer({...newOffer, salary_band_max: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <Button className="flex-1 bg-indigo-600" onClick={handleCreateOffer}>Generate Offer with AI</Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FullTimeOfferBuilderPage;
