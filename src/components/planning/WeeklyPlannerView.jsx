import React, { useState, useEffect } from 'react';
import {
    X, Users, AlertCircle, Loader2, GripVertical,
    Search, CheckCircle, Wrench, Stethoscope, Handshake,
    MapPin, School, ChevronDown, ChevronUp, Filter, Globe
} from 'lucide-react';
import { WeeklyPlannerService } from '../../services/weeklyPlannerService';

const SENA_CARD = {
    id: 'sena-taller',
    communityName: 'Taller SENA',
    communityId: null,
    sourceType: 'sena',
    sourceId: null,
    badge: 'Taller SENA',
    isSena: true
};

const WeeklyPlannerView = ({ isOpen, onClose, onSuccess }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Data
    const [crews, setCrews] = useState([]);
    const [concertations, setConcertations] = useState([]);
    const [diagnoses, setDiagnoses] = useState([]);
    const [workOrders, setWorkOrders] = useState([]);
    const [allCommunities, setAllCommunities] = useState([]);

    // Panel filters: 'default' (filtered) or 'all'
    const [panelFilters, setPanelFilters] = useState({
        concertations: 'recent',
        diagnoses: 'recent',
        workOrders: 'pending'
    });
    const [panelLoading, setPanelLoading] = useState({});

    // Assignments: { [crew_id]: { communities: [...], includesSena: bool } }
    const [assignments, setAssignments] = useState({});

    // Collapsed panels
    const [collapsedPanels, setCollapsedPanels] = useState({});

    // Drag state
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverCrew, setDragOverCrew] = useState(null);

    useEffect(() => {
        if (isOpen) {
            const today = new Date();
            const nextMonday = new Date(today);
            nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
            const nextSunday = new Date(nextMonday);
            nextSunday.setDate(nextMonday.getDate() + 6);

            setStartDate(nextMonday.toISOString().split('T')[0]);
            setEndDate(nextSunday.toISOString().split('T')[0]);
            setAssignments({});
            setError('');
            setPanelFilters({ concertations: 'recent', diagnoses: 'recent', workOrders: 'pending' });
            loadData();
        }
    }, [isOpen]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [crewsData, concData, diagData, woData, commData] = await Promise.all([
                WeeklyPlannerService.getActiveCrews(),
                WeeklyPlannerService.getConcertations('recent'),
                WeeklyPlannerService.getDiagnoses('recent'),
                WeeklyPlannerService.getWorkOrders('pending'),
                WeeklyPlannerService.getAllCommunities()
            ]);
            setCrews(crewsData);
            setConcertations(concData);
            setDiagnoses(diagData);
            setWorkOrders(woData);
            setAllCommunities(commData);
            setError('');
        } catch (err) {
            console.error('Error loading planner data:', err);
            setError('Error al cargar datos de planificación.');
        } finally {
            setIsLoading(false);
        }
    };

    // Toggle panel filter and reload that panel's data
    const togglePanelFilter = async (panelKey) => {
        const currentFilter = panelFilters[panelKey];
        const newFilter = (currentFilter === 'recent' || currentFilter === 'pending') ? 'all' : (panelKey === 'workOrders' ? 'pending' : 'recent');

        setPanelFilters(prev => ({ ...prev, [panelKey]: newFilter }));
        setPanelLoading(prev => ({ ...prev, [panelKey]: true }));

        try {
            if (panelKey === 'concertations') {
                const data = await WeeklyPlannerService.getConcertations(newFilter === 'all' ? 'all' : 'recent');
                setConcertations(data);
            } else if (panelKey === 'diagnoses') {
                const data = await WeeklyPlannerService.getDiagnoses(newFilter === 'all' ? 'all' : 'recent');
                setDiagnoses(data);
            } else if (panelKey === 'workOrders') {
                const data = await WeeklyPlannerService.getWorkOrders(newFilter === 'all' ? 'all' : 'pending');
                setWorkOrders(data);
            }
        } catch (err) {
            console.error('Error reloading panel:', err);
        } finally {
            setPanelLoading(prev => ({ ...prev, [panelKey]: false }));
        }
    };

    // ---------- Drag & Drop ----------
    const handleDragStart = (e, item) => {
        setDraggedItem(item);
        e.dataTransfer.setData('text/plain', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleDragOver = (e, crewId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDragOverCrew(crewId);
    };

    const handleDragLeave = () => {
        setDragOverCrew(null);
    };

    const handleDrop = (e, crewId) => {
        e.preventDefault();
        setDragOverCrew(null);

        if (!draggedItem) return;

        if (draggedItem.isSena) {
            setAssignments(prev => ({
                ...prev,
                [crewId]: {
                    ...prev[crewId],
                    communities: prev[crewId]?.communities || [],
                    includesSena: true
                }
            }));
        } else if (draggedItem.communityId) {
            setAssignments(prev => {
                const existing = prev[crewId]?.communities || [];
                // Avoid duplicate by communityId only (same community from different sources is still the same stop)
                const alreadyExists = existing.some(c => c.communityId === draggedItem.communityId);
                if (alreadyExists) return prev;

                return {
                    ...prev,
                    [crewId]: {
                        ...prev[crewId],
                        communities: [...existing, {
                            communityId: draggedItem.communityId,
                            communityName: draggedItem.communityName,
                            sourceType: draggedItem.sourceType,
                            sourceId: draggedItem.sourceId,
                            badge: draggedItem.badge
                        }],
                        includesSena: prev[crewId]?.includesSena || false
                    }
                };
            });
        }

        setDraggedItem(null);
    };

    const removeCommunityFromCrew = (crewId, index) => {
        setAssignments(prev => {
            const existing = [...(prev[crewId]?.communities || [])];
            existing.splice(index, 1);
            return { ...prev, [crewId]: { ...prev[crewId], communities: existing } };
        });
    };

    const removeSenaFromCrew = (crewId) => {
        setAssignments(prev => ({
            ...prev,
            [crewId]: { ...prev[crewId], includesSena: false }
        }));
    };

    // ---------- Generate ----------
    const handleGenerate = async () => {
        if (!startDate || !endDate) {
            setError('Debe seleccionar fecha de inicio y fin.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            setError('La fecha de inicio no puede ser mayor a la fecha de fin.');
            return;
        }

        const crewAssignments = crews.map(crew => ({
            crew,
            communities: assignments[crew.crew_id]?.communities || [],
            includesSena: assignments[crew.crew_id]?.includesSena || false
        }));

        const hasAny = crewAssignments.some(a => a.communities.length > 0 || a.includesSena);
        if (!hasAny) {
            setError('Debe asignar al menos una comunidad o Taller SENA a alguna cuadrilla.');
            return;
        }

        try {
            setIsGenerating(true);
            setError('');
            await WeeklyPlannerService.saveWeeklyPlan(startDate, endDate, crewAssignments);
            onSuccess?.();
        } catch (err) {
            console.error('Error generating plan:', err);
            setError(err.message || 'Error al generar las asignaciones.');
        } finally {
            setIsGenerating(false);
        }
    };

    // ---------- Helpers ----------
    const togglePanel = (panel) => {
        setCollapsedPanels(prev => ({ ...prev, [panel]: !prev[panel] }));
    };

    const filterItems = (items) => {
        if (!searchTerm) return items;
        const term = searchTerm.toLowerCase();
        return items.filter(i =>
            i.communityName?.toLowerCase().includes(term) ||
            i.badge?.toLowerCase().includes(term) ||
            i.code?.toLowerCase().includes(term)
        );
    };

    const totalAssigned = Object.values(assignments).reduce((sum, a) =>
        sum + (a.communities?.length || 0) + (a.includesSena ? 1 : 0), 0
    );

    const crewsWithAssignments = Object.entries(assignments).filter(
        ([, a]) => (a.communities?.length || 0) > 0 || a.includesSena
    ).length;

    if (!isOpen) return null;

    const sourceIcon = (type) => {
        switch (type) {
            case 'concertation': return <Handshake size={12} />;
            case 'diagnosis': return <Stethoscope size={12} />;
            case 'work_order': return <Wrench size={12} />;
            case 'community': return <Globe size={12} />;
            default: return <MapPin size={12} />;
        }
    };

    const sourceColor = (type) => {
        switch (type) {
            case 'concertation': return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'diagnosis': return 'bg-sky-50 text-sky-700 border-sky-200';
            case 'work_order': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'community': return 'bg-teal-50 text-teal-700 border-teal-200';
            default: return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    const sourceBadgeColor = (type) => {
        switch (type) {
            case 'concertation': return 'bg-purple-100 text-purple-700';
            case 'diagnosis': return 'bg-sky-100 text-sky-700';
            case 'work_order': return 'bg-amber-100 text-amber-700';
            case 'community': return 'bg-teal-100 text-teal-700';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    // ---------- Sub-components ----------
    const CommunityCard = ({ item }) => (
        <div
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
            className={`group flex items-center gap-2 p-2.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${sourceColor(item.sourceType)} select-none`}
        >
            <div className="text-slate-400 group-hover:text-slate-600 flex-shrink-0">
                <GripVertical size={14} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-sm">
                    {item.communityName}
                </p>
                {item.municipality && (
                    <p className="text-[10px] text-slate-500 truncate">{item.municipality}</p>
                )}
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium mt-0.5 px-1.5 py-0.5 rounded-full ${sourceBadgeColor(item.sourceType)}`}>
                    {sourceIcon(item.sourceType)}
                    {item.badge}
                </span>
            </div>
        </div>
    );

    const SenaCard = () => (
        <div
            draggable
            onDragStart={(e) => handleDragStart(e, SENA_CARD)}
            className="group flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:border-emerald-400 select-none"
        >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <School size={20} className="text-emerald-600" />
            </div>
            <div>
                <p className="font-bold text-emerald-800 text-sm">Taller SENA</p>
                <p className="text-emerald-600 text-xs">Arrastra a una o varias cuadrillas</p>
            </div>
        </div>
    );

    const SourcePanel = ({ title, icon: Icon, color, items, panelKey, filterLabel, filterActive }) => {
        const filtered = filterItems(items);
        const isCollapsed = collapsedPanels[panelKey];
        const isFilterAll = panelFilters[panelKey] === 'all';
        const loading = panelLoading[panelKey];

        return (
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                <div className={`flex items-center justify-between p-3 ${color}`}>
                    <button onClick={() => togglePanel(panelKey)} className="flex items-center gap-2 flex-1 text-left">
                        <Icon size={16} />
                        <span className="font-semibold text-sm">{title}</span>
                        <span className="text-xs font-bold bg-white/60 px-1.5 py-0.5 rounded-full">
                            {filtered.length}
                        </span>
                    </button>
                    <div className="flex items-center gap-2">
                        {filterLabel && (
                            <button
                                onClick={(e) => { e.stopPropagation(); togglePanelFilter(panelKey); }}
                                className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border transition-colors ${isFilterAll
                                    ? 'bg-white/90 border-white/50 text-slate-700 shadow-sm'
                                    : 'bg-white/40 border-transparent text-current hover:bg-white/60'
                                    }`}
                                title={isFilterAll ? 'Mostrando todos. Click para filtrar.' : `Mostrando: ${filterLabel}. Click para ver todos.`}
                            >
                                <Filter size={10} />
                                {isFilterAll ? 'Todos' : filterLabel}
                            </button>
                        )}
                        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </div>
                </div>
                {!isCollapsed && (
                    <div className="p-2 space-y-1.5 max-h-[200px] overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center py-4">
                                <Loader2 size={18} className="animate-spin text-slate-400" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-3">Sin registros</p>
                        ) : (
                            filtered.map((item, idx) => (
                                <CommunityCard key={`${item.sourceType}-${item.sourceId}-${idx}`} item={item} />
                            ))
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Programación Semanal</h2>
                        <p className="text-sm text-slate-500 mt-0.5">Planifica la ubicación de cada actividad arrastrando comunidades a las cuadrillas</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inicio</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                                    className="text-sm font-medium text-slate-800 bg-transparent border-0 p-0 focus:ring-0" disabled={isGenerating} />
                            </div>
                            <div className="w-px h-8 bg-slate-200" />
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fin</label>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                                    className="text-sm font-medium text-slate-800 bg-transparent border-0 p-0 focus:ring-0" disabled={isGenerating} />
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600" disabled={isGenerating}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="mx-6 mt-3 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 flex items-start gap-2">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {/* Main Content */}
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <Loader2 size={32} className="animate-spin text-brand-500 mx-auto" />
                            <p className="text-sm text-slate-500 mt-3">Cargando datos de planificación...</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex gap-0 overflow-hidden min-h-0">

                        {/* Left: Crews with drop zones */}
                        <div className="w-[45%] border-r border-slate-200 bg-white flex flex-col overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                    <Users size={16} className="text-brand-500" />
                                    Cuadrillas Activas
                                </h3>
                                <span className="text-xs font-bold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                                    {crews.length}
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {crews.map(crew => {
                                    const crewAssignment = assignments[crew.crew_id] || { communities: [], includesSena: false };
                                    const isDragOver = dragOverCrew === crew.crew_id;

                                    return (
                                        <div
                                            key={crew.crew_id}
                                            onDragOver={(e) => handleDragOver(e, crew.crew_id)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, crew.crew_id)}
                                            className={`rounded-xl border-2 transition-all ${isDragOver
                                                ? 'border-brand-400 bg-brand-50/50 shadow-lg shadow-brand-100'
                                                : crewAssignment.communities.length > 0 || crewAssignment.includesSena
                                                    ? 'border-brand-200 bg-white'
                                                    : 'border-slate-200 border-dashed bg-white'
                                                }`}
                                        >
                                            {/* Crew Header */}
                                            <div className="flex items-center justify-between p-3 border-b border-slate-100">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm">{crew.name}</h4>
                                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                        <Users size={10} /> {crew.leaderName}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {crewAssignment.communities.length > 0 && (
                                                        <span className="text-xs font-bold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                                                            {crewAssignment.communities.length} comunidad{crewAssignment.communities.length !== 1 ? 'es' : ''}
                                                        </span>
                                                    )}
                                                    {crewAssignment.includesSena && (
                                                        <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <School size={10} /> SENA
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Drop Zone */}
                                            <div className="p-2 min-h-[52px]">
                                                {crewAssignment.communities.length === 0 && !crewAssignment.includesSena ? (
                                                    <div className={`rounded-lg border border-dashed p-3 text-center transition-colors ${isDragOver ? 'border-brand-400 bg-brand-50' : 'border-slate-200 text-slate-400'}`}>
                                                        <p className="text-xs">Arrastra comunidades aquí</p>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {crewAssignment.includesSena && (
                                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                                                                <School size={12} /> Taller SENA
                                                                <button onClick={() => removeSenaFromCrew(crew.crew_id)}
                                                                    className="ml-1 p-0.5 hover:bg-emerald-200 rounded transition-colors">
                                                                    <X size={10} />
                                                                </button>
                                                            </div>
                                                        )}
                                                        {crewAssignment.communities.map((c, idx) => (
                                                            <div key={`${c.communityId}-${c.sourceType}-${idx}`}
                                                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-semibold ${sourceColor(c.sourceType)}`}>
                                                                {sourceIcon(c.sourceType)}
                                                                <span className="truncate max-w-[120px]">{c.communityName}</span>
                                                                <button onClick={() => removeCommunityFromCrew(crew.crew_id, idx)}
                                                                    className="ml-0.5 p-0.5 hover:bg-black/10 rounded transition-colors">
                                                                    <X size={10} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right: Source panels */}
                        <div className="w-[55%] flex flex-col overflow-hidden">
                            {/* Search */}
                            <div className="px-4 py-3 border-b border-slate-100 bg-white">
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Buscar comunidad..."
                                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* SENA Card */}
                                <SenaCard />

                                {/* Concertaciones */}
                                <SourcePanel
                                    title="Concertaciones"
                                    icon={Handshake}
                                    color="bg-purple-50 text-purple-800"
                                    items={concertations}
                                    panelKey="concertations"
                                    filterLabel="Recientes"
                                />

                                {/* Diagnósticos */}
                                <SourcePanel
                                    title="Diagnósticos"
                                    icon={Stethoscope}
                                    color="bg-sky-50 text-sky-800"
                                    items={diagnoses}
                                    panelKey="diagnoses"
                                    filterLabel="Recientes"
                                />

                                {/* OTs */}
                                <SourcePanel
                                    title="Órdenes de Trabajo"
                                    icon={Wrench}
                                    color="bg-amber-50 text-amber-800"
                                    items={workOrders}
                                    panelKey="workOrders"
                                    filterLabel="Pendientes"
                                />

                                {/* ALL Communities */}
                                <SourcePanel
                                    title="Todas las Comunidades"
                                    icon={Globe}
                                    color="bg-teal-50 text-teal-800"
                                    items={allCommunities}
                                    panelKey="allCommunities"
                                />

                                {/* Info tip */}
                                <div className="p-3 bg-brand-50 rounded-xl border border-brand-100 text-xs text-brand-700">
                                    <p className="flex items-start gap-2">
                                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                        <span>
                                            Arrastra las tarjetas de comunidad a las cuadrillas de la izquierda.
                                            Usa las cajas como filtro por entidad. Haz click en el botón de filtro para ver todos los registros o solo los filtrados por defecto.
                                            La tarjeta "Taller SENA" se puede asignar a múltiples cuadrillas.
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
                    <div className="text-sm text-slate-500">
                        <span className="font-semibold text-slate-700">{crewsWithAssignments}</span> cuadrilla{crewsWithAssignments !== 1 ? 's' : ''} con asignaciones
                        &nbsp;·&nbsp;
                        <span className="font-semibold text-slate-700">{totalAssigned}</span> destino{totalAssigned !== 1 ? 's' : ''} total
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} disabled={isGenerating}
                            className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">
                            Cancelar
                        </button>
                        <button onClick={handleGenerate}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                            {isGenerating ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Generando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={18} />
                                    Crear Asignaciones ({crewsWithAssignments})
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeeklyPlannerView;
