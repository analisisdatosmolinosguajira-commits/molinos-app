import React, { useState, useEffect, useMemo } from 'react';
import { Wind, Table, BarChart3, Brain, CalendarPlus, Filter, RotateCcw, X, Check } from 'lucide-react';
import ResumenSpreadsheet from './ResumenSpreadsheet';
import ResumenSummarySheet from './ResumenSummarySheet';
import ResumenStats from './ResumenStats';
import ResumenCharts from './ResumenCharts';
import ResumenAIAnalysis from './ResumenAIAnalysis';
import {
  loadData, saveData, resetData, createWeek, getStats, getCrews,
  addConsolidadoRow, addResumenRow, updateConsolidadoRow, updateResumenRow,
  deleteConsolidadoRow, deleteResumenRow,
} from './resumenData';

const TABS = [
  { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
  { id: 'consolidado', label: 'Consolidado', icon: Table },
  { id: 'resumen', label: 'Resumen Semanal', icon: Table },
  { id: 'ai', label: 'Análisis IA', icon: Brain },
];

export default function ResumenPage() {
  const [data, setData] = useState(loadData);
  const [tab, setTab] = useState('stats');
  const [crewFilter, setCrewFilter] = useState('Todas');
  const [showNewWeek, setShowNewWeek] = useState(false);
  const [newWeek, setNewWeek] = useState({ numero: '', rangoTexto: '', fechaInicio: '', fechaFin: '', diasDisponibles: '' });

  useEffect(() => { saveData(data); }, [data]);

  const crews = useMemo(() => getCrews(data), [data]);
  const stats = useMemo(() => getStats(data, crewFilter), [data, crewFilter]);

  const handleReset = () => {
    if (window.confirm('¿Restaurar datos originales? Se perderán los cambios.')) {
      setData(resetData());
    }
  };

  const handleAddWeek = () => {
    const { numero, rangoTexto, diasDisponibles } = newWeek;
    if (!numero || !rangoTexto || !diasDisponibles) return;
    const week = createWeek(parseInt(numero), rangoTexto, newWeek.fechaInicio, newWeek.fechaFin, parseInt(diasDisponibles));
    setData(prev => ({ ...prev, weeks: [...prev.weeks, week].sort((a, b) => a.numero - b.numero) }));
    setShowNewWeek(false);
    setNewWeek({ numero: '', rangoTexto: '', fechaInicio: '', fechaFin: '', diasDisponibles: '' });
  };

  // Filtered data for spreadsheets
  const filteredConsolidado = crewFilter === 'Todas' ? data.consolidado : data.consolidado.filter(r => r.cuadrilla === crewFilter);
  const filteredResumen = crewFilter === 'Todas' ? data.resumen : data.resumen.filter(r => r.cuadrilla === crewFilter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
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
              <button onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
                <RotateCcw size={14} /> Reset
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
              <button onClick={handleAddWeek}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition-colors mt-2">
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
              onUpdate={(i, updated) => {
                const realIdx = crewFilter === 'Todas' ? i : data.consolidado.indexOf(filteredConsolidado[i]);
                setData(prev => updateConsolidadoRow(prev, realIdx, updated));
              }}
              onDelete={(i) => {
                const realIdx = crewFilter === 'Todas' ? i : data.consolidado.indexOf(filteredConsolidado[i]);
                setData(prev => deleteConsolidadoRow(prev, realIdx));
              }}
              onAdd={(row) => setData(prev => addConsolidadoRow(prev, row))}
            />
          </div>
        )}
        {tab === 'resumen' && (
          <div className="animate-fade-in">
            <ResumenSummarySheet
              data={filteredResumen}
              weeks={data.weeks}
              onUpdate={(i, updated) => {
                const realIdx = crewFilter === 'Todas' ? i : data.resumen.indexOf(filteredResumen[i]);
                setData(prev => updateResumenRow(prev, realIdx, updated));
              }}
              onDelete={(i) => {
                const realIdx = crewFilter === 'Todas' ? i : data.resumen.indexOf(filteredResumen[i]);
                setData(prev => deleteResumenRow(prev, realIdx));
              }}
              onAdd={(row) => setData(prev => addResumenRow(prev, row))}
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
