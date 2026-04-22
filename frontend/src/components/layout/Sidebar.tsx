import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard, Users, FolderKanban, MessageSquare,
    FileText, Brain, Monitor, Settings, ChevronRight,
    LogOut, User, Upload, Target, BookOpen, Activity,
    Home, CheckSquare, Calendar, FileText as ReportIcon, Layers,
    ClipboardList, GitBranch, BarChart2, TrendingUp, CreditCard,
    Zap, Award, Send
} from 'lucide-react';

interface NavItem {
    name: string;
    path: string;
    icon: React.ReactNode;
    roles?: string[];
    badge?: string;
}

interface SidebarProps {
    isExpanded: boolean;
    setIsExpanded: (expanded: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isExpanded, setIsExpanded }) => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);
    const [flyoutVisible, setFlyoutVisible] = React.useState(false);
    const flyoutTimeout = React.useRef<any>(null);

    const handleMouseEnter = (path: string) => {
        if (flyoutTimeout.current) clearTimeout(flyoutTimeout.current);
        setHoveredItem(path);
        setFlyoutVisible(true);
    };

    const handleMouseLeave = () => {
        flyoutTimeout.current = setTimeout(() => {
            setFlyoutVisible(false);
            setHoveredItem(null);
        }, 300);
    };

    const mainNavItems: NavItem[] = [
        { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
        { name: 'Profile', path: '/account/profile', icon: <User size={20} /> },
        { name: 'Interns', path: '/directory/interns', icon: <Users size={20} /> },
        { name: 'Projects', path: '/directory/projects', icon: <FolderKanban size={20} /> },
        { name: 'Feedback', path: '/directory/feedback', icon: <MessageSquare size={20} /> },
        { name: 'Documents', path: '/directory/documents', icon: <FileText size={20} /> },
    ];

    const adminNavItems: NavItem[] = [
        { name: 'Analysis', path: '/analytics/skill-intelligence', icon: <Brain size={20} />, roles: ['ADMIN', 'MANAGER'] },
        { name: 'Learning Path', path: '/analytics/learning-paths', icon: <BookOpen size={20} />, roles: ['ADMIN', 'MANAGER'], badge: 'AI' },
        { name: 'Performance', path: '/analytics/performance', icon: <Activity size={20} />, roles: ['ADMIN', 'MANAGER'], badge: 'AI' },
        { name: 'Report Analytics', path: '/analytics/weekly-reports', icon: <TrendingUp size={20} />, roles: ['ADMIN', 'MANAGER'], badge: 'V2' },
        { name: 'Criteria Config', path: '/analytics/criteria', icon: <Zap size={20} />, roles: ['ADMIN'], badge: 'V2' },
    ];

    // Monitoring sub-pages (separate pages, not tabs)
    const monitoringNavItems: NavItem[] = [
        { name: 'Overview', path: '/management/overview', icon: <Home size={18} />, roles: ['ADMIN', 'MANAGER'] },
        { name: 'Tasks', path: '/management/tasks', icon: <CheckSquare size={18} />, roles: ['ADMIN', 'MANAGER'] },
        { name: 'Attendance', path: '/management/attendance', icon: <Calendar size={18} />, roles: ['ADMIN', 'MANAGER'] },
        { name: 'Reports (V1)', path: '/management/reports', icon: <ReportIcon size={18} />, roles: ['ADMIN', 'MANAGER'] },
        { name: 'Weekly Reports', path: '/management/weekly-reports', icon: <BarChart2 size={18} />, roles: ['ADMIN', 'MANAGER'], badge: 'V2' },
        { name: 'Stipends', path: '/management/stipends', icon: <CreditCard size={18} />, roles: ['ADMIN', 'MANAGER'], badge: 'V2' },
        { name: 'Phase Gates', path: '/management/phase-gates', icon: <Award size={18} />, roles: ['ADMIN', 'MANAGER'], badge: 'V2' },
        { name: 'PPO Offers', path: '/management/offers', icon: <Send size={18} />, roles: ['ADMIN', 'MANAGER'], badge: 'V2' },
    ];

    const internNavItems: NavItem[] = [
        { name: 'Upload Report', path: '/workspace/submit-report', icon: <Upload size={20} />, roles: ['INTERN'] },
        { name: 'My Tasks', path: '/workspace/my-tasks', icon: <Target size={20} />, roles: ['INTERN'] },
        { name: 'My Attendance', path: '/workspace/my-attendance', icon: <Monitor size={20} />, roles: ['INTERN'] },
        { name: 'Weekly Reports', path: '/workspace/weekly-reports', icon: <ClipboardList size={20} />, roles: ['INTERN'], badge: 'V2' },
        { name: 'Career Timeline', path: '/career/phase-timeline', icon: <GitBranch size={20} />, roles: ['INTERN'], badge: 'V2' },
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

    const renderNavItem = (item: NavItem, section: 'main' | 'admin' | 'monitoring' | 'intern') => {
        const isTaskItem = item.name.includes('Tasks');
        const active = isActive(item.path);
        const isHovered = isTaskItem && flyoutVisible && hoveredItem === item.path && isExpanded;

        const sectionStyles = {
            main: {
                activeBg: 'bg-purple-500/[0.05]',
                activeBorder: 'border-purple-500/10',
                indicator: 'from-purple-500 to-blue-500',
                shadow: 'shadow-[0_0_15px_rgba(168,85,247,0.5)]',
                icon: 'text-purple-400',
                glow: 'bg-purple-500/5'
            },
            admin: {
                activeBg: 'bg-indigo-500/[0.05]',
                activeBorder: 'border-indigo-500/10',
                indicator: 'from-indigo-500 to-purple-500',
                shadow: 'shadow-[0_0_15px_rgba(99,102,241,0.5)]',
                icon: 'text-indigo-400',
                glow: 'bg-indigo-500/5'
            },
            monitoring: {
                activeBg: 'bg-white/[0.03]',
                activeBorder: 'border-white/5',
                indicator: 'from-cyan-500 to-blue-500',
                shadow: 'shadow-[0_0_15px_rgba(6,182,212,0.5)]',
                icon: 'text-cyan-400',
                glow: 'bg-cyan-500/5'
            },
            intern: {
                activeBg: 'bg-white/[0.03]',
                activeBorder: 'border-white/5',
                indicator: 'from-emerald-500 to-green-500',
                shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.5)]',
                icon: 'text-emerald-400',
                glow: 'bg-emerald-500/5'
            }
        }[section];

        return (
            <li key={item.path} className="relative px-1">
                <Link
                    to={item.path}
                    onMouseEnter={() => isTaskItem && handleMouseEnter(item.path)}
                    onMouseLeave={() => isTaskItem && handleMouseLeave()}
                    className={`relative flex items-center h-12 rounded-xl transition-all duration-500 group overflow-hidden ${active
                        ? 'text-white'
                        : 'text-slate-500 hover:text-slate-200'
                        }`}
                >
                    {active && (
                        <div className={`absolute inset-0 ${sectionStyles.activeBg} border ${sectionStyles.activeBorder} rounded-xl transition-all duration-500`}>
                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b ${sectionStyles.indicator} rounded-r-full ${sectionStyles.shadow}`}></div>
                        </div>
                    )}
                    
                    <div className="relative z-10 w-14 h-12 flex items-center justify-center flex-shrink-0 transition-all duration-500">
                        <span className={`transition-all duration-500 ${active
                            ? `${sectionStyles.icon} scale-110`
                            : `group-hover:scale-110 ${sectionStyles.icon} opacity-60 group-hover:opacity-100`
                            }`}>
                            {item.icon}
                        </span>
                        {active && !isExpanded && (
                            <div className={`absolute inset-2 ${sectionStyles.glow} border ${sectionStyles.activeBorder} rounded-xl -z-10`} />
                        )}
                    </div>
                    
                    <span className={`relative z-10 text-sm font-bold tracking-tight transition-all duration-500 whitespace-nowrap overflow-hidden ${isExpanded ? 'max-w-[200px] opacity-100 ml-1' : 'max-w-0 opacity-0 ml-0'} ${active ? 'text-[var(--text-main)]' : 'text-slate-500 group-hover:text-slate-200'}`}>
                        {item.name}
                    </span>

                    {item.badge && isExpanded && (
                        <span className="relative z-10 ml-auto mr-4 px-2 py-0.5 text-[8px] font-black bg-purple-500/10 text-purple-400 rounded-md border border-purple-500/20 uppercase tracking-widest leading-none animate-in fade-in zoom-in duration-500">
                            {item.badge}
                        </span>
                    )}
                    
                    {active && isExpanded && (
                        <div className={`absolute right-[-10%] top-[-10%] w-24 h-24 ${sectionStyles.glow} blur-2xl rounded-full`} />
                    )}
                </Link>

                {/* Animated Inline Sub-menu for Tasks */}
                <div 
                    className={`grid transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${isHovered 
                        ? 'grid-rows-[1fr] opacity-100 mt-2 mb-3 translate-y-0' 
                        : 'grid-rows-[0fr] opacity-0 mt-0 mb-0 -translate-y-2 pointer-events-none'}`}
                >
                    <div 
                        onMouseEnter={() => flyoutTimeout.current && clearTimeout(flyoutTimeout.current)}
                        onMouseLeave={handleMouseLeave}
                        className="min-h-0 mx-3 p-2 bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-2xl space-y-0.5"
                    >
                        <Link 
                            to={item.path === '/workspace/my-tasks' ? '/workspace/tasks/details' : `${item.path}/details`} 
                            onClick={(e) => {
                                e.stopPropagation();
                                setFlyoutVisible(false);
                            }}
                            className="relative z-30 flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 group/sub transition-all duration-300"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover/sub:bg-cyan-500/20 transition-colors">
                                    <Activity size={12} className="text-slate-500 group-hover/sub:text-cyan-400" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 group-hover/sub:text-white tracking-wide uppercase">Detailed Tasks Page</span>
                            </div>
                            <ChevronRight size={12} className="text-slate-700 group-hover/sub:translate-x-1 transition-transform" />
                        </Link>
                        
                        <Link 
                            to={`${item.path}?view=board`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setFlyoutVisible(false);
                            }}
                            className="relative z-30 flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 group/sub transition-all duration-300"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover/sub:bg-purple-500/20 transition-colors">
                                    <Layers size={12} className="text-slate-500 group-hover/sub:text-purple-400" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 group-hover/sub:text-white tracking-wide uppercase">Board View</span>
                            </div>
                            <ChevronRight size={12} className="text-slate-700 group-hover/sub:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            </li>
        );
    };

    return (
        <aside 
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
            className={`fixed left-0 top-0 h-screen bg-[var(--sidebar-bg)] backdrop-blur-3xl text-[var(--text-main)] flex flex-col z-40 border-r border-[var(--border-color)] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-2xl will-change-[width] ${isExpanded ? 'w-64' : 'w-20'}`}
        >
            {/* Logo Section */}
            <div className={`border-b border-[var(--border-color)] transition-all duration-500 p-4 ${isExpanded ? 'px-6' : 'flex justify-center'}`}>
                <Link to="/" className="flex items-center gap-4 group">
                    <div className="relative flex-shrink-0">
                        <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500"></div>
                        <div className="relative w-10 h-10 bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                            <Target size={20} className="text-white" />
                        </div>
                    </div>
                    <div className={`transition-all duration-500 overflow-hidden whitespace-nowrap ${isExpanded ? 'max-w-[150px] opacity-100' : 'max-w-0 opacity-0'}`}>
                        <h1 className="text-xl font-heading font-black tracking-tighter bg-gradient-to-r from-[var(--text-main)] via-purple-400 to-[var(--text-main)] bg-clip-text text-transparent uppercase">
                            AIMs
                        </h1>
                        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500 mt-0.5">Talent Intelligence</p>
                    </div>
                </Link>
            </div>

            {/* Navigation - Hide Scrollbar with style tag below */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 sidebar-nav">
                {/* Main Navigation */}
                <div className="mb-4">
                    <div className={`px-4 mb-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] flex items-center gap-3 transition-all duration-500 overflow-hidden whitespace-nowrap ${isExpanded ? 'opacity-100 max-h-8' : 'opacity-0 max-h-0'}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)] flex-shrink-0" />
                        <span>Main Menu</span>
                    </div>
                    <ul className="space-y-0.5">
                        {mainNavItems.map((item) => renderNavItem(item, 'main'))}
                    </ul>
                </div>

                {/* Admin Navigation */}
                {filterByRole(adminNavItems).length > 0 && (
                    <div className="mb-4">
                        <div className={`px-4 mb-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] flex items-center gap-3 transition-all duration-500 overflow-hidden whitespace-nowrap ${isExpanded ? 'opacity-100 max-h-8' : 'opacity-0 max-h-0'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] flex-shrink-0" />
                            <span>Analytics</span>
                        </div>
                        <ul className="space-y-0.5">
                            {filterByRole(adminNavItems).map((item) => renderNavItem(item, 'admin'))}
                        </ul>
                    </div>
                )}

                {/* Monitoring Navigation */}
                {filterByRole(monitoringNavItems).length > 0 && (
                    <div className="mb-4">
                        <div className={`px-4 mb-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] flex items-center gap-3 transition-all duration-500 overflow-hidden whitespace-nowrap ${isExpanded ? 'opacity-100 max-h-8' : 'opacity-0 max-h-0'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] flex-shrink-0" />
                            <span>Monitoring</span>
                        </div>
                        <ul className="space-y-0.5">
                            {filterByRole(monitoringNavItems).map((item) => renderNavItem(item, 'monitoring'))}
                        </ul>
                    </div>
                )}

                {/* Intern Navigation */}
                {filterByRole(internNavItems).length > 0 && (
                    <div className="mb-4">
                        <div className={`px-4 mb-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] flex items-center gap-3 transition-all duration-500 overflow-hidden whitespace-nowrap ${isExpanded ? 'opacity-100 max-h-8' : 'opacity-0 max-h-0'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] flex-shrink-0" />
                            <span>My Workspace</span>
                        </div>
                        <ul className="space-y-0.5">
                            {filterByRole(internNavItems).map((item) => renderNavItem(item, 'intern'))}
                        </ul>
                    </div>
                )}
            </nav>

            {/* Bottom Section */}
            <div className={`p-3 border-t border-[var(--border-color)]`}>
                <button
                    onClick={logout}
                    className={`flex items-center h-12 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 w-full group overflow-hidden`}
                >
                    <div className="w-14 h-12 flex items-center justify-center flex-shrink-0">
                        <LogOut size={20} className="group-hover:-translate-x-1 transition-transform duration-300" />
                    </div>
                    <span className={`font-bold text-sm transition-all duration-500 whitespace-nowrap overflow-hidden ${isExpanded ? 'max-w-[150px] opacity-100 ml-1' : 'max-w-0 opacity-0 ml-0'}`}>
                        Sign Out
                    </span>
                </button>
            </div>

            {/* Task sub-menu logic is now inline within renderNavItem */}

            {/* Decorative Elements */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-purple-500/5 to-transparent pointer-events-none"></div>

            <style>{`
                .sidebar-nav::-webkit-scrollbar {
                    display: none;
                }
                .sidebar-nav {
                    -ms-overflow-style: none; /* IE and Edge */
                    scrollbar-width: none; /* Firefox */
                }
            `}</style>
        </aside>
    );
};

export default Sidebar;
