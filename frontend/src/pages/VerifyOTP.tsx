import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const VerifyOTP: React.FC = () => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [timer, setTimer] = useState(60);
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email;

    useEffect(() => {
        if (!email) {
            navigate('/auth/forgot-password');
            return;
        }

        const countdown = setInterval(() => {
            setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(countdown);
    }, [email, navigate]);

    const handleChange = (element: HTMLInputElement, index: number) => {
        if (isNaN(Number(element.value))) return false;

        setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

        // Focus next input
        if (element.nextSibling && element.value !== '') {
            (element.nextSibling as HTMLInputElement).focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && !otp[index] && e.currentTarget.previousSibling) {
            (e.currentTarget.previousSibling as HTMLInputElement).focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            toast.error('Please enter the full 6-digit code');
            return;
        }

        setIsLoading(true);

        try {
            const response = await api.post('/accounts/auth/password-reset/verify/', { email, otp_code: otpCode });
            const { reset_token } = response.data;
            toast.success('OTP verified. Proceed to reset password.');
            navigate('/auth/reset-password', { state: { reset_token } });
        } catch (err) {
            setIsLoading(false);
            const apiError = err as { response?: { data?: { error?: string } } };
            toast.error(apiError.response?.data?.error || 'Verification failed');
        }
    };

    const handleResend = async () => {
        if (timer > 0) return;
        
        setIsLoading(true);
        try {
            await api.post('/accounts/auth/password-reset/request/', { email });
            toast.success('New OTP transmitted to your mailbox');
            setTimer(60);
        } catch (err) {
            toast.error('Resend sequence failed. Try again later.');
        } finally {
            setIsLoading(false);
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-[var(--text-main)]">Verify OTP</h1>
                        <p className="text-[var(--text-dim)] mt-2">Enter the 6-digit code sent to <span className="text-purple-400 font-medium">{email}</span></p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="flex justify-between gap-2">
                            {otp.map((data, index) => (
                                <input
                                    key={index}
                                    type="text"
                                    maxLength={1}
                                    value={data}
                                    onChange={(e) => handleChange(e.target, index)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-300"
                                />
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || otp.includes('')}
                            className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all duration-500 shadow-lg shadow-purple-500/30"
                        >
                            {isLoading ? 'Verifying...' : 'Authorize Sequence'}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-[var(--text-dim)] text-sm mb-2">Didn't receive the code?</p>
                        <button
                            onClick={handleResend}
                            disabled={timer > 0 || isLoading}
                            className={`text-sm font-bold uppercase tracking-widest ${timer > 0 ? 'text-slate-600' : 'text-purple-400 hover:text-purple-300'} transition-colors`}
                        >
                            {timer > 0 ? `Resend available in ${timer}s` : 'Resend OTP Code'}
                        </button>
                    </div>

                    <p className="mt-8 text-center text-[var(--text-dim)]">
                        <Link to="/auth/forgot-password" className="text-purple-400 hover:text-purple-300 font-medium transition-colors hover:underline">
                            Back to recovery request
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default VerifyOTP;
