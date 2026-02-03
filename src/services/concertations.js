import { supabase } from './supabase';

export const ConcertationService = {
    async getConcertations() {
        // 'community_concertation' is the table
        const { data, error } = await supabase
            .from('community_concertation')
            .select(`
                *,
                community (name)
            `)
            .order('meeting_date', { ascending: false });
        if (error) throw error;
        return data;
    },

    async getConcertationById(id) {
        const { data, error } = await supabase
            .from('community_concertation')
            .select(`
                *,
                community (*),
                concertation_person (
                    person (*)
                ),
                concertation_community_member (
                    community_member (*)
                )
            `)
            .eq('concertation_id', id)
            .single();
        if (error) throw error;
        return data;
    }
};
