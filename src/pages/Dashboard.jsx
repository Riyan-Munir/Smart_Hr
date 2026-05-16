import React, { useState, useEffect } from 'react';
import { Users, Calendar, Wallet, UserPlus, TrendingUp, AlertTriangle, Clock, Award, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';

const StatCard = ({ title, value, icon, color, trend = null }) => (
    <div className="card glass stat-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <p className="stat-label" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>{title}</p>
                <h3 className="stat-value" style={{ fontSize: '1.5rem', fontWeight: '800' }}>{value}</h3>
                {trend && (
                    <p style={{ fontSize: '0.7rem', color: 'var(--success)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <TrendingUp size={12} /> {trend}
                    </p>
                )}
            </div>
            <div style={{ 
                background: `${color}20`, 
                padding: '10px', 
                borderRadius: '12px', 
                border: `1px solid ${color}40` 
            }}>
                {React.cloneElement(icon, { color: color, size: 20 })}
            </div>
        </div>
    </div>
);

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        ActiveEmployees: 0, PendingLeaves: 0, MonthlyPayout: 0, NewApplicants: 0,
        RemainingLeaves: 0, RewardPoints: 0, TodayStatus: null, LastReview: null
    });
    const [workforce, setWorkforce] = useState([]);
    const [productivity, setProductivity] = useState([]);
    const [risks, setRisks] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [broadcastData, setBroadcastData] = useState({ title: '', message: '' });

    const isAdmin = ['System Administrator', 'HR Director', 'Finance Controller', 'Recruitment Manager'].includes(user?.role);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = { 'Authorization': `Bearer ${token}` };
                
                const [statsRes, prodRes, riskRes, annRes, sumRes, hoursRes, workRes] = await Promise.all([
                    fetch('/api/dashboard/stats', { headers }),
                    fetch('/api/analytics/productivity', { headers }),
                    fetch('/api/analytics/risks', { headers }),
                    fetch('/api/dashboard/announcements', { headers }),
                    fetch('/api/dashboard/employee-summary', { headers }),
                    fetch('/api/analytics/personal-hours', { headers }),
                    fetch('/api/analytics/workforce', { headers })
                ]);

                const sData = await statsRes.json();
                const pData = await prodRes.json();
                const rData = await riskRes.json();
                const aData = await annRes.json();
                const uData = await sumRes.json();
                const hData = await hoursRes.json();
                const wData = await workRes.json();

                setStats({ ...sData, ...uData });
                setProductivity(isAdmin ? pData : hData);
                setRisks(rData);
                setAnnouncements(aData);
                setWorkforce(wData);
            } catch (err) {
                console.error('Dashboard data fetch failed');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [isAdmin]);

    const handleBroadcast = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(broadcastData)
            });
            if (res.ok) {
                alert('Broadcast Sent Successfully!');
                setBroadcastData({ title: '', message: '' });
            }
        } catch (err) { alert('Broadcast failed'); }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <div className="spin-animation"><Clock size={40} color="var(--primary)" /></div>
        </div>
    );

    return (
        <div className="content-area" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>
                        {isAdmin ? 'Operational Command Center' : `Welcome Back, ${user.name.split(' ')[0]}`}
                    </h2>
                    <p style={{ color: 'var(--text-dim)' }}>
                        {isAdmin ? 'Real-time organizational health & compliance monitoring' : 'Your personal career progress and daily task overview'}
                    </p>
                </div>
                <div className="glass" style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="status-circle-small" style={{ background: 'var(--success)' }}></div>
                    Live Database Connection
                </div>
            </div>

            {/* Top Stats Row */}
            <div className="stats-grid">
                {isAdmin ? (
                    <>
                        <StatCard title="Total Workforce" value={stats.ActiveEmployees} icon={<Users />} color="var(--primary)" trend="+4% vs last month" />
                        <StatCard title="Pending Approvals" value={stats.PendingLeaves} icon={<Clock />} color="var(--warning)" />
                        <StatCard title="Budget Utilization" value={`$${(stats.MonthlyPayout / 1000).toFixed(1)}k`} icon={<Wallet />} color="var(--success)" />
                        <StatCard title="Recruitment Pipe" value={stats.NewApplicants} icon={<UserPlus />} color="var(--accent)" />
                    </>
                ) : (
                    <>
                        <StatCard title="Leave Balance" value={stats.RemainingLeaves || 0} icon={<Calendar />} color="var(--primary)" />
                        <StatCard title="Reward Points" value={stats.RewardPoints || 0} icon={<Award />} color="var(--warning)" trend="+50 earned recently" />
                        <StatCard title="Attendance" value={stats.TodayStatus || 'Pending'} icon={<CheckCircle />} color="var(--success)" />
                        <StatCard title="Last Review" value={stats.LastReview ? new Date(stats.LastReview).toLocaleDateString() : 'None'} icon={<TrendingUp />} color="var(--accent)" />
                    </>
                )}
            </div>

            {/* Middle Section: Insights & Activity */}
            <div className="layout-middle">
                {/* Primary Chart Area */}
                <div className="card glass" style={{ flex: 2, minHeight: '400px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h4 style={{ fontWeight: '700' }}>{isAdmin ? 'Organizational Productivity' : 'Personal Performance Benchmark'}</h4>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Last 30 Days</div>
                    </div>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={productivity}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey={isAdmin ? "EmployeeName" : "Day"} stroke="var(--text-dim)" fontSize={10} hide={false} />
                                <YAxis stroke="var(--text-dim)" fontSize={10} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }} />
                                <Bar dataKey={isAdmin ? "ProductivityScore" : "Hours"} fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right Panel: Risks or Announcements */}
                <div className="card glass" style={{ flex: 1.2, display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ fontWeight: '700', marginBottom: '1.5rem' }}>{isAdmin ? 'Predictive Risk Intelligence' : 'Company Announcements'}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {isAdmin ? (
                            risks.length > 0 ? risks.map((risk, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    <div style={{ padding: '8px', background: risk.Category === 'Burnout' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', borderRadius: '8px' }}>
                                        <AlertTriangle size={16} color={risk.Category === 'Burnout' ? 'var(--error)' : 'var(--warning)'} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>{risk.Name}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{risk.Category} Risk: {risk.Risk}</div>
                                    </div>
                                </div>
                            )) : <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>No critical risks detected</p>
                        ) : (
                            announcements.map((ann, i) => (
                                <div key={i} style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary)' }}>{ann.Title}</div>
                                    <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>{ann.Message}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '8px' }}>{new Date(ann.CreatedAt).toLocaleDateString()}</div>
                                </div>
                            ))
                        )}
                    </div>
                    {!isAdmin && (
                        <button className="btn btn-secondary" style={{ marginTop: 'auto', width: '100%', fontSize: '0.8rem' }}>
                            View Internal Portal
                        </button>
                    )}
                </div>
            </div>

            {/* Lower Section: Detailed Analytics & System Control */}
            <div className="layout-middle">
                {/* Workforce Distribution Heatmap - Unique Feature */}
                <div className="card glass" style={{ flex: 1.5 }}>
                    <h4 style={{ fontWeight: '700', marginBottom: '1rem' }}>Workforce Distribution Heatmap</h4>
                    <div style={{ height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={workforce}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {workforce.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#6366f1', '#a855f7', '#ec4899', '#f97316', '#22c55e', '#06b6d4'][index % 6]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }} />
                                <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ paddingLeft: '20px', fontSize: '0.65rem', lineHeight: '1.5' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* System Control / Task Board */}
                <div className="card glass" style={{ flex: 1 }}>
                    {isAdmin ? (
                        <>
                            <h4 style={{ fontWeight: '700', marginBottom: '1.25rem' }}>Global Broadcast System</h4>
                            <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <input 
                                    className="form-input" 
                                    placeholder="Announcement Title..." 
                                    style={{ fontSize: '0.8rem' }}
                                    value={broadcastData.title}
                                    onChange={e => setBroadcastData({...broadcastData, title: e.target.value})}
                                    required
                                />
                                <textarea 
                                    className="form-input" 
                                    placeholder="Type global message here..." 
                                    style={{ fontSize: '0.8rem', minHeight: '80px', resize: 'none' }}
                                    value={broadcastData.message}
                                    onChange={e => setBroadcastData({...broadcastData, message: e.target.value})}
                                    required
                                />
                                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '10px' }}>
                                    Publish to All Employees
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <h4 style={{ fontWeight: '700', marginBottom: '1.25rem' }}>Personal Activity Feed</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {announcements.length > 0 ? announcements.map((ann, i) => (
                                    <div key={i} style={{ padding: '12px', borderLeft: '4px solid var(--primary)', background: 'rgba(255,255,255,0.03)', borderRadius: '4px 8px 8px 4px' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>{ann.Title}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{new Date(ann.CreatedAt).toLocaleDateString()}</div>
                                    </div>
                                )) : <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>No recent activity</p>}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
