import axios from 'axios';
import axiosRetry from 'axios-retry';
import { encryptPayload, decryptPayload } from '../utils/payloadEncryption';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://localhost:8000'),
    headers: {
        'Content-Type': 'application/json',
    },
});

// Configure automatic retries for idempotent requests (network errors or 5xx)
axiosRetry(api, {
    retries: 3, // Number of retries
    retryDelay: axiosRetry.exponentialDelay, // Exponential backoff (100ms, 200ms, 400ms...)
    retryCondition: (error) => {
        // Retry on network errors or 5xx status codes
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 500 || error.response?.status === 502 || error.response?.status === 503;
    }
});

api.interceptors.request.use(
    async (config) => {
        // Get token from localStorage or sessionStorage
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Global Payload Encryption (AES-GCM)
        config.headers['X-Accept-Encrypted'] = 'true';

        if (config.data && !(config.data instanceof FormData)) {
            try {
                const jsonString = typeof config.data === 'string' ? config.data : JSON.stringify(config.data);
                const encrypted = await encryptPayload(jsonString);
                config.data = { encryptedData: encrypted };
                config.headers['X-Encrypted'] = 'true';
                config.headers['Content-Type'] = 'application/json';
            } catch (err) {
                console.error("Failed to encrypt request payload:", err);
            }
        }
        
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    async (response) => {
        const isEncrypted = response.headers && (response.headers['x-encrypted'] === 'true' || response.headers['X-Encrypted'] === 'true');
        if (isEncrypted && response.data && response.data.encryptedData) {
            try {
                const decryptedJson = await decryptPayload(response.data.encryptedData);
                response.data = JSON.parse(decryptedJson);
            } catch (err) {
                console.error("Failed to decrypt response payload:", err);
            }
        }
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            // Handle token expiration or unauthorized access
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
