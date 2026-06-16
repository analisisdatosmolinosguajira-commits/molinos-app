import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronRight, Activity, Image } from 'lucide-react';
import { SystemService } from '../../services/systems';

// ── Colores por sistema ──────────────────────────────────────────
const SYSTEM_COLORS = {
    'SIS-FRE':     { bg: 'bg-rose-50',    border: 'border-rose-200',    badge: 'bg-rose-100 text-rose-700',    icon: '🛑' },
    'SIS-BOM':     { bg: 'bg-blue-50',    border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700',    icon: '💧' },
    'SIS-CONV':    { bg: 'bg-amber-50',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700',  icon: '⚙️' },
    'SIS-ESTR':    { bg: 'bg-slate-50',   border: 'border-slate-200',   badge: 'bg-slate-100 text-slate-700',  icon: '🏗️' },
    'SIS-ROT-ASP': { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', icon: '🌀' },
    'SIS-PVC':     { bg: 'bg-cyan-50',    border: 'border-cyan-200',    badge: 'bg-cyan-100 text-cyan-700',    icon: '🔧' },
    'AMB':         { bg: 'bg-violet-50',  border: 'border-violet-200',  badge: 'bg-violet-100 text-violet-700', icon: '🌤️' },
};
const DEFAULT_COLOR = { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-700', icon: '📦' };

const ComponentMatrix = ({ systems, onRefresh }) => {
    const [expandedSystem, setExpandedSystem] = useState(null);

    const getStatusIcon = (status) => {
        const icons = {
            'FUNCIONAL': <CheckCircle className="text-green-500" size={16} />,
            'DESGASTADO': <AlertTriangle className="text-yellow-500" size={16} />,
            'DANADO': <XCircle className="text-red-500" size={16} />,
            'REQUIERE_CAMBIO': <XCircle className="text-red-500" size={16} />,
            'NO_INSTALADO': <AlertTriangle className="text-slate-400" size={16} />,
            'AUSENTE': <XCircle className="text-slate-400" size={16} />,
        };
        return icons[status] || icons['FUNCIONAL'];
    };

    const getDeteriorationLevel = (status) => {
        const levels = {
            'FUNCIONAL': 10,
            'DESGASTADO': 60,
            'DANADO': 90,
            'REQUIERE_CAMBIO': 100,
            'NO_INSTALADO': 0,
            'AUSENTE': 100,
            'NO_INSPECCIONADO': 0
        };
        return levels[status] || 0;
    };

    const getStatusColor = (level) => {
        if (level >= 80) return 'bg-red-500';
        if (level >= 40) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    if (!systems || systems.length === 0) {
        return (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-500">No hay sistemas o componentes registrados para este molino</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {systems.map((sys) => {
                const isExpanded = expandedSystem === sys.component_id;
                const colors = SYSTEM_COLORS[sys.code] || DEFAULT_COLOR;
                const photos = Array.isArray(sys.photo_urls) ? sys.photo_urls : [];

                return (
                    <div key={sys.component_id} className={`border ${colors.border} rounded-2xl overflow-hidden shadow-sm transition-all bg-white`}>
                        {/* System Header */}
                        <div 
                            className={`flex items-center justify-between p-4 cursor-pointer hover:brightness-95 transition-all ${colors.bg}`}
                            onClick={() => setExpandedSystem(isExpanded ? null : sys.component_id)}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{colors.icon}</span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${colors.badge}`}>{sys.code}</span>
                                        <h3 className="font-bold text-slate-900">{sys.name}</h3>
                                    </div>
                                    <div className="flex items-center gap-4 mt-1">
                                        <p className="text-xs text-slate-500">
                                            {sys.health.total} componentes • <span className="text-green-600 font-semibold">{sys.health.ok} funcionales</span>
                                        </p>
                                        {sys.health.warn > 0 && <span className="text-xs text-yellow-600 font-semibold flex items-center gap-1"><AlertTriangle size={10} /> {sys.health.warn} advertencia</span>}
                                        {sys.health.critical > 0 && <span className="text-xs text-red-600 font-semibold flex items-center gap-1"><XCircle size={10} /> {sys.health.critical} crítico</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Overall Health Indicator */}
                                <div className="hidden sm:flex flex-col items-end">
                                    <div className="text-xs font-bold text-slate-400 mb-1">Salud del Sistema</div>
                                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden flex">
                                        <div className="bg-green-500 h-full" style={{ width: `${(sys.health.ok / Math.max(sys.health.total, 1)) * 100}%` }} />
                                        <div className="bg-yellow-500 h-full" style={{ width: `${(sys.health.warn / Math.max(sys.health.total, 1)) * 100}%` }} />
                                        <div className="bg-red-500 h-full" style={{ width: `${(sys.health.critical / Math.max(sys.health.total, 1)) * 100}%` }} />
                                    </div>
                                </div>
                                
                                {isExpanded ? (
                                    <ChevronDown size={20} className="text-slate-400" />
                                ) : (
                                    <ChevronRight size={20} className="text-slate-400" />
                                )}
                            </div>
                        </div>

                        {/* System Content (Components) */}
                        {isExpanded && (
                            <div className="border-t border-slate-100 p-4">
                                {photos.length > 0 && (
                                    <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-3">
                                            <Image size={14} /> Fotos de Referencia del Sistema
                                        </h4>
                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                            {photos.map((url, i) => (
                                                <a href={url} target="_blank" rel="noopener noreferrer" key={i} className="flex-shrink-0">
                                                    <img src={url} alt={`Referencia ${i}`} className="h-20 w-20 object-cover rounded-lg border border-slate-200 shadow-sm hover:opacity-80 transition-opacity" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {sys.components.length === 0 ? (
                                        <p className="text-sm text-slate-500 text-center py-4">No hay componentes registrados en este sistema.</p>
                                    ) : (
                                        sys.components.map((comp) => {
                                            const deterioration = getDeteriorationLevel(comp.status);
                                            return (
                                                <div key={comp.component_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-100">
                                                    <div className="flex items-center gap-3 flex-1">
                                                        {getStatusIcon(comp.status)}
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-xs font-bold text-slate-500">{comp.code}</span>
                                                                <span className="font-semibold text-slate-800 text-sm">{comp.name}</span>
                                                            </div>
                                                            {comp.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{comp.description}</p>}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4 flex-shrink-0">
                                                        {/* Installed Date */}
                                                        <div className="hidden sm:block text-right">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Instalación</span>
                                                            <p className="text-xs font-mono text-slate-600">{comp.installed_date ? new Date(comp.installed_date).toLocaleDateString() : 'N/D'}</p>
                                                        </div>

                                                        {/* Status Badge */}
                                                        <span className={`w-28 text-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                            comp.status === 'FUNCIONAL' ? 'bg-green-100 text-green-700 border border-green-200' :
                                                            comp.status === 'DESGASTADO' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                                            'bg-red-100 text-red-700 border border-red-200'
                                                        }`}>
                                                            {comp.status}
                                                        </span>

                                                        {/* Deterioration Bar */}
                                                        <div className="w-24 hidden md:block">
                                                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full ${getStatusColor(deterioration)}`} 
                                                                    style={{ width: `${deterioration}%` }} 
                                                                />
                                                            </div>
                                                            <div className="text-[10px] font-bold text-slate-400 mt-1 text-right">
                                                                {deterioration}% deterioro
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default ComponentMatrix;
