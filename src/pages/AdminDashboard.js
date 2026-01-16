import React from 'react';
import ActivityList from '../components/ActivityList';
import Leaderboard from '../components/Leaderboard';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Admin Dashboard</h1>
                <Link to="/polls" className="btn-primary" style={{ textDecoration: 'none' }}>
                    Manage Polls
                </Link>
            </div>

            <section style={{ marginBottom: '3rem' }}>
                <Leaderboard />
            </section>

            <section>
                <h2>Activity Oversight</h2>
                <ActivityList />
            </section>
        </div>
    );
};

export default AdminDashboard;
