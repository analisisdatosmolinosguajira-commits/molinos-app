import { useState, useEffect } from 'react';
import { X, Save, Calendar, AlertCircle, MapPin, Plus, Search, Trash2, School } from 'lucide-react';
import { ActivityService } from '../../services/activities';
import { OperationalStaffService } from '../../services/operationalStaff';
import { CommunityService } from '../../services/communities';
import { MillService } from '../../services/mills';
import { WeeklyPlannerService } from '../../services/weeklyPlannerService';
import CrewAssignmentSelector from './CrewAssignmentSelector';

const ActivityFormModal = ({ isOpen, onClose, activity = null, initialData = null, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [activityTypes, setActivityTypes] = useState([]);
    const [staff, setStaff] = useState([]);
    const [communities, setCommunities] = useState([]);
    const [mills, setMills] = useState([]);

    // Multi-community state
    const [selectedCommunities, setSelectedCommunities] = useState([]);
    const [communitySearch, setCommunitySearch] = useState('');
    const [showCommunityPicker, setShowCommunityPicker] = useState(false);
    const [includesSena, setIncludesSena] = useState(false);

    const [formData, setFormData] = useState({
        activity_type_id: '',
        title: '',
        description: '',
        priority: 'MEDIA',
        status: 'PLANIFICADA',
        responsible_person_id: '',
        assigned_crew_id: '',
        planned_start_week: '',
        planned_end_week: '',
        estimated_duration_days: '',
        target_community_id: '',
        target_mill_id: '',
        target_location_notes: '',
        additional_resources_notes: ''
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            loadFormData();
        }
    }, [isOpen]);

    useEffect(() => {
        if (activity) {
            setFormData({
                activity_type_id: activity.activity_type_id || '',
                title: activity.title || '',
                description: activity.description || '',
                priority: activity.priority || 'MEDIA',
                status: activity.status || 'PLANIFICADA',
                responsible_person_id: activity.responsible_person_id || '',
                assigned_crew_id: activity.assigned_crew_id || '',
                planned_start_week: activity.planned_start_week || '',
                planned_end_week: activity.planned_end_week || '',
                estimated_duration_days: activity.estimated_duration_days || '',
                target_community_id: activity.target_community_id || '',
                target_mill_id: activity.target_mill_id || '',
                target_location_notes: activity.target_location_notes || '',
                additional_resources_notes: activity.additional_resources_notes || ''
            });

            // Load existing planned communities
            setIncludesSena(activity.includes_sena_workshop || false);
            if (activity.plannedCommunities && activity.plannedCommunities.length > 0) {
                setSelectedCommunities(activity.plannedCommunities.map(pc => ({
                    communityId: pc.community?.community_id || pc.communityId,
                    communityName: pc.communityName || pc.community?.name || 'Sin nombre',
                    sourceType: pc.source_type || 'community',
                    sourceId: pc.source_id || null,
                    activityCommunityId: pc.id // existing DB record ID
                })));
            } else {
                setSelectedCommunities([]);
            }
        } else if (initialData) {
            setFormData(prev => ({
                ...prev,
                ...initialData
            }));
            setSelectedCommunities([]);
            setIncludesSena(false);
        }
    }, [activity, initialData, isOpen]);

    const loadFormData = async () => {
        try {
            const [typesData, staffData, communitiesData, millsData] = await Promise.all([
                ActivityService.getActivityTypes(),
                OperationalStaffService.getOperationalStaff(),
                CommunityService.getCommunities(),
                MillService.getMills()
            ]);

            setActivityTypes(typesData);
            setStaff(staffData);
            setCommunities(communitiesData);
            setMills(millsData);
        } catch (error) {
            console.error('Error loading form data:', error);
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.activity_type_id) newErrors.activity_type_id = 'Tipo de actividad requerido';
        if (!formData.title.trim()) newErrors.title = 'Título requerido';
        if (!formData.planned_start_week) newErrors.planned_start_week = 'Fecha de inicio requerida';
        if (!formData.responsible_person_id) newErrors.responsible_person_id = 'Responsable requerido';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        try {
            setLoading(true);

            const activityData = {
                ...formData,
                estimated_duration_days: formData.estimated_duration_days ? parseInt(formData.estimated_duration_days) : null,
                assigned_crew_id: formData.assigned_crew_id ? parseInt(formData.assigned_crew_id) : null,
                responsible_person_id: formData.responsible_person_id ? parseInt(formData.responsible_person_id) : null,
                target_community_id: formData.target_community_id ? parseInt(formData.target_community_id) : null,
                target_mill_id: formData.target_mill_id ? parseInt(formData.target_mill_id) : null,
                includes_sena_workshop: includesSena
            };

            let savedActivity;
            if (activity) {
                savedActivity = await ActivityService.updateActivity(activity.activity_id, activityData);
            } else {
                savedActivity = await ActivityService.createActivity(activityData);
            }

            const activityId = savedActivity.activity_id;

            // Sync activity_community records
            await syncActivityCommunities(activityId);

            onSuccess?.();
            handleClose();
        } catch (error) {
            console.error('Error saving activity:', error);
            alert('Error al guardar la actividad. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const syncActivityCommunities = async (activityId) => {
        // For editing: delete all existing and re-insert
        if (activity) {
            await WeeklyPlannerService.deleteAllActivityCommunities(activityId);
        }

        // Insert new ones
        for (let i = 0; i < selectedCommunities.length; i++) {
            const c = selectedCommunities[i];
            await WeeklyPlannerService.addCommunityToActivity(activityId, {
                community_id: c.communityId,
                source_type: c.sourceType || 'community',
                source_id: c.sourceId || null,
                sort_order: i
            });
        }
    };

    // Community picker helpers
    const addCommunity = (comm) => {
        if (selectedCommunities.some(sc => sc.communityId === comm.community_id)) return;
        setSelectedCommunities(prev => [...prev, {
            communityId: comm.community_id,
            communityName: comm.name,
            sourceType: 'community',
            sourceId: null
        }]);
        setCommunitySearch('');
        setShowCommunityPicker(false);
    };

    const removeCommunity = (index) => {
        setSelectedCommunities(prev => prev.filter((_, i) => i !== index));
    };

    const filteredCommunities = communities.filter(c => {
        if (!communitySearch) return true;
        return c.name?.toLowerCase().includes(communitySearch.toLowerCase()) ||
            c.municipality?.toLowerCase().includes(communitySearch.toLowerCase());
    }).filter(c => !selectedCommunities.some(sc => sc.communityId === c.community_id));

    const handleClose = () => {
        setFormData({
            activity_type_id: '',
            title: '',
            description: '',
            priority: 'MEDIA',
            status: 'PLANIFICADA',
            responsible_person_id: '',
            assigned_crew_id: '',
            planned_start_week: '',
            planned_end_week: '',
            estimated_duration_days: '',
            target_community_id: '',
            target_mill_id: '',
            target_location_notes: '',
            additional_resources_notes: ''
        });
        setSelectedCommunities([]);
        setIncludesSena(false);
        setErrors({});
        setCommunitySearch('');
        setShowCommunityPicker(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose}></div>

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-slate-900">
                            {activity ? 'Editar Actividad' : 'Nueva Actividad Planificada'}
                        </h2>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                        <div className="px-6 py-4 space-y-6">
                            {/* Basic Info Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                                    Información Básica
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Activity Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Tipo de Actividad *
                                        </label>
                                        <select
                                            value={formData.activity_type_id}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const updates = { activity_type_id: val };
                                                if (val == 10) {
                                                    updates.target_community_id = '';
                                                    updates.target_mill_id = '';
                                                    updates.target_location_notes = 'Ruta general';
                                                }
                                                setFormData({ ...formData, ...updates });
                                            }}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errors.activity_type_id ? 'border-red-500' : 'border-gray-300'
                                                }`}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {activityTypes.map(type => (
                                                <option key={type.activity_type_id} value={type.activity_type_id}>
                                                    {type.name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.activity_type_id && (
                                            <p className="mt-1 text-xs text-red-600">{errors.activity_type_id}</p>
                                        )}
                                    </div>

                                    {/* Priority */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Prioridad
                                        </label>
                                        <select
                                            value={formData.priority}
                                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                        >
                                            <option value="BAJA">Baja</option>
                                            <option value="MEDIA">Media</option>
                                            <option value="ALTA">Alta</option>
                                            <option value="CRITICA">Crítica</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Título *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Ej: Diagnóstico Molino MIL-001"
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errors.title ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                    />
                                    {errors.title && (
                                        <p className="mt-1 text-xs text-red-600">{errors.title}</p>
                                    )}
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Descripción
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        placeholder="Descripción detallada de la actividad..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    />
                                </div>
                            </div>

                            {/* Assignment Section */}
                            <div className="space-y-4 border-t border-gray-200 pt-6">
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                                    Asignación
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Responsible Person */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Responsable *
                                        </label>
                                        <select
                                            value={formData.responsible_person_id}
                                            onChange={(e) => setFormData({ ...formData, responsible_person_id: e.target.value })}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errors.responsible_person_id ? 'border-red-500' : 'border-gray-300'
                                                }`}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {staff.map(person => (
                                                <option key={person.person_id} value={person.person_id}>
                                                    {person.first_name} {person.last_name} ({person.role})
                                                </option>
                                            ))}
                                        </select>
                                        {errors.responsible_person_id && (
                                            <p className="mt-1 text-xs text-red-600">{errors.responsible_person_id}</p>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Estado
                                        </label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                        >
                                            <option value="PLANIFICADA">Planificada</option>
                                            <option value="ASIGNADA">Asignada</option>
                                            <option value="EN_EJECUCION">En Ejecución</option>
                                            <option value="COMPLETADA">Completada</option>
                                            <option value="CANCELADA">Cancelada</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Crew */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Cuadrilla Asignada
                                    </label>
                                    <CrewAssignmentSelector
                                        value={formData.assigned_crew_id}
                                        onChange={(crewId) => setFormData({ ...formData, assigned_crew_id: crewId })}
                                    />
                                </div>
                            </div>

                            {/* Schedule Section */}
                            <div className="space-y-4 border-t border-gray-200 pt-6">
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                                    <Calendar size={16} />
                                    Programación
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Semana Inicio *
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.planned_start_week}
                                            onChange={(e) => setFormData({ ...formData, planned_start_week: e.target.value })}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errors.planned_start_week ? 'border-red-500' : 'border-gray-300'
                                                }`}
                                        />
                                        {errors.planned_start_week && (
                                            <p className="mt-1 text-xs text-red-600">{errors.planned_start_week}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Semana Fin
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.planned_end_week}
                                            onChange={(e) => setFormData({ ...formData, planned_end_week: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Duración (días)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.estimated_duration_days}
                                            onChange={(e) => setFormData({ ...formData, estimated_duration_days: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ===== LOCATION / COMMUNITIES Section ===== */}
                            <div className="space-y-4 border-t border-gray-200 pt-6">
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                                    <MapPin size={16} />
                                    Ubicación / Comunidades
                                </h3>

                                {/* Taller SENA toggle */}
                                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                                    <div
                                        className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${includesSena ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                        onClick={() => setIncludesSena(!includesSena)}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${includesSena ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <School size={16} className="text-emerald-600" />
                                        <span className="text-sm font-semibold text-emerald-800">Incluye Taller SENA</span>
                                    </div>
                                </div>

                                {/* Multi-community chips */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-sm font-medium text-slate-700">
                                            Comunidades Asignadas
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setShowCommunityPicker(!showCommunityPicker)}
                                            className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors"
                                        >
                                            <Plus size={14} /> Agregar Comunidad
                                        </button>
                                    </div>

                                    {/* Selected communities list */}
                                    {selectedCommunities.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic py-2">No hay comunidades asignadas. Las comunidades se pueden agregar desde aquí o desde la vista de planificación semanal.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {selectedCommunities.map((c, idx) => (
                                                <div key={`${c.communityId}-${idx}`}
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-800 text-sm font-medium group">
                                                    <MapPin size={12} />
                                                    <span>{c.communityName}</span>
                                                    {c.sourceType && c.sourceType !== 'community' && (
                                                        <span className="text-[10px] uppercase font-bold bg-brand-100 px-1.5 py-0.5 rounded-full">
                                                            {c.sourceType === 'work_order' ? 'OT' : c.sourceType === 'diagnosis' ? 'Diag.' : c.sourceType === 'concertation' ? 'Conc.' : c.sourceType}
                                                        </span>
                                                    )}
                                                    <button type="button" onClick={() => removeCommunity(idx)}
                                                        className="p-0.5 hover:bg-brand-200 rounded transition-colors opacity-70 hover:opacity-100">
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Community picker dropdown */}
                                    {showCommunityPicker && (
                                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-lg">
                                            <div className="p-2 border-b border-slate-100">
                                                <div className="relative">
                                                    <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        value={communitySearch}
                                                        onChange={(e) => setCommunitySearch(e.target.value)}
                                                        placeholder="Buscar comunidad..."
                                                        className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-[180px] overflow-y-auto">
                                                {filteredCommunities.length === 0 ? (
                                                    <p className="text-xs text-slate-400 text-center py-4">Sin comunidades disponibles</p>
                                                ) : (
                                                    filteredCommunities.slice(0, 20).map(comm => (
                                                        <button
                                                            key={comm.community_id}
                                                            type="button"
                                                            className="w-full text-left px-3 py-2 hover:bg-brand-50 flex items-center gap-2 text-sm border-b border-slate-50 transition-colors"
                                                            onClick={() => addCommunity(comm)}
                                                        >
                                                            <MapPin size={12} className="text-slate-400 shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <span className="font-medium text-slate-800">{comm.name}</span>
                                                                {comm.municipality && (
                                                                    <span className="text-xs text-slate-400 ml-2">{comm.municipality}</span>
                                                                )}
                                                            </div>
                                                            <Plus size={14} className="text-brand-500 shrink-0" />
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>


                                {/* Location Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Notas de Ubicación
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.target_location_notes}
                                        onChange={(e) => setFormData({ ...formData, target_location_notes: e.target.value })}
                                        placeholder="Detalles adicionales de ubicación..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    />
                                </div>
                            </div>

                            {/* Resources Section */}
                            <div className="border-t border-gray-200 pt-6">
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
                                    Recursos Adicionales
                                </h3>
                                <p className="text-xs text-slate-500 mb-3">
                                    Los recursos se gestionan en las órdenes de trabajo. Aquí solo notas adicionales.
                                </p>
                                <textarea
                                    value={formData.additional_resources_notes}
                                    onChange={(e) => setFormData({ ...formData, additional_resources_notes: e.target.value })}
                                    rows={3}
                                    placeholder="Ej: Requerir herramienta especializada X, coordinar transporte..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                />
                            </div>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-slate-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={18} />
                            {loading ? 'Guardando...' : (activity ? 'Actualizar' : 'Crear Actividad')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActivityFormModal;
