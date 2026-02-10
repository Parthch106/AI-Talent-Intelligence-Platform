import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await api.post('/accounts/auth/login', { email, password });
            const { access, user } = response.data;
            login(access, user);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Login failed');
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div className="card" style={{ width: '400px' }}>
                <h2>Login</h2>
                {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'white' }}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'white' }}
                            required
                        />
                    </div>
                    <button type="submit" style={{ width: '100%', padding: '0.75rem', background: 'var(--primary-color)', color: 'white', border: 'none', cursor: 'pointer' }}>
                        Login
                    </button>
                </form>
                <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
                    Don't have an account? <a href="/register" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>Register here</a>
                </div>
            </div>
        </div>
    );
};

export default Login;
