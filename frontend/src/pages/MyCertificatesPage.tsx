
import React, { useEffect, useState, useCallback } from 'react';
import { Award, Download, ExternalLink, ShieldCheck } from 'lucide-react';
import { Card, Button, Badge, LoadingSpinner } from '../components/common';
import api from '../api/axios';

interface CertificateRecord {
  id: number;
  unique_cert_id: string;
  cert_type: string;
  cert_type_display: string;
  issue_date: string;
  overall_score_at_issue: number;
  is_revoked: boolean;
}

const MyCertificatesPage: React.FC = () => {
  const [certs, setCerts] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // The viewset handles filtering by current user for INTERN role
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

  if (loading) return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-widest uppercase">
          Career Milestones
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight">My Professional <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Certifications</span></h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Every certificate issued here is cryptographically verified and linked to your performance history. Use these to showcase your achievements to future employers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {certs.map((cert) => (
          <Card key={cert.id} className={`overflow-hidden border-gray-800 bg-gray-900/40 backdrop-blur-xl group transition-all duration-500 ${cert.is_revoked ? 'opacity-60' : 'hover:border-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/10'}`}>
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-2xl ${cert.is_revoked ? 'bg-gray-800 text-gray-500' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/20'}`}>
                  <Award size={28} />
                </div>
                <Badge variant={cert.is_revoked ? 'danger' : 'success'}>
                  {cert.is_revoked ? 'REVOKED' : 'ACTIVE'}
                </Badge>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-1">{cert.cert_type_display}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                  <span className="uppercase tracking-widest">Issued on {new Date(cert.issue_date).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-6 py-4 border-y border-gray-800/50">
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter mb-1">Composite Score</div>
                  <div className="text-2xl font-black text-indigo-400">{cert.overall_score_at_issue}%</div>
                </div>
                <div className="h-8 w-px bg-gray-800" />
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter mb-1">Verification Status</div>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
                    <ShieldCheck size={14} />
                    Validated
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  className="flex-1 bg-white hover:bg-gray-100 text-black font-bold py-3"
                  onClick={() => window.open(`/verify/${cert.unique_cert_id}`, '_blank')}
                >
                  <ExternalLink size={16} className="mr-2" />
                  Public View
                </Button>
                {!cert.is_revoked && (
                  <Button 
                    variant="outline"
                    className="flex-1 border-gray-700 hover:border-gray-600 font-bold py-3"
                    onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/analytics/verify/${cert.unique_cert_id}/download/`, '_blank')}
                  >
                    <Download size={16} className="mr-2" />
                    Download PDF
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}

        {certs.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-6">
            <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto border border-gray-800">
               <Award size={40} className="text-gray-700" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-400">No Certificates Yet</h3>
              <p className="text-gray-600 max-w-xs mx-auto text-sm italic">Keep performing well! Certificates are issued automatically upon successful phase gate promotion.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCertificatesPage;
