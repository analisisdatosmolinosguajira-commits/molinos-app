import { supabase } from './supabase';

export const MillService = {
    async getMills() {
        const { data, error } = await supabase
            .from('mill')
            .select('*')
            .order('name');
        if (error) throw error;
        return data;
    },

    async getMillById(id) {
        const { data, error } = await supabase
            .from('mill')
            .select(`
                *,
                mill_pump (
                    *,
                    status
                )
            `)
            .eq('mill_id', id)
            .single();
        if (error) throw error;
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
        const { data, error } = await supabase
            .from('mill_has_component')
            .select(`
                *,
                mill_component (
                    name
                )
            `)
            .eq('mill_id', millId);
        if (error) throw error;
        return data;
    },

    // 1. Life Record Aggregation
    async getLifeRecord(millId) {
        // Fetch disparate events in parallel
        const [workOrders, diagnoses, pumpEvents] = await Promise.all([
            supabase.from('work_order').select('*').eq('mill_id', millId),
            supabase.from('diagnosis_visit').select('*').eq('mill_id', millId),
            supabase.from('pump_event').select('*').eq('mill_id', millId)
        ]);

        // Normalize and merge
        const events = [
            ...(workOrders.data || []).map(wo => ({
                id: `wo-${wo.work_order_id}`,
                date: wo.created_at,
                type: 'WORK_ORDER',
                priority: wo.priority,
                status: wo.status,
                title: wo.description || `Orden #${wo.code || wo.work_order_id}`,
                subtitle: `OT ${wo.type} - ${wo.status}`
            })),
            ...(diagnoses.data || []).map(dia => ({
                id: `dia-${dia.diagnosis_id}`,
                date: dia.scheduled_date || dia.created_at, // Access available date
                type: 'DIAGNOSIS',
                status: dia.status,
                title: `Diagnóstico ${dia.status}`,
                subtitle: dia.notes
            })),
            ...(pumpEvents.data || []).map(pe => ({
                id: `pe-${pe.event_id}`,
                date: pe.event_date,
                type: 'PUMP_EVENT',
                title: `Evento de Bomba: ${pe.event_type}`,
                subtitle: pe.notes
            }))
        ];

        // Sort by date descending
        return events.sort((a, b) => new Date(b.date) - new Date(a.date));
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
        const mill = await this.getMillById(millId);
        if (!mill || !mill.community_name) return { status: 'UNKNOWN', count: 0 };

        const { data: community } = await supabase
            .from('community')
            .select('community_id')
            .eq('name', mill.community_name)
            .single();

        if (!community) return { status: 'UNKNOWN', count: 0 };

        const { data: concertations } = await supabase
            .from('community_concertation')
            .select('status')
            .eq('community_id', community.community_id);

        const active = concertations?.some(c => c.status === 'ACTIVA');

        return {
            status: active ? 'CONCERTADO' : 'PENDIENTE',
            count: concertations?.length || 0
        };
    }
};
