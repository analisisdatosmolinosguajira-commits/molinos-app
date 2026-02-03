import React, { useState, useEffect } from 'react';
import { Stethoscope, Plus, ArrowRight } from 'lucide-react';
import { VisitService } from '../../services/visits';
import StatusBadge from '../../components/ui/StatusBadge';
import { useNavigate } from 'react-router-dom';

export default function DiagnosticosPage() {
    const navigate = useNavigate();
    const [diagnoses, setDiagnoses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const allVisits = await VisitService.getVisits();
                const diagData = allVisits.filter(v => v.type === 'DIAGNOSTICO');
                setDiagnoses(diagData);
            } catch (err) {
                console.error("Error loading diagnoses:", err);
                setError("No se pudieron cargar los diagnósticos.");
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando diagnósticos...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    const pendingCount = diagnoses.filter(d => d.status === 'PENDING' || d.status === 'SCHEDULED' || d.status === 'COMPLETED').length; // Assuming completed diagnosis might need OT

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Diagnósticos</h1>
                    <p className="text-slate-500 mt-1">Evaluaciones técnicas preliminares</p>
                </div>
                <button className="bg-brand-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all font-medium">
                    <Plus size={20} />
                    Nuevo Diagnóstico
                </button>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                    <Stethoscope size={24} />
                </div>
                <div>
                    <h4 className="font-bold text-amber-800">Resumen de Actividad</h4>
                    <p className="text-sm text-amber-700/80">
                        {pendingCount} diagnósticos registrados recientemente.
                    </p>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4">ID</th>
                            <th className="px-6 py-4">Ubicación / Molino</th>
                            <th className="px-6 py-4">Fecha Visita</th>
                            <th className="px-6 py-4">Hallazgos</th>
                            <th className="px-6 py-4">Estado</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {diagnoses.map(d => (
                            <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-mono font-medium text-slate-600 text-xs">#{d.raw_id}</td>
                                <td className="px-6 py-4 font-bold text-slate-800">{d.location}</td>
                                <td className="px-6 py-4 text-slate-500">{new Date(d.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-slate-600 truncate max-w-xs">{d.description || 'Sin notas registradas'}</td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={d.status} size="sm" />
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => navigate(`/visitas/${d.id}`)}
                                        className="text-brand-600 font-medium text-xs hover:underline flex items-center justify-end gap-1 w-full"
                                    >
                                        Ver Detalles <ArrowRight size={12} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {diagnoses.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                                    No hay diagnósticos registrados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
