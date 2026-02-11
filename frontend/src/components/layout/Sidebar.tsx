import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard, Users, FolderKanban, MessageSquare,
    FileText, Brain, Monitor, Settings, ChevronRight,
    Sparkles
} from 'lucide-react';

interface NavItem {
    name: string;
    path: string;
    icon: React.ReactNode;
    roles?: string[];
}

const Sidebar: React.FC = () => {
    const location = useLocation();
    const { user } = useAuth();

    const mainNavItems: NavItem[] = [
        { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
        { name: 'Interns', path: '/interns', icon: <Users size={20} /> },
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
        <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col shadow-xl z-40">
            {/* Logo Section */}
            <div className="p-6 border-b border-slate-700/50">
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/25 transition-shadow">
                        <Sparkles size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            AI Pipeline
                        </h1>
                        <p className="text-xs text-slate-400">Talent Intelligence</p>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-3">
                {/* Main Navigation */}
                <div className="mb-6">
                    <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Main Menu
                    </p>
                    <ul className="space-y-1">
                        {mainNavItems.map((item) => (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${isActive(item.path)
                                            ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-white border border-blue-500/30'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                        }`}
                                >
                                    <span className={`transition-colors ${isActive(item.path) ? 'text-blue-400' : 'group-hover:text-blue-400'}`}>
                                        {item.icon}
                                    </span>
                                    <span className="font-medium">{item.name}</span>
                                    {isActive(item.path) && (
                                        <ChevronRight size={16} className="ml-auto text-blue-400" />
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Admin Navigation */}
                {filterByRole(adminNavItems).length > 0 && (
                    <div className="mb-6">
                        <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Analytics
                        </p>
                        <ul className="space-y-1">
                            {filterByRole(adminNavItems).map((item) => (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${isActive(item.path)
                                                ? 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-white border border-violet-500/30'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                            }`}
                                    >
                                        <span className={`transition-colors ${isActive(item.path) ? 'text-violet-400' : 'group-hover:text-violet-400'}`}>
                                            {item.icon}
                                        </span>
                                        <span className="font-medium">{item.name}</span>
                                        {isActive(item.path) && (
                                            <ChevronRight size={16} className="ml-auto text-violet-400" />
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </nav>

            {/* Bottom Section */}
            <div className="p-3 border-t border-slate-700/50">
                <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all w-full">
                    <Settings size={20} />
                    <span className="font-medium">Settings</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
