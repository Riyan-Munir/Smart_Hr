import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Mail, Phone, Calendar, CheckCircle, XCircle, Clock, FileText, X, Star } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

const HireModal = ({ applicant, onClose, onHired }) => {
    const [formData, setFormData] = useState({
        employeeCode: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        departmentID: '',
        designationID: '',
        branchID: '',
        basicSalary: 0,
        username: applicant.Email.split('@')[0],
        password: 'ChangeMe123!',
        roleID: applicant.DesiredRoleID || '',
        gender: 'Male',
        dob: '1990-01-01',
        cnic: ''
    });
    const [lookups, setLookups] = useState({ departments: [], designations: [], branches: [], roles: [] });
    const [errors, setErrors] = useState({
        departmentID: null, designationID: null, branchID: null, roleID: null,
        username: null, password: null, basicSalary: null, cnic: null, server: null
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchLookups = async () => {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const [depts, desigs, branches, roles] = await Promise.all([
                fetch('/api/departments', { headers }).then(res => res.json()),
                fetch('/api/designations', { headers }).then(res => res.json()),
                fetch('/api/branches', { headers }).then(res => res.json()),
                fetch('/api/roles', { headers }).then(res => res.json())
            ]);
            setLookups({ departments: depts, designations: desigs, branches, roles });
        };
        fetchLookups();
    }, []);

    const handleDesignationChange = (id) => {
        const desig = lookups.designations.find(d => d.DesignationID === parseInt(id));
        setFormData({ ...formData, designationID: id, basicSalary: desig ? desig.BaseSalary : 0 });
    };

    const validate = () => {
        const newErrors = {
            departmentID: null, designationID: null, branchID: null, roleID: null,
            username: null, password: null, basicSalary: null, cnic: null, server: null
        };
        if (!formData.departmentID) newErrors.departmentID = 'Required';
        if (!formData.designationID) newErrors.designationID = 'Required';
        if (!formData.branchID) newErrors.branchID = 'Required';
        if (!formData.username) newErrors.username = 'Required';
        if (!formData.password) newErrors.password = 'Required';
        if (!formData.cnic) newErrors.cnic = 'Required';
        if (formData.basicSalary <= 0) newErrors.basicSalary = 'Must be > 0';
        const hasErrors = !formData.departmentID || !formData.designationID || !formData.branchID || !formData.roleID || !formData.username || !formData.password || !formData.cnic || formData.basicSalary <= 0;
        
        setErrors(newErrors);
        return !hasErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            const res = await fetch('/api/recruitment/hire', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ 
                    ...formData, 
                    applicantID: applicant.ApplicantID, 
                    firstName: applicant.FirstName, 
                    lastName: applicant.LastName, 
                    phone: applicant.Phone, 
                    email: applicant.Email, 
                    address: 'Pending' 
                })
            });
            if (res.ok) {
                alert('Employee Hired Successfully! Credentials sent via email.');
                onHired();
            } else {
                const data = await res.json();
                setErrors(prev => ({ ...prev, server: data.message || 'Hiring failed' }));
            }
        } catch (err) { alert('Hiring failed'); }
        finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay" style={{ overflow: 'hidden' }}>
            <div className="card glass no-scrollbar" style={{ 
                maxWidth: '700px', 
                width: '95%', 
                maxHeight: '90vh', 
                overflowY: 'auto', 
                padding: '2rem',
                margin: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h3>Hire: {applicant.FirstName} {applicant.LastName}</h3>
                    <X onClick={onClose} style={{ cursor: 'pointer' }} />
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label className="form-label">Employee Code</label>
                        <input className="form-input" value={formData.employeeCode} onChange={e => setFormData({...formData, employeeCode: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">System Role</label>
                        <CustomSelect 
                            options={lookups.roles} 
                            value={formData.roleID} 
                            placeholder="Select Role"
                            labelKey="RoleName"
                            valueKey="RoleID"
                            onChange={val => {
                                setFormData({...formData, roleID: val});
                                if (errors.roleID) setErrors(prev => ({...prev, roleID: null}));
                            }}
                        />
                        {errors.roleID && <span className="field-error">{errors.roleID}</span>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Department</label>
                        <CustomSelect 
                            options={lookups.departments} 
                            value={formData.departmentID} 
                            placeholder="Select Dept"
                            labelKey="DepartmentName"
                            valueKey="DepartmentID"
                            onChange={val => {
                                setFormData({...formData, departmentID: val});
                                if (errors.departmentID) setErrors(prev => ({...prev, departmentID: null}));
                            }}
                        />
                        {errors.departmentID && <span className="field-error">{errors.departmentID}</span>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Designation</label>
                        <CustomSelect 
                            options={lookups.designations} 
                            value={formData.designationID} 
                            placeholder="Select Desig"
                            labelKey="DesignationName"
                            valueKey="DesignationID"
                            onChange={val => {
                                handleDesignationChange(val);
                                if (errors.designationID) setErrors(prev => ({...prev, designationID: null}));
                            }}
                        />
                        {errors.designationID && <span className="field-error">{errors.designationID}</span>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Branch</label>
                        <CustomSelect 
                            options={lookups.branches} 
                            value={formData.branchID} 
                            placeholder="Select Branch"
                            labelKey="BranchName"
                            valueKey="BranchID"
                            onChange={val => {
                                setFormData({...formData, branchID: val});
                                if (errors.branchID) setErrors(prev => ({...prev, branchID: null}));
                            }}
                        />
                        {errors.branchID && <span className="field-error">{errors.branchID}</span>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Basic Salary</label>
                        <input 
                            className="form-input" 
                            type="number" 
                            value={formData.basicSalary} 
                            required 
                            onChange={e => {
                                setFormData({...formData, basicSalary: parseFloat(e.target.value) || 0});
                                if (errors.basicSalary) setErrors(prev => ({...prev, basicSalary: null}));
                            }} 
                        />
                        {errors.basicSalary && <span className="field-error">{errors.basicSalary}</span>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">CNIC / ID Number</label>
                        <input 
                            className="form-input" 
                            placeholder="00000-0000000-0"
                            value={formData.cnic} 
                            required 
                            onChange={e => {
                                setFormData({...formData, cnic: e.target.value});
                                if (errors.cnic) setErrors(prev => ({...prev, cnic: null}));
                            }} 
                        />
                        {errors.cnic && <span className="field-error">{errors.cnic}</span>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Gender</label>
                        <CustomSelect 
                            options={[
                                { label: 'Male', value: 'Male' },
                                { label: 'Female', value: 'Female' },
                                { label: 'Other', value: 'Other' }
                            ]} 
                            value={formData.gender} 
                            placeholder="Select Gender"
                            onChange={val => setFormData({...formData, gender: val})}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Date of Birth</label>
                        <input className="form-input" type="date" value={formData.dob} required onChange={e => setFormData({...formData, dob: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Portal Username</label>
                        <input 
                            className="form-input" 
                            value={formData.username} 
                            required 
                            onChange={e => {
                                setFormData({...formData, username: e.target.value});
                                if (errors.username) setErrors(prev => ({...prev, username: null}));
                            }} 
                        />
                        {errors.username && <span className="field-error">{errors.username}</span>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Temp Password</label>
                        <input 
                            className="form-input" 
                            value={formData.password} 
                            required 
                            onChange={e => {
                                setFormData({...formData, password: e.target.value});
                                if (errors.password) setErrors(prev => ({...prev, password: null}));
                            }} 
                        />
                        {errors.password && <span className="field-error">{errors.password}</span>}
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="checkbox" className="form-checkbox" id="sendEmail" defaultChecked />
                        <label htmlFor="sendEmail" style={{ fontSize: '0.85rem', color: 'var(--text-dim)', cursor: 'pointer' }}>
                            Send welcome email with portal credentials immediately
                        </label>
                    </div>
                    {errors.server && <div className="form-group" style={{ gridColumn: 'span 2' }}><span className="field-error">{errors.server}</span></div>}
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                            {loading ? 'Processing...' : 'Complete Enrollment & Send Credentials'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ApplicantCard = ({ applicant, onHire, onReject, onSchedule }) => (
    <div className="card glass" style={{ padding: '16px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{applicant.FirstName} {applicant.LastName}</div>
            <div className="status-badge" style={{ fontSize: '0.6rem' }}>{applicant.AppliedPosition}</div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={12} /> {applicant.Email}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={12} /> {applicant.Phone}</div>
            {applicant.ProposalText && (
                <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontStyle: 'italic' }}>
                    <FileText size={12} style={{ marginBottom: '4px' }} /> {applicant.ProposalText}
                </div>
            )}
        </div>
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {applicant.Status === 'Applied' && (
                <>
                    <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.7rem', padding: '4px' }} onClick={() => onReject(applicant.ApplicantID)}>Reject</button>
                    <button className="btn glass" style={{ flex: 1, fontSize: '0.7rem', padding: '4px', color: 'var(--accent)', borderColor: 'var(--accent)' }} onClick={() => onSchedule && onSchedule(applicant)}>
                        <Calendar size={11} /> Interview
                    </button>
                    <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.7rem', padding: '4px' }} onClick={() => onHire(applicant)}>Hire</button>
                </>
            )}
        </div>
    </div>
);


const Recruitment = () => {
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedApplicant, setSelectedApplicant] = useState(null);
    const [showInterviewModal, setShowInterviewModal] = useState(false);
    const [interviewTarget, setInterviewTarget] = useState(null);
    const [interviews, setInterviews] = useState([]);
    const [scoreTarget, setScoreTarget] = useState(null);
    const [interviewForm, setInterviewForm] = useState({ interviewDate: '', feedback: '' });
    const [scoreForm, setScoreForm] = useState({ interviewScore: '', feedback: '' });
    const [activeView, setActiveView] = useState('pipeline'); // 'pipeline' | 'interviews'

    const fetchApplicants = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/applicants', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setApplicants(await res.json());
        } catch (err) {
            console.error('Fetch failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchInterviews = async () => {
        try {
            const res = await fetch('/api/interviews', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
            if (res.ok) setInterviews(await res.json());
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchApplicants();
        fetchInterviews();
    }, []);

    const handleScheduleInterview = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/interviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ applicantID: interviewTarget.ApplicantID, ...interviewForm })
            });
            if (res.ok) { setShowInterviewModal(false); fetchInterviews(); alert('Interview scheduled!'); }
            else { const d = await res.json(); alert(d.message); }
        } catch (err) { alert('Failed'); }
    };

    const handleRecordScore = async (e, interviewID) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/interviews/${interviewID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify(scoreForm)
            });
            if (res.ok) { setScoreTarget(null); fetchInterviews(); }
            else { const d = await res.json(); alert(d.message); }
        } catch (err) { alert('Failed'); }
    };

    const handleReject = async (id) => {
        if (!confirm('Are you sure you want to reject this applicant?')) return;
        const res = await fetch(`/api/recruitment/reject/${id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) fetchApplicants();
    };

    const columns = [
        { title: 'New Applied', status: 'Applied', color: 'var(--primary)', icon: <Clock size={16} /> },
        { title: 'Hired/Enrolled', status: 'Hired', color: 'var(--success)', icon: <CheckCircle size={16} /> },
        { title: 'Rejected', status: 'Rejected', color: 'var(--error)', icon: <XCircle size={16} /> }
    ];

    return (
        <div className="content-area" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {selectedApplicant && (
                <HireModal 
                    applicant={selectedApplicant} 
                    onClose={() => setSelectedApplicant(null)} 
                    onHired={() => { setSelectedApplicant(null); fetchApplicants(); }} 
                />
            )}
            {showInterviewModal && interviewTarget && (
                <div className="modal-overlay">
                    <div className="card glass modal-content" style={{ maxWidth: '420px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3>Schedule Interview: {interviewTarget.FirstName}</h3>
                            <X onClick={() => setShowInterviewModal(false)} style={{ cursor: 'pointer' }} />
                        </div>
                        <form onSubmit={handleScheduleInterview} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div className="form-group">
                                <label className="form-label">Interview Date & Time</label>
                                <input type="datetime-local" className="form-input" required
                                    value={interviewForm.interviewDate}
                                    onChange={e => setInterviewForm({ ...interviewForm, interviewDate: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Initial Notes / Agenda</label>
                                <textarea className="form-input" style={{ minHeight: '80px' }}
                                    placeholder="Topics to cover, instructions..."
                                    value={interviewForm.feedback}
                                    onChange={e => setInterviewForm({ ...interviewForm, feedback: e.target.value })} />
                            </div>
                            <button type="submit" className="btn btn-primary">Schedule Interview</button>
                        </form>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Recruitment Pipeline</h2>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Review applications and enroll new talent</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className={`btn ${activeView === 'pipeline' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveView('pipeline')}>
                        <Clock size={16} /> Pipeline
                    </button>
                    <button className={`btn ${activeView === 'interviews' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveView('interviews')}>
                        <Star size={16} /> Interviews ({interviews.length})
                    </button>
                </div>
            </div>

            {activeView === 'interviews' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {interviews.length === 0 ? (
                        <div className="card glass" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>No interviews scheduled yet.</div>
                    ) : interviews.map(iv => (
                        <div key={iv.InterviewID} className="card glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem' }}>
                            <div>
                                <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{iv.ApplicantName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>{iv.AppliedPosition}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '4px' }}>
                                    <Calendar size={12} style={{ marginRight: '4px' }} />
                                    {new Date(iv.InterviewDate).toLocaleString()}
                                </div>
                                {iv.Feedback && <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', fontStyle: 'italic' }}>{iv.Feedback}</div>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                {iv.InterviewScore !== null ? (
                                    <div style={{ fontWeight: '800', fontSize: '1.5rem', color: iv.InterviewScore >= 70 ? 'var(--success)' : 'var(--error)' }}>
                                        {iv.InterviewScore}<span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>/100</span>
                                    </div>
                                ) : scoreTarget === iv.InterviewID ? (
                                    <form onSubmit={e => handleRecordScore(e, iv.InterviewID)} style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '160px' }}>
                                        <input type="number" className="form-input" style={{ padding: '6px' }} min="0" max="100" placeholder="Score 0-100" required
                                            value={scoreForm.interviewScore} onChange={e => setScoreForm({ ...scoreForm, interviewScore: e.target.value })} />
                                        <input className="form-input" style={{ padding: '6px' }} placeholder="Feedback"
                                            value={scoreForm.feedback} onChange={e => setScoreForm({ ...scoreForm, feedback: e.target.value })} />
                                        <button type="submit" className="btn btn-primary" style={{ padding: '6px', fontSize: '0.75rem' }}>Save</button>
                                    </form>
                                ) : (
                                    <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px' }} onClick={() => { setScoreTarget(iv.InterviewID); setScoreForm({ interviewScore: '', feedback: iv.Feedback || '' }); }}
                                    ><Star size={14} /> Record Score</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ display: 'flex', gap: '2rem', flex: 1, overflowX: 'auto', paddingBottom: '1rem' }}>
                    {columns.map(col => (
                        <div key={col.status} style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ 
                                display: 'flex', alignItems: 'center', gap: '10px', 
                                padding: '12px 16px', borderRadius: '12px', background: 'var(--glass)',
                                borderBottom: `2px solid ${col.color}`
                            }}>
                                {col.icon}
                                <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{col.title}</span>
                                <span style={{ 
                                    marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', 
                                    padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem' 
                                }}>
                                    {applicants.filter(a => a.Status === col.status).length}
                                </span>
                            </div>
                            <div className="scrollable-content-card" style={{ flex: 1, background: 'rgba(0,0,0,0.1)' }}>
                                {loading ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>Loading...</div>
                                ) : (
                                    applicants
                                        .filter(a => a.Status === col.status)
                                        .map(a => <ApplicantCard key={a.ApplicantID} applicant={a} onHire={setSelectedApplicant} onReject={handleReject}
                                            onSchedule={() => { setInterviewTarget(a); setInterviewForm({ interviewDate: '', feedback: '' }); setShowInterviewModal(true); }} />)
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Recruitment;
