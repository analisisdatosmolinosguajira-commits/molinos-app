
import React from 'react';
import {
    Calendar, MapPin, Users, Activity, FileText,
    Stethoscope, MessageSquare, Briefcase, Settings, ArrowRight,
    CheckCircle2, Clock, AlertCircle
} from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';

const JourneyActivitiesTab = ({ activity, onAssign }) => {
    if (!activity) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed">
                <div className="bg-slate-50 p-4 rounded-full mb-3">
                    <Activity size={32} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-600">Sin actividad vinculada</h3>
                <p className="text-sm mb-4">Este viaje no tiene una actividad de planificación asociada.</p>
                <button
                    onClick={onAssign}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100 font-medium transition-colors text-sm"
                >
                    <Briefcase size={16} />
                    Vincular Actividad Existente
                </button>
            </div>
        );
    }

    const {
        title, description, status, date, type,
        community, crew, linkedEntities
    } = activity;

    // Helper to render entity cards
    const renderEntityCard = (entity, type) => {
        let icon, colorClass, titleText, subtitle;

        switch (type) {
            case 'WORK_ORDER':
                icon = <Briefcase size={18} />;
                colorClass = "bg-orange-50 text-orange-600 border-orange-100";
                titleText = `OT ${entity.code}`;
                subtitle = entity.type || 'Orden de Trabajo';
                break;
            case 'DIAGNOSIS':
                icon = <Stethoscope size={18} />;
                colorClass = "bg-purple-50 text-purple-600 border-purple-100";
                titleText = `Diagnóstico ${entity.code}`;
                subtitle = entity.diagnosis_type || 'Diagnóstico Técnico';
                break;
            case 'CONCERTATION':
                icon = <MessageSquare size={18} />;
                colorClass = "bg-pink-50 text-pink-600 border-pink-100";
                titleText = `Concertación ${entity.code}`;
                subtitle = new Date(entity.meeting_date).toLocaleDateString();
                break;
            case 'MANUFACTURING':
                icon = <Settings size={18} />; // Assuming Settings is imported or use Briefcase
                colorClass = "bg-brand-50 text-brand-600 border-brand-100";
                titleText = `Fabricación #${entity.id}`;
                subtitle = `Estado: ${entity.status}`;
                break;
            default:
                icon = <FileText size={18} />;
                colorClass = "bg-slate-50 text-slate-600 border-slate-100";
                titleText = "Entidad";
                subtitle = "-";
        }

        return (
            <div key={entity.id || entity.code} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className={`p-2 rounded-lg border ${colorClass}`}>
                    {icon}
                </div>
                <div>
                    <div className="font-semibold text-slate-800 text-sm">{titleText}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide">{subtitle}</div>
                </div>
                <div className="ml-auto">
                    <StatusBadge status={entity.status} size="xs" />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Main Activity Card */}
            <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
                <div className="bg-brand-50/50 p-4 border-b border-brand-100 flex justify-between items-start">
                    <div className="flex gap-3">
                        <div className="bg-white p-2.5 rounded-xl shadow-sm border border-brand-100 text-brand-600">
                            <Activity size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                    {type || 'ACTIVIDAD'}
                                </span>
                                <span className="text-slate-400 text-xs flex items-center gap-1">
                                    <Clock size={12} />
                                    Semana {date || '?'}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                        </div>
                    </div>
                    <StatusBadge status={status} />
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-1 text-slate-400"><FileText size={18} /></div>
                            <div>
                                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Descripción</div>
                                <p className="text-slate-700 text-sm leading-relaxed">
                                    {description || "Sin descripción detallada."}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 text-slate-400"><MapPin size={18} /></div>
                            <div>
                                <div className="text-xs font-bold text-slate-500 uppercase mb-0.5">Comunidad Objetivo</div>
                                <div className="font-medium text-slate-800">
                                    {community?.name || "No especificada"}
                                </div>
                                <div className="text-xs text-slate-500">
                                    {community?.municipality || ""}
                                </div>
                            </div>
                        </div>

                        <div className="w-full h-px bg-slate-200 my-2"></div>

                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 text-slate-400"><Users size={18} /></div>
                            <div className="flex-1">
                                <div className="text-xs font-bold text-slate-500 uppercase mb-0.5">Cuadrilla Asignada</div>
                                <div className="font-medium text-slate-800 mb-2">
                                    {crew?.name || "Sin asignación"}
                                </div>
                                {crew?.crew_member && crew.crew_member.length > 0 && (
                                    <div className="space-y-1.5 mt-3">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                                            Integrantes ({crew.crew_member.length})
                                        </div>
                                        {crew.crew_member.map(member => (
                                            <div
                                                key={member.crew_member_id}
                                                className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-[10px]">
                                                        {member.person?.first_name?.[0]}{member.person?.last_name?.[0]}
                                                    </div>
                                                    <span className="font-medium text-slate-700">
                                                        {member.person?.first_name} {member.person?.last_name}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full uppercase font-semibold">
                                                    {member.role_in_crew || 'Miembro'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Linked Entities Grid */}
            <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Briefcase size={16} className="text-slate-400" />
                    Entidades Relacionadas con la Actividad
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {linkedEntities.workOrders.map(wo => renderEntityCard(wo, 'WORK_ORDER'))}
                    {linkedEntities.diagnoses.map(dia => renderEntityCard(dia, 'DIAGNOSIS'))}
                    {linkedEntities.concertations.map(con => renderEntityCard(con, 'CONCERTATION'))}
                    {linkedEntities.manufacturingOrders.map(mo => renderEntityCard(mo, 'MANUFACTURING'))}

                    {Object.values(linkedEntities).flat().length === 0 && (
                        <div className="col-span-full py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100 border-dashed text-sm">
                            No hay órdenes o reportes vinculados directamente a esta actividad.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JourneyActivitiesTab;
