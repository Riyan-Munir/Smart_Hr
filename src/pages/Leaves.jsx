import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, Plus, Filter, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DataTable from '../components/DataTable';
import CustomSelect from '../components/CustomSelect';

const Leaves = () => {
    const { user } = useAuth();
    const [leaves, setLeaves] = useState([]);
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [form, setForm] = useState({ leaveTypeID: '', startDate: '', endDate: '', reason: '' });

    const isAdmin = ['System Administrator', 'HR Director'].includes(user?.role);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            
            const [myRes, typeRes] = await Promise.all([
                fetch('/api/leaves/my', { headers }),
                fetch('/api/leaves/types', { headers })
            ]);

            if (myRes.ok) setLeaves(await myRes.json());
            if (typeRes.ok) setLeaveTypes(await typeRes.json());

            if (isAdmin) {
                const pendRes = await fetch('/api/leaves/pending', { headers });
                if (pendRes.ok) setPendingLeaves(await pendRes.json());
            }
        } catch (err) { console.error('Failed to fetch leaves'); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchBalance = async (typeID) => {
        if (!typeID) return;
        try {
            const res = await fetch(`/api/leaves/balance/${typeID}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setBalance(data.Balance);
            }
        } catch (err) { console.error('Balance fetch failed'); }
    };

    const handleApply = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/leaves/apply', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                setShowApplyModal(false);
                fetchData();
                setForm({ leaveTypeID: '', startDate: '', endDate: '', reason: '' });
                setBalance(null);
            }
        } catch (err) { alert('Application failed'); }
    };

    const handleRespond = async (id, status) => {
        try {
            const res = await fetch(`/api/leaves/respond/${id}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify({ status })
            });
            if (res.ok) fetchData();
        } catch (err) { alert('Action failed'); }
    };

    const headers = ['Type', 'Period', 'Reason', 'Status', 'Applied'];
    const adminHeaders = ['Employee', 'Type', 'Period', 'Reason', 'Actions'];

    const renderRow = (l) => (
        <>
            <td>
                <div style={{ fontWeight: '600' }}>{l.LeaveTypeName}</div>
            </td>
            <td>
                <div style={{ fontSize: '0.85rem' }}>
                    {new Date(l.StartDate).toLocaleDateString()} - {new Date(l.EndDate).toLocaleDateString()}
                </div>
            </td>
            <td>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.Reason}
                </div>
            </td>
            <td>
                <div className="status-badge" style={{ 
                    color: l.Status === 'Approved' ? 'var(--success)' : l.Status === 'Rejected' ? 'var(--error)' : 'var(--warning)',
                    background: 'rgba(255,255,255,0.05)'
                }}>
                    {l.Status}
                </div>
            </td>
            <td>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {new Date(l.AppliedDate).toLocaleDateString()}
                </div>
            </td>
        </>
    );

    const renderAdminRow = (l) => (
        <>
            <td>
                <div style={{ fontWeight: '600' }}>{l.FirstName} {l.LastName}</div>
            </td>
            <td>{l.LeaveTypeName}</td>
            <td>{new Date(l.StartDate).toLocaleDateString()} - {new Date(l.EndDate).toLocaleDateString()}</td>
            <td>{l.Reason}</td>
            <td>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn glass" style={{ color: 'var(--success)', padding: '6px' }} onClick={() => handleRespond(l.LeaveRequestID, 'Approved')}>
                        <CheckCircle size={16} />
                    </button>
                    <button className="btn glass" style={{ color: 'var(--error)', padding: '6px' }} onClick={() => handleRespond(l.LeaveRequestID, 'Rejected')}>
                        <XCircle size={16} />
                    </button>
                </div>
            </td>
        </>
    );

    return (
        <div className="content-area" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Leave Management</h2>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Track balances and manage time-off requests</p>
                </div>
                {!isAdmin && (
                    <button className="btn btn-primary" onClick={() => setShowApplyModal(true)}>
                        <Plus size={18} /> Apply for Leave
                    </button>
                )}
            </div>

            {isAdmin && pendingLeaves.length > 0 && (
                <div className="card glass" style={{ borderLeft: '4px solid var(--warning)' }}>
                    <h4 style={{ fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Clock size={20} color="var(--warning)" /> Pending Approvals
                    </h4>
                    <DataTable 
                        headers={adminHeaders}
                        data={pendingLeaves}
                        renderRow={renderAdminRow}
                        loading={loading}
                    />
                </div>
            )}

            <div className="card glass" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ fontWeight: '700', marginBottom: '1.5rem' }}>{isAdmin ? 'Leave History Archive' : 'My Leave History'}</h4>
                <DataTable 
                    headers={headers}
                    data={leaves}
                    renderRow={renderRow}
                    loading={loading}
                />
            </div>

            {showApplyModal && (
                <div className="modal-overlay">
                    <div className="card glass" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                        <h3 style={{ fontWeight: '800', marginBottom: '2rem' }}>Request Time Off</h3>
                        <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label className="form-label">Leave Type</label>
                                <CustomSelect 
                                    options={leaveTypes}
                                    value={form.leaveTypeID}
                                    placeholder="Select Type"
                                    labelKey="LeaveTypeName"
                                    valueKey="LeaveTypeID"
                                    onChange={val => {
                                        setForm({...form, leaveTypeID: val});
                                        fetchBalance(val);
                                    }}
                                />
                                {balance !== null && (
                                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Info size={14} /> Current Balance: <strong>{balance} Days</strong>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Start Date</label>
                                    <input type="date" className="form-input" required value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">End Date</label>
                                    <input type="date" className="form-input" required value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Reason for Leave</label>
                                <textarea className="form-input" style={{ minHeight: '100px' }} placeholder="Provide brief context..." value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Submit Application</button>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowApplyModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Leaves;
