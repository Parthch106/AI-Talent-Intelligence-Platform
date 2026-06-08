import React, { useEffect, useState, useCallback } from 'react';
import { fetchStipends, approveStipend, disburseStipend, bulkExportStipends } from '../api/stipend';
import type { StipendRecord } from '../api/stipend';
import { Card, Button, Badge, StatsCard, LoadingSpinner } from '../components/common';
import { useAuth } from '../context/AuthContext';
import { Download, Clock, TrendingUp, CheckCircle2, AlertCircle, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';

const StipendManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [stipends, setStipends] = useState<StipendRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const loadStipends = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchStipends();
      setStipends(data);
    } catch (error) {
      console.error('Failed to load stipends:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStipends();
  }, [loadStipends]);

  const handleApprove = async (id: number) => {
    toast.promise(approveStipend(id), {
      loading: 'Approving disbursement...',
      success: () => {
        loadStipends();
        return 'Stipend approved successfully';
      },
      error: 'Failed to approve stipend'
    });
  };

  const handleDisburse = async (id: number) => {
    toast.promise(disburseStipend(id), {
      loading: 'Recording disbursement...',
      success: () => {
        loadStipends();
        return 'Disbursement recorded successfully';
      },
      error: 'Failed to record disbursement'
    });
  };

  const handleExport = async () => {
    toast.promise(bulkExportStipends(), {
      loading: 'Generating export file...',
      success: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stipends_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        return 'Registry exported to CSV';
      },
      error: 'Export failed'
    });
  };

  const filteredStipends = filterStatus === 'ALL' 
    ? stipends 
    : stipends.filter(s => s.status === filterStatus);

  const stats = [
    { title: 'Total Pending', value: stipends.filter(s => s.status === 'PENDING').length, icon: <Clock size={24} />, gradient: 'from-amber-500 to-orange-500' },
    { title: 'Total Approved', value: stipends.filter(s => s.status === 'APPROVED').length, icon: <CheckCircle2 size={24} />, gradient: 'from-purple-500 to-indigo-500' },
    { title: 'Disbursed This Month', value: stipends.filter(s => s.status === 'DISBURSED').length, icon: <TrendingUp size={24} />, gradient: 'from-emerald-500 to-teal-500' },
    { title: 'Total Budget', value: `₹${stipends.reduce((sum, s) => sum + parseFloat(s.amount), 0).toLocaleString()}`, icon: <DollarSign size={24} />, gradient: 'from-blue-500 to-cyan-500' },
  ];

  if (loading && stipends.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner />
          <p className="text-[var(--text-dim)] animate-pulse uppercase text-xs font-black tracking-widest">Loading records...</p>
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
            Stipend <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Management</span>
          </h1>
          <p className="text-[var(--text-dim)] font-bold uppercase text-[10px] tracking-[0.2em]">Review and approve monthly disbursements</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="flex items-center gap-2 group">
          <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
          <span>Export CSV</span>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <StatsCard key={i} {...stat} />
        ))}
      </div>

      <Card 
        className="overflow-hidden border-[var(--border-color)] bg-[var(--card-bg)] backdrop-blur-xl"
        padding="none"
      >
        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-white/[0.02]">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                    <TrendingUp size={18} className="text-purple-400" />
                </div>
                <h3 className="font-heading font-bold text-[var(--text-main)] uppercase tracking-tight">Disbursement Registry</h3>
            </div>
          <div className="flex gap-2">
            {['ALL', 'PENDING', 'APPROVED', 'DISBURSED', 'HELD'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterStatus === status 
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
                  : 'text-[var(--text-dim)] hover:bg-white/5'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase text-[var(--text-muted)] font-black tracking-widest bg-white/[0.01]">
                <th className="px-8 py-5">Intern</th>
                <th className="px-8 py-5">Month</th>
                <th className="px-8 py-5">Performance</th>
                <th className="px-8 py-5">Amount</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filteredStipends.map((stipend) => (
                <tr key={stipend.id} className="hover:bg-purple-500/[0.02] transition-colors group">
                  <td className="px-8 py-5">
                    <div className="font-bold text-[var(--text-main)] uppercase tracking-tight">{stipend.intern_name}</div>
                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">{stipend.intern_email}</div>
                  </td>
                  <td className="px-8 py-5 text-[var(--text-dim)] font-medium">
                    {new Date(stipend.month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }).toUpperCase()}
                  </td>
                  <td className="px-8 py-5">
                    {stipend.performance_score ? (
                      <div className="flex items-center gap-3">
                        <div className="w-16 bg-white/5 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${stipend.performance_score >= 80 ? 'bg-emerald-500' : stipend.performance_score >= 60 ? 'bg-purple-500' : 'bg-amber-500'}`}
                            style={{ width: `${stipend.performance_score}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-[var(--text-main)]">{stipend.performance_score}%</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-black text-[var(--text-muted)]">NO SCORE</span>
                    )}
                  </td>
                  <td className="px-8 py-5 font-black text-[var(--text-main)] text-base">
                    ₹{parseFloat(stipend.amount).toLocaleString()}
                  </td>
                  <td className="px-8 py-5">
                    <Badge 
                      variant={
                        stipend.status === 'DISBURSED' ? 'success' : 
                        stipend.status === 'APPROVED' ? 'purple' : 
                        stipend.status === 'PENDING' ? 'warning' : 'danger'
                      }
                      withDot
                    >
                      {stipend.status}
                    </Badge>
                  </td>
                  <td className="px-8 py-5 text-right">
                    {user?.role === 'ADMIN' && (
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        {stipend.status === 'PENDING' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleApprove(stipend.id)}
                            className="bg-purple-500/10 text-purple-400 hover:bg-purple-600 hover:text-white border-purple-500/20"
                          >
                            Approve
                          </Button>
                        )}
                        {stipend.status === 'APPROVED' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleDisburse(stipend.id)}
                            className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-600 hover:text-white border-emerald-500/20"
                          >
                            Mark Disbursed
                          </Button>
                        )}
                      </div>
                    )}
                    {user?.role === 'MANAGER' && (
                      <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest italic opacity-40">View Only</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredStipends.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <AlertCircle size={40} className="text-[var(--text-muted)] opacity-20" />
                        <p className="text-[var(--text-muted)] font-black uppercase text-xs tracking-widest">No disbursement records found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default StipendManagementPage;
