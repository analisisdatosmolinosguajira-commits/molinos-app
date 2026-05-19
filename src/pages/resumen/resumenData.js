import { supabase } from '../../services/supabase';

// ── Map DB rows to frontend format ──────────────────────────

function mapConsolidadoFromDB(row) {
  return {
    id: row.id,
    cuadrilla: row.cuadrilla,
    municipio: row.municipio,
    comunidad: row.comunidad,
    comunidadFull: row.comunidad_full,
    coordenadas: row.coordenadas || '',
    semana: row.semana,
    categoria: row.categoria,
    actividades: row.actividades || '',
    fechaInicio: row.fecha_inicio || '',
    fechaFin: row.fecha_fin || '',
    fechaPrimeraIntervencion: row.fecha_primera_intervencion || '',
    observaciones: row.observaciones || '',
    diferenciaMeses: row.diferencia_meses || '',
  };
}

function mapResumenFromDB(row) {
  return {
    id: row.id,
    cuadrilla: row.cuadrilla,
    semana: row.semana,
    comunidad: row.comunidad,
    actividades: row.actividades,
    diasUtilizados: parseFloat(row.dias_utilizados) || 0,
    observaciones: row.observaciones || '',
  };
}

function mapWeekFromDB(row) {
  return {
    id: row.id,
    label: row.label,
    numero: row.numero,
    rango: row.rango,
    diasDisponibles: row.dias_disponibles,
    raw: row.raw,
  };
}

// ── Load all data from Supabase ────────────────────────────

export async function loadData() {
  try {
    const [consRes, sumRes, weeksRes] = await Promise.all([
      supabase.from('resumen_consolidado').select('*').order('id'),
      supabase.from('resumen_summary').select('*').order('id'),
      supabase.from('resumen_weeks').select('*').order('numero'),
    ]);

    return {
      consolidado: (consRes.data || []).map(mapConsolidadoFromDB),
      resumen: (sumRes.data || []).map(mapResumenFromDB),
      weeks: (weeksRes.data || []).map(mapWeekFromDB),
    };
  } catch (e) {
    console.error('Error loading data from Supabase', e);
    return { consolidado: [], resumen: [], weeks: [] };
  }
}

// ── CRUD Operations ────────────────────────────────────────

export async function addConsolidadoRow(row) {
  const { data, error } = await supabase.from('resumen_consolidado').insert({
    cuadrilla: row.cuadrilla || '',
    municipio: row.municipio || '',
    comunidad: row.comunidad || '',
    comunidad_full: row.comunidadFull || row.comunidad || '',
    coordenadas: row.coordenadas || '',
    semana: row.semana || '',
    categoria: row.categoria || 'MANTENIMIENTO GENERAL',
    actividades: row.actividades || '',
    fecha_inicio: row.fechaInicio || '',
    fecha_fin: row.fechaFin || '',
    fecha_primera_intervencion: row.fechaPrimeraIntervencion || '',
    observaciones: row.observaciones || '',
    diferencia_meses: row.diferenciaMeses || '',
  }).select().single();
  if (error) throw error;
  return mapConsolidadoFromDB(data);
}

export async function addResumenRow(row) {
  const { data, error } = await supabase.from('resumen_summary').insert({
    cuadrilla: row.cuadrilla || '',
    semana: row.semana || '',
    comunidad: row.comunidad || '',
    actividades: row.actividades || 'MANTENIMIENTO GENERAL',
    dias_utilizados: parseFloat(row.diasUtilizados) || 0,
    observaciones: row.observaciones || '',
  }).select().single();
  if (error) throw error;
  return mapResumenFromDB(data);
}

export async function updateConsolidadoRow(id, updates) {
  const dbUpdates = {};
  if (updates.cuadrilla !== undefined) dbUpdates.cuadrilla = updates.cuadrilla;
  if (updates.municipio !== undefined) dbUpdates.municipio = updates.municipio;
  if (updates.comunidad !== undefined) dbUpdates.comunidad = updates.comunidad;
  if (updates.comunidadFull !== undefined) dbUpdates.comunidad_full = updates.comunidadFull;
  if (updates.coordenadas !== undefined) dbUpdates.coordenadas = updates.coordenadas;
  if (updates.semana !== undefined) dbUpdates.semana = updates.semana;
  if (updates.categoria !== undefined) dbUpdates.categoria = updates.categoria;
  if (updates.actividades !== undefined) dbUpdates.actividades = updates.actividades;
  if (updates.fechaInicio !== undefined) dbUpdates.fecha_inicio = updates.fechaInicio;
  if (updates.fechaFin !== undefined) dbUpdates.fecha_fin = updates.fechaFin;
  if (updates.fechaPrimeraIntervencion !== undefined) dbUpdates.fecha_primera_intervencion = updates.fechaPrimeraIntervencion;
  if (updates.observaciones !== undefined) dbUpdates.observaciones = updates.observaciones;
  if (updates.diferenciaMeses !== undefined) dbUpdates.diferencia_meses = updates.diferenciaMeses;

  const { error } = await supabase.from('resumen_consolidado').update(dbUpdates).eq('id', id);
  if (error) throw error;
}

export async function updateResumenRow(id, updates) {
  const dbUpdates = {};
  if (updates.cuadrilla !== undefined) dbUpdates.cuadrilla = updates.cuadrilla;
  if (updates.semana !== undefined) dbUpdates.semana = updates.semana;
  if (updates.comunidad !== undefined) dbUpdates.comunidad = updates.comunidad;
  if (updates.actividades !== undefined) dbUpdates.actividades = updates.actividades;
  if (updates.diasUtilizados !== undefined) dbUpdates.dias_utilizados = parseFloat(updates.diasUtilizados) || 0;
  if (updates.observaciones !== undefined) dbUpdates.observaciones = updates.observaciones;

  const { error } = await supabase.from('resumen_summary').update(dbUpdates).eq('id', id);
  if (error) throw error;
}

export async function deleteConsolidadoRow(id) {
  const { error } = await supabase.from('resumen_consolidado').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteResumenRow(id) {
  const { error } = await supabase.from('resumen_summary').delete().eq('id', id);
  if (error) throw error;
}

export async function addWeek(week) {
  const { data, error } = await supabase.from('resumen_weeks').insert({
    numero: week.numero,
    label: week.label,
    rango: week.rango || '',
    dias_disponibles: week.diasDisponibles || 0,
    raw: week.raw || '',
  }).select().single();
  if (error) throw error;
  return mapWeekFromDB(data);
}

// ── Bulk paste support ─────────────────────────────────────

export async function bulkInsertConsolidado(rows) {
  const dbRows = rows.map(r => ({
    cuadrilla: r.cuadrilla || '',
    municipio: r.municipio || '',
    comunidad: r.comunidad || '',
    comunidad_full: r.comunidadFull || r.comunidad || '',
    coordenadas: r.coordenadas || '',
    semana: r.semana || '',
    categoria: r.categoria || 'MANTENIMIENTO GENERAL',
    actividades: r.actividades || '',
    fecha_inicio: r.fechaInicio || '',
    fecha_fin: r.fechaFin || '',
    fecha_primera_intervencion: r.fechaPrimeraIntervencion || '',
    observaciones: r.observaciones || '',
    diferencia_meses: r.diferenciaMeses || '',
  }));
  const { data, error } = await supabase.from('resumen_consolidado').insert(dbRows).select();
  if (error) throw error;
  return (data || []).map(mapConsolidadoFromDB);
}

export async function bulkInsertResumen(rows) {
  const dbRows = rows.map(r => ({
    cuadrilla: r.cuadrilla || '',
    semana: r.semana || '',
    comunidad: r.comunidad || '',
    actividades: r.actividades || 'MANTENIMIENTO GENERAL',
    dias_utilizados: parseFloat(r.diasUtilizados) || 0,
    observaciones: r.observaciones || '',
  }));
  const { data, error } = await supabase.from('resumen_summary').insert(dbRows).select();
  if (error) throw error;
  return (data || []).map(mapResumenFromDB);
}

// ── AI Heuristic Classification ────────────────────────────

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

// ── Statistics (computed from loaded data) ──────────────────

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

  // Separate averages by category
  const resumenNuevas = resumen.filter(r => r.actividades === 'MANTENIMIENTO GENERAL');
  const resumenReint = resumen.filter(r => r.actividades === 'REINTERVENCION');
  const diasNuevas = resumenNuevas.reduce((s, r) => s + (parseFloat(r.diasUtilizados) || 0), 0);
  const diasReint = resumenReint.reduce((s, r) => s + (parseFloat(r.diasUtilizados) || 0), 0);

  // Group by community to sum days across weeks (same intervention split in 2 weeks)
  const nuevasGrouped = {};
  resumenNuevas.forEach(r => {
    const key = r.comunidad;
    if (!nuevasGrouped[key]) nuevasGrouped[key] = { comunidad: key, diasTotal: 0, semanas: [], observaciones: [] };
    nuevasGrouped[key].diasTotal += parseFloat(r.diasUtilizados) || 0;
    nuevasGrouped[key].semanas.push(r.semana);
    if (r.observaciones) nuevasGrouped[key].observaciones.push(r.observaciones);
  });
  const nuevasGroupedArr = Object.values(nuevasGrouped);
  const totalNuevasUnicas = nuevasGroupedArr.length;
  const promedioDiasNuevas = totalNuevasUnicas > 0 ? (diasNuevas / totalNuevasUnicas).toFixed(2) : 0;

  const reintGrouped = {};
  resumenReint.forEach(r => {
    const key = r.comunidad;
    if (!reintGrouped[key]) reintGrouped[key] = { comunidad: key, diasTotal: 0, semanas: [] };
    reintGrouped[key].diasTotal += parseFloat(r.diasUtilizados) || 0;
    reintGrouped[key].semanas.push(r.semana);
  });
  const totalReintUnicas = Object.keys(reintGrouped).length;
  const promedioDiasReint = totalReintUnicas > 0 ? (diasReint / totalReintUnicas).toFixed(2) : 0;

  // Meta: <=2 days per unique new intervention (grouped by community)
  const metaCumplidas = nuevasGroupedArr.filter(g => g.diasTotal <= 2).length;
  const metaPct = totalNuevasUnicas > 0 ? ((metaCumplidas / totalNuevasUnicas) * 100).toFixed(1) : 0;
  const exceden = nuevasGroupedArr.filter(g => g.diasTotal > 2).map(g => ({
    comunidad: g.comunidad,
    diasUtilizados: g.diasTotal,
    observaciones: g.observaciones.join(' | '),
    semanas: g.semanas.join(', '),
  }));

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
  // Map data: group by community, sum days, include coordinates
  const mapGrouped = {};
  consolidado.forEach(r => {
    if (!r.coordenadas) return;
    const coords = r.coordenadas.split(',').map(c => parseFloat(c.trim()));
    if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return;
    // Fix known bad longitudes (positive instead of negative for La Guajira)
    let [lat, lng] = coords;
    if (lng > 0) lng = -lng;
    const key = (r.comunidadFull || r.comunidad).toUpperCase();
    if (!mapGrouped[key]) {
      mapGrouped[key] = { comunidad: r.comunidadFull || r.comunidad, lat, lng, dias: 0, categoria: r.categoria, municipio: r.municipio, intervenciones: 0 };
    }
    // Find matching resumen days
    const matchRes = resumen.find(rr => rr.comunidad === r.comunidadFull || rr.comunidad === r.comunidad);
    const d = matchRes ? parseFloat(matchRes.diasUtilizados) || 0 : getDaysDiff(r.fechaInicio, r.fechaFin);
    mapGrouped[key].dias += d;
    mapGrouped[key].intervenciones += 1;
  });
  const mapData = Object.values(mapGrouped);

  return {
    total, nuevas, reintervenciones, totalNuevasUnicas, diasTotal, diasNuevas, diasReint, promedioDias, promedioDiasNuevas, promedioDiasReint, rendimiento,
    metaCumplidas, metaPct, exceden, porMunicipio, semanasActivas,
    weeklyData, withDias, delayCauseDist, reintCauseDist, reintGaps, mapData,
  };
}

export function getCrews(data) {
  return [...new Set(data.consolidado.map(r => r.cuadrilla).concat(data.resumen.map(r => r.cuadrilla)).filter(Boolean))];
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
