import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { Clock, MapPin, CheckCircle2, AlertCircle, LogIn, LogOut } from 'lucide-react';
import Popup from '../components/Popup';

const Attendance = () => {
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [marking, setMarking] = useState(false);
    const [checkingOut, setCheckingOut] = useState(false);
    const [hasCheckedIn, setHasCheckedIn] = useState(false);
    const [hasCheckedOut, setHasCheckedOut] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
    const [popup, setPopup] = useState(null);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
        fetchAttendanceData();
        return () => clearInterval(timer);
    }, []);

    const fetchAttendanceData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/attendance/history', { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (res.ok) {
                const data = await res.json();
                setAttendance(data);
                
                // Check today's record
                const today = new Date().toISOString().split('T')[0];
                const todayRecord = data.find(att => att.Date === today);
                setHasCheckedIn(!!todayRecord);
                setHasCheckedOut(!!todayRecord && todayRecord.CheckedOut === 1);
            }
        } catch (err) {
            console.error('Failed to fetch attendance:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAttendance = async () => {
        setMarking(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/attendance/mark', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({})
            });

            if (res.ok) {
                setPopup({
                    type: 'success',
                    title: 'Clock In Successful!',
                    message: 'Your shift clock-in time has been logged successfully.'
                });
                fetchAttendanceData();
            } else {
                let errMsg = 'Could not complete clock in.';
                try {
                    const contentType = res.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const data = await res.json();
                        errMsg = data.message || errMsg;
                    } else {
                        const text = await res.text();
                        errMsg = text || errMsg;
                    }
                } catch (parseErr) {
                    errMsg = `Status ${res.status}: ${res.statusText || 'Unknown Error'}`;
                }
                setPopup({
                    type: 'error',
                    title: 'Clock In Failed',
                    message: errMsg
                });
            }
        } catch (err) {
            setPopup({
                type: 'error',
                title: 'Network Error',
                message: err.message || 'Failed to connect to the server for clock in.'
            });
        } finally {
            setMarking(false);
        }
    };

    const handleCheckOut = async () => {
        setCheckingOut(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/attendance/checkout', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({})
            });

            if (res.ok) {
                const data = await res.json();
                setPopup({
                    type: 'success',
                    title: 'Clock Out Successful!',
                    message: data.message || 'Your shift clock-out time has been logged successfully.'
                });
                fetchAttendanceData(); // refresh table + working hours
            } else {
                let errMsg = 'Could not complete clock out.';
                try {
                    const contentType = res.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const data = await res.json();
                        errMsg = data.message || errMsg;
                    } else {
                        const text = await res.text();
                        errMsg = text || errMsg;
                    }
                } catch (parseErr) {
                    errMsg = `Status ${res.status}: ${res.statusText || 'Unknown Error'}`;
                }
                setPopup({
                    type: 'error',
                    title: 'Clock Out Failed',
                    message: errMsg
                });
            }
        } catch (err) {
            setPopup({
                type: 'error',
                title: 'Network Error',
                message: err.message || 'Failed to connect to the server for clock out.'
            });
        } finally {
            setCheckingOut(false);
        }
    };

    const headers = ['Date', 'Check In', 'Check Out', 'Hours', 'Status'];

    const renderRow = (att) => (

        <>
            <td>{att.Date}</td>
            <td style={{ color: 'var(--primary)', fontWeight: '600' }}>{att.CheckIn}</td>
            <td>{att.CheckOut}</td>
            <td>{att.Hours}h</td>
            <td>
                <div className="status-badge" style={{ 
                    color: att.Status === 'Present' ? 'var(--success)' : 'var(--error)',
                    borderColor: att.Status === 'Present' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'
                }}>
                    {att.Status === 'Present' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {att.Status}
                </div>
            </td>
        </>
    );

    return (
        <div className="content-area" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Attendance Tracking</h2>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Real-time location and time-stamped logs</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '0.05em' }}>{currentTime}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{new Date().toDateString()}</div>
                </div>
            </div>

            <div className="layout-middle" style={{ gap: '2rem', minHeight: '280px' }}>
                <div className="card glass" style={{ flex: '1 1 350px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.5rem', padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ 
                            width: '90px', height: '90px', 
                            background: 'var(--primary-glow)', 
                            borderRadius: '50%', border: '2px solid var(--primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 20px var(--primary-glow)'
                        }}>
                            <Clock size={44} color="var(--primary)" />
                        </div>
                    </div>
                    <div>
                        <h4 style={{ fontWeight: '700', fontSize: '1.1rem' }}>Clock In / Out</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                            <MapPin size={12} /> Office Location: <strong>Karachi HQ</strong>
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                            className="btn btn-primary" 
                            style={{ flex: 1, padding: '12px' }}
                            onClick={handleMarkAttendance}
                            disabled={marking || hasCheckedIn}
                        >
                            <LogIn size={18} /> {marking ? 'Wait...' : hasCheckedIn ? 'Clocked In ✓' : 'Clock In'}
                        </button>
                        <button 
                            className="btn btn-secondary" 
                            style={{ 
                                flex: 1, padding: '12px',
                                opacity: (!hasCheckedIn || hasCheckedOut) ? 0.5 : 1
                            }}
                            onClick={handleCheckOut}
                            disabled={checkingOut || !hasCheckedIn || hasCheckedOut}
                        >
                            <LogOut size={18} /> {checkingOut ? 'Wait...' : hasCheckedOut ? 'Clocked Out ✓' : 'Clock Out'}
                        </button>
                    </div>

                </div>

                <div className="card glass" style={{ flex: '2 1 600px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--border)', padding: 0, overflow: 'hidden' }}>
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--bg-card)' }}>
                        <p className="stat-label" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '1rem' }}>Average In-Time</p>
                        <h3 className="stat-value" style={{ fontSize: '1.75rem', fontWeight: '800' }}>
                            {attendance.length > 0 ? '09:12 AM' : '--:--'}
                        </h3>
                        <p style={{ fontSize: '0.7rem', color: 'var(--success)', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} /> On Track
                        </p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--bg-card)' }}>
                        <p className="stat-label" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '1rem' }}>Total Late Days</p>
                        <h3 className="stat-value" style={{ fontSize: '1.75rem', fontWeight: '800' }}>
                            {attendance.filter(a => a.Status === 'Late').length}
                        </h3>
                        <p style={{ fontSize: '0.7rem', color: 'var(--error)', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <AlertCircle size={12} /> Recent Logs
                        </p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--bg-card)' }}>
                        <p className="stat-label" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '1rem' }}>Monthly Hours</p>
                        <h3 className="stat-value" style={{ fontSize: '1.75rem', fontWeight: '800' }}>
                            {attendance.reduce((acc, curr) => acc + (parseFloat(curr.Hours) || 0), 0).toFixed(1)}h
                        </h3>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '8px' }}>Current Month</p>
                    </div>
                </div>
            </div>

            <div className="card glass" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                    <h4 style={{ fontWeight: '700' }}>Daily Activity Log</h4>
                </div>
                <div style={{ flex: 1, padding: '0 12px', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <DataTable headers={headers} data={attendance} renderRow={renderRow} loading={loading} />
                </div>
            </div>
            
            {popup && <Popup {...popup} onClose={() => setPopup(null)} />}
        </div>
    );
};

export default Attendance;
