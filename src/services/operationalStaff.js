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
            .neq('role_id', 5) // Exclude community members
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
        // 1. Delete crew assignments (history)
        const { error: crewError } = await supabase
            .from('crew_member')
            .delete()
            .eq('person_id', personId);

        if (crewError) throw crewError;

        // 2. Unassign from planned activities (set responsible to null)
        // or delete if strict ownership is required, but usually we just unassign
        const { error: activityError } = await supabase
            .from('planned_activity')
            .update({ responsible_person_id: null })
            .eq('responsible_person_id', personId);

        if (activityError) throw activityError;

        // 3. Delete the person
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
    },

    // Availability and planning functions
    async getStaffAvailability(personId, startDate, endDate) {
        // Get person's planned activities in date range
        const { data: activities, error } = await supabase
            .from('planned_activity')
            .select(`
                activity_id,
                title,
                planned_start_week,
                planned_end_week,
                status
            `)
            .eq('responsible_person_id', personId)
            .gte('planned_start_week', startDate)
            .lte('planned_end_week', endDate)
            .order('planned_start_week');

        if (error) throw error;

        return {
            personId,
            dateRange: { start: startDate, end: endDate },
            plannedActivities: activities || [],
            isAvailable: (activities || []).length === 0
        };
    },

    async getStaffAssignmentHistory(personId) {
        // Get all crew assignments
        const { data: crewHistory, error: crewError } = await supabase
            .from('crew_member')
            .select(`
                crew_member_id,
                role_in_crew,
                start_date,
                end_date,
                crew (crew_id, name)
            `)
            .eq('person_id', personId)
            .order('start_date', { ascending: false });

        if (crewError) throw crewError;

        // Get all planned activities they're responsible for
        const { data: activities, error: actError } = await supabase
            .from('planned_activity')
            .select(`
                activity_id,
                title,
                status,
                planned_start_week,
                planned_end_week,
                actual_start_date,
                actual_end_date,
                activity_type (name)
            `)
            .eq('responsible_person_id', personId)
            .order('planned_start_week', { ascending: false });

        if (actError) throw actError;

        return {
            personId,
            crewAssignments: crewHistory || [],
            activityHistory: activities || []
        };
    },

    /**
     * Get staff member with current assignments to crews and activities
     * @param {number} personId - Person ID
     */
    async getStaffWithAssignments(personId) {
        // Get person base data
        const { data: person, error: personError } = await supabase
            .from('person')
            .select(`
                *,
                person_role (role_id, name)
            `)
            .eq('person_id', personId)
            .single();

        if (personError) throw personError;

        // Get crew assignments
        const { data: crewAssignments, error: crewError } = await supabase
            .from('crew_member')
            .select(`
                crew_member_id,
                role_in_crew,
                start_date,
                end_date,
                crew (crew_id, name, active)
            `)
            .eq('person_id', personId)
            .order('start_date', { ascending: false });

        if (crewError) throw crewError;

        // Get activities where person is responsible
        const { data: activities, error: activitiesError } = await supabase
            .from('planned_activity')
            .select(`
                activity_id,
                title,
                status,
                planned_start_week,
                planned_end_week,
                priority
            `)
            .eq('responsible_person_id', personId)
            .in('status', ['PLANIFICADA', 'EN_EJECUCION'])
            .order('planned_start_week', { ascending: true });

        if (activitiesError) throw activitiesError;

        // Calculate availability status
        const activeAssignments = crewAssignments.filter(ca => !ca.end_date);
        const activeActivities = activities.filter(a => a.status === 'EN_EJECUCION');

        let availabilityStatus = 'available';
        if (activeActivities.length > 0 || activeAssignments.length > 1) {
            availabilityStatus = 'fully_assigned';
        } else if (activeAssignments.length === 1 || activities.length > 0) {
            availabilityStatus = 'partially_assigned';
        }

        return {
            ...person,
            role: person.person_role?.name || 'Sin Rol',
            crewAssignments: crewAssignments || [],
            activeCrewAssignments: activeAssignments,
            responsibleActivities: activities || [],
            activeActivities,
            availabilityStatus
        };
    },

    /**
     * Check if staff member is available for assignment in a date range
     * @param {number} personId - Person ID
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     */
    async checkStaffAvailability(personId, startDate, endDate) {
        // Check for overlapping crew assignments
        const { data: crewConflicts, error: crewError } = await supabase
            .from('crew_member')
            .select('*')
            .eq('person_id', personId)
            .or(`end_date.is.null,end_date.gte.${startDate}`)
            .lte('start_date', endDate);

        if (crewError) throw crewError;

        // Check for overlapping activities where person is responsible
        const { data: activityConflicts, error: activityError } = await supabase
            .from('planned_activity')
            .select('activity_id, title, planned_start_week, planned_end_week')
            .eq('responsible_person_id', personId)
            .in('status', ['PLANIFICADA', 'EN_EJECUCION'])
            .or(`planned_end_week.gte.${startDate},planned_start_week.lte.${endDate}`);

        if (activityError) throw activityError;

        const hasConflicts = (crewConflicts && crewConflicts.length > 0) ||
            (activityConflicts && activityConflicts.length > 0);

        return {
            available: !hasConflicts,
            crewConflicts: crewConflicts || [],
            activityConflicts: activityConflicts || [],
            message: hasConflicts
                ? 'Personal tiene asignaciones en este período'
                : 'Personal disponible para asignación'
        };
    }
};
