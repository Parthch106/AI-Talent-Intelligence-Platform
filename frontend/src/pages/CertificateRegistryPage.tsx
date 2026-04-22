import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { Card, Button, Badge, StatsCard, LoadingSpinner, Modal } from '../components/common';
import { Award, ShieldCheck, ShieldAlert, Search, RefreshCw, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Certificate {
  id: number;
  intern_name: string;
  intern_email: string;
  phase: string;
  issued_at: string;
  unique_cert_id: string;
  is_revoked: boolean;
  revoke_reason: string;
  revoked_at: string | null;
}

const PHASE_LABEL: Record<string, string> = {
  PHASE_1: 'PHASE 1 — STANDARD',
  PHASE_2: 'PHASE 2 — STIPEND',
  PPO:     'PPO CERTIFICATE',
};

const CertificateRegistryPage: React.FC = () => {
  const [certs,   setCerts]   = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeModal, setRevokeModal] = useState<{ id: number; name: string } | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [acting,  setActing]  = useState(false);
  const [filter,  setFilter]  = useState<'all' | 'active' | 'revoked'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/certificates/');
      setCerts(res.data.results ?? res.data);
    } catch (err) {
      console.error("Failed to load certificates", err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRevoke = async () => {
    if (!revokeModal || !revokeReason.trim()) return;
    setActing(true);
    toast.promise(api.post(`/api/analytics/admin/certificates/${revokeModal.id}/revoke/`, { reason: revokeReason }), {
      loading: 'Authorizing revocation protocol...',
      success: () => {
        setRevokeModal(null);
        setRevokeReason('');
        load();
        setActing(false);
        return 'Certificate successfully revoked';
      },
      error: () => {
        setActing(false);
        return 'Revocation protocol failed';
      }
    });
  };

  const handleReinstate = async (id: number) => {
    setActing(true);
    toast.promise(api.post(`/api/analytics/admin/certificates/${id}/reinstate/`, { reason: 'Reinstated via admin UI' }), {
      loading: 'Syncing reinstatement data...',
      success: () => {
        load();
        setActing(false);
        return 'Certificate successfully reinstated';
      },
      error: () => {
        setActing(false);
        return 'Reinstatement failed';
      }
    });
  };

  const filtered = certs.filter(c =>
    filter === 'active'  ? !c.is_revoked :
    filter === 'revoked' ? c.is_revoked  : true
  );

  const verifyUrl = (uuid: string) =>
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/analytics/verify/${uuid}/`;

  const stats = [
    { title: 'Total Issued', value: certs.length, icon: <Award size={24} />, gradient: 'from-purple-500 to-indigo-500' },
    { title: 'Active Valid', value: certs.filter(c => !c.is_revoked).length, icon: <ShieldCheck size={24} />, gradient: 'from-emerald-500 to-teal-500' },
    { title: 'Revoked', value: certs.filter(c => c.is_revoked).length, icon: <ShieldAlert size={24} />, gradient: 'from-red-500 to-orange-500' },
  ];

  if (loading && certs.length === 0) {
      return (
          <div className="flex items-center justify-center min-h-[60vh]">
              <div className="flex flex-col items-center gap-4">
                  <LoadingSpinner />
                  <p className="text-[var(--text-dim)] animate-pulse uppercase text-xs font-black tracking-widest">Accessing Registry...</p>
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
            Certificate <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Registry</span>
          </h1>
          <p className="text-[var(--text-dim)] font-bold uppercase text-[10px] tracking-[0.2em]">Verified credentials management system</p>
        </div>
        <div className="flex items-center gap-3">
             <Button onClick={load} variant="outline" className="flex items-center gap-2 group">
                <RefreshCw size={16} className={`${acting ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
                <span>Refresh</span>
            </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map((stat, i) => (
          <StatsCard key={i} {...stat} />
        ))}
      </div>

      <Card noPadding className="border-[var(--border-color)] bg-[var(--card-bg)] backdrop-blur-xl overflow-hidden">
        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-white/[0.02]">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <ShieldCheck size={18} className="text-emerald-400" />
                </div>
                <h3 className="font-heading font-bold text-[var(--text-main)] uppercase tracking-tight">Verified Credential Index</h3>
            </div>
          <div className="flex gap-2">
            {(['all', 'active', 'revoked'] as const).map(f => (
              <button key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === f 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                  : 'text-[var(--text-dim)] hover:bg-white/5'
                }`}
              >
                {f === 'all' ? 'All' : f === 'active' ? '✓ Active' : '✗ Revoked'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase text-[var(--text-muted)] font-black tracking-widest bg-white/[0.01]">
                <th className="px-8 py-5">Intern</th>
                <th className="px-8 py-5">Phase / Level</th>
                <th className="px-8 py-5">Issue Date</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Verification & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filtered.map((cert) => (
                <tr key={cert.id} className={`transition-colors group ${cert.is_revoked ? 'bg-red-500/[0.02] hover:bg-red-500/[0.04]' : 'hover:bg-emerald-500/[0.02]'}`}>
                  <td className="px-8 py-5">
                    <div className="font-bold text-[var(--text-main)] uppercase tracking-tight">{cert.intern_name}</div>
                    <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">{cert.intern_email}</div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-[10px] font-black tracking-widest">
                        {PHASE_LABEL[cert.phase] ?? cert.phase}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-[var(--text-dim)] font-medium">
                    {new Date(cert.issued_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }).toUpperCase()}
                  </td>
                  <td className="px-8 py-5">
                    <Badge variant={cert.is_revoked ? 'danger' : 'success'} withDot pulse={!cert.is_revoked}>
                      {cert.is_revoked ? 'REVOKED' : 'VALID'}
                    </Badge>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={verifyUrl(cert.unique_cert_id)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        <ExternalLink size={12} />
                        Verify
                      </a>

                      {!cert.is_revoked ? (
                        <Button
                          size="sm"
                          onClick={() => setRevokeModal({ id: cert.id, name: cert.intern_name })}
                          className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border-red-500/20"
                        >
                          Revoke
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleReinstate(cert.id)}
                          className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-600 hover:text-white border-emerald-500/20"
                        >
                          Reinstate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <Search size={40} className="text-[var(--text-muted)] opacity-20" />
                        <p className="text-[var(--text-muted)] font-black uppercase text-xs tracking-widest">No certificates found matching criteria</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={!!revokeModal}
        onClose={() => { setRevokeModal(null); setRevokeReason(''); }}
        title="Revoke Certificate"
        maxWidth="md"
      >
        <div className="space-y-6">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4">
                <ShieldAlert className="text-red-400 shrink-0" size={24} />
                <div>
                    <p className="text-sm font-bold text-red-200 mb-1">DANGER ZONE: Critical Action Required</p>
                    <p className="text-[var(--text-dim)] text-xs">
                        Revoking the certificate for <strong className="text-[var(--text-main)] uppercase">{revokeModal?.name}</strong>.
                        This will be immediately visible on the public verification page and cannot be undone without manual reinstatement.
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Reason for Revocation</label>
                <textarea
                    placeholder="Enter reason for revocation (required)..."
                    value={revokeReason}
                    onChange={e => setRevokeReason(e.target.value)}
                    rows={4}
                    className="w-full bg-white/5 border border-[var(--border-color)] rounded-2xl p-4 text-[var(--text-main)] text-sm focus:ring-2 focus:ring-red-500/40 outline-none transition-all placeholder:text-[var(--text-muted)]"
                />
            </div>

            <div className="flex gap-3 pt-2">
                <Button
                    onClick={handleRevoke}
                    disabled={!revokeReason.trim() || acting}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white border-none"
                >
                    {acting ? 'Processing...' : 'Confirm Revocation'}
                </Button>
                <Button
                    onClick={() => { setRevokeModal(null); setRevokeReason(''); }}
                    variant="outline"
                    className="flex-1"
                >
                    Cancel
                </Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default CertificateRegistryPage;
