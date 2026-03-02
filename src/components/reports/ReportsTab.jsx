import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import {
    Download, Calendar, Wrench, Stethoscope, Users, Hammer,
    Cpu, Wind, Filter, Package
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ReportsService } from '../../services/reports';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#94a3b8'];

const STATUS_LABELS = {
    pending: 'Pendiente',
    pendiente: 'Pendiente',
    in_progress: 'En Progreso',
    en_progreso: 'En Progreso',
    completed: 'Completada',
    completada: 'Completada',
    cancelled: 'Cancelada',
    cancelada: 'Cancelada',
    operativo: 'Operativo',
    inactivo: 'Inactivo',
    en_reparacion: 'En Reparación',
};

export default function ReportsTab() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 6);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const loadData = async () => {
        try {
            setLoading(true);
            const result = await ReportsService.getReportData(startDate, endDate);
            setData(result);
        } catch (err) {
            console.error('Error loading reports:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [startDate, endDate]);

    const exportExcel = () => {
        if (!data) return;
        const wb = XLSX.utils.book_new();
        const today = new Date().toLocaleDateString('es-CO');

        // Sheet 1: KPIs
        const kpiRows = [
            ['REPORTE DE PROYECTO'],
            [`Período: ${startDate} — ${endDate}`],
            [`Generado: ${today}`],
            [],
            ['Indicador', 'Valor'],
            ['Total OTs', data.kpis.totalWOs],
            ['OTs Completadas', data.kpis.completedWOs],
            ['Diagnósticos', data.kpis.totalDiagnoses],
            ['Concertaciones', data.kpis.totalConcertations],
            ['Órdenes de Fabricación', data.kpis.totalMOs],
            ['Molinos Activos', data.kpis.activeMills],
            ['Total Molinos', data.kpis.totalMills],
            [],
            ['Bombas Fabricadas', data.pumpBreakdown.fabricated],
            ['Bombas Reparadas', data.pumpBreakdown.repaired],
        ];
        const ws1 = XLSX.utils.aoa_to_sheet(kpiRows);
        ws1['!cols'] = [{ wch: 25 }, { wch: 15 }];
        ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
        XLSX.utils.book_append_sheet(wb, ws1, 'KPIs');

        // Sheet 2: Pieces breakdown
        const pieceRows = [
            ['DESGLOSE DE PIEZAS FABRICADAS'],
            [`Período: ${startDate} — ${endDate}`],
            [],
            ['Pieza', 'Código', 'Planificadas', 'Completadas', '% Avance'],
            ...data.pieceBreakdown.map(p => [
                p.name, p.code, p.planned, p.completed,
                p.planned > 0 ? Math.round((p.completed / p.planned) * 100) + '%' : '0%',
            ]),
            [],
            ['TOTAL', '',
                data.pieceBreakdown.reduce((s, p) => s + p.planned, 0),
                data.pieceBreakdown.reduce((s, p) => s + p.completed, 0),
                ''
            ],
        ];
        const ws2 = XLSX.utils.aoa_to_sheet(pieceRows);
        ws2['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }];
        ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
        XLSX.utils.book_append_sheet(wb, ws2, 'Piezas Fabricadas');

        // Sheet 3: WOs by month
        const woRows = [
            ['OTS POR MES'], [],
            ['Mes', 'Cantidad'],
            ...data.woByMonth.map(w => [w.month, w.count]),
        ];
        const ws3 = XLSX.utils.aoa_to_sheet(woRows);
        ws3['!cols'] = [{ wch: 12 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, ws3, 'OTs por Mes');

        XLSX.writeFile(wb, `reporte_proyecto_${startDate}_${endDate}.xlsx`);
    };

    if (loading) {
        return (
            <div className="text-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-slate-400">Generando reportes...</p>
            </div>
        );
    }

    if (!data) return <p className="text-center text-slate-400 py-8">Error cargando datos</p>;

    return (
        <div className="space-y-6">
            {/* Date Filters + Export */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-slate-400" />
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                    <span className="text-slate-400 text-sm">—</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                </div>
                <button
                    onClick={exportExcel}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 font-semibold rounded-xl text-sm hover:bg-green-100 border border-green-200"
                >
                    <Download size={14} /> Exportar Excel
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard icon={Wrench} label="OTs Totales" value={data.kpis.totalWOs} sub={`${data.kpis.completedWOs} completadas`} color="bg-brand-50 text-brand-600" />
                <KPICard icon={Stethoscope} label="Diagnósticos" value={data.kpis.totalDiagnoses} color="bg-orange-50 text-orange-600" />
                <KPICard icon={Users} label="Concertaciones" value={data.kpis.totalConcertations} color="bg-pink-50 text-pink-600" />
                <KPICard icon={Hammer} label="Fabricación" value={data.kpis.totalMOs} sub={`${data.pumpBreakdown.fabricated} bombas`} color="bg-violet-50 text-violet-600" />
            </div>

            {/* Row 1: WOs by Month + WOs by Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Wrench size={18} className="text-brand-500" /> Órdenes de Trabajo por Mes
                    </h3>
                    {data.woByMonth.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={data.woByMonth}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" fontSize={11} tick={{ fill: '#94a3b8' }} />
                                <YAxis fontSize={11} tick={{ fill: '#94a3b8' }} allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                                <Bar dataKey="count" name="OTs" fill="#6366f1" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <EmptyChart />}
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Filter size={18} className="text-brand-500" /> OTs por Estado
                    </h3>
                    {data.woByStatus.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={data.woByStatus.map(s => ({ ...s, name: STATUS_LABELS[s.status] || s.status }))} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                                        {data.woByStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-wrap gap-2 justify-center mt-2">
                                {data.woByStatus.map((s, i) => (
                                    <span key={s.status} className="flex items-center gap-1.5 text-xs text-slate-600">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                        {STATUS_LABELS[s.status] || s.status}: {s.count}
                                    </span>
                                ))}
                            </div>
                        </>
                    ) : <EmptyChart />}
                </div>
            </div>

            {/* Row 2: Piece Breakdown + Pump Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Hammer size={18} className="text-violet-500" /> Piezas Fabricadas por Tipo
                    </h3>
                    {data.pieceBreakdown.length > 0 ? (
                        <ResponsiveContainer width="100%" height={Math.max(200, data.pieceBreakdown.length * 40)}>
                            <BarChart data={data.pieceBreakdown} layout="vertical" margin={{ left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" fontSize={11} tick={{ fill: '#94a3b8' }} allowDecimals={false} />
                                <YAxis type="category" dataKey="name" fontSize={11} tick={{ fill: '#64748b' }} width={120} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                                <Legend />
                                <Bar dataKey="planned" name="Planificadas" fill="#c7d2fe" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="completed" name="Completadas" fill="#6366f1" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <EmptyChart msg="No se fabricaron piezas en este período" />}
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Cpu size={18} className="text-cyan-500" /> Bombas
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-cyan-50 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-cyan-700">{data.pumpBreakdown.fabricated}</p>
                            <p className="text-xs text-cyan-600 font-medium mt-1">Fabricadas</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-amber-700">{data.pumpBreakdown.repaired}</p>
                            <p className="text-xs text-amber-600 font-medium mt-1">Reparadas</p>
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{data.pumpBreakdown.completed}</p>
                        <p className="text-xs text-slate-500 font-medium mt-1">Completadas de {data.pumpBreakdown.total} total</p>
                    </div>

                    <h3 className="font-bold text-slate-800 flex items-center gap-2 pt-2">
                        <Wind size={18} className="text-emerald-500" /> Molinos
                    </h3>
                    {data.millByStatus.length > 0 ? (
                        <div className="space-y-2">
                            {data.millByStatus.map(m => (
                                <div key={m.status} className="flex items-center justify-between">
                                    <span className="text-xs text-slate-600">{STATUS_LABELS[m.status] || m.status}</span>
                                    <span className="text-sm font-bold text-slate-800">{m.count}</span>
                                </div>
                            ))}
                            <div className="pt-2 border-t border-slate-100 flex justify-between">
                                <span className="text-xs font-bold text-slate-500">Total</span>
                                <span className="text-sm font-bold text-slate-800">{data.kpis.totalMills}</span>
                            </div>
                        </div>
                    ) : <p className="text-xs text-slate-400">Sin datos de molinos</p>}
                </div>
            </div>

            {/* Row 3: Diagnoses + Concertaciones */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Stethoscope size={18} className="text-orange-500" /> Diagnósticos por Mes
                    </h3>
                    {data.diagByMonth.length > 0 ? (
                        <ResponsiveContainer width="100%" height={240}>
                            <LineChart data={data.diagByMonth}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" fontSize={11} tick={{ fill: '#94a3b8' }} />
                                <YAxis fontSize={11} tick={{ fill: '#94a3b8' }} allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                                <Line type="monotone" dataKey="count" name="Diagnósticos" stroke="#f97316" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : <EmptyChart />}
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Users size={18} className="text-pink-500" /> Concertaciones por Comunidad
                    </h3>
                    {data.concByCommunity.length > 0 ? (
                        <ResponsiveContainer width="100%" height={Math.max(200, data.concByCommunity.length * 36)}>
                            <BarChart data={data.concByCommunity} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" fontSize={11} tick={{ fill: '#94a3b8' }} allowDecimals={false} />
                                <YAxis type="category" dataKey="name" fontSize={11} tick={{ fill: '#64748b' }} width={140} />
                                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                                <Bar dataKey="count" name="Concertaciones" fill="#ec4899" radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <EmptyChart />}
                </div>
            </div>

            {/* Row 4: Piece Portfolio (Innovation Table) */}
            {data.pieceBreakdown.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Package size={18} className="text-amber-500" /> Portafolio de Piezas — Innovación y Diversificación
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">
                        {data.pieceBreakdown.length} tipos de piezas distintos fabricados en el período. Mayor diversificación = mayor capacidad de I+D.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">#</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">Pieza</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">Código</th>
                                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-400 uppercase">Planificadas</th>
                                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-400 uppercase">Completadas</th>
                                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-400 uppercase">Avance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.pieceBreakdown.map((p, i) => {
                                    const pct = p.planned > 0 ? Math.round((p.completed / p.planned) * 100) : 0;
                                    return (
                                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="px-4 py-3 text-xs text-slate-400">{i + 1}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-slate-800">{p.name}</td>
                                            <td className="px-4 py-3 text-xs text-slate-500 font-mono">{p.code || '—'}</td>
                                            <td className="px-4 py-3 text-center text-sm text-slate-600">{p.planned}</td>
                                            <td className="px-4 py-3 text-center text-sm font-bold text-slate-800">{p.completed}</td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-16 bg-slate-100 rounded-full h-1.5">
                                                        <div className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-brand-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-500">{pct}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-50 border-t-2 border-slate-200">
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3 font-bold text-slate-800 text-sm">TOTAL</td>
                                    <td className="px-4 py-3 text-xs text-slate-400">{data.pieceBreakdown.length} tipos</td>
                                    <td className="px-4 py-3 text-center font-bold text-slate-600">{data.pieceBreakdown.reduce((s, p) => s + p.planned, 0)}</td>
                                    <td className="px-4 py-3 text-center font-bold text-brand-600">{data.pieceBreakdown.reduce((s, p) => s + p.completed, 0)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function KPICard({ icon: Icon, label, value, sub, color }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className={`p-2.5 rounded-xl w-fit ${color}`}>
                <Icon size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3">{value}</p>
            <p className="text-xs font-bold text-slate-400 uppercase mt-1">{label}</p>
            {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
    );
}

function EmptyChart({ msg }) {
    return (
        <div className="flex items-center justify-center h-[200px] text-slate-300">
            <p className="text-sm">{msg || 'Sin datos en este período'}</p>
        </div>
    );
}
