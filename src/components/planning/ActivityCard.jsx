import { Calendar, Clock, Users, MapPin, AlertCircle, Edit2, Trash2, Link, ClipboardList, Stethoscope, Factory, X, ArrowRightLeft, School } from 'lucide-react';

const ActivityCard = ({ activity, onEdit, onDelete, onLinkMovement, onUnlinkEntity }) => {
    // Priority colors
    const priorityColors = {
        BAJA: 'bg-green-50 text-green-700 border-green-200',
        MEDIA: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        ALTA: 'bg-orange-50 text-orange-700 border-orange-200',
        CRITICA: 'bg-red-50 text-red-700 border-red-200'
    };

    // Status colors
    const statusColors = {
        PLANIFICADA: 'bg-slate-100 text-slate-700',
        ASIGNADA: 'bg-brand-100 text-brand-700',
        EN_EJECUCION: 'bg-brand-100 text-brand-700',
        COMPLETADA: 'bg-green-100 text-green-700',
        CANCELADA: 'bg-red-100 text-red-700'
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'No definida';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-slate-500">
                            {activity.activityTypeName || 'Sin tipo'}
                        </span>
                        {activity.hasMovement && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                                <Link size={12} />
                                Vinculado
                            </span>
                        )}
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">
                        {activity.title}
                    </h3>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 ml-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${priorityColors[activity.priority] || 'bg-gray-100 text-gray-700'}`}>
                        {activity.priority}
                    </span>
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColors[activity.status] || 'bg-gray-100 text-gray-700'}`}>
                        {activity.status}
                    </span>
                </div>
            </div>

            {/* Description */}
            {activity.description && (
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                    {activity.description}
                </p>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Dates */}
                <div className="flex items-center gap-2 text-sm">
                    <Calendar size={16} className="text-slate-400" />
                    <span className="text-slate-600">
                        {formatDate(activity.planned_start_week)} - {formatDate(activity.planned_end_week)}
                    </span>
                </div>

                {/* Duration */}
                {activity.estimated_duration_days && (
                    <div className="flex items-center gap-2 text-sm">
                        <Clock size={16} className="text-slate-400" />
                        <span className="text-slate-600">
                            {activity.estimated_duration_days} días
                        </span>
                    </div>
                )}

                {/* Crew */}
                {activity.crewName && (
                    <div className="flex items-center gap-2 text-sm">
                        <Users size={16} className="text-slate-400" />
                        <span className="text-slate-600">{activity.crewName}</span>
                    </div>
                )}

                {/* Location - Legacy single community */}
                {!activity.plannedCommunities?.length && (activity.communityName || activity.millName) && (
                    <div className="flex items-center gap-2 text-sm">
                        <MapPin size={16} className="text-slate-400" />
                        <span className="text-slate-600">
                            {activity.millName ? `${activity.millCode} - ${activity.millName}` : activity.communityName}
                        </span>
                    </div>
                )}
            </div>

            {/* Planned Communities (multi) */}
            {(activity.plannedCommunities?.length > 0 || activity.includes_sena_workshop) && (
                <div className="mb-3">
                    <div className="flex flex-wrap gap-1.5">
                        {activity.includes_sena_workshop && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <School size={12} /> Taller SENA
                            </span>
                        )}
                        {activity.plannedCommunities?.map((pc, idx) => (
                            <span key={pc.id || idx}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-brand-50 text-brand-700 border border-brand-100">
                                <MapPin size={12} />
                                {pc.communityName || pc.community?.name || 'Comunidad'}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Responsible Person */}
            {activity.responsibleName && (
                <div className="text-xs text-slate-500 mb-3">
                    Responsable: <span className="font-medium text-slate-700">{activity.responsibleName}</span>
                </div>
            )}

            {/* Linked Entities */}
            <div className="flex flex-wrap gap-2 mb-3 pt-3 border-t border-gray-100">
                {/* Work Orders */}
                {activity.related_work_order?.map(wo => (
                    <div key={`wo-${wo.work_order_id}`} className="inline-flex items-center gap-1.5 px-2 py-1 bg-brand-50 text-brand-700 rounded-md text-xs font-medium border border-brand-100">
                        <ClipboardList size={12} />
                        <span>OT #{wo.code || wo.work_order_id}</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); onUnlinkEntity?.(activity.activity_id, 'work_order', wo.work_order_id); }}
                            className="hover:bg-brand-100 rounded-full p-0.5 ml-1"
                            title="Desvincular"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}

                {/* Diagnoses */}
                {activity.related_diagnosis?.map(diag => (
                    <div key={`diag-${diag.diagnosis_id}`} className="inline-flex items-center gap-1.5 px-2 py-1 bg-brand-50 text-brand-700 rounded-md text-xs font-medium border border-brand-100">
                        <Stethoscope size={12} />
                        <span>Diag #{diag.code || diag.diagnosis_id}</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); onUnlinkEntity?.(activity.activity_id, 'diagnosis', diag.diagnosis_id); }}
                            className="hover:bg-brand-100 rounded-full p-0.5 ml-1"
                            title="Desvincular"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}

                {/* Concertations */}
                {activity.related_concertation?.map(conc => (
                    <div key={`conc-${conc.concertation_id}`} className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-medium border border-amber-100">
                        <Users size={12} />
                        <span>Concertación</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); onUnlinkEntity?.(activity.activity_id, 'concertation', conc.concertation_id); }}
                            className="hover:bg-amber-100 rounded-full p-0.5 ml-1"
                            title="Desvincular"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}

                {/* Manufacturing Orders */}
                {activity.related_manufacturing?.map(mo => (
                    <div key={`mo-${mo.mo_id}`} className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 text-slate-700 rounded-md text-xs font-medium border border-slate-200">
                        <Factory size={12} />
                        <span>Fab #{mo.mo_id}</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); onUnlinkEntity?.(activity.activity_id, 'manufacturing', mo.mo_id); }}
                            className="hover:bg-slate-200 rounded-full p-0.5 ml-1"
                            title="Desvincular"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}

                {/* Movements (1:N) */}
                {activity.related_movements?.map(mov => (
                    <div key={`mov-${mov.movement_id}`} className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium border border-purple-100">
                        <ArrowRightLeft size={12} />
                        <span className="truncate max-w-[150px]">
                            {mov.title || `Mov #${mov.movement_id}`}
                        </span>
                        <div className="text-[10px] text-purple-600/80 max-w-[100px] truncate hidden sm:block">
                            {mov.objective}
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); onUnlinkEntity?.(activity.activity_id, 'movement', mov.movement_id); }}
                            className="hover:bg-purple-100 rounded-full p-0.5 ml-1"
                            title="Desvincular"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                {activity.status !== 'COMPLETADA' && activity.status !== 'CANCELADA' && (
                    <button
                        onClick={() => onLinkMovement?.(activity)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors"
                    >
                        <Link size={14} />
                        Vincular
                    </button>
                )}

                {activity.activityTypeName === 'Entrega de Materiales' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit?.(activity, 'delivery'); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 rounded-md hover:bg-brand-100 border border-brand-200 shadow-sm transition-colors"
                    >
                        <ClipboardList size={14} />
                        Ruta de Entrega
                    </button>
                )}

                <button
                    onClick={() => onEdit?.(activity, 'general')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors"
                >
                    <Edit2 size={14} />
                    Editar
                </button>
                {activity.status === 'PLANIFICADA' && (
                    <button
                        onClick={() => onDelete?.(activity)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                    >
                        <Trash2 size={14} />
                        Eliminar
                    </button>
                )}
            </div>
        </div>
    );
};

export default ActivityCard;
