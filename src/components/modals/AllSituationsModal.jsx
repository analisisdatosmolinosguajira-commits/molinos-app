import React, { useState } from 'react';
import { X, AlertTriangle, Eye, Edit3 } from 'lucide-react';
import UpdateSituationModal from './UpdateSituationModal';

const AllSituationsModal = ({ isOpen, onClose, situations, onUpdate }) => {
    const [selectedSituation, setSelectedSituation] = useState(null);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [filter, setFilter] = useState('all'); // 'all', 'active', 'monitoring', 'resolved'

    const typeIcons = {
        conflict: '👥',
        strike: '⚠️',
        access_issue: '🚧',
        weather: '🌧️',
        security: '🛡️',
        other: '📌'
    };

    const severityConfig = {
        low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', label: 'Baja' },
        medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', label: 'Media' },
        high: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', label: 'Alta' },
        critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: 'Crítica' }
    };

    const statusConfig = {
        active: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Activo', icon: '🔵' },
        monitoring: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Monitoreando', icon: '🟣' },
        resolved: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Resuelto', icon: '✅' }
    };

    const filteredSituations = situations?.filter(s => {
        if (filter === 'all') return true;
        return s.status === filter;
    }) || [];

    const handleUpdate = (situation) => {
        setSelectedSituation(situation);
        setIsUpdateModalOpen(true);
    };

    const handleUpdateSuccess = () => {
        setIsUpdateModalOpen(false);
        setSelectedSituation(null);
        onUpdate?.();
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-amber-500 to-red-500 text-white p-6 rounded-t-2xl flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={28} />
                            <div>
                                <h2 className="text-2xl font-bold">Todas las Situaciones Sociales</h2>
                                <p className="text-sm text-amber-100">
                                    {situations?.length || 0} situaciones registradas
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="p-6 border-b bg-slate-50 flex-shrink-0">
                        <div className="flex gap-2">
                            {[
                                { value: 'all', label: 'Todas' },
                                { value: 'active', label: 'Activas' },
                                { value: 'monitoring', label: 'Monitoreando' },
                                { value: 'resolved', label: 'Resueltas' }
                            ].map(filterOption => (
                                <button
                                    key={filterOption.value}
                                    onClick={() => setFilter(filterOption.value)}
                                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${filter === filterOption.value
                                            ? 'bg-brand-500 text-white'
                                            : 'bg-white border border-slate-300 text-slate-600 hover:border-brand-300'
                                        }`}
                                >
                                    {filterOption.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Situations List */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {filteredSituations.length === 0 ? (
                            <div className="text-center py-12">
                                <AlertTriangle size={48} className="mx-auto text-slate-300 mb-3" />
                                <p className="text-slate-500">No hay situaciones {filter !== 'all' ? statusConfig[filter]?.label.toLowerCase() : ''}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredSituations.map((situation) => {
                                    const severity = severityConfig[situation.severity] || severityConfig.medium;
                                    const status = statusConfig[situation.status] || statusConfig.active;

                                    return (
                                        <div
                                            key={situation.situation_id}
                                            className={`bg-white border-2 ${severity.border} rounded-xl p-5 hover:shadow-md transition-all`}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-start gap-3 flex-1">
                                                    <span className="text-2xl">{typeIcons[situation.type] || '📌'}</span>
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-slate-900 text-lg mb-1">
                                                            {situation.title}
                                                        </h3>
                                                        <p className="text-sm text-slate-600 mb-3">
                                                            {situation.description}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className={`px-3 py-1 rounded-lg font-bold text-xs ${severity.bg} ${severity.text}`}>
                                                                {severity.label}
                                                            </span>
                                                            <span className={`px-3 py-1 rounded-lg font-semibold text-xs ${status.bg} ${status.text}`}>
                                                                {status.icon} {status.label}
                                                            </span>
                                                            <span className="text-xs text-slate-500">
                                                                Inicio: {new Date(situation.start_date).toLocaleDateString()}
                                                            </span>
                                                            <span className="text-xs text-slate-500">
                                                                ({Math.floor((new Date() - new Date(situation.start_date)) / (1000 * 60 * 60 * 24))} días)
                                                            </span>
                                                        </div>
                                                        {situation.status === 'resolved' && situation.resolution_date && (
                                                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                                                <p className="text-xs font-semibold text-green-700 mb-1">
                                                                    Resuelto: {new Date(situation.resolution_date).toLocaleDateString()}
                                                                </p>
                                                                {situation.resolution_notes && (
                                                                    <p className="text-xs text-green-600">
                                                                        {situation.resolution_notes}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleUpdate(situation)}
                                                    className="ml-4 p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors flex-shrink-0"
                                                    title="Actualizar estado"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t bg-slate-50 flex-shrink-0">
                        <button
                            onClick={onClose}
                            className="w-full px-6 py-3 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>

            {/* Update Modal */}
            <UpdateSituationModal
                isOpen={isUpdateModalOpen}
                onClose={() => {
                    setIsUpdateModalOpen(false);
                    setSelectedSituation(null);
                }}
                situation={selectedSituation}
                onSuccess={handleUpdateSuccess}
            />
        </>
    );
};

export default AllSituationsModal;
