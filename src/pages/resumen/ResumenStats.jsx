import React from 'react';
import { Wind, RefreshCw, Target, Clock, TrendingUp, MapPin, AlertTriangle, CalendarDays } from 'lucide-react';

function KPICard({ icon: Icon, label, value, sub, color = 'emerald' }) {
  const colors = {
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
    red: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-400',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
    cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-400',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4 flex flex-col gap-1 transition-transform hover:scale-[1.02]`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} className="opacity-70" />
        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <span className="text-2xl font-bold text-white">{value}</span>
      {sub && <span className="text-[11px] text-slate-400">{sub}</span>}
    </div>
  );
}

function KPIGroup({ title, children }) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-3">
      <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">{title}</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {children}
      </div>
    </div>
  );
}

export default function ResumenStats({ stats }) {
  const {
    total, nuevas, reintervenciones, totalNuevasUnicas, diasTotal, diasNuevas, diasReint,
    promedioDias, promedioDiasNuevas, promedioDiasReint, rendimiento,
    metaPct, metaCumplidas, exceden, porMunicipio,
    withDias, reintGaps,
  } = stats;

  return (
    <div className="space-y-4">
      {/* Group 1: Intervenciones + Meta */}
      <KPIGroup title="Intervenciones y Meta">
        <KPICard icon={Wind} label="Total" value={total} color="emerald" />
        <KPICard icon={Wind} label="Nuevas" value={nuevas} sub={`${total > 0 ? ((nuevas/total)*100).toFixed(0) : 0}%`} color="blue" />
        <KPICard icon={RefreshCw} label="Reintervenciones" value={reintervenciones} sub={`${total > 0 ? ((reintervenciones/total)*100).toFixed(0) : 0}%`} color="amber" />
        <KPICard icon={Target} label="Meta (≤2 días)" value={`${metaPct}%`} sub={`${metaCumplidas} de ${totalNuevasUnicas} cumplen`}
          color={parseFloat(metaPct) >= 60 ? 'emerald' : 'red'} />
      </KPIGroup>

      {/* Group 2: Salidas + Promedios */}
      <KPIGroup title="Salidas y Rendimiento">
        <KPICard icon={CalendarDays} label="Total Salidas" value={diasTotal} sub="días en campo" color="cyan" />
        <KPICard icon={CalendarDays} label="Salidas Nuevas" value={diasNuevas} sub="intervenciones nuevas" color="blue" />
        <KPICard icon={CalendarDays} label="Salidas Reint." value={diasReint} sub="reintervenciones" color="amber" />
        <KPICard icon={TrendingUp} label="Rendimiento" value={rendimiento} sub="molinos/día" color="purple" />
      </KPIGroup>

      {/* Group 3: Promedios */}
      <div className="grid grid-cols-3 gap-2">
        <KPICard icon={Clock} label="Días/Intervención" value={promedioDias} sub="general" color="cyan" />
        <KPICard icon={Clock} label="Días/Nueva" value={promedioDiasNuevas} sub="mantenimiento general" color="blue" />
        <KPICard icon={Clock} label="Días/Reintervención" value={promedioDiasReint} sub="reintervenciones" color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Exceden meta */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} /> Nuevas que exceden meta ({'>'}2 días)
          </h4>
          {exceden.length === 0 ? (
            <p className="text-xs text-slate-500">¡Todas cumplen la meta!</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-auto">
              {exceden.map((r, i) => (
                <div key={i} className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-white">{r.comunidad}</span>
                    <span className="text-red-400 font-mono font-bold">{r.diasUtilizados} días</span>
                  </div>
                  {r.semanas && <p className="text-[10px] text-slate-500 mt-0.5">{r.semanas}</p>}
                  {r.observaciones && <p className="text-slate-400 mt-1 text-[10px] leading-relaxed">{r.observaciones}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Distribución por municipio */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
            <MapPin size={14} /> Distribución por Municipio
          </h4>
          <div className="space-y-2">
            {Object.entries(porMunicipio).sort((a, b) => b[1] - a[1]).map(([mun, count]) => (
              <div key={mun} className="flex items-center gap-3">
                <span className="text-xs text-slate-300 w-32 truncate">{mun}</span>
                <div className="flex-1 bg-slate-700/50 rounded-full h-4 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                    style={{ width: `${(count / total) * 100}%` }} />
                </div>
                <span className="text-xs font-mono text-emerald-400 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 3 más complejas */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-purple-400 mb-3">🏆 Top 3 Intervenciones Más Complejas</h4>
          <div className="space-y-2">
            {withDias.map((r, i) => (
              <div key={i} className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-xs">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-white flex items-center gap-1">
                    <span className="text-lg">{['🥇','🥈','🥉'][i]}</span> {r.comunidadFull || r.comunidad}
                  </span>
                  <span className="text-purple-400 font-mono font-bold">{r.dias} días</span>
                </div>
                <p className="text-slate-400 text-[10px] leading-relaxed line-clamp-2">{r.actividades}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Reintervenciones - tiempo desde primera */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-amber-400 mb-3">⏳ Reintervenciones — Tiempo desde 1ra Intervención</h4>
          {reintGaps.length === 0 ? (
            <p className="text-xs text-slate-500">Sin datos de reintervención</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-auto">
              {reintGaps.sort((a, b) => parseFloat(b.meses) - parseFloat(a.meses)).map((r, i) => (
                <div key={i} className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-white">{r.comunidad}</span>
                    <div className="text-[10px] text-slate-400 mt-0.5">{r.fechaPrimera} → {r.fechaReint}</div>
                  </div>
                  <span className="text-amber-400 font-mono font-bold">{r.meses} meses</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
