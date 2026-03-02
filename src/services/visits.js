import { supabase } from './supabase';

export const VisitService = {
    async getVisits() {
        const visits = [];

        // 1. Diagnoses
        const diagnosesPromise = supabase
            .from('diagnosis')
            .select(`
                *,
                mill (code, name, community_name),
                crew (name)
            `);

        // 2. Work Orders (Technical Visits)
        const workOrdersPromise = supabase
            .from('work_order')
            .select(`
                *,
                mill (code, name, community_name),
                crew (name)
            `);

        // 3. Social Visits (Concertations)
        const concertationsPromise = supabase
            .from('community_concertation')
            .select(`
                *,
                community (name)
            `);

        // 4. Movements (Field Visits / Displacements)
        const movementsPromise = supabase
            .from('movement')
            .select(`
                *,
                related_activity:planned_activity!movement_related_activity_id_fkey (
                    activity_id,
                    title,
                    activity_type (name)
                ),
                movement_community (
                    community (name)
                ),
                movement_person (
                    role,
                    confirmed_attendance,
                    actual_attendance,
                    absence_reason,
                    person (first_name, last_name), 
                    crew (name)
                ),
                movement_vehicle (
                    vehicle (plate_number, model, vehicle_type)
                ),
                movement_log (
                    log_date,
                    activity_type,
                    description,
                    incident_reported
                )
            `);

        // Execute all in parallel
        const [diagnosesRes, workOrdersRes, socialRes, movementsRes] = await Promise.all([
            diagnosesPromise,
            workOrdersPromise,
            concertationsPromise,
            movementsPromise
        ]);

        // Process Diagnoses
        if (diagnosesRes.data) {
            visits.push(...diagnosesRes.data.map(v => ({
                id: `dia-${v.diagnosis_id}`,
                raw_id: v.diagnosis_id,
                date: v.visit_date || v.scheduled_date || v.created_at || new Date().toISOString(),
                location: v.mill?.community_name || v.mill?.name || 'Ubicación desconocida',
                crew: v.crew?.name || 'Sin asignar',
                status: v.status || 'SCHEDULED',
                type: 'DIAGNOSTICO',
                title: `Diagnóstico: ${v.mill?.code || 'Molino'}`,
                description: v.notes
            })));
        }

        // Process Work Orders
        if (workOrdersRes.data) {
            visits.push(...workOrdersRes.data.map(wo => ({
                id: `wo-${wo.work_order_id}`,
                raw_id: wo.work_order_id,
                date: wo.created_at || new Date().toISOString(),
                location: wo.mill?.community_name || wo.mill?.name || 'Sitio de Trabajo',
                crew: wo.crew?.name || 'Sin asignar',
                status: wo.status || 'PENDING',
                type: 'REPARACION',
                title: `Orden ${wo.code || '#' + wo.work_order_id}`,
                description: wo.description
            })));
        }

        // Process Social
        if (socialRes.data) {
            visits.push(...socialRes.data.map(c => ({
                id: `soc-${c.concertation_id}`,
                raw_id: c.concertation_id,
                date: c.meeting_date || c.created_at || new Date().toISOString(),
                location: c.community?.name || 'Comunidad',
                crew: 'Gestión Social',
                status: c.status === 'ACTIVA' ? 'SCHEDULED' : 'COMPLETED',
                type: 'SOCIAL',
                title: 'Concertación Comunitaria',
                description: c.conditions || c.decision
            })));
        }

        // Process Movements
        if (movementsRes.data) {
            visits.push(...movementsRes.data.map(m => {
                // Extract aggregate info
                const communities = m.movement_community?.map(mc => mc.community?.name).filter(Boolean).join(', ') || 'Ruta General';
                const crewInfo = m.movement_person?.map(mp => mp.crew?.name).filter(Boolean)[0] || // Try to get crew name
                    m.movement_person?.map(mp => mp.person ? `${mp.person.first_name} ${mp.person.last_name || ''}` : '').filter(Boolean).join(', ') ||
                    'Personal Vario';

                // Detailed vehicle info
                const vehicles = m.movement_vehicle?.map(mv => mv.vehicle?.plate_number).join(', ') || 'Sin vehículo';

                // Map Objective to Type
                let uiType = 'LOGISTICA';
                if (m.objective === 'diagnostico') uiType = 'DIAGNOSTICO';
                if (m.objective === 'concertacion') uiType = 'SOCIAL';

                return {
                    id: `mov-${m.movement_id}`,
                    raw_id: m.movement_id,
                    date: m.start_date || m.created_at || new Date().toISOString(),
                    location: communities,
                    crew: crewInfo,
                    status: m.status || (m.end_date ? 'COMPLETED' : 'IN_PROGRESS'),
                    type: uiType,
                    title: m.title || `Desplazamiento: ${m.objective?.toUpperCase() || 'GENERAL'}`,
                    description: `Vehículos: ${vehicles}. ${m.notes || ''}`,
                    notes: m.notes,
                    objective: m.objective,
                    start_date: m.start_date,
                    end_date: m.end_date,
                    // Activity linkage
                    linkedActivity: m.related_activity ? {
                        id: m.related_activity.activity_id,
                        title: m.related_activity.title,
                        type: m.related_activity.activity_type?.name || 'Actividad'
                    } : null,
                    // New Fields
                    logs: m.movement_log || [],
                    vehicles: m.movement_vehicle || []
                };
            }));
        } else if (movementsRes.error) {
            console.warn("Could not fetch movements:", movementsRes.error);
        }

        // Sort by Date Descending
        return visits.sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    async getVisitById(id) {
        // ID format: prefix-id (e.g., mov-123, dia-456, wo-789)
        const [prefix, coreId] = id.split('-');

        if (prefix === 'mov') {
            const { data, error } = await supabase
                .from('movement')
                .select(`
                    *,
                    movement_community!fk_movement_community_movement (
                        community!fk_movement_community_community (name, department, municipality)
                    ),
                    movement_person!fk_movement_person_movement (
                        id,
                        role,
                        confirmed_attendance,
                        actual_attendance,
                        absence_reason,
                        person!fk_movement_person_person (first_name, last_name, document_id),
                        crew!movement_person_crew_id_fkey (name)
                    ),
                    movement_work_order!fk_movement_wo_movement (
                        work_order!fk_movement_wo_work_order (*)
                    ),
                    movement_diagnosis!fk_movement_diagnosis_movement (
                        diagnosis!fk_movement_diagnosis_diagnosis (*)
                    ),
                    movement_gps_point!fk_movement_gps_movement (
                        latitude, longitude, recorded_at
                    ),
                    movement_vehicle!movement_vehicle_movement_id_fkey (
                        id:movement_vehicle_id,
                        km_start:departure_km, 
                        km_end:arrival_km,
                        vehicle!movement_vehicle_vehicle_id_fkey (*),
                        driver:person!movement_vehicle_driver_person_id_fkey (first_name, last_name)
                    ),
                    movement_log!movement_log_movement_id_fkey (
                        log_id,
                        log_date,
                        activity_type,
                        description,
                        incident_reported,
                        incident_details,
                        created_at
                    ),
                    related_activity:planned_activity!movement_related_activity_id_fkey (
                        id:activity_id,
                        activity_type_id,
                        title,
                        description,
                        status,
                        activity_date:planned_start_week,
                        activity_type (name),
                        community:community!planned_activity_target_community_id_fkey (
                            community_id,
                            name, 
                            municipality, 
                            department,
                            latitude,
                            longitude,
                            geotracker_route
                        ),
                        crew:crew!planned_activity_assigned_crew_id_fkey (
                            crew_id,
                            name,
                            crew_member (
                                crew_member_id,
                                role_in_crew,
                                person (person_id, first_name, last_name, document_id)
                            )
                        ),
                        work_orders:work_order!work_order_related_activity_id_fkey (
                            code, 
                            status,
                            type,
                            mill (
                                name,
                                community:community!mill_community_id_fkey (community_id, name, municipality, department, latitude, longitude, geotracker_route)
                            )
                        ),
                        diagnoses:diagnosis!diagnosis_related_activity_id_fkey (
                            code,
                            diagnosis_type,
                            status,
                            mill (
                                name,
                                community:community!mill_community_id_fkey (community_id, name, municipality, department, latitude, longitude, geotracker_route)
                            )
                        ),
                        concertations:community_concertation!related_activity_id (
                            code,
                            status,
                            meeting_date,
                            community (community_id, name, municipality, department, latitude, longitude, geotracker_route)
                        ),
                        deliveries:activity_community_delivery!activity_community_delivery_activity_id_fkey (
                            delivery_id,
                            delivery_status,
                            community:community (
                                community_id,
                                name,
                                municipality,
                                department,
                                latitude,
                                longitude,
                                geotracker_route
                            )
                        ),
                        manufacturing_orders:manufacturing_order!manufacturing_order_related_activity_id_fkey (
                            id:mo_id,
                            status
                        ),
                        planned_communities:activity_community (
                            id, community_id, source_type, source_id, sort_order,
                            community:community (community_id, name, department, municipality, latitude, longitude, geotracker_route)
                        )
                    )
                `)
                .eq('movement_id', coreId)
                .single();

            if (error) throw error;

            // Transform for UI
            return {
                ...data,
                id: id,
                raw_id: coreId,
                type: 'LOGISTICA_DETALLE', // Special internal type for detail view
                uiType: 'LOGISTICA_DETALLE', // Display type
                communities: data.movement_community?.map(mc => mc.community).filter(Boolean) || [],
                people: data.movement_person?.map(mp => ({
                    id: mp.person?.person_id, // Person ID
                    movement_person_id: mp.id, // Junction ID
                    name: mp.person?.first_name ? `${mp.person.first_name} ${mp.person.last_name || ''}` : 'Desconocido',
                    role: mp.role || mp.person?.role,
                    crew: mp.crew?.name,
                    confirmed_attendance: mp.confirmed_attendance,
                    actual_attendance: mp.actual_attendance,
                    absence_reason: mp.absence_reason
                })) || [],
                vehicle_assignments: data.movement_vehicle || [],
                logs: data.movement_log || [],
                workOrders: data.movement_work_order?.map(mwo => mwo.work_order).filter(Boolean) || [],
                diagnoses: data.movement_diagnosis?.map(md => md.diagnosis).filter(Boolean) || [],
                gpsPoints: data.movement_gps_point || [],
                title: data.title || `Desplazamiento: ${data.objective?.toUpperCase()}`,
                description: data.notes,
                activity: data.related_activity ? {
                    id: data.related_activity.id,
                    activity_type_id: data.related_activity.activity_type_id,
                    title: data.related_activity.title,
                    description: data.related_activity.description,
                    status: data.related_activity.status,
                    date: data.related_activity.activity_date,
                    type: data.related_activity.activity_type?.name,
                    community: data.related_activity.community,
                    planned_communities: data.related_activity.planned_communities || [],
                    crew: data.related_activity.crew,
                    linkedEntities: {
                        workOrders: data.related_activity.work_orders?.map(wo => ({
                            ...wo,
                            target_community: wo.mill?.community
                        })) || [],
                        diagnoses: data.related_activity.diagnoses?.map(d => ({
                            ...d,
                            target_community: d.mill?.community
                        })) || [],
                        concertations: data.related_activity.concertations?.map(c => ({
                            ...c,
                            target_community: c.community
                        })) || [],
                        deliveries: data.related_activity.deliveries?.map(d => ({
                            ...d,
                            target_community: d.community
                        })) || [],
                        manufacturingOrders: data.related_activity.manufacturing_orders || []
                    }
                } : null
            };
        }

        if (prefix === 'dia') {
            const { data, error } = await supabase
                .from('diagnosis')
                // Fetch crew with members
                .select(`
                    *, 
                    mill(*), 
                    crew (
                        name,
                        crew_member (
                            person (person_id, first_name, last_name, role)
                        )
                    )
                `)
                .eq('diagnosis_id', coreId)
                .single();
            if (error) throw error;

            return {
                ...data,
                id: id,
                type: 'DIAGNOSTICO', // UI Type matching
                uiType: 'DIAGNOSTICO',
                title: `Diagnóstico ${data.mill?.code || data.mill?.name || ''}`,
                location: data.mill?.community_name || data.mill?.name,
                description: data.notes,
                date: data.visit_date || data.scheduled_date || data.created_at || new Date().toISOString(),
                // Map crew members to 'people' structure for rich UI
                people: data.crew?.crew_member?.map(cm => ({
                    id: cm.person?.person_id,
                    name: cm.person ? `${cm.person.first_name} ${cm.person.last_name || ''}` : 'Miembro',
                    role: cm.person?.role || 'Técnico',
                    crew: data.crew?.name
                })) || [],
                crew: data.crew?.name
            };
        }

        if (prefix === 'wo') {
            const { data, error } = await supabase
                .from('work_order')
                // Fetch crew with members
                .select(`
                    *, 
                    mill(*), 
                    crew (
                        name,
                        crew_member (
                            person (person_id, first_name, last_name, role)
                        )
                    )
                `)
                .eq('work_order_id', coreId)
                .single();
            if (error) throw error;

            return {
                ...data,
                id: id,
                type: 'REPARACION',
                uiType: 'REPARACION',
                title: `Orden ${data.code || (!isNaN(data.work_order_id) ? `#${data.work_order_id}` : 'General')}`,
                location: data.mill?.community_name || data.mill?.name,
                description: data.description,
                date: data.created_at || new Date().toISOString(),
                // Map crew members to 'people' structure for rich UI
                people: data.crew?.crew_member?.map(cm => ({
                    id: cm.person?.person_id,
                    name: cm.person ? `${cm.person.first_name} ${cm.person.last_name || ''}` : 'Miembro',
                    role: cm.person?.role || 'Técnico',
                    crew: data.crew?.name
                })) || [],
                crew: data.crew?.name
            };
        }

        return null;
    },

    /**
     * Create movement from planned activity
     * @param {number} activityId - Planned activity ID
     * @param {Object} movementData - Additional movement data (start_date, vehicle_info, etc.)
     */
    async createMovementFromActivity(activityId, movementData) {
        // First, get the activity details
        const { data: activity, error: actError } = await supabase
            .from('planned_activity')
            .select(`
                *,
                activity_type (name),
                assigned_crew_id,
                target_community_id,
                target_mill_id
            `)
            .eq('activity_id', activityId)
            .single();

        if (actError) throw actError;

        // Create the movement
        const movementInsertData = {
            objective: activity.activity_type?.name?.toLowerCase() || 'general',
            start_date: movementData.start_date || activity.planned_start_week,
            end_date: movementData.end_date || activity.planned_end_week,
            notes: movementData.notes || activity.description,
            title: movementData.title || activity.title,
            status: 'PLANIFICADO',
            related_activity_id: activityId,
            ...movementData // Assuming vehicle_info is no longer passed here, but vehicle assignments handled separately
        };

        const { data: movement, error: movError } = await supabase
            .from('movement')
            .insert([movementInsertData])
            .select()
            .single();

        if (movError) throw movError;

        // Link communities if target_community exists
        if (activity.target_community_id) {
            await supabase
                .from('movement_community')
                .insert([{
                    movement_id: movement.movement_id,
                    community_id: activity.target_community_id
                }]);
        }

        // Link crew members if assigned_crew exists
        if (activity.assigned_crew_id) {
            // Get crew members
            const { data: crewMembers } = await supabase
                .from('crew_member')
                .select('person_id')
                .eq('crew_id', activity.assigned_crew_id)
                .is('end_date', null); // Only active members

            if (crewMembers && crewMembers.length > 0) {
                const movementPersonInserts = crewMembers.map(cm => ({
                    movement_id: movement.movement_id,
                    person_id: cm.person_id,
                    role: 'TECNICO',
                    confirmed_attendance: true
                }));

                await supabase
                    .from('movement_person')
                    .insert(movementPersonInserts);
            }
        }

        // Update the activity status
        await supabase
            .from('planned_activity')
            .update({
                status: 'ASIGNADA'
            })
            .eq('activity_id', activityId);

        return movement;
    },

    /**
     * Link existing movement to planned activity
     * @param {number} movementId - Movement ID
     * @param {number} activityId - Activity ID
     */
    async linkMovementToActivity(movementId, activityId) {
        // Update movement (This is now the single source of truth for the relationship)
        const { data: movement, error: movError } = await supabase
            .from('movement')
            .update({ related_activity_id: activityId })
            .eq('movement_id', movementId)
            .select()
            .single();

        if (movError) throw movError;

        return { movement };
    },

    /**
     * Unlink movement from planned activity
     * @param {number} movementId - Movement ID
     * @param {number} activityId - Activity ID
     */
    async unlinkMovementFromActivity(movementId, activityId) {
        // Update movement to remove activity link
        const { error: movError } = await supabase
            .from('movement')
            .update({ related_activity_id: null })
            .eq('movement_id', movementId);

        if (movError) throw movError;

        return { success: true };
    },

    /**
     * Create a new movement (Journey)
     * @param {Object} movementData 
     */
    async createMovement(movementData) {
        const { data, error } = await supabase
            .from('movement')
            .insert([{
                ...movementData,
                status: 'PLANIFICADO' // Default status
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // =========================================================================

    // NEW JOURNEY MANAGEMENT METHODS
    // =========================================================================

    /**
     * Add a daily log entry to the movement
     * @param {number} movementId 
     * @param {Object} logData 
     */
    async addMovementLog(movementId, logData) {
        const { data, error } = await supabase
            .from('movement_log')
            .insert([{
                movement_id: movementId,
                ...logData
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get logs for a specific movement
     * @param {number} movementId 
     */
    async getMovementLogs(movementId) {
        const { data, error } = await supabase
            .from('movement_log')
            .select('*')
            .eq('movement_id', movementId)
            .order('log_date', { ascending: true })
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data;
    },

    /**
     * Update attendance status for a person in a movement
     * @param {number} movementPersonId - The ID from movement_person table
     * @param {boolean} attended 
     * @param {string} reason - Optional reasoning
     */
    async updateAttendance(movementPersonId, attended, reason = null) {
        const { data, error } = await supabase
            .from('movement_person')
            .update({
                actual_attendance: attended,
                absence_reason: reason
            })
            .eq('id', movementPersonId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update movement status
     * @param {number} movementId
     * @param {string} status
     */
    async updateMovementStatus(movementId, status) {
        const { data, error } = await supabase
            .from('movement')
            .update({ status })
            .eq('movement_id', movementId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**

     * Update movement details
     * @param {number} movementId
     * @param {Object} movementData
     */
    async updateMovement(movementId, movementData) {
        const { data, error } = await supabase
            .from('movement')
            .update(movementData)
            .eq('movement_id', movementId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a movement
     * @param {number} movementId
     */
    async deleteMovement(movementId) {
        const { error } = await supabase
            .from('movement')
            .delete()
            .eq('movement_id', movementId);

        if (error) throw error;
        return true;
    },

    /**
     * Assign a vehicle to a movement
     * @param {number} movementId 
     * @param {number} vehicleId 
     * @param {number|null} driverId 
     * @param {number|null} startKm 
     */
    async assignVehicleToMovement(movementId, vehicleId, driverId = null, startKm = null) {
        const { data, error } = await supabase
            .from('movement_vehicle')
            .insert([{
                movement_id: movementId,
                vehicle_id: vehicleId,
                driver_id: driverId,
                km_start: startKm
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Remove or unassign a vehicle from a movement
     * @param {number} id - Table ID (movement_vehicle_id)
     */
    async removeVehicleAssignment(id) {
        const { error } = await supabase
            .from('movement_vehicle')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    /**
     * Close a movement (finish trip)
     * @param {number} movementId 
     * @param {Object} reportData - { is_satisfactory, completion_notes, actual_return_date, actual_end_date }
     */
    async closeMovement(movementId, reportData) {
        // Extract actual_end_date to map it to end_date, preventing PGRST204 error
        const { actual_end_date, ...rest } = reportData;

        const { data, error } = await supabase
            .from('movement')
            .update({
                status: 'COMPLETADO',
                end_date: actual_end_date || new Date().toISOString(),
                ...rest
            })
            .eq('movement_id', movementId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Sync crew members from linked activity to movement attendance
     * @param {number} movementId - Movement ID
     */
    async syncCrewToAttendance(movementId) {
        // Get movement with linked activity and crew
        const { data: movement, error: movError } = await supabase
            .from('movement')
            .select(`
                movement_id,
                related_activity_id,
                planned_activity!movement_related_activity_id_fkey (
                    assigned_crew_id,
                    crew:crew!planned_activity_assigned_crew_id_fkey (
                        crew_member (
                            crew_member_id,
                            person_id,
                            role_in_crew,
                            person (person_id, first_name, last_name)
                        )
                    )
                )
            `)
            .eq('movement_id', movementId)
            .single();

        if (movError) throw movError;
        if (!movement?.planned_activity?.crew?.crew_member) {
            return { synced: 0, message: 'No crew members found' };
        }

        const crewMembers = movement.planned_activity.crew.crew_member;

        // Get existing attendance records
        const { data: existing, error: existError } = await supabase
            .from('movement_person')
            .select('person_id')
            .eq('movement_id', movementId);

        if (existError) throw existError;

        const existingPersonIds = new Set((existing || []).map(e => e.person_id));

        // Filter out already added people
        const newMembers = crewMembers.filter(m => !existingPersonIds.has(m.person_id));

        if (newMembers.length === 0) {
            return { synced: 0, message: 'All crew members already in attendance' };
        }

        // Insert new attendance records
        const newRecords = newMembers.map(member => ({
            movement_id: movementId,
            person_id: member.person_id,
            role: member.role_in_crew,
            confirmed_attendance: true, // Auto-confirmed since from crew
            actual_attendance: null // To be confirmed later
        }));

        const { data: inserted, error: insertError } = await supabase
            .from('movement_person')
            .insert(newRecords)
            .select();

        if (insertError) throw insertError;

        return { synced: inserted.length, message: `Synced ${inserted.length} crew members` };
    },

    /**
     * Manually add a person to movement attendance
     * @param {number} movementId
     * @param {number} personId
     * @param {string} role - Optional role override
     */
    async addPersonToAttendance(movementId, personId, role = 'TECNICO') {
        const { data, error } = await supabase
            .from('movement_person')
            .insert([{
                movement_id: movementId,
                person_id: personId,
                role: role,
                confirmed_attendance: true,
                actual_attendance: null
            }])
            .select(`
                *,
                person (person_id, first_name, last_name, document_id)
            `)
            .single();

        if (error) throw error;
        return data;
    },

    // Get only movements (not mixed with other visit types)
    // Used by LinkActivityModal to show available movements for linking
    async getMovements() {
        try {
            const { data, error } = await supabase
                .from('movement')
                .select(`
                    *,
                    related_activity:planned_activity!movement_related_activity_id_fkey (
                        activity_id,
                        title,
                        activity_type (name)
                    ),
                    movement_community (
                        community (name)
                    ),
                    movement_person (
                        person (first_name, last_name)
                    )
                `)
                .order('start_date', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching movements:', error);
            throw error;
        }
    }
};

// Export as MovementService for compatibility
export const MovementService = VisitService;
