import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, AlertTriangle, Building2, Trophy, Clock, Target } from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const Analytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await fetch('/api/analytics/workforce-pulse', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (res.ok) setData(await res.json());
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchAnalytics();
    }, []);

    if (loading) return <div className="loading">Analyzing Enterprise Data...</div>;

    const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b'];

    return (
        <div className="content-area" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Workforce Intelligence</h2>
                    <p style={{ color: 'var(--text-dim)' }}>Predictive insights and departmental performance metrics</p>
                </div>
                <div className="glass" style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--primary)', border: '1px solid var(--primary-glow)' }}>
                    Live SQL Aggregation Enabled
                </div>
            </div>

            <div className="layout-middle" style={{ gap: '2rem' }}>
                {/* 1. Departmental Punctuality Leaderboard */}
                <div className="card glass" style={{ flex: 1.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                        <Trophy size={20} color="var(--warning)" />
                        <h4 style={{ fontWeight: '700' }}>Punctuality Leaderboard</h4>
                    </div>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.leaderboard}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="DepartmentName" stroke="var(--text-dim)" fontSize={10} />
                                <YAxis stroke="var(--text-dim)" fontSize={10} unit="%" />
                                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }} />
                                <Bar dataKey="PunctualityRate" name="Punctuality %" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Operational Presence by Branch */}
                <div className="card glass" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                        <Building2 size={20} color="var(--accent)" />
                        <h4 style={{ fontWeight: '700' }}>Presence by Branch</h4>
                    </div>
                    <div className="no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                        {data?.presence.map((branch, i) => (
                            <div key={i} style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{branch.BranchName}</span>
                                    <span style={{ color: 'var(--success)', fontWeight: '700' }}>{branch.PresentToday}/{branch.TotalEmployees}</span>
                                </div>
                                <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ 
                                        height: '100%', 
                                        width: `${(branch.PresentToday / branch.TotalEmployees) * 100}%`, 
                                        background: 'var(--primary)',
                                        transition: 'width 1s ease-out'
                                    }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="layout-middle" style={{ gap: '2rem' }}>
                {/* 3. Burnout Risk Matrix */}
                <div className="card glass" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                        <AlertTriangle size={20} color="var(--error)" />
                        <h4 style={{ fontWeight: '700' }}>High-Performance Burnout Risk</h4>
                    </div>
                    <div className="no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                        {data?.burnout.map((emp, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Target size={20} color="var(--error)" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{emp.Name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{emp.DepartmentName} • {emp.LateCount} Late Days</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Reward Velocity</div>
                                    <div style={{ fontWeight: '700', color: 'var(--primary)' }}>+{emp.TotalPoints} pts</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. Reward Distribution Analysis */}
                <div className="card glass" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                        <Trophy size={20} color="var(--primary)" />
                        <h4 style={{ fontWeight: '700' }}>Organizational Pulse</h4>
                    </div>
                    <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data?.leaderboard}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="PunctualityRate"
                                    nameKey="DepartmentName"
                                >
                                    {data?.leaderboard.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }} />
                            </PieChart>
                         </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '1rem' }}>
                        {data?.leaderboard.slice(0, 4).map((dept, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[i % COLORS.length] }}></div>
                                <span style={{ color: 'var(--text-dim)' }}>{dept.DepartmentName}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
