import React from 'react';
import { History, MapPin, Calendar, AlertCircle } from 'lucide-react';

export default function PumpEventTimeline({ timeline }) {
    if (!timeline || timeline.length === 0) {
        return (
            <div className="text-center text-slate-400 py-8 bg-slate-50 rounded-xl border border-slate-200">
                <History size={40} className="mx-auto mb-3 opacity-50" />
                <p>Sin historial registrado</p>
            </div>
        );
    }

    const getEventIcon = (type) => {
        switch (type) {
            case 'INSTALLATION':
                return <MapPin size={16} />;
            case 'REMOVAL':
                return <AlertCircle size={16} />;
            default:
                return <Calendar size={16} />;
        }
    };

    const getEventColor = (type) => {
        const colors = {
            'INSTALLATION': 'bg-green-500',
            'REMOVAL': 'bg-orange-500',
            'MAINTENANCE': 'bg-blue-500',
            'REPAIR': 'bg-yellow-500',
            default: 'bg-slate-400'
        };
        return colors[type] || colors.default;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                    <History className="text-brand-600" size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Historial de Eventos</h3>
                    <p className="text-sm text-slate-500">{timeline.length} eventos registrados</p>
                </div>
            </div>

            {/* Timeline */}
            <div className="relative pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-200">
                {timeline.map((event, idx) => (
                    <div key={event.id || idx} className="relative group">
                        {/* Timeline Dot */}
                        <div className={`absolute -left-[29px] w-6 h-6 rounded-full border-4 border-white shadow-md flex items-center justify-center ${getEventColor(event.type)}`}>
                            <div className="text-white" style={{ fontSize: '10px' }}>
                                {getEventIcon(event.type)}
                            </div>
                        </div>

                        {/* Event Card */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-brand-300 transition-all">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-900 mb-1">
                                        {event.title}
                                    </h4>
                                    <p className="text-sm text-slate-600">
                                        {event.subtitle}
                                    </p>
                                </div>
                                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                    {new Date(event.date).toLocaleDateString('es-ES', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>

                            {/* Event Details */}
                            {(event.mill_name || event.description) && (
                                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                                    {event.mill_name && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <MapPin size={14} className="text-brand-500" />
                                            <span className="text-slate-700">
                                                <span className="font-medium">{event.mill_code}</span> - {event.mill_name}
                                            </span>
                                        </div>
                                    )}
                                    {event.description && event.description !== '-' && (
                                        <p className="text-sm text-slate-600 pl-6">
                                            {event.description}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Event Type Badge */}
                            <div className="mt-3">
                                <span className={`
                                    inline-block px-2 py-1 rounded text-xs font-bold uppercase
                                    ${event.type === 'INSTALLATION' ? 'bg-green-100 text-green-700' : ''}
                                    ${event.type === 'REMOVAL' ? 'bg-orange-100 text-orange-700' : ''}
                                    ${event.type === 'MAINTENANCE' ? 'bg-blue-100 text-blue-700' : ''}
                                    ${event.type === 'REPAIR' ? 'bg-yellow-100 text-yellow-700' : ''}
                                    ${!['INSTALLATION', 'REMOVAL', 'MAINTENANCE', 'REPAIR'].includes(event.type) ? 'bg-slate-100 text-slate-700' : ''}
                                `}>
                                    {event.type}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
