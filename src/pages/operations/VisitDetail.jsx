import { useState } from 'react';
import {
    MapPin, Calendar, User, Users, Truck, Wrench,
    FileText, CheckCircle, Clock, Map as MapIcon,
    Navigation, AlertCircle
} from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { VisitService } from '../../services/visits';

const VisitDetail = ({ visit, onClose, onUpdate }) => {
    const [updatingStatus, setUpdatingStatus] = useState(false);

    if (!visit) return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
            <Navigation size={48} className="mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-600">Selecciona una visita</h3>
            <p className="text-sm mt-1">Haz clic en una visita de la lista para ver sus detalles completos.</p>
        </div>
    );

    const isMovement = visit.uiType === 'LOGISTICA' || visit.uiType === 'LOGISTICA_DETALLE';

    const handleStatusChange = async (newStatus) => {
        if (!isMovement) return; // Only movements for now
        setUpdatingStatus(true);
        try {
            await VisitService.updateMovementStatus(visit.raw_id, newStatus);
            if (onUpdate) onUpdate(); // Refresh parent
        } catch (error) {
            console.error("Error updating status:", error);
        } finally {
            setUpdatingStatus(false);
        }
    };

    return (
        <div className="bg-white h-full overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header */}
            <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-100 p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            {isMovement ? (
                                <select
                                    className={`text-xs font-bold px-2 py-1 rounded-full border-none focus:ring-2 focus:ring-brand-200 cursor-pointer transition-colors
                                        ${visit.status === 'PLANIFICADO' ? 'bg-brand-100 text-brand-700' :
                                            visit.status === 'EN EJECUCION' ? 'bg-yellow-100 text-yellow-700' :
                                                visit.status === 'COMPLETADO' ? 'bg-green-100 text-green-700' :
                                                    'bg-slate-100 text-slate-700'}
                                    `}
                                    value={visit.status}
                                    onChange={(e) => handleStatusChange(e.target.value)}
                                    disabled={updatingStatus}
                                >
                                    <option value="PLANIFICADO">PLANIFICADO</option>
                                    <option value="EN EJECUCION">EN EJECUCION</option>
                                    <option value="COMPLETADO">COMPLETADO</option>
                                    <option value="CANCELADO">CANCELADO</option>
                                </select>
                            ) : (
                                <StatusBadge status={visit.status} />
                            )}
                            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{visit.id}</span>
                            {updatingStatus && <span className="text-xs text-slate-400 animate-pulse">Guardando...</span>}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 leading-tight">{visit.title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors md:hidden"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-blue-500" />
                        <span>{new Date(visit.date).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-8">
                {/* Description & Notes */}
                <section>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Información General</h3>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                            {visit.description || "Sin descripción adicional."}
                        </p>
                    </div>
                </section>

                {/* Route / Communities (Movements Only) */}
                {isMovement && (visit.communities?.length > 0) && (
                    <section>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <MapIcon size={16} /> Ruta y Comunidades
                        </h3>
                        <div className="space-y-3">
                            <div className="relative pl-4 border-l-2 border-brand-100 space-y-6">
                                {visit.communities.map((comm, idx) => (
                                    <div key={idx} className="relative">
                                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-brand-500 border-2 border-white shadow-sm ring-1 ring-brand-200" />
                                        <h4 className="font-semibold text-slate-800">{comm.name}</h4>
                                        <p className="text-xs text-slate-500">{comm.municipality || 'Ubicación'}, {comm.department || 'General'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* Location (Simple Visits) */}
                {!isMovement && visit.location && (
                    <section>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <MapPin size={16} /> Ubicación
                        </h3>
                        <div className="flex items-start gap-3 bg-brand-50 p-4 rounded-xl text-blue-800">
                            <MapPin size={20} className="mt-0.5 shrink-0" />
                            <span className="font-medium">{visit.location}</span>
                        </div>
                    </section>
                )}

                {/* Crew / Personnel - Unified for All Types */}
                {(visit.people?.length > 0 || visit.crew) && (
                    <section>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Users size={16} /> Equipo Asignado
                        </h3>

                        {/* Always try to show rich card grid if people data exists, regardless of type */}
                        {visit.people?.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {visit.people.map((person, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors bg-white shadow-sm">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm
                                            ${person.role?.toLowerCase().includes('conductor') ? 'bg-orange-500' :
                                                person.role?.toLowerCase().includes('tecnic') ? 'bg-brand-600' :
                                                    person.role?.toLowerCase().includes('social') ? 'bg-green-500' : 'bg-slate-400'}`}
                                        >
                                            {person.role?.charAt(0) || <User size={16} />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800 text-sm">{person.name}</p>
                                            <p className="text-xs text-slate-500 font-mono uppercase">{person.role || 'Miembro'}</p>
                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded ml-auto">
                                                {person.crew || visit.crew}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Fallback for simple string crew
                            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white">
                                <Users className="text-slate-400" />
                                <span className="text-slate-700">{visit.crew}</span>
                            </div>
                        )}
                    </section>
                )}

                {/* Linked Tasks */}
                {(visit.workOrders?.length > 0 || visit.diagnoses?.length > 0) && (
                    <section>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <CheckCircle size={16} /> Tareas Relacionadas
                        </h3>
                        <div className="space-y-2">
                            {visit.workOrders?.map(wo => (
                                <div key={wo.work_order_id} className="group flex items-center justify-between p-3 rounded-lg bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-colors cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <Wrench size={18} className="text-orange-500" />
                                        <div>
                                            <p className="font-medium text-orange-900 text-sm">{wo.description || 'Orden de Trabajo'}</p>
                                            <p className="text-xs text-orange-700 font-mono">{wo.code || `WO-${wo.work_order_id}`}</p>
                                        </div>
                                    </div>
                                    <StatusBadge status={wo.status} size="sm" />
                                </div>
                            ))}

                            {visit.diagnoses?.map(dia => (
                                <div key={dia.diagnosis_id} className="group flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-100 hover:bg-purple-100 transition-colors cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <FileText size={18} className="text-purple-500" />
                                        <div>
                                            <p className="font-medium text-purple-900 text-sm">{dia.notes || 'Diagnóstico Técnico'}</p>
                                            <p className="text-xs text-purple-700 font-mono">DIA-{dia.diagnosis_id}</p>
                                        </div>
                                    </div>
                                    <StatusBadge status={dia.status} size="sm" />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* GPS Tracking Placeholder */}
                {isMovement && visit.gpsPoints?.length > 0 && (
                    <section className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                                <Navigation size={16} /> Tracking GPS
                            </h4>
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">{visit.gpsPoints.length} puntos</span>
                        </div>
                        <div className="h-32 bg-emerald-100/50 rounded-lg flex items-center justify-center border border-emerald-200 border-dashed">
                            <p className="text-xs text-emerald-600 italic">Visualización de mapa no disponible en vista previa</p>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default VisitDetail;
