import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    LayoutDashboard, Users, Clock, CreditCard, 
    BarChart3, UserCheck, Bell, LogOut, Settings, User, X, Calendar
} from 'lucide-react';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const menuGroups = [
        {
            title: 'CORE OPERATIONS',
            roles: ['System Administrator', 'HR Director', 'Department Head', 'Senior Associate', 'Junior Associate'],
            items: [
                { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
                { name: 'Attendance', icon: <Clock size={20} />, path: '/attendance' },
                { name: 'Leaves', icon: <Calendar size={20} />, path: '/leaves' },
                { name: 'Profile', icon: <User size={20} />, path: '/profile' },
            ]
        },
        {
            title: 'TALENT & HR',
            roles: ['System Administrator', 'HR Director', 'HR Generalist', 'Recruitment Manager'],
            items: [
                { name: 'Recruitment', icon: <UserCheck size={20} />, path: '/recruitment' },
                { name: 'Employees', icon: <Users size={20} />, path: '/employees' },
            ]
        },
        {
            title: 'FINANCE & PAYROLL',
            roles: ['System Administrator', 'Finance Controller', 'HR Director'],
            items: [
                { name: 'Payroll', icon: <CreditCard size={20} />, path: '/payroll' },
            ]
        },
        {
            title: 'SYSTEM INTELLIGENCE',
            roles: ['System Administrator', 'HR Director', 'HR Generalist'],
            items: [
                { name: 'Analytics', icon: <BarChart3 size={20} />, path: '/analytics' },
                { name: 'Settings', icon: <Settings size={20} />, path: '/settings', roles: ['System Administrator', 'HR Director'] },
            ]
        }
    ];

    const filteredGroups = menuGroups.map(group => ({
        ...group,
        items: group.items.filter(item => {
            const hasGroupRole = group.roles.includes(user?.role);
            const hasItemRole = item.roles ? item.roles.includes(user?.role) : true;
            return hasGroupRole && hasItemRole;
        })
    })).filter(group => group.items.length > 0);

    return (
        <div className="sidebar glass">
            <div style={{ padding: '0 16px', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary)' }}>SmartHR+</h2>
            </div>
            
            <nav className="no-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
                {filteredGroups.map(group => (
                    <div key={group.title} style={{ marginBottom: '1.5rem' }}>
                        <div style={{ 
                            fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-dim)', 
                            padding: '0 16px', marginBottom: '8px', letterSpacing: '1px' 
                        }}>
                            {group.title}
                        </div>
                        {group.items.map(item => (
                            <div 
                                key={item.path}
                                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                                onClick={() => navigate(item.path)}
                            >
                                {item.icon}
                                <span>{item.name}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </nav>

            <div style={{ marginTop: 'auto' }}>
                <div className="nav-item" style={{ color: 'var(--error)' }} onClick={logout}>
                    <LogOut size={20} />
                    <span>Logout</span>
                </div>
            </div>
        </div>
    );
};

const Layout = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/notifications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setNotifications(await res.json());
        } catch (err) { console.error('Notifications fetch failed'); }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const markAsRead = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/notifications/read/${id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchNotifications();
        } catch (err) { console.error('Mark read failed'); }
    };

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <main className="main-content">
                <header className="layout-header" style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', position: 'relative' }}>
                        <div 
                            className="glass" 
                            style={{ padding: '8px', borderRadius: '50%', cursor: 'pointer', position: 'relative' }}
                            onClick={() => setShowNotifications(!showNotifications)}
                        >
                            <Bell size={20} color={notifications.length > 0 ? 'var(--primary)' : 'var(--text-dim)'} />
                            {notifications.length > 0 && (
                                <div style={{ 
                                    position: 'absolute', top: '0px', right: '0px', 
                                    minWidth: '16px', height: '16px', padding: '0 4px',
                                    background: 'var(--error)', color: 'white', fontSize: '10px',
                                    borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '2px solid var(--bg)', fontWeight: '800'
                                }}>
                                    {notifications.length}
                                </div>
                            )}
                        </div>

                        {/* Notifications Dropdown */}
                        {showNotifications && (
                            <div className="card glass" style={{ 
                                position: 'absolute', top: '100%', right: '0', 
                                width: '320px', zIndex: 1000, marginTop: '10px',
                                padding: '12px', maxHeight: '400px', overflowY: 'auto'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                                    <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>Recent Alerts</span>
                                    <X size={14} style={{ cursor: 'pointer' }} onClick={() => setShowNotifications(false)} />
                                </div>
                                {notifications.length === 0 ? (
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center', padding: '20px' }}>No new notifications</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {notifications.map(n => (
                                            <div key={n.NotificationID} style={{ 
                                                padding: '10px', background: 'rgba(255,255,255,0.03)', 
                                                borderRadius: '8px', border: '1px solid var(--border)',
                                                position: 'relative'
                                            }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--primary)' }}>{n.Title}</div>
                                                <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>{n.Message}</div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>{new Date(n.CreatedAt).toLocaleTimeString()}</span>
                                                    <button 
                                                        style={{ background: 'none', border: 'none', color: 'var(--success)', fontSize: '0.7rem', fontWeight: '600', cursor: 'pointer' }}
                                                        onClick={() => markAsRead(n.NotificationID)}
                                                    >
                                                        Dismiss
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{user.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{user.role}</div>
                        </div>
                        <div className="profile-avatar-horizontal" style={{ width: '40px', height: '40px' }}>
                            <div style={{ 
                                width: '100%', height: '100%', background: 'var(--glass)', 
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                            }}>
                                {user.name.charAt(0)}
                            </div>
                        </div>
                    </div>
                </header>
                <div className="dashboard-view-container no-scrollbar" style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    paddingRight: '10px'
                }}>
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
