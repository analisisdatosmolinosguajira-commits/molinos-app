import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Wind, Droplets, ClipboardList, Stethoscope, Users, MapPin,
    AlertTriangle, CheckCircle, Activity, ArrowRight, Clock,
    ChevronRight, ChevronLeft, Wrench, Handshake, XCircle, BarChart3, Zap, Target, HelpCircle, BarChart2
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import MillMap from '../../components/dashboard/MillMap';
import { DashboardService } from '../../services/dashboard';
import { useAuth } from '../../contexts/AuthContext';

const ACTIVITY_ICONS = {
    work_order: { icon: ClipboardList, color: 'text-brand-500', bg: 'bg-brand-50' },
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
    const [failureStats, setFailureStats] = useState(null);
    const [monthlyChart, setMonthlyChart] = useState([]);
    const [rawChartOrders, setRawChartOrders] = useState([]);
    const [chartView, setChartView] = useState('monthly'); // 'monthly' | 'weekly'
    const [selectedWeek, setSelectedWeek] = useState(1);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedYear, setSelectedYear] = useState(2026);

    useEffect(() => {
        async function loadDashboard() {
            setLoading(true);
            try {
                const [kpis, mills, activityFeed, alertsFeed, fails, chartData] = await Promise.all([
                    DashboardService.getStats(selectedYear),
                    DashboardService.getMapMills(selectedYear),
                    DashboardService.getActivityFeed(),
                    DashboardService.getRecentAlerts(),
                    DashboardService.getFailureStats(selectedYear),
                    DashboardService.getChartWorkOrders(selectedYear),
                ]);

                setStats(kpis);
                setMapMills(mills || []);
                setActivities(activityFeed || []);
                setAlerts(alertsFeed || []);
                setFailureStats(fails || null);
                
                if (chartData) {
                    setMonthlyChart(chartData.monthlyData || []);
                    setRawChartOrders(chartData.rawOrders || []);
                }
                
                // Set initial week to current week if viewing current year, else 1
                const now = new Date();
                if (now.getFullYear() === selectedYear) {
                    const start = new Date(now.getFullYear(), 0, 1);
                    const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
                    setSelectedWeek(Math.ceil((now.getDay() + 1 + days) / 7));
                } else {
                    setSelectedWeek(1);
                }

            } catch (err) {
                console.error('Dashboard error:', err);
                setError(err.message || 'Error cargando datos del tablero');
            } finally {
                setLoading(false);
            }
        }
        loadDashboard();
    }, [selectedYear]);

    const socialStats = React.useMemo(() => {
        let families = 0, inhabitants = 0, children = 0;
        let interventions = 0, reinterventions = 0, activeMills = 0;
        const activities = {};

        mapMills.forEach(m => {
            if (m.hasIntervention || m.hasReintervention) {
                activeMills++;
                interventions += m.interventionsCount || 0;
                reinterventions += m.reinterventionsCount || 0;

                const soc = m.social || {};
                families += soc.number_of_families || 0;
                inhabitants += soc.number_of_inhabitants || 0;
                children += soc.number_of_children || 0;

                const act = soc.main_productive_activity;
                let normalizedAct = act && act.trim() !== '' ? act.trim() : 'Sin Información';
                
                if (normalizedAct !== 'Sin Información') {
                    // Capitalize the first letter for better display if needed, but DB is already standardized
                }

                activities[normalizedAct] = (activities[normalizedAct] || 0) + 1;
            }
        });

        const topActivities = Object.entries(activities)
            .sort((a, b) => {
                if (a[0] === 'Sin Información') return 1;
                if (b[0] === 'Sin Información') return -1;
                return b[1] - a[1];
            }); // Show all, no slice

        return { families, inhabitants, children, interventions, reinterventions, activeMills, topActivities };
    }, [mapMills]);

    const weeklyChart = React.useMemo(() => {
        if (chartView !== 'weekly' || !rawChartOrders.length) return [];
        
        const yearStart = new Date(selectedYear, 0, 1);
        const format = { day: 'numeric', month: 'short' };
        
        const weeks = Array.from({ length: 53 }, (_, i) => {
            const startDay = new Date(selectedYear, 0, 1 + i * 7);
            const endDay = new Date(selectedYear, 0, startDay.getDate() + 6);
            return {
                day: `${startDay.toLocaleDateString('es-CO', format)} - ${endDay.toLocaleDateString('es-CO', format)}`,
                intervention: 0,
                reintervention: 0,
                total: 0
            };
        });
        
        rawChartOrders.forEach(wo => {
            if (!wo.start_date || wo.status !== 'COMPLETED') return;
            const d = new Date(wo.start_date);
            const dStart = new Date(yearStart.getFullYear(), yearStart.getMonth(), yearStart.getDate());
            const dCurrent = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            
            const diffDays = Math.floor((dCurrent - dStart) / (24 * 60 * 60 * 1000));
            const weekNo = Math.floor(diffDays / 7);
            
            if (weekNo >= 0 && weekNo < 53) {
                if (wo.is_reintervention) {
                    weeks[weekNo].reintervention++;
                } else {
                    weeks[weekNo].intervention++;
                }
                weeks[weekNo].total++;
            }
        });
        
        // Return only weeks that have records
        return weeks.filter(w => w.total > 0);
    }, [rawChartOrders, selectedYear, chartView]);

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

    function getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Buenos días';
        if (hour < 18) return 'Buenas tardes';
        return 'Buenas noches';
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
                <div className="flex flex-col md:items-end gap-2 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                        <Clock size={14} />
                        <span>{new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    {/* Year Selector */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setSelectedYear('ALL')}
                            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${selectedYear === 'ALL' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Histórico Global
                        </button>
                        <button 
                            onClick={() => setSelectedYear(2024)}
                            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${selectedYear === 2024 ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Año 2024
                        </button>
                        <button 
                            onClick={() => setSelectedYear(2025)}
                            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${selectedYear === 2025 ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Año 2025
                        </button>
                        <button 
                            onClick={() => setSelectedYear(2026)}
                            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${selectedYear === 2026 ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Año 2026
                        </button>
                    </div>
                </div>
            </div>

            {/* Meta Progress Bar */}
            {stats && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl">
                                <Target size={18} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm">Meta {selectedYear === 'ALL' ? 'Total' : selectedYear} — Nuevas Intervenciones</h3>
                                <p className="text-xs text-slate-400">Intervenciones nuevas (sin reintervención) completadas en {selectedYear === 'ALL' ? 'total' : selectedYear}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-brand-600">{stats.metaYear}</span>
                            <span className="text-sm text-slate-400"> / {stats.metaYearGoal}</span>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all duration-1000 ease-out relative"
                                style={{ width: `${Math.min((stats.metaYear / stats.metaYearGoal) * 100, 100)}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                            </div>
                        </div>
                        <div className="flex justify-between mt-1.5">
                            <span className="text-xs font-semibold text-brand-600">
                                {Math.round((stats.metaYear / stats.metaYearGoal) * 100)}% completado
                            </span>
                            <span className="text-xs text-slate-400">
                                Faltan {Math.max(stats.metaYearGoal - stats.metaYear, 0)} intervenciones
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Social & Productive Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-6 shadow-sm text-white relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Users size={20} className="text-white" />
                        </div>
                        <h3 className="font-bold text-lg">Impacto Social {selectedYear === 'ALL' ? 'Global' : selectedYear}</h3>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                            <p className="text-white/70 text-xs font-medium mb-1">Molinos Intervenidos</p>
                            <p className="text-2xl font-bold">{socialStats.activeMills}</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                            <p className="text-white/70 text-xs font-medium mb-1">Intervenciones</p>
                            <p className="text-2xl font-bold">{socialStats.interventions}</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                            <p className="text-white/70 text-xs font-medium mb-1">Reintervenciones</p>
                            <p className="text-2xl font-bold">{socialStats.reinterventions}</p>
                        </div>
                    </div>

                    <div className="flex gap-6 pt-4 border-t border-white/20">
                        <div>
                            <p className="text-white/70 text-xs font-medium">Familias</p>
                            <p className="text-lg font-bold">{socialStats.families.toLocaleString('es-CO')}</p>
                        </div>
                        <div>
                            <p className="text-white/70 text-xs font-medium">Habitantes</p>
                            <p className="text-lg font-bold">{socialStats.inhabitants.toLocaleString('es-CO')}</p>
                        </div>
                        <div>
                            <p className="text-white/70 text-xs font-medium">Niños</p>
                            <p className="text-lg font-bold">{socialStats.children.toLocaleString('es-CO')}</p>
                        </div>
                    </div>
                </div>

                {/* Productive Activity Pie Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-50 rounded-xl">
                            <BarChart2 size={20} className="text-emerald-600" />
                        </div>
                        <h3 className="font-bold text-slate-800">Actividad Productiva {selectedYear === 'ALL' ? 'Global' : selectedYear}</h3>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                        {socialStats.topActivities.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart
                                    data={socialStats.topActivities.map(([name, value]) => ({ name, value }))}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        type="category" 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#64748b', fontSize: 12 }} 
                                        width={100}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: '#f8fafc' }}
                                        formatter={(value) => [`${value} molinos`, 'Cantidad']}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                                        {socialStats.topActivities.map(([name, value], index) => {
                                            const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];
                                            const color = name === 'Sin Información' ? '#cbd5e1' : COLORS[index % COLORS.length];
                                            return <Cell key={`cell-${index}`} fill={color} />;
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full w-full text-slate-400 text-sm">
                                No hay datos de actividades productivas.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Map Section */}
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
                {/* Failure Stats */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Activity size={18} className="text-slate-400" />
                            <h3 className="font-bold text-slate-800">Tasa de Falla {selectedYear === 'ALL' ? 'Global' : selectedYear}</h3>
                        </div>
                    </div>
                    {failureStats ? (
                        <div className="flex-1 flex flex-col justify-center items-center text-center">
                            <div className="relative inline-flex items-center justify-center mb-4">
                                <svg className="w-32 h-32 transform -rotate-90">
                                    <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                                    <circle 
                                        cx="64" cy="64" r="56" 
                                        stroke="currentColor" 
                                        strokeWidth="12" 
                                        fill="transparent" 
                                        strokeDasharray={`${2 * Math.PI * 56}`}
                                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - failureStats.failureRate / 100)}`}
                                        className={`${failureStats.failureRate > 15 ? 'text-red-500' : failureStats.failureRate > 5 ? 'text-amber-500' : 'text-green-500'} transition-all duration-1000 ease-out`} 
                                    />
                                </svg>
                                <span className="absolute text-2xl font-bold text-slate-700">{failureStats.failureRate}%</span>
                            </div>
                            <p className="text-sm font-medium text-slate-500">
                                <span className="font-bold text-slate-700">{failureStats.failedMills}</span> reintervenciones<br/>
                                en <span className="font-bold text-slate-700">{failureStats.totalIntervenedMills}</span> intervenciones nuevas
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                            Sin datos de falla
                        </div>
                    )}
                </div>

                {/* Bar: Monthly/Weekly Work Orders */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Wrench size={18} className="text-slate-400" />
                            <h3 className="font-bold text-slate-800">OTs por {chartView === 'monthly' ? 'Mes' : 'Semana'}</h3>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setChartView('monthly')}
                                className={`px-2 py-1 text-xs rounded-md font-medium transition-all ${chartView === 'monthly' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Mes
                            </button>
                            <button 
                                onClick={() => setChartView('weekly')}
                                className={`px-2 py-1 text-xs rounded-md font-medium transition-all ${chartView === 'weekly' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Sem
                            </button>
                        </div>
                    </div>

                    {(chartView === 'monthly' ? monthlyChart : weeklyChart).length > 0 ? (
                        <div className="flex-1 w-full mt-2 overflow-x-auto overflow-y-hidden" style={{ minHeight: '260px' }}>
                            <div style={{ minWidth: chartView === 'weekly' ? `${Math.max(100, weeklyChart.length * 80)}px` : '100%', height: '260px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartView === 'monthly' ? monthlyChart : weeklyChart} barGap={4}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey={chartView === 'monthly' ? "month" : "day"} tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: '1px solid #e2e8f0',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                                fontSize: '13px',
                                            }}
                                        />
                                        <Bar dataKey="intervention" name="Intervención" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="reintervention" name="Reintervención" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
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



// eslint-disable-next-line no-unused-vars
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
