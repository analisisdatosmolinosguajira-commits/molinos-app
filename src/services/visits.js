import { supabase } from './supabase';

export const VisitService = {
    async getVisits() {
        const visits = [];

        // 1. Diagnoses
        const diagnosesPromise = supabase
            .from('diagnosis_visit')
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
                movement_community (
                    community (name)
                ),
                movement_person (
                    role,
                    person (first_name, last_name), 
                    crew (name)
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
                description: c.agreements || c.topics
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
                    status: m.end_date ? 'COMPLETED' : 'IN_PROGRESS',
                    type: uiType,
                    title: `Desplazamiento: ${m.objective?.toUpperCase() || 'GENERAL'}`,
                    description: `Vehículo: ${m.vehicle_info || 'N/A'}. ${m.notes || ''}`
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
                    movement_community (
                        community (name, department, municipality)
                    ),
                    movement_person (
                        role,
                        person (first_name, last_name, role, document_id),
                        crew (name)
                    ),
                    movement_work_order (
                        work_order (*)
                    ),
                    movement_diagnosis (
                        diagnosis_visit (*)
                    ),
                    movement_gps_point (
                        latitude, longitude, recorded_at
                    )
                `)
                .eq('movement_id', coreId)
                .single();

            if (error) throw error;

            // Transform for UI
            return {
                ...data,
                id: id,
                type: 'LOGISTICA_DETALLE', // Special internal type for detail view
                uiType: 'LOGISTICA', // Display type
                communities: data.movement_community?.map(mc => mc.community).filter(Boolean) || [],
                people: data.movement_person?.map(mp => ({
                    name: mp.person?.first_name ? `${mp.person.first_name} ${mp.person.last_name || ''}` : 'Desconocido',
                    role: mp.role || mp.person?.role,
                    crew: mp.crew?.name,
                    id: mp.person?.person_id
                })) || [],
                workOrders: data.movement_work_order?.map(mwo => mwo.work_order).filter(Boolean) || [],
                diagnoses: data.movement_diagnosis?.map(md => md.diagnosis_visit).filter(Boolean) || [],
                gpsPoints: data.movement_gps_point || [],
                title: `Desplazamiento: ${data.objective?.toUpperCase()}`,
                description: data.notes
            };
        }

        if (prefix === 'dia') {
            const { data, error } = await supabase
                .from('diagnosis_visit')
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
    }
};
