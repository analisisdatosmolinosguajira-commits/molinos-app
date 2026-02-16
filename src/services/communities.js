import { supabase } from './supabase';

export const CommunityService = {
    // 1. Get All Communities (List View)
    async getCommunities() {
        const { data, error } = await supabase
            .from('community')
            .select(`
                *,
                mill!fk_mill_community (mill_id, name, code, status),
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
                mill!fk_mill_community (*),
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
        // B. Movement History (Visits) - Skipped for now as table might be missing or different
        const historyPromise = Promise.resolve({ data: [] });

        // C. Social Concertations
        const socialPromise = supabase
            .from('community_concertation')
            .select('*')
            .eq('community_id', id)
            .order('meeting_date', { ascending: false });

        // D. Social Situations
        const situationsPromise = supabase
            .from('community_social_situation')
            .select('*')
            .eq('community_id', id)
            .order('created_at', { ascending: false });

        const [communityRes, historyRes, socialRes, situationsRes] = await Promise.all([
            communityPromise,
            historyPromise,
            socialPromise,
            situationsPromise
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

        // Situations logic
        const allSituations = situationsRes.data || [];
        const activeSituations = allSituations.filter(s => s.status === 'active');

        return {
            ...communityRes.data,
            mill: communityRes.data.mill?.[0] || null,
            members,
            visits,
            allSituations,
            activeSituations
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

        // 1. Get 'Comunidad' role ID
        const { data: roleData } = await supabase
            .from('person_role')
            .select('role_id')
            .eq('name', 'Comunidad')
            .limit(1);

        const roleId = roleData?.[0]?.role_id;



        if (!roleId) throw new Error("Role 'Comunidad' not found");

        const { data, error } = await supabase
            .from('person')
            .insert([{
                first_name: personData.firstName,
                last_name: personData.lastName,
                document_id: personData.documentId,
                phone: personData.phone,
                role_id: roleId,
                active: true
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
            .select(`
                person_id, 
                first_name, 
                last_name, 
                document_id, 
                role:person_role(name)
            `)
            .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,document_id.ilike.%${query}%`)
            .limit(10);

        if (error) throw error;
        return data.map(p => ({
            ...p,
            role: p.role?.name // Flatten
        }));
    },

    async getUnassignedPeople() {
        // Fetch people and check if they have community assignments
        const { data, error } = await supabase
            .from('person')
            .select(`
                person_id, 
                first_name, 
                last_name, 
                document_id,
                community_member(id)
            `)
            .order('first_name')
            .limit(50);

        if (error) throw error;

        // Filter only those with NO community_member records
        return data
            .filter(p => !p.community_member || p.community_member.length === 0)
            .map(p => ({
                ...p,
                role: 'Sin Asignar'
            }));
    },

    // 4. CRUD Operations
    async createCommunity(communityData) {
        const { data, error } = await supabase
            .from('community')
            .insert(communityData)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateCommunity(id, communityData) {
        const { data, error } = await supabase
            .from('community')
            .update(communityData)
            .eq('community_id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteCommunity(id) {
        const { error } = await supabase
            .from('community')
            .delete()
            .eq('community_id', id);

        if (error) throw error;
    },

    // 6. Mill Association
    async getAvailableMills() {
        // Fetch mills that do NOT have a community_id assigned
        const { data, error } = await supabase
            .from('mill')
            .select('mill_id, name, code, status')
            .is('community_id', null)
            .order('name');

        if (error) throw error;
        return data;
    },

    async associateMill(communityId, millId) {
        // 1. Unlink mill from any previous community (just to be safe, though UI should handle it)
        // Actually, just update the mill's community_id
        const { data, error } = await supabase
            .from('mill')
            .update({ community_id: communityId })
            .eq('mill_id', millId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async disassociateMill(millId) {
        const { data, error } = await supabase
            .from('mill')
            .update({ community_id: null })
            .eq('mill_id', millId)
            .select() // return updated record
            .single();

        if (error) throw error;
        return data;
    },

    // 7. Social Situations
    async createSocialSituation(communityId, situationData) {
        const { data, error } = await supabase
            .from('community_social_situation')
            .insert([{
                community_id: communityId,
                type: situationData.type,
                title: situationData.title,
                description: situationData.description,
                severity: situationData.severity,
                status: 'active',
                start_date: situationData.start_date
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateSocialSituation(situationId, updates) {
        const { data, error } = await supabase
            .from('community_social_situation')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('situation_id', situationId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
