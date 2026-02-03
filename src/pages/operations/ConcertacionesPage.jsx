import React, { useState, useEffect } from 'react';
import { Users, FileSignature, Calendar, Plus } from 'lucide-react';
import { ConcertationService } from '../../services/concertations';

export default function ConcertacionesPage() {
    const [concertations, setConcertations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const data = await ConcertationService.getConcertations();
                setConcertations(data || []);
            } catch (err) {
                console.error("Error loading concertations:", err);
                setError("No se pudieron cargar las concertaciones.");
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando concertaciones...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Concertaciones</h1>
                    <p className="text-slate-500 mt-1">Acuerdos comunitarios y actas de entrega</p>
                </div>
                <button className="bg-social-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-social-700 shadow-lg shadow-social-500/30 transition-all font-medium">
                    <Plus size={20} />
                    Registrar Acta
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {concertations.map(c => (
                    <div key={c.concertation_id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:border-social-200 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-social-50 text-social-600 rounded-xl">
                                <Users size={24} />
                            </div>
                            <span className="px-2 py-1 bg-social-100 text-social-700 text-xs font-bold rounded border border-social-200 uppercase">
                                {c.status || 'ACTIVA'}
                            </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 mb-1">{c.community?.name || 'Comunidad Desconocida'}</h3>
                        <p className="text-slate-500 text-sm mb-4 line-clamp-2">{c.notes || 'Acta de concertación comunitaria.'}</p>

                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-4 bg-slate-50 p-2 rounded-lg">
                            <Calendar size={14} />
                            {c.meeting_date ? `Firmada el ${new Date(c.meeting_date).toLocaleDateString()}` : 'Fecha no registrada'}
                        </div>

                        <button className="w-full py-2 flex items-center justify-center gap-2 text-social-600 font-semibold border border-social-100 rounded-lg hover:bg-social-50 transition-colors">
                            <FileSignature size={16} />
                            Ver Documento
                        </button>
                    </div>
                ))}
            </div>

            {concertations.length === 0 && (
                <div className="p-8 text-center text-slate-500">No hay concertaciones registradas.</div>
            )}
        </div>
    );
}
