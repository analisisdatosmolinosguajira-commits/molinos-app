import { supabase } from './supabase';

export const DashboardService = {
    /**
     * Core KPIs — all queries run in parallel for speed
     */
    async getStats(year = 2026) {
        const startOfYear = year === 'ALL' ? '2000-01-01T00:00:00' : `${year}-01-01T00:00:00`;
        const endOfYear = year === 'ALL' ? '2100-12-31T23:59:59' : `${year}-12-31T23:59:59`;

        const [
            { count: totalMolinos },
            { count: molinosOperativos },
            { count: molinosInactivos },
            { count: otsAbiertas },
            { count: diagnosticosPendientes },
            { count: concertacionesActivas },
            { count: comunidadesImpactadas },
            { count: alertasCriticas },
            { count: bombasInstaladas },
            { count: molinosConInfo },
            { count: molinosSinInfo },
        ] = await Promise.all([
            supabase.from('mill').select('*', { count: 'exact', head: true }),
            supabase.from('mill').select('*', { count: 'exact', head: true }).eq('status', 'OPERATIONAL'),
            supabase.from('mill').select('*', { count: 'exact', head: true }).neq('status', 'OPERATIONAL'),
            supabase.from('work_order').select('*', { count: 'exact', head: true }).eq('status', 'PENDING').gte('start_date', startOfYear).lte('start_date', endOfYear),
            supabase.from('diagnosis').select('*', { count: 'exact', head: true }).in('status', ['SCHEDULED', 'scheduled', 'PENDING', 'pending']).gte('diagnosis_date', startOfYear).lte('diagnosis_date', endOfYear),
            supabase.from('community_concertation').select('*', { count: 'exact', head: true }).in('status', ['ACTIVA', 'activa', 'PENDIENTE', 'pendiente', 'en_proceso']).gte('meeting_date', startOfYear).lte('meeting_date', endOfYear),
            supabase.from('community').select('*', { count: 'exact', head: true }),
            supabase.from('work_order').select('*', { count: 'exact', head: true }).in('priority', ['CRITICAL', 'HIGH']).gte('start_date', startOfYear).lte('start_date', endOfYear),
            supabase.from('mill_pump').select('*', { count: 'exact', head: true }).is('removed_date', null),
            // Mills WITH info (exclude WITHOUT_INFO)
            supabase.from('mill').select('*', { count: 'exact', head: true }).neq('status', 'WITHOUT_INFO'),
            // Mills WITHOUT info
            supabase.from('mill').select('*', { count: 'exact', head: true }).eq('status', 'WITHOUT_INFO'),
        ]);

        let metaGoal = 280; // Default for 2026 and others
        if (year === 2025) metaGoal = 300;
        else if (year === 'ALL') metaGoal = 500;

        const { data: metaData } = await supabase
            .from('work_order')
            .select('work_order_id')
            .eq('status', 'COMPLETED')
            .eq('is_reintervention', false)
            .gte('start_date', startOfYear)
            .lte('start_date', endOfYear);

        const metaYearCount = metaData?.length || 0;

        return {
            totalMolinos: totalMolinos || 0,
            molinosOperativos: molinosOperativos || 0,
            molinosInactivos: molinosInactivos || 0,
            molinosConInfo: molinosConInfo || 0,
            molinosSinInfo: molinosSinInfo || 0,
            otsAbiertas: otsAbiertas || 0,
            diagnosticosPendientes: diagnosticosPendientes || 0,
            concertacionesActivas: concertacionesActivas || 0,
            comunidadesImpactadas: comunidadesImpactadas || 0,
            alertasCriticas: alertasCriticas || 0,
            bombasInstaladas: bombasInstaladas || 0,
            metaYear: metaYearCount,
            metaYearGoal: metaGoal,
        };
    },

    /**
     * Critical alerts — high/critical work orders
     */
    async getRecentAlerts() {
        const { data, error } = await supabase
            .from('work_order')
            .select('work_order_id, priority, description, created_at, status, mill(code)')
            .or('priority.eq.CRITICAL,priority.eq.HIGH')
            .order('created_at', { ascending: false })
            .limit(6);

        if (error) throw error;

        return (data || []).map(wo => ({
            id: wo.work_order_id,
            mill_code: wo.mill?.code || 'S/C',
            priority: wo.priority,
            status: wo.status,
            description: wo.description,
            date: new Date(wo.created_at).toLocaleDateString('es-CO'),
            timeAgo: getTimeAgo(wo.created_at),
        }));
    },

    /**
     * Mills for map — with geolocation data
     */
    async getMapMills(year = 2026) {
        const startOfYear = year === 'ALL' ? '2000-01-01T00:00:00' : `${year}-01-01T00:00:00`;
        const endOfYear = year === 'ALL' ? '2100-12-31T23:59:59' : `${year}-12-31T23:59:59`;

        // Fetch mills + community social data, and work orders for the selected year
        const [millsRes, otsRes] = await Promise.all([
            supabase
                .from('mill')
                .select(`
                    mill_id, code, community_name, status, latitude, longitude, installation_date,
                    community_id,
                    community!fk_mill_community ( number_of_families, number_of_inhabitants, number_of_children, main_productive_activity ),
                    installed_pump:mill_pump (
                        id,
                        removed_date,
                        pump ( serial_number, model )
                    )
                `),
            // All work orders for the year to calculate interventions/reinterventions
            supabase
                .from('work_order')
                .select('mill_id, is_reintervention')
                .eq('status', 'COMPLETED')
                .gte('start_date', startOfYear)
                .lte('start_date', endOfYear),
        ]);

        if (millsRes.error) throw millsRes.error;

        // Build lookup map for interventions
        const otStats = {};
        (otsRes.data || []).forEach(wo => {
            if (wo.mill_id) {
                if (!otStats[wo.mill_id]) otStats[wo.mill_id] = { interventions: 0, reinterventions: 0 };
                if (wo.is_reintervention) {
                    otStats[wo.mill_id].reinterventions++;
                } else {
                    otStats[wo.mill_id].interventions++;
                }
            }
        });

        return (millsRes.data || []).map(m => {
            const activePump = m.installed_pump?.find(mp => !mp.removed_date);
            const stats = otStats[m.mill_id] || { interventions: 0, reinterventions: 0 };
            
            // Handle array or object from PostgREST
            const cData = Array.isArray(m.community) ? m.community[0] : m.community;

            return {
                ...m,
                community: m.community_name,
                social: cData || {},
                has_pump: !!activePump,
                pump_model: activePump?.pump?.model || null,
                hasIntervention: stats.interventions > 0,
                hasReintervention: stats.reinterventions > 0,
                interventionsCount: stats.interventions,
                reinterventionsCount: stats.reinterventions,
            };
        });
    },

    /**
     * Activity feed — recent cross-entity events (last 7 days)
     */
    async getActivityFeed() {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const since = sevenDaysAgo.toISOString();

        const [workOrders, diagnoses, concertations] = await Promise.all([
            supabase
                .from('work_order')
                .select('work_order_id, code, description, status, priority, created_at, mill(code)')
                .gte('created_at', since)
                .order('created_at', { ascending: false })
                .limit(5),
            supabase
                .from('diagnosis')
                .select('diagnosis_id, diagnosis_type, status, created_at, mill(code)')
                .gte('created_at', since)
                .order('created_at', { ascending: false })
                .limit(5),
            supabase
                .from('community_concertation')
                .select('concertation_id, status, meeting_date, community(name)')
                .gte('meeting_date', since)
                .order('meeting_date', { ascending: false })
                .limit(5)
                .then(res => res)
                .catch(() => ({ data: [], error: null })),
        ]);

        const activities = [];

        (workOrders.data || []).forEach(wo => {
            activities.push({
                id: `wo-${wo.work_order_id}`,
                type: 'work_order',
                title: wo.description || `OT ${wo.code || wo.work_order_id}`,
                subtitle: wo.mill?.code || 'Sin molino',
                status: wo.status,
                priority: wo.priority,
                date: wo.created_at,
                timeAgo: getTimeAgo(wo.created_at),
            });
        });

        (diagnoses.data || []).forEach(d => {
            activities.push({
                id: `diag-${d.diagnosis_id}`,
                type: 'diagnosis',
                title: `Diagnóstico ${d.diagnosis_type || ''}`,
                subtitle: d.mill?.code || 'Sin molino',
                status: d.status,
                date: d.created_at,
                timeAgo: getTimeAgo(d.created_at),
            });
        });

        (concertations.data || []).forEach(c => {
            activities.push({
                id: `conc-${c.concertation_id}`,
                type: 'concertation',
                title: `Concertación`,
                subtitle: c.community?.name || 'Sin comunidad',
                status: c.status,
                date: c.meeting_date,
                timeAgo: getTimeAgo(c.meeting_date),
            });
        });

        // Sort by date descending
        return activities.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    },

    async getFailureStats(year = 2026) {
        let q1 = supabase.from('work_order').select('mill_id').eq('status', 'COMPLETED').eq('is_reintervention', false);
        if (year !== 'ALL') {
            q1 = q1.gte('start_date', `${year}-01-01T00:00:00`).lte('start_date', `${year}-12-31T23:59:59`);
        }
        const { data: baseInterventions, error: err1 } = await q1;
            
        if (err1) throw err1;

        const totalIntervenedMills = baseInterventions.length;

        let q2 = supabase.from('work_order').select('mill_id').eq('status', 'COMPLETED').eq('is_reintervention', true);
        if (year !== 'ALL') {
            q2 = q2.gte('start_date', `${year}-01-01T00:00:00`).lte('start_date', `${year}-12-31T23:59:59`);
        }
        const { data: reinterventions, error: err2 } = await q2;
            
        if (err2) throw err2;

        const failedMills = reinterventions.length;

        if (totalIntervenedMills === 0) {
            return { totalIntervenedMills: 0, failedMills, failureRate: 0 };
        }

        const failureRate = (failedMills / totalIntervenedMills) * 100;

        return { totalIntervenedMills, failedMills, failureRate: Math.round(failureRate * 10) / 10 };
    },

    /**
     * Chart work orders for the selected year
     */
    async getChartWorkOrders(year = 2026) {
        let q = supabase.from('work_order').select('start_date, status, is_reintervention');
        
        if (year !== 'ALL') {
            const startOfYear = `${year}-01-01T00:00:00`;
            const endOfYear = `${year}-12-31T23:59:59`;
            q = q.gte('start_date', startOfYear).lte('start_date', endOfYear);
        }
        
        const { data, error } = await q;

        if (error) throw error;

        if (year === 'ALL') {
            const years = {};
            (data || []).forEach(wo => {
                if (!wo.start_date || wo.status !== 'COMPLETED') return;
                const y = wo.start_date.substring(0, 4);
                if (!years[y]) years[y] = { month: y, total: 0, intervention: 0, reintervention: 0 };
                
                years[y].total++;
                if (wo.is_reintervention) years[y].reintervention++;
                else years[y].intervention++;
            });
            return {
                monthlyData: Object.keys(years).sort().map(k => years[k]),
                rawOrders: data || []
            };
        }

        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const months = {};

        // Initialize 12 months
        for (let i = 0; i < 12; i++) {
            const key = `${year}-${String(i + 1).padStart(2, '0')}`;
            months[key] = { month: monthNames[i], total: 0, intervention: 0, reintervention: 0 };
        }

        (data || []).forEach(wo => {
            if (!wo.start_date || wo.status !== 'COMPLETED') return;
            const monthStr = wo.start_date.substring(5, 7);
            const key = `${year}-${monthStr}`;
            if (months[key]) {
                months[key].total++;
                if (wo.is_reintervention) {
                    months[key].reintervention++;
                } else {
                    months[key].intervention++;
                }
            }
        });

        return {
            monthlyData: Object.keys(months).sort().map(k => months[k]),
            rawOrders: data || []
        };
    },
};

// Utility: human-readable time ago string
function getTimeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}
