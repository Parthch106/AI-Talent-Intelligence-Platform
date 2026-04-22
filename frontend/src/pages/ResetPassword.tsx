import React, { useState } from 'react';
import api from '../api/axios';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const ResetPassword: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const resetToken = location.state?.reset_token;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!resetToken) {
            toast.error('Security token missing. Please start over.');
            navigate('/auth/forgot-password');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            await api.post('/accounts/auth/password-reset/confirm/', { 
                reset_token: resetToken,
                new_password: password 
            });
            toast.success('Core credentials updated successfully');
            navigate('/auth/login');
        } catch (err) {
            setIsLoading(false);
            const apiError = err as { response?: { data?: { error?: string } } };
            toast.error(apiError.response?.data?.error || 'Failed to update credentials');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[var(--bg-color)] transition-colors duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/[0.05] via-transparent to-blue-600/[0.05] dark:from-slate-900 dark:via-purple-900 dark:to-slate-900"></div>
            
            <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 rounded-2xl blur-lg opacity-30"></div>
                
                <div className="relative glass-card p-8 rounded-2xl border border-[var(--border-color)] backdrop-blur-xl bg-[var(--card-bg)]">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 mb-4 shadow-lg shadow-purple-500/30">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-[var(--text-main)]">New Credentials</h1>
                        <p className="text-[var(--text-dim)] mt-2">Establish your new secure access credentials</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2 group-focus-within:text-purple-400">
                                New Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300"
                                placeholder="••••••••"
                                required
                                minLength={8}
                            />
                        </div>

                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2 group-focus-within:text-purple-400">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all duration-500 shadow-lg shadow-purple-500/30"
                        >
                            {isLoading ? 'Updating...' : 'Commit New Credentials'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
