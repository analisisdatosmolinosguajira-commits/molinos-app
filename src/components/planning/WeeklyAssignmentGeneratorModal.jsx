import React, { useState, useEffect } from 'react';
import { X, Calendar, Users, AlertCircle, Loader2 } from 'lucide-react';
import { ActivityService } from '../../services/activities';

const WeeklyAssignmentGeneratorModal = ({ isOpen, onClose, onSuccess }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [stats, setStats] = useState({ activeCrews: 0 });

    useEffect(() => {
        if (isOpen) {
            // Set default dates: Next Monday to Sunday
            const today = new Date();
            const nextMonday = new Date(today);
            nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));

            const nextSunday = new Date(nextMonday);
            nextSunday.setDate(nextMonday.getDate() + 6);

            setStartDate(nextMonday.toISOString().split('T')[0]);
            setEndDate(nextSunday.toISOString().split('T')[0]);

            // Need to load active crews count
            fetchStats();
        }
    }, [isOpen]);

    const fetchStats = async () => {
        try {
            // we will need this method on ActivityService or we can just count crews directly via supabase
            const count = await ActivityService.getActiveCrewsCount();
            setStats({ activeCrews: count });
            setError('');
        } catch (err) {
            console.error(err);
            setError('Error al cargar datos estadísticos.');
        }
    };

    const handleGenerate = async () => {
        if (!startDate || !endDate) {
            setError('Debe seleccionar fecha de inicio y fin.');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            setError('La fecha de inicio no puede ser mayor a la fecha de fin.');
            return;
        }

        try {
            setIsGenerating(true);
            setError('');
            await ActivityService.generateWeeklyAssignments(startDate, endDate);
            onSuccess(); // Close and refresh
        } catch (err) {
            console.error('Error in generation:', err);
            setError(err.message || 'Error al generar asignaciones operativas.');
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Programación Semanal</h2>
                        <p className="text-sm text-slate-500 mt-1">Generar asignaciones masivas</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                        disabled={isGenerating}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 flex items-start gap-2">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="p-4 bg-brand-50/50 border border-blue-100 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
                                <Users size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-600">Cuadrillas Activas Encontradas</p>
                                <p className="text-xl font-bold text-slate-900">{stats.activeCrews}</p>
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-slate-600">
                        Se generará una (1) actividad planificada por cada cuadrilla activa en el sistema para el rango de fechas seleccionado. El título y tipo dependerá del tipo de cuadrilla.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Fecha Inicio
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                                    disabled={isGenerating}
                                />
                                <Calendar size={16} className="absolute left-3 top-2.5 text-slate-400" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Fecha Fin
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                                    disabled={isGenerating}
                                />
                                <Calendar size={16} className="absolute left-3 top-2.5 text-slate-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                        disabled={isGenerating}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || stats.activeCrews === 0}
                        className="flex items-center gap-2 px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Generando...
                            </>
                        ) : (
                            'Crear Asignaciones'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WeeklyAssignmentGeneratorModal;
