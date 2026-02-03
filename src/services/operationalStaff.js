import { supabase } from './supabase';

export const OperationalStaffService = {
    // Get all operational staff (excluding Miembro de Comunidad)
    async getOperationalStaff() {
        const { data, error } = await supabase
            .from('person')
            .select(`
                *,
                person_role (role_id, name),
                crew_member (
                    crew_member_id,
                    role_in_crew,
                    start_date,
                    end_date,
                    crew (crew_id, name)
                )
            `)
            .order('first_name');

        if (error) {
            console.error('❌ Supabase error:', error);
            throw error;
        }

        // Transform for UI
        const transformed = data.map(p => ({
            ...p,
            role: p.person_role?.name || 'Sin Rol',
            roleId: p.person_role?.role_id || null,

            // Crew assignments (can be multiple)
            crews: p.crew_member?.map(cm => ({
                crewMemberId: cm.crew_member_id,
                crewId: cm.crew?.crew_id,
                crewName: cm.crew?.name,
                roleInCrew: cm.role_in_crew,
                startDate: cm.start_date,
                endDate: cm.end_date
            })) || [],

            // Primary crew (first active assignment)
            primaryCrew: p.crew_member?.find(cm => !cm.end_date)?.crew?.name || null,
            primaryCrewId: p.crew_member?.find(cm => !cm.end_date)?.crew?.crew_id || null
        }));

        // Filter: Include only operational roles (exclude community members and null roles)
        const filtered = transformed.filter(p =>
            p.role &&
            p.role !== 'Sin Rol' &&
            p.role !== 'Miembro de Comunidad'
        );

        return filtered;
    },

    // Get available roles (excluding Miembro de Comunidad)
    async getOperationalRoles() {
        const { data, error } = await supabase
            .from('person_role')
            .select('role_id, name, description')
            .neq('name', 'Miembro de Comunidad')
            .order('name');

        if (error) throw error;
        return data;
    },

    // CRUD Operations
    async createStaffMember(staffData) {
        const { data, error } = await supabase
            .from('person')
            .insert([{
                ...staffData,
                active: true
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateStaffMember(personId, staffData) {
        const { data, error } = await supabase
            .from('person')
            .update(staffData)
            .eq('person_id', personId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteStaffMember(personId) {
        const { error } = await supabase
            .from('person')
            .delete()
            .eq('person_id', personId);

        if (error) throw error;
    },

    // Crew assignment operations
    async assignToCrew(personId, crewId, roleInCrew, startDate = new Date().toISOString().split('T')[0]) {
        const { data, error } = await supabase
            .from('crew_member')
            .insert({
                person_id: personId,
                crew_id: crewId,
                role_in_crew: roleInCrew,
                start_date: startDate
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async removeFromCrew(crewMemberId, endDate = new Date().toISOString().split('T')[0]) {
        // Set end_date instead of deleting
        const { data, error } = await supabase
            .from('crew_member')
            .update({ end_date: endDate })
            .eq('crew_member_id', crewMemberId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
