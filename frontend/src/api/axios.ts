import axios from 'axios';
import { supabase } from '../lib/supabase';


const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://localhost:8000'),
    headers: {
        'Content-Type': 'application/json',
    },
});



api.interceptors.request.use(
    async (config) => {
        // Try to get legacy token from localStorage
        let token = localStorage.getItem('token');
        
        // Fallback: Check for Supabase session if legacy token is missing
        if (!token) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                token = session.access_token;
            }
        }

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Handle token expiration or unauthorized access
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
