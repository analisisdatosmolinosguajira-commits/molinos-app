import { supabase } from './supabase';

export const CrewService = {
    // Get all crews with member count
    async getCrews() {
        const { data, error } = await supabase
            .from('crew')
            .select(`
                *,
                crew_member (count)
            `)
            .order('name');

        if (error) throw error;

        return data.map(c => ({
            ...c,
            member_count: c.crew_member?.[0]?.count || 0
        }));
    },

    // Get specific crew with full member details
    async getCrewById(id) {
        const { data: crew, error } = await supabase
            .from('crew')
            .select('*')
            .eq('crew_id', id)
            .single();
        if (error) throw error;

        // Fetch members joined with Person
        // Adjusting strategy: fetch crew_member, then join person if supported, 
        // or manual join if basic join fails. 
        // Trying standard Supabase relational query first.
        const { data: members, error: memberError } = await supabase
            .from('crew_member')
            .select(`
                *,
                person (
                    person_id,
                    first_name,
                    last_name,
                    person_role (name)
                )
            `)
            .eq('crew_id', id);

        // If person table or relation doesn't exist as expected, we might get nulls.
        // We will map safely.
        const formattedMembers = (members || []).map(m => ({
            ...m,
            name: m.person ? `${m.person.first_name} ${m.person.last_name}` : 'Nombre no disponible',
            role: m.role_in_crew || m.person?.person_role?.name || 'Técnico'
        }));

        return {
            ...crew,
            members: formattedMembers
        };
    },

    // Get active crews for assignment
    async getActiveCrews() {
        const { data, error } = await supabase
            .from('crew')
            .select('crew_id, name')
            .eq('active', true)
            .order('name');
        if (error) throw error;
        return data;
    }
};
