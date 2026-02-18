import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, FileSignature, Calendar, Plus, Search, Filter, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { ConcertationService } from '../../services/concertations';
import StatusBadge from '../../components/ui/StatusBadge';
import ConcertationForm from './ConcertationForm';

export default function ConcertacionesPage() {
    const [concertations, setConcertations] = useState([]);
    const [filteredConcertations, setFilteredConcertations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // View State
    const [selectedConcertationId, setSelectedConcertationId] = useState(null);
    const [isCreateMode, setIsCreateMode] = useState(false);
    const [searchParams] = useSearchParams();

    // Filters
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadConcertations();
        if (searchParams.get('action') === 'new') {
            setIsCreateMode(true);
        }
    }, [searchParams]);

    useEffect(() => {
        filterConcertations();
    }, [concertations, statusFilter, searchQuery]);

    async function loadConcertations() {
        try {
            setLoading(true);
            const data = await ConcertationService.getConcertations();
            setConcertations(data || []);
            setFilteredConcertations(data || []);
        } catch (err) {
            console.error("Error loading concertations:", err);
            setError("No se pudieron cargar las concertaciones.");
        } finally {
            setLoading(false);
        }
    }

    function filterConcertations() {
        let result = concertations;

        // Status Filter
        if (statusFilter !== 'ALL') {
            // DB uses lowercase (pendiente, finalizada, en_proceso)
            // Filter uses uppercase (PENDIENTE, FINALIZADA, EN_PROCESO)
            result = result.filter(c => getStatus(c).toUpperCase() === statusFilter);
        }

        // Search Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.community?.name?.toLowerCase().includes(q) ||
                c.notes?.toLowerCase().includes(q)
            );
        }

        setFilteredConcertations(result);
    }

    // Helper to normalize status if needed, or just use the DB field
    function getStatus(c) {
        return c.status || 'pendiente';
    }

    if (loading && concertations.length === 0) return <div className="p-8 text-center text-slate-500">Cargando concertaciones...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    // Create / Edit Mode
    if (selectedConcertationId) {
        return <ConcertationForm concertationId={selectedConcertationId} onBack={() => { setSelectedConcertationId(null); loadConcertations(); }} />;
    }

    if (isCreateMode) {
        return <ConcertationForm onBack={() => { setIsCreateMode(false); loadConcertations(); }} />;
    }

    return (
        <div className="space-y-6 animate-slide-up pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Concertaciones</h1>
                    <p className="text-slate-500 mt-1">Acuerdos comunitarios y actas de entrega</p>
                </div>
                <button
                    onClick={() => setIsCreateMode(true)}
                    className="bg-social-600 hover:bg-social-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-social-500/30 transition-all font-bold active:scale-95"
                >
                    <Plus size={20} />
                    Registrar Acta
                </button>
            </div>

            {/* Filters Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por comunidad, notas..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-social-500/20 focus:border-social-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Status Filter */}
                <div className="flex gap-2 items-center">
                    <Filter size={18} className="text-slate-400" />
                    <select
                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">Todos los Estados</option>
                        <option value="PENDIENTE">Pendientes</option>
                        <option value="EN_PROCESO">En Proceso</option>
                        <option value="FINALIZADA">Finalizadas</option>
                    </select>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Comunidad</th>
                            <th className="px-6 py-4">Fecha Reunión</th>
                            <th className="px-6 py-4">Diagnóstico</th>
                            <th className="px-6 py-4">Decisión</th>
                            <th className="px-6 py-4">Estado</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredConcertations.map(c => (
                            <tr key={c.concertation_id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedConcertationId(c.concertation_id)}>
                                <td className="px-6 py-4 font-bold text-slate-700">
                                    {c.community?.name || 'Comunidad Desconocida'}
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                    {c.meeting_date ? new Date(c.meeting_date).toLocaleDateString() : 'Por definir'}
                                </td>
                                <td className="px-6 py-4">
                                    {c.diagnosis ? (
                                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                                            {c.diagnosis.code}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400 italic">N/A</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${c.decision === 'approved' ? 'bg-green-100 text-green-700' :
                                        c.decision === 'rejected' ? 'bg-red-100 text-red-700' :
                                            c.decision === 'pending' ? 'bg-orange-100 text-orange-700' :
                                                'bg-slate-100 text-slate-500' // No decision
                                        }`}>
                                        {c.decision === 'approved' ? 'Aprobada' :
                                            c.decision === 'rejected' ? 'Rechazada' :
                                                c.decision === 'pending' ? 'Aplazada' : 'Sin decisión'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={c.status} size="sm" />
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedConcertationId(c.concertation_id);
                                        }}
                                        className="text-social-600 font-medium text-xs hover:underline flex items-center justify-end gap-1"
                                    >
                                        <FileSignature size={14} />
                                        Ver Detalles
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredConcertations.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Users className="opacity-20" size={48} />
                                        <p className="font-medium">No se encontraron concertaciones</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
