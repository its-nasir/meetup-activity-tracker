
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
    const { user, role, loading } = useAuth();

    if (loading) {
        return <div className="loading-screen">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(role)) { 
        // If role is loaded but not allowed, redirect to authorized dashboard or home
        if (role === 'admin') return <Navigate to="/admin" replace />;
        if (role === 'user') return <Navigate to="/dashboard" replace />;
        return <Navigate to="/" replace />; // Fallback
    }

    return <Outlet />;
};

export default ProtectedRoute;
