import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  Building2, 
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Fingerprint,
  Activity
} from 'lucide-react';
import api from '../api/axios';
import { Button, Card, LoadingSpinner } from '../components/common';
import { toast } from 'react-hot-toast';

const StaffPortal: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'MANAGER',
    department: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    toast.promise(api.post('/accounts/auth/staff/register/', formData), {
      loading: 'Initializing high-privileged security credentials...',
      success: (response) => {
        setSuccess(true);
        setTimeout(() => navigate('/auth/login'), 3000);
        return 'Staff access protocol successfully authorized';
      },
      error: (err: any) => {
        return err.response?.data?.email?.[0] || err.response?.data?.detail || 'Security protocol initialization failure';
      }
    });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-heading">
        <Card className="max-w-md w-full border-emerald-500/20 bg-emerald-500/[0.02] p-12 rounded-[40px] text-center space-y-8 backdrop-blur-3xl animate-scale-in">
          <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 shadow-[0_0_50px_-12px_rgba(16,185,129,0.3)]">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-[var(--text-main)] uppercase tracking-tighter">Access Granted</h2>
            <p className="text-[var(--text-dim)] font-bold uppercase text-[10px] tracking-[0.2em]">Credentials successfully synchronized</p>
          </div>
          <p className="text-[var(--text-muted)] text-sm leading-relaxed">
            Staff account initialized. Redirecting to the central authentication node in 3 seconds...
          </p>
          <div className="pt-4">
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
              <div className="bg-emerald-500 h-full animate-progress" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 font-heading relative overflow-hidden">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full animate-pulse delay-1000" />
      </div>

      <div className="max-w-xl w-full relative z-10 animate-fade-in">
        <div className="text-center mb-12 space-y-6">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">
            <ShieldCheck className="w-4 h-4" />
            Internal Staff Node
          </div>
          <h1 className="text-6xl font-black text-[var(--text-main)] tracking-tighter uppercase leading-none">
            Secure <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Onboarding</span>
          </h1>
          <p className="text-[var(--text-dim)] font-bold uppercase text-xs tracking-widest max-w-sm mx-auto">
            Authorized personnel only. Initialize manager or administrator credentials.
          </p>
        </div>

        <form 
          onSubmit={handleSubmit}
          className="bg-[#111]/40 backdrop-blur-3xl border border-white/5 p-12 rounded-[48px] shadow-3xl space-y-8 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
          
          {error && (
            <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-[20px] flex items-center gap-4 text-red-400 text-xs font-bold uppercase tracking-tight animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Designated Role</label>
              <div className="relative group">
                <select 
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-[var(--text-main)] text-sm appearance-none focus:outline-none focus:border-blue-500/50 transition-all hover:bg-white/[0.08]"
                >
                  <option value="MANAGER" className="bg-[#1a1a1a]">Technical Manager</option>
                  <option value="ADMIN" className="bg-[#1a1a1a]">System Administrator</option>
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Department Node</label>
              <div className="relative group">
                <input 
                  type="text" 
                  name="department"
                  placeholder="e.g. Engineering"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-[var(--text-main)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500/50 transition-all hover:bg-white/[0.08]"
                />
                <Building2 className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Identity Signature</label>
            <div className="relative group">
              <input 
                type="text" 
                name="full_name"
                placeholder="Full Name"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-[var(--text-main)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500/50 transition-all hover:bg-white/[0.08]"
              />
              <User className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Authentication Email</label>
            <div className="relative group">
              <input 
                type="email" 
                name="email"
                placeholder="staff.name@aims.tech"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-[var(--text-main)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500/50 transition-all hover:bg-white/[0.08]"
              />
              <Mail className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Access Token (Password)</label>
            <div className="relative group">
              <input 
                type="password" 
                name="password"
                placeholder="••••••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-[var(--text-main)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500/50 transition-all hover:bg-white/[0.08]"
              />
              <Lock className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full btn-primary-premium py-6 rounded-[24px] flex items-center justify-center gap-4 group text-lg"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Fingerprint size={22} className="group-hover:scale-110 transition-transform" />
                <span>Initialize Access</span>
                <Sparkles size={20} className="opacity-50 group-hover:rotate-12 transition-transform" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-12 flex items-center justify-center gap-6 text-[var(--text-muted)] opacity-50">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                <ShieldCheck size={14} />
                256-bit Encryption
            </div>
            <div className="w-1 h-1 rounded-full bg-[var(--border-color)]" />
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                <Activity size={14} />
                Real-time Logging
            </div>
        </div>
      </div>
    </div>
  );
};

export default StaffPortal;
