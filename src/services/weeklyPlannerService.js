import { supabase } from './supabase.js';

export const WeeklyPlannerService = {

    /**
     * Get concertaciones completed recently (last 30 days)
     * Returns community name as primary identifier
     */
    async getConcertations(filter = 'recent') {
        let query = supabase
            .from('community_concertation')
            .select(`
                concertation_id,
                code,
                status,
                meeting_date,
                closing_note,
                community:community (community_id, name, department, municipality)
            `);

        if (filter === 'recent') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            query = query.eq('status', 'COMPLETED')
                .gte('meeting_date', thirtyDaysAgo.toISOString().split('T')[0]);
        }

        query = query.order('meeting_date', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(c => ({
            ...c,
            communityName: c.community?.name || 'Sin comunidad',
            communityId: c.community?.community_id,
            sourceType: 'concertation',
            sourceId: c.concertation_id,
            badge: `Conc. ${c.code || ''}`.trim()
        }));
    },

    /**
     * Get diagnoses completed recently (last 30 days)
     * Maps through mill → community
     */
    async getDiagnoses(filter = 'recent') {
        let query = supabase
            .from('diagnosis')
            .select(`
                diagnosis_id,
                code,
                status,
                diagnosis_date,
                diagnosis_type,
                mill:mill (mill_id, code, name, community_id,
                    community:community!mill_community_id_fkey (community_id, name, department, municipality)
                )
            `);

        if (filter === 'recent') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            query = query.eq('status', 'completed')
                .gte('diagnosis_date', thirtyDaysAgo.toISOString().split('T')[0]);
        }

        query = query.order('diagnosis_date', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(d => ({
            ...d,
            communityName: d.mill?.community?.name || d.mill?.name || 'Sin comunidad',
            communityId: d.mill?.community?.community_id,
            sourceType: 'diagnosis',
            sourceId: d.diagnosis_id,
            badge: `Diag. ${d.code || ''}`.trim()
        }));
    },

    /**
     * Get work orders that are pending or planned
     * Maps through mill → community
     */
    async getWorkOrders(filter = 'pending') {
        let query = supabase
            .from('work_order')
            .select(`
                work_order_id,
                code,
                status,
                type,
                description,
                mill:mill (mill_id, code, name, community_id,
                    community:community!mill_community_id_fkey (community_id, name, department, municipality)
                )
            `);

        if (filter === 'pending') {
            query = query.in('status', ['pending', 'planned', 'in_progress']);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(wo => ({
            ...wo,
            communityName: wo.mill?.community?.name || wo.mill?.name || 'Sin comunidad',
            communityId: wo.mill?.community?.community_id,
            sourceType: 'work_order',
            sourceId: wo.work_order_id,
            badge: `OT ${wo.code || ''}`.trim()
        }));
    },

    /**
     * Get all communities in DB
     */
    async getAllCommunities() {
        const { data, error } = await supabase
            .from('community')
            .select('community_id, name, department, municipality')
            .order('name');

        if (error) throw error;
        return (data || []).map(c => ({
            communityId: c.community_id,
            communityName: c.name || 'Sin nombre',
            department: c.department,
            municipality: c.municipality,
            sourceType: 'community',
            sourceId: c.community_id,
            badge: c.municipality || c.department || 'Comunidad'
        }));
    },

    /**
     * Get all active crews with leader info
     */
    async getActiveCrews() {
        const { data, error } = await supabase
            .from('crew')
            .select(`
                crew_id,
                name,
                active,
                crew_member (
                    role_in_crew,
                    person (person_id, first_name, last_name)
                )
            `)
            .eq('active', true)
            .order('name');

        if (error) throw error;
        return (data || []).map(crew => {
            const leader = crew.crew_member?.find(m => m.role_in_crew === 'Ingeniero Lider');
            return {
                ...crew,
                leaderName: leader?.person
                    ? `${leader.person.first_name} ${leader.person.last_name}`
                    : crew.crew_member?.[0]?.person
                        ? `${crew.crew_member[0].person.first_name} ${crew.crew_member[0].person.last_name}`
                        : 'Sin líder',
                assignedCommunities: [] // Will be populated by UI
            };
        });
    },

    /**
     * Save the full weekly plan:
     * Creates one planned_activity per crew that has communities assigned,
     * then inserts activity_community rows for each.
     */
    async saveWeeklyPlan(startDate, endDate, crewAssignments) {
        // crewAssignments: Array of { crew, communities: [{communityId, sourceType, sourceId}], includesSena }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const formatDt = (dtStr) => {
            const [y, m, d] = dtStr.split('-');
            return `${d}/${m}/${y.slice(-2)}`;
        };
        const datePrefix = `(${formatDt(startDate)}-${formatDt(endDate)})`;

        let createdCount = 0;

        for (const assignment of crewAssignments) {
            const { crew, communities, includesSena } = assignment;

            // Skip crews with no communities and no SENA
            if ((!communities || communities.length === 0) && !includesSena) continue;

            // Determine activity type based on crew name
            let targetActivityTypeId = null;
            let baseTitle = `Planificación Semana - ${crew.name}`;
            const lowerName = crew.name.toLowerCase();

            if (lowerName.includes('mantenimiento') || lowerName.match(/cuadrilla [1-6]\b/)) {
                targetActivityTypeId = 3;
                baseTitle = "Reparación/Mantenimiento";
            } else if (lowerName.includes('entrega') || lowerName.includes('material')) {
                targetActivityTypeId = 10;
                baseTitle = "Entrega de Materiales";
            } else if (lowerName.includes('concertación') || lowerName.includes('social')) {
                targetActivityTypeId = 2;
                baseTitle = "Concertación";
            } else {
                baseTitle = crew.name;
                if (lowerName.includes('mecanizado')) targetActivityTypeId = 6;
                else if (lowerName.includes('fabricación') || lowerName.includes('soldadura') || lowerName.includes('roscado')) targetActivityTypeId = 5;
            }

            // Get responsible person
            let responsiblePersonId = null;
            if (crew.crew_member && crew.crew_member.length > 0) {
                const leader = crew.crew_member.find(m => m.role_in_crew === 'Ingeniero Lider');
                responsiblePersonId = leader?.person?.person_id || crew.crew_member[0]?.person?.person_id;
            }

            // Create the planned_activity
            const { data: activity, error: actError } = await supabase
                .from('planned_activity')
                .insert({
                    title: `${datePrefix} ${baseTitle}`,
                    activity_type_id: targetActivityTypeId,
                    priority: 'MEDIA',
                    status: 'PLANIFICADA',
                    assigned_crew_id: crew.crew_id,
                    responsible_person_id: responsiblePersonId,
                    planned_start_week: startDate,
                    planned_end_week: endDate,
                    estimated_duration_days: durationDays,
                    includes_sena_workshop: includesSena || false,
                    // Set target_community_id to the first community for backwards compat
                    target_community_id: communities?.[0]?.communityId || null
                })
                .select('activity_id')
                .single();

            if (actError) throw actError;

            // Insert activity_community rows
            if (communities && communities.length > 0) {
                const communityRows = communities.map((c, idx) => ({
                    activity_id: activity.activity_id,
                    community_id: c.communityId,
                    source_type: c.sourceType || 'manual',
                    source_id: c.sourceId || null,
                    sort_order: idx
                }));

                const { error: acError } = await supabase
                    .from('activity_community')
                    .insert(communityRows);

                if (acError) {
                    console.error('Error inserting activity_community:', acError);
                    // Don't throw - the activity was already created
                }
            }

            createdCount++;
        }

        return { createdCount };
    },

    /**
     * Get communities assigned to an activity
     */
    async getActivityCommunities(activityId) {
        const { data, error } = await supabase
            .from('activity_community')
            .select(`
                *,
                community:community (community_id, name, department, municipality)
            `)
            .eq('activity_id', activityId)
            .order('sort_order');

        if (error) throw error;
        return data || [];
    },

    /**
     * Add community to activity
     */
    async addCommunityToActivity(activityId, { community_id, source_type, source_id, sort_order }) {
        const { error } = await supabase
            .from('activity_community')
            .insert({
                activity_id: activityId,
                community_id,
                source_type: source_type || 'manual',
                source_id: source_id || null,
                sort_order: sort_order || 0
            });
        if (error) throw error;
    },

    /**
     * Delete all communities from an activity (for re-sync on edit)
     */
    async deleteAllActivityCommunities(activityId) {
        const { error } = await supabase
            .from('activity_community')
            .delete()
            .eq('activity_id', activityId);
        if (error) throw error;
    },

    /**
     * Remove community from activity
     */
    async removeCommunityFromActivity(activityId, communityId) {
        const { error } = await supabase
            .from('activity_community')
            .delete()
            .eq('activity_id', activityId)
            .eq('community_id', communityId);
        if (error) throw error;
    }
};
