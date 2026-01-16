
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css'; // We'll create this CSS next

const Navbar = () => {
    const { user, role, signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    if (!user) return null;

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Link to="/">Meetup Tracker</Link>
            </div>
            <div className="navbar-links">
                {role === 'admin' && (
                    <>
                        <Link to="/admin">Admin Dashboard</Link>
                        <Link to="/polls">Polls Management</Link>
                    </>
                )}
                {role === 'user' && (
                    <>
                        <Link to="/dashboard">Activity Dashboard</Link>
                        <Link to="/polls">Active Polls</Link>
                    </>
                )}
            </div>
            <div className="navbar-user">
                <span className="username">{user.email}</span>
                <button onClick={handleSignOut} className="btn-logout">Logout</button>
            </div>
        </nav>
    );
};

export default Navbar;
