import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { MillService } from '../../services/mills';

const ReportSituationModal = ({ isOpen, onClose, communityId, communityName, onSuccess }) => {
    const [formData, setFormData] = useState({
        type: 'access_issue',
        title: '',
        description: '',
        severity: 'medium',
        start_date: new Date().toISOString().split('T')[0]
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const situationTypes = [
        { value: 'conflict', label: 'Conflicto entre familias', icon: '👥' },
        { value: 'strike', label: 'Paro o huelga', icon: '⚠️' },
        { value: 'access_issue', label: 'Problema de acceso', icon: '🚧' },
        { value: 'weather', label: 'Condición climática', icon: '🌧️' },
        { value: 'security', label: 'Seguridad', icon: '🛡️' },
        { value: 'other', label: 'Otro', icon: '📌' }
    ];

    const severityLevels = [
        { value: 'low', label: 'Baja', color: 'bg-green-100 text-green-700 border-green-300' },
        { value: 'medium', label: 'Media', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
        { value: 'high', label: 'Alta', color: 'bg-orange-100 text-orange-700 border-orange-300' },
        { value: 'critical', label: 'Crítica', color: 'bg-red-100 text-red-700 border-red-300' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            await MillService.createSocialSituation(communityId, formData);
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Error creating situation:', err);
            setError('No se pudo reportar la situación. Intenta nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6 rounded-t-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertTriangle size={28} />
                        <div>
                            <h2 className="text-2xl font-bold">Reportar Situación Social</h2>
                            <p className="text-sm text-amber-100">{communityName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Type Selection */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">
                            Tipo de Situación *
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {situationTypes.map(type => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: type.value })}
                                    className={`p-4 border-2 rounded-xl transition-all ${formData.type === type.value
                                            ? 'border-brand-500 bg-brand-50'
                                            : 'border-slate-200 hover:border-brand-300'
                                        }`}
                                >
                                    <div className="text-2xl mb-1">{type.icon}</div>
                                    <div className="text-sm font-semibold text-slate-700">{type.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Título *
                        </label>
                        <input
                            type="text"
                            required
                            maxLength={200}
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            placeholder="Ej: Carretera bloqueada por lluvias"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Descripción
                        </label>
                        <textarea
                            rows={4}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                            placeholder="Describe la situación con más detalle..."
                        />
                    </div>

                    {/* Severity */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">
                            Severidad *
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {severityLevels.map(level => (
                                <button
                                    key={level.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, severity: level.value })}
                                    className={`px-4 py-3 border-2 rounded-lg font-bold text-sm transition-all ${formData.severity === level.value
                                            ? level.color + ' border-current'
                                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    {level.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Start Date */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Fecha de Inicio *
                        </label>
                        <input
                            type="date"
                            required
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        />
                    </div>

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
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Reportando...' : 'Reportar Situación'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReportSituationModal;
