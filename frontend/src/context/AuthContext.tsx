import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    id: number | string;
    email: string;
    role: string;
    full_name?: string;
    department?: string;
    is_profile_complete?: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User, rememberMe?: boolean) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    // Check both localStorage (remember me) and sessionStorage (session only)
    const [token, setToken] = useState<string | null>(
        localStorage.getItem('token') || sessionStorage.getItem('token')
    );

    useEffect(() => {
        // Check both storages for persisted user
        const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (token && storedUser) {
            try {
                // Decode base64 stored user data
                const decodedUser = decodeURIComponent(atob(storedUser));
                setUser(JSON.parse(decodedUser));
            } catch (e) {
                console.error("Failed to parse user from storage", e);
                // Fallback for pre-existing unencoded data
                try {
                    setUser(JSON.parse(storedUser));
                } catch (e2) {
                    console.error("Failed fallback parse", e2);
                }
            }
        }
    }, [token]);

    const login = React.useCallback((newToken: string, newUser: User, rememberMe = false) => {
        // Encode user data to prevent plaintext JSON in DevTools
        const encodedUser = btoa(encodeURIComponent(JSON.stringify(newUser)));
        
        if (rememberMe) {
            // Persist across browser sessions
            localStorage.setItem('token', newToken);
            localStorage.setItem('user', encodedUser);
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
        } else {
            // Clear when tab/browser closes
            sessionStorage.setItem('token', newToken);
            sessionStorage.setItem('user', encodedUser);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        sessionStorage.removeItem('profile_completion_toast_shown');
        setToken(newToken);
        setUser(newUser);
    }, []);

    const logout = React.useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('profile_completion_toast_shown');
        setToken(null);
        setUser(null);
    }, []);

    const contextValue = React.useMemo(() => ({
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token || !!user
    }), [user, token, login, logout]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
