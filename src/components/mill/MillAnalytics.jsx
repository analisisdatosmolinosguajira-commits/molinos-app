import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, AlertTriangle, CheckCircle, TrendingUp, Calendar } from 'lucide-react';

const MillAnalytics = ({ analyticsData }) => {
    if (!analyticsData) {
        return (
            <div className="text-center py-12 bg-slate-50 rounded-xl">
                <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-500">Cargando analíticas...</p>
            </div>
        );
    }

    const {
        workOrderCount,
        completedWorkOrders,
        activeWorkOrders,
        diagnosisCount,
        lastDiagnosisDate,
        daysSinceInstall,
        daysSinceLastDiagnosis,
        completionRate,
        problematicComponents
    } = analyticsData;

    return (
        <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Work Orders Total */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-brand-200">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center text-white">
                            <Activity size={24} />
                        </div>
                        <span className="text-xs font-bold text-brand-600 uppercase">Total</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-900">{workOrderCount}</p>
                    <p className="text-sm text-brand-600 mt-1">Órdenes de Trabajo</p>
                </div>

                {/* Completion Rate */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white">
                            <CheckCircle size={24} />
                        </div>
                        <span className="text-xs font-bold text-green-600 uppercase">Tasa</span>
                    </div>
                    <p className="text-3xl font-bold text-green-900">{completionRate}%</p>
                    <p className="text-sm text-green-600 mt-1">Completadas ({completedWorkOrders})</p>
                </div>

                {/* Active Work Orders */}
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5 border border-amber-200">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white">
                            <TrendingUp size={24} />
                        </div>
                        <span className="text-xs font-bold text-amber-600 uppercase">Activas</span>
                    </div>
                    <p className="text-3xl font-bold text-amber-900">{activeWorkOrders}</p>
                    <p className="text-sm text-amber-600 mt-1">En Proceso</p>
                </div>

                {/* Diagnoses Count */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center text-white">
                            <AlertTriangle size={24} />
                        </div>
                        <span className="text-xs font-bold text-purple-600 uppercase">Histórico</span>
                    </div>
                    <p className="text-3xl font-bold text-purple-900">{diagnosisCount}</p>
                    <p className="text-sm text-purple-600 mt-1">Diagnósticos</p>
                </div>
            </div>

            {/* Two Column Layout: Chart & Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Problematic Components Chart */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-red-500" />
                        Componentes Problemáticos
                    </h4>

                    {problematicComponents && problematicComponents.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={problematicComponents} layout="horizontal">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" stroke="#94a3b8" />
                                <YAxis type="category" dataKey="name" width={100} stroke="#94a3b8" style={{ fontSize: '12px' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#fff'
                                    }}
                                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                                    {problematicComponents.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={index === 0 ? '#ef4444' : index === 1 ? '#f97316' : '#fbbf24'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-72 flex items-center justify-center bg-slate-50 rounded-lg">
                            <div className="text-center">
                                <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
                                <p className="text-slate-600 font-medium">¡Sin problemas reportados!</p>
                                <p className="text-sm text-slate-400 mt-1">Todos los componentes funcionan correctamente</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Time Metrics */}
                <div className="space-y-4">
                    {/* Days Since Installation */}
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-5 border border-slate-200">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Tiempo en Operación</p>
                                <p className="text-4xl font-bold text-slate-900">
                                    {daysSinceInstall !== null && daysSinceInstall !== undefined ? daysSinceInstall : 'N/A'}
                                    {typeof daysSinceInstall === 'number' && <span className="text-lg text-slate-500 ml-2">días</span>}
                                </p>
                                {typeof daysSinceInstall === 'number' && (
                                    <p className="text-sm text-slate-500 mt-2">
                                        Aproximadamente {Math.floor(daysSinceInstall / 30)} meses
                                    </p>
                                )}
                            </div>
                            <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center">
                                <Calendar size={28} className="text-slate-600" />
                            </div>
                        </div>
                    </div>

                    {/* Days Since Last Diagnosis */}
                    <div className={`rounded-xl p-5 border ${daysSinceLastDiagnosis > 90
                            ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-200'
                            : daysSinceLastDiagnosis > 60
                                ? 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200'
                                : 'bg-gradient-to-r from-green-50 to-green-100 border-green-200'
                        }`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase mb-2" style={{
                                    color: daysSinceLastDiagnosis > 90 ? '#dc2626' : daysSinceLastDiagnosis > 60 ? '#d97706' : '#16a34a'
                                }}>
                                    Último Diagnóstico
                                </p>
                                <p className="text-4xl font-bold" style={{
                                    color: daysSinceLastDiagnosis > 90 ? '#7f1d1d' : daysSinceLastDiagnosis > 60 ? '#78350f' : '#14532d'
                                }}>
                                    {daysSinceLastDiagnosis !== null && daysSinceLastDiagnosis !== undefined ? daysSinceLastDiagnosis : 'N/A'}
                                    {typeof daysSinceLastDiagnosis === 'number' && (
                                        <span className="text-lg ml-2" style={{
                                            color: daysSinceLastDiagnosis > 90 ? '#991b1b' : daysSinceLastDiagnosis > 60 ? '#92400e' : '#166534'
                                        }}>días atrás</span>
                                    )}
                                </p>
                                {lastDiagnosisDate && (
                                    <p className="text-sm mt-2" style={{
                                        color: daysSinceLastDiagnosis > 90 ? '#dc2626' : daysSinceLastDiagnosis > 60 ? '#d97706' : '#16a34a'
                                    }}>
                                        {new Date(lastDiagnosisDate).toLocaleDateString()}
                                    </p>
                                )}
                                {daysSinceLastDiagnosis > 90 && (
                                    <p className="text-xs text-red-600 font-semibold mt-2 flex items-center gap-1">
                                        <AlertTriangle size={14} />
                                        ¡Requiere diagnóstico urgente!
                                    </p>
                                )}
                            </div>
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${daysSinceLastDiagnosis > 90 ? 'bg-red-200' : daysSinceLastDiagnosis > 60 ? 'bg-amber-200' : 'bg-green-200'
                                }`}>
                                <Activity size={28} className={
                                    daysSinceLastDiagnosis > 90 ? 'text-red-600' : daysSinceLastDiagnosis > 60 ? 'text-amber-600' : 'text-green-600'
                                } />
                            </div>
                        </div>
                    </div>

                    {/* Health Status Summary */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h5 className="font-bold text-slate-800 mb-3 text-sm">Resumen de Salud</h5>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Intervenciones Totales</span>
                                <span className="font-bold text-slate-900">{workOrderCount + diagnosisCount}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Problemas Identificados</span>
                                <span className="font-bold text-red-600">{problematicComponents?.length || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Tasa de Éxito</span>
                                <span className="font-bold text-green-600">{completionRate}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MillAnalytics;
