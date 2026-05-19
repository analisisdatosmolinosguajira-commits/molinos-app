import React from 'react';
import { Brain, AlertTriangle, RefreshCw } from 'lucide-react';
import { classifyDelayCause, classifyReinterventionCause, getDaysDiff } from './resumenData';

export default function ResumenAIAnalysis({ data, crewFilter }) {
  let consolidado = data.consolidado;
  let resumen = data.resumen;
  if (crewFilter && crewFilter !== 'Todas') {
    consolidado = consolidado.filter(r => r.cuadrilla === crewFilter);
    resumen = resumen.filter(r => r.cuadrilla === crewFilter);
  }

  // Delay analysis: interventions > 2 days
  const delayAnalysis = resumen
    .filter(r => parseFloat(r.diasUtilizados) > 2)
    .map(r => {
      const matchCons = consolidado.find(c =>
        (c.comunidadFull || c.comunidad) === r.comunidad || c.comunidad === r.comunidad
      );
      const allObs = `${r.observaciones || ''} ${matchCons?.observaciones || ''}`;
      const allAct = matchCons?.actividades || '';
      const causes = classifyDelayCause(allObs, allAct);
      return {
        comunidad: r.comunidad,
        dias: r.diasUtilizados,
        causes,
        observaciones: allObs.trim(),
        actividades: allAct,
        explanation: buildDelayExplanation(r.comunidad, r.diasUtilizados, causes, allObs, allAct),
      };
    });

  // Reintervention analysis
  const reintAnalysis = consolidado
    .filter(r => r.categoria === 'REINTERVENCION')
    .map(r => {
      const causes = classifyReinterventionCause(r.observaciones, r.actividades);
      return {
        comunidad: r.comunidadFull || r.comunidad,
        causes,
        observaciones: r.observaciones,
        actividades: r.actividades,
        fechaPrimera: r.fechaPrimeraIntervencion,
        explanation: buildReintExplanation(r.comunidadFull || r.comunidad, causes, r.observaciones, r.actividades),
      };
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Brain size={18} className="text-purple-400" />
          <h3 className="text-sm font-bold text-purple-300">Análisis Inteligente de Ejecución</h3>
        </div>
        <p className="text-[11px] text-slate-400">
          Clasificación automática basada en análisis de texto de observaciones y actividades.
          El sistema identifica patrones clave para categorizar causas de demora y reintervención.
        </p>
      </div>

      {/* Delay Analysis */}
      <div>
        <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
          <AlertTriangle size={14} /> Análisis de Demoras ({'>'}2 días) — {delayAnalysis.length} casos
        </h4>
        {delayAnalysis.length === 0 ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
            <p className="text-xs text-emerald-400">✅ Sin demoras significativas detectadas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {delayAnalysis.map((item, i) => (
              <div key={i} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="font-semibold text-white text-sm">{item.comunidad}</span>
                  <span className="text-red-400 font-mono font-bold text-sm">{item.dias} días</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {item.causes.map((c, j) => (
                    <span key={j} className="px-2 py-0.5 bg-red-500/15 border border-red-500/20 rounded-full text-[10px] font-medium text-red-300">
                      {c.label}
                    </span>
                  ))}
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 border-l-2 border-purple-500/50">
                  <p className="text-xs text-slate-300 leading-relaxed italic">
                    🤖 {item.explanation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reintervention Analysis */}
      <div>
        <h4 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
          <RefreshCw size={14} /> Análisis de Reintervenciones — {reintAnalysis.length} casos
        </h4>
        {reintAnalysis.length === 0 ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
            <p className="text-xs text-emerald-400">✅ Sin reintervenciones</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reintAnalysis.map((item, i) => (
              <div key={i} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="font-semibold text-white text-sm">{item.comunidad}</span>
                  {item.fechaPrimera && (
                    <span className="text-[10px] text-slate-400">1ra: {item.fechaPrimera}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {item.causes.map((c, j) => (
                    <span key={j} className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/20 rounded-full text-[10px] font-medium text-amber-300">
                      {c.label}
                    </span>
                  ))}
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 border-l-2 border-amber-500/50">
                  <p className="text-xs text-slate-300 leading-relaxed italic">
                    🤖 {item.explanation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function buildDelayExplanation(comunidad, dias, causes, obs, act) {
  const causeLabels = causes.map(c => c.label).join(', ');
  let explanation = `La intervención en ${comunidad} tomó ${dias} día(s), excediendo la meta de 2 días.`;
  explanation += ` Causas identificadas: ${causeLabels}.`;
  if (obs && obs.trim().length > 5) {
    const clean = obs.replace(/\r\n/g, ' ').replace(/\n/g, ' ').trim();
    if (clean.length > 150) {
      explanation += ` Observaciones: "${clean.substring(0, 150)}..."`;
    } else {
      explanation += ` Observaciones: "${clean}"`;
    }
  }
  return explanation;
}

function buildReintExplanation(comunidad, causes, obs, act) {
  const causeLabels = causes.map(c => c.label).join(', ');
  let explanation = `${comunidad} requirió reintervención.`;
  explanation += ` Causa probable: ${causeLabels}.`;
  if (obs && obs.trim().length > 5) {
    const clean = obs.replace(/\r\n/g, ' ').replace(/\n/g, ' ').trim();
    if (clean.length > 150) {
      explanation += ` Detalle: "${clean.substring(0, 150)}..."`;
    } else {
      explanation += ` Detalle: "${clean}"`;
    }
  }
  return explanation;
}
