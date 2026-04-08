import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { FloatingAIChatbot } from '../common';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Layout: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        // Show profile completion reminder for interns with incomplete profiles
        if (user && user.role === 'INTERN' && user.is_profile_complete === false) {
            const toastShown = sessionStorage.getItem('profile_completion_toast_shown');
            if (!toastShown) {
                toast((t) => (
                    <div className="flex items-center gap-4 py-1">
                        <div className="flex-1">
                            <p className="font-bold text-sm text-purple-400 mb-0.5">🚀 Profile Incomplete</p>
                            <p className="text-[11px] text-slate-300 leading-tight">Welcome to the platform! Please fill in your basic details (Phone, University) to unlock all features.</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    toast.dismiss(t.id);
                                    navigate('/account/profile');
                                }}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-lg whitespace-nowrap"
                            >
                                Update Now
                            </button>
                        </div>
                    </div>
                ), {
                    duration: 8000,
                    position: 'top-right',
                    style: {
                        background: 'rgba(15, 12, 41, 0.95)',
                        color: '#fff',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        backdropFilter: 'blur(12px)',
                        padding: '12px 16px',
                        minWidth: '340px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)'
                    },
                });
                sessionStorage.setItem('profile_completion_toast_shown', 'true');
            }
        }
    }, [user, navigate]);

    return (
        <div className="min-h-screen bg-[var(--bg-color)] relative overflow-hidden font-sans selection:bg-purple-500/30 transition-colors duration-500">
            {/* Animated Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {/* Modern Ambient Glows - Subtle in light theme */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/[0.05] dark:bg-purple-600/10 blur-[120px] rounded-full animate-pulse transition-all"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/[0.05] dark:bg-blue-600/10 blur-[120px] rounded-full animate-pulse delay-700 transition-all"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-indigo-500/[0.01] dark:bg-indigo-500/[0.02] blur-[150px] rounded-full transition-all"></div>

                {/* Refined Grid Pattern - Responsive to theme */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(128,128,128,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(128,128,128,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
            </div>

            {/* Sidebar */}
            <Sidebar />

            {/* Header - now handles its own fixed positioning */}
            <Header />

            {/* Main Content - with top padding and transition */}
            <div className="ml-64 pt-16 relative z-10 transition-all duration-500">
                <main className="p-6 md:p-8 lg:p-10">
                    <Outlet />
                </main>
                <FloatingAIChatbot />
            </div>
        </div>
    );
};

export default Layout;
