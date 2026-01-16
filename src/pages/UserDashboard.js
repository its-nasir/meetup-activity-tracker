
import React from 'react';
import ActivityList from '../components/ActivityList';

const UserDashboard = () => {
    return (
        <div>
            <h1>Activity Dashboard</h1>
            <p>Here are the finalized activities. Please accept or reject them.</p>
            <ActivityList />
        </div>
    );
};

export default UserDashboard;
