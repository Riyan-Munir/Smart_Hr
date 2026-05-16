import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { CreditCard, DollarSign, Download, Play, CheckCircle, Clock } from 'lucide-react';

const Payroll = () => {
    const [payrolls, setPayrolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [summary, setSummary] = useState({ total: 0, count: 0 });

    const fetchPayrollData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/payroll/history', { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (res.ok) {
                const data = await res.json();
                setPayrolls(data);
                setSummary({
                    total: data.reduce((sum, p) => sum + p.NetSalary, 0),
                    count: data.length
                });
            }
        } catch (err) {
            console.error('Failed to fetch payroll:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayrollData();
    }, []);

    const handleGeneratePayroll = async () => {
        setGenerating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/payroll/generate', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ month: 5, year: 2026 })
            });
            if (res.ok) {
                alert('Payroll generated successfully via SQL Stored Procedure!');
                fetchPayrollData();
            } else {
                const data = await res.json();
                alert(`Error: ${data.message}`);
            }
        } catch (err) {
            alert('Failed to connect to server.');
        } finally {
            setGenerating(false);
        }
    };

    const headers = ['Employee', 'Period', 'Gross Salary', 'Net Salary', 'Status', 'Slip'];

    const renderRow = (p) => (
        <>
            <td>
                <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{p.EmployeeName}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{p.EmployeeCode}</div>
            </td>
            <td>
                {new Date(0, p.PayrollMonth - 1).toLocaleString('default', { month: 'short' })} {p.PayrollYear}
            </td>
            <td>${p.GrossSalary.toLocaleString()}</td>
            <td style={{ color: 'var(--success)', fontWeight: '700' }}>${p.NetSalary.toLocaleString()}</td>
            <td>
                <div className="status-badge" style={{ color: 'var(--success)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                    <CheckCircle size={12} /> {p.Status}
                </div>
            </td>
            <td>
                <button className="btn glass" style={{ padding: '6px' }} title="Download Slip">
                    <Download size={14} color="var(--primary)" />
                </button>
            </td>
        </>
    );

    return (
        <div className="content-area" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Payroll Management</h2>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Automated salary processing and history</p>
                </div>
                <button 
                    className="btn btn-primary" 
                    onClick={handleGeneratePayroll}
                    disabled={generating}
                >
                    {generating ? <Clock className="spin-animation" size={18} /> : <Play size={18} />}
                    {generating ? 'Processing SQL Logic...' : 'Run May 2026 Payroll'}
                </button>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="card glass stat-card">
                    <p className="stat-label">Total Net Payout</p>
                    <h3 className="stat-value" style={{ color: 'var(--primary)' }}>${summary.total.toLocaleString()}</h3>
                </div>
                <div className="card glass stat-card">
                    <p className="stat-label">Processed Count</p>
                    <h3 className="stat-value">{summary.count} Employees</h3>
                </div>
                <div className="card glass stat-card">
                    <p className="stat-label">Next Run Date</p>
                    <h3 className="stat-value">June 01, 2026</h3>
                </div>
            </div>

            <div className="card glass" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <DataTable 
                    headers={headers} 
                    data={payrolls} 
                    renderRow={renderRow} 
                    loading={loading} 
                    title="Recent Salary Records"
                />
            </div>
        </div>
    );
};

export default Payroll;
