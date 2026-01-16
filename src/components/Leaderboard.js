
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import './Leaderboard.css';

const Leaderboard = () => {
    const { role } = useAuth();
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterActivity, setFilterActivity] = useState('');

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            const { data, error } = await supabase
                .from('participations')
                .select(`
          id,
          status,
          is_top_performer,
          created_at,
          user_id,
          profiles (full_name, email),
          activities (id, title, date)
        `)
                .eq('status', 'accepted')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEntries(data);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleTopPerformer = async (id, currentState) => {
        if (role !== 'admin') return;

        // Check limit? "Top 3 per activity". 
        // Ideally we check before update, but for now just toggle.

        try {
            const { error } = await supabase
                .from('participations')
                .update({ is_top_performer: !currentState })
                .eq('id', id);

            if (error) throw error;
            fetchLeaderboard();
        } catch (error) {
            alert('Error updating: ' + error.message);
        }
    };

    const filteredEntries = filterActivity
        ? entries.filter(e => e.activities.title.toLowerCase().includes(filterActivity.toLowerCase()))
        : entries;

    if (loading) return <div>Loading Leaderboard...</div>;

    return (
        <div className="leaderboard-container">
            <h2>🏆 Activity Leaderboard</h2>

            <div className="filters">
                <input
                    type="text"
                    placeholder="Filter by Activity Name..."
                    value={filterActivity}
                    onChange={(e) => setFilterActivity(e.target.value)}
                    className="search-input"
                />
            </div>

            <table className="leaderboard-table">
                <thead>
                    <tr>
                        <th>Activity</th>
                        <th>Date</th>
                        <th>Participant</th>
                        <th>Top Performer</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredEntries.map(entry => (
                        <tr key={entry.id} className={entry.is_top_performer ? 'row-winner' : ''}>
                            <td>{entry.activities?.title || 'Unknown'}</td>
                            <td>{entry.activities?.date ? new Date(entry.activities.date).toLocaleDateString() : '-'}</td>
                            <td>{entry.profiles?.full_name || entry.profiles?.email}</td>
                            <td>
                                {role === 'admin' ? (
                                    <button
                                        onClick={() => toggleTopPerformer(entry.id, entry.is_top_performer)}
                                        className={`btn-star ${entry.is_top_performer ? 'active' : ''}`}
                                    >
                                        {entry.is_top_performer ? '⭐ Top Performer' : '☆ Mark Top'}
                                    </button>
                                ) : (
                                    entry.is_top_performer ? '⭐' : '-'
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Leaderboard;
