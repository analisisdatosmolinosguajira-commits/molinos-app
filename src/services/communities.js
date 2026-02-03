import { supabase } from './supabase';

export const CommunityService = {
    // 1. Get All Communities (List View)
    async getCommunities() {
        const { data, error } = await supabase
            .from('community')
            .select(`
                *,
                mill (mill_id, name, code, status),
                community_member (count)
            `)
            .order('name');

        if (error) throw error;

        // Transform for UI (counts)
        return data.map(c => ({
            ...c,
            mill: c.mill?.[0] || null, // Assuming 1-to-many or 1-to-1 but taking first if multiple (which shouldn't happen usually)
            memberCount: c.community_member?.[0]?.count || 0
        }));
    },

    // 2. Get Single Community Detail (Lifetime Record)
    async getCommunityById(id) {
        // Parallel Fetch for efficiency

        // A. Base Info + Mill + Members
        const communityPromise = supabase
            .from('community')
            .select(`
                *,
                mill (*),
                community_member (
                    id,
                    role:community_role(role_id, name),
                    status,
                    joined_at,
                    person (
                        person_id,
                        first_name,
                        last_name,
                        document_id,
                        phone
                    )
                )
            `)
            .eq('community_id', id)
            .single();

        // B. Movement History (Visits) - Linked via movement_community
        const historyPromise = supabase
            .from('movement_community')
            .select(`
                movement (
                    movement_id,
                    start_date,
                    objective,
                    notes,
                    status,
                    vehicle_info,
                    movement_person (
                        person (first_name, last_name),
                        role
                    )
                )
            `)
            .eq('community_id', id)
            .order('movement(start_date)', { ascending: false });

        // C. Social Concertations
        const socialPromise = supabase
            .from('community_concertation')
            .select('*')
            .eq('community_id', id)
            .order('meeting_date', { ascending: false });

        const [communityRes, historyRes, socialRes] = await Promise.all([
            communityPromise,
            historyPromise,
            socialPromise
        ]);

        if (communityRes.error) throw communityRes.error;

        // Transform Members
        const members = communityRes.data.community_member?.map(m => ({
            membershipId: m.id,
            personId: m.person?.person_id,
            name: `${m.person?.first_name} ${m.person?.last_name || ''}`,
            role: m.role?.name || 'Desconocido', // Map nested role object
            roleId: m.role?.role_id,
            phone: m.person?.phone,
            status: m.status,
            joinedAt: m.joined_at
        })) || [];

        // Transform Visits (Combine Movements + Social)
        const movements = historyRes.data?.map(m => ({
            id: `mov-${m.movement?.movement_id}`,
            date: m.movement?.start_date,
            type: 'LOGISTICA',
            title: `Desplazamiento: ${m.movement?.objective}`,
            description: m.movement?.notes,
            crew: m.movement?.movement_person?.slice(0, 3).map(p => p.person?.first_name).join(', ')
        })) || [];

        const socials = socialRes.data?.map(s => ({
            id: `soc-${s.concertation_id}`,
            date: s.meeting_date,
            type: 'SOCIAL',
            title: 'Concertación Comunitaria',
            description: s.agreements,
            crew: 'Gestión Social'
        })) || [];

        const visits = [...movements, ...socials].sort((a, b) => new Date(b.date) - new Date(a.date));

        return {
            ...communityRes.data,
            mill: communityRes.data.mill?.[0] || null,
            members,
            visits
        };
    },

    // 3. Member Management
    async addMember(communityId, personId, role) {
        const { data, error } = await supabase
            .from('community_member')
            .insert({
                community_id: communityId,
                person_id: personId,
                role_id: role,
                status: 'ACTIVE'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async removeMember(membershipId) {
        const { error } = await supabase
            .from('community_member')
            .delete()
            .eq('id', membershipId);

        if (error) throw error;
    },

    async updateMemberRole(membershipId, roleId) {
        const { data, error } = await supabase
            .from('community_member')
            .update({ role_id: roleId })
            .eq('id', membershipId)
            .select();

        if (error) throw error;
        return data;
    },

    // 5. Utilities & Meta
    async getRoles() {
        const { data, error } = await supabase
            .from('community_role')
            .select('*')
            .order('name');

        if (error) return []; // Fail gracefully
        return data;
    },

    async createPerson(personData) {
        // personData: { firstName, lastName, documentId, phone }
        // Note: 'role' in Person table might be 'Comunidad' or similar generic role
        const { data, error } = await supabase
            .from('person')
            .insert([{
                first_name: personData.firstName,
                last_name: personData.lastName,
                document_id: personData.documentId,
                role: 'Comunidad'
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // 5. Utilities
    async searchPeople(query) {
        if (!query || query.length < 2) return [];

        const { data, error } = await supabase
            .from('person')
            .select('person_id, first_name, last_name, document_id, role')
            .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,document_id.ilike.%${query}%`)
            .limit(10);

        if (error) throw error;
        return data;
    },

    // 4. Create Community
    async createCommunity(communityData) {
        const { data, error } = await supabase
            .from('community')
            .insert(communityData)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
