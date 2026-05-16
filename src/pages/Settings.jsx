import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Building2, Briefcase, Network, Plus, Trash2, Save } from 'lucide-react';
import DataTable from '../components/DataTable';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('branches');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    
    // Form states
    const [branchForm, setBranchForm] = useState({ name: '', city: '', country: 'Pakistan' });
    const [deptForm, setDeptForm] = useState({ name: '' });
    const [desigForm, setDesigForm] = useState({ name: '', baseSalary: 30000 });

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/lookups/${activeTab}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setData(await res.json());
        } catch (err) { console.error('Fetch failed'); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = activeTab === 'branches' ? branchForm : activeTab === 'departments' ? deptForm : desigForm;
        try {
            const res = await fetch(`/api/lookups/${activeTab}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setShowModal(false);
                fetchData();
                // Reset forms
                setBranchForm({ name: '', city: '', country: 'Pakistan' });
                setDeptForm({ name: '' });
                setDesigForm({ name: '', baseSalary: 30000 });
            }
        } catch (err) { alert('Save failed'); }
    };

    const tabs = [
        { id: 'branches', label: 'Branches', icon: <Building2 size={18} /> },
        { id: 'departments', label: 'Departments', icon: <Network size={18} /> },
        { id: 'designations', label: 'Designations', icon: <Briefcase size={18} /> }
    ];

    const getHeaders = () => {
        if (activeTab === 'branches') return ['Branch Name', 'City', 'Country', 'Actions'];
        if (activeTab === 'departments') return ['Department Name', 'Created', 'Actions'];
        return ['Designation', 'Base Salary', 'Actions'];
    };

    const renderRow = (item) => {
        if (activeTab === 'branches') return (
            <>
                <td><div style={{ fontWeight: '600' }}>{item.BranchName}</div></td>
                <td>{item.City}</td>
                <td>{item.Country}</td>
                <td><button className="btn glass" style={{ color: 'var(--error)' }}><Trash2 size={14} /></button></td>
            </>
        );
        if (activeTab === 'departments') return (
            <>
                <td><div style={{ fontWeight: '600' }}>{item.DepartmentName}</div></td>
                <td>{new Date(item.CreatedAt).toLocaleDateString()}</td>
                <td><button className="btn glass" style={{ color: 'var(--error)' }}><Trash2 size={14} /></button></td>
            </>
        );
        return (
            <>
                <td><div style={{ fontWeight: '600' }}>{item.DesignationName}</div></td>
                <td>PKR {item.BaseSalary?.toLocaleString() || '0'}</td>
                <td><button className="btn glass" style={{ color: 'var(--error)' }}><Trash2 size={14} /></button></td>
            </>
        );
    };

    return (
        <div className="content-area" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Organization Settings</h2>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Configure lookup tables and system metadata</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} /> Add New {activeTab.slice(0, -1)}
                </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px' }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'branches' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {data.map((item, idx) => (
                        <div key={idx} className="card glass" style={{ position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, right: 0, padding: '12px' }}>
                                <button className="btn glass" style={{ color: 'var(--error)', padding: '6px' }}><Trash2 size={14} /></button>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
                                <div style={{ 
                                    width: '48px', height: '48px', borderRadius: '12px', 
                                    background: 'var(--primary-glow)', display: 'flex', 
                                    alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
                                }}>
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <h4 style={{ fontWeight: '700', fontSize: '1.1rem' }}>{item.BranchName}</h4>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>ID: #{item.BranchID}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-dim)' }}>City</span>
                                    <span style={{ fontWeight: '600' }}>{item.City}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-dim)' }}>Country</span>
                                    <span style={{ fontWeight: '600' }}>{item.Country}</span>
                                </div>
                            </div>
                            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="status-badge" style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                                    Operational
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Active Node</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card glass" style={{ flex: 1 }}>
                    <DataTable 
                        headers={getHeaders()}
                        data={data}
                        renderRow={renderRow}
                        loading={loading}
                    />
                </div>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="card glass modal-content" style={{ maxWidth: '450px' }}>
                        <h3 className="modal-title">Create New {activeTab.slice(0, -1)}</h3>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {activeTab === 'branches' && (
                                <>
                                    <div className="form-group"><label className="form-label">Branch Name</label><input className="form-input" required value={branchForm.name} onChange={e => setBranchForm({...branchForm, name: e.target.value})} /></div>
                                    <div className="form-group"><label className="form-label">City</label><input className="form-input" required value={branchForm.city} onChange={e => setBranchForm({...branchForm, city: e.target.value})} /></div>
                                    <div className="form-group"><label className="form-label">Country</label><input className="form-input" required value={branchForm.country} onChange={e => setBranchForm({...branchForm, country: e.target.value})} /></div>
                                </>
                            )}
                            {activeTab === 'departments' && (
                                <div className="form-group"><label className="form-label">Department Name</label><input className="form-input" required value={deptForm.name} onChange={e => setDeptForm({...deptForm, name: e.target.value})} /></div>
                            )}
                            {activeTab === 'designations' && (
                                <>
                                    <div className="form-group"><label className="form-label">Designation Title</label><input className="form-input" required value={desigForm.name} onChange={e => setDesigForm({...desigForm, name: e.target.value})} /></div>
                                    <div className="form-group"><label className="form-label">Base Salary</label><input type="number" className="form-input" required value={desigForm.baseSalary} onChange={e => setDesigForm({...desigForm, baseSalary: Number(e.target.value)})} /></div>
                                </>
                            )}
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}><Save size={18} /> Save Entry</button>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
