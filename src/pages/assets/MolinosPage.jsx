import React, { useState, useEffect } from 'react';
import { Search, Filter, Wind, MapPin, ChevronRight, Plus } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import MillDetail from './MillDetail';
import { MillService } from '../../services/mills';

export default function MolinosPage() {
    const [mills, setMills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMillId, setSelectedMillId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        async function loadMills() {
            try {
                setLoading(true);
                const data = await MillService.getMills();
                setMills(data || []);
            } catch (err) {
                console.error("Error loading mills:", err);
                setError(err.message || JSON.stringify(err) || "Error desconocido");
            } finally {
                setLoading(false);
            }
        }
        loadMills();
    }, []);

    // Main View vs Detail View Toggle
    if (selectedMillId) {
        return <MillDetail millId={selectedMillId} onBack={() => setSelectedMillId(null)} />;
    }

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando molinos...</div>;
    if (error) return (
        <div className="p-8 text-center text-red-500">
            <p className="font-bold">Error cargando molinos</p>
            <p className="text-sm mt-2 p-2 bg-red-50 rounded border border-red-100 font-mono inline-block">
                {error}
            </p>
        </div>
    );

    const filteredMills = mills.filter(m =>
        (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.community_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Molinos</h1>
                    <p className="text-slate-500 mt-1">Gestión técnica de activos e historial</p>
                </div>
                <button className="bg-brand-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all font-medium">
                    <Plus size={20} />
                    Nuevo Registro
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 flex gap-4">
                <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por código, nombre o comunidad..."
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent rounded-xl focus:bg-white focus:border-brand-200 focus:ring-4 focus:ring-brand-500/10 transition-all outline-none font-medium text-slate-700"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="px-5 py-3 border border-slate-200 rounded-xl flex items-center gap-2 hover:bg-slate-50 text-slate-600 font-medium transition-colors">
                    <Filter size={20} />
                    Filtros
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMills.map(mill => (
                    <div
                        key={mill.mill_id}
                        onClick={() => setSelectedMillId(mill.mill_id)}
                        className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 hover:border-brand-300 transition-all duration-300 cursor-pointer relative overflow-hidden"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-brand-50 rounded-xl text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors shadow-sm">
                                <Wind size={24} />
                            </div>
                            <StatusBadge status={mill.status} size="sm" />
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 mb-1">{mill.name}</h3>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">{mill.code}</p>

                        <div className="flex items-center gap-2 text-slate-600 text-sm bg-slate-50 px-3 py-2 rounded-lg group-hover:bg-brand-50/50 group-hover:text-brand-700 transition-colors">
                            <MapPin size={16} />
                            {mill.community_name || 'Sin comunidad'}
                        </div>

                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                            <div className="p-2 bg-brand-100 rounded-full text-brand-600">
                                <ChevronRight size={16} />
                            </div>
                        </div>
                    </div>
                ))}

                {filteredMills.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        No se encontraron molinos registrados.
                    </div>
                )}
            </div>
        </div>
    );
}
