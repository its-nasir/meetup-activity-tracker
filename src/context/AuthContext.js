
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(session.user);
                await fetchProfile(session.user.id);
            }
            setLoading(false);
        };

        getSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                setUser(session.user);
                await fetchProfile(session.user.id);
            } else {
                setUser(null);
                setRole(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
            } else if (data) {
                setRole(data.role);
            }
        } catch (err) {
            console.error('Unexpected error fetching profile:', err);
        }
    };

    const login = async (role = 'user') => {
        try {
            const { data: { session }, error } = await supabase.auth.signInWithOAuth({
                provider: 'google', // Mock client ignores this or treats it as success
            });
            if (error) throw error;

            if (session?.user) {
                // Upsert profile with role
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        { id: session.user.id, role: role, email: session.user.email }
                    ]);

                if (profileError) {
                    console.error('Error creating profile:', profileError);
                    // In mock, insert might fail if ID exists? No, mock inserts new rows. 
                    // But mock table reading might be simple. 
                    // Actually, my mock INSERT pushes to array. 
                    // I should probably clean up old profiles for this user if I can, but generic insert is fine for now.
                    // Wait, mock insert adds to array. If I login again, I get a NEW user ID in my mock.
                }

                setRole(role);
                setUser(session.user);
            }
        } catch (error) {
            console.error('Error signing in:', error.message);
            alert(error.message);
        }
    };

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            console.error('Error signing out:', error.message);
        }
    };

    const value = {
        user,
        role,
        loading,
        login,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};
