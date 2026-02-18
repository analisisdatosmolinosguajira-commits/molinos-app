import React, { useMemo } from 'react';
import { Calendar } from 'lucide-react';

const CrewTimeline = ({ activities = [], viewMode = 'month' }) => {
    // Calculate timeline data
    const timelineData = useMemo(() => {
        if (!activities || activities.length === 0) return { bars: [], startDate: null, endDate: null };

        // Find date range
        const dates = activities.flatMap(a => [
            new Date(a.planned_start_week),
            new Date(a.planned_end_week || a.planned_start_week)
        ]);
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));

        // Calculate total weeks
        const diffTime = Math.abs(maxDate - minDate);
        const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));

        // Create bars for each activity
        const bars = activities.map(activity => {
            const start = new Date(activity.planned_start_week);
            const end = new Date(activity.planned_end_week || activity.planned_start_week);

            const startOffset = Math.floor((start - minDate) / (1000 * 60 * 60 * 24 * 7));
            const duration = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24 * 7)));

            return {
                ...activity,
                startOffset,
                duration,
                startPercent: (startOffset / diffWeeks) * 100,
                widthPercent: (duration / diffWeeks) * 100
            };
        });

        return { bars, startDate: minDate, endDate: maxDate, totalWeeks: diffWeeks };
    }, [activities]);

    const getStatusColor = (status) => {
        const colors = {
            'PLANIFICADA': 'bg-blue-500',
            'EN_EJECUCION': 'bg-yellow-500',
            'COMPLETADA': 'bg-green-500',
            'CANCELADA': 'bg-red-500'
        };
        return colors[status] || 'bg-slate-400';
    };

    const formatDate = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });
    };

    if (!activities || activities.length === 0) {
        return (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Calendar size={48} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">No hay actividades para mostrar en el timeline</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Timeline de Actividades</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{formatDate(timelineData.startDate)}</span>
                    <span>→</span>
                    <span>{formatDate(timelineData.endDate)}</span>
                </div>
            </div>

            {/* Timeline */}
            <div className="space-y-3">
                {timelineData.bars.map(bar => (
                    <div key={bar.activity_id} className="relative">
                        {/* Activity Label */}
                        <div className="text-xs font-medium text-slate-700 mb-1 truncate">
                            {bar.title}
                        </div>

                        {/* Timeline Bar Background */}
                        <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden">
                            {/* Activity Bar */}
                            <div
                                className={`absolute top-0 bottom-0 ${getStatusColor(bar.status)} rounded-lg transition-all hover:opacity-80 cursor-pointer group`}
                                style={{
                                    left: `${bar.startPercent}%`,
                                    width: `${bar.widthPercent}%`,
                                    minWidth: '20px'
                                }}
                            >
                                {/* Tooltip on hover */}
                                <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none transition-opacity z-10">
                                    {formatDate(bar.planned_start_week)} - {formatDate(bar.planned_end_week || bar.planned_start_week)}
                                </div>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">{bar.status}</span>
                            {bar.priority && (
                                <span className={`text-xs font-medium ${bar.priority === 'ALTA' ? 'text-red-600' :
                                        bar.priority === 'MEDIA' ? 'text-yellow-600' :
                                            'text-blue-600'
                                    }`}>
                                    {bar.priority}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Estados:</span>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-blue-500"></div>
                        <span className="text-xs text-slate-600">Planificada</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-yellow-500"></div>
                        <span className="text-xs text-slate-600">En Ejecución</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-green-500"></div>
                        <span className="text-xs text-slate-600">Completada</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-red-500"></div>
                        <span className="text-xs text-slate-600">Cancelada</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CrewTimeline;
