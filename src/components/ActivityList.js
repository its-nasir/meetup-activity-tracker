
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import ActivityCard from './ActivityCard';

const ActivityList = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActivities();

        // Subscribe to new activities
        const subscription = supabase
            .channel('public:activities')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, (payload) => {
                setActivities(prev => [payload.new, ...prev]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const fetchActivities = async () => {
        try {
            const { data, error } = await supabase
                .from('activities')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setActivities(data);
        } catch (error) {
            console.error('Error fetching activities:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading activities...</div>;

    return (
        <div className="activity-list">
            {activities.length === 0 ? (
                <p>No activities found. Wait for the admin to finalize a poll!</p>
            ) : (
                activities.map(activity => <ActivityCard key={activity.id} activity={activity} />)
            )}
        </div>
    );
};

export default ActivityList;
