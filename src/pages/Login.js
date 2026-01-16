
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Add this import
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
    const { login, user, role } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            if (role === 'admin') navigate('/admin');
            else navigate('/dashboard');
        }
    }, [user, role, navigate]);

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Welcome to Meetup Tracker</h1>
                <p>Please sign in to continue</p>
                <div className="simulation-buttons">
                    <button className="btn-login btn-admin" onClick={() => login('admin')}>
                        Login as Admin
                    </button>
                    <button className="btn-login btn-user" onClick={() => login('user')}>
                        Login as User
                    </button>
                </div>
                <p className="simulation-note">
                    (Simulation Mode: No Google Auth required)
                </p>
            </div>
        </div>
    );
};

export default Login;
