import React, { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { supabase } from '../../services/supabase';

/**
 * Mill Search and Filters Component
 * Provides search and filtering UI for mills list
 * 
 * @param {function} onFilterChange - Callback with filter object {search, status, communityId, hasPump}
 */
const MillSearchFilters = ({ onFilterChange }) => {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [communityId, setCommunityId] = useState('');
    const [hasPump, setHasPump] = useState('');
    const [communities, setCommunities] = useState([]);

    useEffect(() => {
        loadCommunities();
    }, []);

    useEffect(() => {
        // Debounce search
        const timer = setTimeout(() => {
            applyFilters();
        }, 300);
        return () => clearTimeout(timer);
    }, [search, status, communityId, hasPump]);

    const loadCommunities = async () => {
        try {
            const { data, error } = await supabase
                .from('community')
                .select('community_id, name')
                .order('name');

            if (error) throw error;
            setCommunities(data || []);
        } catch (error) {
            console.error('Error loading communities:', error);
        }
    };

    const applyFilters = () => {
        onFilterChange({
            search: search.trim(),
            status,
            communityId,
            hasPump
        });
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('');
        setCommunityId('');
        setHasPump('');
    };

    const hasActiveFilters = search || status || communityId || hasPump;

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por código, nombre o comunidad..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-3 items-center">
                <span className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                    <Filter size={16} /> Filtros:
                </span>

                {/* Status Filter */}
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all min-w-[160px]"
                >
                    <option value="">Todos los estados</option>
                    <option value="OPERATIONAL">Operativo</option>
                    <option value="NON_OPERATIONAL">Inoperativo</option>
                    <option value="UNDER_MAINTENANCE">En Mantenimiento</option>
                    <option value="DECOMMISSIONED">Desmantelado</option>
                </select>

                {/* Community Filter */}
                <select
                    value={communityId}
                    onChange={(e) => setCommunityId(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all min-w-[180px]"
                >
                    <option value="">Todas las comunidades</option>
                    {communities.map(c => (
                        <option key={c.community_id} value={c.community_id}>
                            {c.name}
                        </option>
                    ))}
                </select>

                {/* Pump Filter */}
                <select
                    value={hasPump}
                    onChange={(e) => setHasPump(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all min-w-[160px]"
                >
                    <option value="">Bomba: Todas</option>
                    <option value="true">Con bomba instalada</option>
                    <option value="false">Sin bomba instalada</option>
                </select>

                {/* Clear Button */}
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                        <X size={16} /> Limpiar
                    </button>
                )}
            </div>

            {/* Active Filters Count */}
            {hasActiveFilters && (
                <div className="text-xs text-slate-500">
                    {[search && 'búsqueda', status && 'estado', communityId && 'comunidad', hasPump && 'bomba']
                        .filter(Boolean).length} filtro(s) activo(s)
                </div>
            )}
        </div>
    );
};

export default MillSearchFilters;
