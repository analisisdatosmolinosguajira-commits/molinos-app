import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import {
    AlertTriangle, CheckCircle, RefreshCw, Zap, Wind,
    Calendar, Clock, Activity, Wrench, Shield
} from 'lucide-react';

// ─── Alert engine: pure queries against Supabase ───────────────────────────

async function detectAlerts() {
    const alerts = [];
    const today = new Date().toISOString().split('T')[0];

    // 1. Mills OPERATIONAL without active pump
    const { data: millsNoPump } = await supabase
        .from('mill')
        .select('mill_id, code, name, community:community_id(name)')
        .eq('status', 'OPERATIONAL')
        .is('active_pump_id', null);
    (millsNoPump || []).forEach(m =>
        alerts.push({
            id: `no-pump-${m.mill_id}`, severity: 'high', category: 'Activos',
            icon: Zap, iconColor: 'text-amber-500',
            title: `Molino ${m.code} operativo sin bomba`,
            detail: `${m.name} — ${m.community?.name || 'Sin comunidad'}`,
            action: 'Asignar bomba', link: `/bombas`
        })
    );

    // 2. Work orders HIGH/CRITICAL without crew assigned
    const { data: ordersNoCrew } = await supabase
        .from('work_order')
        .select('work_order_id, code, description, priority, status')
        .in('priority', ['HIGH', 'CRITICAL'])
        .is('crew_id', null)
        .in('status', ['PENDING', 'IN_PROGRESS']);
    (ordersNoCrew || []).forEach(o =>
        alerts.push({
            id: `ot-no-crew-${o.work_order_id}`, severity: o.priority === 'CRITICAL' ? 'critical' : 'high',
            category: 'Operaciones', icon: Wrench, iconColor: 'text-red-500',
            title: `OT ${o.priority}: ${o.code} sin cuadrilla`,
            detail: o.description,
            action: 'Ver OT', link: `/ordenes`
        })
    );

    // 3. Activities EN_EJECUCION with no daily report in last 2 days
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: activeActivities } = await supabase
        .from('planned_activity')
        .select('activity_id, title, start_date')
        .eq('status', 'EN_EJECUCION');
    for (const act of (activeActivities || [])) {
        const { count } = await supabase
            .from('daily_report')
            .select('report_id', { count: 'exact', head: true })
            .eq('activity_id', act.activity_id)
            .gte('report_date', twoDaysAgo);
        if ((count || 0) === 0) {
            alerts.push({
                id: `no-report-${act.activity_id}`, severity: 'medium', category: 'Planificación',
                icon: Calendar, iconColor: 'text-orange-500',
                title: `Actividad sin reporte hace +2 días`,
                detail: act.title,
                action: 'Ver actividad', link: `/visitas`
            });
        }
    }

    // 4. Diagnoses PENDING with severity CRITICO
    const { data: critDiagnoses } = await supabase
        .from('diagnosis')
        .select('diagnosis_id, code, description, created_at')
        .eq('status', 'PENDING')
        .eq('severity', 'CRITICO');
    (critDiagnoses || []).forEach(d =>
        alerts.push({
            id: `crit-diag-${d.diagnosis_id}`, severity: 'critical', category: 'Diagnósticos',
            icon: Activity, iconColor: 'text-red-600',
            title: `Diagnóstico CRÍTICO pendiente: ${d.code}`,
            detail: d.description,
            action: 'Ver diagnóstico', link: `/diagnosticos`
        })
    );

    // 5. Expired EPP/certifications in next 30 days (SST)
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: expiringCerts } = await supabase
        .from('person_certification')
        .select('person_certification_id, expiry_date, certification:certification_id(name), person:person_id(first_name, last_name)')
        .lte('expiry_date', in30Days)
        .gte('expiry_date', today);
    (expiringCerts || []).forEach(c =>
        alerts.push({
            id: `cert-exp-${c.person_certification_id}`, severity: 'medium', category: 'SST',
            icon: Shield, iconColor: 'text-blue-500',
            title: `Certificación próxima a vencer`,
            detail: `${c.person?.first_name} ${c.person?.last_name} — ${c.certification?.name} (${c.expiry_date})`,
            action: 'Ver SST', link: `/sst`
        })
    );

    // 6. Mills with status NON_OPERATIONAL for more than 7 days (no OT)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: offlineMills } = await supabase
        .from('mill')
        .select('mill_id, code, name, updated_at')
        .eq('status', 'NON_OPERATIONAL')
        .lte('updated_at', sevenDaysAgo + 'T00:00:00');
    (offlineMills || []).forEach(m =>
        alerts.push({
            id: `offline-${m.mill_id}`, severity: 'medium', category: 'Activos',
            icon: Wind, iconColor: 'text-slate-500',
            title: `Molino ${m.code} fuera de servicio +7 días`,
            detail: m.name,
            action: 'Ver molino', link: `/molinos/${m.mill_id}`
        })
    );

    return alerts;
}

// ─── Severity styling ───────────────────────────────────────────────────────
const SEVERITY = {
    critical: { bg: 'bg-red-50', border: 'border-red-300', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500', label: 'Crítico' },
    high: { bg: 'bg-amber-50', border: 'border-amber-300', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', label: 'Alto' },
    medium: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400', label: 'Medio' },
    low: { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', label: 'Bajo' },
};

// ─── Component ──────────────────────────────────────────────────────────────
export default function AlertsPage() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dismissed, setDismissed] = useState(() => JSON.parse(localStorage.getItem('ai_dismissed_alerts') || '[]'));
    const [filter, setFilter] = useState('all'); // all | critical | high | medium
    const [lastRefresh, setLastRefresh] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const found = await detectAlerts();
            setAlerts(found);
            setLastRefresh(new Date());
        } catch (e) {
            console.error('Error loading alerts:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const dismissAlert = (id) => {
        const next = [...dismissed, id];
        setDismissed(next);
        localStorage.setItem('ai_dismissed_alerts', JSON.stringify(next));
    };

    const visible = alerts
        .filter(a => !dismissed.includes(a.id))
        .filter(a => filter === 'all' || a.severity === filter)
        .sort((a, b) => {
            const order = { critical: 0, high: 1, medium: 2, low: 3 };
            return (order[a.severity] || 3) - (order[b.severity] || 3);
        });

    const counts = alerts.reduce((acc, a) => {
        if (!dismissed.includes(a.id)) acc[a.severity] = (acc[a.severity] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="space-y-6 animate-slide-up pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <AlertTriangle className="text-amber-500" size={22} />
                        Centro de Alertas Inteligentes
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Anomalías detectadas automáticamente en molinos, operaciones y SST
                        {lastRefresh && <span className="ml-2 text-slate-400">· Actualizado {lastRefresh.toLocaleTimeString()}</span>}
                    </p>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Actualizar
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { key: 'critical', label: 'Críticos', color: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
                    { key: 'high', label: 'Altos', color: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
                    { key: 'medium', label: 'Medios', color: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' },
                    { key: 'all', label: 'Total', color: 'bg-slate-500', text: 'text-slate-700', bg: 'bg-slate-50' },
                ].map(s => (
                    <button
                        key={s.key}
                        onClick={() => setFilter(s.key)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${filter === s.key ? 'border-current shadow-md' : 'border-transparent'} ${s.bg}`}
                    >
                        <div className={`text-3xl font-black ${s.text}`}>
                            {s.key === 'all' ? visible.length + dismissed.length - (alerts.filter(a => dismissed.includes(a.id)).length) : (counts[s.key] || 0)}
                        </div>
                        <div className={`text-sm font-semibold ${s.text} opacity-80 mt-1`}>{s.label}</div>
                    </button>
                ))}
            </div>

            {/* Alert list */}
            <div className="space-y-3">
                {loading && (
                    <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
                        <RefreshCw size={20} className="animate-spin" />
                        <span>Analizando base de datos...</span>
                    </div>
                )}

                {!loading && visible.length === 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                        <CheckCircle size={40} className="text-emerald-500 mx-auto mb-3" />
                        <h3 className="font-bold text-slate-700 text-lg mb-1">¡Todo en orden!</h3>
                        <p className="text-slate-400 text-sm">No se detectaron anomalías en este momento.</p>
                    </div>
                )}

                {!loading && visible.map(alert => {
                    const s = SEVERITY[alert.severity] || SEVERITY.low;
                    const Icon = alert.icon;
                    return (
                        <div key={alert.id} className={`flex items-start gap-4 p-4 rounded-xl border ${s.bg} ${s.border}`}>
                            <div className={`mt-0.5 flex-shrink-0 p-2 rounded-lg bg-white shadow-sm`}>
                                <Icon size={18} className={alert.iconColor} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badge} uppercase tracking-wider`}>
                                        {s.label}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">{alert.category}</span>
                                </div>
                                <p className="text-sm font-bold text-slate-800">{alert.title}</p>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">{alert.detail}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <a
                                    href={alert.link}
                                    className="text-xs font-semibold text-brand-600 hover:text-brand-800 whitespace-nowrap transition-colors"
                                >
                                    {alert.action} →
                                </a>
                                <button
                                    onClick={() => dismissAlert(alert.id)}
                                    className="p-1 rounded-md hover:bg-white/70 text-slate-400 hover:text-slate-600 transition-colors"
                                    title="Descartar alerta"
                                >
                                    <CheckCircle size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {dismissed.length > 0 && (
                <div className="text-center">
                    <button
                        onClick={() => { setDismissed([]); localStorage.removeItem('ai_dismissed_alerts'); }}
                        className="text-xs text-slate-400 hover:text-slate-600 underline"
                    >
                        Restaurar {dismissed.length} alerta(s) descartadas
                    </button>
                </div>
            )}
        </div>
    );
}
