import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import {
    ExternalLink, Wind, Droplets, MapPin, ClipboardList,
    Stethoscope, Handshake, Filter, HelpCircle, Activity, Settings2, Users
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import guajiraData from '../../data/guajira.json';

// Northern La Guajira center
const DEFAULT_CENTER = [11.60, -72.50];
const DEFAULT_ZOOM = 10;

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

    // All mills with valid coordinates (regardless of intervention)
    const allValidCoordMills = useMemo(() =>
        mills.filter(m => m.latitude && m.longitude &&
            !isNaN(parseFloat(m.latitude)) && !isNaN(parseFloat(m.longitude))),
        [mills]
    );

    // All mills with valid coordinates and interventions
    const geoMills = useMemo(() =>
        allValidCoordMills.filter(m => m.hasIntervention || m.hasReintervention),
        [allValidCoordMills]
    );

    // Compute counts for each filter
    const filterCounts = useMemo(() => {
        let INTERVENTION = 0, REINTERVENTION = 0;
        geoMills.forEach(m => {
            if (m.hasIntervention) INTERVENTION++;
            if (m.hasReintervention) REINTERVENTION++;
        });
        return { ALL: geoMills.length, INTERVENTION, REINTERVENTION };
    }, [geoMills]);

    // Apply active filter to mills
    const visibleMills = useMemo(() => {
        if (activeFilter === 'ALL') return geoMills;
        if (activeFilter === 'INTERVENTION') return geoMills.filter(m => m.hasIntervention);
        if (activeFilter === 'REINTERVENTION') return geoMills.filter(m => m.hasReintervention);
        return geoMills;
    }, [geoMills, activeFilter]);

    // Create custom multi-color icon based on intervention/reintervention
    function getCustomIcon(mill) {
        const hasInt = mill.hasIntervention;
        const hasRe = mill.hasReintervention;
        const isSinInfo = mill.status === 'WITHOUT_INFO';
    
        let bgStyle = '';
        let borderStyle = '';
        
        // Colors
        const colInt = '#3b82f6'; // Blue
        const colRe = '#f59e0b'; // Amber
        const colNone = '#94a3b8'; // Slate
        
        if (hasInt && hasRe) {
            bgStyle = `background: conic-gradient(${colInt} 0deg 180deg, ${colRe} 180deg 360deg);`;
            borderStyle = 'border: 2px solid white;';
        } else if (hasInt) {
            bgStyle = `background-color: ${colInt};`;
            borderStyle = 'border: 2px solid #2563eb;';
        } else if (hasRe) {
            bgStyle = `background-color: ${colRe};`;
            borderStyle = 'border: 2px solid #d97706;';
        } else {
            bgStyle = `background-color: ${colNone}; opacity: ${isSinInfo ? 0.4 : 0.6};`;
            borderStyle = `border: 2px solid #64748b; ${isSinInfo ? 'border-style: dashed;' : ''}`;
        }
    
        const size = isSinInfo ? 18 : 20;
    
        const html = `<div style="
            width: ${size}px; 
            height: ${size}px; 
            border-radius: 50%; 
            ${bgStyle} 
            ${borderStyle} 
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            transition: all 0.2s;
        "></div>`;
    
        return L.divIcon({
            html,
            className: 'custom-mill-marker',
            iconSize: [size, size],
            iconAnchor: [size/2, size/2]
        });
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

    const noCoordsMills = mills.length - allValidCoordMills.length;

    const toggleFilter = (f) => setActiveFilter(activeFilter === f ? 'ALL' : f);

    return (
        <div className="relative">
            {/* Filter Bar */}
            <div className="mb-3">
                <div className="flex items-center gap-2 flex-wrap bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold ml-1 mr-2">
                        <Filter size={14} /> Filtro Anual
                    </div>
                    <FilterChip
                        active={activeFilter === 'ALL'}
                        onClick={() => setActiveFilter('ALL')}
                        color="#334155"
                        label="Todas"
                        count={filterCounts.ALL}
                    />
                    <FilterChip
                        active={activeFilter === 'INTERVENTION'}
                        onClick={() => toggleFilter('INTERVENTION')}
                        color="#3b82f6"
                        label="Intervenciones"
                        count={filterCounts.INTERVENTION}
                        icon={Settings2}
                    />
                    <FilterChip
                        active={activeFilter === 'REINTERVENTION'}
                        onClick={() => toggleFilter('REINTERVENTION')}
                        color="#f59e0b"
                        label="Reintervenciones"
                        count={filterCounts.REINTERVENTION}
                        icon={Activity}
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

                    <GeoJSON 
                        data={{
                            ...guajiraData,
                            features: guajiraData.features.filter(f => f.geometry.type !== 'Point')
                        }} 
                        style={(feature) => ({
                            color: feature.properties.color || '#94a3b8',
                            weight: 2,
                            fillColor: feature.properties.color || '#94a3b8',
                            fillOpacity: 0.15,
                            dashArray: '4, 4'
                        })} 
                    />

                    {visibleMills.map(mill => {
                        const lat = parseFloat(mill.latitude);
                        const lng = parseFloat(mill.longitude);
                        const isSinInfo = mill.status === 'WITHOUT_INFO';

                        return (
                            <Marker
                                key={mill.mill_id}
                                position={[lat, lng]}
                                icon={getCustomIcon(mill)}
                            >
                                <Popup className="mill-popup" maxWidth={300}>
                                    <div className="p-1">
                                        {/* Header */}
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {isSinInfo ? <HelpCircle size={16} className="text-purple-500" /> : <Wind size={16} className="text-brand-600" />}
                                                <span className="font-bold text-slate-800 text-sm">{mill.code || mill.community_name || 'Molino'}</span>
                                            </div>
                                            {(mill.hasIntervention || mill.hasReintervention) && (
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    mill.hasIntervention && mill.hasReintervention 
                                                        ? 'bg-gradient-to-r from-blue-500 to-amber-500 text-white'
                                                        : mill.hasIntervention 
                                                            ? 'bg-blue-100 text-blue-700' 
                                                            : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {mill.hasIntervention && mill.hasReintervention ? 'Ambas' : mill.hasIntervention ? 'Intervención' : 'Reintervención'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Community */}
                                        {mill.community_name && (
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                                                <MapPin size={12} />
                                                <span>{mill.community_name}</span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                                            <MapPin size={12} className={mill.isInheritedCoords ? "text-amber-500" : ""} />
                                            {mill.isInheritedCoords ? (
                                                <span className="italic text-amber-600">Coordenadas de la comunidad</span>
                                            ) : (
                                                <span>{parseFloat(mill.latitude).toFixed(4)}, {parseFloat(mill.longitude).toFixed(4)}</span>
                                            )}
                                        </div>

                                        {/* Sin Info notice */}
                                        {isSinInfo && (
                                            <div className="flex items-center gap-1.5 text-xs text-purple-600 bg-purple-50 rounded-lg px-2 py-1.5 mb-2 border border-purple-200">
                                                <HelpCircle size={12} />
                                                <span className="font-medium">Sin información registrada</span>
                                            </div>
                                        )}

                                        {/* Social Stats Info */}
                                        <div className="flex flex-col gap-1.5 mt-3 mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Users size={14} className="text-brand-600" />
                                                <span className="text-xs font-bold text-slate-800">Censo Comunitario</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500 font-medium">Familias:</span>
                                                <span className="font-bold text-slate-700">{mill.social?.number_of_families || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500 font-medium">Habitantes:</span>
                                                <span className="font-bold text-slate-700">{mill.social?.number_of_inhabitants || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500 font-medium">Niños:</span>
                                                <span className="font-bold text-slate-700">{mill.social?.number_of_children || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-start text-xs pt-2 border-t border-slate-200 mt-1">
                                                <span className="text-slate-500 font-medium">Actividad:</span>
                                                <span className="font-bold text-slate-700 text-right capitalize line-clamp-2 w-24">
                                                    {mill.social?.main_productive_activity?.toLowerCase() || 'No definida'}
                                                </span>
                                            </div>
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
                            </Marker>
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
