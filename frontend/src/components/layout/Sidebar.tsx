import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard, Users, FolderKanban, MessageSquare,
    FileText, Brain, Monitor, Settings, ChevronRight,
    Sparkles, LogOut, Zap, User, Upload, Target, BookOpen, Activity,
    Home, CheckSquare, Calendar, FileText as ReportIcon
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
        { name: 'Profile', path: '/profile', icon: <User size={20} /> },
        { name: 'Interns', path: '/interns', icon: <Users size={20} /> },
        { name: 'Projects', path: '/projects', icon: <FolderKanban size={20} /> },
        { name: 'Feedback', path: '/feedback', icon: <MessageSquare size={20} /> },
        { name: 'Documents', path: '/documents', icon: <FileText size={20} /> },
    ];

    const adminNavItems: NavItem[] = [
        { name: 'Analysis', path: '/analysis', icon: <Brain size={20} />, roles: ['ADMIN', 'MANAGER'] },
        { name: 'Learning Path', path: '/learning-path', icon: <BookOpen size={20} />, roles: ['ADMIN', 'MANAGER'], badge: 'AI' },
        { name: 'Performance', path: '/performance', icon: <Activity size={20} />, roles: ['ADMIN', 'MANAGER'], badge: 'AI' },
    ];

    // Monitoring sub-pages (separate pages, not tabs)
    const monitoringNavItems: NavItem[] = [
        { name: 'Overview', path: '/monitoring', icon: <Home size={18} />, roles: ['ADMIN', 'MANAGER'] },
        { name: 'Tasks', path: '/tasks', icon: <CheckSquare size={18} />, roles: ['ADMIN', 'MANAGER'] },
        { name: 'Attendance', path: '/attendance', icon: <Calendar size={18} />, roles: ['ADMIN', 'MANAGER'] },
        { name: 'Reports', path: '/reports', icon: <ReportIcon size={18} />, roles: ['ADMIN', 'MANAGER'] },
    ];

    const internNavItems: NavItem[] = [
        { name: 'Upload Report', path: '/upload-report', icon: <Upload size={20} />, roles: ['INTERN'] },
        { name: 'My Tasks', path: '/my-tasks', icon: <Target size={20} />, roles: ['INTERN'] },
        { name: 'My Attendance', path: '/my-attendance', icon: <Monitor size={20} />, roles: ['INTERN'] },
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
        <aside className="fixed left-0 top-0 h-screen w-64 bg-[var(--sidebar-bg)] backdrop-blur-3xl text-[var(--text-main)] flex flex-col z-40 border-r border-[var(--border-color)] transition-all duration-500">
            {/* Logo Section */}
            <div className="p-8 border-b border-[var(--border-color)]">
                <Link to="/" className="flex items-center gap-4 group">
                    <div className="relative">
                        <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                        <div className="relative w-12 h-12 bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                            <Sparkles size={24} className="text-white" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-xl font-heading font-black tracking-tighter bg-gradient-to-r from-[var(--text-main)] via-purple-400 to-[var(--text-main)] bg-clip-text text-transparent uppercase italic">
                            AI Pipeline
                        </h1>
                        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500 mt-0.5">Talent Intelligence</p>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 scrollbar-thin">
                {/* Main Navigation */}
                <div className="mb-8">
                    <p className="px-4 mb-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                        Main Menu
                    </p>
                    <ul className="space-y-1.5 px-2">
                        {mainNavItems.map((item) => (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    className={`relative flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-500 group overflow-hidden ${isActive(item.path)
                                        ? 'text-white'
                                        : 'text-slate-500 hover:text-slate-200'
                                        }`}
                                >
                                    {isActive(item.path) && (
                                        <div className="absolute inset-0 bg-purple-500/[0.05] dark:bg-white/[0.03] border border-purple-500/10 dark:border-white/5 rounded-2xl">
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-purple-500 to-blue-500 rounded-r-full shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
                                        </div>
                                    )}
                                    <span className={`relative z-10 transition-all duration-500 ${isActive(item.path)
                                        ? 'text-purple-400 scale-110'
                                        : 'group-hover:scale-110 group-hover:text-purple-400 opacity-60 group-hover:opacity-100'
                                        }`}>
                                        {item.icon}
                                    </span>
                                    <span className={`relative z-10 text-sm font-bold tracking-tight transition-colors duration-500 ${isActive(item.path) ? 'text-white' : 'text-slate-500 group-hover:text-slate-200'}`}>{item.name}</span>
                                    {item.badge && (
                                        <span className="relative z-10 ml-auto px-2 py-0.5 text-[8px] font-black bg-purple-500/10 text-purple-400 rounded-md border border-purple-500/20 uppercase tracking-widest leading-none">
                                            {item.badge}
                                        </span>
                                    )}
                                    {isActive(item.path) && (
                                        <div className="absolute right-[-10%] top-[-10%] w-24 h-24 bg-purple-500/5 blur-2xl rounded-full" />
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Admin Navigation */}
                {filterByRole(adminNavItems).length > 0 && (
                    <div className="mb-8">
                        <p className="px-4 mb-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                            Analytics
                        </p>
                        <ul className="space-y-1.5 px-2">
                            {filterByRole(adminNavItems).map((item) => (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        className={`relative flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-500 group overflow-hidden ${isActive(item.path)
                                            ? 'text-white'
                                            : 'text-slate-500 hover:text-slate-200'
                                            }`}
                                    >
                                        {isActive(item.path) && (
                                            <div className="absolute inset-0 bg-indigo-500/[0.05] dark:bg-white/[0.03] border border-indigo-500/10 dark:border-white/5 rounded-2xl">
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-r-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                                            </div>
                                        )}
                                        <span className={`relative z-10 transition-all duration-500 ${isActive(item.path)
                                            ? 'text-indigo-400 scale-110'
                                            : 'group-hover:scale-110 group-hover:text-indigo-400 opacity-60 group-hover:opacity-100'
                                            }`}>
                                            {item.icon}
                                        </span>
                                        <span className={`relative z-10 text-sm font-bold tracking-tight transition-colors duration-500 ${isActive(item.path) ? 'text-white' : 'text-slate-500 group-hover:text-slate-200'}`}>{item.name}</span>
                                        {isActive(item.path) && (
                                            <div className="absolute right-[-10%] top-[-10%] w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full" />
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Monitoring Navigation */}
                {filterByRole(monitoringNavItems).length > 0 && (
                    <div className="mb-8">
                        <p className="px-4 mb-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                            Monitoring
                        </p>
                        <ul className="space-y-1.5 px-2">
                            {filterByRole(monitoringNavItems).map((item) => (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        className={`relative flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-500 group overflow-hidden ${isActive(item.path)
                                            ? 'text-white'
                                            : 'text-slate-500 hover:text-slate-200'
                                            }`}
                                    >
                                        {isActive(item.path) && (
                                            <div className="absolute inset-0 bg-white/[0.03] border border-white/5 rounded-2xl">
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-r-full shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
                                            </div>
                                        )}
                                        <span className={`relative z-10 transition-all duration-500 ${isActive(item.path)
                                            ? 'text-cyan-400 scale-110'
                                            : 'group-hover:scale-110 group-hover:text-cyan-400 opacity-60 group-hover:opacity-100'
                                            }`}>
                                            {item.icon}
                                        </span>
                                        <span className={`relative z-10 text-sm font-bold tracking-tight transition-colors duration-500 ${isActive(item.path) ? 'text-white' : 'text-slate-500 group-hover:text-slate-200'}`}>{item.name}</span>
                                        {isActive(item.path) && (
                                            <div className="absolute right-[-10%] top-[-10%] w-24 h-24 bg-cyan-500/5 blur-2xl rounded-full" />
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Intern Navigation */}
                {filterByRole(internNavItems).length > 0 && (
                    <div className="mb-8">
                        <p className="px-4 mb-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            My Workspace
                        </p>
                        <ul className="space-y-1.5 px-2">
                            {filterByRole(internNavItems).map((item) => (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        className={`relative flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-500 group overflow-hidden ${isActive(item.path)
                                            ? 'text-white'
                                            : 'text-slate-500 hover:text-slate-200'
                                            }`}
                                    >
                                        {isActive(item.path) && (
                                            <div className="absolute inset-0 bg-white/[0.03] border border-white/5 rounded-2xl">
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-emerald-500 to-green-500 rounded-r-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                                            </div>
                                        )}
                                        <span className={`relative z-10 transition-all duration-500 ${isActive(item.path)
                                            ? 'text-emerald-400 scale-110'
                                            : 'group-hover:scale-110 group-hover:text-emerald-400 opacity-60 group-hover:opacity-100'
                                            }`}>
                                            {item.icon}
                                        </span>
                                        <span className={`relative z-10 text-sm font-bold tracking-tight transition-colors duration-500 ${isActive(item.path) ? 'text-white' : 'text-slate-500 group-hover:text-slate-200'}`}>{item.name}</span>
                                        {isActive(item.path) && (
                                            <div className="absolute right-[-10%] top-[-10%] w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full" />
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </nav>

            {/* Bottom Section */}
            <div className="p-3 border-t border-[var(--border-color)] space-y-1">
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
