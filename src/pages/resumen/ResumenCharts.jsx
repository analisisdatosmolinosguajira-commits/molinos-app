import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Line, PieChart, Pie, Cell, ComposedChart, Area,
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#ec4899'];

function ChartCard({ title, children }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <h4 className="text-sm font-semibold text-emerald-300 mb-4">{title}</h4>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-2.5 shadow-xl text-xs">
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex justify-between gap-4">
          <span>{p.name}:</span> <span className="font-mono font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

function getDayColor(dias) {
  if (dias <= 1) return '#10b981';
  if (dias <= 2) return '#22c55e';
  if (dias <= 3) return '#f59e0b';
  if (dias <= 4) return '#f97316';
  return '#ef4444';
}

function InterventionMap({ mapData }) {
  const center = useMemo(() => {
    if (!mapData.length) return [11.55, -72.55];
    const avgLat = mapData.reduce((s, p) => s + p.lat, 0) / mapData.length;
    const avgLng = mapData.reduce((s, p) => s + p.lng, 0) / mapData.length;
    return [avgLat, avgLng];
  }, [mapData]);

  const maxDias = useMemo(() => Math.max(...mapData.map(p => p.dias), 1), [mapData]);

  if (!mapData.length) {
    return <p className="text-xs text-slate-500 text-center py-8">Sin datos con coordenadas</p>;
  }

  return (
    <div className="rounded-lg overflow-hidden border border-slate-700/50" style={{ height: 380 }}>
      <MapContainer center={center} zoom={8} style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true} attributionControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        {mapData.map((point, i) => {
          const color = getDayColor(point.dias);
          const radius = 8 + (point.dias / maxDias) * 14;
          return (
            <CircleMarker key={i} center={[point.lat, point.lng]}
              radius={radius} fillColor={color} color={color}
              weight={2} opacity={0.9} fillOpacity={0.6}>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <strong style={{ fontSize: 13 }}>{point.comunidad}</strong><br />
                  <span style={{ fontSize: 11, color: '#666' }}>{point.municipio}</span>
                  <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #ddd' }} />
                  <div style={{ fontSize: 12 }}>
                    <strong style={{ color }}>{point.dias} día(s)</strong> empleados
                  </div>
                  <div style={{ fontSize: 11, color: '#888' }}>
                    {point.intervenciones} intervención(es) · {point.categoria}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <div className="flex items-center justify-center gap-4 py-2 bg-slate-800/80 text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block" style={{ background: '#10b981' }} /> 1 día</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block" style={{ background: '#22c55e' }} /> 2 días</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block" style={{ background: '#f59e0b' }} /> 3 días</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block" style={{ background: '#f97316' }} /> 4 días</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block" style={{ background: '#ef4444' }} /> 5+ días</span>
      </div>
    </div>
  );
}

export default function ResumenCharts({ stats }) {
  const { weeklyData, delayCauseDist, reintCauseDist, mapData } = stats;

  const delayCauseData = Object.entries(delayCauseDist).map(([name, value]) => ({ name, value }));
  const reintCauseData = Object.entries(reintCauseDist).map(([name, value]) => ({ name, value }));

  let cumul = 0;
  const trendData = weeklyData.map(w => {
    cumul += w.total;
    return { ...w, acumulado: cumul };
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="📊 Intervenciones por Semana (Nuevas vs Reintervenciones)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="nuevas" name="Mant. General" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="reintervenciones" name="Reintervención" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="📈 Tendencia Semanal (Nuevas, Reintervenciones, Total)">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area yAxisId="right" dataKey="acumulado" name="Acumulado" fill="#3b82f6" fillOpacity={0.1} stroke="#3b82f6" strokeDasharray="4 4" />
              <Line yAxisId="left" dataKey="total" name="Total" stroke="#ffffff" strokeWidth={2.5} dot={{ r: 4, fill: '#ffffff' }} />
              <Line yAxisId="left" dataKey="nuevas" name="Mant. General" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
              <Line yAxisId="left" dataKey="reintervenciones" name="Reintervención" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="🔍 Causas de Demora (IA)">
          {delayCauseData.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">Sin demoras detectadas</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={delayCauseData} cx="50%" cy="50%" outerRadius={90} innerRadius={40}
                  dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: '#64748b' }}>
                  {delayCauseData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="🔄 Causas de Reintervención (IA)">
          {reintCauseData.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">Sin reintervenciones</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={reintCauseData} cx="50%" cy="50%" outerRadius={90} innerRadius={40}
                  dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: '#64748b' }}>
                  {reintCauseData.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="🗺️ Mapa de Intervenciones — Temperatura por Días Empleados">
        <InterventionMap mapData={mapData || []} />
      </ChartCard>
    </div>
  );
}
