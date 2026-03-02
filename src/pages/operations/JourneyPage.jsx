import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Calendar, MapPin, Plus, Search, Pencil, Trash2,
    CheckCircle2, RefreshCw, Truck, Users, AlertTriangle, FileText, AlignLeft
} from 'lucide-react';
import VehicleManager from './VehicleManager';
import { useNavigate } from 'react-router-dom';
import { VisitService } from '../../services/visits';
import StatusBadge from '../../components/ui/StatusBadge';
import JourneyCalendar from './JourneyCalendar';
import CreateJourneyModal from './CreateJourneyModal';
import PermissionGate from '../../components/auth/PermissionGate';

const JourneyPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [journeys, setJourneys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState('ALL'); // ACTIVE, PLANNED, HISTORY, COMPLETED
    const [viewMode, setViewMode] = useState('list'); // list, calendar
    const [activeTab, setActiveTab] = useState('journeys'); // journeys, vehicles
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createModalInitialData, setCreateModalInitialData] = useState({});

    useEffect(() => {
        loadJourneys();

        // Handle URL Params
        if (searchParams.get('action') === 'new') {
            const type = searchParams.get('type');
            const activityId = searchParams.get('activity_id');

            if (type === 'movement') {
                setCreateModalInitialData({
                    objective: 'logistica', // Default for now, could be passed
                    related_activity_id: activityId ? parseInt(activityId) : null
                });
                setIsCreateModalOpen(true);
            }
        }
    }, [searchParams]);

    const loadJourneys = async () => {
        setLoading(true);
        try {
            const allVisits = await VisitService.getVisits();
            // Filter only movements (Entities starting with mov-)
            const movements = allVisits.filter(v => v.id.startsWith('mov-'));
            setJourneys(movements);
        } catch (error) {
            console.error("Error loading journeys:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditJourney = (journey) => {
        setCreateModalInitialData({
            raw_id: journey.raw_id,
            title: journey.title,
            objective: journey.objective,
            start_date: journey.start_date,
            end_date: journey.end_date,
            description: journey.notes,
            status: journey.status,
            related_activity_id: journey.linkedActivity?.id
        });
        setIsCreateModalOpen(true);
    };

    // Filtering Logic
    const filteredJourneys = journeys.filter(j => {
        const matchesSearch =
            j.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            j.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            j.description?.toLowerCase().includes(searchQuery.toLowerCase());

        const status = j.status?.toUpperCase();

        let matchesStatus = false;
        if (statusFilter === 'ALL') {
            matchesStatus = true;
        } else if (statusFilter === 'ACTIVE') {
            matchesStatus = ['IN_PROGRESS', 'EN_CURSO', 'READY', 'ASIGNADA', 'EN TALLER', 'ACTIVA'].includes(status);
        } else if (statusFilter === 'PLANNED') {
            matchesStatus = ['PLANIFICADO', 'PENDING', 'SCHEDULED'].includes(status);
        } else if (statusFilter === 'HISTORY') {
            matchesStatus = ['COMPLETED', 'COMPLETADO', 'CANCELLED', 'CANCELADO', 'FINALIZADO', 'CERRADO'].includes(status);
        } else if (statusFilter === 'COMPLETED') {
            matchesStatus = ['COMPLETED', 'COMPLETADO', 'FINALIZADO', 'CERRADO'].includes(status);
        }

        return matchesSearch && matchesStatus;
    });

    const JourneyCard = ({ journey }) => (
        <div
            onClick={() => navigate(`/visitas/${journey.id}`)}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-all cursor-pointer group relative"
        >
            <div className="absolute top-4 right-4 flex gap-2 z-10">
                <PermissionGate module="jornadas" action="update">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleEditJourney(journey);
                        }}
                        className="p-2 bg-white/90 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-full shadow-sm border border-slate-200 hover:border-indigo-100 transition-all"
                        title="Editar viaje"
                    >
                        <Pencil size={16} />
                    </button>
                </PermissionGate>
                <PermissionGate module="jornadas" action="delete">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteJourney(journey);
                        }}
                        className="p-2 bg-white/90 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-full shadow-sm border border-slate-200 hover:border-red-100 transition-all"
                        title="Eliminar viaje"
                    >
                        <Trash2 size={16} />
                    </button>
                </PermissionGate>
            </div>

            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <StatusBadge status={journey.status} />
                    {journey.logs && journey.logs.some(l => l.incident_reported) && (
                        <span className="text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border border-amber-200">
                            <AlertTriangle size={10} /> INCIDENCIA
                        </span>
                    )}
                </div>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(journey.date).toLocaleDateString()}
                </span>
            </div>

            <h3 className="font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">
                {journey.title}
            </h3>

            <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                <MapPin size={14} className="flex-shrink-0 text-slate-400" />
                <span className="truncate">{journey.location}</span>
            </div>

            {/* Resources Summary */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2">
                    <Truck size={14} className="text-slate-400" />
                    <div className="overflow-hidden">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Vehículos</p>
                        <p className="text-xs font-medium text-slate-700 truncate">
                            {journey.vehicles?.length > 0
                                ? journey.vehicles.map(v => v.vehicle?.plate_number).join(', ')
                                : 'Sin asignar'}
                        </p>
                    </div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2">
                    <Users size={14} className="text-slate-400" />
                    <div className="overflow-hidden">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Equipo</p>
                        <p className="text-xs font-medium text-slate-700 truncate">
                            {journey.crew}
                        </p>
                    </div>
                </div>
            </div>

            {/* Linked Activity */}
            {journey.linkedActivity && (
                <div className="text-xs bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg border border-indigo-100 flex items-center gap-2 truncate">
                    <FileText size={12} />
                    <span className="truncate">Actividad: {journey.linkedActivity.title}</span>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Gestión de Operaciones</h1>
                        <p className="text-slate-500">Control de desplazamientos y flota vehicular.</p>
                    </div>

                    {/* Top Level Tabs */}
                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <button
                            onClick={() => setActiveTab('journeys')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'journeys'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            Viajes
                        </button>
                        <button
                            onClick={() => setActiveTab('vehicles')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'vehicles'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            Vehículos
                        </button>
                    </div>
                </div>

                {activeTab === 'journeys' ? (
                    <>
                        {/* Journey Toolbar */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative w-full md:w-auto">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Buscar viajes..."
                                        className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 w-full md:w-64 outline-none"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={loadJourneys}
                                    className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors shadow-sm"
                                >
                                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                                </button>
                                <PermissionGate module="jornadas" action="create">
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl shadow-sm font-medium flex items-center gap-2 transition-all hover:translate-y-[-1px] whitespace-nowrap ml-auto md:ml-0">
                                        <Plus size={20} />
                                        <span className="hidden sm:inline">Nuevo Viaje</span>
                                    </button>
                                </PermissionGate>
                            </div>
                        </div>

                        {/* View Filters & Toggles */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
                            {/* Status Tabs */}
                            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto max-w-full">
                                {[
                                    { id: 'ALL', label: 'Todos', icon: FileText },
                                    { id: 'ACTIVE', label: 'En Ejecución', icon: Truck },
                                    { id: 'PLANNED', label: 'Planificados', icon: Calendar },
                                    { id: 'COMPLETED', label: 'Completados', icon: CheckCircle2 },
                                    { id: 'HISTORY', label: 'Historial', icon: CheckCircle2 }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setStatusFilter(tab.id)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap
                                    ${statusFilter === tab.id
                                                ? 'bg-slate-900 text-white shadow-md'
                                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                            }
                                `}
                                    >
                                        <tab.icon size={16} />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* View Toggle */}
                            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    title="Vista de Lista"
                                >
                                    <AlignLeft size={20} />
                                </button>
                                <button
                                    onClick={() => setViewMode('calendar')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    title="Vista de Calendario"
                                >
                                    <Calendar size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : viewMode === 'calendar' ? (
                            <JourneyCalendar journeys={filteredJourneys} />
                        ) : filteredJourneys.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Truck className="text-slate-300" size={32} />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900 mb-1">No se encontraron viajes</h3>
                                <p className="text-slate-500 max-w-sm mx-auto">
                                    No hay desplazamientos en esta categoría. Intenta cambiar los filtros o crear uno nuevo.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredJourneys.map(journey => (
                                    <JourneyCard key={journey.id} journey={journey} />
                                ))}
                            </div>

                        )}
                    </>
                ) : (
                    <VehicleManager />
                )}
            </div>

            <CreateJourneyModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setCreateModalInitialData({});
                }}
                onSuccess={loadJourneys}
                initialData={createModalInitialData}
            />
        </div>
    );
};

export default JourneyPage;
