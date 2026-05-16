import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import CustomSelect from '../components/CustomSelect';
import { CreditCard, DollarSign, Download, Play, CheckCircle, Clock, Gift, Minus, Layers, TrendingDown, Trash2, Plus, Save } from 'lucide-react';

// ─── Bonus / Deduction shared modal ──────────────────────────────────────────
const AddEntryModal = ({ type, employees, onClose, onSaved }) => {
    const [form, setForm] = useState({ employeeID: '', label: '', amount: '' });
    const [saving, setSaving] = useState(false);

    const labelPlaceholder = type === 'bonus' ? 'e.g. Performance Bonus' : 'e.g. Loan Repayment';
    const endpoint = type === 'bonus' ? '/api/bonuses' : '/api/deductions';
    const bodyKey = type === 'bonus'
        ? { employeeID: form.employeeID, bonusType: form.label, bonusAmount: parseFloat(form.amount) }
        : { employeeID: form.employeeID, deductionType: form.label, deductionAmount: parseFloat(form.amount) };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify(bodyKey)
            });
            if (res.ok) { onSaved(); onClose(); }
            else { const d = await res.json(); alert(d.message); }
        } finally { setSaving(false); }
    };

    return (
        <div className="modal-overlay">
            <div className="card glass modal-content" style={{ maxWidth: '420px' }}>
                <h3 className="modal-title">Add {type === 'bonus' ? 'Bonus' : 'Deduction'}</h3>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div className="form-group">
                        <label className="form-label">Employee</label>
                        <CustomSelect
                            options={employees}
                            value={form.employeeID}
                            placeholder="Select Employee"
                            labelKey="EmployeeName"
                            valueKey="EmployeeID"
                            onChange={v => setForm({ ...form, employeeID: v })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{type === 'bonus' ? 'Bonus Type' : 'Deduction Type'}</label>
                        <input className="form-input" placeholder={labelPlaceholder} required value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Amount (PKR)</label>
                        <input className="form-input" type="number" required min="1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Salary Structure Modal ───────────────────────────────────────────────────
const SalaryStructureModal = ({ employees, onClose, onSaved }) => {
    const [form, setForm] = useState({ employeeID: '', basicSalary: '', houseAllowance: '', medicalAllowance: '', transportAllowance: '' });
    const [saving, setSaving] = useState(false);

    const handleEmpChange = async (empID) => {
        setForm(f => ({ ...f, employeeID: empID }));
        const res = await fetch(`/api/salary-structure/${empID}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        if (res.ok) {
            const data = await res.json();
            if (data) setForm({ employeeID: empID, basicSalary: data.BasicSalary, houseAllowance: data.HouseAllowance, medicalAllowance: data.MedicalAllowance, transportAllowance: data.TransportAllowance });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/salary-structure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ employeeID: form.employeeID, basicSalary: parseFloat(form.basicSalary), houseAllowance: parseFloat(form.houseAllowance) || 0, medicalAllowance: parseFloat(form.medicalAllowance) || 0, transportAllowance: parseFloat(form.transportAllowance) || 0 })
            });
            if (res.ok) { onSaved(); onClose(); }
            else { const d = await res.json(); alert(d.message); }
        } finally { setSaving(false); }
    };

    return (
        <div className="modal-overlay">
            <div className="card glass modal-content" style={{ maxWidth: '500px' }}>
                <h3 className="modal-title">Set Salary Structure</h3>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Employee</label>
                        <CustomSelect options={employees} value={form.employeeID} placeholder="Select Employee" labelKey="EmployeeName" valueKey="EmployeeID" onChange={handleEmpChange} />
                    </div>
                    {[['basicSalary', 'Basic Salary'], ['houseAllowance', 'House Allowance'], ['medicalAllowance', 'Medical Allowance'], ['transportAllowance', 'Transport Allowance']].map(([key, label]) => (
                        <div key={key} className="form-group">
                            <label className="form-label">{label}</label>
                            <input className="form-input" type="number" min="0" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
                        </div>
                    ))}
                    <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem' }}>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving || !form.employeeID}><Save size={16} /> {saving ? 'Saving...' : 'Save Structure'}</button>
                        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Main Payroll Page ────────────────────────────────────────────────────────
const Payroll = () => {
    const [activeTab, setActiveTab] = useState('history');
    const [payrolls, setPayrolls] = useState([]);
    const [bonuses, setBonuses] = useState([]);
    const [deductions, setDeductions] = useState([]);
    const [salaryStructures, setSalaryStructures] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [showModal, setShowModal] = useState(null); // 'bonus' | 'deduction' | 'salary'
    const [summary, setSummary] = useState({ total: 0, count: 0 });

    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [pRes, bRes, dRes, ssRes, eRes] = await Promise.all([
                fetch('/api/payroll/history', { headers }),
                fetch('/api/bonuses', { headers }),
                fetch('/api/deductions', { headers }),
                fetch('/api/salary-structure', { headers }),
                fetch('/api/employees', { headers })
            ]);
            const [pData, bData, dData, ssData, eData] = await Promise.all([pRes.json(), bRes.json(), dRes.json(), ssRes.json(), eRes.json()]);
            setPayrolls(Array.isArray(pData) ? pData : []);
            setBonuses(Array.isArray(bData) ? bData : []);
            setDeductions(Array.isArray(dData) ? dData : []);
            setSalaryStructures(Array.isArray(ssData) ? ssData : []);
            const empList = Array.isArray(eData) ? eData.map(e => ({ ...e, EmployeeName: `${e.FirstName} ${e.LastName}` })) : [];
            setEmployees(empList);
            setSummary({ total: (Array.isArray(pData) ? pData : []).reduce((s, p) => s + (p.NetSalary || 0), 0), count: (Array.isArray(pData) ? pData : []).length });
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleGeneratePayroll = async () => {
        const now = new Date();
        setGenerating(true);
        try {
            const res = await fetch('/api/payroll/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ month: now.getMonth() + 1, year: now.getFullYear() })
            });
            if (res.ok) { alert('Payroll generated via sp_GenerateMonthlyPayroll!'); fetchAll(); }
            else { const d = await res.json(); alert(`Error: ${d.message}`); }
        } finally { setGenerating(false); }
    };

    const handleDelete = async (endpoint, id) => {
        if (!window.confirm('Remove this entry?')) return;
        await fetch(`${endpoint}/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        fetchAll();
    };

    const tabs = [
        { id: 'history', label: 'Payroll History', icon: <CreditCard size={16} /> },
        { id: 'bonuses', label: 'Bonuses', icon: <Gift size={16} /> },
        { id: 'deductions', label: 'Deductions', icon: <TrendingDown size={16} /> },
        { id: 'salary', label: 'Salary Structure', icon: <Layers size={16} /> },
    ];

    return (
        <div className="content-area" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {showModal === 'bonus' && <AddEntryModal type="bonus" employees={employees} onClose={() => setShowModal(null)} onSaved={fetchAll} />}
            {showModal === 'deduction' && <AddEntryModal type="deduction" employees={employees} onClose={() => setShowModal(null)} onSaved={fetchAll} />}
            {showModal === 'salary' && <SalaryStructureModal employees={employees} onClose={() => setShowModal(null)} onSaved={fetchAll} />}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Payroll Management</h2>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Salary processing, bonuses, deductions & structure</p>
                </div>
                <button className="btn btn-primary" onClick={handleGeneratePayroll} disabled={generating}>
                    {generating ? <Clock className="spin-animation" size={18} /> : <Play size={18} />}
                    {generating ? 'Processing...' : `Run ${new Date().toLocaleString('default', { month: 'long' })} Payroll`}
                </button>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="card glass stat-card">
                    <p className="stat-label">Total Net Payout</p>
                    <h3 className="stat-value" style={{ color: 'var(--primary)' }}>PKR {summary.total.toLocaleString()}</h3>
                </div>
                <div className="card glass stat-card">
                    <p className="stat-label">Processed Records</p>
                    <h3 className="stat-value">{summary.count} Slips</h3>
                </div>
                <div className="card glass stat-card">
                    <p className="stat-label">Total Bonuses</p>
                    <h3 className="stat-value" style={{ color: 'var(--success)' }}>PKR {bonuses.reduce((s, b) => s + (b.BonusAmount || 0), 0).toLocaleString()}</h3>
                </div>
                <div className="card glass stat-card">
                    <p className="stat-label">Total Deductions</p>
                    <h3 className="stat-value" style={{ color: 'var(--error)' }}>PKR {deductions.reduce((s, d) => s + (d.DeductionAmount || 0), 0).toLocaleString()}</h3>
                </div>
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
                {activeTab !== 'history' && (
                    <button className="btn btn-primary" style={{ marginLeft: 'auto' }}
                        onClick={() => setShowModal(activeTab === 'bonuses' ? 'bonus' : activeTab === 'deductions' ? 'deduction' : 'salary')}>
                        <Plus size={16} /> Add {activeTab === 'bonuses' ? 'Bonus' : activeTab === 'deductions' ? 'Deduction' : 'Structure'}
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="card glass" style={{ flex: 1, minHeight: '400px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {activeTab === 'history' && (
                    <DataTable
                        headers={['Employee', 'Period', 'Gross', 'Tax', 'Net Salary', 'Status']}
                        data={payrolls} loading={loading} title="Salary Records"
                        renderRow={p => (<>
                            <td><div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{p.EmployeeName}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{p.EmployeeCode}</div></td>
                            <td>{new Date(0, p.PayrollMonth - 1).toLocaleString('default', { month: 'short' })} {p.PayrollYear}</td>
                            <td>PKR {(p.GrossSalary || 0).toLocaleString()}</td>
                            <td style={{ color: 'var(--error)' }}>-PKR {(p.TaxAmount || 0).toLocaleString()}</td>
                            <td style={{ color: 'var(--success)', fontWeight: '700' }}>PKR {(p.NetSalary || 0).toLocaleString()}</td>
                            <td><div className="status-badge" style={{ color: 'var(--success)', borderColor: 'rgba(16,185,129,0.2)' }}><CheckCircle size={12} /> Processed</div></td>
                        </>)}
                    />
                )}

                {activeTab === 'bonuses' && (
                    <DataTable
                        headers={['Employee', 'Type', 'Amount', 'Date', 'Action']}
                        data={bonuses} loading={loading} title="Bonus Ledger"
                        renderRow={b => (<>
                            <td><div style={{ fontWeight: '600' }}>{b.EmployeeName}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{b.EmployeeCode}</div></td>
                            <td>{b.BonusType}</td>
                            <td style={{ color: 'var(--success)', fontWeight: '700' }}>+PKR {(b.BonusAmount || 0).toLocaleString()}</td>
                            <td>{b.BonusDate ? new Date(b.BonusDate).toLocaleDateString() : '—'}</td>
                            <td><button className="btn glass" style={{ color: 'var(--error)', padding: '6px' }} onClick={() => handleDelete('/api/bonuses', b.BonusID)}><Trash2 size={14} /></button></td>
                        </>)}
                    />
                )}

                {activeTab === 'deductions' && (
                    <DataTable
                        headers={['Employee', 'Type', 'Amount', 'Date', 'Action']}
                        data={deductions} loading={loading} title="Deduction Ledger"
                        renderRow={d => (<>
                            <td><div style={{ fontWeight: '600' }}>{d.EmployeeName}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{d.EmployeeCode}</div></td>
                            <td>{d.DeductionType}</td>
                            <td style={{ color: 'var(--error)', fontWeight: '700' }}>-PKR {(d.DeductionAmount || 0).toLocaleString()}</td>
                            <td>{d.DeductionDate ? new Date(d.DeductionDate).toLocaleDateString() : '—'}</td>
                            <td><button className="btn glass" style={{ color: 'var(--error)', padding: '6px' }} onClick={() => handleDelete('/api/deductions', d.DeductionID)}><Trash2 size={14} /></button></td>
                        </>)}
                    />
                )}

                {activeTab === 'salary' && (
                    <DataTable
                        headers={['Employee', 'Basic', 'House', 'Medical', 'Transport', 'Total Package']}
                        data={salaryStructures} loading={loading} title="Salary Structures"
                        renderRow={s => {
                            const total = (s.BasicSalary || 0) + (s.HouseAllowance || 0) + (s.MedicalAllowance || 0) + (s.TransportAllowance || 0);
                            return (<>
                                <td><div style={{ fontWeight: '600' }}>{s.EmployeeName}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{s.EmployeeCode}</div></td>
                                <td>PKR {(s.BasicSalary || 0).toLocaleString()}</td>
                                <td style={{ color: 'var(--primary)' }}>+{(s.HouseAllowance || 0).toLocaleString()}</td>
                                <td style={{ color: 'var(--primary)' }}>+{(s.MedicalAllowance || 0).toLocaleString()}</td>
                                <td style={{ color: 'var(--primary)' }}>+{(s.TransportAllowance || 0).toLocaleString()}</td>
                                <td style={{ color: 'var(--success)', fontWeight: '700' }}>PKR {total.toLocaleString()}</td>
                            </>);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default Payroll;
