import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Target, Plus, Edit3, Trash2, X, TrendingUp,
    Zap, Wrench, Hammer, FileText, MapPin, Cpu, Award
} from 'lucide-react';
import { ReportsService } from '../../services/reports';

const METRIC_OPTIONS = [
    { key: 'new_interventions', label: 'Intervenciones nuevas', icon: Zap, color: 'text-emerald-600 bg-emerald-50' },
    { key: 'completed_work_orders', label: 'OTs completadas', icon: Wrench, color: 'text-brand-600 bg-brand-50' },
    { key: 'pieces_fabricated', label: 'Piezas fabricadas (total)', icon: Hammer, color: 'text-violet-600 bg-violet-50' },
    { key: 'distinct_piece_types', label: 'Tipos de pieza distintos', icon: Award, color: 'text-amber-600 bg-amber-50' },
    { key: 'pumps_fabricated', label: 'Bombas fabricadas', icon: Cpu, color: 'text-cyan-600 bg-cyan-50' },
    { key: 'concertations', label: 'Concertaciones', icon: FileText, color: 'text-pink-600 bg-pink-50' },
    { key: 'diagnoses', label: 'Diagnósticos', icon: Target, color: 'text-orange-600 bg-orange-50' },
    { key: 'journeys', label: 'Jornadas ejecutadas', icon: MapPin, color: 'text-teal-600 bg-teal-50' },
];

const PERIODS = [
    { key: 'week', label: 'Semana' },
    { key: 'month', label: 'Mes' },
    { key: 'quarter', label: 'Trimestre' },
    { key: 'year', label: 'Año' },
];

export default function GoalsTab() {
    const [goals, setGoals] = useState([]);
    const [metrics, setMetrics] = useState({});
    const [loading, setLoading] = useState(true);
    const [activePeriod, setActivePeriod] = useState('month');
    const [showModal, setShowModal] = useState(false);
    const [editGoal, setEditGoal] = useState(null);
    const [form, setForm] = useState({ name: '', metric_key: '', target_value: 10, period: 'month' });

    const loadData = async () => {
        try {
            setLoading(true);
            const [goalsData, metricsData] = await Promise.all([
                ReportsService.getGoals(),
                ReportsService.getGoalMetrics(activePeriod),
            ]);
            setGoals(goalsData);
            setMetrics(metricsData);
        } catch (err) {
            console.error('Error loading goals:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [activePeriod]);

    const openCreate = () => {
        setEditGoal(null);
        setForm({ name: '', metric_key: 'new_interventions', target_value: 10, period: activePeriod });
        setShowModal(true);
    };

    const openEdit = (goal) => {
        setEditGoal(goal);
        setForm({ name: goal.name, metric_key: goal.metric_key, target_value: goal.target_value, period: goal.period });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            if (editGoal) {
                await ReportsService.updateGoal(editGoal.goal_id, form);
            } else {
                await ReportsService.createGoal(form);
            }
            setShowModal(false);
            await loadData();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const handleDelete = async (goal) => {
        if (!confirm(`¿Eliminar meta "${goal.name}"?`)) return;
        try {
            await ReportsService.deleteGoal(goal.goal_id);
            await loadData();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    // Filter goals by active period
    const activeGoals = goals.filter(g => g.active && g.period === activePeriod);
    const completedCount = activeGoals.filter(g => (metrics[g.metric_key] || 0) >= g.target_value).length;

    if (loading) {
        return (
            <div className="text-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-slate-400">Cargando metas...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Strip */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                    {PERIODS.map(p => (
                        <button
                            key={p.key}
                            onClick={() => setActivePeriod(p.key)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all
                                ${activePeriod === p.key ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white font-semibold rounded-xl text-sm hover:bg-brand-700 shadow-lg shadow-brand-500/30"
                >
                    <Plus size={16} /> Nueva Meta
                </button>
            </div>

            {/* Summary Bar */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
                <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                        <p className="text-3xl font-bold">{activeGoals.length}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">Metas Activas</p>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-green-400">{completedCount}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">Alcanzadas</p>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-amber-400">{activeGoals.length - completedCount}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">En Progreso</p>
                    </div>
                </div>
            </div>

            {/* Goals Grid */}
            {activeGoals.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <Target size={48} className="mx-auto mb-3 text-slate-200" />
                    <p className="text-slate-400 font-medium">No hay metas configuradas para este período</p>
                    <button onClick={openCreate} className="mt-4 text-brand-600 font-bold text-sm">+ Crear meta</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeGoals.map(goal => {
                        const current = metrics[goal.metric_key] || 0;
                        const pct = goal.target_value > 0 ? Math.min(100, Math.round((current / goal.target_value) * 100)) : 0;
                        const isComplete = pct >= 100;
                        const opt = METRIC_OPTIONS.find(o => o.key === goal.metric_key);
                        const Icon = opt?.icon || Target;
                        const colorClass = opt?.color || 'text-slate-600 bg-slate-50';

                        return (
                            <div key={goal.goal_id} className={`bg-white rounded-2xl border p-5 shadow-sm group hover:shadow-md transition-all ${isComplete ? 'border-green-200 bg-green-50/30' : 'border-slate-100'}`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl ${colorClass}`}>
                                            <Icon size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{goal.name}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{opt?.label || goal.metric_key}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEdit(goal)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg">
                                            <Edit3 size={13} />
                                        </button>
                                        <button onClick={() => handleDelete(goal)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-end justify-between mb-3">
                                    <div>
                                        <span className="text-3xl font-bold text-slate-900">{current}</span>
                                        <span className="text-lg text-slate-400 font-medium ml-1">/ {goal.target_value}</span>
                                    </div>
                                    <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${isComplete ? 'bg-green-100 text-green-700' : pct >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {pct}%
                                    </span>
                                </div>

                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${isComplete ? 'bg-green-500' : pct >= 70 ? 'bg-amber-500' : 'bg-brand-500'}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>

                                {isComplete && (
                                    <p className="text-xs text-green-600 font-bold mt-2 flex items-center gap-1">
                                        <TrendingUp size={12} /> ¡Meta alcanzada!
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && createPortal(
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800 text-lg">{editGoal ? 'Editar Meta' : 'Nueva Meta'}</h3>
                            <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nombre de la Meta *</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="Ej: Molinos nuevos del trimestre"
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Métrica *</label>
                                <select
                                    value={form.metric_key}
                                    onChange={e => setForm({ ...form, metric_key: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                                >
                                    {METRIC_OPTIONS.map(o => (
                                        <option key={o.key} value={o.key}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Valor Objetivo *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={form.target_value}
                                        onChange={e => setForm({ ...form, target_value: parseInt(e.target.value) || 1 })}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-center"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Período</label>
                                    <select
                                        value={form.period}
                                        onChange={e => setForm({ ...form, period: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                                    >
                                        {PERIODS.map(p => (
                                            <option key={p.key} value={p.key}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 pt-0">
                            <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm">
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!form.name || !form.metric_key}
                                className="px-6 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-500/30 text-sm disabled:opacity-50"
                            >
                                {editGoal ? 'Guardar' : 'Crear Meta'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
