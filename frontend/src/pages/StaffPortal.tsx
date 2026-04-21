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
  AlertCircle
} from 'lucide-react';
import api from '../api/axios';

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
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/accounts/auth/staff/register/', formData);
      if (response.status === 201) {
        setSuccess(true);
        setTimeout(() => navigate('/auth/login'), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.email?.[0] || err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#111] border border-green-500/20 p-12 rounded-3xl text-center space-y-6">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-3xl font-bold text-white">Staff Account Created</h2>
          <p className="text-gray-400">
            Registration successful. You are being redirected to the login page.
          </p>
          <div className="pt-4">
            <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
              <div className="bg-green-500 h-full animate-progress" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 font-sans">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-xl w-full relative z-10">
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-medium">
            <ShieldCheck className="w-4 h-4" />
            Internal Staff Portal
          </div>
          <h1 className="text-5xl font-extrabold text-white tracking-tight">
            Secure Onboarding
          </h1>
          <p className="text-gray-400 text-lg max-w-sm mx-auto">
            Authorized personnel only. Create your Manager or Admin credentials to access the V2 dashboard.
          </p>
        </div>

        <form 
          onSubmit={handleSubmit}
          className="bg-[#111]/80 backdrop-blur-xl border border-white/5 p-10 rounded-[2.5rem] shadow-2xl space-y-6"
        >
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Role</label>
              <div className="relative group">
                <select 
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl px-5 py-4 text-white appearance-none focus:outline-none focus:border-blue-500/50 transition-all hover:bg-[#222]"
                >
                  <option value="MANAGER">Technical Manager</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Department</label>
              <div className="relative group">
                <input 
                  type="text" 
                  name="department"
                  placeholder="e.g. Engineering"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl px-5 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-all hover:bg-[#222]"
                />
                <Building2 className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
            <div className="relative group">
              <input 
                type="text" 
                name="full_name"
                placeholder="Dr. Sarah Connor"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl px-5 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-all hover:bg-[#222]"
              />
              <User className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Staff Email</label>
            <div className="relative group">
              <input 
                type="email" 
                name="email"
                placeholder="staff.name@aims.tech"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl px-5 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-all hover:bg-[#222]"
              />
              <Mail className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Access Token (Password)</label>
            <div className="relative group">
              <input 
                type="password" 
                name="password"
                placeholder="••••••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl px-5 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-all hover:bg-[#222]"
              />
              <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold py-5 rounded-2xl hover:bg-gray-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Initialize Access
                <UserPlus className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-gray-600 text-sm">
          System generated access log will be created for this IP.
        </p>
      </div>
    </div>
  );
};

export default StaffPortal;
