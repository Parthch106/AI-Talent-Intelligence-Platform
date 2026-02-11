import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard, Users, FolderKanban, MessageSquare,
    FileText, Brain, Monitor, Settings, ChevronRight,
    Sparkles, LogOut, Zap
} from 'lucide-react';

interface NavItem {
    name: string;
    path: string;
    icon: React.ReactNode;
    roles?: string[];
    badge?: string;
}

const Sidebar: React.FC = () => {
    const location = useLocation();
    const { user, logout } = useAuth();

    const mainNavItems: NavItem[] = [
        { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
        { name: 'Interns', path: '/interns', icon: <Users size={20} />, badge: '12' },
        { name: 'Projects', path: '/projects', icon: <FolderKanban size={20} /> },
        { name: 'Feedback', path: '/feedback', icon: <MessageSquare size={20} /> },
        { name: 'Documents', path: '/documents', icon: <FileText size={20} /> },
    ];

    const adminNavItems: NavItem[] = [
        { name: 'Analysis', path: '/analysis', icon: <Brain size={20} />, roles: ['ADMIN', 'MANAGER'] },
        { name: 'Monitoring', path: '/monitoring', icon: <Monitor size={20} />, roles: ['ADMIN', 'MANAGER'] },
    ];

    const isActive = (path: string) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(path);
    };

    const filterByRole = (items: NavItem[]) => {
        if (!user) return [];
        return items.filter(item => {
            if (!item.roles) return true;
            return item.roles.includes(user.role);
        });
    };

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900/80 backdrop-blur-xl text-white flex flex-col z-40 border-r border-white/5">
            {/* Logo Section */}
            <div className="p-6 border-b border-white/5">
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
                        <div className="relative w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            <Sparkles size={20} className="text-white" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                            AI Pipeline
                        </h1>
                        <p className="text-xs text-slate-400">Talent Intelligence</p>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 scrollbar-thin">
                {/* Main Navigation */}
                <div className="mb-6">
                    <p className="px-3 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Zap size={12} className="text-purple-400" />
                        Main Menu
                    </p>
                    <ul className="space-y-1">
                        {mainNavItems.map((item) => (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group ${isActive(item.path)
                                            ? 'text-white'
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    {isActive(item.path) && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-indigo-500/20 rounded-xl border border-purple-500/30">
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-purple-400 to-pink-400 rounded-r-full"></div>
                                        </div>
                                    )}
                                    <span className={`relative z-10 transition-all duration-300 ${isActive(item.path)
                                            ? 'text-purple-400 scale-110'
                                            : 'group-hover:scale-110 group-hover:text-purple-400'
                                        }`}>
                                        {item.icon}
                                    </span>
                                    <span className="relative z-10 font-medium">{item.name}</span>
                                    {item.badge && (
                                        <span className="relative z-10 ml-auto px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 rounded-full border border-purple-500/30">
                                            {item.badge}
                                        </span>
                                    )}
                                    {isActive(item.path) && (
                                        <ChevronRight size={16} className="relative z-10 ml-auto text-purple-400 animate-pulse" />
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Admin Navigation */}
                {filterByRole(adminNavItems).length > 0 && (
                    <div className="mb-6">
                        <p className="px-3 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Brain size={12} className="text-indigo-400" />
                            Analytics
                        </p>
                        <ul className="space-y-1">
                            {filterByRole(adminNavItems).map((item) => (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group ${isActive(item.path)
                                                ? 'text-white'
                                                : 'text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        {isActive(item.path) && (
                                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-purple-500/20 rounded-xl border border-indigo-500/30">
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-indigo-400 to-violet-400 rounded-r-full"></div>
                                            </div>
                                        )}
                                        <span className={`relative z-10 transition-all duration-300 ${isActive(item.path)
                                                ? 'text-indigo-400 scale-110'
                                                : 'group-hover:scale-110 group-hover:text-indigo-400'
                                            }`}>
                                            {item.icon}
                                        </span>
                                        <span className="relative z-10 font-medium">{item.name}</span>
                                        {isActive(item.path) && (
                                            <ChevronRight size={16} className="relative z-10 ml-auto text-indigo-400 animate-pulse" />
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </nav>

            {/* Bottom Section */}
            <div className="p-3 border-t border-white/5 space-y-1">
                <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-300 w-full group">
                    <Settings size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    <span className="font-medium">Settings</span>
                </button>
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 w-full group"
                >
                    <LogOut size={20} className="group-hover:-translate-x-1 transition-transform duration-300" />
                    <span className="font-medium">Sign Out</span>
                </button>
            </div>

            {/* Decorative Elements */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-purple-500/5 to-transparent pointer-events-none"></div>
        </aside>
    );
};

export default Sidebar;
