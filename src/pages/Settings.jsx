import React, { useState, useEffect } from 'react';
import { Building2, Briefcase, Network, Plus, Trash2, Save, Clock, Target, Percent, X } from 'lucide-react';
import DataTable from '../components/DataTable';

const formatTime = (timeStr) => {
    if (!timeStr) return '—';
    let str = String(timeStr);
    if (str.includes('T')) {
        str = str.split('T')[1];
    }
    const parts = str.split(':');
    if (parts.length >= 2) {
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1].slice(0, 2);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // hour '0' should be '12'
        const hoursStr = hours < 10 ? `0${hours}` : hours;
        return `${hoursStr}:${minutes} ${ampm}`;
    }
    return str.slice(0, 5);
};

const Settings = () => {
    const [activeTab, setActiveTab] = useState('branches');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form states
    const [branchForm, setBranchForm] = useState({ name: '', city: '', country: 'Pakistan' });
    const [deptForm, setDeptForm] = useState({ name: '' });
    const [desigForm, setDesigForm] = useState({ name: '', baseSalary: 30000 });
    const [shiftForm, setShiftForm] = useState({ shiftName: '', startTime: '09:00', endTime: '17:00' });
    const [kpiForm, setKpiForm] = useState({ kpiName: '', kpiWeight: 10 });
    const [taxForm, setTaxForm] = useState({ minSalary: '', maxSalary: '', taxPercentage: '' });

    const token = localStorage.getItem('token');
    const authHeaders = { 'Authorization': `Bearer ${token}` };

    const tabConfig = {
        branches:     { endpoint: '/api/lookups/branches' },
        departments:  { endpoint: '/api/lookups/departments' },
        designations: { endpoint: '/api/lookups/designations' },
        shifts:       { endpoint: '/api/shifts' },
        kpis:         { endpoint: '/api/kpis' },
        taxslabs:     { endpoint: '/api/tax-slabs' },
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(tabConfig[activeTab].endpoint, { headers: authHeaders });
            if (res.ok) setData(await res.json());
        } catch (err) { console.error('Fetch failed'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [activeTab]);

    const handleDelete = async (id, idField) => {
        if (!window.confirm(`Delete this ${activeTab.slice(0, -1)}? This cannot be undone.`)) return;
        try {
            const res = await fetch(`${tabConfig[activeTab].endpoint}/${id}`, {
                method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
            });
            const d = await res.json();
            if (res.ok) fetchData();
            else alert(d.message || 'Delete failed.');
        } catch (err) { alert('Delete request failed.'); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let payload;
        if (activeTab === 'branches') payload = branchForm;
        else if (activeTab === 'departments') payload = deptForm;
        else if (activeTab === 'designations') payload = desigForm;
        else if (activeTab === 'shifts') payload = shiftForm;
        else if (activeTab === 'kpis') payload = kpiForm;
        else if (activeTab === 'taxslabs') payload = taxForm;

        try {
            const res = await fetch(tabConfig[activeTab].endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const d = await res.json();
            if (res.ok) {
                setShowModal(false);
                fetchData();
                setBranchForm({ name: '', city: '', country: 'Pakistan' });
                setDeptForm({ name: '' });
                setDesigForm({ name: '', baseSalary: 30000 });
                setShiftForm({ shiftName: '', startTime: '09:00', endTime: '17:00' });
                setKpiForm({ kpiName: '', kpiWeight: 10 });
                setTaxForm({ minSalary: '', maxSalary: '', taxPercentage: '' });
            } else { alert(d.message || 'Save failed'); }
        } catch (err) { alert('Save failed'); }
    };

    const tabs = [
        { id: 'branches',     label: 'Branches',     icon: <Building2 size={16} /> },
        { id: 'departments',  label: 'Departments',  icon: <Network size={16} /> },
        { id: 'designations', label: 'Designations', icon: <Briefcase size={16} /> },
        { id: 'shifts',       label: 'Shifts',       icon: <Clock size={16} /> },
        { id: 'kpis',         label: 'KPIs',         icon: <Target size={16} /> },
        { id: 'taxslabs',     label: 'Tax Slabs',    icon: <Percent size={16} /> },
    ];

    const tabLabel = tabs.find(t => t.id === activeTab)?.label || '';

    return (
        <div className="content-area" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Organization Settings</h2>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Configure lookup tables and system metadata</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} /> Add {tabLabel.slice(0, -1) || 'Entry'}
                </button>
            </div>

            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Branches — card grid */}
            {activeTab === 'branches' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {data.map((item, idx) => (
                        <div key={idx} className="card glass" style={{ position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, right: 0, padding: '12px' }}>
                                <button className="btn glass" style={{ color: 'var(--error)', padding: '6px' }} onClick={() => handleDelete(item.BranchID, 'BranchID')}><Trash2 size={14} /></button>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <h4 style={{ fontWeight: '700' }}>{item.BranchName}</h4>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>ID: #{item.BranchID}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {[['City', item.City], ['Country', item.Country]].map(([k, v]) => (
                                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: 'var(--text-dim)' }}>{k}</span>
                                        <span style={{ fontWeight: '600' }}>{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : activeTab === 'taxslabs' ? (
                /* Tax Slabs — special read-friendly layout */
                <div className="card glass" style={{ overflow: 'hidden' }}>
                    <div style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        These brackets drive <code>dbo.fn_CalculateTax()</code> used in payroll generation.
                    </div>
                    <DataTable
                        containerStyle={{ height: 'auto' }}
                        tableContainerStyle={{ overflow: 'hidden', height: 'auto', background: 'transparent', border: 'none' }}
                        headers={['Slab', 'Min Salary (PKR)', 'Max Salary (PKR)', 'Tax Rate', 'Action']}
                        data={data} loading={loading}
                        renderRow={(item, idx) => (<>
                            <td><div className="status-badge" style={{ fontSize: '0.7rem' }}>Bracket {idx + 1}</div></td>
                            <td>{(item.MinSalary || 0).toLocaleString()}</td>
                            <td>{(item.MaxSalary || 0).toLocaleString()}</td>
                            <td style={{ color: 'var(--warning)', fontWeight: '700' }}>{item.TaxPercentage}%</td>
                            <td><button className="btn glass" style={{ color: 'var(--error)', padding: '6px' }} onClick={() => handleDelete(item.TaxSlabID, 'TaxSlabID')}><Trash2 size={14} /></button></td>
                        </>)}
                    />
                </div>
            ) : activeTab === 'shifts' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
                    {data.map((item, idx) => (
                        <div key={idx} className="card glass" style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 0, right: 0, padding: '12px' }}>
                                <button className="btn glass" style={{ color: 'var(--error)', padding: '6px' }} onClick={() => handleDelete(item.ShiftID, 'ShiftID')}><Trash2 size={14} /></button>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '1rem' }}>
                                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Clock size={22} color="var(--accent)" />
                                </div>
                                <h4 style={{ fontWeight: '700' }}>{item.ShiftName}</h4>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <div style={{ textAlign: 'center', flex: 1 }}>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Start</p>
                                    <p style={{ fontWeight: '700', color: 'var(--primary)', marginTop: '4px' }}>{formatTime(item.StartTime)}</p>
                                </div>
                                <div style={{ width: '1px', background: 'var(--border)' }} />
                                <div style={{ textAlign: 'center', flex: 1 }}>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>End</p>
                                    <p style={{ fontWeight: '700', color: 'var(--primary)', marginTop: '4px' }}>{formatTime(item.EndTime)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : activeTab === 'kpis' ? (
                <div className="card glass" style={{ overflow: 'hidden' }}>
                    <DataTable
                        containerStyle={{ height: 'auto' }}
                        tableContainerStyle={{ overflow: 'hidden', height: 'auto', background: 'transparent', border: 'none' }}
                        headers={['KPI Name', 'Weight', 'Action']}
                        data={data} loading={loading}
                        renderRow={item => (<>
                            <td><div style={{ fontWeight: '600' }}>{item.KPIName}</div></td>
                            <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${Math.min(item.KPIWeight, 100)}%`, background: 'var(--primary)', borderRadius: '3px' }} />
                                    </div>
                                    <span style={{ fontWeight: '700', color: 'var(--primary)', minWidth: '40px' }}>{item.KPIWeight}%</span>
                                </div>
                            </td>
                            <td><button className="btn glass" style={{ color: 'var(--error)', padding: '6px' }} onClick={() => handleDelete(item.KPIID, 'KPIID')}><Trash2 size={14} /></button></td>
                        </>)}
                    />
                </div>
            ) : (
                /* Departments & Designations */
                <div className="card glass" style={{ overflow: 'hidden' }}>
                    <DataTable
                        containerStyle={{ height: 'auto' }}
                        tableContainerStyle={{ overflow: 'hidden', height: 'auto', background: 'transparent', border: 'none' }}
                        headers={activeTab === 'departments' ? ['Department Name', 'Created', 'Action'] : ['Designation', 'Base Salary', 'Action']}
                        data={data} loading={loading}
                        renderRow={item => activeTab === 'departments' ? (<>
                            <td><div style={{ fontWeight: '600' }}>{item.DepartmentName}</div></td>
                            <td>{item.CreatedAt ? new Date(item.CreatedAt).toLocaleDateString() : '—'}</td>
                            <td><button className="btn glass" style={{ color: 'var(--error)', padding: '6px' }} onClick={() => handleDelete(item.DepartmentID, 'DepartmentID')}><Trash2 size={14} /></button></td>
                        </>) : (<>
                            <td><div style={{ fontWeight: '600' }}>{item.DesignationName}</div></td>
                            <td>PKR {(item.BaseSalary || 0).toLocaleString()}</td>
                            <td><button className="btn glass" style={{ color: 'var(--error)', padding: '6px' }} onClick={() => handleDelete(item.DesignationID, 'DesignationID')}><Trash2 size={14} /></button></td>
                        </>)}
                    />
                </div>
            )}

            {/* Add Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="card glass modal-content" style={{ maxWidth: '450px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontWeight: '700' }}>Add {tabLabel.slice(0, -1) || 'Entry'}</h3>
                            <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowModal(false)} />
                        </div>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            {activeTab === 'branches' && (<>
                                <div className="form-group"><label className="form-label">Branch Name</label><input className="form-input" required value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">City</label><input className="form-input" required value={branchForm.city} onChange={e => setBranchForm({ ...branchForm, city: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Country</label><input className="form-input" required value={branchForm.country} onChange={e => setBranchForm({ ...branchForm, country: e.target.value })} /></div>
                            </>)}
                            {activeTab === 'departments' && (
                                <div className="form-group"><label className="form-label">Department Name</label><input className="form-input" required value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} /></div>
                            )}
                            {activeTab === 'designations' && (<>
                                <div className="form-group"><label className="form-label">Designation Title</label><input className="form-input" required value={desigForm.name} onChange={e => setDesigForm({ ...desigForm, name: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Base Salary (PKR)</label><input type="number" className="form-input" required value={desigForm.baseSalary} onChange={e => setDesigForm({ ...desigForm, baseSalary: Number(e.target.value) })} /></div>
                            </>)}
                            {activeTab === 'shifts' && (<>
                                <div className="form-group"><label className="form-label">Shift Name</label><input className="form-input" required placeholder="e.g. Morning Shift" value={shiftForm.shiftName} onChange={e => setShiftForm({ ...shiftForm, shiftName: e.target.value })} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Start Time</label><input type="time" className="form-input" required value={shiftForm.startTime} onChange={e => setShiftForm({ ...shiftForm, startTime: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">End Time</label><input type="time" className="form-input" required value={shiftForm.endTime} onChange={e => setShiftForm({ ...shiftForm, endTime: e.target.value })} /></div>
                                </div>
                            </>)}
                            {activeTab === 'kpis' && (<>
                                <div className="form-group"><label className="form-label">KPI Name</label><input className="form-input" required placeholder="e.g. On-Time Delivery" value={kpiForm.kpiName} onChange={e => setKpiForm({ ...kpiForm, kpiName: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Weight (%)</label><input type="number" className="form-input" required min="1" max="100" value={kpiForm.kpiWeight} onChange={e => setKpiForm({ ...kpiForm, kpiWeight: Number(e.target.value) })} /></div>
                            </>)}
                            {activeTab === 'taxslabs' && (<>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group"><label className="form-label">Min Salary</label><input type="number" className="form-input" required value={taxForm.minSalary} onChange={e => setTaxForm({ ...taxForm, minSalary: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Max Salary</label><input type="number" className="form-input" required value={taxForm.maxSalary} onChange={e => setTaxForm({ ...taxForm, maxSalary: e.target.value })} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">Tax Percentage (%)</label><input type="number" className="form-input" required step="0.01" min="0" max="100" value={taxForm.taxPercentage} onChange={e => setTaxForm({ ...taxForm, taxPercentage: e.target.value })} /></div>
                            </>)}
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}><Save size={16} /> Save</button>
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
