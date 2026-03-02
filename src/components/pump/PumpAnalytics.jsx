import React from 'react';
import { Activity, TrendingUp, Clock, Wrench, Calendar, Package } from 'lucide-react';

export default function PumpAnalytics({ analytics }) {
    if (!analytics) {
        return (
            <div className="text-center text-slate-400 py-8">
                Cargando analíticas...
            </div>
        );
    }

    const {
        totalInstallations,
        currentInstallationDays,
        totalActiveDays,
        ageDays,
        uptimePercentage,
        avgInstallationDays,
        workOrderStats,
        eventStats,
        isInstalled,
        currentMill,
        currentMillCode
    } = analytics;

    const metrics = [
        {
            label: 'Edad Total',
            value: ageDays,
            unit: 'días',
            icon: Calendar,
            color: 'slate',
            description: 'Desde fabricación'
        },
        {
            label: 'Días Activos',
            value: totalActiveDays,
            unit: 'días',
            icon: Activity,
            color: 'green',
            description: 'En operación'
        },
        {
            label: 'Tiempo de Actividad',
            value: uptimePercentage,
            unit: '%',
            icon: TrendingUp,
            color: 'blue',
            description: 'Uptime general'
        },
        {
            label: 'Instalación Actual',
            value: isInstalled ? currentInstallationDays : 0,
            unit: 'días',
            icon: Clock,
            color: isInstalled ? 'green' : 'slate',
            description: isInstalled ? currentMill || 'En molino' : 'No instalada'
        },
        {
            label: 'Promedio por Instalación',
            value: avgInstallationDays,
            unit: 'días',
            icon: Package,
            color: 'purple',
            description: `${totalInstallations} instalaciones totales`
        },
        {
            label: 'Órdenes de Trabajo',
            value: workOrderStats.total,
            unit: 'OT',
            icon: Wrench,
            color: 'orange',
            description: `${workOrderStats.completed} completadas`
        }
    ];

    const getColorClasses = (color) => {
        const colors = {
            slate: 'bg-slate-50 border-slate-200 text-slate-700',
            green: 'bg-green-50 border-green-200 text-green-700',
            blue: 'bg-brand-50 border-brand-200 text-brand-700',
            purple: 'bg-purple-50 border-purple-200 text-purple-700',
            orange: 'bg-orange-50 border-orange-200 text-orange-700'
        };
        return colors[color] || colors.slate;
    };

    const getIconColorClasses = (color) => {
        const colors = {
            slate: 'text-slate-500',
            green: 'text-green-500',
            blue: 'text-blue-500',
            purple: 'text-purple-500',
            orange: 'text-orange-500'
        };
        return colors[color] || colors.slate;
    };

    return (
        <div className="space-y-6">
            {/* Current Status Card */}
            {isInstalled && currentMill && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                            <Activity className="text-white" size={20} />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-green-900">Actualmente Instalada</h4>
                            <p className="text-green-700">
                                Molino {currentMillCode} - {currentMill}
                            </p>
                        </div>
                    </div>
                    <p className="text-sm text-green-600 ml-13">
                        Operando por {currentInstallationDays} días
                    </p>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics.map((metric, idx) => {
                    const Icon = metric.icon;
                    return (
                        <div
                            key={idx}
                            className={`p-5 rounded-xl border-2 ${getColorClasses(metric.color)} transition-all hover:shadow-md`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">
                                        {metric.label}
                                    </p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-bold">
                                            {metric.value.toLocaleString()}
                                        </span>
                                        <span className="text-sm font-medium opacity-70">
                                            {metric.unit}
                                        </span>
                                    </div>
                                </div>
                                <Icon className={`${getIconColorClasses(metric.color)} flex-shrink-0`} size={24} />
                            </div>
                            <p className="text-xs opacity-70 mt-2">
                                {metric.description}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Work Orders Summary */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Wrench size={16} />
                    Resumen de Órdenes de Trabajo
                </h4>
                <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-slate-800">{workOrderStats.total}</p>
                        <p className="text-xs text-slate-500 uppercase font-medium mt-1">Total</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-700">{workOrderStats.completed}</p>
                        <p className="text-xs text-green-600 uppercase font-medium mt-1">Completadas</p>
                    </div>
                    <div className="text-center p-4 bg-brand-50 rounded-lg">
                        <p className="text-2xl font-bold text-brand-700">{workOrderStats.inProgress}</p>
                        <p className="text-xs text-brand-600 uppercase font-medium mt-1">En Progreso</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-700">{workOrderStats.pending}</p>
                        <p className="text-xs text-yellow-600 uppercase font-medium mt-1">Pendientes</p>
                    </div>
                </div>
            </div>

            {/* Events Summary */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Activity size={16} />
                    Eventos Registrados
                </h4>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-slate-800">{eventStats.total}</p>
                        <p className="text-xs text-slate-500 uppercase font-medium mt-1">Eventos Totales</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-700">{eventStats.installations}</p>
                        <p className="text-xs text-green-600 uppercase font-medium mt-1">Instalaciones</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-700">{eventStats.removals}</p>
                        <p className="text-xs text-orange-600 uppercase font-medium mt-1">Remociones</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
