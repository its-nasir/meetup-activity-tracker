
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import PollCard from './PollCard';

const PollList = () => {
    const [polls, setPolls] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPolls();

        const subscription = supabase
            .channel('public:polls')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, (payload) => {
                fetchPolls();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const fetchPolls = async () => {
        try {
            const { data, error } = await supabase
                .from('polls')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPolls(data);
        } catch (error) {
            console.error('Error fetching polls:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading polls...</div>;

    return (
        <div className="poll-list">
            {polls.length === 0 ? (
                <p>No active polls found.</p>
            ) : (
                polls.map(poll => <PollCard key={poll.id} poll={poll} />)
            )}
        </div>
    );
};

export default PollList;
