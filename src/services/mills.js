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

    // 1. Life Record Aggregation
    async getLifeRecord(millId) {
        // 1. Fetch Work Orders
        const { data: workOrders } = await supabase
            .from('work_order')
            .select('*')
            .eq('mill_id', millId);

        // 2. Fetch Failure Reports
        const { data: failures } = await supabase
            .from('failure_report')
            .select('*')
            .eq('mill_id', millId);

        // 3. Fetch Pump History (Installations/Removals)
        const { data: pumpEvents } = await supabase
            .from('mill_pump')
            .select('*, pump(model, serial_number)')
            .eq('mill_id', millId);

        // Normalize Work Orders
        const woEvents = (workOrders || []).map(wo => ({
            id: `wo-${wo.work_order_id}`,
            date: wo.created_at,
            type: 'WORK_ORDER',
            priority: wo.priority,
            status: wo.status,
            title: wo.description || `Orden #${wo.code || wo.work_order_id}`,
            subtitle: `OT ${wo.type} - ${wo.status}`
        }));

        // Normalize Failure Reports
        const failureEvents = (failures || []).map(f => ({
            id: `fail-${f.report_id}`,
            date: f.created_at,
            type: 'FAILURE_REPORT', // Using a distinct type
            priority: f.priority,
            status: f.status,
            title: `Reporte de Falla: ${f.reported_by_name || 'Anónimo'}`,
            subtitle: f.description ? f.description.substring(0, 50) + (f.description.length > 50 ? '...' : '') : 'Sin descripción'
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

        const allEvents = [...woEvents, ...failureEvents, ...historyEvents];

        // Sort by date descending
        return allEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    // 2. Reliability Metrics
    async getReliabilityMetrics(millId) {
        // Simple KPIs based on existing data
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const { data: failures } = await supabase
            .from('work_order')
            .select('created_at')
            .eq('mill_id', millId)
            .eq('type', 'correctivo') // Assuming 'correctivo' tracks failures
            .gte('created_at', oneYearAgo.toISOString());

        const { data: lastIntervention } = await supabase
            .from('work_order')
            .select('created_at')
            .eq('mill_id', millId)
            .eq('status', 'COMPLETED')
            .order('created_at', { ascending: false })
            .limit(1);

        return {
            failuresLastYear: failures?.length || 0,
            daysSinceLastIntervention: lastIntervention?.[0]
                ? Math.floor((new Date() - new Date(lastIntervention[0].created_at)) / (1000 * 60 * 60 * 24))
                : null
        };
    },

    // 3. Social Status
    async getSocialStatus(millId) {
        // Table community_concertation doesn't exist yet, return default
        return {
            status: 'PENDIENTE',
            count: 0
        };
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
    }
};
