import React, { useEffect, useState, useCallback } from 'react';
import { fetchStipends, approveStipend, disburseStipend, bulkExportStipends } from '../api/stipend';
import type { StipendRecord } from '../api/stipend';
import { Card, Button, Badge, StatsCard, LoadingSpinner } from '../components/common';
import { useAuth } from '../context/AuthContext';

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
    try {
      await approveStipend(id);
      loadStipends();
    } catch (error) {
      alert('Failed to approve stipend');
    }
  };

  const handleDisburse = async (id: number) => {
    try {
      await disburseStipend(id);
      loadStipends();
    } catch (error) {
      alert('Failed to disburse stipend');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await bulkExportStipends();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stipends_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      alert('Export failed');
    }
  };

  const filteredStipends = filterStatus === 'ALL' 
    ? stipends 
    : stipends.filter(s => s.status === filterStatus);

  const stats = [
    { label: 'Total Pending', value: stipends.filter(s => s.status === 'PENDING').length, color: '#fbbf24' },
    { label: 'Total Approved', value: stipends.filter(s => s.status === 'APPROVED').length, color: '#818cf8' },
    { label: 'Disbursed This Month', value: stipends.filter(s => s.status === 'DISBURSED').length, color: '#34d399' },
    { label: 'Total Budget', value: `₹${stipends.reduce((sum, s) => sum + parseFloat(s.amount), 0).toLocaleString()}`, color: '#e5e7eb' },
  ];

  if (loading && stipends.length === 0) return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-100 tracking-tight">Stipend Management</h1>
          <p className="text-gray-400 mt-1">Review and approve monthly stipend disbursements for Phase 2 interns.</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
          <span>Export CSV</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <StatsCard key={i} {...stat} />
        ))}
      </div>

      <Card className="overflow-hidden border-gray-800 bg-gray-900/50 backdrop-blur-xl">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/30">
          <div className="flex gap-2">
            {['ALL', 'PENDING', 'APPROVED', 'DISBURSED', 'HELD'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === status 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                  : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500 font-bold bg-gray-800/20">
              <tr>
                <th className="px-6 py-4">Intern</th>
                <th className="px-6 py-4">Month</th>
                <th className="px-6 py-4">Performance</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredStipends.map((stipend) => (
                <tr key={stipend.id} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-200">{stipend.intern_name}</div>
                    <div className="text-xs text-gray-500">{stipend.intern_email}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    {new Date(stipend.month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    {stipend.performance_score ? (
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-gray-700 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500" 
                            style={{ width: `${stipend.performance_score}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono">{stipend.performance_score}%</span>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-gray-200">
                    ₹{parseFloat(stipend.amount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <Badge 
                      variant={
                        stipend.status === 'DISBURSED' ? 'success' : 
                        stipend.status === 'APPROVED' ? 'primary' : 
                        stipend.status === 'PENDING' ? 'warning' : 'danger'
                      }
                    >
                      {stipend.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {stipend.status === 'PENDING' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleApprove(stipend.id)}
                          className="bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white"
                        >
                          Approve
                        </Button>
                      )}
                      {stipend.status === 'APPROVED' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleDisburse(stipend.id)}
                          className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white"
                        >
                          Mark Disbursed
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStipends.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No records found for this criteria.
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
