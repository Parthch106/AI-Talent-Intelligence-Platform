import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';

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
  PHASE_1: 'Phase 1 — Standard',
  PHASE_2: 'Phase 2 — Stipend',
  PPO:     'PPO Certificate',
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
    try {
      await api.post(`/api/analytics/admin/certificates/${revokeModal.id}/revoke/`, { reason: revokeReason });
      setRevokeModal(null);
      setRevokeReason('');
      await load();
    } catch (err) {
      console.error("Revocation failed", err);
      alert("Revocation failed. Check console.");
    } finally { setActing(false); }
  };

  const handleReinstate = async (id: number) => {
    setActing(true);
    try {
      await api.post(`/api/analytics/admin/certificates/${id}/reinstate/`, { reason: 'Reinstated via admin UI' });
      await load();
    } catch (err) {
      console.error("Reinstatement failed", err);
      alert("Reinstatement failed. Check console.");
    } finally { setActing(false); }
  };

  const filtered = certs.filter(c =>
    filter === 'active'  ? !c.is_revoked :
    filter === 'revoked' ? c.is_revoked  : true
  );

  const verifyUrl = (uuid: string) =>
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/analytics/verify/${uuid}/`;

  return (
    <div style={{ padding: '28px 24px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#e5e7eb' }}>
        Certificate Registry
      </h1>
      <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: '13px' }}>
        {certs.length} certificate{certs.length !== 1 ? 's' : ''} issued •  {certs.filter(c => c.is_revoked).length} revoked
      </p>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {(['all', 'active', 'revoked'] as const).map(f => (
          <button key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? '#4f46e5' : 'rgba(255,255,255,0.04)',
              color: filter === f ? '#fff' : '#9ca3af',
              border: `1px solid ${filter === f ? '#4f46e5' : '#2a2a3e'}`,
              borderRadius: '8px', padding: '6px 16px',
              fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              textTransform: 'capitalize',
            }}>
            {f === 'all' ? 'All' : f === 'active' ? '✓ Active' : '✗ Revoked'}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#4b5563' }}>No certificates found.</div>
          ) : filtered.map(cert => (
            <div key={cert.id} style={{
              background: '#1e1e2e',
              border: `1px solid ${cert.is_revoked ? '#7f1d1d' : '#2a2a3e'}`,
              borderRadius: '10px', padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
              opacity: cert.is_revoked ? 0.8 : 1,
            }}>
              {/* Status dot */}
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                background: cert.is_revoked ? '#ef4444' : '#34d399',
              }} />

              {/* Intern info */}
              <div style={{ flex: 1, minWidth: '140px' }}>
                <div style={{ fontWeight: 700, color: '#e5e7eb', fontSize: '13px' }}>{cert.intern_name}</div>
                <div style={{ color: '#6b7280', fontSize: '11px' }}>{cert.intern_email}</div>
              </div>

              {/* Phase */}
              <div style={{
                background: 'rgba(99,102,241,0.1)', color: '#818cf8',
                borderRadius: '6px', padding: '3px 10px',
                fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap',
              }}>
                {PHASE_LABEL[cert.phase] ?? cert.phase}
              </div>

              {/* Issued date */}
              <div style={{ fontSize: '11px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                Issued {new Date(cert.issued_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
              </div>

              {/* Revoke reason (if revoked) */}
              {cert.is_revoked && (
                <div style={{
                  background: 'rgba(220,38,38,0.1)', color: '#fca5a5',
                  borderRadius: '6px', padding: '3px 10px',
                  fontSize: '11px', maxWidth: '200px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }} title={cert.revoke_reason}>
                  Revoked: {cert.revoke_reason}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                {/* Verify link */}
                <a
                  href={verifyUrl(cert.unique_cert_id)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: 'rgba(255,255,255,0.06)', color: '#9ca3af',
                    border: 'none', borderRadius: '6px',
                    padding: '4px 12px', fontSize: '11px', fontWeight: 700,
                    cursor: 'pointer', textDecoration: 'none',
                  }}
                >
                  🔗 Verify
                </a>

                {!cert.is_revoked ? (
                  <button
                    onClick={() => setRevokeModal({ id: cert.id, name: cert.intern_name })}
                    style={{
                      background: 'rgba(220,38,38,0.1)', color: '#f87171',
                      border: '1px solid #dc2626', borderRadius: '6px',
                      padding: '4px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                    }}>
                    Revoke
                  </button>
                ) : (
                  <button
                    onClick={() => handleReinstate(cert.id)}
                    disabled={acting}
                    style={{
                      background: 'rgba(52,211,153,0.1)', color: '#34d399',
                      border: '1px solid #059669', borderRadius: '6px',
                      padding: '4px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                    }}>
                    Reinstate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revoke modal */}
      {revokeModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#1e1e2e', border: '1px solid #dc2626',
            borderRadius: '14px', padding: '24px', width: '420px', maxWidth: '90vw',
          }}>
            <h3 style={{ margin: '0 0 8px', color: '#fca5a5', fontWeight: 800 }}>
              Revoke Certificate
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '12px', margin: '0 0 16px' }}>
              Revoking the certificate for <strong style={{ color: '#e5e7eb' }}>{revokeModal.name}</strong>.
              This will be immediately visible on the public verification page.
            </p>
            <textarea
              placeholder="Reason for revocation (required)…"
              value={revokeReason}
              onChange={e => setRevokeReason(e.target.value)}
              rows={3}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)',
                border: '1px solid #333', borderRadius: '8px',
                color: '#e5e7eb', padding: '10px', fontSize: '13px',
                resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={handleRevoke}
                disabled={!revokeReason.trim() || acting}
                style={{
                  background: '#dc2626', color: '#fff', border: 'none',
                  borderRadius: '8px', padding: '8px 20px',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  opacity: (!revokeReason.trim() || acting) ? 0.5 : 1,
                }}>
                {acting ? 'Revoking…' : 'Confirm Revoke'}
              </button>
              <button
                onClick={() => { setRevokeModal(null); setRevokeReason(''); }}
                style={{
                  background: 'transparent', color: '#9ca3af',
                  border: '1px solid #374151', borderRadius: '8px',
                  padding: '8px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateRegistryPage;
