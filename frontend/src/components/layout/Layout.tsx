import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout: React.FC = () => {
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
            </div>
        </div>
    );
};

export default Layout;
