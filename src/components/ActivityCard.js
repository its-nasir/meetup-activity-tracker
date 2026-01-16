
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import './ActivityCard.css';

const ActivityCard = ({ activity }) => {
    const { user, role } = useAuth();
    const [participation, setParticipation] = useState(null);
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) fetchParticipation();
    }, [user, activity.id]);

    const fetchParticipation = async () => {
        const { data } = await supabase
            .from('participations')
            .select('*')
            .eq('activity_id', activity.id)
            .eq('user_id', user.id)
            .single();
        if (data) setParticipation(data);
    };

    const handleResponse = async (status, reason = null) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('participations')
                .upsert([{
                    activity_id: activity.id,
                    user_id: user.id,
                    status,
                    rejection_reason: reason
                }], { onConflict: 'activity_id,user_id' });

            if (error) throw error;
            await fetchParticipation();
            setShowRejectInput(false);
        } catch (error) {
            console.error('Error updating participation:', error.message);
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="activity-card">
            <h3>{activity.title}</h3>
            <p>{activity.description}</p>
            <div className="activity-meta">
                <span>📅 {activity.date ? new Date(activity.date).toLocaleDateString() : 'TBD'}</span>
                <span>📍 {activity.location || 'TBD'}</span>
            </div>

            <div className="activity-actions">
                {participation ? (
                    <div className={`status-badge status-${participation.status}`}>
                        {participation.status.toUpperCase()}
                        {participation.status === 'rejected' && participation.rejection_reason && (
                            <p className="reject-reason">Reason: "{participation.rejection_reason}"</p>
                        )}
                    </div>
                ) : (
                    !showRejectInput ? (
                        <div className="action-buttons">
                            <button
                                className="btn-accept"
                                onClick={() => handleResponse('accepted')}
                                disabled={loading}
                            >
                                Accept
                            </button>
                            <button
                                className="btn-reject"
                                onClick={() => setShowRejectInput(true)}
                                disabled={loading}
                            >
                                Reject
                            </button>
                        </div>
                    ) : (
                        <div className="reject-form">
                            <input
                                type="text"
                                placeholder="Reason for rejection (required)"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                            />
                            <button
                                onClick={() => {
                                    if (!rejectReason.trim()) return alert('Reason is required');
                                    handleResponse('rejected', rejectReason);
                                }}
                                disabled={loading}
                            >
                                Submit Rejection
                            </button>
                            <button onClick={() => setShowRejectInput(false)} disabled={loading} className="btn-cancel">
                                Cancel
                            </button>
                        </div>
                    )
                )}
            </div>

            {role === 'admin' && (
                <div className="admin-footer">
                    {/* Admin specific controls can go here */}
                    <small>Admin Controls: View Participants (Upcoming)</small>
                </div>
            )}
        </div>
    );
};

export default ActivityCard;
