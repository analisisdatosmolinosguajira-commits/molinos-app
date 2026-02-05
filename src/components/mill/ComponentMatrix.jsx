import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, ChevronDown } from 'lucide-react';

const ComponentMatrix = ({ components }) => {
    const [expandedComponent, setExpandedComponent] = useState(null);

    const getStatusIcon = (status) => {
        const icons = {
            'FUNCIONAL': <CheckCircle className="text-green-500" size={18} />,
            'DESGASTADO': <AlertTriangle className="text-yellow-500" size={18} />,
            'DANADO': <XCircle className="text-red-500" size={18} />,
            'REQUIERE_CAMBIO': <XCircle className="text-red-500" size={18} />,
            'NO_INSTALADO': <AlertTriangle className="text-slate-400" size={18} />,
            'AUSENTE': <XCircle className="text-slate-400" size={18} />,
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

    if (!components || components.length === 0) {
        return (
            <div className="text-center py-12 bg-slate-50 rounded-xl">
                <p className="text-slate-500">No se han registrado componentes para este molino</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {components.map((comp) => {
                const deterioration = getDeteriorationLevel(comp.status);

                return (
                    <div key={comp.component_id} className="border border-slate-200 rounded-lg overflow-hidden">
                        {/* Component Row */}
                        <div
                            className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 cursor-pointer transition-colors"
                            onClick={() => setExpandedComponent(
                                expandedComponent === comp.component_id ? null : comp.component_id
                            )}
                        >
                            <div className="flex items-center gap-4 flex-1">
                                {getStatusIcon(comp.status)}
                                <div className="flex-1">
                                    <span className="font-semibold text-slate-900">{comp.component_name}</span>
                                    <span className="text-xs text-slate-400 ml-2 font-mono">
                                        {new Date(comp.event_date).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                {/* Status Badge */}
                                <span className={`px-2 py-1 rounded text-xs font-medium ${comp.status === 'FUNCIONAL' ? 'bg-green-100 text-green-700' :
                                        comp.status === 'DESGASTADO' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-red-100 text-red-700'
                                    }`}>
                                    {comp.status}
                                </span>

                                {/* Deterioration Bar */}
                                <div className="w-32">
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${getStatusColor(deterioration)}`}
                                            style={{ width: `${deterioration}%` }}
                                        />
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        {deterioration}% deterioro
                                    </div>
                                </div>

                                <ChevronDown
                                    size={16}
                                    className={`text-slate-400 transition-transform ${expandedComponent === comp.component_id ? 'rotate-180' : ''
                                        }`}
                                />
                            </div>
                        </div>

                        {/* Expanded History */}
                        {expandedComponent === comp.component_id && comp.history && (
                            <div className="bg-slate-50 p-4 border-t border-slate-200">
                                <h4 className="font-semibold text-sm text-slate-700 mb-3">
                                    Historial ({comp.history.length} registros)
                                </h4>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {comp.history.map((h, idx) => (
                                        <div key={idx} className="flex justify-between items-start text-sm bg-white p-2 rounded">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs text-slate-400">
                                                        {new Date(h.date).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                                                        {h.source_type}
                                                    </span>
                                                </div>
                                                {h.observation && (
                                                    <p className="text-xs text-slate-600 mt-1">{h.observation}</p>
                                                )}
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-xs ml-2 shrink-0 ${h.status === 'FUNCIONAL' ? 'bg-green-100 text-green-700' :
                                                    h.status === 'DESGASTADO' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                }`}>
                                                {h.status}
                                            </span>
                                        </div>
                                    ))}
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
