import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Package, ArrowUp, ArrowDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { SSTService } from '../../services/sst';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function SSTAnalyticsTab() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const data = await SSTService.getEPPAnalytics();
                setAnalytics(data);
            } catch (err) {
                console.error('Error loading analytics:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return (
            <div className="text-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-slate-400">Cargando analíticas...</p>
            </div>
        );
    }

    if (!analytics || analytics.totalDeliveries === 0) {
        return (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <BarChart3 size={48} className="mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 font-medium">No hay datos de entregas para analizar</p>
                <p className="text-xs text-slate-400 mt-1">Las gráficas se generarán cuando existan entregas de EPP</p>
            </div>
        );
    }

    const topItems = analytics.byEPP.slice(0, 8);

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-1">Total Entregas</p>
                    <p className="text-2xl font-bold text-slate-800">{analytics.totalDeliveries}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-1">Ítems Entregados</p>
                    <p className="text-2xl font-bold text-slate-800">{analytics.totalItems}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-1">EPP Más Entregado</p>
                    <p className="text-lg font-bold text-brand-600 truncate">{topItems[0]?.name || '-'}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-1">Meses con Datos</p>
                    <p className="text-2xl font-bold text-slate-800">{analytics.monthly.length}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top EPP Consumption */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Package size={18} className="text-brand-600" />
                        EPP Más Entregados (Total)
                    </h3>
                    <div className="flex justify-center">
                        <PieChart width={300} height={260}>
                            <Pie
                                data={topItems}
                                cx="50%"
                                cy="45%"
                                innerRadius={50}
                                outerRadius={90}
                                paddingAngle={2}
                                dataKey="total"
                                nameKey="name"
                            >
                                {topItems.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(v, name) => [`${v} uds`, name]} />
                            <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                    </div>
                </div>

                {/* Monthly Trend */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <TrendingUp size={18} className="text-brand-600" />
                        Entregas por Mes
                    </h3>
                    <div style={{ width: '100%', overflowX: 'auto' }}>
                        <BarChart width={380} height={260} data={analytics.monthly} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                            <Bar dataKey="count" name="Ítems Entregados" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="font-bold text-slate-800 mb-4">Consumo Detallado por EPP</h3>
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">EPP</th>
                            <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">Total</th>
                            <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">Último Mes</th>
                            <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-400 uppercase">Tendencia</th>
                        </tr>
                    </thead>
                    <tbody>
                        {analytics.byEPP.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50">
                                <td className="px-4 py-3 text-sm font-medium text-slate-700">{item.name}</td>
                                <td className="px-4 py-3 text-sm text-right font-bold text-slate-800">{item.total}</td>
                                <td className="px-4 py-3 text-sm text-right text-slate-600">{item.lastMonth}</td>
                                <td className="px-4 py-3 text-right">
                                    {item.lastMonth > 0 ? (
                                        <span className="inline-flex items-center text-xs text-green-600">
                                            <ArrowUp size={12} /> Activo
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center text-xs text-slate-400">
                                            <ArrowDown size={12} /> Sin uso
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
