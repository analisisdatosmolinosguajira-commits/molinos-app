import { supabase } from './supabase';

export const ActivityExecutionService = {
    /**
     * Get full details for an activity execution dashboard
     * Includes the activity, assigned crew, members, and related entities
     */
    async getActivityFullDetails(activityId) {
        const { data, error } = await supabase
            .from('planned_activity')
            .select(`
                *,
                crew:crew!planned_activity_assigned_crew_id_fkey (
                    crew_id,
                    name,
                    crew_member (
                        crew_member_id,
                        person_id,
                        role_in_crew,
                        person!fk_crew_member_person (
                            first_name,
                            last_name,
                            document_id
                        )
                    )
                ),
                responsible:person!planned_activity_responsible_person_id_fkey (
                    first_name,
                    last_name
                ),
                work_order!work_order_related_activity_id_fkey (
                    work_order_id,
                    code,
                    status,
                    description
                ),
                diagnosis!diagnosis_related_activity_id_fkey (
                    diagnosis_id,
                    code,
                    mill (name),
                    notes
                ),
                concertation:community_concertation!community_concertation_related_activity_id_fkey (
                    concertation_id,
                    community (name),
                    conditions,
                    decision
                ),
                manufacturing_order:manufacturing_order!manufacturing_order_related_activity_id_fkey (
                    mo_id,
                    code,
                    status
                ),
                planned_communities:activity_community (
                    id, source_type, source_id, sort_order,
                    community:community (community_id, name, department, municipality)
                )
            `)
            .eq('activity_id', activityId)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Change the status of an activity
     */
    async updateActivityStatus(activityId, status, closingNote = null) {
        const payload = { status };
        if (closingNote) {
            payload.completion_notes = closingNote;
            if (status === 'COMPLETADA' || status === 'FINALIZADA') {
                payload.actual_end_date = new Date().toISOString();
            }
        }
        if (status === 'EN_EJECUCION' || status === 'EN PROGRESO') {
            payload.actual_start_date = new Date().toISOString();
            payload.status = 'EN_EJECUCION'; // Ensure DB matches the check constraint: 'PLANIFICADA', 'ASIGNADA', 'EN_EJECUCION', 'COMPLETADA', 'CANCELADA'
        }

        const { data, error } = await supabase
            .from('planned_activity')
            .update(payload)
            .eq('activity_id', activityId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update a crew member's role dynamically during execution
     */
    async updateCrewMemberRole(crewMemberId, newRole) {
        const { error } = await supabase
            .from('crew_member')
            .update({ role_in_crew: newRole })
            .eq('crew_member_id', crewMemberId);

        if (error) throw error;
        return true;
    },

    /**
     * Link an entity to an activity (1-to-N)
     * We update the entity's related_activity_id field instead of the activity
     */
    async linkEntity(activityId, typeField, entityId) {
        let tableName;
        let idField;

        switch (typeField) {
            case 'related_work_order_id':
                tableName = 'work_order';
                idField = 'work_order_id';
                break;
            case 'related_diagnosis_id':
                tableName = 'diagnosis';
                idField = 'diagnosis_id';
                break;
            case 'related_concertation_id':
                tableName = 'community_concertation';
                idField = 'concertation_id';
                break;
            case 'related_manufacturing_order_id':
                tableName = 'manufacturing_order';
                idField = 'mo_id';
                break;
            default:
                throw new Error('Tipo de entidad no soportado');
        }

        const { error } = await supabase
            .from(tableName)
            .update({ related_activity_id: activityId })
            .eq(idField, entityId);

        if (error) throw error;
        return true;
    },

    /**
     * Unlink an entity from an activity
     */
    async unlinkEntity(activityId, typeField, entityId) {
        let tableName;
        let idField;

        switch (typeField) {
            case 'related_work_order_id':
                tableName = 'work_order';
                idField = 'work_order_id';
                break;
            case 'related_diagnosis_id':
                tableName = 'diagnosis';
                idField = 'diagnosis_id';
                break;
            case 'related_concertation_id':
                tableName = 'community_concertation';
                idField = 'concertation_id';
                break;
            case 'related_manufacturing_order_id':
                tableName = 'manufacturing_order';
                idField = 'mo_id';
                break;
            default:
                throw new Error('Tipo de entidad no soportado');
        }

        const { error } = await supabase
            .from(tableName)
            .update({ related_activity_id: null })
            .eq(idField, entityId)
            // Safety check: only unlink if it belongs to this activity
            .eq('related_activity_id', activityId);

        if (error) throw error;
        return true;
    },

    /**
     * ENTITY LINKER METHODS
     */

    async getAvailableWorkOrders(personId, filters = {}) {
        let query = supabase.from('work_order').select('*');

        if (filters.search) {
            query = query.ilike('code', `%${filters.search}%`);
        }
        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Prioritize: Put work orders assigned to personId first
        if (personId && data) {
            return data.sort((a, b) => {
                if (a.assigned_to === personId && b.assigned_to !== personId) return -1;
                if (a.assigned_to !== personId && b.assigned_to === personId) return 1;
                return new Date(b.created_at) - new Date(a.created_at); // then latest first
            });
        }
        return data || [];
    },

    async getAvailableDiagnoses(personId, filters = {}) {
        let query = supabase.from('diagnosis').select('*, mill:mill_id(*)');

        if (filters.search) {
            query = query.or(`code.ilike.%${filters.search}%, description.ilike.%${filters.search}%`);
        }
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.mill_id) {
            query = query.eq('mill_id', filters.mill_id);
        }
        if (filters.severity_id) {
            query = query.eq('severity_id', filters.severity_id);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Prioritize by personId (reporter)
        if (personId && data) {
            return data.sort((a, b) => {
                if (a.reported_by === personId && b.reported_by !== personId) return -1;
                if (a.reported_by !== personId && b.reported_by === personId) return 1;
                return new Date(b.reported_at) - new Date(a.reported_at);
            });
        }
        return data || [];
    },

    async getAvailableConcertations(personId, filters = {}) {
        let query = supabase.from('community_concertation').select('*, community:community_id(*)');

        if (filters.search) {
            query = query.ilike('topic', `%${filters.search}%`);
        }
        if (filters.status) {
            query = query.eq('status', filters.status);
        } else {
            query = query.in('status', ['pendiente', 'en_proceso']);
        }
        if (filters.community_id) {
            query = query.eq('community_id', filters.community_id);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (personId && data) {
            return data.sort((a, b) => {
                if (a.responsible_id === personId && b.responsible_id !== personId) return -1;
                if (a.responsible_id !== personId && b.responsible_id === personId) return 1;
                return new Date(b.concertation_date) - new Date(a.concertation_date);
            });
        }
        return data || [];
    },

    async getAvailableFabricationOrders(personId, filters = {}) {
        let query = supabase.from('manufacturing_order').select('*');

        if (filters.search) {
            query = query.ilike('code', `%${filters.search}%`);
        }
        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        const { data, error } = await query;
        if (error) throw error;

        // No direct person_id/supervisor_id on manufacturing_order to prioritize easily,
        // so we just sort by created_at.
        if (data) {
            return data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        return [];
    },

    /**
     *  ATTENDANCE METHODS
     */

    // Get attendance records for a specific activity & optionally date
    async getAttendance(activityId, dateStr = null) {
        let query = supabase
            .from('activity_attendance')
            .select('*')
            .eq('activity_id', activityId);

        if (dateStr) {
            query = query.eq('date', dateStr);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    },

    // Save or update attendance records (Bulk insert/upsert)
    async saveAttendance(activityId, dateStr, records) {
        // records = [{ person_id, present, notes }]
        const payload = records.map(r => ({
            activity_id: activityId,
            date: dateStr,
            person_id: r.person_id,
            present: r.present,
            notes: r.notes || null
        }));

        const { error } = await supabase
            .from('activity_attendance')
            .upsert(payload, { onConflict: 'activity_id, date, person_id' });

        if (error) throw error;
        return true;
    },

    /**
     *  DAILY REPORTS METHODS
     */

    // Get all daily reports for an activity
    async getDailyReports(activityId) {
        const { data, error } = await supabase
            .from('activity_daily_report')
            .select(`
                *,
                creator:person!activity_daily_report_created_by_fkey(first_name, last_name),
                fabrication_items:activity_report_fabrication_item(*),
                maintenance_items:activity_report_maintenance_item(*),
                concertation_items:activity_report_concertation_item(*),
                delivery_items:activity_report_delivery_item(*),
                community_visits:daily_report_community_visit(
                    *, community:community(community_id, name)
                )
            `)
            .eq('activity_id', activityId)
            .order('report_date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Save a new daily report with its multiple items
    async saveDailyReport(payload) {
        // payload format: 
        // { activity_id, report_date, report_type, general_notes, items: array }

        const { items, ...reportMeta } = payload;

        // 1. Insert report metadata
        const { data: report, error: reportError } = await supabase
            .from('activity_daily_report')
            .insert([reportMeta])
            .select()
            .single();

        if (reportError) throw reportError;

        // 2. Insert items based on report_type
        if (items && items.length > 0) {
            let table = 'activity_report_maintenance_item'; // default or fallback
            if (reportMeta.report_type === 'FABRICATION') {
                table = 'activity_report_fabrication_item';
            } else if (reportMeta.report_type === 'CONCERTATION') {
                table = 'activity_report_concertation_item';
            } else if (reportMeta.report_type === 'DELIVERY') {
                table = 'activity_report_delivery_item';
            }

            const itemsPayload = items.map(item => ({
                ...item,
                report_id: report.report_id
            }));

            const { error: itemsError } = await supabase
                .from(table)
                .insert(itemsPayload);

            if (itemsError) throw itemsError;
        }

        // 3. Insert community visits for MAINTENANCE reports
        if (payload.communityVisits && payload.communityVisits.length > 0) {
            const visitsPayload = payload.communityVisits.map(v => ({
                report_id: report.report_id,
                community_id: v.community_id,
                visited: v.visited !== false,
                technical_notes: v.technical_notes || null,
                work_performed: v.work_performed || null,
                issues_found: v.issues_found || null,
                next_steps: v.next_steps || null
            }));

            const { error: visitsError } = await supabase
                .from('daily_report_community_visit')
                .insert(visitsPayload);

            if (visitsError) {
                console.error('Error saving community visits:', visitsError);
                // Don't throw - report already saved
            }
        }

        return report;
    }
};
