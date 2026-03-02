import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Wind, Droplets, ClipboardList, Stethoscope, Users, MapPin,
    AlertTriangle, CheckCircle, Activity, ArrowRight, Clock,
    ChevronRight, Wrench, Handshake, XCircle, BarChart3, Zap
} from 'lucide-react';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend
} from 'recharts';
import MillMap from '../../components/dashboard/MillMap';
import { DashboardService } from '../../services/dashboard';
import { useAuth } from '../../contexts/AuthContext';

const ACTIVITY_ICONS = {
    work_order: { icon: ClipboardList, color: 'text-blue-500', bg: 'bg-brand-50' },
    diagnosis: { icon: Stethoscope, color: 'text-amber-500', bg: 'bg-amber-50' },
    concertation: { icon: Handshake, color: 'text-purple-500', bg: 'bg-purple-50' },
};

const PRIORITY_STYLES = {
    CRITICAL: 'bg-red-100 text-red-700 border-red-200',
    HIGH: 'bg-amber-100 text-amber-700 border-amber-200',
    MEDIUM: 'bg-brand-100 text-brand-700 border-brand-200',
    LOW: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function DashboardPage() {
    const navigate = useNavigate();
    const { displayName } = useAuth();
    const [stats, setStats] = useState(null);
    const [mapMills, setMapMills] = useState([]);
    const [activities, setActivities] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [statusChart, setStatusChart] = useState([]);
    const [monthlyChart, setMonthlyChart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadDashboard() {
            try {
                const [kpis, mills, activityFeed, alertsFeed, statusDist, monthlyWO] = await Promise.all([
                    DashboardService.getStats(),
                    DashboardService.getMapMills(),
                    DashboardService.getActivityFeed(),
                    DashboardService.getRecentAlerts(),
                    DashboardService.getMillStatusDistribution(),
                    DashboardService.getMonthlyWorkOrders(),
                ]);

                setStats(kpis);
                setMapMills(mills || []);
                setActivities(activityFeed || []);
                setAlerts(alertsFeed || []);
                setStatusChart(statusDist || []);
                setMonthlyChart(monthlyWO || []);
            } catch (err) {
                console.error('Dashboard error:', err);
                setError(err.message || 'Error cargando datos del tablero');
            } finally {
                setLoading(false);
            }
        }
        loadDashboard();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Cargando panel de control...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center bg-red-50 p-8 rounded-2xl border border-red-100">
                    <XCircle size={48} className="text-red-400 mx-auto mb-3" />
                    <p className="font-bold text-red-700">Error cargando Dashboard</p>
                    <p className="font-mono text-sm mt-2 text-red-500">{error}</p>
                </div>
            </div>
        );
    }

    const greeting = getGreeting();

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header with greeting */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                        {greeting}, <span className="text-brand-600">{displayName?.split(' ')[0] || 'Usuario'}</span>
                    </h1>
                    <p className="text-slate-500 mt-1 text-lg">Resumen operativo del Proyecto Molinos de Viento</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock size={14} />
                    <span>{new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <KpiCard
                    label="Molinos"
                    value={stats?.totalMolinos}
                    icon={Wind}
                    gradient="from-brand-500 to-brand-700"
                    onClick={() => navigate('/molinos')}
                />
                <KpiCard
                    label="Operativos"
                    value={stats?.molinosOperativos}
                    icon={CheckCircle}
                    gradient="from-green-500 to-emerald-600"
                    highlight={stats?.totalMolinos ? `${Math.round((stats.molinosOperativos / stats.totalMolinos) * 100)}%` : null}
                />
                <KpiCard
                    label="OTs Abiertas"
                    value={stats?.otsAbiertas}
                    icon={ClipboardList}
                    gradient="from-amber-500 to-orange-600"
                    onClick={() => navigate('/ordenes')}
                />
                <KpiCard
                    label="Diagnósticos"
                    value={stats?.diagnosticosPendientes}
                    icon={Stethoscope}
                    gradient="from-rose-500 to-red-600"
                    onClick={() => navigate('/diagnosticos')}
                />
                <KpiCard
                    label="Comunidades"
                    value={stats?.comunidadesImpactadas}
                    icon={Users}
                    gradient="from-violet-500 to-purple-600"
                    onClick={() => navigate('/comunidades')}
                />
                <KpiCard
                    label="Bombas"
                    value={stats?.bombasInstaladas}
                    icon={Droplets}
                    gradient="from-cyan-500 to-teal-600"
                    onClick={() => navigate('/bombas')}
                />
            </div>

            {/* Map Section — PRIORITY */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-brand-50 rounded-xl">
                            <MapPin className="text-brand-600" size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Mapa de Molinos</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Geolocalización en tiempo real · OpenStreetMap</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/molinos')}
                        className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
                    >
                        Ver todos <ChevronRight size={16} />
                    </button>
                </div>
                <MillMap mills={mapMills} height="500px" />
            </div>

            {/* Charts + Alerts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Donut: Mill Status */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 size={18} className="text-slate-400" />
                        <h3 className="font-bold text-slate-800">Estado de Molinos</h3>
                    </div>
                    {statusChart.length > 0 ? (
                        <div className="flex items-center justify-center" style={{ height: 260 }}>
                            <PieChart width={260} height={260}>
                                <Pie
                                    data={statusChart}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={55}
                                    outerRadius={90}
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {statusChart.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                        fontSize: '13px',
                                    }}
                                    formatter={(value, name) => [`${value} molinos`, name]}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                                />
                            </PieChart>
                        </div>
                    ) : (
                        <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">
                            Sin datos de estado
                        </div>
                    )}
                </div>

                {/* Bar: Monthly Work Orders */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Wrench size={18} className="text-slate-400" />
                        <h3 className="font-bold text-slate-800">OTs por Mes</h3>
                    </div>
                    {monthlyChart.length > 0 ? (
                        <div style={{ width: '100%', overflowX: 'auto' }}>
                            <BarChart width={380} height={260} data={monthlyChart} barGap={4}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                        fontSize: '13px',
                                    }}
                                />
                                <Bar dataKey="completed" name="Completadas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="pending" name="Pendientes" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </div>
                    ) : (
                        <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">
                            Sin datos de órdenes
                        </div>
                    )}
                </div>

                {/* Alerts Panel */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Zap size={18} className="text-rose-500" />
                            <h3 className="font-bold text-slate-800">Alertas Críticas</h3>
                        </div>
                        {stats?.alertasCriticas > 0 && (
                            <span className="px-2.5 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-full animate-pulse">
                                {stats.alertasCriticas}
                            </span>
                        )}
                    </div>

                    <div className="space-y-3 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                        {alerts.length > 0 ? alerts.map(alert => (
                            <div
                                key={alert.id}
                                onClick={() => navigate('/ordenes')}
                                className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-brand-200 hover:shadow-sm transition-all cursor-pointer group"
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-bold text-slate-500">{alert.mill_code}</span>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${PRIORITY_STYLES[alert.priority] || PRIORITY_STYLES.MEDIUM}`}>
                                        {alert.priority}
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-slate-700 line-clamp-2">{alert.description}</p>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[11px] text-slate-400">{alert.timeAgo}</span>
                                    <ArrowRight size={12} className="text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-10 text-slate-400 text-sm">
                                <CheckCircle size={32} className="mx-auto mb-2 opacity-40" />
                                Sin alertas críticas 🎉
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <Activity size={18} className="text-brand-500" />
                        <h3 className="font-bold text-slate-800">Actividad Reciente</h3>
                        <span className="text-xs text-slate-400 ml-1">Últimos 7 días</span>
                    </div>
                </div>

                {activities.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {activities.map(act => {
                            const config = ACTIVITY_ICONS[act.type] || ACTIVITY_ICONS.work_order;
                            const IconComp = config.icon;
                            return (
                                <div
                                    key={act.id}
                                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                                >
                                    <div className={`p-2 rounded-lg ${config.bg} shrink-0`}>
                                        <IconComp size={16} className={config.color} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-700 truncate">{act.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-slate-400">{act.subtitle}</span>
                                            <span className="text-slate-200">·</span>
                                            <span className="text-xs text-slate-400">{act.timeAgo}</span>
                                        </div>
                                    </div>
                                    {act.status && (
                                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                                            {act.status}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-400 text-sm">
                        No hay actividad reciente esta semana.
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickAction icon={Stethoscope} label="Nuevo Diagnóstico" onClick={() => navigate('/diagnosticos/new')} color="amber" />
                <QuickAction icon={ClipboardList} label="Ver Órdenes" onClick={() => navigate('/ordenes')} color="blue" />
                <QuickAction icon={Users} label="Concertaciones" onClick={() => navigate('/concertaciones')} color="purple" />
                <QuickAction icon={Wind} label="Gestión Molinos" onClick={() => navigate('/molinos')} color="green" />
            </div>
        </div>
    );
}

// ─── Sub-Components ────────────────────────────────

function KpiCard({ label, value, icon: Icon, gradient, highlight, onClick }) {
    return (
        <div
            onClick={onClick}
            className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${gradient} text-white shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-3xl font-bold tracking-tight">{value ?? '-'}</p>
                    <p className="text-sm font-medium text-white/80 mt-1">{label}</p>
                </div>
                <div className="p-2 bg-white/15 rounded-xl backdrop-blur-sm">
                    <Icon size={22} />
                </div>
            </div>
            {highlight && (
                <div className="mt-2 text-xs font-semibold text-white/90 bg-white/15 inline-block px-2 py-0.5 rounded-full">
                    {highlight}
                </div>
            )}
            {/* Decorative circle */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
        </div>
    );
}

function QuickAction({ icon: Icon, label, onClick, color }) {
    const colorMap = {
        blue: 'hover:border-brand-300 hover:bg-brand-50 text-brand-600',
        amber: 'hover:border-amber-300 hover:bg-amber-50 text-amber-600',
        purple: 'hover:border-purple-300 hover:bg-purple-50 text-purple-600',
        green: 'hover:border-green-300 hover:bg-green-50 text-green-600',
    };

    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${colorMap[color]}`}
        >
            <Icon size={20} />
            <span className="text-sm font-semibold text-slate-700">{label}</span>
        </button>
    );
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
}
