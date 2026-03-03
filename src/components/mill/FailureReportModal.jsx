import React, { useState, useCallback } from 'react';
import { X, AlertTriangle, Send, Loader } from 'lucide-react';
import { supabase } from '../../services/supabase';
import AiAssistantPanel from '../ai/AiAssistantPanel';

export default function FailureReportModal({ isOpen, onClose, millId, millName }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        reported_by_name: '',
        priority: 'MEDIA',
        description: ''
    });

    const handleAiApplyFields = useCallback((fields) => {
        setFormData(prev => {
            const updated = { ...prev };
            if (fields.reported_by_name) updated.reported_by_name = fields.reported_by_name;
            if (fields.priority) updated.priority = fields.priority;
            if (fields.description) updated.description = fields.description;
            return updated;
        });
    }, []);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase
                .from('failure_report')
                .insert([{
                    mill_id: millId,
                    reported_by_name: formData.reported_by_name,
                    priority: formData.priority,
                    description: formData.description,
                    status: 'PENDIENTE'
                }]);

            if (error) throw error;
            onClose();
            alert('Reporte enviado correctamente');
        } catch (err) {
            console.error('Error reporting failure:', err);
            alert('Error al enviar el reporte');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <AlertTriangle className="text-red-500" />
                        Reportar Falla
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <AiAssistantPanel
                        modalType="failure_report"
                        onApplyFields={handleAiApplyFields}
                        disabled={loading}
                    />
                    <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 mb-2">
                        Reportando incidencia para: <span className="font-bold text-slate-800">{millName}</span>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tu Nombre</label>
                        <input
                            required
                            type="text"
                            value={formData.reported_by_name}
                            onChange={e => setFormData({ ...formData, reported_by_name: e.target.value })}
                            className="w-full px-4 py-2 border rounded-xl"
                            placeholder="Ej: Juan Pérez"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
                        <select
                            value={formData.priority}
                            onChange={e => setFormData({ ...formData, priority: e.target.value })}
                            className="w-full px-4 py-2 border rounded-xl"
                        >
                            <option value="BAJA">Baja - Se puede operar</option>
                            <option value="MEDIA">Media - Afecta operación</option>
                            <option value="ALTA">Alta - Molino detenido</option>
                            <option value="CRITICA">Crítica - Riesgo seguridad</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descripción de la Falla</label>
                        <textarea
                            required
                            rows={4}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 border rounded-xl"
                            placeholder="Describe qué está fallando, ruidos extraños, piezas rotas..."
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 font-medium">Cancelar</button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 flex items-center gap-2"
                        >
                            {loading ? <Loader className="animate-spin" size={18} /> : <Send size={18} />}
                            Enviar Reporte
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
