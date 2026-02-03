import { supabase } from './supabase';

export const DashboardService = {
    async getStats() {
        // Work Orders: 'PENDING' (from DB check)
        const { count: otsAbiertas } = await supabase
            .from('work_order')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'PENDING');

        // Diagnosis Visits: Check 'scheduled' or 'pendiente'
        // Since we didn't see the exact value in the previous query, being safe with multiple checks or assuming standard
        const { count: diagnosticosPendientes } = await supabase
            .from('diagnosis_visit')
            .select('*', { count: 'exact', head: true })
            .in('status', ['SCHEDULED', 'scheduled', 'PENDING', 'pending']);

        // Concertations: 'pendiente' (from DB check, not 'ACTIVA')
        // Also checking 'activa' just in case of mixed data
        const { count: concertacionesActivas } = await supabase
            .from('community_concertation')
            .select('*', { count: 'exact', head: true })
            .in('status', ['ACTIVA', 'activa', 'PENDIENTE', 'pendiente']);

        // Mills: 'OPERATIONAL' (from DB check)
        const { count: molinosOperativos } = await supabase
            .from('mill')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'OPERATIONAL');

        // Mills Inactive: Anything NOT OPERATIONAL
        const { count: molinosInactivos } = await supabase
            .from('mill')
            .select('*', { count: 'exact', head: true })
            .neq('status', 'OPERATIONAL');

        const { count: comunidadesImpactadas } = await supabase
            .from('community')
            .select('*', { count: 'exact', head: true });

        const { count: alertasCriticas } = await supabase
            .from('work_order')
            .select('*', { count: 'exact', head: true })
            .in('priority', ['CRITICAL', 'HIGH']); // Including HIGH for visibility

        return {
            otsAbiertas: otsAbiertas || 0,
            diagnosticosPendientes: diagnosticosPendientes || 0,
            concertacionesActivas: concertacionesActivas || 0,
            molinosOperativos: molinosOperativos || 0,
            molinosInactivos: molinosInactivos || 0,
            comunidadesImpactadas: comunidadesImpactadas || 0,
            alertasCriticas: alertasCriticas || 0
        };
    },

    async getRecentAlerts() {
        const { data, error } = await supabase
            .from('work_order')
            .select('work_order_id, priority, description, created_at, mill(code)')
            .or('priority.eq.CRITICAL,priority.eq.HIGH')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        return data.map(wo => ({
            id: wo.work_order_id,
            mill_code: wo.mill?.code || 'S/C',
            priority: wo.priority,
            description: wo.description,
            date: new Date(wo.created_at).toLocaleDateString()
        }));
    },

    // Get mills for the map
    async getMapMills() {
        const { data, error } = await supabase
            .from('mill')
            .select('mill_id, code, community_name, status, latitude, longitude');
        if (error) throw error;
        return data.map(m => ({
            ...m,
            community: m.community_name // map prop mismatch fix
        }));
    }
};
