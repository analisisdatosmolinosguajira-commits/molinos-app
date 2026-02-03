import React, { useState, useEffect } from 'react';
import {
    ClipboardList,
    Stethoscope,
    Users,
    MapPin,
    AlertTriangle,
    CheckCircle,
    Activity,
    ArrowRight
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { DashboardService } from '../../services/dashboard';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        otsAbiertas: 0,
        diagnosticosPendientes: 0,
        concertacionesActivas: 0,
        molinosOperativos: 0,
        molinosInactivos: 0,
        comunidadesImpactadas: 0,
        alertasCriticas: 0
    });
    const [criticalAlerts, setCriticalAlerts] = useState([]);
    const [mapMills, setMapMills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadDashboard() {
            try {
                // Fetch in parallel
                const [kpis, alerts, mills] = await Promise.all([
                    DashboardService.getStats(),
                    DashboardService.getRecentAlerts(),
                    DashboardService.getMapMills()
                ]);

                setStats(kpis);
                setCriticalAlerts(alerts || []);
                setMapMills(mills || []);
            } catch (err) {
                console.error("Dashboard error:", err);
                setError(err.message || "Error cargando datos del tablero");
            } finally {
                setLoading(false);
            }
        }
        loadDashboard();
    }, []);

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando panel de control...</div>;
    if (error) return (
        <div className="p-8 text-center text-red-500">
            <p className="font-bold">Error cargando Dashboard</p>
            <p className="font-mono text-sm mt-2">{error}</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Panel de Control</h1>
                <p className="text-slate-500 mt-1 text-lg">Resumen operativo y social del proyecto</p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                    title="OTs Abiertas"
                    value={stats.otsAbiertas}
                    icon={ClipboardList}
                    color="blue"
                    trend="Activas"
                />
                <StatCard
                    title="Diagnósticos Pendientes"
                    value={stats.diagnosticosPendientes}
                    icon={Stethoscope}
                    color="amber"
                    trend="Requieren visita"
                />
                <StatCard
                    title="Concertaciones Activas"
                    value={stats.concertacionesActivas}
                    icon={Users}
                    color="purple"
                    subtitle="Procesos sociales en curso"
                />

                {/* Status Breakdown */}
                <StatCard
                    title="Molinos Operativos"
                    value={stats.molinosOperativos}
                    icon={CheckCircle}
                    color="green"
                    subtitle={`${stats.molinosInactivos} Equipos inactivos`}
                />

                <StatCard
                    title="Comunidades Impactadas"
                    value={stats.comunidadesImpactadas}
                    icon={MapPin}
                    color="purple"
                />

                <StatCard
                    title="Alertas Críticas"
                    value={stats.alertasCriticas}
                    icon={AlertTriangle}
                    color="red"
                    trend="Acción inmediata"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Map Placeholder with Real Mills */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <MapPin className="text-blue-500" />
                            Mapa de Operaciones
                        </h2>
                        <button className="text-brand-600 font-medium text-sm hover:underline">
                            Ver mapa completo
                        </button>
                    </div>

                    <div className="flex-1 min-h-[400px] bg-slate-50 rounded-xl border border-slate-200 relative overflow-hidden group">
                        {/* Abstract Map Background */}
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]"></div>

                        {/* Pins (limited to 10 for layout) */}
                        {mapMills.slice(0, 10).map((mill, idx) => (
                            <div
                                key={mill.mill_id}
                                className="absolute hover:z-10 group/pin cursor-pointer transition-all hover:scale-110"
                                style={{
                                    // Randomize slightly for demo if no real lat/long, otherwise map
                                    // For now using simple grid distribution based on index to ensure visibility
                                    top: `${20 + (idx * 15) % 60}%`,
                                    left: `${10 + (idx * 20) % 80}%`
                                }}
                            >
                                <div className={`
                  w-4 h-4 rounded-full shadow-lg border-2 border-white
                  ${mill.status === 'OPERATIONAL' ? 'bg-green-500' : 'bg-red-500'}
                `}></div>

                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-white p-2 rounded-lg shadow-xl opacity-0 group-hover/pin:opacity-100 transition-opacity text-center pointer-events-none z-20">
                                    <p className="text-xs font-bold text-slate-800">{mill.code}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{mill.community || 'Sin comunidad'}</p>
                                </div>
                            </div>
                        ))}

                        {mapMills.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                No hay molinos con geolocalización.
                            </div>
                        )}

                        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow border border-slate-100 text-xs">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span> Operativo
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span> Inactivo
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Alerts Feed */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Activity className="text-rose-500" />
                        Alertas Recientes
                    </h2>

                    <div className="space-y-4">
                        {criticalAlerts.map(alert => (
                            <div key={alert.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors group cursor-pointer" onClick={() => navigate('/ordenes')}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-slate-500">{alert.mill_code}</span>
                                    <StatusBadge status={alert.priority} size="sm" />
                                </div>
                                <h3 className="font-semibold text-slate-800 text-sm mb-1">{alert.description}</h3>
                                <div className="flex justify-between items-center mt-3">
                                    <span className="text-xs text-slate-400">{alert.date}</span>
                                    <button className="text-brand-600 hover:text-brand-700 text-xs font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        Ver O.T <ArrowRight size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {criticalAlerts.length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-sm">
                                No hay alertas críticas pendientes.
                            </div>
                        )}
                    </div>

                    <button className="w-full mt-6 py-2.5 text-sm font-medium text-slate-600 hover:text-brand-600 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-dashed border-slate-200">
                        Ver todas las alertas
                    </button>
                </div>
            </div>
        </div>
    );
}
