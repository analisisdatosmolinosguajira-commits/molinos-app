import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, MapPin, AlignLeft, FileText, Truck, AlertCircle } from 'lucide-react';
import { VisitService } from '../../services/visits';

const CreateJourneyModal = ({ isOpen, onClose, onSuccess, initialData = {} }) => {
    const [formData, setFormData] = useState({
        title: initialData.title || '',
        objective: initialData.objective || 'logistica', // Default
        start_date: initialData.start_date || new Date().toISOString().split('T')[0],
        end_date: initialData.end_date || new Date().toISOString().split('T')[0],
        description: initialData.description || '',
        status: initialData.status || 'PLANIFICADO',
        requires_overnight: false,
        related_activity_id: initialData.related_activity_id || null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    React.useEffect(() => {
        if (isOpen) {
            setFormData({
                title: initialData.title || '',
                objective: initialData.objective || 'logistica',
                start_date: initialData.start_date || new Date().toISOString().split('T')[0],
                end_date: initialData.end_date || new Date().toISOString().split('T')[0],
                description: initialData.description || '',
                status: initialData.status || 'PLANIFICADO',
                requires_overnight: false, // This might need to be part of the data model if persisted
                related_activity_id: initialData.related_activity_id || null
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const isEditing = !!initialData.raw_id;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Prepare payload: map description to notes and remove description field
            const { description, status, ...rest } = formData;
            const payload = {
                ...rest,
                notes: description,
                status: status || 'PLANIFICADO'
            };

            if (isEditing) {
                await VisitService.updateMovement(initialData.raw_id, payload);
            } else if (formData.related_activity_id) {
                await VisitService.createMovementFromActivity(formData.related_activity_id, payload);
            } else {
                await VisitService.createMovement(payload);
            }
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Error creating/updating journey:", err);
            setError(err.message || "Error al guardar el viaje");
        } finally {
            setLoading(false);
        }
    };

    return typeof document !== 'undefined' ? (
        createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Truck className="text-brand-600" size={24} />
                            {isEditing ? 'Editar Viaje' : 'Nuevo Viaje'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
                                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Title & Status */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Título del Viaje *
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej: Entrega de Materiales Zona Alta"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-brand-400 outline-none transition-all"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Estado
                                </label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-brand-400 outline-none transition-all bg-white"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="PLANIFICADO">Planificado</option>
                                    <option value="EN EJECUCION">En Ejecución</option>
                                    <option value="COMPLETADO">Completado</option>
                                    <option value="CANCELADO">Cancelado</option>
                                </select>
                            </div>
                        </div>

                        {/* Type & Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Tipo de Viaje
                                </label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-brand-400 outline-none appearance-none bg-white"
                                        value={formData.objective}
                                        onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                                    >
                                        <option value="logistica">Logística / Transporte</option>
                                        <option value="diagnostico">Diagnóstico Técnico</option>
                                        <option value="concertacion">Gestión Social</option>
                                        <option value="reparacion">Reparación</option>
                                        <option value="mixto">Mixto</option>
                                        <option value="inspeccion">Inspección</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="block text-sm font-medium text-slate-700">
                                    Fechas *
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        required
                                        type="date"
                                        className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-100 focus:border-brand-400 outline-none transition-all"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    />
                                    <span className="text-slate-400 self-center">-</span>
                                    <input
                                        required
                                        type="date"
                                        className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-100 focus:border-brand-400 outline-none transition-all"
                                        value={formData.end_date}
                                        min={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Descripción / Notas
                            </label>
                            <div className="relative">
                                <AlignLeft className="absolute left-3 top-3 text-slate-400" size={16} />
                                <textarea
                                    rows={3}
                                    placeholder="Detalles de la ruta, carga o requerimientos especiales..."
                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-brand-400 outline-none transition-all resize-none"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Options */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="overnight"
                                className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                                checked={formData.requires_overnight}
                                onChange={(e) => setFormData({ ...formData, requires_overnight: e.target.checked })}
                            />
                            <label htmlFor="overnight" className="text-sm text-slate-700 cursor-pointer select-none">
                                Requiere pernocta fuera de base
                            </label>
                        </div>

                        {/* Actions */}
                        <div className="pt-2 flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-all shadow-sm hover:shadow-md disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <MapPin size={18} />
                                        {isEditing ? 'Guardar Cambios' : 'Crear Viaje'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>,
            document.body
        )
    ) : null;
};

export default CreateJourneyModal;
