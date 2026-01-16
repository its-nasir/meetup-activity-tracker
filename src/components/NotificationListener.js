
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import './Toast.css';

const NotificationListener = () => {
    const [toast, setToast] = useState(null);

    useEffect(() => {
        // Listen for new Activities
        const activitySub = supabase
            .channel('public:activities:notify')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, (payload) => {
                showToast(`🎉 New Activity: ${payload.new.title}`);
            })
            .subscribe();

        // Listen for new Polls
        const pollSub = supabase
            .channel('public:polls:notify')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'polls' }, (payload) => {
                showToast(`📊 New Poll: ${payload.new.title}`);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(activitySub);
            supabase.removeChannel(pollSub);
        };
    }, []);

    const showToast = (message) => {
        setToast(message);
        setTimeout(() => setToast(null), 5000);
    };

    if (!toast) return null;

    return (
        <div className="toast-notification">
            {toast}
        </div>
    );
};

export default NotificationListener;
