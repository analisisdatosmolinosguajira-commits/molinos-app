import { useState, useEffect } from 'react';
import { Plus, Filter, Calendar, List, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ActivityService } from '../../services/activities';
import ActivityCard from './ActivityCard';
import ActivityFormModal from './ActivityFormModal';
import MonthlyCalendar from './MonthlyCalendar';
import LinkActivityModal from './LinkActivityModal';
import WeeklyPlanningBoard from './WeeklyPlanningBoard';
import MaterialDeliveryModal from './MaterialDeliveryModal';
import WeeklyAssignmentGeneratorModal from './WeeklyAssignmentGeneratorModal';

const ActivityPlanning = () => {
    const navigate = useNavigate();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [selectedLinkActivity, setSelectedLinkActivity] = useState(null);
    // New modal for delivery
    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
    const [selectedDeliveryActivity, setSelectedDeliveryActivity] = useState(null);

    // Generator modal
    const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [initialFormData, setInitialFormData] = useState(null);

    // Filters
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        crewId: '',
        search: ''
    });

    useEffect(() => {
        loadActivities();
    }, [filters]);

    const loadActivities = async () => {
        try {
            setLoading(true);
            const data = await ActivityService.getPlannedActivities(filters);
            setActivities(data);
        } catch (error) {
            console.error('Error loading activities:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateActivity = (initialData = null) => {
        setSelectedActivity(null);
        // Ignore React Synthetic Events, only accept actual data objects
        const data = (initialData && typeof initialData === 'object' && !initialData.nativeEvent) ? initialData : null;
        setInitialFormData(data); // Set initial data (e.g. from DnD)
        setIsModalOpen(true);
    };

    const handleEditActivity = (activity, action) => {
        if (action === 'delivery') {
            setSelectedDeliveryActivity(activity);
            setIsDeliveryModalOpen(true);
        } else {
            setSelectedActivity(activity);
            setIsModalOpen(true);
        }
    };

    const handleDeleteActivity = async (activity) => {
        if (!confirm(`¿Estás seguro de eliminar "${activity.title}"?`)) return;

        try {
            await ActivityService.deleteActivity(activity.activity_id);
            loadActivities();
        } catch (error) {
            console.error('Error deleting activity:', error);
            alert('Error al eliminar la actividad');
        }
    };

    const handleLinkMovement = (activity) => {
        setSelectedLinkActivity(activity);
        setIsLinkModalOpen(true);
    };

    const handleUnlinkEntity = async (activityId, entityType, entityId) => {
        if (!confirm('¿Estás seguro de desvincular este elemento?')) return;

        try {
            await ActivityService.unlinkEntity(activityId, entityType, entityId);
            loadActivities();
        } catch (error) {
            console.error('Error unlinking entity:', error);
            alert('Error al desvincular el elemento');
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const groupActivitiesByWeek = () => {
        const grouped = {};

        activities.forEach(activity => {
            const weekKey = activity.planned_start_week || 'Sin fecha';
            if (!grouped[weekKey]) {
                grouped[weekKey] = [];
            }
            grouped[weekKey].push(activity);
        });

        return Object.entries(grouped).sort((a, b) => {
            if (a[0] === 'Sin fecha') return 1;
            if (b[0] === 'Sin fecha') return -1;
            return new Date(b[0]) - new Date(a[0]);
        });
    };

    const getStatusCounts = () => {
        const counts = {
            total: activities.length,
            PLANIFICADA: 0,
            ASIGNADA: 0,
            EN_EJECUCION: 0,
            COMPLETADA: 0,
            CANCELADA: 0
        };

        activities.forEach(act => {
            if (counts[act.status] !== undefined) {
                counts[act.status]++;
            }
        });

        return counts;
    };

    const counts = getStatusCounts();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Planificación de Actividades</h2>
                    <p className="text-sm text-slate-600 mt-1">
                        Gestiona y programa las actividades operacionales
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsGeneratorModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-700 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors font-medium"
                    >
                        <Calendar size={18} />
                        Crear nueva asignación semanal
                    </button>
                    <button
                        onClick={handleCreateActivity}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium shadow-sm"
                    >
                        <Plus size={18} />
                        Nueva Actividad
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-slate-900">{counts.total}</div>
                    <div className="text-xs text-slate-600 mt-1">Total</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-slate-600">{counts.PLANIFICADA}</div>
                    <div className="text-xs text-slate-600 mt-1">Planificadas</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-brand-600">{counts.ASIGNADA}</div>
                    <div className="text-xs text-slate-600 mt-1">Asignadas</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-brand-600">{counts.EN_EJECUCION}</div>
                    <div className="text-xs text-slate-600 mt-1">En Curso</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-green-600">{counts.COMPLETADA}</div>
                    <div className="text-xs text-slate-600 mt-1">Completadas</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-red-600">{counts.CANCELADA}</div>
                    <div className="text-xs text-slate-600 mt-1">Canceladas</div>
                </div>
            </div>

            {/* Filters and Controls */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    {/* Filters */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Filter size={18} className="text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">Filtros:</span>
                        </div>

                        {/* Search Input */}
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            placeholder="Buscar por título o descripción..."
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 w-64"
                        />

                        {/* Status Filter */}
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        >
                            <option value="">Todos los estados</option>
                            <option value="PLANIFICADA">Planificada</option>
                            <option value="ASIGNADA">Asignada</option>
                            <option value="EN_EJECUCION">En Ejecución</option>
                            <option value="COMPLETADA">Completada</option>
                            <option value="CANCELADA">Cancelada</option>
                        </select>

                        {/* Priority Filter */}
                        <select
                            value={filters.priority}
                            onChange={(e) => handleFilterChange('priority', e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        >
                            <option value="">Todas las prioridades</option>
                            <option value="BAJA">Baja</option>
                            <option value="MEDIA">Media</option>
                            <option value="ALTA">Alta</option>
                            <option value="CRITICA">Crítica</option>
                        </select>

                        {/* Refresh Button */}
                        <button
                            onClick={loadActivities}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            <RefreshCw size={16} />
                            Actualizar
                        </button>
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            <List size={16} />
                            Lista
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'calendar'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            <Calendar size={16} />
                            Calendario
                        </button>
                        <button
                            onClick={() => setViewMode('weekly')}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'weekly'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            <Calendar size={16} />
                            Semanal
                        </button>
                    </div>
                </div>
            </div>

            {/* Activities List/Calendar */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                </div>
            ) : activities.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">
                        No hay actividades planificadas
                    </h3>
                    <p className="text-slate-600 mb-6">
                        Comienza creando tu primera actividad
                    </p>
                    <button
                        onClick={handleCreateActivity}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
                    >
                        <Plus size={18} />
                        Nueva Actividad
                    </button>
                </div>
            ) : viewMode === 'list' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activities.map((activity) => (
                        <ActivityCard
                            key={activity.activity_id}
                            activity={activity}
                            onEdit={handleEditActivity}
                            onDelete={handleDeleteActivity}
                            onLinkMovement={handleLinkMovement}
                            onUnlinkEntity={handleUnlinkEntity}
                        />
                    ))}
                </div>
            ) : viewMode === 'calendar' ? (
                // Calendar view (monthly calendar)
                <MonthlyCalendar
                    activities={activities}
                    onEditActivity={handleEditActivity}
                    onDeleteActivity={handleDeleteActivity}
                    onLinkMovement={handleLinkMovement}
                />
            ) : viewMode === 'weekly' ? (
                <WeeklyPlanningBoard
                    activities={activities}
                    currentDate={currentDate}
                    onDateChange={setCurrentDate}
                    onAddActivity={handleCreateActivity}
                    onEditActivity={handleEditActivity}
                    onLinkActivity={handleLinkMovement}
                />
            ) : null}



            {/* Activity Form Modal */}
            <ActivityFormModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedActivity(null);
                }}
                activity={selectedActivity}
                initialData={initialFormData}
                onSuccess={loadActivities}
            />

            {/* Link Activity Modal */}
            <LinkActivityModal
                isOpen={isLinkModalOpen}
                onClose={() => {
                    setIsLinkModalOpen(false);
                    setSelectedLinkActivity(null);
                }}
                activity={selectedLinkActivity}
                onSuccess={loadActivities}
            />

            {/* Material Delivery Modal */}
            <MaterialDeliveryModal
                isOpen={isDeliveryModalOpen}
                onClose={() => {
                    setIsDeliveryModalOpen(false);
                    setSelectedDeliveryActivity(null);
                }}
                activity={selectedDeliveryActivity}
                onSuccess={loadActivities}
            />

            {/* Generator Modal */}
            <WeeklyAssignmentGeneratorModal
                isOpen={isGeneratorModalOpen}
                onClose={() => setIsGeneratorModalOpen(false)}
                onSuccess={() => {
                    setIsGeneratorModalOpen(false);
                    loadActivities();
                }}
            />
        </div>
    );
};

export default ActivityPlanning;
