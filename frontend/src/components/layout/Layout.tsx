import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout: React.FC = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {/* Floating Orbs */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float"></div>
                <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-float delay-1000"></div>
                <div className="absolute top-1/2 left-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-float delay-500"></div>

                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-slate-900/80"></div>
            </div>

            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div className="ml-64 relative z-10">
                <Header />
                <main className="p-6 md:p-8 lg:p-10">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
