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
                diagnosis (code, diagnosis_type),
                related_activity:planned_activity!community_concertation_related_activity_id_fkey (
                    activity_id,
                    title,
                    activity_type (name)
                )
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
    },

    /**
     * Create concertation from planned activity
     * @param {number} activityId - Planned activity ID
     */
    async createConcertationFromActivity(activityId) {
        // Get activity details
        const { data: activity, error: actError } = await supabase
            .from('planned_activity')
            .select('*, activity_type(name)')
            .eq('activity_id', activityId)
            .single();

        if (actError) throw actError;

        // Create concertation with activity data
        const concertationData = {
            community_id: activity.target_community_id,
            title: activity.title,
            meeting_date: activity.planned_start_week,
            status: 'planificada',
            notes: `Concertación desde actividad planificada:\n${activity.description || ''}`,
            related_activity_id: activityId
        };

        const concertation = await this.createConcertation(concertationData);
        return concertation;
    },

    /**
     * Link existing concertation to planned activity
     * @param {number} concertationId - Concertation ID
     * @param {number} activityId - Activity ID
     */
    async linkConcertationToActivity(concertationId, activityId) {
        // Update concertation
        const { error } = await supabase
            .from('community_concertation')
            .update({ related_activity_id: activityId })
            .eq('concertation_id', concertationId);

        if (error) throw error;

        return { success: true };
    }
};
