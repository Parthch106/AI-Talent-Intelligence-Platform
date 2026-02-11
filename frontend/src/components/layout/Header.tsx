import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, X, User, LogOut, ChevronDown, Key, Mail, Settings, Shield, Zap } from 'lucide-react';
import api from '../../api/axios';

const Header: React.FC = () => {
    const { user, logout } = useAuth();
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const [profileData, setProfileData] = useState({
        full_name: user?.full_name || '',
        email: user?.email || '',
        department: user?.department || '',
        current_password: '',
        new_password: '',
        confirm_password: '',
    });

    useEffect(() => {
        if (showProfileModal && user) {
            setProfileData(prev => ({
                ...prev,
                full_name: user.full_name || '',
                email: user.email || '',
                department: user.department || '',
            }));
        }
    }, [showProfileModal, user]);

    const getInitials = () => {
        if (user?.full_name) {
            return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
        return user?.email?.substring(0, 2).toUpperCase() || 'U';
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setSuccess('');

        try {
            if (profileData.new_password) {
                if (profileData.new_password !== profileData.confirm_password) {
                    setError('New passwords do not match');
                    setSubmitting(false);
                    return;
                }
                if (!profileData.current_password) {
                    setError('Current password is required to change password');
                    setSubmitting(false);
                    return;
                }
            }

            const updateData: Record<string, unknown> = {
                full_name: profileData.full_name,
                department: profileData.department,
            };

            if (profileData.new_password) {
                updateData.current_password = profileData.current_password;
                updateData.new_password = profileData.new_password;
            }

            await api.patch('/accounts/profile/', updateData);
            setSuccess('Profile updated successfully!');
            setProfileData(prev => ({
                ...prev,
                current_password: '',
                new_password: '',
                confirm_password: '',
            }));
            setTimeout(() => {
                setSuccess('');
            }, 3000);
        } catch (err: unknown) {
            const errorData = err as { response?: { data?: { error?: string } } };
            setError(errorData.response?.data?.error || 'Failed to update profile');
        } finally {
            setSubmitting(false);
        }
    };

    const getRoleBadgeStyle = () => {
        switch (user?.role) {
            case 'ADMIN':
                return 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/30';
            case 'MANAGER':
                return 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/30';
            default:
                return 'bg-gradient-to-r from-slate-500/20 to-slate-400/20 text-slate-300 border-slate-500/30';
        }
    };

    return (
        <>
            <header className="h-16 bg-slate-900/50 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-30">
                {/* Left Section - Welcome */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center border border-purple-500/20">
                            <Zap size={18} className="text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">
                                Welcome back, <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{user?.full_name?.split(' ')[0] || 'User'}</span>
                            </h2>
                            <p className="text-xs text-slate-400">Here's what's happening today</p>
                        </div>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getRoleBadgeStyle()}`}>
                        {user?.role}
                    </span>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-3">
                    {/* Quick Actions */}
                    <button className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 border border-transparent hover:border-white/10">
                        <Settings size={18} />
                    </button>

                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 border border-transparent hover:border-white/10"
                        >
                            <Bell size={18} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gradient-to-r from-pink-500 to-red-500 rounded-full animate-pulse"></span>
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-purple-500/10 py-2 animate-scale-in">
                                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                                    <h3 className="font-semibold text-white">Notifications</h3>
                                    <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded-full">3 new</span>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    <div className="px-4 py-3 hover:bg-white/5 cursor-pointer border-l-2 border-transparent hover:border-purple-500 transition-all">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg flex items-center justify-center">
                                                <Shield size={14} className="text-green-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-white">New intern assigned</p>
                                                <p className="text-xs text-slate-400 mt-0.5">2 minutes ago</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-4 py-3 hover:bg-white/5 cursor-pointer border-l-2 border-transparent hover:border-purple-500 transition-all">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center">
                                                <Mail size={14} className="text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-white">Feedback received</p>
                                                <p className="text-xs text-slate-400 mt-0.5">1 hour ago</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-4 py-3 hover:bg-white/5 cursor-pointer border-l-2 border-transparent hover:border-purple-500 transition-all">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
                                                <Zap size={14} className="text-purple-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-white">System update completed</p>
                                                <p className="text-xs text-slate-400 mt-0.5">3 hours ago</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-4 py-2 border-t border-white/10">
                                    <button className="w-full text-center text-sm text-purple-400 hover:text-purple-300 transition-colors">
                                        View all notifications
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Menu */}
                    <button
                        onClick={() => setShowProfileModal(true)}
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
                </div>
            </header>

            {/* Profile Modal */}
            {showProfileModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowProfileModal(false)}></div>
                    <div className="relative bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-purple-500/20 w-full max-w-md animate-scale-in">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                                    <User size={18} className="text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">My Profile</h2>
                                    <p className="text-xs text-slate-400">Manage your account settings</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowProfileModal(false)}
                                className="p-2 hover:bg-white/5 rounded-xl transition-colors group"
                            >
                                <X size={20} className="text-slate-400 group-hover:text-white transition-colors" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="p-6 space-y-5">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                                    <X size={16} />
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                                    <Shield size={16} />
                                    {success}
                                </div>
                            )}

                            {/* Avatar Section */}
                            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl border border-white/5">
                                <div className="relative">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-40"></div>
                                    <div className="relative w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                                        {getInitials()}
                                    </div>
                                </div>
                                <div>
                                    <p className="font-semibold text-white">{user?.full_name}</p>
                                    <p className="text-sm text-slate-400">{user?.email}</p>
                                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full border ${getRoleBadgeStyle()}`}>
                                        {user?.role}
                                    </span>
                                </div>
                            </div>

                            {/* Form Fields */}
                            <div className="space-y-4">
                                <div className="group">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                                    <div className="relative">
                                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                        <input
                                            type="text"
                                            value={profileData.full_name}
                                            onChange={e => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="group">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                                    <div className="relative">
                                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="email"
                                            value={profileData.email}
                                            disabled
                                            className="w-full pl-12 pr-4 py-3 bg-slate-800/30 border border-slate-700/50 rounded-xl text-slate-400 cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <div className="group">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Department</label>
                                    <input
                                        type="text"
                                        value={profileData.department}
                                        onChange={e => setProfileData(prev => ({ ...prev, department: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Password Section */}
                            <div className="pt-4 border-t border-white/5">
                                <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                                    <Key size={16} className="text-purple-400" />
                                    Change Password
                                </h4>
                                <div className="space-y-3">
                                    <input
                                        type="password"
                                        placeholder="Current Password"
                                        value={profileData.current_password}
                                        onChange={e => setProfileData(prev => ({ ...prev, current_password: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="password"
                                            placeholder="New Password"
                                            value={profileData.new_password}
                                            onChange={e => setProfileData(prev => ({ ...prev, new_password: e.target.value }))}
                                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                        />
                                        <input
                                            type="password"
                                            placeholder="Confirm Password"
                                            value={profileData.confirm_password}
                                            onChange={e => setProfileData(prev => ({ ...prev, confirm_password: e.target.value }))}
                                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowProfileModal(false)}
                                    className="flex-1 px-4 py-3 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors font-medium text-slate-300 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all font-medium disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>

                            {/* Logout */}
                            <button
                                type="button"
                                onClick={logout}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors font-medium border border-red-500/20 hover:border-red-500/40"
                            >
                                <LogOut size={18} />
                                Sign Out
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Header;
