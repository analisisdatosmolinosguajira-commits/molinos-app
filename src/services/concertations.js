import { supabase } from './supabase';

export const ConcertationService = {
    // --- BASIC CRUD ---
    async getConcertations() {
        const { data, error } = await supabase
            .from('community_concertation')
            .select(`
                *,
                closing_note,
                community (name),
                diagnosis (code, diagnosis_type)
            `)
            .order('meeting_date', { ascending: false })
            .order('concertation_id', { ascending: false });
        if (error) throw error;
        return data;
    },

    async getConcertationById(id) {
        const { data, error } = await supabase
            .from('community_concertation')
            .select(`
                *,
                closing_note,
                community (*),
                diagnosis (*),
                concertation_person (
                    id,
                    person_id,
                    person (
                        person_id,
                        first_name,
                        last_name,
                        document_id,
                        role:person_role (name)
                    )
                ),
                concertation_community_member (
                    id,
                    community_member_id,
                    community_member (
                        id,
                        status,
                        person (
                            first_name,
                            last_name,
                            document_id
                        ),
                        community_role (name)
                    )
                )
            `)
            .eq('concertation_id', id)
            .single();
        if (error) throw error;

        // Flatten structure for easier consumption if needed, 
        // but frontend likely expects nested objects or we map them there.
        // Let's ensure 'role' is a string in the output to avoid breaking frontend
        if (data && data.concertation_person) {
            data.concertation_person.forEach(cp => {
                if (cp.person && cp.person.role) {
                    cp.person.role = cp.person.role.name || 'Sin Rol';
                }
            });
        }

        return data;
    },

    async createConcertation(concertationData) {
        // Expected data: { community_id, meeting_date, status, notes, ... }
        const { data, error } = await supabase
            .from('community_concertation')
            .insert([concertationData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateConcertation(id, updates) {
        const { data, error } = await supabase
            .from('community_concertation')
            .update(updates)
            .eq('concertation_id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteConcertation(id) {
        // First delete relations (if not cascaded by DB, though they likely are)
        // Ideally DB handles cascade, but to be safe:
        await supabase.from('concertation_person').delete().eq('concertation_id', id);
        await supabase.from('concertation_community_member').delete().eq('concertation_id', id);

        const { error } = await supabase
            .from('community_concertation')
            .delete()
            .eq('concertation_id', id);

        if (error) throw error;
        return true;
    },

    // --- PARTICIPANTS MANAGEMENT ---

    // 1. Community Members
    async addCommunityMember(concertationId, memberId) {
        const { data, error } = await supabase
            .from('concertation_community_member')
            .insert([{
                concertation_id: concertationId,
                community_member_id: memberId
            }])
            .select();

        if (error) throw error;
        return data;
    },

    async removeCommunityMember(relationId) {
        const { error } = await supabase
            .from('concertation_community_member')
            .delete()
            .eq('id', relationId);
        if (error) throw error;
        return true;
    },

    // 2. Personnel (Operative Staff)
    async addPerson(concertationId, personId) {
        const { data, error } = await supabase
            .from('concertation_person')
            .insert([{
                concertation_id: concertationId,
                person_id: personId
            }])
            .select();

        if (error) throw error;
        return data;
    },

    async removePerson(relationId) {
        const { error } = await supabase
            .from('concertation_person')
            .delete()
            .eq('id', relationId);
        if (error) throw error;
        return true;
    },

    // --- HELPERS FOR SELECTION LISTS ---

    async getCommunityMembers(communityId) {
        const { data, error } = await supabase
            .from('community_member')
            .select(`
                id,
                status,
                person (
                    person_id,
                    first_name,
                    last_name
                ),
                community_role (name)
            `)
            .eq('community_id', communityId)
            .eq('status', 'ACTIVE'); // Only show active members

        if (error) throw error;
        return data;
    },

    async getAllPersonnel() {
        // Fetch all persons with their roles
        // Using standard join syntax. 
        const { data, error } = await supabase
            .from('person')
            .select(`
                *,
                person_role (*)
            `);

        if (error) {
            console.error("Error fetching personnel:", error);
            throw error;
        }

        if (data.length > 0) {
            console.log("Raw Personnel Data (Sample):", data[0]);
        }

        // Helper to safely extract role name whether it's an object or array
        const getRoleName = (p) => {
            const r = p.person_role;
            if (!r) return null;
            // Supabase sometimes returns array for 1:N relations, or object for N:1.
            if (Array.isArray(r)) {
                return r.length > 0 ? r[0].name : null;
            }
            return r.name;
        };

        // Filter to show only "Social" roles as requested
        return data
            .filter(p => {
                const rName = getRoleName(p);
                // Check if role contains "Social" (case insensitive)
                return rName && rName.toLowerCase().includes('social');
            })
            .map(p => ({
                ...p,
                role: getRoleName(p) || 'Sin Rol'
            }));
    }
};
