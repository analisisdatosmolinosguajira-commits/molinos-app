import { supabase } from './supabase';

export const NotificationService = {
    /**
     * Fetch recent notifications for the current user.
     * @param {number} limit - Max notifications to return
     */
    async getNotifications(limit = 40) {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    },

    /**
     * Mark a single notification as read.
     */
    async markAsRead(id) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);
        if (error) throw error;
    },

    /**
     * Mark all notifications for the current user as read.
     */
    async markAllRead() {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('is_read', false);
        if (error) throw error;
    },

    /**
     * Fetch notification preferences for the current user.
     * Always returns a valid preferences object, creating defaults if none exist.
     */
    async getPreferences(userId) {
        const DEFAULTS = {
            user_id: userId,
            new_assignments: true,
            activity_status_change: true,
            ot_status_change: true,
            diagnosis_status_change: true,
            concertation_status_change: true,
            stock_low_alert: true,
            goal_progress: false,
        };

        try {
            const { data, error } = await supabase
                .from('notification_preferences')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle(); // Returns null (not error) when no row found

            if (error) {
                console.warn('Could not load notification preferences:', error.message);
                return DEFAULTS;
            }

            if (!data) {
                // No row yet — create it
                const { data: newRow, error: insertError } = await supabase
                    .from('notification_preferences')
                    .insert({ user_id: userId })
                    .select()
                    .single();
                if (insertError) {
                    console.warn('Could not create notification preferences:', insertError.message);
                    return DEFAULTS;
                }
                return newRow;
            }

            return data;
        } catch (err) {
            console.error('Error in getPreferences:', err);
            return DEFAULTS;
        }
    },

    /**
     * Save notification preferences.
     */
    async savePreferences(userId, prefs) {
        const { error } = await supabase
            .from('notification_preferences')
            .upsert({
                user_id: userId,
                ...prefs,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        if (error) throw error;
    },

    /**
     * Subscribe to new notifications for the current user (realtime).
     * Returns unsub function.
     */
    subscribe(userId, onNew) {
        const channel = supabase
            .channel(`notifications:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => onNew(payload.new)
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }
};
