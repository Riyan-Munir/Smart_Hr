import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import CustomSelect from '../components/CustomSelect';
import { Search, UserPlus, Filter, MoreVertical, Mail, Phone, Award, ClipboardCheck, Clock } from 'lucide-react';

const EmployeeList = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showRewardModal, setShowRewardModal] = useState(false);
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [reviewForm, setReviewForm] = useState({ score: 80, comments: '' });
    const [rewardForm, setRewardForm] = useState({ points: 50, reason: '' });
    const [shifts, setShifts] = useState([]);
    const [selectedShift, setSelectedShift] = useState('');

    const [newEmp, setNewEmp] = useState({
        EmployeeCode: '', FirstName: '', LastName: '', Gender: 'Male',
        DOB: '', CNIC: '', Phone: '', Email: '', Address: '',
        DepartmentID: 1, DesignationID: 1, BranchID: 1, BasicSalary: 0
    });

    const handleEnroll = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newEmp)
            });
            if (res.ok) {
                setShowModal(false);
                fetchEmployees();
                alert('Employee Enrolled Successfully via SQL SP!');
            }
        } catch (err) { alert('Enrollment failed'); }
    };

    const handleReview = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/performance/review', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify({ ...reviewForm, employeeID: selectedEmp.EmployeeID })
            });
            if (res.ok) {
                setShowReviewModal(false);
                alert('Review Published');
            }
        } catch (err) { alert('Review failed'); }
    };

    const handleReward = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/performance/reward', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify({ ...rewardForm, employeeID: selectedEmp.EmployeeID })
            });
            if (res.ok) {
                setShowRewardModal(false);
                alert('Reward Points Awarded');
            }
        } catch (err) { alert('Reward failed'); }
    };

    const openShiftModal = async (emp) => {
        setSelectedEmp(emp);
        setSelectedShift('');
        const res = await fetch('/api/shifts', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        if (res.ok) setShifts(await res.json());
        setShowShiftModal(true);
    };

    const handleAssignShift = async (e) => {
        e.preventDefault();
        if (!selectedShift) return alert('Please select a shift.');
        try {
            const res = await fetch('/api/shifts/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ employeeID: selectedEmp.EmployeeID, shiftID: selectedShift })
            });
            const d = await res.json();
            if (res.ok) { setShowShiftModal(false); alert('Shift assigned!'); }
            else alert(d.message);
        } catch (err) { alert('Assignment failed'); }
    };

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/employees', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setEmployees(data);
            }
        } catch (err) {
            console.error('Failed to fetch employees:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const safeEmployees = Array.isArray(employees) ? employees : [];
    const filteredEmployees = safeEmployees.filter(e => 
        `${e.FirstName} ${e.LastName}`.toLowerCase().includes(search.toLowerCase()) ||
        e.EmployeeCode.toLowerCase().includes(search.toLowerCase())
    );

    const headers = ['Employee', 'Designation', 'Department', 'Branch', 'Status', 'Actions'];

    const renderRow = (emp) => (
        <>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                        width: '36px', height: '36px', 
                        borderRadius: '50%', background: 'var(--primary-glow)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary)'
                    }}>
                        {(emp.FirstName || '?').charAt(0)}{(emp.LastName || '?').charAt(0)}
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{emp.FirstName} {emp.LastName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{emp.EmployeeCode}</div>
                    </div>
                </div>
            </td>
            <td>
                <div style={{ fontSize: '0.85rem' }}>{emp.DesignationName}</div>
            </td>
            <td>
                <div className="status-badge" style={{ width: 'fit-content', background: 'rgba(99, 102, 241, 0.05)' }}>
                    {emp.DepartmentName}
                </div>
            </td>
            <td>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{emp.BranchName}</div>
            </td>
            <td>
                <div className="status-badge" style={{ 
                    color: emp.EmploymentStatus === 'Active' ? 'var(--success)' : 'var(--error)',
                    borderColor: emp.EmploymentStatus === 'Active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    background: emp.EmploymentStatus === 'Active' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'
                }}>
                    <div className="status-circle-small" style={{ 
                        background: emp.EmploymentStatus === 'Active' ? 'var(--success)' : 'var(--error)',
                        boxShadow: `0 0 6px ${emp.EmploymentStatus === 'Active' ? 'var(--success)' : 'var(--error)'}`
                    }}></div>
                    {emp.EmploymentStatus}
                </div>
            </td>
            <td>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn glass" style={{ padding: '6px', color: 'var(--primary)' }} title="Review" onClick={() => { setSelectedEmp(emp); setShowReviewModal(true); }}>
                        <ClipboardCheck size={14} />
                    </button>
                    <button className="btn glass" style={{ padding: '6px', color: 'var(--warning)' }} title="Reward" onClick={() => { setSelectedEmp(emp); setShowRewardModal(true); }}>
                        <Award size={14} />
                    </button>
                    <button className="btn glass" style={{ padding: '6px', color: 'var(--accent)' }} title="Assign Shift" onClick={() => openShiftModal(emp)}>
                        <Clock size={14} />
                    </button>
                    <button className="btn glass" style={{ padding: '6px' }} title="Email"><Mail size={14} /></button>
                </div>
            </td>
        </>
    );

    return (
        <div className="content-area" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Employee Directory</h2>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Manage and monitor your global workforce</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <UserPlus size={18} /> Add New Employee
                </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1, margin: 0, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                    <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Search by name, code, or department..." 
                        style={{ paddingLeft: '48px' }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button className="btn btn-secondary">
                    <Filter size={18} /> Filters
                </button>
            </div>

            <div className="card glass" style={{ flex: 1, minHeight: '400px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <DataTable 
                    headers={headers} 
                    data={filteredEmployees} 
                    renderRow={renderRow} 
                    loading={loading} 
                />
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="card glass modal-content">
                        <h3 className="modal-title">Enroll New Employee</h3>
                        <form onSubmit={handleEnroll} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group"><label className="form-label">Emp Code</label><input className="form-input" required onChange={e => setNewEmp({...newEmp, EmployeeCode: e.target.value})} /></div>
                            <div className="form-group"><label className="form-label">First Name</label><input className="form-input" required onChange={e => setNewEmp({...newEmp, FirstName: e.target.value})} /></div>
                            <div className="form-group"><label className="form-label">Last Name</label><input className="form-input" required onChange={e => setNewEmp({...newEmp, LastName: e.target.value})} /></div>
                            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" required onChange={e => setNewEmp({...newEmp, Email: e.target.value})} /></div>
                            <div className="form-group"><label className="form-label">CNIC</label><input className="form-input" required onChange={e => setNewEmp({...newEmp, CNIC: e.target.value})} /></div>
                            <div className="form-group"><label className="form-label">Basic Salary</label><input className="form-input" type="number" required onChange={e => setNewEmp({...newEmp, BasicSalary: Number(e.target.value)})} /></div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Complete Enrollment</button>
                                <button type="button" className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => setShowModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showReviewModal && (
                <div className="modal-overlay">
                    <div className="card glass modal-content" style={{ maxWidth: '400px' }}>
                        <h3 className="modal-title">Performance Review: {selectedEmp?.FirstName}</h3>
                        <form onSubmit={handleReview} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group">
                                <label className="form-label">Performance Score (0-100)</label>
                                <input type="number" className="form-input" min="0" max="100" value={reviewForm.score} onChange={e => setReviewForm({...reviewForm, score: Number(e.target.value)})} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Feedback & Comments</label>
                                <textarea className="form-input" style={{ minHeight: '100px' }} value={reviewForm.comments} onChange={e => setReviewForm({...reviewForm, comments: e.target.value})} required placeholder="What did they do well? Areas for improvement?" />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Submit Review</button>
                            <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowReviewModal(false)}>Cancel</button>
                        </form>
                    </div>
                </div>
            )}

            {showRewardModal && (
                <div className="modal-overlay">
                    <div className="card glass modal-content" style={{ maxWidth: '400px' }}>
                        <h3 className="modal-title" style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Award size={20} /> Reward: {selectedEmp?.FirstName}
                        </h3>
                        <form onSubmit={handleReward} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group">
                                <label className="form-label">Points to Award</label>
                                <input type="number" className="form-input" value={rewardForm.points} onChange={e => setRewardForm({...rewardForm, points: Number(e.target.value)})} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Reason for Recognition</label>
                                <textarea className="form-input" style={{ minHeight: '80px' }} value={rewardForm.reason} onChange={e => setRewardForm({...rewardForm, reason: e.target.value})} required placeholder="e.g. Excellent teamwork on Project X" />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%', background: 'var(--warning)', border: 'none' }}>Grant Reward</button>
                            <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowRewardModal(false)}>Cancel</button>
                        </form>
                    </div>
                </div>
            )}
            {showShiftModal && (
                <div className="modal-overlay">
                    <div className="card glass modal-content" style={{ maxWidth: '400px' }}>
                        <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Clock size={20} color="var(--accent)" /> Assign Shift: {selectedEmp?.FirstName}
                        </h3>
                        <form onSubmit={handleAssignShift} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group">
                                <label className="form-label">Select Shift</label>
                                <CustomSelect
                                    options={shifts}
                                    value={selectedShift}
                                    placeholder="Choose a shift..."
                                    labelKey="ShiftName"
                                    valueKey="ShiftID"
                                    onChange={v => setSelectedShift(v)}
                                />
                                {selectedShift && (() => {
                                    const s = shifts.find(sh => sh.ShiftID === parseInt(selectedShift));
                                    return s ? (
                                        <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(139,92,246,0.08)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                                            ⏰ {s.StartTime?.slice(0,5)} → {s.EndTime?.slice(0,5)}
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Assign Shift</button>
                            <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowShiftModal(false)}>Cancel</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeList;
