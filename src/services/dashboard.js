import { supabase } from './supabase';

export const DashboardService = {
    /**
     * Core KPIs — all queries run in parallel for speed
     */
    async getStats() {
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
        ] = await Promise.all([
            supabase.from('mill').select('*', { count: 'exact', head: true }),
            supabase.from('mill').select('*', { count: 'exact', head: true }).eq('status', 'OPERATIONAL'),
            supabase.from('mill').select('*', { count: 'exact', head: true }).neq('status', 'OPERATIONAL'),
            supabase.from('work_order').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
            supabase.from('diagnosis').select('*', { count: 'exact', head: true }).in('status', ['SCHEDULED', 'scheduled', 'PENDING', 'pending']),
            supabase.from('community_concertation').select('*', { count: 'exact', head: true }).in('status', ['ACTIVA', 'activa', 'PENDIENTE', 'pendiente', 'en_proceso']),
            supabase.from('community').select('*', { count: 'exact', head: true }),
            supabase.from('work_order').select('*', { count: 'exact', head: true }).in('priority', ['CRITICAL', 'HIGH']),
            supabase.from('mill_pump').select('*', { count: 'exact', head: true }).is('removed_date', null),
        ]);

        return {
            totalMolinos: totalMolinos || 0,
            molinosOperativos: molinosOperativos || 0,
            molinosInactivos: molinosInactivos || 0,
            otsAbiertas: otsAbiertas || 0,
            diagnosticosPendientes: diagnosticosPendientes || 0,
            concertacionesActivas: concertacionesActivas || 0,
            comunidadesImpactadas: comunidadesImpactadas || 0,
            alertasCriticas: alertasCriticas || 0,
            bombasInstaladas: bombasInstaladas || 0,
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
    async getMapMills() {
        // Fetch mills + contextual data in parallel
        const [millsRes, otsRes, diagRes, concRes] = await Promise.all([
            supabase
                .from('mill')
                .select(`
                    mill_id, code, community_name, status, latitude, longitude, installation_date,
                    community_id,
                    installed_pump:mill_pump (
                        id,
                        removed_date,
                        pump ( serial_number, model )
                    )
                `),
            // Active work orders per mill
            supabase
                .from('work_order')
                .select('mill_id')
                .in('status', ['PENDING', 'IN_PROGRESS', 'pending', 'in_progress']),
            // Pending diagnoses per mill
            supabase
                .from('diagnosis')
                .select('mill_id')
                .in('status', ['SCHEDULED', 'scheduled', 'PENDING', 'pending']),
            // Active concertations per community
            supabase
                .from('community_concertation')
                .select('community_id')
                .in('status', ['ACTIVA', 'activa', 'PENDIENTE', 'pendiente', 'en_proceso']),
        ]);

        if (millsRes.error) throw millsRes.error;

        // Build lookup maps: mill_id -> count
        const otCounts = {};
        (otsRes.data || []).forEach(wo => {
            if (wo.mill_id) otCounts[wo.mill_id] = (otCounts[wo.mill_id] || 0) + 1;
        });

        const diagCounts = {};
        (diagRes.data || []).forEach(d => {
            if (d.mill_id) diagCounts[d.mill_id] = (diagCounts[d.mill_id] || 0) + 1;
        });

        // Concertations are per community, map community_id -> count
        const concCommunities = new Set();
        (concRes.data || []).forEach(c => {
            if (c.community_id) concCommunities.add(c.community_id);
        });

        return (millsRes.data || []).map(m => {
            const activePump = m.installed_pump?.find(mp => !mp.removed_date);
            return {
                ...m,
                community: m.community_name,
                has_pump: !!activePump,
                pump_model: activePump?.pump?.model || null,
                activeOTs: otCounts[m.mill_id] || 0,
                pendingDiagnosis: diagCounts[m.mill_id] || 0,
                activeConcertation: m.community_id ? concCommunities.has(m.community_id) : false,
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

    /**
     * Chart data — mill status distribution for donut chart
     */
    async getMillStatusDistribution() {
        const { data, error } = await supabase
            .from('mill')
            .select('status');
        if (error) throw error;

        const counts = {};
        (data || []).forEach(m => {
            const s = m.status || 'SIN_ESTADO';
            counts[s] = (counts[s] || 0) + 1;
        });

        const STATUS_LABELS = {
            OPERATIONAL: 'Operativo',
            MAINTENANCE: 'Mantenimiento',
            INACTIVE: 'Inactivo',
            INSTALLED: 'Instalado',
            SIN_ESTADO: 'Sin Estado',
        };

        const STATUS_CHART_COLORS = {
            OPERATIONAL: '#22c55e',
            MAINTENANCE: '#f59e0b',
            INACTIVE: '#ef4444',
            INSTALLED: '#3b82f6',
            SIN_ESTADO: '#94a3b8',
        };

        return Object.entries(counts).map(([status, count]) => ({
            name: STATUS_LABELS[status] || status,
            value: count,
            fill: STATUS_CHART_COLORS[status] || '#94a3b8',
        }));
    },

    /**
     * Monthly work orders for the last 6 months (bar chart data)
     */
    async getMonthlyWorkOrders() {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const { data, error } = await supabase
            .from('work_order')
            .select('created_at, status')
            .gte('created_at', sixMonthsAgo.toISOString());

        if (error) throw error;

        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const months = {};

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            months[key] = { month: monthNames[d.getMonth()], total: 0, completed: 0, pending: 0 };
        }

        (data || []).forEach(wo => {
            const d = new Date(wo.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (months[key]) {
                months[key].total++;
                if (wo.status === 'COMPLETED' || wo.status === 'completed') {
                    months[key].completed++;
                } else {
                    months[key].pending++;
                }
            }
        });

        return Object.values(months);
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
