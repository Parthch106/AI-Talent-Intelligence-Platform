import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Card, Badge, LoadingSpinner } from '../components/common';

interface VerificationData {
  valid: boolean;
  is_revoked: boolean;
  unique_id: string;
  intern_name: string;
  intern_email: string;
  phase: string;
  phase_display: string;
  issued_at: string;
  revoked_at?: string;
  revoke_reason?: string;
  scores: Record<string, number>;
  criteria: Record<string, number>;
  overall_score: number;
}

const PublicVerifyPage: React.FC = () => {
  const { certId } = useParams<{ certId: string }>();
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verify = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
        const res = await axios.get(`${apiUrl}/analytics/verify/${certId}/`);
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Certificate verification failed.');
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [certId]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-6">❌</div>
      <h1 className="text-3xl font-bold text-white mb-2">Invalid Certificate</h1>
      <p className="text-gray-500 max-w-md">{error || 'This certificate could not be found or has been removed from our registry.'}</p>
      <Link to="/" className="mt-8 text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
        Go to AI Talent Intelligence Platform →
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-gray-100 font-sans selection:bg-indigo-500/30">
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 lg:py-24">
        {/* Header */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-widest uppercase mb-6">
            Official Verification Portal
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent">
            Certificate Validation
          </h1>
          <p className="text-gray-500 text-lg">Secure digital credential verification powered by AI Talent Intelligence.</p>
        </div>

        {/* Main Verification Card */}
        <Card className="overflow-hidden border-gray-800 bg-gray-900/40 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-700">
          {/* Status Banner */}
          <div className={`py-6 px-8 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-gray-800 ${data.valid ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}>
            <div className="flex items-center gap-5">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-2xl ${data.valid ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-rose-500/20'}`}>
                {data.valid ? '✓' : '!'}
              </div>
              <div>
                <div className={`text-sm font-bold uppercase tracking-widest ${data.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {data.valid ? 'Verified Authenticity' : 'Certificate Revoked'}
                </div>
                <div className="text-2xl font-black text-white mt-0.5">
                  {data.valid ? 'Status: Active' : 'Status: Revoked'}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-gray-500 uppercase font-bold tracking-tighter mb-1">Unique Certificate ID</div>
              <div className="font-mono text-sm text-gray-300 bg-black/40 px-3 py-1.5 rounded-lg border border-gray-800">
                {data.unique_id}
              </div>
            </div>
          </div>

          <div className="p-8 md:p-12 grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Left Column: Holder Info */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Credential Holder</h4>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold border border-white/10">
                    {data.intern_name[0]}
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white leading-tight">{data.intern_name}</div>
                    <div className="text-sm text-gray-500">{data.intern_email}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Certification Details</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-gray-800 pb-2">
                    <span className="text-sm text-gray-400">Award Type</span>
                    <span className="text-sm font-bold text-white">{data.phase_display}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-gray-800 pb-2">
                    <span className="text-sm text-gray-400">Issue Date</span>
                    <span className="text-sm font-bold text-white">{data.issued_at}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-gray-800 pb-2">
                    <span className="text-sm text-gray-400">Authority</span>
                    <span className="text-sm font-bold text-white italic">AI Talent Platform</span>
                  </div>
                </div>
              </div>

              {!data.valid && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                  <h5 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Revocation Notice</h5>
                  <p className="text-sm text-rose-200/80 leading-relaxed italic">
                    "{data.revoke_reason || 'This credential was revoked by an authorized administrator.'}"
                  </p>
                  <div className="text-[10px] text-rose-400/50 uppercase font-bold mt-2">
                    Revoked on {data.revoked_at}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Performance Snapshot */}
            <div className="lg:col-span-3 space-y-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Performance Snapshot</h4>
                  <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    EXCEEDS CRITERIA
                  </div>
                </div>
                
                {/* Big Score Dial */}
                <div className="bg-black/20 rounded-3xl p-8 border border-gray-800/50 mb-8 flex items-center justify-around">
                  <div className="text-center">
                    <div className="text-5xl font-black text-white mb-1">{Math.round(data.overall_score)}%</div>
                    <div className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Composite Score</div>
                  </div>
                  <div className="h-16 w-px bg-gray-800" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-400 mb-1">{data.scores.productivity_score}%</div>
                    <div className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Productivity</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(data.scores).map(([key, value]) => {
                    if (key === 'overall_score' || key === 'productivity_score') return null;
                    const label = key.replace('_', ' ').replace('pct', '%');
                    return (
                      <div key={key} className="p-4 rounded-2xl bg-gray-800/20 border border-gray-800 hover:border-gray-700 transition-colors">
                        <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">{label}</div>
                        <div className="text-lg font-bold text-white">{typeof value === 'number' ? `${Math.round(value)}%` : value}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                <p className="text-xs text-indigo-300/70 leading-relaxed">
                  <span className="font-bold text-indigo-300 uppercase mr-2">Policy Notice:</span>
                  This digital certificate is a permanent record of achievement. It is cryptographically linked to the intern's immutable performance history. Any alteration of this page or the associated PDF file invalidates the credential.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-16 text-center space-y-6">
          <div className="flex items-center justify-center gap-8 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
             <div className="text-xl font-bold text-white tracking-tighter">AI TALENT INTELLIGENCE</div>
             <div className="h-4 w-px bg-gray-700" />
             <div className="text-sm font-medium text-gray-400 uppercase tracking-[0.2em]">Verified Secure</div>
          </div>
          <p className="text-gray-600 text-sm max-w-lg mx-auto">
            Authorized for public display. If you are the holder and believe there is an error, please contact the program administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicVerifyPage;
