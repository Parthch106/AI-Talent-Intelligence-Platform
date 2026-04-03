import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import { useAuth } from './AuthContext';

interface Intern {
    id: number;
    email: string;
    full_name: string | null;
    department: string | null;
}

interface MonitoringContextType {
    selectedInternId: number | null;
    setSelectedInternId: (id: number | null) => void;
    interns: Intern[];
    loadingInterns: boolean;
    refreshInterns: () => Promise<void>;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined);

export const MonitoringProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [selectedInternId, setSelectedInternIdState] = useState<number | null>(null);
    const [interns, setInterns] = useState<Intern[]>([]);
    const [loadingInterns, setLoadingInterns] = useState(false);

    // Persistence key
    const STORAGE_KEY = `selected_intern_id_${user?.id}`;

    // Update state and persistence
    const setSelectedInternId = (id: number | null) => {
        setSelectedInternIdState(id);
        if (id) {
            localStorage.setItem(STORAGE_KEY, id.toString());
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    };

    const refreshInterns = useCallback(async () => {
        if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
            setInterns([]);
            return;
        }

        setLoadingInterns(true);
        try {
            const response = await axios.get('/accounts/users/', {
                params: { 
                    role: 'INTERN', 
                    department: user.role === 'MANAGER' ? user.department : undefined 
                }
            });
            const data = Array.isArray(response.data) ? response.data : response.data.results || [];
            setInterns(data);

            // Handle initial selection
            const savedId = localStorage.getItem(STORAGE_KEY);
            if (savedId) {
                const parsedId = parseInt(savedId);
                // Verify the saved ID still exists in the fetched list
                if (data.some((i: Intern) => i.id === parsedId)) {
                    setSelectedInternIdState(parsedId);
                } else if (data.length > 0) {
                    setSelectedInternId(data[0].id);
                }
            } else if (data.length > 0 && !selectedInternId) {
                setSelectedInternId(data[0].id);
            }
        } catch (err) {
            console.error('[MonitoringContext] Error fetching interns:', err);
        } finally {
            setLoadingInterns(false);
        }
    }, [user, STORAGE_KEY]);

    useEffect(() => {
        refreshInterns();
    }, [refreshInterns]);

    return (
        <MonitoringContext.Provider value={{ 
            selectedInternId, 
            setSelectedInternId, 
            interns, 
            loadingInterns, 
            refreshInterns 
        }}>
            {children}
        </MonitoringContext.Provider>
    );
};

export const useMonitoring = () => {
    const context = useContext(MonitoringContext);
    if (context === undefined) {
        throw new Error('useMonitoring must be used within a MonitoringProvider');
    }
    return context;
};
