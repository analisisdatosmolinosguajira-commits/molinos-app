import { useState, useEffect } from 'react';
import { X, Save, Calendar, AlertCircle } from 'lucide-react';
import { ActivityService } from '../../services/activities';
import { OperationalStaffService } from '../../services/operationalStaff';
import { CommunityService } from '../../services/communities';
import { MillService } from '../../services/mills';
import CrewAssignmentSelector from './CrewAssignmentSelector';

const ActivityFormModal = ({ isOpen, onClose, activity = null, initialData = null, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [activityTypes, setActivityTypes] = useState([]);
    const [staff, setStaff] = useState([]);
    const [communities, setCommunities] = useState([]);
    const [mills, setMills] = useState([]);

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
        } else if (initialData) {
            setFormData(prev => ({
                ...prev,
                ...initialData
            }));
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

            // Get current user ID (you'll need to adjust this based on your auth system)
            const currentUserId = 1; // TODO: Get from auth context

            const activityData = {
                ...formData,
                estimated_duration_days: formData.estimated_duration_days ? parseInt(formData.estimated_duration_days) : null,
                assigned_crew_id: formData.assigned_crew_id ? parseInt(formData.assigned_crew_id) : null,
                responsible_person_id: formData.responsible_person_id ? parseInt(formData.responsible_person_id) : null,
                target_community_id: formData.target_community_id ? parseInt(formData.target_community_id) : null,
                target_mill_id: formData.target_mill_id ? parseInt(formData.target_mill_id) : null,
                // created_by: currentUserId // Removed to avoid potential FK/RLS issues for now
            };

            let savedActivity;
            if (activity) {
                // Update existing
                savedActivity = await ActivityService.updateActivity(activity.activity_id, activityData);
            } else {
                // Create new
                savedActivity = await ActivityService.createActivity(activityData);
            }

            // Resources are handled in work orders, not here

            onSuccess?.();
            handleClose();
        } catch (error) {
            console.error('Error saving activity:', error);
            alert('Error al guardar la actividad. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

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
        setErrors({});
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
                                            onChange={(e) => setFormData({ ...formData, activity_type_id: e.target.value })}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.activity_type_id ? 'border-red-500' : 'border-gray-300'
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
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.title ? 'border-red-500' : 'border-gray-300'
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.responsible_person_id ? 'border-red-500' : 'border-gray-300'
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
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                    {/* Start Date */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Semana Inicio *
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.planned_start_week}
                                            onChange={(e) => setFormData({ ...formData, planned_start_week: e.target.value })}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.planned_start_week ? 'border-red-500' : 'border-gray-300'
                                                }`}
                                        />
                                        {errors.planned_start_week && (
                                            <p className="mt-1 text-xs text-red-600">{errors.planned_start_week}</p>
                                        )}
                                    </div>

                                    {/* End Date */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Semana Fin
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.planned_end_week}
                                            onChange={(e) => setFormData({ ...formData, planned_end_week: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    {/* Duration */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Duración (días)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.estimated_duration_days}
                                            onChange={(e) => setFormData({ ...formData, estimated_duration_days: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Location Section */}
                            <div className="space-y-4 border-t border-gray-200 pt-6">
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                                    Ubicación / Objetivo
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Community */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Comunidad
                                        </label>
                                        <select
                                            value={formData.target_community_id}
                                            onChange={(e) => setFormData({ ...formData, target_community_id: e.target.value, target_mill_id: '' })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Seleccionar...</option>
                                            {communities.map(comm => (
                                                <option key={comm.community_id} value={comm.community_id}>
                                                    {comm.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Mill */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Molino
                                        </label>
                                        <select
                                            value={formData.target_mill_id}
                                            onChange={(e) => setFormData({ ...formData, target_mill_id: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Seleccionar...</option>
                                            {mills.map(mill => (
                                                <option key={mill.mill_id} value={mill.mill_id}>
                                                    {mill.code} - {mill.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
