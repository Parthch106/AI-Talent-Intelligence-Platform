import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Bell, LogOut, ChevronDown, Mail, Settings, Zap, Clock, AlertCircle, CheckCircle, Trash2, Sun, Moon } from 'lucide-react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';

interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

const Header: React.FC = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loadingNotifications, setLoadingNotifications] = useState(false);

    // Fetch notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            if (!user) return;
            try {
                setLoadingNotifications(true);
                const response = await api.get('/notifications/');
                setNotifications(response.data.notifications || []);
                setUnreadCount(response.data.unread_count || 0);
                
                // Also fetch feedback unread count for interns
                if (user.role === 'INTERN') {
                    try {
                        const feedbackRes = await api.get('/feedback/unread_count/');
                        const feedbackUnread = feedbackRes.data.unread_count || 0;
                        // Add feedback count to total
                        setUnreadCount(prev => prev + feedbackUnread);
                    } catch (e) {
                        // Ignore - feedback count is optional
                    }
                }
            } catch (err) {
                console.error('Failed to fetch notifications:', err);
            } finally {
                setLoadingNotifications(false);
            }
        };

        fetchNotifications();
    }, [user]);

    const getInitials = () => {
        if (user?.full_name) {
            return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
        return user?.email?.substring(0, 2).toUpperCase() || 'U';
    };

    const deleteNotification = async (notificationId: number) => {
        try {
            await api.post('/notifications/delete/', { notification_id: notificationId });
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            const wasUnread = notifications.find(n => n.id === notificationId && !n.is_read);
            if (wasUnread) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error('Failed to delete notification:', err);
        }
    };

    const clearAll = async () => {
        try {
            await api.post('/notifications/delete/', { clear_all: true });
            setNotifications([]);
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to clear all notifications:', err);
        }
    };

    const markAsRead = async (notificationId: number) => {
        try {
            await api.post('/notifications/mark-read/', { notification_id: notificationId });
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.post('/notifications/mark-read/', {});
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all notifications as read:', err);
        }
    };

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        return `${Math.floor(diffInSeconds / 86400)} days ago`;
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'SUCCESS':
            case 'TASK_COMPLETED':
                return { icon: <CheckCircle size={14} />, color: 'emerald' };
            case 'WARNING':
            case 'ERROR':
                return { icon: <AlertCircle size={14} />, color: 'red' };
            case 'INTERN_ASSIGNED':
                return { icon: <Mail size={14} />, color: 'blue' };
            case 'FEEDBACK_RECEIVED':
                return { icon: <Mail size={14} />, color: 'purple' };
            default:
                return { icon: <Bell size={14} />, color: 'purple' };
        }
    };

    const getRoleBadgeStyle = () => {
        switch (user?.role) {
            case 'ADMIN':
                return 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-purple-500/5';
            case 'MANAGER':
                return 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5';
            default:
                return 'bg-slate-500/10 text-slate-400 border-slate-500/20 shadow-slate-500/5';
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <>
            <header className="h-20 bg-[var(--header-bg)] backdrop-blur-3xl border-b border-[var(--border-color)] flex items-center justify-between px-8 fixed top-0 left-64 right-0 z-30 transition-all duration-500">
                {/* Left Section - Welcome */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="relative group/zap">
                            <div className="absolute -inset-1 bg-purple-500/20 rounded-xl blur-lg opacity-0 group-hover/zap:opacity-100 transition-opacity" />
                            <div className="relative w-11 h-11 bg-white/[0.03] border border-white/10 rounded-xl flex items-center justify-center group-hover/zap:border-purple-500/30 transition-all duration-500">
                                <Zap size={20} className="text-purple-400 group-hover/zap:scale-110 transition-transform" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xl font-heading font-black tracking-tighter text-white uppercase italic">
                                Welcome, <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">{user?.full_name?.split(' ')[0] || 'User'}</span>
                            </h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mt-0.5">Systems Operational</p>
                        </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black border uppercase tracking-[0.2em] shadow-lg ${getRoleBadgeStyle()}`}>
                        {user?.role}
                    </div>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-3">
                    {/* Quick Actions */}
                    <button
                        onClick={() => navigate('/profile')}
                        className="p-2.5 text-slate-400 hover:text-[var(--text-main)] hover:bg-white/5 rounded-xl transition-all duration-300 border border-transparent hover:border-white/10"
                    >
                        <Settings size={18} />
                    </button>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 text-slate-400 hover:text-[var(--text-main)] hover:bg-white/5 rounded-xl transition-all duration-500 border border-transparent hover:border-white/10 group/theme"
                        title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                    >
                        <div className="relative overflow-hidden">
                            {theme === 'dark' ? (
                                <Sun size={18} className="text-amber-400 animate-slide-up" />
                            ) : (
                                <Moon size={18} className="text-indigo-400 animate-slide-down" />
                            )}
                        </div>
                    </button>

                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 border border-transparent hover:border-white/10"
                        >
                            <Bell size={18} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gradient-to-r from-pink-500 to-red-500 rounded-full animate-pulse"></span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-purple-500/10 py-2 animate-scale-in">
                                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                                    <h3 className="font-semibold text-white">Notifications</h3>
                                    <div className="flex items-center gap-4">
                                        {notifications.length > 0 && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); clearAll(); }}
                                                className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-widest transition-colors"
                                            >
                                                Clear All
                                            </button>
                                        )}
                                        {unreadCount > 0 && (
                                            <span className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-300 rounded-full font-bold uppercase tracking-widest leading-none flex items-center justify-center">
                                                {unreadCount} new
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {loadingNotifications ? (
                                    <div className="p-4 text-center text-slate-400">
                                        <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto"></div>
                                    </div>
                                ) : notifications.length > 0 ? (
                                    <>
                                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                            {notifications.slice(0, 5).map((notification) => {
                                                const { icon, color } = getNotificationIcon(notification.type);
                                                return (
                                                    <div
                                                        key={notification.id}
                                                        onClick={() => !notification.is_read && markAsRead(notification.id)}
                                                        className={`group relative px-4 py-3 hover:bg-white/[0.03] cursor-pointer border-l-2 transition-all ${notification.is_read ? 'border-transparent opacity-60' : 'border-purple-500 bg-purple-500/[0.02]'}`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors group-hover:scale-110 duration-500 bg-${color}-500/20`}>
                                                                <span className={`text-${color}-400`}>{icon}</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0 pr-6">
                                                                <p className="text-sm font-bold text-white tracking-tight leading-tight">{notification.title}</p>
                                                                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 group-hover:line-clamp-none transition-all duration-300">{notification.message}</p>
                                                                <p className="text-[9px] text-slate-500 mt-1 flex items-center gap-1 font-black uppercase tracking-wider">
                                                                    <Clock size={10} />
                                                                    {getTimeAgo(notification.created_at)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Individual delete button */}
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteNotification(notification.id);
                                                            }}
                                                            className="absolute right-3 top-3 p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500/10"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5 flex items-center justify-between gap-2">
                                            {unreadCount > 0 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                                                    className="text-[10px] font-black uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-colors"
                                                >
                                                    Mark Read
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowNotifications(false);
                                                    navigate('/notifications');
                                                }}
                                                className="flex-1 text-center py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-lg border border-transparent hover:border-white/10"
                                            >
                                                View All Center
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-12 text-center text-slate-400">
                                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/5 shadow-inner">
                                            <Bell size={24} className="opacity-20" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest">No Alerts Recorded</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* User Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-3 pl-4 pr-2 py-1.5 rounded-xl hover:bg-white/5 transition-all duration-300 border border-white/5 hover:border-white/10 group"
                        >
                            <div className="text-right">
                                <p className="text-sm font-medium text-white group-hover:text-purple-200 transition-colors">{user?.full_name || 'User'}</p>
                                <p className="text-xs text-slate-400">{user?.email}</p>
                            </div>
                            <div className="relative">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-0 group-hover:opacity-50 transition-opacity"></div>
                                <div className="relative w-9 h-9 bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                                    {getInitials()}
                                </div>
                            </div>
                            <ChevronDown size={16} className="text-slate-400 group-hover:text-purple-400 transition-colors" />
                        </button>

                        {showUserMenu && (
                            <div className="absolute right-0 mt-2 w-56 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 animate-scale-in">
                                <div className="px-4 py-3 border-b border-white/5">
                                    <p className="font-medium text-white">{user?.full_name}</p>
                                    <p className="text-xs text-slate-400">{user?.role}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowUserMenu(false);
                                        navigate('/profile');
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-slate-300 hover:text-white transition-colors"
                                >
                                    <Settings size={16} className="text-purple-400" />
                                    <span>Profile Settings</span>
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                    <LogOut size={16} />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Click outside to close menus */}
            {(showNotifications || showUserMenu) && (
                <div
                    className="fixed inset-0 z-20"
                    onClick={() => {
                        setShowNotifications(false);
                        setShowUserMenu(false);
                    }}
                />
            )}
        </>
    );
};

export default Header;
