import React, { useState, useEffect } from 'react';
import {
    Calendar, MapPin, Filter, Plus, Search,
    ArrowRight, Clock, CheckCircle2, ChevronRight,
    RefreshCw, X, Link as LinkIcon, Unlink
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { VisitService } from '../../services/visits';
import StatusBadge from '../../components/ui/StatusBadge';
import VisitDetail from './VisitDetail';
import { MillService } from '../../services/mills';
import { CommunityService } from '../../services/communities';

const VisitasPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [visits, setVisits] = useState([]);
    const [filteredVisits, setFilteredVisits] = useState([]); // Search results
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const [detailedVisit, setDetailedVisit] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // State for Type Filter
    const [selectedType, setSelectedType] = useState('ALL'); // ALL, LOGISTICA, TECNICA, SOCIAL

    useEffect(() => {
        loadVisits();
    }, []);

    // Filter Effect
    useEffect(() => {
        let filtered = visits;

        // 1. Text Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(v =>
                v.title?.toLowerCase().includes(q) ||
                v.id?.toLowerCase().includes(q) ||
                v.location?.toLowerCase().includes(q) ||
                v.raw_id?.toString().includes(q) ||
                v.description?.toLowerCase().includes(q) ||
                v.type?.toLowerCase().includes(q)
            );
        }

        // 2. Type/Status Filter
        if (selectedType === 'COMPLETADA') {
            filtered = filtered.filter(v => ['COMPLETADO', 'FINALIZADO', 'CERRADO'].includes(v.status?.toUpperCase()));
        } else if (selectedType !== 'ALL') {
            if (selectedType === 'TECNICA') {
                filtered = filtered.filter(v => ['REPARACION', 'DIAGNOSTICO'].includes(v.type));
            } else {
                filtered = filtered.filter(v => v.type === selectedType);
            }
        }

        setFilteredVisits(filtered);
    }, [searchQuery, visits, selectedType]);

    // Detail Loading Effect
    useEffect(() => {
        let isMounted = true;

        if (selectedId) {
            const fetchDetail = async () => {
                setLoadingDetail(true);
                setDetailedVisit(null);
                try {
                    const detail = await VisitService.getVisitById(selectedId);
                    if (isMounted) setDetailedVisit(detail);
                } catch (error) {
                    console.error("Error loading details:", error);
                } finally {
                    if (isMounted) setLoadingDetail(false);
                }
            };
            fetchDetail();
        } else {
            setDetailedVisit(null);
        }

        return () => { isMounted = false; };
    }, [selectedId]);

    const loadVisits = async () => {
        setLoading(true);
        try {
            const data = await VisitService.getVisits();
            setVisits(data);
            setFilteredVisits(data);
        } catch (error) {
            console.error("Error loading visits:", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic - Includes Spanish status support
    const activeVisits = filteredVisits.filter(v =>
        ['SCHEDULED', 'IN_PROGRESS', 'PENDING', 'ACTIVA', 'EN PROGRESO', 'ASIGNADA', 'EN TALLER'].includes(v.status?.toUpperCase())
    );
    const pastVisits = filteredVisits.filter(v =>
        !['SCHEDULED', 'IN_PROGRESS', 'PENDING', 'ACTIVA', 'EN PROGRESO', 'ASIGNADA', 'EN TALLER'].includes(v.status?.toUpperCase())
    );

    const VisitCard = ({ visit, active }) => (
        <div
            onClick={() => setSelectedId(visit.id)}
            className={`p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-slate-50 relative group
                ${selectedId === visit.id ? 'bg-brand-50/60 border-brand-200' : ''}
            `}
        >
            <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide
                    ${visit.type === 'LOGISTICA' ? 'bg-brand-100 text-brand-700' :
                        visit.type === 'DIAGNOSTICO' ? 'bg-purple-100 text-purple-700' :
                            visit.type === 'REPARACION' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}
                `}>
                    {visit.type}
                </span>
                <span className="text-xs text-slate-400">{new Date(visit.date).toLocaleDateString()}</span>
            </div>

            <h4 className={`font-semibold text-sm mb-1 ${selectedId === visit.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                {visit.title}
            </h4>

            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <MapPin size={12} />
                <span className="truncate max-w-[200px]">{visit.location}</span>
            </div>

            {/* Activity Badge */}
            {visit.linkedActivity && (
                <div className="mb-2 p-2 rounded-lg border flex items-center gap-2 text-xs bg-brand-50 border-brand-200 text-blue-800">
                    <Calendar size={12} />
                    <span className="font-medium truncate">
                        Actividad: {visit.linkedActivity.title}
                    </span>
                </div>
            )}

            <div className="flex items-center justify-between mt-2">
                <StatusBadge status={visit.status} size="sm" />
                <ChevronRight size={16} className={`text-slate-300 ${selectedId === visit.id ? 'text-indigo-400' : ''}`} />
            </div>
        </div>
    );

    return (
        <div className="h-[calc(100vh-64px)] flex bg-slate-50 overflow-hidden relative">
            {/* Sidebar List - Responsive Toggle */}
            <div className={`w-full md:w-1/3 lg:w-[400px] bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0 absolute md:relative z-10 transition-transform duration-300 bg-white
                ${selectedId ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
            `}>
                {/* Sidebar Header */}
                <div className="p-4 border-b border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-xl font-bold text-slate-800">Visitas</h1>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={loadVisits}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                                title="Actualizar lista"
                            >
                                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                            </button>
                            <button className="bg-brand-600 hover:bg-brand-700 text-white p-2 rounded-lg shadow-sm transition-all hover:scale-105">
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar visita, orden o lugar..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-100 transition-all placeholder:text-slate-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Type Filters */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                        {[
                            { id: 'ALL', label: 'Todas' },
                            { id: 'LOGISTICA', label: 'Logística' },
                            { id: 'TECNICA', label: 'Técnica' },
                            { id: 'SOCIAL', label: 'Social' },
                            { id: 'COMPLETADA', label: 'Completadas' }
                        ].map(type => (
                            <button
                                key={type.id}
                                onClick={() => setSelectedType(type.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                                    ${selectedType === type.id
                                        ? 'bg-slate-800 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }
                                `}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Visits List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="p-8 text-center text-slate-400">
                        Loading visits...
                    </div>
                ) : filteredVisits.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="bg-slate-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                            <Search className="text-slate-400" size={24} />
                        </div>
                        <p className="text-slate-500 font-medium">No visits found</p>
                        <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {/* Active Visits */}
                        <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0">
                            Activas ({activeVisits.length})
                        </div>
                        {activeVisits.map(visit => (
                            <VisitCard key={visit.id} visit={visit} active={true} />
                        ))}

                        {/* Past Visits */}
                        {pastVisits.length > 0 && (
                            <>
                                <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 mt-4">
                                    Historial ({pastVisits.length})
                                </div>
                                {pastVisits.map(visit => (
                                    <VisitCard key={visit.id} visit={visit} active={false} />
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Main Content / Detail View */}
            <div className={`flex-1 h-full bg-slate-50 overflow-y-auto transition-all duration-300
                ${selectedId ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 hidden md:block md:opacity-100 md:translate-x-0'}
            `}>
                {selectedId ? (
                    loadingDetail ? (
                        <div className="h-full flex items-center justify-center text-slate-400">
                            Cargando detalles...
                        </div>
                    ) : detailedVisit ? (
                        <VisitDetail
                            visit={detailedVisit}
                            onClose={() => setSelectedId(null)}
                            onUpdate={() => {
                                loadVisits(); // Reload list
                                VisitService.getVisitById(selectedId).then(setDetailedVisit);
                            }}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                            <p>No se pudo cargar el detalle.</p>
                        </div>
                    )
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                        <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                            <MapPin size={48} className="text-indigo-200" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">Selecciona una visita</h3>
                        <p className="max-w-xs text-slate-400">
                            Click en cualquier item de la lista para ver los detalles completos, reportes y estado.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VisitasPage;
