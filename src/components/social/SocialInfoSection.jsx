import React, { useState } from 'react';
import { Users, Calendar, CheckCircle, Clock, AlertCircle, Plus, Eye } from 'lucide-react';
import ReportSituationModal from '../modals/ReportSituationModal';
import AllSituationsModal from '../modals/AllSituationsModal';

const SocialInfoSection = ({
    socialData,
    onRefresh,
    service = null,
    hideHeader = false,
    hideMembers = false,
    hideConcertations = false
}) => {
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isAllSituationsModalOpen, setIsAllSituationsModalOpen] = useState(false);

    if (!socialData) {
        return (
            <div className="text-center py-8 bg-slate-50 rounded-xl">
                <p className="text-slate-500">Cargando información social...</p>
            </div>
        );
    }

    const community = socialData.community || {
        community_id: socialData.community_id,
        name: socialData.community_name || socialData.name || 'Comunidad'
    };
    const { status, concertation_date, concertations, members } = socialData;

    if (socialData.hasNoCommunity || !community.community_id) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 text-amber-600 mb-3">
                    <AlertCircle size={24} />
                    <h3 className="text-lg font-bold">Sin Información Social</h3>
                </div>
                <p className="text-slate-600">
                    No hay una comunidad vinculada para mostrar información social.
                </p>
            </div>
        );
    }

    const handleRefresh = () => {
        setIsReportModalOpen(false);
        setIsAllSituationsModalOpen(false);
        onRefresh?.();
    };

    // Status badge configuration
    const statusConfig = {
        'CONCERTADO': {
            bg: 'bg-green-100',
            text: 'text-green-700',
            border: 'border-green-200',
            icon: CheckCircle,
            label: 'Concertado'
        },
        'EN_PROCESO': {
            bg: 'bg-blue-100',
            text: 'text-blue-700',
            border: 'border-blue-200',
            icon: Clock,
            label: 'En Proceso'
        },
        'PENDIENTE': {
            bg: 'bg-amber-100',
            text: 'text-amber-700',
            border: 'border-amber-200',
            icon: AlertCircle,
            label: 'Pendiente'
        }
    };

    const currentStatus = statusConfig[status] || statusConfig['PENDIENTE'];
    const StatusIcon = currentStatus.icon;

    return (
        <>
            <div className="space-y-6">
                {/* Community Header Card */}
                {!hideHeader && (
                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                                    <Users size={28} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">{community.name}</h3>
                                    {community.official_name && (
                                        <p className="text-sm text-slate-600 mt-1">
                                            Nombre Oficial: <span className="font-medium">{community.official_name}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${currentStatus.bg} ${currentStatus.text} ${currentStatus.border}`}>
                                <StatusIcon size={18} />
                                <span className="font-bold text-sm">{currentStatus.label}</span>
                            </div>
                        </div>

                        {/* Community Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                            {community.location_description && (
                                <div className="bg-white/60 rounded-lg p-3">
                                    <p className="text-xs text-slate-500 font-semibold uppercase">Ubicación</p>
                                    <p className="text-sm font-medium text-slate-800 mt-1">{community.location_description}</p>
                                </div>
                            )}
                            {community.latitude && community.longitude && (
                                <div className="bg-white/60 rounded-lg p-3">
                                    <p className="text-xs text-slate-500 font-semibold uppercase">Coordenadas</p>
                                    <p className="text-sm font-medium text-slate-800 mt-1">{community.latitude}, {community.longitude}</p>
                                </div>
                            )}
                            {community.notes && (
                                <div className="bg-white/60 rounded-lg p-3 col-span-2 md:col-span-1">
                                    <p className="text-xs text-slate-500 font-semibold uppercase">Notas</p>
                                    <p className="text-sm font-medium text-slate-800 mt-1">{community.notes}</p>
                                </div>
                            )}
                        </div>

                        {/* Concertation Date */}
                        {concertation_date && (
                            <div className="mt-4 flex items-center gap-2 text-sm">
                                <Calendar size={16} className="text-purple-600" />
                                <span className="text-slate-600">
                                    Fecha de concertación: <span className="font-semibold">{new Date(concertation_date).toLocaleDateString()}</span>
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Social Situations Section */}
                <div className={`${socialData.activeSituations && socialData.activeSituations.length > 0
                    ? 'bg-gradient-to-r from-amber-50 to-red-50 border-amber-300'
                    : 'bg-white border-slate-200'
                    } rounded-xl border-2 p-6`}>
                    <div className="flex items-start gap-3 mb-4">
                        {socialData.activeSituations && socialData.activeSituations.length > 0 ? (
                            <AlertCircle size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        ) : (
                            <Users size={24} className="text-slate-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                            <h4 className={`font-bold text-lg ${socialData.activeSituations && socialData.activeSituations.length > 0 ? 'text-amber-900' : 'text-slate-900'}`}>
                                Situaciones Sociales {socialData.activeSituations && socialData.activeSituations.length > 0 ? `Activas (${socialData.activeSituations.length})` : ''}
                            </h4>
                            <p className={`text-sm mt-1 ${socialData.activeSituations && socialData.activeSituations.length > 0 ? 'text-amber-700' : 'text-slate-600'}`}>
                                {socialData.activeSituations && socialData.activeSituations.length > 0
                                    ? 'Se han reportado las siguientes situaciones que pueden afectar operaciones o decisiones'
                                    : 'No hay situaciones sociales activas reportadas actualmente'}
                            </p>
                        </div>
                    </div>

                    {socialData.activeSituations && socialData.activeSituations.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            {socialData.activeSituations.slice(0, 4).map((situation, idx) => {
                                const severityConfig = {
                                    low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', label: 'Baja' },
                                    medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', label: 'Media' },
                                    high: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', label: 'Alta' },
                                    critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: 'Crítica' }
                                };
                                const severity = severityConfig[situation.severity] || severityConfig.medium;

                                const typeIcons = {
                                    conflict: '👥',
                                    strike: '⚠️',
                                    access_issue: '🚧',
                                    weather: '🌧️',
                                    security: '🛡️',
                                    other: '📌'
                                };

                                return (
                                    <div key={idx} className={`bg-white border-2 ${severity.border} rounded-lg p-4`}>
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{typeIcons[situation.type] || '📌'}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded font-bold ${severity.bg} ${severity.text}`}>
                                                    {severity.label}
                                                </span>
                                            </div>
                                            <span className="text-xs text-slate-400">
                                                {Math.floor((new Date() - new Date(situation.start_date)) / (1000 * 60 * 60 * 24))} días
                                            </span>
                                        </div>
                                        <h5 className="font-bold text-slate-900 text-sm mb-1">{situation.title}</h5>
                                        <p className="text-xs text-slate-600 line-clamp-2">{situation.description}</p>
                                        {situation.status === 'monitoring' && (
                                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded mt-2 inline-block">
                                                En Monitoreo
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsReportModalOpen(true)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all"
                        >
                            <Plus size={20} />
                            Reportar Nueva Situación
                        </button>
                        {socialData.allSituations && socialData.allSituations.length > 0 && (
                            <button
                                onClick={() => setIsAllSituationsModalOpen(true)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-800 transition-all"
                            >
                                <Eye size={20} />
                                Ver Todas ({socialData.allSituations.length})
                            </button>
                        )}
                    </div>
                </div>

                {/* Two Column Layout: Members & Concertations */}
                {(!hideMembers || !hideConcertations) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Community Members */}
                        {!hideMembers && (
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Users size={18} className="text-purple-600" />
                                    Miembros Activos ({members?.length || 0})
                                </h4>

                                {members && members.length > 0 ? (
                                    <div className="space-y-3 max-h-80 overflow-y-auto">
                                        {members.map((member, idx) => (
                                            <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold shrink-0">
                                                    {member.name?.charAt(0)?.toUpperCase() || 'M'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-slate-900 truncate">{member.name || 'Sin nombre'}</p>
                                                    <p className="text-xs text-slate-500">{member.role || 'Miembro'}</p>
                                                    {member.specialty && (
                                                        <p className="text-xs text-purple-600 mt-0.5">{member.specialty}</p>
                                                    )}
                                                </div>
                                                {member.since && (
                                                    <span className="text-xs text-slate-400 shrink-0">
                                                        Desde {new Date(member.since).getFullYear()}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 text-center py-8">No hay miembros registrados</p>
                                )}
                            </div>
                        )}

                        {/* Recent Concertations */}
                        {!hideConcertations && (
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Calendar size={18} className="text-blue-600" />
                                    Concertaciones Recientes ({concertations?.length || 0})
                                </h4>

                                {concertations && concertations.length > 0 ? (
                                    <div className="space-y-3 max-h-80 overflow-y-auto">
                                        {concertations.map((conc, idx) => (
                                            <div key={idx} className="p-3 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
                                                <div className="flex items-start justify-between mb-2">
                                                    <span className="text-xs font-mono text-slate-400">
                                                        {new Date(conc.meeting_date).toLocaleDateString()}
                                                    </span>
                                                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${conc.status === 'finalizada' ? 'bg-green-100 text-green-700' :
                                                        conc.status === 'en_proceso' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {conc.status}
                                                    </span>
                                                </div>
                                                {conc.decision && (
                                                    <p className="text-sm font-medium text-slate-800 mb-1">
                                                        Decisión: {conc.decision}
                                                    </p>
                                                )}
                                                {conc.conditions && (
                                                    <p className="text-xs text-slate-600 mb-1">
                                                        Condiciones: {conc.conditions}
                                                    </p>
                                                )}
                                                {conc.notes && (
                                                    <p className="text-xs text-slate-500 italic">
                                                        {conc.notes}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 text-center py-8">No hay concertaciones registradas</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            <ReportSituationModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                communityId={community.community_id}
                communityName={community.name}
                onSuccess={handleRefresh}
                service={service}
            />

            <AllSituationsModal
                isOpen={isAllSituationsModalOpen}
                onClose={() => setIsAllSituationsModalOpen(false)}
                situations={socialData.allSituations || []}
                onUpdate={handleRefresh}
                service={service}
            />
        </>
    );
};

export default SocialInfoSection;
