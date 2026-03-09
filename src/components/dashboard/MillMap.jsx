import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import {
    ExternalLink, Wind, Droplets, MapPin, ClipboardList,
    Stethoscope, Handshake, Filter, HelpCircle
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Northern La Guajira center
const DEFAULT_CENTER = [11.60, -72.50];
const DEFAULT_ZOOM = 10;

const STATUS_COLORS = {
    OPERATIONAL: { fill: '#22c55e', stroke: '#16a34a', label: 'Operativo' },
    MAINTENANCE: { fill: '#f59e0b', stroke: '#d97706', label: 'En Mantenimiento' },
    INACTIVE: { fill: '#ef4444', stroke: '#dc2626', label: 'No Operativo' },
    INSTALLED: { fill: '#3b82f6', stroke: '#2563eb', label: 'Instalado' },
    WITHOUT_INFO: { fill: '#a78bfa', stroke: '#7c3aed', label: 'Sin Información' },
    DEFAULT: { fill: '#94a3b8', stroke: '#64748b', label: 'Sin Estado' },
};

function getStatusColor(status) {
    return STATUS_COLORS[status] || STATUS_COLORS.DEFAULT;
}

// Contextual filter markers get special styling
const CONTEXT_FILTERS = {
    OT_ACTIVA: { color: '#f97316', label: 'Con OT Activa', icon: ClipboardList },
    DIAG_PENDIENTE: { color: '#8b5cf6', label: 'Diagnóstico Pendiente', icon: Stethoscope },
    CONCERTACION: { color: '#ec4899', label: 'Concertación Activa', icon: Handshake },
};

// Auto-fit bounds to visible mills
function FitBounds({ mills }) {
    const map = useMap();
    React.useEffect(() => {
        if (mills.length > 0) {
            const validMills = mills.filter(m => m.latitude && m.longitude);
            if (validMills.length > 1) {
                const bounds = validMills.map(m => [parseFloat(m.latitude), parseFloat(m.longitude)]);
                map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
            } else if (validMills.length === 1) {
                map.setView([parseFloat(validMills[0].latitude), parseFloat(validMills[0].longitude)], 12);
            }
        }
    }, [mills, map]);
    return null;
}

export default function MillMap({ mills = [], height = '500px' }) {
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState('ALL');

    // All mills with valid coordinates
    const geoMills = useMemo(() =>
        mills.filter(m => m.latitude && m.longitude &&
            !isNaN(parseFloat(m.latitude)) && !isNaN(parseFloat(m.longitude))),
        [mills]
    );

    // Compute counts for each filter
    const filterCounts = useMemo(() => {
        const counts = {
            ALL: geoMills.length,
            OPERATIONAL: 0,
            INACTIVE: 0,
            MAINTENANCE: 0,
            SIN_INFO: 0,
            OT_ACTIVA: 0,
            DIAG_PENDIENTE: 0,
            CONCERTACION: 0,
        };
        geoMills.forEach(m => {
            // Status counts - normalize non-operational
            if (m.status === 'WITHOUT_INFO') counts.SIN_INFO++;
            else if (m.status === 'OPERATIONAL' || m.status === 'INSTALLED') counts.OPERATIONAL++;
            else if (m.status === 'MAINTENANCE') counts.MAINTENANCE++;
            else counts.INACTIVE++;

            // Contextual counts
            if (m.activeOTs > 0) counts.OT_ACTIVA++;
            if (m.pendingDiagnosis > 0) counts.DIAG_PENDIENTE++;
            if (m.activeConcertation) counts.CONCERTACION++;
        });
        return counts;
    }, [geoMills]);

    // Apply active filter to mills
    const visibleMills = useMemo(() => {
        if (activeFilter === 'ALL') return geoMills;

        return geoMills.filter(m => {
            switch (activeFilter) {
                case 'OPERATIONAL':
                    return m.status === 'OPERATIONAL' || m.status === 'INSTALLED';
                case 'INACTIVE':
                    return m.status !== 'OPERATIONAL' && m.status !== 'INSTALLED' && m.status !== 'MAINTENANCE' && m.status !== 'WITHOUT_INFO';
                case 'MAINTENANCE':
                    return m.status === 'MAINTENANCE';
                case 'SIN_INFO':
                    return m.status === 'WITHOUT_INFO';
                case 'OT_ACTIVA':
                    return m.activeOTs > 0;
                case 'DIAG_PENDIENTE':
                    return m.pendingDiagnosis > 0;
                case 'CONCERTACION':
                    return m.activeConcertation;
                default:
                    return true;
            }
        });
    }, [geoMills, activeFilter]);

    // Determine marker color based on active filter
    function getMarkerColor(mill) {
        if (activeFilter === 'SIN_INFO') return { fill: '#a78bfa', stroke: '#7c3aed' };
        if (activeFilter === 'OT_ACTIVA') return { fill: '#f97316', stroke: '#ea580c' };
        if (activeFilter === 'DIAG_PENDIENTE') return { fill: '#8b5cf6', stroke: '#7c3aed' };
        if (activeFilter === 'CONCERTACION') return { fill: '#ec4899', stroke: '#db2777' };
        return getStatusColor(mill.status);
    }

    if (mills.length === 0) {
        return (
            <div className="flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200" style={{ height }}>
                <div className="text-center text-slate-400">
                    <MapPin size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No hay molinos disponibles</p>
                </div>
            </div>
        );
    }

    const noCoordsMills = mills.length - geoMills.length;

    const toggleFilter = (f) => setActiveFilter(activeFilter === f ? 'ALL' : f);

    return (
        <div className="relative">
            {/* Filter Bar */}
            <div className="mb-3 space-y-2">
                {/* Row 1: Status filters */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mr-1">
                        <Filter size={13} /> Estado
                    </div>
                    <FilterChip
                        active={activeFilter === 'ALL'}
                        onClick={() => setActiveFilter('ALL')}
                        color="#334155"
                        label="Todos"
                        count={filterCounts.ALL}
                    />
                    <FilterChip
                        active={activeFilter === 'OPERATIONAL'}
                        onClick={() => toggleFilter('OPERATIONAL')}
                        color="#22c55e"
                        label="Operativo"
                        count={filterCounts.OPERATIONAL}
                    />
                    <FilterChip
                        active={activeFilter === 'INACTIVE'}
                        onClick={() => toggleFilter('INACTIVE')}
                        color="#ef4444"
                        label="No Operativo"
                        count={filterCounts.INACTIVE}
                    />
                    <FilterChip
                        active={activeFilter === 'MAINTENANCE'}
                        onClick={() => toggleFilter('MAINTENANCE')}
                        color="#f59e0b"
                        label="Mantenimiento"
                        count={filterCounts.MAINTENANCE}
                    />
                    <FilterChip
                        active={activeFilter === 'SIN_INFO'}
                        onClick={() => toggleFilter('SIN_INFO')}
                        color="#a78bfa"
                        label="Sin Info"
                        count={filterCounts.SIN_INFO}
                        icon={HelpCircle}
                    />
                </div>

                {/* Row 2: Contextual filters */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mr-1">
                        <ClipboardList size={13} /> Actividad
                    </div>
                    <FilterChip
                        active={activeFilter === 'OT_ACTIVA'}
                        onClick={() => toggleFilter('OT_ACTIVA')}
                        color="#f97316"
                        label="OTs Activas"
                        count={filterCounts.OT_ACTIVA}
                        icon={ClipboardList}
                    />
                    <FilterChip
                        active={activeFilter === 'DIAG_PENDIENTE'}
                        onClick={() => toggleFilter('DIAG_PENDIENTE')}
                        color="#8b5cf6"
                        label="Diagnósticos"
                        count={filterCounts.DIAG_PENDIENTE}
                        icon={Stethoscope}
                    />
                    <FilterChip
                        active={activeFilter === 'CONCERTACION'}
                        onClick={() => toggleFilter('CONCERTACION')}
                        color="#ec4899"
                        label="Concertaciones"
                        count={filterCounts.CONCERTACION}
                        icon={Handshake}
                    />
                </div>
            </div>

            {/* Map */}
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ height }}>
                <MapContainer
                    center={DEFAULT_CENTER}
                    zoom={DEFAULT_ZOOM}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ZoomControl position="bottomright" />
                    <FitBounds mills={visibleMills} />

                    {visibleMills.map(mill => {
                        const color = getMarkerColor(mill);
                        const lat = parseFloat(mill.latitude);
                        const lng = parseFloat(mill.longitude);
                        const isSinInfo = mill.status === 'WITHOUT_INFO';

                        return (
                            <CircleMarker
                                key={mill.mill_id}
                                center={[lat, lng]}
                                radius={isSinInfo ? 12 : 10}
                                pathOptions={{
                                    fillColor: color.fill,
                                    color: color.stroke,
                                    weight: isSinInfo ? 3 : 2.5,
                                    fillOpacity: isSinInfo ? 0.7 : 0.85,
                                    opacity: 1,
                                    dashArray: isSinInfo ? '4 3' : undefined,
                                }}
                            >
                                <Popup className="mill-popup" maxWidth={300}>
                                    <div className="p-1">
                                        {/* Header */}
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {isSinInfo ? <HelpCircle size={16} className="text-purple-500" /> : <Wind size={16} className="text-brand-600" />}
                                                <span className="font-bold text-slate-800 text-sm">{mill.code || mill.community_name || 'Molino'}</span>
                                            </div>
                                            <span
                                                className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                                                style={{ backgroundColor: getStatusColor(mill.status).fill }}
                                            >
                                                {getStatusColor(mill.status).label}
                                            </span>
                                        </div>

                                        {/* Community */}
                                        {mill.community_name && (
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                                                <MapPin size={12} />
                                                <span>{mill.community_name}</span>
                                            </div>
                                        )}

                                        {/* Sin Info notice */}
                                        {isSinInfo && (
                                            <div className="flex items-center gap-1.5 text-xs text-purple-600 bg-purple-50 rounded-lg px-2 py-1.5 mb-2 border border-purple-200">
                                                <HelpCircle size={12} />
                                                <span className="font-medium">Sin información registrada</span>
                                            </div>
                                        )}

                                        {/* Pump */}
                                        {!isSinInfo && (
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                                                <Droplets size={12} />
                                                <span>{mill.has_pump ? `Bomba: ${mill.pump_model || 'instalada'}` : 'Sin bomba'}</span>
                                            </div>
                                        )}

                                        {/* Activity badges */}
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {mill.activeOTs > 0 && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-50 text-orange-700 text-[10px] font-bold rounded-md border border-orange-200">
                                                    <ClipboardList size={10} /> {mill.activeOTs} OT{mill.activeOTs > 1 ? 's' : ''}
                                                </span>
                                            )}
                                            {mill.pendingDiagnosis > 0 && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-md border border-purple-200">
                                                    <Stethoscope size={10} /> {mill.pendingDiagnosis} Diag.
                                                </span>
                                            )}
                                            {mill.activeConcertation && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-pink-50 text-pink-700 text-[10px] font-bold rounded-md border border-pink-200">
                                                    <Handshake size={10} /> Concertación
                                                </span>
                                            )}
                                        </div>

                                        {/* Footer */}
                                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                            <span className="text-[10px] text-slate-400">
                                                {lat.toFixed(4)}°N, {lng.toFixed(4)}°W
                                            </span>
                                            <button
                                                onClick={() => navigate(`/molinos/${mill.mill_id}`)}
                                                className="ml-auto flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                                            >
                                                Ver detalle <ExternalLink size={11} />
                                            </button>
                                        </div>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        );
                    })}
                </MapContainer>
            </div>

            {/* Bottom info */}
            <div className="flex items-center justify-between mt-2">
                {noCoordsMills > 0 && (
                    <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
                        <MapPin size={14} />
                        <span><strong>{noCoordsMills}</strong> molino(s) sin coordenadas</span>
                    </div>
                )}
                {activeFilter !== 'ALL' && (
                    <div className="px-3 py-1.5 bg-brand-50 border border-brand-200 rounded-lg text-xs text-brand-700 font-medium">
                        Mostrando {visibleMills.length} de {geoMills.length} molinos
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Filter chip sub-component ───────────────────

function FilterChip({ active, onClick, color, label, count, icon: Icon }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5
                ${active
                    ? 'text-white shadow-md scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            style={active ? { backgroundColor: color } : {}}
        >
            {Icon && <Icon size={12} />}
            {!Icon && <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />}
            {label}
            <span className={`ml-0.5 text-[10px] ${active ? 'text-white/80' : 'text-slate-400'}`}>
                ({count})
            </span>
        </button>
    );
}
