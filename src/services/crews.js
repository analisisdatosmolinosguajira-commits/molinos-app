import { supabase } from './supabase.js';

export const CrewService = {
    // Get all crews with member count
    async getCrews() {
        const { data, error } = await supabase
            .from('crew')
            .select(`
                *,
                crew_member (crew_member_id, end_date)
            `)
            .order('name');

        if (error) throw error;

        return data.map(c => ({
            ...c,
            member_count: c.crew_member?.filter(m => !m.end_date).length || 0
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
            .eq('crew_id', id)
            .is('end_date', null);

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
    },

    // Create a new crew
    async createCrew(crewData) {
        const { data, error } = await supabase
            .from('crew')
            .insert([{
                name: crewData.name,
                description: crewData.description,
                active: crewData.active ?? true
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Update an existing crew
    async updateCrew(id, crewData) {
        const { data, error } = await supabase
            .from('crew')
            .update({
                name: crewData.name,
                description: crewData.description,
                active: crewData.active
            })
            .eq('crew_id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Update crew signature and leader info
    async updateCrewSignature(id, signatureData, imageFile) {
        let signature_url = signatureData.signature_url;

        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `signatures/crew_${id}_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('system-photos')
                .upload(fileName, imageFile, { upsert: true });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('system-photos')
                .getPublicUrl(fileName);

            signature_url = data.publicUrl;
        }

        const { data, error } = await supabase
            .from('crew')
            .update({
                leader_name: signatureData.leader_name,
                leader_document: signatureData.leader_document,
                leader_role: signatureData.leader_role,
                signature_url: signature_url
            })
            .eq('crew_id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Member Management
    // Member Management
    async addMember(crewId, personId, role, startDate = new Date().toISOString().split('T')[0]) {
        // Check for current assignment
        const { data: currentAssignment } = await supabase
            .from('crew_member')
            .select('crew_member_id, crew_id, crew(name)')
            .eq('person_id', personId)
            .is('end_date', null)
            .maybeSingle();

        // If currently assigned, end that assignment first
        if (currentAssignment) {
            // Prevent re-adding to the SAME crew if already there (though UI should handle this)
            if (currentAssignment.crew_id === crewId) {
                throw new Error(`La persona ya pertenece a esta cuadrilla.`);
            }

            // Close previous assignment
            const { error: closeError } = await supabase
                .from('crew_member')
                .update({ end_date: startDate }) // End date is same as new start date
                .eq('crew_member_id', currentAssignment.crew_member_id);

            if (closeError) throw closeError;
        }

        // Create new assignment
        const { data, error } = await supabase
            .from('crew_member')
            .insert([{
                crew_id: crewId,
                person_id: personId,
                role_in_crew: role,
                start_date: startDate
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async removeMember(crewMemberId, endDate = new Date().toISOString().split('T')[0]) {
        const { data, error } = await supabase
            .from('crew_member')
            .update({ end_date: endDate })
            .eq('crew_member_id', crewMemberId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateMemberRole(crewMemberId, newRole) {
        const { data, error } = await supabase
            .from('crew_member')
            .update({ role_in_crew: newRole })
            .eq('crew_member_id', crewMemberId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Batch update assignments
    async updateCrewAssignments(assignments, removals) {
        // 1. Process removals (unassign members)
        // Chunk removals to avoid URL length limits in PostgREST (usually issues > 200 items)
        const CHUNK_SIZE = 50;
        for (let i = 0; i < removals.length; i += CHUNK_SIZE) {
            const chunk = removals.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase
                .from('crew_member')
                .update({ end_date: new Date().toISOString().split('T')[0] })
                .in('crew_member_id', chunk);

            if (error) {
                console.error("Error batch removing crew members:", error);
                throw error;
            }
        }

        // 2. Process assignments (add members)
        // Note: For existing members switching crews, we need to end their current active assignment first.
        // Ideally, the UI or logic should provide the personId.
        // The addMember function already handles closing previous active assignments for a person.
        // We will execute these sequentially to avoid race conditions on the same person, 
        // or Promise.all if we are sure one person implies one operation.
        // Since one person can only be in one crew, Promise.all is fine for distinct people.

        // 2. Process assignments (add members)
        // Execute sequentially to prevent race conditions and connection pool exhaustion
        for (const a of assignments) {
            await this.addMember(a.crewId, a.personId, a.role || 'Técnico');
        }

        return true;
    },

    // Get ALL staff members with their current assignment status
    async getAvailableStaff() {
        // 1. Get all active crew assignments
        const { data: activeAssignments } = await supabase
            .from('crew_member')
            .select('crew_member_id, person_id, crew_id, crew(name)')
            .is('end_date', null);

        // Create a map of PersonID -> Assignment Details
        const assignmentMap = {};
        activeAssignments?.forEach(a => {
            assignmentMap[a.person_id] = {
                crewName: a.crew?.name || 'Otra Cuadrilla',
                crewId: a.crew_id,
                crewMemberId: a.crew_member_id
            };
        });

        // 2. Get all operational staff
        const { data, error } = await supabase
            .from('person')
            .select(`
                person_id, 
                first_name, 
                last_name, 
                document_id,
                person_role(name)
            `)
            .eq('active', true)
            // Filter out community members at DB level for efficiency
            .neq('person_role.name', 'Miembro de Comunidad')
            .neq('person_role.name', 'Comunidad')
            .order('first_name');

        if (error) throw error;

        // Map and include current assignment status
        // DB filter might miss if person_role is null, but we want operational staff so they should have roles.
        // We double check filter in JS just to be safe if join filtering behaves oddly.
        return data.filter(p => {
            const roleName = p.person_role?.name;
            return roleName !== 'Miembro de Comunidad' && roleName !== 'Comunidad';
        }).map(p => {
            const assignment = assignmentMap[p.person_id];
            return {
                ...p,
                fullName: `${p.first_name} ${p.last_name}`,
                role: p.person_role?.name || 'Sin Rol',
                currentCrew: assignment?.crewName || null,
                currentCrewId: assignment?.crewId || null,
                crewMemberId: assignment?.crewMemberId || null,
                isAssigned: !!assignment
            };
        });
    }
};
