import axios from 'axios';


const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://localhost:8000'),
    headers: {
        'Content-Type': 'application/json',
    },
});



api.interceptors.request.use(
    async (config) => {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
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
