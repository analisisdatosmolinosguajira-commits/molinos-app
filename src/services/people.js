import { supabase } from './supabase';

export const PeopleService = {
    // 1. Get All People (with assigned community)
    async getPeople() {
        // Query logic:
        // 1. Fetch people.
        // 2. Join community_member -> community.
        // 3. Join community_member -> community_role (internal role).
        // 4. Join person_role (global role)

        const { data, error } = await supabase
            .from('person')
            .select(`
                *,
                person_role (name),
                community_member (
                    id,
                    community:community (community_id, name),
                    role:community_role (role_id, name)
                )
            `)
            .order('first_name');

        if (error) throw error;

        // Transform
        const peopleList = data.map(p => {
            // Determine Global Role ONLY from FK (ignore legacy text column)
            const globalRoleName = p.person_role?.name || 'Sin Rol';

            return {
                ...p,
                role: globalRoleName, // Global Role

                // Community Context
                community: p.community_member?.[0]?.community?.name || null,
                communityId: p.community_member?.[0]?.community?.community_id || null,

                // Internal Role in that community (e.g. Leader)
                communityRole: p.community_member?.[0]?.role?.name || null,
                communityRoleId: p.community_member?.[0]?.role?.role_id || null,

                membershipId: p.community_member?.[0]?.id || null
            };
        });

        // STRICT Filter (Client Side)
        // Show all people who have person_role.name = 'Miembro de Comunidad' (via FK)
        // Even if they don't have a community assigned yet
        return peopleList.filter(p => p.role === 'Miembro de Comunidad');
    },

    // 2. CRUD Operations
    async createPerson(personData) {
        // personData: { first_name, last_name, document_id, phone, specialty }
        const { data, error } = await supabase
            .from('person')
            .insert([{
                ...personData,
                active: true
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updatePerson(id, personData) {
        const { data, error } = await supabase
            .from('person')
            .update(personData)
            .eq('person_id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deletePerson(id) {
        const { error } = await supabase
            .from('person')
            .delete()
            .eq('person_id', id);

        if (error) throw error;
    },

    async assignCommunity(personId, communityId, roleId) {
        const { data, error } = await supabase
            .from('community_member')
            .insert({
                person_id: personId,
                community_id: communityId,
                role_id: roleId,
                status: 'ACTIVE'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // For updating assignment (or removing old ones first)
    async updateAssignment(membershipId, communityId, roleId) {
        // If we want to change community, it's an update of `community_id` in `community_member`
        const { data, error } = await supabase
            .from('community_member')
            .update({
                community_id: communityId,
                role_id: roleId
            })
            .eq('id', membershipId);

        if (error) throw error;
        return data;
    }
};
