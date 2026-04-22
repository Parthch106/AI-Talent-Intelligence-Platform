import React, { useEffect, useState, useCallback } from 'react';
import { fetchOffers, createOffer, issueOffer } from '../api/offers';
import type { FullTimeOffer } from '../api/offers';
import { Card, Button, Badge, LoadingSpinner, StatsCard } from '../components/common';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Briefcase, Send, CheckCircle2, GraduationCap, TrendingUp, User, Building2, IndianRupee, Calendar, X, Plus, Sparkles, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

const FullTimeOfferBuilderPage: React.FC = () => {
  const [offers, setOffers] = useState<FullTimeOffer[]>([]);
  const [eligibleInterns, setEligibleInterns] = useState<any[]>([]);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newOffer, setNewOffer] = useState<Partial<FullTimeOffer>>({
    recommended_role_title: '',
    recommended_department: '',
    salary_band_min: '600000',
    salary_band_max: '800000',
    response_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [departments, setDepartments] = useState<string[]>([]);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [offersData, internsData, deptsData, rolesData] = await Promise.all([
        fetchOffers(),
        api.get('/analytics/evaluations/eligible-ppo/').then(r => r.data),
        api.get('/accounts/departments/').then(r => r.data.departments),
        api.get('/analytics/job-roles/').then(r => r.data.job_roles)
      ]);
      setOffers(offersData);
      setEligibleInterns(internsData);
      setDepartments(deptsData);
      setAvailableRoles(rolesData);
    } catch (error) {
      console.error('Failed to load offer data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (newOffer.recommended_department) {
      const filtered = availableRoles.filter(r => r.department === newOffer.recommended_department);
      setFilteredRoles(filtered);
    } else {
      setFilteredRoles([]);
    }
  }, [newOffer.recommended_department, availableRoles]);

  const handleCreateOffer = async () => {
    toast.promise(createOffer(newOffer), {
      loading: 'Building formal offer...',
      success: () => {
        setShowModal(false);
        loadData();
        return 'Offer generated successfully';
      },
      error: 'Failed to create offer'
    });
  };

  const handleIssue = async (id: number) => {
    toast.promise(issueOffer(id), {
      loading: 'Issuing legal documentation...',
      success: () => {
        loadData();
        return 'Offer issued to candidate';
      },
      error: 'Failed to issue offer'
    });
  };

  if (loading && offers.length === 0) {
      return (
          <div className="flex items-center justify-center min-h-[60vh]">
              <div className="flex flex-col items-center gap-4">
                  <LoadingSpinner />
                  <p className="text-[var(--text-dim)] animate-pulse uppercase text-xs font-black tracking-widest">Architecting Career Paths...</p>
              </div>
          </div>
      );
  }

  const stats = [
    { title: 'Offers Issued', value: offers.filter(o => o.status === 'ISSUED').length, icon: <Send size={24} />, gradient: 'from-indigo-500 to-purple-600' },
    { title: 'Accepted', value: offers.filter(o => o.status === 'ACCEPTED').length, icon: <CheckCircle2 size={24} />, gradient: 'from-emerald-500 to-teal-600' },
    { title: 'Eligible Interns', value: eligibleInterns.length, icon: <GraduationCap size={24} />, gradient: 'from-amber-500 to-orange-600' },
    { title: 'Conversion Rate', value: offers.length ? `${Math.round((offers.filter(o => o.status === 'ACCEPTED').length / offers.length) * 100)}%` : '0%', icon: <TrendingUp size={24} />, gradient: 'from-blue-500 to-cyan-600' },
  ];

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-heading font-black tracking-tighter text-[var(--text-main)] mb-2 uppercase">
            PPO Offer <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Builder</span>
          </h1>
          <p className="text-[var(--text-dim)] font-bold uppercase text-[10px] tracking-[0.2em]">Automated talent conversion and career architecting</p>
        </div>
        {user?.role === 'ADMIN' && (
          <Button onClick={() => setShowModal(true)} className="btn-primary-premium flex items-center gap-2 group">
            <Plus size={18} className="group-hover:rotate-90 transition-transform" />
            <span>Initialize Offer</span>
          </Button>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <StatsCard key={i} {...stat} />
        ))}
      </div>

      {/* Offer List */}
      <div className="grid grid-cols-1 gap-6">
        {offers.map((offer) => (
          <Card key={offer.id} noPadding className="group border-[var(--border-color)] bg-[var(--card-bg)] hover:border-blue-500/50 transition-all duration-500 backdrop-blur-xl relative overflow-hidden">
            <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="font-heading font-black text-xl text-[var(--text-main)] group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                    {offer.intern_name}
                  </h3>
                  <div className="flex items-center gap-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">
                    <span className="flex items-center gap-1"><Briefcase size={12} /> {offer.recommended_role_title}</span>
                    <span className="w-1 h-1 rounded-full bg-[var(--border-color)]" />
                    <span className="flex items-center gap-1"><Building2 size={12} /> {offer.recommended_department}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-8 flex-1 lg:max-w-2xl">
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1">
                      <IndianRupee size={10} /> Salary Band
                  </div>
                  <div className="text-sm font-heading font-bold text-[var(--text-main)] tracking-tight">
                    ₹{(parseInt(offer.salary_band_min)/100000).toFixed(1)}L - {(parseInt(offer.salary_band_max)/100000).toFixed(1)}L
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1">
                      <Calendar size={10} /> Deadline
                  </div>
                  <div className="text-sm font-heading font-bold text-[var(--text-main)] tracking-tight">
                      {new Date(offer.response_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Position Status</div>
                  <Badge className={offer.status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : offer.status === 'ISSUED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}>
                    {offer.status}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {offer.status === 'DRAFT' && user?.role === 'ADMIN' && (
                  <Button size="sm" onClick={() => handleIssue(offer.id)} className="bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all">
                    Issue Offer
                  </Button>
                )}
                {user?.role === 'MANAGER' && (
                  <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest italic opacity-40">Review Only</span>
                )}
                <Button size="sm" variant="outline" className="group/btn flex items-center gap-2">
                  <span>View Details</span>
                  <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {offers.length === 0 && (
          <div className="py-32 text-center flex flex-col items-center gap-4 border-2 border-dashed border-[var(--border-color)] rounded-[32px] bg-white/[0.01]">
             <div className="p-6 bg-white/[0.02] rounded-full border border-[var(--border-color)] mb-4">
                <Briefcase size={48} className="text-[var(--text-muted)] opacity-20" />
             </div>
             <p className="text-[var(--text-dim)] font-black uppercase text-xs tracking-widest italic">Inventory depleted • No active offers pending</p>
          </div>
        )}
      </div>

      {/* Offer Generation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in">
          <Card noPadding className="w-full max-w-2xl border-[var(--border-color)] bg-[var(--card-bg)] shadow-2xl animate-scale-in">
            <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-heading font-black text-[var(--text-main)] uppercase tracking-tight">Generate PPO Offer</h2>
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">AI-assisted talent conversion protocol</p>
                    </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/5 rounded-full text-[var(--text-muted)] hover:text-white transition-all">
                    <X size={20} />
                </button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] ml-1">Candidate Alignment</label>
                <select 
                  className="w-full bg-white/5 border border-[var(--border-color)] rounded-2xl p-4 text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-blue-500/40 transition-all appearance-none"
                  onChange={(e) => setNewOffer({...newOffer, intern_id: parseInt(e.target.value)})}
                >
                  <option value="" className="bg-[#1e1e2e]">Identify eligible candidate...</option>
                  {eligibleInterns.map(i => (
                    <option key={i.id} value={i.id} className="bg-[#1e1e2e]">{i.full_name} (Cumulative: {i.overall_score}%)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] ml-1">Target Department</label>
                  <select 
                    className="w-full bg-white/5 border border-[var(--border-color)] rounded-2xl p-4 text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-blue-500/40 transition-all appearance-none"
                    value={newOffer.recommended_department}
                    onChange={(e) => setNewOffer({...newOffer, recommended_department: e.target.value, recommended_role_title: ''})}
                  >
                    <option value="" className="bg-[#1e1e2e]">Select department...</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept} className="bg-[#1e1e2e]">{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] ml-1">Designated Role</label>
                  <div className="relative">
                    <select 
                      className="w-full bg-white/5 border border-[var(--border-color)] rounded-2xl p-4 text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-blue-500/40 transition-all appearance-none pr-12"
                      value={newOffer.recommended_role_title}
                      onChange={(e) => setNewOffer({...newOffer, recommended_role_title: e.target.value})}
                    >
                      <option value="" className="bg-[#1e1e2e]">Select designated role...</option>
                      {filteredRoles.map(role => (
                        <option key={role.id} value={role.role_title} className="bg-[#1e1e2e]">{role.role_title}</option>
                      ))}
                      <option value="CUSTOM" className="bg-[#1e1e2e]">-- Other (Custom) --</option>
                    </select>
                    {newOffer.recommended_role_title === 'CUSTOM' || (!filteredRoles.some(r => r.role_title === newOffer.recommended_role_title) && newOffer.recommended_role_title !== '') ? (
                      <input 
                        className="w-full bg-white/5 border border-[var(--border-color)] rounded-2xl p-4 text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-blue-500/40 transition-all mt-4 placeholder:text-[var(--text-muted)]"
                        placeholder="Enter custom role title..."
                        onChange={(e) => setNewOffer({...newOffer, recommended_role_title: e.target.value})}
                      />
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] ml-1">Salary Base (INR/PA)</label>
                  <input 
                    type="number"
                    className="w-full bg-white/5 border border-[var(--border-color)] rounded-2xl p-4 text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                    value={newOffer.salary_band_min}
                    onChange={(e) => setNewOffer({...newOffer, salary_band_min: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] ml-1">Salary Ceiling (INR/PA)</label>
                  <input 
                    type="number"
                    className="w-full bg-white/5 border border-[var(--border-color)] rounded-2xl p-4 text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                    value={newOffer.salary_band_max}
                    onChange={(e) => setNewOffer({...newOffer, salary_band_max: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--border-color)] flex gap-4 bg-white/[0.01]">
              <Button className="flex-1 btn-primary-premium flex items-center justify-center gap-2 py-4" onClick={handleCreateOffer}>
                  <Sparkles size={18} />
                  <span>Execute Conversion</span>
              </Button>
              <Button variant="outline" className="flex-1 py-4" onClick={() => setShowModal(false)}>Cancel Protocol</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FullTimeOfferBuilderPage;
