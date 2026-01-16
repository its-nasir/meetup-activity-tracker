
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import './PollCard.css';

const PollCard = ({ poll }) => {
    const { user, role } = useAuth();
    const [options, setOptions] = useState([]);
    const [hasVoted, setHasVoted] = useState(false);
    const [totalVotes, setTotalVotes] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchOptionsAndVotes();

        // Subscribe to real-time changes
        const voteOptionsSubscription = supabase
            .channel(`public:poll_options:poll_id=eq.${poll.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_options', filter: `poll_id=eq.${poll.id}` }, (payload) => {
                fetchOptionsAndVotes();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(voteOptionsSubscription);
        };
    }, [poll.id]);

    const fetchOptionsAndVotes = async () => {
        // 1. Fetch Options
        const { data: optionsData, error } = await supabase
            .from('poll_options')
            .select('*')
            .eq('poll_id', poll.id)
            .order('id');

        if (error) console.error('Error fetching options', error);
        else {
            setOptions(optionsData);
            const total = optionsData.reduce((acc, curr) => acc + (curr.votes_count || 0), 0);
            setTotalVotes(total);
        }

        // 2. Check if user voted
        if (user) {
            const { data: voteData } = await supabase
                .from('votes')
                .select('id')
                .eq('poll_id', poll.id)
                .eq('user_id', user.id)
                .single();

            setHasVoted(!!voteData);
        }
    };

    const handleVote = async (optionId) => {
        if (loading) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('votes')
                .insert([{
                    poll_id: poll.id,
                    user_id: user.id,
                    option_id: optionId
                }]);

            if (error) {
                if (error.code === '23505') alert('You have already voted!');
                else throw error;
            } else {
                setHasVoted(true);
                // Optimistic update of UI or wait for subscription
            }
        } catch (error) {
            console.error('Error voting:', error.message);
            alert('Error voting');
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (accepted) => {
        if (!window.confirm(accepted ? 'Create Activity from this poll?' : 'Reject this poll?')) return;

        setLoading(true);
        try {
            if (accepted) {
                // Find winning option (simple max votes)
                const winner = options.reduce((prev, current) => (prev.votes_count > current.votes_count) ? prev : current);

                // Create Activity
                const { error: activityError } = await supabase
                    .from('activities')
                    .insert([{
                        title: poll.title + ': ' + winner.title,
                        description: poll.description,
                        created_by: user.id,
                    }]);

                if (activityError) throw activityError;
            }

            // Mark Poll as Resolved
            const { error: pollError } = await supabase
                .from('polls')
                .update({ is_resolved: true })
                .eq('id', poll.id);

            if (pollError) throw pollError;

            alert(accepted ? 'Activity Created!' : 'Poll Rejected.');
        } catch (error) {
            console.error('Error resolving poll:', error.message);
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="poll-card">
            <h4>{poll.title}</h4>
            <p className="poll-desc">{poll.description}</p>

            <div className="poll-options">
                {options.map(option => {
                    const percentage = totalVotes > 0 ? ((option.votes_count || 0) / totalVotes) * 100 : 0;
                    return (
                        <div key={option.id} className={`poll-option ${hasVoted ? 'voted' : ''}`}>
                            <div className="option-header">
                                <span>{option.title}</span>
                                {hasVoted && <span>{Math.round(percentage)}% ({option.votes_count})</span>}
                            </div>

                            {hasVoted ? (
                                <div className="progress-bar-bg">
                                    <div className="progress-bar-fill" style={{ width: `${percentage}%` }}></div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleVote(option.id)}
                                    disabled={loading}
                                    className="btn-vote"
                                >
                                    Vote
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="poll-footer">
                <span>Total Votes: {totalVotes}</span>
                {poll.is_resolved ? (
                    <span className="status-resolved">Resolved</span>
                ) : (
                    user && role === 'admin' && (
                        <div className="admin-actions">
                            <button
                                className="btn-admin btn-accept"
                                onClick={() => handleResolve(true)}
                                disabled={loading}
                            >
                                Accept & Create Activity
                            </button>
                            <button
                                className="btn-admin btn-reject"
                                onClick={() => handleResolve(false)}
                                disabled={loading}
                            >
                                Reject
                            </button>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default PollCard;
