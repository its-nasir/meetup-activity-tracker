import React, { useState } from 'react';
import CreatePollForm from '../components/CreatePollForm';
import PollList from '../components/PollList';
import './Polls.css';

const Polls = () => {
    const [showCreate, setShowCreate] = useState(false);

    return (
        <div className="polls-page">
            <div className="polls-header">
                <h1>Polls</h1>
                <button
                    className="btn-primary"
                    onClick={() => setShowCreate(!showCreate)}
                >
                    {showCreate ? 'Cancel' : 'Create New Poll'}
                </button>
            </div>

            {showCreate && <CreatePollForm onPollCreated={() => setShowCreate(false)} />}

            <PollList />
        </div>
    );
};

export default Polls;
