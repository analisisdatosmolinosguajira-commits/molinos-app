import React, { useState, useEffect } from 'react';
import { X, MapPin, Calendar, Users, FileText, AlertCircle } from 'lucide-react';
import { VisitService } from '../../services/visits';
import { CommunityService } from '../../services/communities';
import { MillService } from '../../services/mills';

export default function CreateMovementFromActivityModal({ activity, isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        type: 'LOGISTICA',
        start_date: '',
        end_date: '',
        description: '',
        vehicle_info: '',
        notes: ''
    });
    const [communities, setCommunities] = useState([]);
    const [mills, setMills] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && activity) {
            // Pre-fill form from activity data
            setFormData({
                type: mapActivityTypeToMovementType(activity.activity_type?.name),
                start_date: activity.planned_start_week || '',
                end_date: activity.planned_end_week || '',
                description: activity.description || '',
                vehicle_info: '',
                notes: `Creado desde actividad: ${activity.title}`
            });

            // Load communities and mills
            loadCommunities();
            loadMills();
        }
    }, [isOpen, activity]);

    const mapActivityTypeToMovementType = (activityType) => {
        const mapping = {
            'Inspección': 'DIAGNOSTICO',
            'Reparación': 'REPARACION',
            'Transporte': 'LOGISTICA',
            'Comunitaria': 'SOCIAL'
        };
        return mapping[activityType] || 'LOGISTICA';
    };

    const loadCommunities = async () => {
        try {
            const data = await CommunityService.getCommunities();
            setCommunities(data || []);
        } catch (err) {
            console.error('Error loading communities:', err);
        }
    };

    const loadMills = async () => {
        try {
            const data = await MillService.getMills();
            setMills(data || []);
        } catch (err) {
            console.error('Error loading mills:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Create movement from activity
            const movement = await VisitService.createMovementFromActivity(
                activity.activity_id,
                formData
            );

            // Success callback
            if (onSuccess) {
                onSuccess(movement);
            }

            // Close modal
            onClose();
        } catch (err) {
            console.error('Error creating movement:', err);
            setError(err.message || 'Error al crear el movimiento');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-start rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Crear Movimiento</h2>
                        <p className="text-sm text-slate-600 mt-1">
                            Desde actividad: <span className="font-medium text-brand-600">{activity?.title}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                            <div>
                                <p className="font-medium text-red-900">Error</p>
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Activity Info Card */}
                    <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
                        <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                            <Calendar size={18} />
                            Información de la Actividad
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-brand-700 font-medium">Tipo</p>
                                <p className="text-blue-900">{activity?.activity_type?.name || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-brand-700 font-medium">Estado</p>
                                <p className="text-blue-900">{activity?.status || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-brand-700 font-medium">Cuadrilla</p>
                                <p className="text-blue-900">{activity?.crew?.name || 'Sin asignar'}</p>
                            </div>
                            <div>
                                <p className="text-brand-700 font-medium">Ubicación</p>
                                <p className="text-blue-900">
                                    {activity?.target_community?.name || activity?.target_mill?.name || 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Movement Type Selector */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">
                            Tipo de Movimiento *
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {['LOGISTICA', 'DIAGNOSTICO', 'REPARACION', 'SOCIAL'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => handleChange('type', type)}
                                    className={`p-3 rounded-xl border-2 font-medium text-sm transition-all ${formData.type === type
                                            ? 'bg-brand-50 border-brand-500 text-brand-700'
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700">
                                Fecha Inicio *
                            </label>
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => handleChange('start_date', e.target.value)}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700">
                                Fecha Fin *
                            </label>
                            <input
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => handleChange('end_date', e.target.value)}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
                                required
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">
                            Descripción
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all resize-none"
                            placeholder="Descripción del movimiento..."
                        />
                    </div>

                    {/* Vehicle Info (for LOGISTICA type) */}
                    {formData.type === 'LOGISTICA' && (
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700">
                                Información del Vehículo
                            </label>
                            <input
                                type="text"
                                value={formData.vehicle_info}
                                onChange={(e) => handleChange('vehicle_info', e.target.value)}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
                                placeholder="Placa, modelo, conductor..."
                            />
                        </div>
                    )}

                    {/* Additional Notes */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">
                            Notas Adicionales
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            rows={2}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all resize-none"
                            placeholder="Notas, observaciones, recordatorios..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-6 py-3 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Creando...
                                </>
                            ) : (
                                <>
                                    <MapPin size={18} />
                                    Crear Movimiento
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
