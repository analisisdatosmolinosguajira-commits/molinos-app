import React, { useState } from 'react';
import { X, CheckCircle, Eye, Edit3 } from 'lucide-react';
import { MillService } from '../../services/mills';

const UpdateSituationModal = ({ isOpen, onClose, situation, onSuccess, service = null }) => {
    const [formData, setFormData] = useState({
        status: situation?.status || 'active',
        resolution_notes: situation?.resolution_notes || '',
        resolution_date: situation?.resolution_date || new Date().toISOString().split('T')[0]
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const statusOptions = [
        { value: 'active', label: 'Activo', color: 'bg-blue-100 text-blue-700', icon: '🔵' },
        { value: 'monitoring', label: 'Monitoreando', color: 'bg-purple-100 text-purple-700', icon: '🟣' },
        { value: 'resolved', label: 'Resuelto', color: 'bg-gray-100 text-gray-700', icon: '✅' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const updates = {
                status: formData.status
            };

            if (formData.status === 'resolved') {
                updates.resolution_date = formData.resolution_date;
                updates.resolution_notes = formData.resolution_notes;
            }

            if (service && service.updateSocialSituation) {
                await service.updateSocialSituation(situation.situation_id, updates);
            } else {
                await MillService.updateSocialSituation(situation.situation_id, updates);
            }
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Error updating situation:', err);
            setError('No se pudo actualizar la situación. Intenta nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !situation) return null;

    const severityConfig = {
        low: { bg: 'bg-green-100', text: 'text-green-700', label: 'Baja' },
        medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Media' },
        high: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Alta' },
        critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'Crítica' }
    };
    const severity = severityConfig[situation.severity] || severityConfig.medium;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-blue-500 text-white p-6 rounded-t-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Edit3 size={28} />
                        <div>
                            <h2 className="text-2xl font-bold">Actualizar Situación</h2>
                            <p className="text-sm text-purple-100">Cambiar estado o agregar notas</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Situation Summary */}
                <div className="p-6 bg-slate-50 border-b">
                    <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-bold text-slate-900">{situation.title}</h3>
                        <span className={`px-3 py-1 rounded-lg font-bold text-sm ${severity.bg} ${severity.text}`}>
                            {severity.label}
                        </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{situation.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Inicio: {new Date(situation.start_date).toLocaleDateString()}</span>
                        <span>
                            Duración: {Math.floor((new Date() - new Date(situation.start_date)) / (1000 * 60 * 60 * 24))} días
                        </span>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Status Selection */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">
                            Estado de la Situación *
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {statusOptions.map(status => (
                                <button
                                    key={status.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: status.value })}
                                    className={`p-4 border-2 rounded-xl transition-all ${formData.status === status.value
                                        ? `${status.color} border-current`
                                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    <div className="text-2xl mb-2">{status.icon}</div>
                                    <div className="text-sm font-semibold">{status.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Resolution Fields (only if status is 'resolved') */}
                    {formData.status === 'resolved' && (
                        <>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Fecha de Resolución *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.resolution_date}
                                    onChange={(e) => setFormData({ ...formData, resolution_date: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Notas de Resolución
                                </label>
                                <textarea
                                    rows={4}
                                    value={formData.resolution_notes}
                                    onChange={(e) => setFormData({ ...formData, resolution_notes: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                                    placeholder="Describe cómo se resolvió la situación..."
                                />
                            </div>
                        </>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Actualizando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UpdateSituationModal;
