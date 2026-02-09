import { supabase } from './supabase';

export const PumpService = {
    // Get all pumps with current mill location
    async getAllPumps() {
        const { data, error } = await supabase
            .from('pump')
            .select(`
                *,
                mill_pump!pump_id (
                    removed_date,
                    mill!mill_id (
                        mill_id,
                        code,
                        name
                    )
                )
            `)
            .order('serial_number');

        if (error) {
            console.error("Supabase Error (getAllPumps):", error);
            throw error;
        }

        // Flatten and extract current mill info
        return data.map(pump => {
            // Find active installation (no removed_date)
            const activeInstall = pump.mill_pump?.find(i => !i.removed_date);

            return {
                ...pump,
                current_mill_code: activeInstall?.mill?.code || null,
                current_mill_name: activeInstall?.mill?.name || null,
                current_mill_id: activeInstall?.mill?.mill_id || null,
                location: activeInstall ? activeInstall.mill.name : (pump.storage_location || 'Taller')
            };
        });
    },

    // Legacy function for backwards compatibility
    async getPumps() {
        return this.getAllPumps();
    },

    async getPumpById(id) {
        const { data, error } = await supabase
            .from('pump')
            .select('*')
            .eq('pump_id', id)
            .single();
        if (error) throw error;
        return data;
    },

    // Get full history (installations and events)
    async getPumpHistory(pumpId) {
        // 1. Installations from mill_pump (authoritative source for installations)
        const { data: installations, error: installError } = await supabase
            .from('mill_pump')
            .select(`
                *,
                mill (name, code)
            `)
            .eq('pump_id', pumpId)
            .order('installed_date', { ascending: false });

        if (installError) {
            console.error('Error fetching installations:', installError);
        }

        // 2. Other Events from pump_event (excluding installation/removal as they come from mill_pump)
        const { data: events, error: eventsError } = await supabase
            .from('pump_event')
            .select(`
                *,
                mill (name, code),
                work_order (code, type)
            `)
            .eq('pump_id', pumpId)
            .not('event_type', 'in', '(installation,removal,INSTALLATION,REMOVAL)')  // Exclude to prevent duplicates
            .order('event_date', { ascending: false });

        if (eventsError) {
            console.error('Error fetching events:', eventsError);
        }

        // Normalize and combine
        const timeline = [
            // Installations from mill_pump
            ...(installations || []).map(i => ({
                id: `inst-${i.id}`,
                type: 'INSTALLATION',
                date: i.installed_date,
                title: `Instalada en ${i.mill?.name || 'Molino'}`,
                description: i.removed_date ? `Desinstalada el ${new Date(i.removed_date).toLocaleDateString()}` : 'Actualmente instalada',
                subtitle: i.removed_date ? 'Ciclo completado' : 'En operación',
                mill_code: i.mill?.code,
                mill_name: i.mill?.name,
                removal_reason: i.removal_reason
            })),
            // Other events (maintenance, repair, inspection, etc.) from pump_event
            ...(events || []).map(e => ({
                id: `event-${e.event_id}`,
                type: e.event_type?.toUpperCase(),
                date: e.event_date,
                title: this._formatEventTitle(e.event_type),
                description: e.notes || '-',
                subtitle: e.work_order ? `OT: ${e.work_order.code}` : 'Evento registrado',
                mill_code: e.mill?.code,
                mill_name: e.mill?.name
            }))
        ];

        // Sort by date desc
        return timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    _formatEventTitle(eventType) {
        const titles = {
            'MAINTENANCE': 'Mantenimiento',
            'maintenance': 'Mantenimiento',
            'REPAIR': 'Reparación',
            'repair': 'Reparación',
            'INSPECTION': 'Inspección',
            'inspection': 'Inspección',
            'RECEPTION': 'Recepción',
            'reception': 'Recepción'
        };
        return titles[eventType] || eventType;
    },

    // Get performance metrics from pump_performance_metrics view
    async getPerformanceMetrics(pumpId) {
        try {
            // Use maybeSingle() to handle cases with 0 or 1 rows
            // If there are multiple rows (data issue), take the first one
            const { data, error } = await supabase
                .from('pump_performance_metrics')
                .select('*')
                .eq('pump_id', pumpId)
                .limit(1)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching performance metrics:', error);
                throw error;
            }

            // If PGRST116 (multiple rows), fetch all and take first
            if (error?.code === 'PGRST116' || !data) {
                const { data: allData, error: err2 } = await supabase
                    .from('pump_performance_metrics')
                    .select('*')
                    .eq('pump_id', pumpId)
                    .limit(1);

                if (err2) throw err2;
                const firstRow = allData?.[0];

                if (!firstRow) {
                    return this._getDefaultMetrics();
                }

                return this._parseMetrics(firstRow);
            }

            if (!data) {
                return this._getDefaultMetrics();
            }

            return this._parseMetrics(data);
        } catch (error) {
            console.error('Error fetching performance metrics:', error);
            return this._getDefaultMetrics();
        }
    },

    _parseMetrics(data) {
        return {
            totalInstallations: data?.total_installations || 0,
            currentInstallationDays: data?.current_installation_days ? Math.floor(parseFloat(data.current_installation_days)) : 0,
            totalActiveDays: data?.total_active_days ? Math.floor(parseFloat(data.total_active_days)) : 0,
            relatedWorkOrders: data?.related_work_orders || 0,
            totalEvents: data?.total_events || 0,
            ageDays: data?.age_days ? Math.floor(parseFloat(data.age_days)) : 0,
            isInstalled: data?.is_installed || false,
            isInStorage: data?.is_in_storage || false,
            isUnderRepair: data?.is_under_repair || false,
            currentMill: data?.current_mill_name || null,
            currentMillCode: data?.current_mill_code || null
        };
    },

    _getDefaultMetrics() {
        return {
            totalInstallations: 0,
            currentInstallationDays: 0,
            totalActiveDays: 0,
            relatedWorkOrders: 0,
            totalEvents: 0,
            ageDays: 0,
            isInstalled: false,
            isInStorage: false,
            isUnderRepair: false,
            currentMill: null,
            currentMillCode: null
        };
    },

    // Get work orders related to this pump
    async getRelatedWorkOrders(pumpId) {
        try {
            const { data, error } = await supabase
                .from('work_order')
                .select(`
                    *,
                    mill (code, name),
                    crew (name)
                `)
                .or(`pump_id_to_install.eq.${pumpId},pump_id_to_remove.eq.${pumpId}`)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map(wo => ({
                ...wo,
                mill_code: wo.mill?.code,
                mill_name: wo.mill?.name,
                crew_name: wo.crew?.name
            }));
        } catch (error) {
            console.error('Error fetching related work orders:', error);
            return [];
        }
    },

    // Get current installation info
    async getCurrentInstallation(pumpId) {
        try {
            const { data, error } = await supabase
                .from('mill_pump')
                .select(`
                    *,
                    mill (mill_id, code, name, status, community_name),
                    work_order (work_order_id, code, type)
                `)
                .eq('pump_id', pumpId)
                .is('removed_date', null)
                .order('installed_date', { ascending: false })
                .limit(1);

            if (error) {
                console.error('Error fetching current installation:', error);
                return null;
            }

            return data?.[0] || null;
        } catch (error) {
            console.error('Error fetching current installation:', error);
            return null;
        }
    },

    // Get analytics data for a pump
    async getPumpAnalytics(pumpId) {
        try {
            const metrics = await this.getPerformanceMetrics(pumpId);
            const workOrders = await this.getRelatedWorkOrders(pumpId);
            const history = await this.getPumpHistory(pumpId);

            // Calculate uptime percentage (active days vs total age)
            const uptimePercentage = metrics.ageDays > 0
                ? Math.round((metrics.totalActiveDays / metrics.ageDays) * 100)
                : 0;

            // Average installation duration
            const installations = history.filter(h => h.type === 'INSTALLATION');
            const avgInstallationDays = installations.length > 0
                ? Math.round(metrics.totalActiveDays / installations.length)
                : 0;

            return {
                ...metrics,
                uptimePercentage,
                avgInstallationDays,
                workOrderStats: {
                    total: workOrders.length,
                    completed: workOrders.filter(wo => wo.status === 'COMPLETED').length,
                    pending: workOrders.filter(wo => wo.status === 'PENDING').length,
                    inProgress: workOrders.filter(wo => wo.status === 'IN_PROGRESS').length
                },
                eventStats: {
                    total: history.length,
                    installations: installations.length,
                    removals: history.filter(h => h.subtitle === 'Ciclo completado').length
                }
            };
        } catch (error) {
            console.error('Error fetching pump analytics:', error);
            throw error;
        }
    },

    // CRUD Operations
    async createPump(pumpData) {
        const { data, error } = await supabase
            .from('pump')
            .insert([pumpData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updatePump(pumpId, pumpData) {
        const { data, error } = await supabase
            .from('pump')
            .update(pumpData)
            .eq('pump_id', pumpId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deletePump(pumpId) {
        // Note: Check for active installations before deleting
        // Or use CASCADE in foreign key constraints
        const { error } = await supabase
            .from('pump')
            .delete()
            .eq('pump_id', pumpId);

        if (error) throw error;
        return true;
    }
};
