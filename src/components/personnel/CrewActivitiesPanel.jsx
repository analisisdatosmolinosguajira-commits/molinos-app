import React from 'react';
import { Calendar, MapPin, Users, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const CrewActivitiesPanel = ({ activities = [], loading = false }) => {
    const getStatusColor = (status) => {
        const colors = {
            'PLANIFICADA': 'bg-blue-100 text-blue-700 border-blue-200',
            'EN_EJECUCION': 'bg-yellow-100 text-yellow-700 border-yellow-200',
            'COMPLETADA': 'bg-green-100 text-green-700 border-green-200',
            'CANCELADA': 'bg-red-100 text-red-700 border-red-200'
        };
        return colors[status] || 'bg-slate-100 text-slate-700 border-slate-200';
    };

    const getPriorityColor = (priority) => {
        const colors = {
            'ALTA': 'text-red-600',
            'MEDIA': 'text-yellow-600',
            'BAJA': 'text-blue-600'
        };
        return colors[priority] || 'text-slate-600';
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    if (!activities || activities.length === 0) {
        return (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Calendar size={48} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No hay actividades asignadas</p>
                <p className="text-slate-400 text-sm mt-1">Las actividades planificadas aparecerán aquí</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {activities.map(activity => (
                <div
                    key={activity.activity_id}
                    className="p-4 bg-white rounded-xl border border-slate-200 hover:border-brand-300 hover:shadow-sm transition-all"
                >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-900 mb-1">{activity.title}</h4>
                            <p className="text-xs text-slate-500">
                                {activity.activityTypeName || 'Sin tipo'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(activity.status)}`}>
                                {activity.status}
                            </span>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        {/* Dates */}
                        <div className="flex items-center gap-2 text-slate-600">
                            <Calendar size={14} className="flex-shrink-0" />
                            <span className="text-xs">
                                {formatDate(activity.planned_start_week)}
                            </span>
                        </div>

                        {/* Priority */}
                        <div className="flex items-center gap-2">
                            <AlertCircle size={14} className={getPriorityColor(activity.priority)} />
                            <span className={`text-xs font-medium ${getPriorityColor(activity.priority)}`}>
                                {activity.priority || 'MEDIA'}
                            </span>
                        </div>

                        {/* Location */}
                        {(activity.communityName || activity.millName) && (
                            <div className="flex items-center gap-2 text-slate-600 col-span-2">
                                <MapPin size={14} className="flex-shrink-0" />
                                <span className="text-xs truncate">
                                    {activity.millCode ? `${activity.millCode} - ${activity.millName}` : activity.communityName}
                                </span>
                            </div>
                        )}

                        {/* Responsible */}
                        {activity.responsibleName && (
                            <div className="flex items-center gap-2 text-slate-600 col-span-2">
                                <Users size={14} className="flex-shrink-0" />
                                <span className="text-xs">Responsable: {activity.responsibleName}</span>
                            </div>
                        )}
                    </div>

                    {/* Progress indicator for in-progress activities */}
                    {activity.status === 'EN_EJECUCION' && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-2 text-xs text-yellow-700">
                                <Clock size={12} />
                                <span className="font-medium">En progreso</span>
                            </div>
                        </div>
                    )}

                    {/* Completion indicator */}
                    {activity.status === 'COMPLETADA' && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-2 text-xs text-green-700">
                                <CheckCircle size={12} />
                                <span className="font-medium">Completada</span>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default CrewActivitiesPanel;
