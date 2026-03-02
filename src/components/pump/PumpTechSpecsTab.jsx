import React from 'react';
import { Settings, Info } from 'lucide-react';

export default function PumpTechSpecsTab({ pump }) {
    if (!pump) {
        return (
            <div className="text-center text-slate-400 py-8">
                No hay información disponible
            </div>
        );
    }

    const specs = [
        {
            category: 'Identificación',
            items: [
                { label: 'Serial Number', value: pump.serial_number || 'N/A' },
                { label: 'Modelo', value: pump.model || 'N/A' },
                { label: 'Origen', value: pump.origin || 'N/A' },
                { label: 'Estado', value: pump.status || 'N/A' }
            ]
        },
        {
            category: 'Especificaciones Técnicas',
            items: [
                { label: 'Tipo', value: pump.type || 'Manual' },
                { label: 'Profundidad Máxima', value: pump.max_depth ? `${pump.max_depth} m` : 'N/A' },
                { label: 'Capacidad', value: pump.capacity || 'N/A' },
                { label: 'Material', value: pump.material || 'N/A' }
            ]
        },
        {
            category: 'Fechas Importantes',
            items: [
                {
                    label: 'Fecha de Fabricación',
                    value: pump.manufacture_date
                        ? new Date(pump.manufacture_date).toLocaleDateString()
                        : 'N/A'
                },
                {
                    label: 'Fecha de Registro',
                    value: pump.created_at
                        ? new Date(pump.created_at).toLocaleDateString()
                        : 'N/A'
                },
                {
                    label: 'Última Actualización',
                    value: pump.updated_at
                        ? new Date(pump.updated_at).toLocaleDateString()
                        : 'N/A'
                }
            ]
        },
        {
            category: 'Almacenamiento y Ubicación',
            items: [
                { label: 'Ubicación de Almacenamiento', value: pump.storage_location || 'Taller' },
                { label: 'Proveedor ID', value: pump.supplier_id || 'N/A' },
                { label: 'Orden de Fabricación', value: pump.manufacturing_order_id || 'N/A' }
            ]
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                    <Settings className="text-brand-600" size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Especificaciones Técnicas</h3>
                    <p className="text-sm text-slate-500">Información detallada de la bomba</p>
                </div>
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {specs.map((section, idx) => (
                    <div key={idx} className="bg-white rounded-xl border border-slate-200 p-6">
                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Info size={14} className="text-brand-500" />
                            {section.category}
                        </h4>
                        <div className="space-y-3">
                            {section.items.map((item, itemIdx) => (
                                <div key={itemIdx} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-b-0">
                                    <span className="text-sm text-slate-600 font-medium">{item.label}</span>
                                    <span className="text-sm text-slate-900 font-semibold">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Additional Notes/Documentation */}
            {pump.notes && (
                <div className="bg-brand-50 border border-brand-200 rounded-xl p-6">
                    <h4 className="text-sm font-bold text-brand-900 uppercase tracking-wider mb-3">
                        Notas Adicionales
                    </h4>
                    <p className="text-sm text-brand-800 whitespace-pre-wrap">
                        {pump.notes}
                    </p>
                </div>
            )}
        </div>
    );
}
