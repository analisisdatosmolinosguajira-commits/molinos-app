import { supabase } from './supabase';

// ═══════════════════════════════════════════════════════════
// REPORTS SERVICE — Goals + Report Data
// ═══════════════════════════════════════════════════════════

// Helper: date range for a given period
function getDateRange(period) {
    const now = new Date();
    let start;
    switch (period) {
        case 'week': {
            start = new Date(now);
            start.setDate(now.getDate() - now.getDay());
            start.setHours(0, 0, 0, 0);
            break;
        }
        case 'month': {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        }
        case 'quarter': {
            const q = Math.floor(now.getMonth() / 3) * 3;
            start = new Date(now.getFullYear(), q, 1);
            break;
        }
        case 'year': {
            start = new Date(now.getFullYear(), 0, 1);
            break;
        }
        default:
            start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return {
        startDate: start.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
    };
}

export const ReportsService = {

    // ─── GOALS CRUD ───────────────────────────────────────
    async getGoals() {
        const { data, error } = await supabase
            .from('project_goal')
            .select('*')
            .order('goal_id');
        if (error) { console.warn('[Reports] getGoals:', error.message); return []; }
        return data || [];
    },

    async createGoal(goal) {
        const { data, error } = await supabase
            .from('project_goal')
            .insert({
                name: goal.name,
                metric_key: goal.metric_key,
                target_value: goal.target_value,
                period: goal.period || 'month',
                active: true,
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateGoal(goalId, updates) {
        const { data, error } = await supabase
            .from('project_goal')
            .update(updates)
            .eq('goal_id', goalId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteGoal(goalId) {
        const { error } = await supabase
            .from('project_goal')
            .delete()
            .eq('goal_id', goalId);
        if (error) throw error;
    },

    // ─── METRIC QUERIES ───────────────────────────────────
    // Returns { [metric_key]: currentValue }
    async getGoalMetrics(period) {
        const { startDate, endDate } = getDateRange(period);
        const metrics = {};

        // 1. New interventions (first WO per mill — install type)
        const { count: newInterventions } = await supabase
            .from('work_order')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59');
        metrics.new_interventions = newInterventions || 0;

        // 2. Completed work orders
        const { count: completedWOs } = await supabase
            .from('work_order')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed')
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59');
        metrics.completed_work_orders = completedWOs || 0;

        // 3. Pieces fabricated (sum of quantity_completed from mo_process)
        const { data: processes } = await supabase
            .from('mo_process')
            .select('quantity_completed, piece_id')
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59');
        const totalPieces = (processes || []).reduce((sum, p) => sum + (p.quantity_completed || 0), 0);
        metrics.pieces_fabricated = totalPieces;

        // 4. Distinct piece types
        const distinctPieces = new Set((processes || []).filter(p => p.quantity_completed > 0).map(p => p.piece_id));
        metrics.distinct_piece_types = distinctPieces.size;

        // 5. Pumps fabricated (manufacturing orders of type pump_fabrication, completed)
        const { count: pumpsFab } = await supabase
            .from('manufacturing_order')
            .select('*', { count: 'exact', head: true })
            .eq('mo_type', 'pump_fabrication')
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59');
        metrics.pumps_fabricated = pumpsFab || 0;

        // 6. Concertations
        const { count: concertations } = await supabase
            .from('community_concertation')
            .select('*', { count: 'exact', head: true })
            .gte('meeting_date', startDate)
            .lte('meeting_date', endDate);
        metrics.concertations = concertations || 0;

        // 7. Diagnoses
        const { count: diagnoses } = await supabase
            .from('diagnosis')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59');
        metrics.diagnoses = diagnoses || 0;

        // 8. Journeys (movements/jornadas)
        const { count: journeys } = await supabase
            .from('movement')
            .select('*', { count: 'exact', head: true })
            .gte('start_date', startDate)
            .lte('start_date', endDate + 'T23:59:59');
        metrics.journeys = journeys || 0;

        return metrics;
    },

    // ─── REPORT DATA ──────────────────────────────────────
    async getReportData(startDate, endDate) {
        const endFull = endDate + 'T23:59:59';

        // Run all queries in parallel
        const [
            woRes, diagRes, concRes, moRes, processRes, millRes, pumpMoRes
        ] = await Promise.all([
            // Work orders
            supabase.from('work_order')
                .select('work_order_id, code, status, priority, created_at, mill_id')
                .gte('created_at', startDate)
                .lte('created_at', endFull)
                .order('created_at'),
            // Diagnoses
            supabase.from('diagnosis')
                .select('diagnosis_id, created_at, mill_id')
                .gte('created_at', startDate)
                .lte('created_at', endFull),
            // Concertations with community
            supabase.from('community_concertation')
                .select('concertation_id, meeting_date, community(name)')
                .gte('meeting_date', startDate)
                .lte('meeting_date', endDate),
            // Manufacturing orders (piece type)
            supabase.from('manufacturing_order')
                .select('mo_id, status, mo_type, created_at, quantity_completed, piece:piece_id(name, code)')
                .not('mo_type', 'in', '(pump_fabrication,pump_repair)')
                .gte('created_at', startDate)
                .lte('created_at', endFull),
            // MO Processes (piece breakdown)
            supabase.from('mo_process')
                .select('id, piece_id, quantity_planned, quantity_completed, piece:piece_id(piece_id, name, code)')
                .gte('created_at', startDate)
                .lte('created_at', endFull),
            // Mills (for status distribution)
            supabase.from('mill')
                .select('mill_id, status, name'),
            // Pump manufacturing orders
            supabase.from('manufacturing_order')
                .select('mo_id, status, mo_type, created_at, quantity_completed, pump:pump_id(serial_number, model), pump_model_id')
                .in('mo_type', ['pump_fabrication', 'pump_repair'])
                .gte('created_at', startDate)
                .lte('created_at', endFull),
        ]);

        const workOrders = woRes.data || [];
        const diagnoses = diagRes.data || [];
        const concertations_data = concRes.data || [];
        const mfgOrders = moRes.data || [];
        const processes = processRes.data || [];
        const mills = millRes.data || [];
        const pumpMOs = pumpMoRes.data || [];

        // ── KPIs ──
        const kpis = {
            totalWOs: workOrders.length,
            completedWOs: workOrders.filter(w => w.status === 'completed').length,
            totalDiagnoses: diagnoses.length,
            totalConcertations: concertations_data.length,
            totalMOs: mfgOrders.length + pumpMOs.length,
            activeMills: mills.filter(m => m.status === 'operativo').length,
            totalMills: mills.length,
        };

        // ── WOs by month ──
        const woByMonth = {};
        workOrders.forEach(w => {
            const m = w.created_at?.substring(0, 7); // YYYY-MM
            if (m) woByMonth[m] = (woByMonth[m] || 0) + 1;
        });

        // ── WOs by status ──
        const woByStatus = {};
        workOrders.forEach(w => {
            woByStatus[w.status] = (woByStatus[w.status] || 0) + 1;
        });

        // ── Diagnoses by month ──
        const diagByMonth = {};
        diagnoses.forEach(d => {
            const m = d.created_at?.substring(0, 7);
            if (m) diagByMonth[m] = (diagByMonth[m] || 0) + 1;
        });

        // ── Concertations by community ──
        const concByCommunity = {};
        concertations_data.forEach(c => {
            const name = c.community?.name || 'Sin comunidad';
            concByCommunity[name] = (concByCommunity[name] || 0) + 1;
        });

        // ── Piece breakdown (from mo_process) ──
        const pieceMap = {};
        processes.forEach(p => {
            const name = p.piece?.name || 'Desconocida';
            const code = p.piece?.code || '';
            const key = p.piece_id || name;
            if (!pieceMap[key]) {
                pieceMap[key] = { name, code, planned: 0, completed: 0, pieceId: p.piece_id };
            }
            pieceMap[key].planned += p.quantity_planned || 0;
            pieceMap[key].completed += p.quantity_completed || 0;
        });

        // ── Pump MOs breakdown ──
        const pumpBreakdown = {
            fabricated: pumpMOs.filter(p => p.mo_type === 'pump_fabrication').length,
            repaired: pumpMOs.filter(p => p.mo_type === 'pump_repair').length,
            completed: pumpMOs.filter(p => p.status === 'completada').length,
            total: pumpMOs.length,
        };

        // ── Mill status distribution ──
        const millByStatus = {};
        mills.forEach(m => {
            millByStatus[m.status] = (millByStatus[m.status] || 0) + 1;
        });

        return {
            kpis,
            woByMonth: Object.entries(woByMonth).sort().map(([month, count]) => ({ month, count })),
            woByStatus: Object.entries(woByStatus).map(([status, count]) => ({ status, count })),
            diagByMonth: Object.entries(diagByMonth).sort().map(([month, count]) => ({ month, count })),
            concByCommunity: Object.entries(concByCommunity).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
            pieceBreakdown: Object.values(pieceMap).sort((a, b) => b.completed - a.completed),
            pumpBreakdown,
            millByStatus: Object.entries(millByStatus).map(([status, count]) => ({ status, count })),
        };
    },
};
