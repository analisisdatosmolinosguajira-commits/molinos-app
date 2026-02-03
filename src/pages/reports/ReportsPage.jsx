import React from 'react';
import { BarChart3, TrendingUp, PieChart, Clock } from 'lucide-react';
import { mockData } from '../../data/mockData';

export default function ReportsPage() {
    const { stats } = mockData;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reportes y Análisis</h1>
                <p className="text-slate-500 mt-1">Indicadores de gestión de mantenimiento y proyecto</p>
            </div>

            {/* Main KPIs (Goal Tracking) */}
            <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <p className="text-slate-400 font-medium mb-1">Meta de Recuperación</p>
                        <h2 className="text-4xl font-bold">45 <span className="text-2xl text-slate-500 font-normal">/ 100</span></h2>
                        <p className="text-sm text-green-400 mt-2 font-medium">45% Ejecutado</p>
                        <div className="w-full bg-slate-800 h-2 rounded-full mt-4">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                        </div>
                    </div>

                    <div>
                        <p className="text-slate-400 font-medium mb-1">Tiempo Promedio Reparación (MTTR)</p>
                        <h2 className="text-4xl font-bold">2.4 <span className="text-xl text-slate-500 font-normal">días</span></h2>
                        <p className="text-sm text-blue-400 mt-2 font-medium">Objetivo: &lt; 3 días</p>
                    </div>

                    <div>
                        <p className="text-slate-400 font-medium mb-1">Comunidades Impactadas</p>
                        <h2 className="text-4xl font-bold">{stats.comunidadesImpactadas}</h2>
                        <p className="text-sm text-purple-400 mt-2 font-medium">Beneficiarios directos</p>
                    </div>
                </div>

                {/* Decor */}
                <div className="absolute top-0 right-0 p-32 bg-blue-500 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Availability */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <PieChart className="text-brand-500" />
                        Disponibilidad de Activos
                    </h3>
                    <div className="flex justify-center py-4">
                        <div className="w-48 h-48 rounded-full border-[16px] border-slate-100 relative items-center justify-center flex border-t-green-500 border-r-green-500 border-b-green-500" style={{ transform: 'rotate(-45deg)' }}>
                            <div className="transform rotate-[45deg] text-center">
                                <span className="text-3xl font-bold text-slate-800">75%</span>
                                <p className="text-xs text-slate-500 uppercase">Operativo</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="w-3 h-3 rounded-full bg-green-500"></span> Operativo
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="w-3 h-3 rounded-full bg-slate-200"></span> Inactivo
                        </div>
                    </div>
                </div>

                {/* Maintenance Types */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <BarChart3 className="text-brand-500" />
                        Preventivo vs Correctivo
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="font-medium text-slate-600">Mantenimiento Preventivo</span>
                                <span className="font-bold text-slate-800">65%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                                <div className="bg-blue-500 h-full rounded-full" style={{ width: '65%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="font-medium text-slate-600">Mantenimiento Correctivo</span>
                                <span className="font-bold text-slate-800">35%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                                <div className="bg-amber-500 h-full rounded-full" style={{ width: '35%' }}></div>
                            </div>
                        </div>
                    </div>
                    <p className="mt-8 text-sm text-slate-400 italic">
                        El ratio actual indica una gestión saludable, priorizando la prevención sobre la corrección de fallas.
                    </p>
                </div>

            </div>
        </div>
    );
}
