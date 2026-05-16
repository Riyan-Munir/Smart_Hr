import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import EmployeeList from './pages/EmployeeList';
import Payroll from './pages/Payroll';
import Attendance from './pages/Attendance';
import Recruitment from './pages/Recruitment';
import PublicApply from './pages/PublicApply';
import Profile from './pages/Profile';
import Leaves from './pages/Leaves';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import Layout from './components/Layout';

const ProtectedRoute = ({ children, allowedRoles = null }) => {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/login" />;
    if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" />;
    return children;
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/apply" element={<PublicApply />} />
                    
                    <Route path="/dashboard" element={
                        <ProtectedRoute>
                            <Layout><Dashboard /></Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/employees" element={
                        <ProtectedRoute allowedRoles={['System Administrator', 'HR Director', 'HR Generalist']}>
                            <Layout><EmployeeList /></Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/attendance" element={
                        <ProtectedRoute>
                            <Layout><Attendance /></Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/payroll" element={
                        <ProtectedRoute allowedRoles={['System Administrator', 'HR Director', 'Finance Controller']}>
                            <Layout><Payroll /></Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/recruitment" element={
                        <ProtectedRoute allowedRoles={['System Administrator', 'HR Director', 'Recruitment Manager']}>
                            <Layout><Recruitment /></Layout>
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/profile" element={
                        <ProtectedRoute>
                            <Layout><Profile /></Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/leaves" element={
                        <ProtectedRoute>
                            <Layout><Leaves /></Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/analytics" element={
                        <ProtectedRoute allowedRoles={['System Administrator', 'HR Director', 'HR Generalist']}>
                            <Layout><Analytics /></Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="/settings" element={
                        <ProtectedRoute allowedRoles={['System Administrator', 'HR Director']}>
                            <Layout><Settings /></Layout>
                        </ProtectedRoute>
                    } />

                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
