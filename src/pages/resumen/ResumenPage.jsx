import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Wind, Table, BarChart3, Brain, CalendarPlus, Filter, RotateCcw, X, Check, Loader2 } from 'lucide-react';
import ResumenSpreadsheet from './ResumenSpreadsheet';
import ResumenSummarySheet from './ResumenSummarySheet';
import ResumenStats from './ResumenStats';
import ResumenCharts from './ResumenCharts';
import ResumenAIAnalysis from './ResumenAIAnalysis';
import {
  loadData, createWeek, addWeek, getStats, getCrews,
  addConsolidadoRow, addResumenRow, updateConsolidadoRow, updateResumenRow,
  deleteConsolidadoRow, deleteResumenRow, bulkInsertConsolidado, bulkInsertResumen,
} from './resumenData';

const TABS = [
  { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
  { id: 'consolidado', label: 'Consolidado', icon: Table },
  { id: 'resumen', label: 'Resumen Semanal', icon: Table },
  { id: 'ai', label: 'Análisis IA', icon: Brain },
];

export default function ResumenPage() {
  const [data, setData] = useState({ consolidado: [], resumen: [], weeks: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('stats');
  const [crewFilter, setCrewFilter] = useState('Todas');
  const [showNewWeek, setShowNewWeek] = useState(false);
  const [newWeek, setNewWeek] = useState({ numero: '', rangoTexto: '', fechaInicio: '', fechaFin: '', diasDisponibles: '' });

  // Load data from Supabase on mount
  useEffect(() => {
    loadData().then(d => { setData(d); setLoading(false); });
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    const d = await loadData();
    setData(d);
    setLoading(false);
  }, []);

  const crews = useMemo(() => getCrews(data), [data]);
  const stats = useMemo(() => getStats(data, crewFilter), [data, crewFilter]);

  const handleAddWeek = async () => {
    const { numero, rangoTexto, diasDisponibles } = newWeek;
    if (!numero || !rangoTexto || !diasDisponibles) return;
    setSaving(true);
    try {
      const week = createWeek(parseInt(numero), rangoTexto, newWeek.fechaInicio, newWeek.fechaFin, parseInt(diasDisponibles));
      const saved = await addWeek(week);
      setData(prev => ({ ...prev, weeks: [...prev.weeks, saved].sort((a, b) => a.numero - b.numero) }));
      setShowNewWeek(false);
      setNewWeek({ numero: '', rangoTexto: '', fechaInicio: '', fechaFin: '', diasDisponibles: '' });
    } catch (e) { console.error('Error adding week', e); }
    setSaving(false);
  };

  // ── Consolidado handlers ──
  const handleUpdateConsolidado = useCallback(async (i, updated) => {
    const row = data.consolidado[i];
    if (!row?.id) return;
    setSaving(true);
    try {
      await updateConsolidadoRow(row.id, updated);
      setData(prev => {
        const cons = [...prev.consolidado];
        cons[i] = { ...cons[i], ...updated };
        return { ...prev, consolidado: cons };
      });
    } catch (e) { console.error('Error updating', e); }
    setSaving(false);
  }, [data.consolidado]);

  const handleDeleteConsolidado = useCallback(async (i) => {
    const row = data.consolidado[i];
    if (!row?.id) return;
    setSaving(true);
    try {
      await deleteConsolidadoRow(row.id);
      setData(prev => ({ ...prev, consolidado: prev.consolidado.filter((_, idx) => idx !== i) }));
    } catch (e) { console.error('Error deleting', e); }
    setSaving(false);
  }, [data.consolidado]);

  const handleAddConsolidado = useCallback(async (row) => {
    setSaving(true);
    try {
      const saved = await addConsolidadoRow(row);
      setData(prev => ({ ...prev, consolidado: [...prev.consolidado, saved] }));
    } catch (e) { console.error('Error adding', e); }
    setSaving(false);
  }, []);

  const handleBulkPasteConsolidado = useCallback(async (rows) => {
    setSaving(true);
    try {
      const saved = await bulkInsertConsolidado(rows);
      setData(prev => ({ ...prev, consolidado: [...prev.consolidado, ...saved] }));
    } catch (e) { console.error('Error bulk pasting', e); }
    setSaving(false);
  }, []);

  // ── Resumen handlers ──
  const handleUpdateResumen = useCallback(async (i, updated) => {
    const row = data.resumen[i];
    if (!row?.id) return;
    setSaving(true);
    try {
      await updateResumenRow(row.id, updated);
      setData(prev => {
        const res = [...prev.resumen];
        res[i] = { ...res[i], ...updated };
        return { ...prev, resumen: res };
      });
    } catch (e) { console.error('Error updating', e); }
    setSaving(false);
  }, [data.resumen]);

  const handleDeleteResumen = useCallback(async (i) => {
    const row = data.resumen[i];
    if (!row?.id) return;
    setSaving(true);
    try {
      await deleteResumenRow(row.id);
      setData(prev => ({ ...prev, resumen: prev.resumen.filter((_, idx) => idx !== i) }));
    } catch (e) { console.error('Error deleting', e); }
    setSaving(false);
  }, [data.resumen]);

  const handleAddResumen = useCallback(async (row) => {
    setSaving(true);
    try {
      const saved = await addResumenRow(row);
      setData(prev => ({ ...prev, resumen: [...prev.resumen, saved] }));
    } catch (e) { console.error('Error adding', e); }
    setSaving(false);
  }, []);

  const handleBulkPasteResumen = useCallback(async (rows) => {
    setSaving(true);
    try {
      const saved = await bulkInsertResumen(rows);
      setData(prev => ({ ...prev, resumen: [...prev.resumen, ...saved] }));
    } catch (e) { console.error('Error bulk pasting', e); }
    setSaving(false);
  }, []);

  // Filtered data for spreadsheets
  const filteredConsolidado = crewFilter === 'Todas' ? data.consolidado : data.consolidado.filter(r => r.cuadrilla === crewFilter);
  const filteredResumen = crewFilter === 'Todas' ? data.resumen : data.resumen.filter(r => r.cuadrilla === crewFilter);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-emerald-400 animate-spin" />
          <p className="text-sm text-slate-400">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      {/* Saving indicator */}
      {saving && (
        <div className="fixed top-2 right-2 z-50 bg-blue-600/90 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg">
          <Loader2 size={12} className="animate-spin" /> Guardando...
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-glow">
                <Wind size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">Resumen de Ejecución</h1>
                <p className="text-[11px] text-slate-400">Control de mantenimiento de molinos — Cuadrillas 2025</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowNewWeek(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                <CalendarPlus size={14} /> Nueva Semana
              </button>
              <button onClick={reload}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
                <RotateCcw size={14} /> Recargar
              </button>
            </div>
          </div>

          {/* Tabs + Filter */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                    tab === t.id
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}>
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <select value={crewFilter} onChange={e => setCrewFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white">
                <option value="Todas">Todas las cuadrillas</option>
                {crews.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* New Week Modal */}
      {showNewWeek && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowNewWeek(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><CalendarPlus size={16} className="text-blue-400" /> Nueva Semana</h3>
              <button onClick={() => setShowNewWeek(false)} className="text-slate-400 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Número de semana</label>
                  <input type="number" value={newWeek.numero} onChange={e => setNewWeek(p => ({ ...p, numero: e.target.value }))}
                    placeholder="12" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Días disponibles</label>
                  <input type="number" value={newWeek.diasDisponibles} onChange={e => setNewWeek(p => ({ ...p, diasDisponibles: e.target.value }))}
                    placeholder="5" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Rango (texto)</label>
                <input value={newWeek.rangoTexto} onChange={e => setNewWeek(p => ({ ...p, rangoTexto: e.target.value }))}
                  placeholder="12 al 16 de mayo" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Fecha inicio</label>
                  <input type="date" value={newWeek.fechaInicio} onChange={e => setNewWeek(p => ({ ...p, fechaInicio: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Fecha fin</label>
                  <input type="date" value={newWeek.fechaFin} onChange={e => setNewWeek(p => ({ ...p, fechaFin: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
              </div>
              <button onClick={handleAddWeek} disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition-colors mt-2 disabled:opacity-50">
                <Check size={14} /> Crear Semana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-[1600px] mx-auto px-4 py-6">
        {tab === 'stats' && (
          <div className="space-y-6 animate-fade-in">
            <ResumenStats stats={stats} />
            <ResumenCharts stats={stats} />
          </div>
        )}
        {tab === 'consolidado' && (
          <div className="animate-fade-in">
            <ResumenSpreadsheet
              data={filteredConsolidado}
              weeks={data.weeks}
              onUpdate={handleUpdateConsolidado}
              onDelete={handleDeleteConsolidado}
              onAdd={handleAddConsolidado}
              onBulkPaste={handleBulkPasteConsolidado}
            />
          </div>
        )}
        {tab === 'resumen' && (
          <div className="animate-fade-in">
            <ResumenSummarySheet
              data={filteredResumen}
              weeks={data.weeks}
              onUpdate={handleUpdateResumen}
              onDelete={handleDeleteResumen}
              onAdd={handleAddResumen}
              onBulkPaste={handleBulkPasteResumen}
            />
          </div>
        )}
        {tab === 'ai' && (
          <div className="animate-fade-in">
            <ResumenAIAnalysis data={data} crewFilter={crewFilter} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-4 mt-8">
        <p className="text-center text-[10px] text-slate-600">
          Módulo de Resumen de Ejecución — SENA Molinos de Viento La Guajira
        </p>
      </footer>
    </div>
  );
}
