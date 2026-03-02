import { supabase } from './supabase.js';

export const ActivityService = {
    /**
     * Get all planned activities with optional filters
     * @param {Object} filters - Optional filters
     * @param {string} filters.status - Filter by status
     * @param {string} filters.priority - Filter by priority
     * @param {number} filters.crewId - Filter by assigned crew
     * @param {string} filters.weekStart - Filter by planned start week
     */
    async getPlannedActivities(filters = {}) {
        let query = supabase
            .from('planned_activity')
            .select(`
                *,
                activity_type (activity_type_id, name, description, requires_field_trip),
                responsible_person:person!responsible_person_id (person_id, first_name, last_name, document_id),
                assigned_crew:crew (
                    crew_id, 
                    name, 
                    active,
                    crew_member (
                        role_in_crew,
                        person (first_name, last_name)
                    )
                ),
                target_community:community (community_id, name, department, municipality),
                target_mill:mill (mill_id, code, name, community_name),
                related_movements:movement!movement_related_activity_id_fkey (
                    movement_id, start_date, end_date, objective, title,
                    completion_notes, notes
                ),
                created_by_person:person!created_by (person_id, first_name, last_name),
                related_work_order:work_order!work_order_related_activity_id_fkey (
                    work_order_id, code, status, description, 
                    mill:mill (code, name),
                    completion_notes, notes, pump_installation_notes
                ),
                related_diagnosis:diagnosis!diagnosis_related_activity_id_fkey (
                    diagnosis_id, code, status, diagnosis_date,
                    mill:mill (code, name),
                    technical_findings, completion_notes, notes, pump_observations
                ),
                related_concertation:community_concertation!community_concertation_related_activity_id_fkey (
                    concertation_id, status, meeting_date, code,
                    community:community (name),
                    closing_note, notes
                ),
                related_manufacturing:manufacturing_order!manufacturing_order_related_activity_id_fkey (
                    mo_id, status, notes, piece_id, quantity_planned,
                    piece:piece!piece_id (name)
                )
            `)
            .order('planned_start_week', { ascending: false });

        // Apply filters
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.priority) {
            query = query.eq('priority', filters.priority);
        }
        if (filters.crewId) {
            query = query.eq('assigned_crew_id', filters.crewId);
        }
        if (filters.weekStart) {
            query = query.gte('planned_start_week', filters.weekStart);
        }
        if (filters.search) {
            query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Transform for UI
        return (data || []).map(activity => ({
            ...activity,
            activityTypeName: activity.activity_type?.name,
            responsibleName: activity.responsible_person
                ? `${activity.responsible_person.first_name} ${activity.responsible_person.last_name}`
                : null,
            crewName: activity.assigned_crew?.name,
            crewMembers: activity.assigned_crew?.crew_member || [],
            communityName: activity.target_community?.name,
            millCode: activity.target_mill?.code,
            millName: activity.target_mill?.name,
            createdByName: activity.created_by_person
                ? `${activity.created_by_person.first_name} ${activity.created_by_person.last_name}`
                : null,
            hasMovement: (activity.related_movements && activity.related_movements.length > 0)
        }));
    },

    /**
     * Get single activity by ID with full details
     * @param {number} activityId - Activity ID
     */
    async getActivityById(activityId) {
        const { data, error } = await supabase
            .from('planned_activity')
            .select(`
                *,
                activity_type (*),
                responsible_person:person!responsible_person_id (*),
                assigned_crew:crew!assigned_crew_id (
                    *,
                    crew_member (
                        crew_member_id,
                        role_in_crew,
                        person (person_id, first_name, last_name, document_id)
                    )
                ),
                target_community:community (*),
                target_mill:mill (*),
                related_movements:movement!movement_related_activity_id_fkey (*),
                related_work_order:work_order (*),
                related_diagnosis:diagnosis (*),
                related_concertation:community_concertation (*),
                created_by_person:person!created_by (*)
            `)
            .eq('activity_id', activityId)
            .single();

        if (error) throw error;

        // Fetch comments and weekly assignments
        const [commentsRes, weeklyAssignmentsRes] = await Promise.all([
            supabase
                .from('activity_comment')
                .select(`
                    *,
                    person (person_id, first_name, last_name)
                `)
                .eq('activity_id', activityId)
                .order('created_at', { ascending: false }),

            supabase
                .from('weekly_crew_assignment')
                .select(`
                    *,
                    crew (crew_id, name)
                `)
                .eq('activity_id', activityId)
                .order('week_start_date')
        ]);

        return {
            ...data,
            comments: commentsRes.data || [],
            weeklyAssignments: weeklyAssignmentsRes.data || []
        };
    },

    /**
     * Create new planned activity
     * @param {Object} activityData - Activity data
     */
    async createActivity(activityData) {
        const { data, error } = await supabase
            .from('planned_activity')
            .insert([activityData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update existing activity
     * @param {number} activityId - Activity ID
     * @param {Object} updates - Fields to update
     */
    async updateActivity(activityId, updates) {
        const { data, error } = await supabase
            .from('planned_activity')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('activity_id', activityId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete planned activity
     * @param {number} activityId - Activity ID
     */
    async deleteActivity(activityId) {
        const { error } = await supabase
            .from('planned_activity')
            .delete()
            .eq('activity_id', activityId);

        if (error) throw error;
    },

    /**
     * Assign crew to activity
     * @param {number} activityId - Activity ID
     * @param {number} crewId - Crew ID
     */
    async assignCrew(activityId, crewId) {
        const { data, error } = await supabase
            .from('planned_activity')
            .update({ assigned_crew_id: crewId })
            .eq('activity_id', activityId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Add comment to activity
     * @param {number} activityId - Activity ID
     * @param {number} personId - Person ID
     * @param {string} commentText - Comment text
     */
    async addComment(activityId, personId, commentText) {
        const { data, error } = await supabase
            .from('activity_comment')
            .insert([{
                activity_id: activityId,
                person_id: personId,
                comment_text: commentText
            }])
            .select(`
                *,
                person (person_id, first_name, last_name)
            `)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Link activity to movement
     * @param {number} activityId - Activity ID
     * @param {number} movementId - Movement ID
     */
    async linkToMovement(activityId, movementId) {
        const { data, error } = await supabase
            .from('movement')
            .update({ related_activity_id: activityId })
            .eq('movement_id', movementId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Create weekly crew assignment
     * @param {number} activityId - Activity ID
     * @param {number} crewId - Crew ID
     * @param {string} weekStartDate - Week start date (YYYY-MM-DD)
     * @param {string} weekEndDate - Week end date (YYYY-MM-DD)
     * @param {string} notes - Optional notes
     */
    async addWeeklyCrewAssignment(activityId, crewId, weekStartDate, weekEndDate, notes = null) {
        const { data, error } = await supabase
            .from('weekly_crew_assignment')
            .insert([{
                activity_id: activityId,
                crew_id: crewId,
                week_start_date: weekStartDate,
                week_end_date: weekEndDate,
                notes
            }])
            .select(`
                *,
                crew (crew_id, name)
            `)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get activities by week range
     * @param {string} weekStart - Week start date
     * @param {string} weekEnd - Week end date
     */
    async getActivitiesByWeek(weekStart, weekEnd) {
        const { data, error } = await supabase
            .from('planned_activity')
            .select(`
                *,
                activity_type (name),
                assigned_crew:crew (name),
                responsible_person:person!responsible_person_id (first_name, last_name),
                target_community:community (name),
                target_mill:mill (code, name)
            `)
            .gte('planned_start_week', weekStart)
            .lte('planned_start_week', weekEnd)
            .order('planned_start_week');

        if (error) throw error;
        return data || [];
    },

    /**
     * Get activity types
     */
    async getActivityTypes() {
        const { data, error } = await supabase
            .from('activity_type')
            .select('*')
            .order('name');

        if (error) throw error;
        return data || [];
    },

    /**
     * Update activity status
     * @param {number} activityId - Activity ID
     * @param {string} status - New status
     */
    async updateStatus(activityId, status) {
        const updates = { status };

        // Auto-set dates based on status
        if (status === 'EN_EJECUCION' && !updates.actual_start_date) {
            updates.actual_start_date = new Date().toISOString().split('T')[0];
        } else if (status === 'COMPLETADA' && !updates.actual_end_date) {
            updates.actual_end_date = new Date().toISOString().split('T')[0];
        }

        return this.updateActivity(activityId, updates);
    },

    /**
     * Get activities assigned to a specific crew
     * @param {number} crewId - Crew ID
     * @param {Object} filters - Optional filters
     */
    async getActivitiesByCrew(crewId, filters = {}) {
        let query = supabase
            .from('planned_activity')
            .select(`
                *,
                activity_type (activity_type_id, name, description),
                responsible_person:person!responsible_person_id (person_id, first_name, last_name),
                target_community:community (community_id, name),
                target_mill:mill (mill_id, code, name)
            `)
            .eq('assigned_crew_id', crewId);

        // Apply filters
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.startDate) {
            query = query.gte('planned_start_week', filters.startDate);
        }
        if (filters.endDate) {
            query = query.lte('planned_end_week', filters.endDate);
        }

        query = query.order('planned_start_week', { ascending: true });

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map(activity => ({
            ...activity,
            activityTypeName: activity.activity_type?.name,
            responsibleName: activity.responsible_person
                ? `${activity.responsible_person.first_name} ${activity.responsible_person.last_name}`
                : null,
            communityName: activity.target_community?.name,
            millCode: activity.target_mill?.code,
            millName: activity.target_mill?.name
        }));
    },

    /**
     * Unlink an entity from an activity
     * @param {number} activityId - Activity ID
     * @param {string} entityType - Type of entity ('movement', 'work_order', 'diagnosis', 'concertation', 'manufacturing')
     * @param {number} entityId - ID of the entity to unlink
     */
    async unlinkEntity(activityId, entityType, entityId) {
        let error;

        if (entityType === 'movement') {
            // Movement is linked FROM the activity (Bidirectional)
            // Now strictly 1:N (Activity -> Many Movements)
            // Just clear the link on the movement side
            const { error: movError } = await supabase
                .from('movement')
                .update({ related_activity_id: null })
                .eq('movement_id', entityId);
            error = movError;
        } else {
            // Other entities link TO the activity
            let table = '';
            let idField = '';

            switch (entityType) {
                case 'work_order':
                    table = 'work_order';
                    idField = 'work_order_id';
                    break;
                case 'diagnosis':
                    table = 'diagnosis';
                    idField = 'diagnosis_id';
                    break;
                case 'concertation':
                    table = 'community_concertation';
                    idField = 'concertation_id';
                    break;
                case 'manufacturing':
                    table = 'manufacturing_order';
                    idField = 'mo_id';
                    break;
                default:
                    throw new Error(`Unknown entity type: ${entityType}`);
            }

            const { error: err } = await supabase
                .from(table)
                .update({ related_activity_id: null })
                .eq(idField, entityId);
            error = err;
        }

        if (error) throw error;
    },

    /**
     * Get crews that have NO activities assigned in a given week range
     * @param {string} startDate - Week start date (YYYY-MM-DD)
     * @param {string} endDate - Week end date (YYYY-MM-DD)
     */
    async getUnassignedCrews(startDate, endDate) {
        // 1. Get all active crews
        const { data: allCrews, error: crewsError } = await supabase
            .from('crew')
            .select(`
                crew_id, 
                name,
                crew_member (
                    person (first_name, last_name, person_role(name))
                )
            `)
            .eq('active', true)
            .order('name');

        if (crewsError) throw crewsError;

        // 2. Get all activities in the range that have a crew assigned
        const { data: busyActivities, error: activitiesError } = await supabase
            .from('planned_activity')
            .select('assigned_crew_id')
            .not('assigned_crew_id', 'is', null)
            .gte('planned_start_week', startDate)
            .lte('planned_end_week', endDate)
            .in('status', ['PLANIFICADA', 'ASIGNADA', 'EN_EJECUCION']); // Completed/Cancelled don't count as "busy" for planning purposes? Maybe completed does?
        // User said "cuadrillas sin tareas asignadas". Usually completed tasks mean they are free for NEW tasks, 
        // but if we are planning the PAST, they were busy. 
        // For FUTURE planning, completed tasks shouldn't exist yet. 
        // Let's assume we want to see who is FREE.

        if (activitiesError) throw activitiesError;

        const busyCrewIds = new Set(busyActivities.map(a => a.assigned_crew_id));

        // 3. Filter
        const unassignedCrews = allCrews.filter(crew => !busyCrewIds.has(crew.crew_id));

        // 4. Format for UI (include leader name if possible)
        return unassignedCrews.map(crew => {
            const members = crew.crew_member || [];
            const leader = members.find(m => m.person?.person_role?.name?.toLowerCase().includes('lider'))?.person
                || members[0]?.person;

            return {
                ...crew,
                leaderName: leader ? `${leader.first_name} ${leader.last_name}` : 'Sin miembros'
            };
        });
    },

    /**
     * Get total count of active crews
     * @returns {Promise<number>}
     */
    async getActiveCrewsCount() {
        const { count, error } = await supabase
            .from('crew')
            .select('*', { count: 'exact', head: true })
            .eq('active', true);

        if (error) throw error;
        return count || 0;
    },

    /**
     * Generate standard weekly assignments for all active crews based on their type
     * @param {string} startDate - YYYY-MM-DD
     * @param {string} endDate - YYYY-MM-DD
     */
    async generateWeeklyAssignments(startDate, endDate) {
        // 1. Obtener todas las cuadrillas activas, su tipo y miembros
        const { data: crews, error: crewsError } = await supabase
            .from('crew')
            .select(`
                crew_id,
                name,
                crew_member (
                    role_in_crew,
                    person (person_id)
                )
            `)
            .eq('active', true);

        if (crewsError) throw crewsError;
        if (!crews || crews.length === 0) return;

        // Calcular duración en días
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusivo

        const formatDt = (dtStr) => {
            const [y, m, d] = dtStr.split('-');
            return `${d}/${m}/${y.slice(-2)}`;
        };
        const datePrefix = `(${formatDt(startDate)}-${formatDt(endDate)})`;

        const newActivities = crews.map(crew => {
            // Determinar tipo de cuadrilla para mapeo basado en el nombre
            let targetActivityTypeId = null;
            let baseTitle = `Planificación Semana - ${crew.name}`;

            // Hardcoded IDs according to database check
            // Concertación: 2, Reparación/Mantenimiento: 3, Entrega de Materiales: 10
            // Mecanizado: 6, Fabricación de Piezas: 5

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
                // Taller u otras cuadrillas
                baseTitle = crew.name;
                if (lowerName.includes('mecanizado')) targetActivityTypeId = 6;
                else if (lowerName.includes('fabricación') || lowerName.includes('soldadura') || lowerName.includes('roscado')) targetActivityTypeId = 5;
            }

            // Identificar ingeniero líder o primer miembro
            let responsiblePersonId = null;
            if (crew.crew_member && crew.crew_member.length > 0) {
                const leader = crew.crew_member.find(m => m.role_in_crew === 'Ingeniero Lider');
                responsiblePersonId = leader && leader.person ? leader.person.person_id : crew.crew_member[0]?.person?.person_id;
            }

            return {
                title: `${datePrefix} ${baseTitle}`,
                activity_type_id: targetActivityTypeId,
                priority: 'MEDIA',
                status: 'PLANIFICADA',
                assigned_crew_id: crew.crew_id,
                responsible_person_id: responsiblePersonId,
                planned_start_week: startDate,
                planned_end_week: endDate,
                estimated_duration_days: durationDays,
            };
        });

        // Insertar por lotes
        const { error: insertError } = await supabase
            .from('planned_activity')
            .insert(newActivities);

        if (insertError) throw insertError;
    }
};
