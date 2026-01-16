
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import NotificationListener from './NotificationListener';
import './Layout.css';

const Layout = () => {
    return (
        <div className="app-container">
            <Navbar />
            <NotificationListener />
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
