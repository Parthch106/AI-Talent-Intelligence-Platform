import React, { useEffect, useState, useCallback } from 'react';
import { Card, Button, Badge, LoadingSpinner, StatsCard } from '../components/common';
import api from '../api/axios';

interface CertificateRecord {
  id: number;
  unique_cert_id: string;
  intern: number;
  intern_name: string;
  cert_type: string;
  cert_type_display: string;
  issue_date: string;
  certificate_file: string | null;
  overall_score_at_issue: number;
  is_revoked: boolean;
  revocation_reason: string;
}

const CertificateRegistryPage: React.FC = () => {
  const [certs, setCerts] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('ALL');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/admin/certificates/');
      setCerts(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (error) {
      console.error('Failed to load certificates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRevoke = async (id: number) => {
    const reason = window.prompt('Enter reason for revocation:');
    if (!reason) return;

    try {
      await api.patch(`/analytics/admin/certificates/${id}/revoke/`, { reason });
      loadData();
    } catch (error) {
      alert('Failed to revoke certificate');
    }
  };

  const filteredCerts = certs.filter(c => {
    const matchesSearch = c.intern_name.toLowerCase().includes(search.toLowerCase()) || 
                         c.unique_cert_id.includes(search);
    const matchesPhase = selectedPhase === 'ALL' || c.cert_type === selectedPhase;
    return matchesSearch && matchesPhase;
  });

  if (loading && certs.length === 0) return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-100 tracking-tight">Certificate Registry</h1>
          <p className="text-gray-400 mt-1">Manage and audit all career milestone certificates issued by the platform.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard label="Total Issued" value={certs.length} color="#818cf8" />
        <StatsCard label="Active" value={certs.filter(c => !c.is_revoked).length} color="#34d399" />
        <StatsCard label="Revoked" value={certs.filter(c => c.is_revoked).length} color="#f87171" />
        <StatsCard label="PPO Certificates" value={certs.filter(c => c.cert_type === 'PPO').length} color="#fbbf24" />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
        <div className="relative w-full md:w-96">
          <input 
            type="text" 
            placeholder="Search by intern name or ID..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['ALL', 'PHASE_1', 'PHASE_2', 'PPO'].map(p => (
            <button
              key={p}
              onClick={() => setSelectedPhase(p)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                selectedPhase === p 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {p.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Registry Table */}
      <Card className="overflow-hidden border-gray-800 bg-gray-900/40">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-800/50 border-b border-gray-800">
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Intern</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Phase</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Issue Date</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Score</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredCerts.map((cert) => (
              <tr key={cert.id} className="hover:bg-gray-800/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-200">{cert.intern_name}</div>
                  <div className="text-[10px] font-mono text-gray-500 truncate w-32">{cert.unique_cert_id}</div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={cert.cert_type === 'PPO' ? 'success' : 'primary'}>
                    {cert.cert_type_display}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm text-gray-400 font-mono">{cert.issue_date}</td>
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-indigo-400">{cert.overall_score_at_issue}%</span>
                </td>
                <td className="px-6 py-4">
                  {cert.is_revoked ? (
                    <div className="flex flex-col">
                       <Badge variant="danger">REVOKED</Badge>
                       <span className="text-[10px] text-gray-500 mt-1 italic truncate w-32">{cert.revocation_reason}</span>
                    </div>
                  ) : (
                    <Badge variant="success">VALID</Badge>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="px-3 py-1.5 h-auto text-xs"
                      onClick={() => window.open(`/verify/${cert.unique_cert_id}`, '_blank')}
                    >
                      View
                    </Button>
                    {!cert.is_revoked && (
                      <Button 
                        className="bg-rose-600 hover:bg-rose-500 px-3 py-1.5 h-auto text-xs"
                        onClick={() => handleRevoke(cert.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredCerts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">
                   No matching certificates found in the registry.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default CertificateRegistryPage;
