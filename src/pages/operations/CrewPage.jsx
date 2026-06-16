import React, { useState, useEffect } from 'react';
import { Users, Plus, Shield, Wrench, UserCheck } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { CrewService } from '../../services/crews';
import CrewSignatureEditor from './CrewSignatureEditor';

export default function CrewPage() {
    const [crews, setCrews] = useState([]);
    const [selectedCrew, setSelectedCrew] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadCrews();
    }, []);

    async function loadCrews() {
        try {
            setLoading(true);
            const data = await CrewService.getCrews();
            setCrews(data || []);
            // Select first crew by default if available
            if (data?.length > 0 && !selectedCrew) {
                loadCrewDetails(data[0].crew_id);
            } else if (data?.length === 0) {
                setLoading(false);
            }
        } catch (err) {
            console.error("Error loading crews:", err);
            setError("No se pudieron cargar las cuadrillas.");
            setLoading(false);
        }
    }

    async function loadCrewDetails(id) {
        try {
            // keep main loading false, maybe local loading?
            const detail = await CrewService.getCrewById(id);
            setSelectedCrew(detail);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    if (loading && !crews.length) return <div className="p-8 text-center text-slate-500">Cargando cuadrillas...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Cuadrillas y Personal</h1>
                    <p className="text-slate-500 mt-1">Gestión de equipos técnicos</p>
                </div>
                <button className="bg-brand-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all font-medium">
                    <Plus size={20} />
                    Nueva Cuadrilla
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Crew List (Sidebar) */}
                <div className="space-y-4">
                    {crews.map(crew => (
                        <div
                            key={crew.crew_id}
                            onClick={() => loadCrewDetails(crew.crew_id)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedCrew?.crew_id === crew.crew_id
                                ? 'bg-brand-50 border-brand-200 shadow-sm ring-1 ring-brand-200'
                                : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                                }`}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <h3 className={`font-bold ${selectedCrew?.crew_id === crew.crew_id ? 'text-brand-700' : 'text-slate-700'}`}>
                                    {crew.name}
                                </h3>
                                {crew.active ? (
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                ) : (
                                    <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2">{crew.description || 'Sin descripción'}</p>
                        </div>
                    ))}
                    {crews.length === 0 && (
                        <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-500 text-sm">
                            No hay cuadrillas registradas.
                        </div>
                    )}
                </div>

                {/* Crew Details (Main) */}
                <div className="lg:col-span-2">
                    {selectedCrew ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            {/* Crew Header */}
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-brand-600 shadow-sm text-2xl font-bold border border-slate-100">
                                        {selectedCrew.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">{selectedCrew.name}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${selectedCrew.active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                {selectedCrew.active ? 'Activa' : 'Inactiva'}
                                            </span>
                                            <span className="text-slate-400 text-sm">•</span>
                                            <span className="text-slate-500 text-sm">{selectedCrew.members?.length || 0} Miembros</span>
                                        </div>
                                    </div>
                                </div>
                                <button className="text-slate-400 hover:text-brand-600">
                                    <Plus size={20} />
                                </button>
                            </div>

                            {/* Members List */}
                            <div className="p-6">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Miembros del Equipo</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedCrew.members && selectedCrew.members.length > 0 ? (
                                        selectedCrew.members.map(member => (
                                            <div key={member.crew_member_id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                                    <UserCheck size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{member.name || `Miembro #${member.crew_member_id}`}</p>
                                                    <p className="text-xs text-slate-500 capitalize">{member.role || 'Técnico'}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-2 text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            No hay técnicos asignados a esta cuadrilla.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Crew Signature */}
                            <CrewSignatureEditor 
                                crew={selectedCrew} 
                                onUpdated={(updatedCrew) => {
                                    setSelectedCrew({ ...selectedCrew, ...updatedCrew });
                                }} 
                            />
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center p-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            Selecciona una cuadrilla para ver detalles.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
