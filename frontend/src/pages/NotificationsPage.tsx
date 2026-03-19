import React, { useState, useEffect } from 'react';
import { Bell, Clock, Trash2, CheckCircle, AlertCircle, Mail, Filter, RefreshCw, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

const NotificationsPage: React.FC = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await api.get('/notifications/', {
                params: {
                    unread_only: unreadOnly,
                    page: page,
                    page_size: pageSize
                }
            });
            setNotifications(response.data.notifications || []);
            setTotalCount(response.data.total_count || 0);
            setHasMore(response.data.has_more || false);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [unreadOnly, page]);

    const markAsRead = async (id: number) => {
        try {
            await api.post('/notifications/mark-read/', { notification_id: id });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    const markSelectedAsRead = async () => {
        if (selectedIds.length === 0) return;
        try {
            await api.post('/notifications/mark-read/', { notification_ids: selectedIds });
            setNotifications(prev => prev.map(n => selectedIds.includes(n.id) ? { ...n, is_read: true } : n));
            setSelectedIds([]);
        } catch (err) {
            console.error('Failed to mark selected as read:', err);
        }
    };

    const deleteNotification = async (id: number) => {
        try {
            await api.post('/notifications/delete/', { notification_id: id });
            setNotifications(prev => prev.filter(n => n.id !== id));
            setTotalCount(prev => prev - 1);
        } catch (err) {
            console.error('Failed to delete notification:', err);
        }
    };

    const deleteSelected = async () => {
        if (selectedIds.length === 0) return;
        try {
            await api.post('/notifications/delete/', { notification_ids: selectedIds });
            setNotifications(prev => prev.filter(n => !selectedIds.includes(n.id)));
            setTotalCount(prev => prev - selectedIds.length);
            setSelectedIds([]);
        } catch (err) {
            console.error('Failed to delete selected:', err);
        }
    };

    const clearAll = async () => {
        if (!window.confirm('Are you sure you want to delete all notifications?')) return;
        try {
            await api.post('/notifications/delete/', { clear_all: true });
            setNotifications([]);
            setTotalCount(0);
            setSelectedIds([]);
        } catch (err) {
            console.error('Failed to clear all:', err);
        }
    };

    const markAllRead = async () => {
        try {
            await api.post('/notifications/mark-read/', {});
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            console.error('Failed to mark all read:', err);
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === notifications.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(notifications.map(n => n.id));
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'SUCCESS':
            case 'TASK_COMPLETED':
                return { icon: <CheckCircle className="text-emerald-400" size={20} />, bg: 'bg-emerald-500/10' };
            case 'WARNING':
                return { icon: <AlertCircle className="text-amber-400" size={20} />, bg: 'bg-amber-500/10' };
            case 'ERROR':
                return { icon: <AlertCircle className="text-red-400" size={20} />, bg: 'bg-red-500/10' };
            case 'INTERN_ASSIGNED':
            case 'FEEDBACK_RECEIVED':
                return { icon: <Mail className="text-blue-400" size={20} />, bg: 'bg-blue-500/10' };
            default:
                return { icon: <Bell className="text-purple-400" size={20} />, bg: 'bg-purple-500/10' };
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto min-h-screen pt-28">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">
                        Notification <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Center</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 uppercase font-black tracking-widest text-[10px]">Manage your system alerts and activities</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={fetchNotifications}
                        className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button 
                        onClick={clearAll}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl hover:bg-red-500/20 transition-all text-sm font-bold uppercase tracking-tight"
                    >
                        <Trash2 size={16} />
                        Clear All
                    </button>
                    <button 
                        onClick={markAllRead}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500/20 transition-all text-sm font-bold uppercase tracking-tight"
                    >
                        <CheckCircle size={16} />
                        Mark All Read
                    </button>
                </div>
            </div>

            {/* Content card */}
            <div className="bg-[#0A0A15]/60 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                {/* Filters and Actions bar */}
                <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setUnreadOnly(!unreadOnly)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${unreadOnly ? 'bg-purple-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                        >
                            <Filter size={14} />
                            {unreadOnly ? 'Unread Only' : 'All Notifications'}
                        </button>
                        
                        {selectedIds.length > 0 && (
                            <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                                <span className="text-xs text-slate-500 font-bold">{selectedIds.length} selected</span>
                                <button 
                                    onClick={markSelectedAsRead}
                                    className="p-1.5 text-purple-400 hover:bg-purple-400/10 rounded-lg transition-all"
                                    title="Mark as Read"
                                >
                                    <Check size={16} />
                                </button>
                                <button 
                                    onClick={deleteSelected}
                                    className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-1 text-slate-500 text-xs font-bold">
                        <span>Showing {notifications.length} of {totalCount}</span>
                    </div>
                </div>

                {/* Notifications list */}
                <div className="divide-y divide-white/5">
                    {loading && notifications.length === 0 ? (
                        <div className="py-20 text-center">
                            <RefreshCw size={40} className="mx-auto text-purple-500/50 animate-spin mb-4" />
                            <p className="text-slate-400 font-medium">Loading notifications...</p>
                        </div>
                    ) : notifications.length > 0 ? (
                        notifications.map((n) => {
                            const { icon, bg } = getNotificationIcon(n.type);
                            return (
                                <div 
                                    key={n.id} 
                                    className={`group px-6 py-5 flex items-start gap-4 transition-all hover:bg-white/[0.02] ${!n.is_read ? 'bg-purple-500/[0.03] border-l-2 border-purple-500' : 'border-l-2 border-transparent'}`}
                                >
                                    <div className="pt-1">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.includes(n.id)}
                                            onChange={() => toggleSelect(n.id)}
                                            className="w-4 h-4 rounded border-white/10 bg-white/5 text-purple-500 focus:ring-purple-500/50 transition-all cursor-pointer"
                                        />
                                    </div>
                                    
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                                        {icon}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0" onClick={() => !n.is_read && markAsRead(n.id)}>
                                        <div className="flex items-center justify-between gap-4 mb-1">
                                            <h3 className={`font-bold text-sm transition-colors ${!n.is_read ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>
                                                {n.title}
                                            </h3>
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-bold whitespace-nowrap">
                                                <Clock size={10} />
                                                {new Date(n.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className={`text-xs leading-relaxed ${!n.is_read ? 'text-slate-300' : 'text-slate-500 group-hover:text-slate-400'}`}>
                                            {n.message}
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-4">
                                        {!n.is_read && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                                                className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all"
                                                title="Mark as read"
                                            >
                                                <Check size={16} />
                                            </button>
                                        )}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-24 text-center">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                                <Bell size={32} className="text-slate-600" />
                            </div>
                            <h3 className="text-white font-bold text-lg mb-1">All caught up!</h3>
                            <p className="text-slate-500 text-sm">No notifications found with current filters.</p>
                        </div>
                    )}
                </div>

                {/* Pagination bar */}
                {totalCount > pageSize && (
                    <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-center gap-4">
                        <button 
                            disabled={page === 1 || loading}
                            onClick={() => setPage(prev => Math.max(1, prev - 1))}
                            className="p-2 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-xs font-bold text-slate-400">Page {page} of {Math.ceil(totalCount / pageSize)}</span>
                        <button 
                            disabled={!hasMore || loading}
                            onClick={() => setPage(prev => prev + 1)}
                            className="p-2 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>
            
            {/* Quick help info */}
            <div className="mt-8 p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                <AlertCircle size={18} className="text-purple-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Notifications are kept for up to 30 days. Clicking a notification marks it as read. 
                    You can manage multiple alerts at once using the checkboxes on the left.
                </p>
            </div>
        </div>
    );
};

export default NotificationsPage;
