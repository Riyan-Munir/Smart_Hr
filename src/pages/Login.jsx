import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogIn } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            if (res.ok) {
                login(data.user, data.token);
                navigate('/dashboard');
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            setError('Connection error. Is the server running?');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ background: 'var(--bg)' }}>
            <div className="card glass modal-content" style={{ maxWidth: '480px', width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ 
                        background: 'var(--primary-glow)', 
                        width: '60px', height: '60px', 
                        borderRadius: '50%', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1rem',
                        border: '1px solid var(--primary)'
                    }}>
                        <ShieldCheck size={32} color="var(--primary)" />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>SmartHR+</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Enterprise HR Management</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input 
                            type="password" 
                            className="form-input" 
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <div style={{ color: 'var(--error)', fontSize: '0.8rem', marginBottom: '1rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        className="btn btn-primary" 
                        style={{ width: '100%', marginTop: '1rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Authenticating...' : <><LogIn size={18} /> Sign In</>}
                    </button>
                </form>

                <p style={{ 
                    textAlign: 'center', 
                    marginTop: '1.5rem', 
                    fontSize: '0.8rem', 
                    color: 'var(--text-dim)' 
                }}>
                    Want to work with us? <span 
                        style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}
                        onClick={() => navigate('/apply')}
                    >Join our team</span>
                </p>
            </div>
        </div>
    );
};

export default Login;
