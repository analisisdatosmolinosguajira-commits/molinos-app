import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { clearPermissionCache } from '../hooks/usePermissions';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [person, setPerson] = useState(null);
    const [loading, setLoading] = useState(true);
    const sessionInitialized = useRef(false);

    useEffect(() => {
        let mounted = true;

        // Use onAuthStateChange as the SINGLE source of truth for session state.
        // This avoids the race condition between getSession() and onAuthStateChange
        // that caused data to load then disappear.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                console.log('[Auth] Event:', event, '| User:', session?.user?.email || 'none');

                if (session?.user) {
                    setUser(session.user);

                    // Only load profile once per session initialization or on explicit sign-in
                    // Avoid redundant loads on TOKEN_REFRESHED events
                    if (!sessionInitialized.current || event === 'SIGNED_IN') {
                        sessionInitialized.current = true;
                        // Use setTimeout(0) to avoid Supabase deadlock warning:
                        // "Using supabase.auth.getSession() inside onAuthStateChange..."
                        setTimeout(() => {
                            if (mounted) loadProfile(session.user.id);
                        }, 0);
                    }
                } else if (event === 'SIGNED_OUT') {
                    sessionInitialized.current = false;
                    setUser(null);
                    setProfile(null);
                    setPerson(null);
                    setLoading(false);
                } else if (event === 'INITIAL_SESSION' && !session) {
                    // No active session — user is not logged in
                    setLoading(false);
                }
            }
        );

        // Safety fallback: if onAuthStateChange never fires (network issues),
        // stop loading after 20 seconds so the user can at least see the login page
        const safetyTimer = setTimeout(() => {
            if (mounted && loading) {
                console.warn('[Auth] Safety timeout — stopping loading spinner');
                setLoading(false);
            }
        }, 20000);

        return () => {
            mounted = false;
            clearTimeout(safetyTimer);
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
                setProfile({ id: userId, app_role: 'operativo', person_id: null });
            } else {
                setProfile(prof);

                // Load person if linked
                if (prof?.person_id) {
                    const { data: personData } = await supabase
                        .from('person')
                        .select('*, person_role(name)')
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
        clearPermissionCache();
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
        secondaryRole: profile?.secondary_role || null,
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
            logistica_lider: 'Líder Logística',
            sst_lider: 'Líder SST',
            operativo: 'Operativo'
        }[profile?.app_role] || 'Operativo',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
