import React, { useState } from 'react';
import api from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        setIsLoading(true);

        const requestPromise = async () => {
            const response = await api.post('/accounts/auth/password-reset/request/', { 
                email
            });
            return response.data;
        };

        toast.promise(requestPromise(), {
            loading: 'Transmitting verification pulse...',
            success: () => {
                setIsLoading(false);
                navigate('/auth/verify-otp', { state: { email } });
                return 'Authentication node authorized. Check your email for OTP.';
            },
            error: (err) => {
                setIsLoading(false);
                const apiError = err as { response?: { data?: { error?: string } } };
                return apiError.response?.data?.error || 'Failed to initiate reset sequence';
            }
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[var(--bg-color)] transition-colors duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/[0.05] via-transparent to-blue-600/[0.05] dark:from-slate-900 dark:via-purple-900 dark:to-slate-900"></div>
            
            {/* Background Orbs */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
                
                <div className="relative glass-card p-8 rounded-2xl border border-[var(--border-color)] backdrop-blur-xl bg-[var(--card-bg)]">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 mb-4 shadow-lg shadow-purple-500/30">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-[var(--text-main)]">Recover Access</h1>
                        <p className="text-[var(--text-dim)] mt-2">Enter your email to receive a secure OTP</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="group">
                            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2 group-focus-within:text-purple-400">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300"
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all duration-500 shadow-lg shadow-purple-500/30"
                        >
                            {isLoading ? 'Processing...' : 'Send OTP Code'}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-[var(--text-dim)]">
                        Remembered your password?{' '}
                        <Link to="/auth/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors hover:underline">
                            Back to Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
