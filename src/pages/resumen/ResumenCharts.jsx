import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ComposedChart, Area,
} from 'recharts';

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

export default function ResumenCharts({ stats }) {
  const { weeklyData, delayCauseDist, reintCauseDist } = stats;

  const delayCauseData = Object.entries(delayCauseDist).map(([name, value]) => ({ name, value }));
  const reintCauseData = Object.entries(reintCauseDist).map(([name, value]) => ({ name, value }));

  // Trend: cumulative interventions
  let cumul = 0;
  const trendData = weeklyData.map(w => {
    cumul += w.total;
    return { ...w, acumulado: cumul, rendimiento: w.dias > 0 ? (w.total / w.dias).toFixed(2) : 0 };
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stacked bar: nuevas vs reintervenciones */}
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

        {/* Line: trend with nuevas, reintervenciones, total */}
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

        {/* Pie: delay causes */}
        <ChartCard title="🔍 Distribución de Causas de Demora (IA)">
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

        {/* Pie: reintervention causes */}
        <ChartCard title="🔄 Distribución de Causas de Reintervención (IA)">
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

      {/* Days per intervention bar chart */}
      <ChartCard title="⏱️ Días por Intervención vs Meta (2 días)">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="dias" name="Días ejecutados" fill="#14b8a6" radius={[0, 4, 4, 0]} />
            <Bar dataKey="diasDisponibles" name="Días disponibles" fill="#334155" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
