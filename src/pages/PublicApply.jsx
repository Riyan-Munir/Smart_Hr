import React, { useState, useEffect } from 'react';
import { Send, CheckCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import CustomSelect from '../components/CustomSelect';

const PublicApply = () => {
    const [form, setForm] = useState({ 
        firstName: '', lastName: '', email: '', phone: '', 
        gender: 'Male', dob: '', cnic: '', address: '',
        position: '', proposalText: '', desiredRoleID: null 
    });
    const [errors, setErrors] = useState({
        firstName: null, lastName: null, email: null, phone: null, 
        position: null, desiredRoleID: null, proposalText: null, server: null
    });
    const [roles, setRoles] = useState([]);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const res = await fetch('/api/public/roles');
                if (res.ok) setRoles(await res.json());
            } catch (err) { console.error('Roles fetch failed'); }
        };
        fetchRoles();
    }, []);

    const validate = () => {
        const newErrors = {
            firstName: null, lastName: null, email: null, phone: null, 
            position: null, desiredRoleID: null, proposalText: null, server: null
        };
        const hasErrors = !form.firstName || !form.lastName || !form.email || !form.phone || !form.position || !form.desiredRoleID || !form.proposalText || !/\S+@\S+\.\S+/.test(form.email);
        if (!form.firstName) newErrors.firstName = 'First name is required';
        if (!form.lastName) newErrors.lastName = 'Last name is required';
        if (!form.email) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Invalid email format';
        if (!form.phone) newErrors.phone = 'Phone number is required';
        if (!form.position) newErrors.position = 'Position is required';
        if (!form.desiredRoleID) newErrors.desiredRoleID = 'Please select a role';
        if (!form.proposalText) newErrors.proposalText = 'Proposal text is required';
        
        setErrors(newErrors);
        return !hasErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            const res = await fetch('/api/public/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) setSubmitted(true);
            else {
                const data = await res.json();
                setErrors(prev => ({ ...prev, server: data.message || 'Submission failed' }));
            }
        } catch (err) { alert('Submission failed'); }
        finally { setLoading(false); }
    };

    if (submitted) {
        return (
            <div className="modal-overlay" style={{ background: 'var(--bg)' }}>
                <div className="card glass" style={{ maxWidth: '450px', textAlign: 'center', padding: '3rem' }}>
                    <CheckCircle size={64} color="var(--success)" style={{ marginBottom: '1.5rem' }} />
                    <h2 style={{ marginBottom: '1rem' }}>Application Sent!</h2>
                    <p style={{ color: 'var(--text-dim)', marginBottom: '2rem' }}>
                        Thank you for your interest in SmartHR+. Our recruitment team will review your profile and get back to you soon.
                    </p>
                    <button className="btn btn-primary" onClick={() => navigate('/login')}>Return to Login</button>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" style={{ background: 'var(--bg)', overflow: 'hidden' }}>
            <div className="card glass no-scrollbar" style={{ 
                width: '100%', 
                maxWidth: '700px', 
                maxHeight: '90vh', 
                overflowY: 'auto',
                margin: 'auto' 
            }}>
                <div style={{ marginBottom: '2rem' }}>
                    <button className="btn btn-secondary" onClick={() => navigate('/login')} style={{ marginBottom: '1.5rem', padding: '8px 12px' }}>
                        <ArrowLeft size={16} /> Back
                    </button>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Join SmartHR+</h1>
                    <p style={{ color: 'var(--text-dim)' }}>Start your journey with the world's most intelligent HR platform.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label className="form-label">First Name</label>
                        <input 
                            className={`form-input ${errors.firstName ? 'error' : ''}`} 
                            required 
                            onChange={e => {
                                setForm({...form, firstName: e.target.value});
                                if (errors.firstName) setErrors(prev => ({...prev, firstName: null}));
                            }} 
                        />
                        {errors.firstName && <span className="field-error">{errors.firstName}</span>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Last Name</label>
                        <input 
                            className={`form-input ${errors.lastName ? 'error' : ''}`} 
                            required 
                            onChange={e => {
                                setForm({...form, lastName: e.target.value});
                                if (errors.lastName) setErrors(prev => ({...prev, lastName: null}));
                            }} 
                        />
                        {errors.lastName && <span className="field-error">{errors.lastName}</span>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input 
                            className={`form-input ${errors.email ? 'error' : ''}`} 
                            type="email" 
                            required 
                            onChange={e => {
                                setForm({...form, email: e.target.value});
                                if (errors.email) setErrors(prev => ({...prev, email: null}));
                            }} 
                        />
                        {errors.email && <span className="field-error">{errors.email}</span>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Phone Number</label>
                        <input 
                            className={`form-input ${errors.phone ? 'error' : ''}`} 
                            type="tel" 
                            required 
                            onChange={e => {
                                setForm({...form, phone: e.target.value});
                                if (errors.phone) setErrors(prev => ({...prev, phone: null}));
                            }} 
                        />
                        {errors.phone && <span className="field-error">{errors.phone}</span>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Gender</label>
                        <select 
                            className="form-input" 
                            value={form.gender}
                            onChange={e => setForm({...form, gender: e.target.value})}
                        >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Date of Birth</label>
                        <input 
                            type="date"
                            className="form-input" 
                            required
                            onChange={e => setForm({...form, dob: e.target.value})}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">CNIC / National ID</label>
                        <input 
                            className="form-input" 
                            placeholder="e.g. 42101-XXXXXXX-X"
                            required
                            onChange={e => setForm({...form, cnic: e.target.value})}
                        />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Residential Address</label>
                        <textarea 
                            className="form-input" 
                            style={{ minHeight: '60px' }}
                            required
                            onChange={e => setForm({...form, address: e.target.value})}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Position Applied For</label>
                        <input 
                            className={`form-input ${errors.position ? 'error' : ''}`} 
                            placeholder="e.g. Senior Software Engineer" 
                            required 
                            onChange={e => {
                                setForm({...form, position: e.target.value});
                                if (errors.position) setErrors(prev => ({...prev, position: null}));
                            }} 
                        />
                        {errors.position && <span className="field-error">{errors.position}</span>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Desired System Role</label>
                        <CustomSelect 
                            options={roles} 
                            value={form.desiredRoleID} 
                            placeholder="Select a role..."
                            labelKey="RoleName"
                            valueKey="RoleID"
                            onChange={val => {
                                setForm({...form, desiredRoleID: val});
                                setErrors(prev => ({...prev, desiredRoleID: null}));
                            }}
                        />
                        {errors.desiredRoleID && <span className="field-error">{errors.desiredRoleID}</span>}
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Proposal / Why should we hire you?</label>
                        <textarea 
                            className={`form-input ${errors.proposalText ? 'error' : ''}`} 
                            style={{ minHeight: '120px', resize: 'vertical' }} 
                            required 
                            onChange={e => {
                                setForm({...form, proposalText: e.target.value});
                                if (errors.proposalText) setErrors(prev => ({...prev, proposalText: null}));
                            }} 
                        />
                        {errors.proposalText && <span className="field-error">{errors.proposalText}</span>}
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" className="form-checkbox" id="terms" required />
                        <label htmlFor="terms" style={{ fontSize: '0.85rem', color: 'var(--text-dim)', cursor: 'pointer' }}>
                            I agree to the processing of my personal data for recruitment purposes
                        </label>
                    </div>
                    {errors.server && <div className="form-group" style={{ gridColumn: 'span 2' }}><span className="field-error" style={{ textAlign: 'center' }}>{errors.server}</span></div>}
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <button className="btn btn-primary" style={{ width: '100%', padding: '14px' }} disabled={loading}>
                            {loading ? 'Submitting...' : <><Send size={18} /> Submit Application</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PublicApply;
