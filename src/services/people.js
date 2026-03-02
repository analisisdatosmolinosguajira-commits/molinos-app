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
            .eq('role_id', 5) // Only community members
            .order('first_name');

        if (error) throw error;

        // Transform
        const peopleList = data.map(p => {
            // Determine Global Role ONLY from FK (ignore legacy text column)
            const globalRoleName = p.person_role?.name || 'Sin Rol';

            // Internal Role in that community (e.g. Leader)
            const communityRole = p.community_member?.[0]?.role?.name || null;

            return {
                ...p,
                role: communityRole || globalRoleName, // Prioritize Community Role for UI display if assigned
                globalRole: globalRoleName, // Keep original global role just in case

                // Community Context
                community: p.community_member?.[0]?.community?.name || null,
                communityId: p.community_member?.[0]?.community?.community_id || null, // Ensure ID is mapped

                // Internal Role in that community (e.g. Leader)
                communityRole: communityRole,
                communityRoleId: p.community_member?.[0]?.role?.role_id || null,

                membershipId: p.community_member?.[0]?.id || null
            };
        });

        // Return ALL people, let UI filter
        return peopleList;
    },

    // 2. CRUD Operations
    async createPerson(personData) {
        // Fetch 'Comunidad' role ID first
        let roleId = personData.role_id;
        if (!roleId) {
            const { data: roleData } = await supabase
                .from('person_role')
                .select('role_id')
                .eq('name', 'Miembro de Comunidad')
                .limit(1);
            roleId = roleData?.[0]?.role_id;
        }

        // personData: { first_name, last_name, document_id, phone, specialty }
        const { data, error } = await supabase
            .from('person')
            .insert([{
                first_name: personData.first_name,
                last_name: personData.last_name,
                document_id: personData.document_id,
                phone: personData.phone,
                specialty: personData.specialty,
                email: personData.email,
                role_id: roleId,
                active: true
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updatePerson(id, personData) {
        // Sanitize input: remove 'role' and other non-existent columns
        const updatePayload = {
            first_name: personData.first_name,
            last_name: personData.last_name,
            document_id: personData.document_id,
            phone: personData.phone,
            specialty: personData.specialty,
            email: personData.email,
            // Only update role_id if explicitly provided (and not null/undefined if we want to allow unsetting? usually just ignore if missing)
            ...(personData.role_id !== undefined && { role_id: personData.role_id }),
            active: personData.active !== undefined ? personData.active : undefined
        };

        // Remove undefined keys
        Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);

        const { data, error } = await supabase
            .from('person')
            .update(updatePayload)
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
