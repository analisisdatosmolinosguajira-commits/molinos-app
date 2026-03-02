import React from 'react';
import { MapPin, Download, Navigation, AlertCircle } from 'lucide-react';

const JourneyRoutesTab = ({ activity }) => {
    if (!activity) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed">
                <div className="bg-slate-50 p-4 rounded-full mb-3">
                    <Navigation size={32} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-600">Sin actividad vinculada</h3>
                <p className="text-sm">Vincula una actividad para ver las rutas de las comunidades.</p>
            </div>
        );
    }

    // Collect all unique communities from the activity
    const communities = [];
    const communityIds = new Set();

    // Add target community
    if (activity.community?.community_id) {
        communityIds.add(activity.community.community_id);
        communities.push(activity.community);
    }

    // Add communities from linked entities (work orders, diagnoses, etc.)
    const addCommunityFromEntity = (entity) => {
        if (entity?.target_community && !communityIds.has(entity.target_community.community_id)) {
            communityIds.add(entity.target_community.community_id);
            communities.push(entity.target_community);
        }
    };

    activity.linkedEntities?.workOrders?.forEach(addCommunityFromEntity);
    activity.linkedEntities?.diagnoses?.forEach(addCommunityFromEntity);
    activity.linkedEntities?.concertations?.forEach(addCommunityFromEntity);

    // Special case: Material Delivery (Type "Entrega de Materiales" or ID 10)
    // We only collect communities from deliveries if it is a material delivery activity
    if (activity.type === 'Entrega de Materiales' || activity.activity_type_id == 10) {
        activity.linkedEntities?.deliveries?.forEach(addCommunityFromEntity);
    }

    const handleDownloadRoute = (community) => {
        if (!community.geotracker_route) return;

        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = community.geotracker_route;
        link.download = `ruta_${community.name.replace(/\s+/g, '_')}.gpx`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                <div className="flex items-start gap-4">
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-blue-100 text-brand-600">
                        <Navigation size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-800 text-lg mb-1">Rutas de Geotracker</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Descarga los archivos de ruta para cada comunidad y cárgalos en la aplicación Geotracker
                            para navegación en campo.
                        </p>
                    </div>
                </div>
            </div>

            {communities.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-12 text-center">
                    <AlertCircle size={48} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-400">No se encontraron comunidades asociadas a esta actividad.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {communities.map(community => (
                        <div
                            key={community.community_id}
                            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-slate-100">
                                <div className="flex items-start gap-3">
                                    <div className="bg-white p-2 rounded-lg shadow-sm border border-blue-100 text-brand-600">
                                        <MapPin size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-800 truncate">{community.name}</h4>
                                        <p className="text-xs text-slate-500">
                                            {community.municipality && `${community.municipality}, `}
                                            {community.department}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-3">
                                {/* Coordinates */}
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                                        Coordenadas GPS
                                    </div>
                                    {community.latitude && community.longitude ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <div className="text-xs text-slate-500 mb-0.5">Latitud</div>
                                                <div className="font-mono text-sm font-semibold text-slate-700">
                                                    {parseFloat(community.latitude).toFixed(6)}°
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500 mb-0.5">Longitud</div>
                                                <div className="font-mono text-sm font-semibold text-slate-700">
                                                    {parseFloat(community.longitude).toFixed(6)}°
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">Coordenadas no registradas</p>
                                    )}
                                </div>

                                {/* Download Button */}
                                {community.geotracker_route ? (
                                    <button
                                        onClick={() => handleDownloadRoute(community)}
                                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95"
                                    >
                                        <Download size={18} />
                                        Descargar Ruta
                                    </button>
                                ) : (
                                    <div className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-400 px-4 py-3 rounded-xl text-sm border border-slate-200 border-dashed">
                                        <AlertCircle size={16} />
                                        Sin archivo de ruta
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default JourneyRoutesTab;
