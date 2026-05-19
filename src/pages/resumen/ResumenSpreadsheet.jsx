import React, { useState, useCallback, useRef } from 'react';
import { Trash2, Plus, Copy, Download } from 'lucide-react';

const COLUMNS = [
  { key: 'cuadrilla', label: 'Cuadrilla', width: 140 },
  { key: 'municipio', label: 'Municipio', width: 120 },
  { key: 'comunidad', label: 'Comunidad', width: 140 },
  { key: 'coordenadas', label: 'Coordenadas', width: 140 },
  { key: 'semana', label: 'Semana', width: 200, type: 'select' },
  { key: 'categoria', label: 'Categoría', width: 160, type: 'select' },
  { key: 'actividades', label: 'Actividades', width: 300 },
  { key: 'fechaInicio', label: 'Fecha Inicio', width: 120, type: 'date' },
  { key: 'fechaFin', label: 'Fecha Fin', width: 120, type: 'date' },
  { key: 'fechaPrimeraIntervencion', label: '1ra Intervención', width: 130, type: 'date' },
  { key: 'observaciones', label: 'Observaciones', width: 300 },
];

const CATEGORIAS = ['MANTENIMIENTO GENERAL', 'REINTERVENCION'];

const emptyRow = (weeks, crews) => ({
  cuadrilla: crews[0] || '',
  municipio: '', comunidad: '', comunidadFull: '', coordenadas: '',
  semana: weeks[0]?.label || '', categoria: CATEGORIAS[0],
  actividades: '', fechaInicio: '', fechaFin: '',
  fechaPrimeraIntervencion: '', observaciones: '', diferenciaMeses: '',
});

export default function ResumenSpreadsheet({ data, weeks, onUpdate, onDelete, onAdd, onBulkPaste }) {
  const [editCell, setEditCell] = useState(null);
  const [editVal, setEditVal] = useState('');
  const tableRef = useRef(null);
  const crews = [...new Set(data.map(r => r.cuadrilla).filter(Boolean))];

  const startEdit = (ri, col) => {
    setEditCell({ ri, col });
    setEditVal(data[ri][col.key] || '');
  };

  const commitEdit = () => {
    if (!editCell) return;
    const { ri, col } = editCell;
    const updated = { [col.key]: editVal };
    if (col.key === 'comunidad') updated.comunidadFull = editVal;
    onUpdate(ri, updated);
    setEditCell(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') setEditCell(null);
    if (e.key === 'Tab') { e.preventDefault(); commitEdit(); }
  };

  const handlePaste = useCallback((e) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    const rows = text.split('\n').map(r => r.split('\t'));
    if (rows.length <= 1 && rows[0]?.length <= 1) return;
    e.preventDefault();
    const newRows = rows.filter(r => r.some(c => c.trim())).map(cells => {
      const row = { ...emptyRow(weeks, crews) };
      COLUMNS.forEach((col, ci) => { if (cells[ci] !== undefined) row[col.key] = cells[ci].trim(); });
      return row;
    });
    if (onBulkPaste && newRows.length > 1) {
      onBulkPaste(newRows);
    } else {
      newRows.forEach(r => onAdd(r));
    }
  }, [weeks, crews, onAdd, onBulkPaste]);

  const exportCSV = () => {
    const header = COLUMNS.map(c => c.label).join(',');
    const rows = data.map(r => COLUMNS.map(c => `"${(r[c.key] || '').toString().replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'consolidado.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-emerald-300">
          Consolidado — {data.length} registros
        </h3>
        <div className="flex gap-2">
          <button onClick={() => onAdd(emptyRow(weeks, crews))}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors">
            <Plus size={14} /> Agregar fila
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>
      <div className="text-xs text-slate-500 mb-1">💡 Puedes pegar filas desde Excel (Ctrl+V)</div>
      <div className="overflow-auto max-h-[65vh] rounded-xl border border-slate-700/50 shadow-lg" onPaste={handlePaste}>
        <table ref={tableRef} className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-800/95 backdrop-blur">
              <th className="px-2 py-2.5 text-left text-emerald-400 font-semibold border-b border-slate-700 w-8">#</th>
              {COLUMNS.map(col => (
                <th key={col.key} style={{ minWidth: col.width }}
                  className="px-2 py-2.5 text-left text-emerald-400 font-semibold border-b border-slate-700 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              <th className="px-2 py-2.5 border-b border-slate-700 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => (
              <tr key={ri} className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/50">
                <td className="px-2 py-1.5 text-slate-500 font-mono">{ri + 1}</td>
                {COLUMNS.map(col => {
                  const isEditing = editCell?.ri === ri && editCell?.col.key === col.key;
                  return (
                    <td key={col.key} className="px-1 py-0.5 border-r border-slate-800/30"
                      onClick={() => !isEditing && startEdit(ri, col)}>
                      {isEditing ? (
                        col.type === 'select' && col.key === 'categoria' ? (
                          <select value={editVal} onChange={e => { setEditVal(e.target.value); }}
                            onBlur={commitEdit} autoFocus
                            className="w-full bg-slate-900 border border-emerald-500 rounded px-1 py-0.5 text-xs text-white">
                            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : col.type === 'select' && col.key === 'semana' ? (
                          <select value={editVal} onChange={e => setEditVal(e.target.value)}
                            onBlur={commitEdit} autoFocus
                            className="w-full bg-slate-900 border border-emerald-500 rounded px-1 py-0.5 text-xs text-white">
                            {weeks.map(w => <option key={w.label} value={w.label}>{w.label}</option>)}
                          </select>
                        ) : col.type === 'date' ? (
                          <input type="date" value={editVal} onChange={e => setEditVal(e.target.value)}
                            onBlur={commitEdit} onKeyDown={handleKeyDown} autoFocus
                            className="w-full bg-slate-900 border border-emerald-500 rounded px-1 py-0.5 text-xs text-white" />
                        ) : col.key === 'actividades' || col.key === 'observaciones' ? (
                          <textarea value={editVal} onChange={e => setEditVal(e.target.value)}
                            onBlur={commitEdit} onKeyDown={handleKeyDown} autoFocus rows={3}
                            className="w-full bg-slate-900 border border-emerald-500 rounded px-1 py-0.5 text-xs text-white resize-y" />
                        ) : (
                          <input value={editVal} onChange={e => setEditVal(e.target.value)}
                            onBlur={commitEdit} onKeyDown={handleKeyDown} autoFocus
                            className="w-full bg-slate-900 border border-emerald-500 rounded px-1 py-0.5 text-xs text-white" />
                        )
                      ) : (
                        <div className="px-1 py-1 cursor-pointer min-h-[24px] max-w-[300px] truncate text-slate-300 hover:text-white"
                          title={row[col.key] || ''}>
                          {col.key === 'categoria' ? (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${row[col.key] === 'REINTERVENCION' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                              {row[col.key]}
                            </span>
                          ) : row[col.key] || '—'}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="px-1 py-1">
                  <button onClick={() => onDelete(ri)} className="p-1 text-red-400/60 hover:text-red-400 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
