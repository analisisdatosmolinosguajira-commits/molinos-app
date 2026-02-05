import { supabase } from './supabase';

export const MillService = {
    // Get all mills with community and installed pump info
    async getAllMills() {
        const { data, error } = await supabase
            .from('mill')
            .select(`
                *,
                community:community!fk_mill_community (
                    community_id,
                    name
                ),
                installed_pump:mill_pump!mill_id (
                    pump_id,
                    removed_date,
                    pump:pump_id (
                        pump_id,
                        serial_number,
                        status
                    )
                )
            `)
            .order('code');

        if (error) throw error;

        // Flatten the data and filter only active installations
        return data.map(mill => {
            const activePump = mill.installed_pump?.find(mp => !mp.removed_date);
            return {
                ...mill,
                community_name: mill.community?.name,
                has_pump: !!activePump,
                active_pump: activePump || null
            };
        });
    },

    async getMills() {
        return this.getAllMills();
    },

    async getMillById(id) {
        const { data, error } = await supabase
            .from('mill')
            .select(`
                *,
                community!fk_mill_community (*),
                mill_pump (*)
            `)
            .eq('mill_id', id)
            .single();
        if (error) throw error;
        // Add computed community_name for consistency
        if (data) {
            data.community_name = data.community?.name;
        }
        return data;
    },

    async getMillHistory(millId) {
        const { data, error } = await supabase
            .from('work_order')
            .select('*')
            .eq('mill_id', millId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    async getMillComponents(millId) {
        // Table mill_has_component doesn't exist yet, return empty for now to avoid 400
        return [];
    },

    async getLifeRecord(millId) {
        // 1. Fetch Work Orders
        const { data: workOrders } = await supabase
            .from('work_order')
            .select('*')
            .eq('mill_id', millId);

        // 2. Fetch Pump History (Installations/Removals)
        const { data: pumpEvents } = await supabase
            .from('mill_pump')
            .select('*, pump(model, serial_number)')
            .eq('mill_id', millId);

        // 3. Fetch Diagnosis Visits
        const { data: diagnosisVisits } = await supabase
            .from('diagnosis_visit')
            .select('*')
            .eq('mill_id', millId);

        // Normalize Work Orders
        const woEvents = (workOrders || []).map(wo => ({
            id: `wo-${wo.work_order_id}`,
            date: wo.scheduled_date || wo.created_at,
            type: 'WORK_ORDER',
            priority: wo.priority,
            status: wo.status,
            title: wo.description || `Orden #${wo.code || wo.work_order_id}`,
            subtitle: `OT ${wo.type} - ${wo.status}`
        }));

        // Normalize Diagnosis Visits
        const diagnosisEvents = (diagnosisVisits || []).map(d => ({
            id: `dia-${d.diagnosis_id}`,
            date: d.scheduled_date || d.created_at,
            type: 'DIAGNOSIS',
            priority: d.type === 'emergencia' ? 'ALTA' : 'MEDIA',
            status: d.status,
            title: `Diagnóstico ${d.type}`,
            subtitle: d.notes ? d.notes.substring(0, 50) + (d.notes.length > 50 ? '...' : '') : `Estado: ${d.status}`
        }));

        // Normalize Pump Events
        const historyEvents = [];
        (pumpEvents || []).forEach(pe => {
            // Installation (using created_at as proxy for installation if removed_date is null or we want to show when it was linked)
            // Ideally we'd have installation_date, but we use created_at of the record
            if (pe.created_at) {
                historyEvents.push({
                    id: `inst-${pe.mill_pump_id}`,
                    date: pe.created_at,
                    type: 'INSTALLATION',
                    title: `Instalación de Bomba`,
                    subtitle: `Modelo: ${pe.pump?.model} - SN: ${pe.pump?.serial_number || 'N/A'}`
                });
            }

            // Removal
            if (pe.removed_date) {
                historyEvents.push({
                    id: `rem-${pe.mill_pump_id}`,
                    date: pe.removed_date,
                    type: 'REMOVAL',
                    title: `Desinstalación de Bomba`,
                    subtitle: `Ciclo finalizado.`
                });
            }
        });

        const allEvents = [...woEvents, ...diagnosisEvents, ...historyEvents];

        // Sort by date descending
        return allEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    /**
     * Get reliability metrics for a mill (used in header KPI)
     * Now using mill_profile view to ensure consistency
     */
    async getReliabilityMetrics(millId) {
        try {
            // Get data from mill_profile view (single source of truth)
            const { data: profile, error } = await supabase
                .from('mill_profile')
                .select('days_since_installation, last_diagnosis_date, days_since_last_diagnosis')
                .eq('mill_id', millId)
                .single();

            if (error) throw error;

            // Get failure count from last 12 months
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

            const { data: failures } = await supabase
                .from('work_order')
                .select('work_order_id')
                .eq('mill_id', millId)
                .eq('type', 'correctivo')
                .gte('created_at', oneYearAgo.toISOString());

            return {
                // Time since installation (in days) - shown as "Tiempo en Servicio"
                daysSinceInstallation: profile?.days_since_installation
                    ? Math.floor(parseFloat(profile.days_since_installation))
                    : 0,

                // Failures in last 12 months
                failuresLastYear: failures?.length || 0,

                // Days since last diagnosis (for additional context)
                daysSinceLastDiagnosis: profile?.days_since_last_diagnosis
                    ? Math.floor(parseFloat(profile.days_since_last_diagnosis))
                    : null
            };
        } catch (error) {
            console.error('Error fetching reliability metrics:', error);
            return {
                daysSinceInstallation: 0,
                failuresLastYear: 0,
                daysSinceLastDiagnosis: null
            };
        }
    },

    /**
     * Get social status for a mill (used in header KPI)
     * Now aligned with getSocialInfo() logic
     */
    async getSocialStatus(millId) {
        try {
            // Get communities associated with this mill
            const { data: millCommunities } = await supabase
                .from('mill_community')
                .select('community_id')
                .eq('mill_id', millId);

            if (!millCommunities || millCommunities.length === 0) {
                return {
                    status: 'PENDIENTE',
                    count: 0
                };
            }

            // Get all concertations for these communities
            const communityIds = millCommunities.map(mc => mc.community_id);
            const { data: concertations } = await supabase
                .from('community_concertation')
                .select('status, community_id')
                .in('community_id', communityIds);

            if (!concertations || concertations.length === 0) {
                return {
                    status: 'PENDIENTE',
                    count: 0
                };
            }

            // Determine status based on concertations (same logic as getSocialInfo)
            const finishedConcertations = concertations.filter(c => c.status === 'finalizada');
            let status = 'PENDIENTE';

            if (finishedConcertations.length > 0) {
                status = 'CONCERTADO';
            } else if (concertations.some(c => c.status === 'en_proceso')) {
                status = 'EN_PROCESO';
            }

            return {
                status: status,
                count: concertations.length
            };
        } catch (error) {
            console.error('Error fetching social status:', error);
            return {
                status: 'PENDIENTE',
                count: 0
            };
        }
    },

    // CRUD Operations
    async createMill(millData) {
        const { data, error } = await supabase
            .from('mill')
            .insert([millData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateMill(millId, millData) {
        const { data, error } = await supabase
            .from('mill')
            .update(millData)
            .eq('mill_id', millId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteMill(millId) {
        // Note: Depending on your RLS policies and foreign key constraints,
        // you might need to delete related records first or use CASCADE
        const { error } = await supabase
            .from('mill')
            .delete()
            .eq('mill_id', millId);

        if (error) throw error;
        return true;
    },

    // ============================================
    // MILL DETAIL ENHANCEMENTS
    // ============================================

    /**
     * Get component tracking matrix for a mill
     * Uses the component_state_history view
     */
    async getComponentMatrix(millId) {
        try {
            // Query the component_state_history view
            const { data: componentHistory, error } = await supabase
                .from('component_state_history')
                .select('*')
                .eq('mill_id', millId)
                .order('event_date', { ascending: false });

            if (error) throw error;

            // Group by component_id to get latest status + full history
            const componentsMap = new Map();

            (componentHistory || []).forEach(record => {
                const compId = record.component_id;

                if (!componentsMap.has(compId)) {
                    // First record (most recent) becomes the current status
                    componentsMap.set(compId, {
                        component_id: compId,
                        component_name: record.component_name,
                        status: record.component_status,
                        event_date: record.event_date,
                        source_type: record.source_type,
                        observation: record.observation || record.notes,
                        history: []
                    });
                }

                // Add all records to history
                componentsMap.get(compId).history.push({
                    date: record.event_date,
                    status: record.component_status,
                    source_type: record.source_type,
                    source_id: record.source_id,
                    observation: record.observation || record.notes,
                    diagnosis_type: record.diagnosis_type
                });
            });

            return Array.from(componentsMap.values());
        } catch (error) {
            console.error('Error fetching component matrix:', error);
            throw error;
        }
    },

    /**
     * Get social information for a mill (communities, concertations, members, situations)
     * Supports multiple communities per mill
     */
    async getSocialInfo(millId) {
        try {
            // 1. Get ALL communities associated with this mill
            const { data: millCommunities, error: mcError } = await supabase
                .from('mill_community')
                .select(`
                    *,
                    community:community_id (*)
                `)
                .eq('mill_id', millId);

            if (mcError) throw mcError;

            if (!millCommunities || millCommunities.length === 0) {
                return {
                    communities: [],
                    hasNoCommunity: true,
                    situations: []
                };
            }

            // 2. For each community, fetch members, concertations, and social situations
            const enrichedCommunities = await Promise.all(
                millCommunities.map(async (mc) => {
                    const communityId = mc.community.community_id;

                    // Fetch members
                    const { data: communityMembers } = await supabase
                        .from('community_member')
                        .select(`
                            id,
                            status,
                            joined_at,
                            person:person_id (
                                person_id,
                                first_name,
                                last_name,
                                specialty
                            ),
                            community_role:role_id (
                                name,
                                description
                            )
                        `)
                        .eq('community_id', communityId)
                        .eq('status', 'ACTIVE')
                        .limit(20);

                    // Fetch concertations
                    const { data: concertations } = await supabase
                        .from('community_concertation')
                        .select(`
                            concertation_id,
                            meeting_date,
                            decision,
                            conditions,
                            notes,
                            status,
                            diagnosis_visit:diagnosis_id (
                                diagnosis_id,
                                type,
                                notes
                            )
                        `)
                        .eq('community_id', communityId)
                        .order('meeting_date', { ascending: false })
                        .limit(10);

                    // Fetch social situations
                    const { data: situations } = await supabase
                        .from('community_social_situation')
                        .select('*')
                        .eq('community_id', communityId)
                        .order('created_at', { ascending: false });

                    // Format members
                    const members = (communityMembers || []).map(member => ({
                        id: member.id,
                        name: `${member.person?.first_name || ''} ${member.person?.last_name || ''}`.trim(),
                        role: member.community_role?.name || 'Miembro',
                        specialty: member.person?.specialty,
                        since: member.joined_at
                    }));

                    // Determine social status based on concertations
                    let socialStatus = 'PENDIENTE';
                    const finishedConcertations = concertations?.filter(c => c.status === 'finalizada') || [];
                    if (finishedConcertations.length > 0) {
                        socialStatus = 'CONCERTADO';
                    } else if (concertations?.some(c => c.status === 'en_proceso')) {
                        socialStatus = 'EN_PROCESO';
                    }

                    return {
                        ...mc,
                        community: mc.community,
                        relationship_type: mc.relationship_type,
                        members: members,
                        concertations: concertations || [],
                        socialSituations: situations || [],
                        status: socialStatus,
                        concertation_date: finishedConcertations[0]?.meeting_date || null
                    };
                })
            );

            // Aggregate all situations across all communities
            const allSituations = enrichedCommunities.flatMap(ec => ec.socialSituations || []);
            const activeSituations = allSituations.filter(s => s.status === 'active');
            const criticalSituations = allSituations.filter(s => s.severity === 'critical');

            // For backward compatibility, return primary community as "community"
            const primaryCommunity = enrichedCommunities.find(ec => ec.relationship_type === 'primary') || enrichedCommunities[0];

            return {
                // Backward compatibility: Primary community data
                community: primaryCommunity?.community,
                status: primaryCommunity?.status,
                concertation_date: primaryCommunity?.concertation_date,
                members: primaryCommunity?.members || [],
                concertations: primaryCommunity?.concertations || [],

                // New: Multi-community support
                communities: enrichedCommunities,
                allSituations: allSituations,
                activeSituations: activeSituations,
                criticalSituations: criticalSituations,
                hasNoCommunity: false
            };
        } catch (error) {
            console.error('Error fetching social info:', error);
            throw error;
        }
    },

    /**
     * Get analytics data for a mill
     * Uses the mill_profile view and component data
     */
    async getMillAnalytics(millId) {
        try {
            // Query the mill_profile view which has all aggregated metrics
            const { data: profile, error } = await supabase
                .from('mill_profile')
                .select('*')
                .eq('mill_id', millId)
                .single();

            if (error) throw error;

            // Get component failure patterns
            const components = await this.getComponentMatrix(millId);
            const problemCounts = {};

            components.forEach(comp => {
                const issues = comp.history.filter(h =>
                    ['DANADO', 'REQUIERE_CAMBIO', 'DESGASTADO'].includes(h.status)
                ).length;
                if (issues > 0) {
                    problemCounts[comp.component_name] = issues;
                }
            });

            const problematicComponents = Object.entries(problemCounts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            // Calculate completion rate
            const completionRate = profile.total_work_orders > 0
                ? Math.round((profile.completed_work_orders / profile.total_work_orders) * 100)
                : 0;

            return {
                // From mill_profile view
                workOrderCount: profile.total_work_orders || 0,
                completedWorkOrders: profile.completed_work_orders || 0,
                activeWorkOrders: profile.active_work_orders || 0,
                diagnosisCount: profile.total_diagnoses || 0,
                lastDiagnosisDate: profile.last_diagnosis_date,
                daysSinceInstall: profile.days_since_installation,
                daysSinceLastDiagnosis: profile.days_since_last_diagnosis,

                // Calculated
                completionRate,
                problematicComponents
            };
        } catch (error) {
            console.error('Error fetching mill analytics:', error);
            throw error;
        }
    },

    async generateMillReport(millId) {
        try {
            const { data, error } = await supabase.functions.invoke('generate-mill-report', {
                body: { millId }
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error generating report:', error);
            throw error;
        }
    },

    /**
     * Create a new social situation for a community
     */
    async createSocialSituation(communityId, situationData) {
        try {
            const { data, error } = await supabase
                .from('community_social_situation')
                .insert([{
                    community_id: communityId,
                    type: situationData.type,
                    title: situationData.title,
                    description: situationData.description,
                    severity: situationData.severity,
                    status: 'active',
                    start_date: situationData.start_date,
                    reported_by_person_id: situationData.reported_by_person_id || null
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating social situation:', error);
            throw error;
        }
    },

    /**
     * Update an existing social situation
     */
    async updateSocialSituation(situationId, updates) {
        try {
            const payload = {
                ...updates,
                updated_at: new Date().toISOString()
            };

            // If resolving, ensure resolution_date is set
            if (updates.status === 'resolved' && !updates.resolution_date) {
                payload.resolution_date = new Date().toISOString().split('T')[0];
            }

            const { data, error } = await supabase
                .from('community_social_situation')
                .update(payload)
                .eq('situation_id', situationId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating social situation:', error);
            throw error;
        }
    },

    /**
     * Get failure history timeline for a mill
     * Combines work order failures + component issues from diagnostics
     */
    async getFailureHistory(millId, filters = {}) {
        try {
            const events = [];

            // 1. Fetch corrective work orders (failures)
            let workOrderQuery = supabase
                .from('work_order')
                .select('work_order_id, created_at, scheduled_date, type, description, status, priority')
                .eq('mill_id', millId)
                .eq('type', 'correctivo')
                .order('created_at', { ascending: false });

            // Apply date filter if provided
            if (filters.startDate) {
                workOrderQuery = workOrderQuery.gte('created_at', filters.startDate);
            }
            if (filters.endDate) {
                workOrderQuery = workOrderQuery.lte('created_at', filters.endDate);
            }

            const { data: workOrders, error: woError } = await workOrderQuery;
            if (woError) throw woError;

            // Transform work orders into timeline events
            workOrders?.forEach(wo => {
                events.push({
                    id: `wo-${wo.work_order_id}`,
                    type: 'work_order',
                    date: wo.created_at,
                    scheduledDate: wo.scheduled_date,
                    title: 'Falla Registrada',
                    description: wo.description || 'Sin descripción',
                    severity: wo.priority || 'media',
                    status: wo.status,
                    metadata: {
                        work_order_id: wo.work_order_id,
                        priority: wo.priority
                    }
                });
            });

            // 2. Fetch component issues from diagnosis visits
            let diagnosisQuery = supabase
                .from('diagnosis_visit')
                .select(`
                    diagnosis_id,
                    visit_date,
                    scheduled_date,
                    type,
                    diagnosis_component(
                        component_id,
                        component_status,
                        observation,
                        component(name)
                    )
                `)
                .eq('mill_id', millId)
                .order('visit_date', { ascending: false });

            if (filters.startDate) {
                diagnosisQuery = diagnosisQuery.gte('visit_date', filters.startDate);
            }
            if (filters.endDate) {
                diagnosisQuery = diagnosisQuery.lte('visit_date', filters.endDate);
            }

            const { data: diagnoses, error: diagError } = await diagnosisQuery;
            if (diagError) throw diagError;

            // Transform diagnosis component issues into timeline events
            diagnoses?.forEach(diagnosis => {
                const problemComponents = diagnosis.diagnosis_component?.filter(dc =>
                    ['DANADO', 'REQUIERE_CAMBIO', 'DESGASTADO'].includes(dc.component_status)
                ) || [];

                problemComponents.forEach(dc => {
                    const severityMap = {
                        'DANADO': 'critica',
                        'REQUIERE_CAMBIO': 'alta',
                        'DESGASTADO': 'media'
                    };

                    events.push({
                        id: `diag-${diagnosis.diagnosis_id}-comp-${dc.component_id}`,
                        type: 'component_issue',
                        date: diagnosis.visit_date || diagnosis.scheduled_date,
                        title: `Problema en ${dc.component?.name || 'Componente'}`,
                        description: dc.observation || `Estado: ${dc.component_status}`,
                        severity: severityMap[dc.component_status] || 'media',
                        status: dc.component_status,
                        metadata: {
                            diagnosis_id: diagnosis.diagnosis_id,
                            component_id: dc.component_id,
                            component_name: dc.component?.name,
                            component_status: dc.component_status,
                            diagnosis_type: diagnosis.type
                        }
                    });
                });
            });

            // 3. Sort all events by date (newest first)
            events.sort((a, b) => new Date(b.date) - new Date(a.date));

            // 4. Apply type filter if provided
            let filteredEvents = events;
            if (filters.type) {
                if (filters.type === 'work_orders') {
                    filteredEvents = events.filter(e => e.type === 'work_order');
                } else if (filters.type === 'component_issues') {
                    filteredEvents = events.filter(e => e.type === 'component_issue');
                }
            }

            // 5. Apply search filter if provided
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                filteredEvents = filteredEvents.filter(e =>
                    e.title.toLowerCase().includes(searchLower) ||
                    e.description.toLowerCase().includes(searchLower) ||
                    e.metadata?.component_name?.toLowerCase().includes(searchLower)
                );
            }

            return {
                events: filteredEvents,
                total: filteredEvents.length,
                workOrderCount: filteredEvents.filter(e => e.type === 'work_order').length,
                componentIssueCount: filteredEvents.filter(e => e.type === 'component_issue').length
            };
        } catch (error) {
            console.error('Error fetching failure history:', error);
            throw error;
        }
    }
};

export default MillService;
