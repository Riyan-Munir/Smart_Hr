import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

const Popup = ({ type = 'success', title, message, onClose }) => {
    if (!message) return null;

    const icons = {
        success: <CheckCircle size={48} color="var(--success)" style={{ filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.3))' }} />,
        error: <XCircle size={48} color="var(--error)" style={{ filter: 'drop-shadow(0 0 10px rgba(239,68,68,0.3))' }} />,
        warning: <AlertCircle size={48} color="var(--warning)" style={{ filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.3))' }} />,
        info: <Info size={48} color="var(--primary)" style={{ filter: 'drop-shadow(0 0 10px rgba(99,102,241,0.3))' }} />
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="card glass animate-slide-up" style={{ 
                maxWidth: '400px', 
                width: '90%', 
                textAlign: 'center', 
                padding: '2.5rem', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '1.25rem',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                margin: 'auto'
            }}>
                <div style={{ marginBottom: '0.25rem' }}>
                    {icons[type]}
                </div>
                <h3 style={{ fontWeight: '800', fontSize: '1.3rem', color: 'var(--text)', margin: 0 }}>
                    {title || (type === 'success' ? 'Success!' : type === 'error' ? 'Error!' : 'Notice')}
                </h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: '1.6', margin: 0 }}>
                    {message}
                </p>
                <button 
                    className="btn btn-primary" 
                    onClick={onClose} 
                    style={{ width: '100%', padding: '10px', marginTop: '0.5rem', fontWeight: '600' }}
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
};

export default Popup;
