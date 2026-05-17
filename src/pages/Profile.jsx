import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Shield, Calendar, Award, Lock, Edit2, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Popup from '../components/Popup';

const Profile = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [metrics, setMetrics] = useState({ streak: '0 Days', recognition: '+0', efficiency: 'N/A', security: 'Standard' });
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        FirstName: '', LastName: '', Phone: '', Address: '', 
        Gender: 'Male', DOB: '', CNIC: '', Password: ''
    });
    const [popup, setPopup] = useState(null);

    const fetchProfileData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [pRes, mRes] = await Promise.all([
                fetch('/api/profile', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/profile/metrics', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            
            if (pRes.ok) {
                const data = await pRes.json();
                setProfile(data);
                
                // Fetch history for this employee
                const hRes = await fetch(`/api/employees/history/${data.EmployeeID}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (hRes.ok) setHistory(await hRes.json());

                setFormData({ 
                    FirstName: data.FirstName, 
                    LastName: data.LastName, 
                    Phone: data.Phone, 
                    Address: data.Address, 
                    Gender: data.Gender, 
                    DOB: data.DOB ? data.DOB.split('T')[0] : '', 
                    CNIC: data.CNIC, 
                    Password: '' 
                });
            }
            if (mRes.ok) {
                const mData = await mRes.json();
                setMetrics(mData);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchProfileData();
    }, []);

    useEffect(() => {
        if (!profile?.EmployeeID) return;

        const interval = setInterval(async () => {
            try {
                const token = localStorage.getItem('token');
                const [mRes, hRes] = await Promise.all([
                    fetch('/api/profile/metrics', { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`/api/employees/history/${profile.EmployeeID}`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                if (mRes.ok) setMetrics(await mRes.json());
                if (hRes.ok) setHistory(await hRes.json());
            } catch (err) { console.error('Real-time sync failed'); }
        }, 10000);

        return () => clearInterval(interval);
    }, [profile?.EmployeeID]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/profile/update', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setPopup({
                    type: 'success',
                    title: 'Profile Updated!',
                    message: 'Your profile changes have been successfully saved.'
                });
                setIsEditing(false);
                fetchProfileData();
            } else {
                const data = await res.json();
                setPopup({
                    type: 'error',
                    title: 'Update Failed',
                    message: data.message || 'Failed to save profile changes.'
                });
            }
        } catch (err) {
            setPopup({
                type: 'error',
                title: 'Network Error',
                message: 'A network error occurred while updating your profile.'
            });
        }
    };

    if (loading) return <div className="loading">Loading Profile...</div>;

    return (
        <div className="content-area" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Your Professional Identity</h2>
                <button 
                    className={`btn ${isEditing ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => setIsEditing(!isEditing)}
                >
                    {isEditing ? 'Cancel' : <><Edit2 size={18} /> Edit Profile</>}
                </button>
            </div>

            <div className="layout-middle" style={{ alignItems: 'flex-start' }}>
                {/* Profile Card */}
                <div className="card glass" style={{ flex: 1, textAlign: 'center', padding: '3rem 2rem' }}>
                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.5rem' }}>
                        <div style={{ 
                            width: '120px', height: '120px', 
                            borderRadius: '50%', background: 'var(--primary-glow)',
                            border: '4px solid var(--primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '3rem', fontWeight: '800', color: 'var(--primary)',
                            boxShadow: '0 10px 30px rgba(99, 102, 241, 0.3)'
                        }}>
                            {profile.FirstName.charAt(0)}{profile.LastName.charAt(0)}
                        </div>
                        <div style={{ 
                            position: 'absolute', bottom: '5px', right: '5px',
                            background: 'var(--success)', width: '20px', height: '20px',
                            borderRadius: '50%', border: '3px solid var(--bg-card)'
                        }}></div>
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>{profile.FirstName} {profile.LastName}</h3>
                    <p style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.9rem', marginTop: '4px' }}>{profile.DesignationName}</p>
                    <div className="status-badge" style={{ marginTop: '1rem', marginInline: 'auto' }}>
                        {profile.EmployeeCode}
                    </div>
                    
                    <div style={{ marginTop: '2.5rem', display: 'grid', gap: '1rem', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-dim)' }}>
                            <Mail size={18} /> <span>{profile.Email}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-dim)' }}>
                            <Shield size={18} /> <span>{user.role}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-dim)' }}>
                            <Calendar size={18} /> <span>Hired on {new Date(profile.HireDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                {/* Edit / Details Panel */}
                <div className="card glass" style={{ flex: 1.5 }}>
                    <h4 style={{ fontWeight: '700', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Award size={20} color="var(--warning)" /> Career Metrics & Details
                    </h4>

                    {isEditing ? (
                        <form onSubmit={handleUpdate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label className="form-label">First Name</label>
                                <input className="form-input" value={formData.FirstName} onChange={e => setFormData({...formData, FirstName: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name</label>
                                <input className="form-input" value={formData.LastName} onChange={e => setFormData({...formData, LastName: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone Number</label>
                                <input className="form-input" value={formData.Phone} onChange={e => setFormData({...formData, Phone: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Gender</label>
                                <select className="form-input" value={formData.Gender} onChange={e => setFormData({...formData, Gender: e.target.value})}>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date of Birth</label>
                                <input type="date" className="form-input" value={formData.DOB} onChange={e => setFormData({...formData, DOB: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">CNIC / ID</label>
                                <input className="form-input" value={formData.CNIC} onChange={e => setFormData({...formData, CNIC: e.target.value})} />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Residential Address</label>
                                <textarea className="form-input" style={{ minHeight: '60px' }} value={formData.Address} onChange={e => setFormData({...formData, Address: e.target.value})} />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Update Security Password (Leave blank to keep same)</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                    <input 
                                        type="password"
                                        className="form-input" 
                                        style={{ paddingLeft: '44px' }}
                                        placeholder="Enter new password..."
                                        onChange={e => setFormData({...formData, Password: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsEditing(false)}>Cancel</button>
                            </div>
                        </form>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Department</p>
                                <p style={{ fontWeight: '600', marginTop: '4px' }}>{profile.DepartmentName}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Branch</p>
                                <p style={{ fontWeight: '600', marginTop: '4px' }}>{profile.BranchName}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Gender</p>
                                <p style={{ fontWeight: '600', marginTop: '4px' }}>{profile.Gender}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Date of Birth</p>
                                <p style={{ fontWeight: '600', marginTop: '4px' }}>{new Date(profile.DOB).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>CNIC / ID</p>
                                <p style={{ fontWeight: '600', marginTop: '4px' }}>{profile.CNIC}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Phone</p>
                                <p style={{ fontWeight: '600', marginTop: '4px' }}>{profile.Phone}</p>
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Address</p>
                                <p style={{ fontWeight: '600', marginTop: '4px' }}>{profile.Address}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Basic Salary</p>
                                <p style={{ fontWeight: '600', marginTop: '4px', color: 'var(--success)' }}>${profile.BasicSalary?.toLocaleString()}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Achievement Ledger - Unique Feature */}
            <div className="card glass">
                <h4 style={{ fontWeight: '700', marginBottom: '1.5rem' }}>System Engagement Ledger</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Attendance Streak</p>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '8px' }}>{metrics.streak}</h3>
                    </div>
                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Peer Recognition</p>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '8px' }}>{metrics.recognition}</h3>
                    </div>
                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Efficiency Rating</p>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '8px', color: 'var(--success)' }}>{metrics.efficiency}</h3>
                    </div>
                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Security Level</p>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '8px' }}>{metrics.security}</h3>
                    </div>
                </div>
            </div>

            {/* Career Audit Trail - Utilizing DB Triggers */}
            <div className="card glass">
                <h4 style={{ fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Shield size={20} color="var(--primary)" /> Career Evolution & Audit Trail
                </h4>
                {history.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {history.map((h, i) => (
                            <div key={i} style={{ 
                                padding: '1.5rem', 
                                background: 'rgba(255,255,255,0.02)', 
                                borderRadius: '12px', 
                                border: '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '4px' }}>
                                        {h.OldDept} → {h.NewDept || h.OldDept}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                        {h.OldDesig} → {h.NewDesig || h.OldDesig}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '8px', fontStyle: 'italic' }}>
                                        Reason: {h.Reason}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>{new Date(h.ChangeDate).toLocaleDateString()}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Verified by System</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                        Your professional path is currently stable. Any future promotions or transfers will be logged here.
                    </p>
                )}
            </div>
            {popup && <Popup {...popup} onClose={() => setPopup(null)} />}
        </div>
    );
};

export default Profile;
