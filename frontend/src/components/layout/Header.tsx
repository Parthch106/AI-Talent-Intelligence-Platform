import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, X, User, LogOut, ChevronDown, Key, Mail } from 'lucide-react';
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

    const getRoleBadgeColor = () => {
        switch (user?.role) {
            case 'ADMIN':
                return 'bg-purple-100 text-purple-700';
            case 'MANAGER':
                return 'bg-blue-100 text-blue-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <>
            <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30">
                {/* Page Title - Can be dynamic based on route */}
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-gray-800">
                        Welcome back, {user?.full_name?.split(' ')[0] || 'User'}
                    </h2>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor()}`}>
                        {user?.role}
                    </span>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-4">
                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            <Bell size={20} />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 py-2 animate-modal-enter">
                                <div className="px-4 py-2 border-b border-gray-100">
                                    <h3 className="font-semibold text-gray-800">Notifications</h3>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                                        <p className="text-sm text-gray-800">No new notifications</p>
                                        <p className="text-xs text-gray-500 mt-1">You're all caught up!</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Menu */}
                    <button
                        onClick={() => setShowProfileModal(true)}
                        className="flex items-center gap-3 pl-4 pr-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
                    >
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-800">{user?.full_name || 'User'}</p>
                            <p className="text-xs text-gray-500">{user?.email}</p>
                        </div>
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-md">
                            {getInitials()}
                        </div>
                        <ChevronDown size={16} className="text-gray-400" />
                    </button>
                </div>
            </header>

            {/* Profile Modal */}
            {showProfileModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowProfileModal(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-modal-enter">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <h2 className="text-xl font-bold text-gray-800">My Profile</h2>
                            <button
                                onClick={() => setShowProfileModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
                                    {success}
                                </div>
                            )}

                            {/* Avatar Section */}
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                                    {getInitials()}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800">{user?.full_name}</p>
                                    <p className="text-sm text-gray-500">{user?.email}</p>
                                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeColor()}`}>
                                        {user?.role}
                                    </span>
                                </div>
                            </div>

                            {/* Form Fields */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <div className="relative">
                                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={profileData.full_name}
                                        onChange={e => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <div className="relative">
                                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="email"
                                        value={profileData.email}
                                        disabled
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <input
                                    type="text"
                                    value={profileData.department}
                                    onChange={e => setProfileData(prev => ({ ...prev, department: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Password Section */}
                            <div className="pt-4 border-t border-gray-100">
                                <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                                    <Key size={16} />
                                    Change Password
                                </h4>
                                <div className="space-y-3">
                                    <input
                                        type="password"
                                        placeholder="Current Password"
                                        value={profileData.current_password}
                                        onChange={e => setProfileData(prev => ({ ...prev, current_password: e.target.value }))}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="password"
                                            placeholder="New Password"
                                            value={profileData.new_password}
                                            onChange={e => setProfileData(prev => ({ ...prev, new_password: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <input
                                            type="password"
                                            placeholder="Confirm Password"
                                            value={profileData.confirm_password}
                                            onChange={e => setProfileData(prev => ({ ...prev, confirm_password: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowProfileModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all font-medium disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>

                            {/* Logout */}
                            <button
                                type="button"
                                onClick={logout}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
                            >
                                <LogOut size={18} />
                                Sign Out
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* CSS for animation */}
            <style>{`
        @keyframes modal-enter {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-modal-enter {
          animation: modal-enter 0.2s ease-out;
        }
      `}</style>
        </>
    );
};

export default Header;
