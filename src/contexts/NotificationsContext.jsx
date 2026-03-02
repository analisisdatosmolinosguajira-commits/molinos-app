import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { NotificationService } from '../services/notifications';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [preferences, setPreferences] = useState(null);
    const [loading, setLoading] = useState(true);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const loadNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const data = await NotificationService.getNotifications(40);
            setNotifications(data);
        } catch (err) {
            console.error('Failed to load notifications:', err);
        }
    }, [user]);

    const loadPreferences = useCallback(async () => {
        if (!user) return;
        try {
            const prefs = await NotificationService.getPreferences(user.id);
            setPreferences(prefs);
        } catch (err) {
            console.error('Failed to load notification preferences:', err);
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        Promise.all([loadNotifications(), loadPreferences()])
            .finally(() => setLoading(false));

        // Generate expiry notifications once on session
        supabase.rpc('generate_expiry_notifications').then(({ data, error }) => {
            if (error) console.warn('Expiry notifications error:', error.message);
            else if (data > 0) loadNotifications(); // reload if new notifs were created
        });

        // Subscribe to realtime inserts
        const unsub = NotificationService.subscribe(user.id, (newNotif) => {
            setNotifications(prev => [newNotif, ...prev]);
        });

        return unsub;
    }, [user, loadNotifications, loadPreferences]);

    const markRead = async (id) => {
        await NotificationService.markAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const markAllRead = async () => {
        await NotificationService.markAllRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const savePreferences = async (newPrefs) => {
        await NotificationService.savePreferences(user.id, newPrefs);
        setPreferences(prev => ({ ...prev, ...newPrefs }));
    };

    return (
        <NotificationsContext.Provider value={{
            notifications, unreadCount, loading,
            markRead, markAllRead,
            preferences, savePreferences,
            reload: loadNotifications
        }}>
            {children}
        </NotificationsContext.Provider>
    );
}

export const useNotifications = () => {
    const ctx = useContext(NotificationsContext);
    if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
    return ctx;
};
