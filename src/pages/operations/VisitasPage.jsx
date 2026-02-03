import React, { useState, useEffect } from 'react';
import {
    Calendar, MapPin, Filter, Plus, Search,
    ArrowRight, Clock, CheckCircle2, ChevronRight,
    RefreshCw
} from 'lucide-react'; // Added RefreshCw
import { VisitService } from '../../services/visits';
import StatusBadge from '../../components/ui/StatusBadge';
import VisitDetail from './VisitDetail';

const VisitasPage = () => {
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

        // 2. Type Filter
        if (selectedType !== 'ALL') {
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
            className={`p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-slate-50
                ${selectedId === visit.id ? 'bg-indigo-50/60 border-indigo-200' : ''}
            `}
        >
            <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide
                    ${visit.type === 'LOGISTICA' ? 'bg-indigo-100 text-indigo-700' :
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
                            <button className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg shadow-sm transition-all hover:scale-105">
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
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
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
                            { id: 'SOCIAL', label: 'Social' }
                        ].map(type => (
                            <button
                                key={type.id}
                                onClick={() => setSelectedType(type.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                                    ${selectedType === type.id
                                        ? 'bg-slate-800 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                                `}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400">
                            <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2" />
                            Loading...
                        </div>
                    ) : (
                        <>
                            {activeVisits.length > 0 && (
                                <div>
                                    <div className="sticky top-0 bg-slate-50/90 backdrop-blur-sm px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-y border-slate-100 z-10 flex justify-between">
                                        <span>Activas ({activeVisits.length})</span>
                                    </div>
                                    {activeVisits.map(visit => (
                                        <VisitCard key={visit.id} visit={visit} active={true} />
                                    ))}
                                </div>
                            )}

                            {pastVisits.length > 0 && (
                                <div>
                                    <div className="sticky top-0 bg-slate-50/90 backdrop-blur-sm px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-y border-slate-100 z-10 flex justify-between">
                                        <span>Historial Recent ({pastVisits.length})</span>
                                    </div>
                                    {pastVisits.map(visit => (
                                        <VisitCard key={visit.id} visit={visit} />
                                    ))}
                                </div>
                            )}

                            {activeVisits.length === 0 && pastVisits.length === 0 && (
                                <div className="p-8 text-center text-slate-400">
                                    <Filter size={32} className="mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">No se encontraron visitas</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Detail View - Responsive Toggle */}
            <div className={`flex-1 bg-slate-50 h-full relative transition-transform duration-300 w-full absolute md:static bg-slate-50
                 ${selectedId ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
            `}>
                {loadingDetail ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-20">
                        <div className="animate-spin w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full" />
                    </div>
                ) : null}

                <VisitDetail
                    visit={detailedVisit}
                    onClose={() => setSelectedId(null)}
                />
            </div>
        </div>
    );
};

export default VisitasPage;
