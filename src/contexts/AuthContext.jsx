import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [person, setPerson] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            try {
                // Safety timeout against hanging requests
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout fetching session')), 5000)
                );

                const { data: { session }, error } = await Promise.race([
                    supabase.auth.getSession(),
                    timeoutPromise
                ]);

                if (error) throw error;

                if (mounted && session?.user) {
                    setUser(session.user);
                    await loadProfile(session.user.id);
                } else if (mounted) {
                    setLoading(false);
                }
            } catch (err) {
                console.error('Initial session error:', err);
                if (mounted) setLoading(false);
            }
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                if (event === 'SIGNED_IN' && session?.user) {
                    setUser(session.user);
                    await loadProfile(session.user.id);
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setProfile(null);
                    setPerson(null);
                    setLoading(false);
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const loadProfile = async (userId) => {
        try {
            const { data: prof, error: profError } = await supabase
                .from('user_profile')
                .select('*')
                .eq('id', userId)
                .single();

            if (profError) {
                console.warn('Could not load profile, using defaults:', profError.message);
                // Set a default profile so the app still works
                setProfile({ id: userId, app_role: 'operativo', person_id: null });
            } else {
                setProfile(prof);

                // Load person if linked
                if (prof?.person_id) {
                    const { data: personData } = await supabase
                        .from('person')
                        .select('*')
                        .eq('person_id', prof.person_id)
                        .single();
                    setPerson(personData || null);
                }
            }
        } catch (err) {
            console.error('Error loading profile:', err);
            setProfile({ id: userId, app_role: 'operativo', person_id: null });
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setUser(null);
        setProfile(null);
        setPerson(null);
    };

    const updatePassword = async (newPassword) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
    };

    const refreshProfile = () => {
        if (user) return loadProfile(user.id);
    };

    const value = {
        user,
        profile,
        person,
        loading,
        signIn,
        signOut,
        updatePassword,
        refreshProfile,
        isAuthenticated: !!user,
        isSupervisor: profile?.app_role === 'supervisor',
        displayName: person
            ? `${person.first_name} ${person.last_name}`
            : user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario',
        initials: person
            ? `${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`.toUpperCase()
            : (user?.email?.[0] || 'U').toUpperCase(),
        roleName: {
            supervisor: 'Supervisor',
            ing_lider: 'Ingeniero Líder',
            social_lider: 'Líder Social',
            inventario_lider: 'Líder Inventario',
            operativo: 'Operativo'
        }[profile?.app_role] || 'Usuario',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
