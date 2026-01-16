
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import './CreatePollForm.css';

const CreatePollForm = ({ onPollCreated }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [loading, setLoading] = useState(false);

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const addOption = () => {
        setOptions([...options, '']);
    };

    const removeOption = (index) => {
        if (options.length > 2) {
            const newOptions = options.filter((_, i) => i !== index);
            setOptions(newOptions);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || options.some(opt => !opt.trim())) {
            alert('Please fill in valid title and options');
            return;
        }

        setLoading(true);
        try {
            // 1. Create Poll
            const { data: poll, error: pollError } = await supabase
                .from('polls')
                .insert([{
                    title,
                    description,
                    creator_id: user.id
                }])
                .select()
                .single();

            if (pollError) throw pollError;

            // 2. Create Options
            const optionsData = options
                .filter(opt => opt.trim())
                .map(opt => ({
                    poll_id: poll.id,
                    title: opt
                }));

            const { error: optionsError } = await supabase
                .from('poll_options')
                .insert(optionsData);

            if (optionsError) throw optionsError;

            // Reset
            setTitle('');
            setDescription('');
            setOptions(['', '']);
            if (onPollCreated) onPollCreated();
            alert('Poll created successfully!');

        } catch (error) {
            console.error('Error creating poll:', error.message);
            alert('Failed to create poll: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-poll-card">
            <h3>Create New Poll</h3>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Poll Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        placeholder="e.g. Next Team Lunch"
                    />
                </div>

                <div className="form-group">
                    <label>Description (Optional)</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Details about the event..."
                    />
                </div>

                <div className="form-group">
                    <label>Options</label>
                    {options.map((opt, index) => (
                        <div key={index} className="option-input-group">
                            <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                placeholder={`Option ${index + 1}`}
                                required
                            />
                            {options.length > 2 && (
                                <button type="button" onClick={() => removeOption(index)} className="btn-remove">X</button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={addOption} className="btn-add-option">+ Add Option</button>
                </div>

                <button type="submit" disabled={loading} className="btn-create">
                    {loading ? 'Creating...' : 'Create Poll'}
                </button>
            </form>
        </div>
    );
};

export default CreatePollForm;
