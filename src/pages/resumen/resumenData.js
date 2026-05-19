import initialData from './initialData.json';

const STORAGE_KEY = 'resumen_module_data';

export function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) { console.warn('Error loading saved data', e); }
  return {
    consolidado: initialData.consolidado,
    resumen: initialData.resumen,
    weeks: initialData.weeks,
  };
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) { console.warn('Error saving data', e); }
}

export function resetData() {
  localStorage.removeItem(STORAGE_KEY);
  return {
    consolidado: initialData.consolidado,
    resumen: initialData.resumen,
    weeks: initialData.weeks,
  };
}

export function createWeek(numero, rangoTexto, fechaInicio, fechaFin, diasDisponibles) {
  return {
    label: `Semana ${numero} (${rangoTexto})`,
    numero,
    rango: rangoTexto,
    diasDisponibles,
    raw: `Semana ${numero} (${rangoTexto})\r\n${diasDisponibles} Dias`,
  };
}

export function addConsolidadoRow(data, row) {
  return { ...data, consolidado: [...data.consolidado, row] };
}

export function addResumenRow(data, row) {
  return { ...data, resumen: [...data.resumen, row] };
}

export function updateConsolidadoRow(data, index, updated) {
  const consolidado = [...data.consolidado];
  consolidado[index] = { ...consolidado[index], ...updated };
  return { ...data, consolidado };
}

export function updateResumenRow(data, index, updated) {
  const resumen = [...data.resumen];
  resumen[index] = { ...resumen[index], ...updated };
  return { ...data, resumen };
}

export function deleteConsolidadoRow(data, index) {
  return { ...data, consolidado: data.consolidado.filter((_, i) => i !== index) };
}

export function deleteResumenRow(data, index) {
  return { ...data, resumen: data.resumen.filter((_, i) => i !== index) };
}

// AI Heuristic Classification
const DELAY_PATTERNS = [
  { key: 'viaje', label: 'Viaje largo', patterns: ['viaje', 'horas de viaje', 'dia de viaje', 'regreso', 'alta guajira'] },
  { key: 'estructural', label: 'Reparación estructural', patterns: ['estructural', 'pedestal', 'reconstruccion', 'ángulos de soporte', 'daño severo'] },
  { key: 'seguridad', label: 'Parada de seguridad', patterns: ['seguridad', 'paro', 'parada'] },
  { key: 'entrenamiento', label: 'Entrenamiento', patterns: ['entrenamiento', 'capacitación', 'alturas'] },
  { key: 'complejidad', label: 'Complejidad técnica', patterns: ['rotor', 'veleta', 'convertidor', 'manzana', 'soldadura', 'hub', 'biela', 'aspas nuevas', 'restaur'] },
  { key: 'bomba', label: 'Falla de bomba', patterns: ['bomba', 'mal funcionamiento', 'bajo caudal', 'fuga'] },
  { key: 'freno', label: 'Sistema de freno', patterns: ['freno', 'vincha', 'varillas l'] },
  { key: 'clima', label: 'Condiciones externas', patterns: ['paro armado', 'sin salidas', 'no se viaja'] },
  { key: 'materiales', label: 'Falta de materiales/piezas', patterns: ['no disponer', 'rota', 'partido', 'faltaban'] },
];

const REINTERVENTION_PATTERNS = [
  { key: 'bomba_falla', label: 'Falla de bomba', patterns: ['bomba', 'no hay agua', 'falla de bomba', 'bajo caudal'] },
  { key: 'freno_falla', label: 'Falla de freno', patterns: ['freno', 'sin freno'] },
  { key: 'fuga', label: 'Fuga', patterns: ['fuga', 'flanche'] },
  { key: 'aspas', label: 'Problema de aspas/rotor', patterns: ['aspas', 'rotor', 'manzana'] },
  { key: 'sabotaje', label: 'Sabotaje/Objetos extraños', patterns: ['objetos', 'clavos', 'baterias', 'sabotaje'] },
  { key: 'desgaste', label: 'Desgaste prematuro', patterns: ['desgaste', 'deterioro'] },
  { key: 'otro', label: 'Otra causa', patterns: [] },
];

function classifyText(text, patterns) {
  if (!text) return [{ key: 'desconocido', label: 'Sin información' }];
  const lower = text.toLowerCase();
  const matches = patterns.filter(p => p.patterns.some(pat => lower.includes(pat)));
  return matches.length > 0 ? matches : [{ key: 'otro', label: 'Otra causa' }];
}

export function classifyDelayCause(obs, actividades) {
  const combined = `${obs || ''} ${actividades || ''}`;
  return classifyText(combined, DELAY_PATTERNS);
}

export function classifyReinterventionCause(obs, actividades) {
  const combined = `${obs || ''} ${actividades || ''}`;
  return classifyText(combined, REINTERVENTION_PATTERNS);
}

export function generateDelayExplanation(row) {
  const causes = classifyDelayCause(row.observaciones, row.actividades);
  const labels = causes.map(c => c.label).join(', ');
  const dias = row.diasUtilizados || getDaysDiff(row.fechaInicio, row.fechaFin);
  const comunidad = row.comunidad || row.comunidadFull || '';
  return `${comunidad} tardó ${dias} día(s). Causa(s): ${labels}. ${row.observaciones || ''}`.trim();
}

export function getDaysDiff(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  return Math.ceil((e - s) / 86400000) + 1;
}

export function getMonthsDiff(first, current) {
  if (!first || !current) return null;
  const f = new Date(first);
  const c = new Date(current);
  return ((c - f) / (1000 * 60 * 60 * 24 * 30.44)).toFixed(1);
}

export function getStats(data, crewFilter) {
  let consolidado = data.consolidado;
  let resumen = data.resumen;
  if (crewFilter && crewFilter !== 'Todas') {
    consolidado = consolidado.filter(r => r.cuadrilla === crewFilter);
    resumen = resumen.filter(r => r.cuadrilla === crewFilter);
  }

  const total = consolidado.length;
  const nuevas = consolidado.filter(r => r.categoria === 'MANTENIMIENTO GENERAL').length;
  const reintervenciones = consolidado.filter(r => r.categoria === 'REINTERVENCION').length;

  const diasTotal = resumen.reduce((s, r) => s + (parseFloat(r.diasUtilizados) || 0), 0);
  const promedioDias = total > 0 ? (diasTotal / total).toFixed(2) : 0;
  const rendimiento = diasTotal > 0 ? (total / diasTotal).toFixed(2) : 0;
  // Meta only applies to new interventions (MANTENIMIENTO GENERAL)
  const resumenNuevas = resumen.filter(r => r.actividades === 'MANTENIMIENTO GENERAL');
  const metaCumplidas = resumenNuevas.filter(r => (parseFloat(r.diasUtilizados) || 0) <= 2).length;
  const metaPct = resumenNuevas.length > 0 ? ((metaCumplidas / resumenNuevas.length) * 100).toFixed(1) : 0;
  const exceden = resumenNuevas.filter(r => (parseFloat(r.diasUtilizados) || 0) > 2);

  const porMunicipio = {};
  consolidado.forEach(r => {
    porMunicipio[r.municipio] = (porMunicipio[r.municipio] || 0) + 1;
  });

  const semanasActivas = new Set(consolidado.map(r => r.semana)).size;

  // Weekly data for charts
  const weeklyData = data.weeks.map(w => {
    const weekCons = consolidado.filter(r => r.semana === w.label);
    const weekRes = resumen.filter(r => {
      const raw = r.semana || '';
      return raw.includes(w.label) || raw.startsWith(w.label);
    });
    const n = weekCons.filter(r => r.categoria === 'MANTENIMIENTO GENERAL').length;
    const re = weekCons.filter(r => r.categoria === 'REINTERVENCION').length;
    const dias = weekRes.reduce((s, r) => s + (parseFloat(r.diasUtilizados) || 0), 0);
    return { name: `S${w.numero}`, nuevas: n, reintervenciones: re, total: n + re, dias, diasDisponibles: w.diasDisponibles };
  });

  // Top 3 most complex
  const withDias = consolidado.map((r, i) => {
    const matchRes = resumen.find(rr => rr.comunidad === r.comunidadFull || rr.comunidad === r.comunidad);
    const d = matchRes ? parseFloat(matchRes.diasUtilizados) || 0 : getDaysDiff(r.fechaInicio, r.fechaFin);
    return { ...r, dias: d, idx: i };
  }).sort((a, b) => b.dias - a.dias).slice(0, 3);

  // Delay cause distribution
  const delayCauseDist = {};
  exceden.forEach(r => {
    const matchCons = consolidado.find(c => (c.comunidadFull || c.comunidad) === r.comunidad || c.comunidad === r.comunidad);
    const causes = classifyDelayCause(r.observaciones + ' ' + (matchCons?.observaciones || ''), matchCons?.actividades || '');
    causes.forEach(c => { delayCauseDist[c.label] = (delayCauseDist[c.label] || 0) + 1; });
  });

  // Reintervention cause distribution
  const reintCauseDist = {};
  const reints = consolidado.filter(r => r.categoria === 'REINTERVENCION');
  reints.forEach(r => {
    const causes = classifyReinterventionCause(r.observaciones, r.actividades);
    causes.forEach(c => { reintCauseDist[c.label] = (reintCauseDist[c.label] || 0) + 1; });
  });

  // Reintervention time gaps
  const reintGaps = reints.filter(r => r.fechaPrimeraIntervencion && r.fechaInicio).map(r => ({
    comunidad: r.comunidadFull || r.comunidad,
    meses: getMonthsDiff(r.fechaPrimeraIntervencion, r.fechaInicio),
    fechaPrimera: r.fechaPrimeraIntervencion,
    fechaReint: r.fechaInicio,
  }));

  return {
    total, nuevas, reintervenciones, diasTotal, promedioDias, rendimiento,
    metaCumplidas, metaPct, exceden, porMunicipio, semanasActivas,
    weeklyData, withDias, delayCauseDist, reintCauseDist, reintGaps,
  };
}

export function getCrews(data) {
  return [...new Set(data.consolidado.map(r => r.cuadrilla).concat(data.resumen.map(r => r.cuadrilla)).filter(Boolean))];
}
