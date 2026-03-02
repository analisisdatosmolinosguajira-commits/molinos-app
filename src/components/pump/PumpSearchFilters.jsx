import React, { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';

/**
 * Pump Search and Filters Component
 * Provides search and filtering UI for pumps list
 * 
 * @param {function} onFilterChange - Callback with filter object {search, status, type, location}
 */
const PumpSearchFilters = ({ onFilterChange }) => {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [type, setType] = useState('');
    const [location, setLocation] = useState('');

    useEffect(() => {
        // Debounce search
        const timer = setTimeout(() => {
            applyFilters();
        }, 300);
        return () => clearTimeout(timer);
    }, [search, status, type, location]);

    const applyFilters = () => {
        onFilterChange({
            search: search.trim(),
            status,
            type,
            location
        });
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('');
        setType('');
        setLocation('');
    };

    const hasActiveFilters = search || status || type || location;

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por serial, modelo o tipo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
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
                    className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm transition-all min-w-[160px]"
                >
                    <option value="">Todos los estados</option>
                    <option value="instalada">Instalada</option>
                    <option value="almacenada">En Almacén</option>
                    <option value="en_reparacion">En Reparación</option>
                    <option value="dañada">Dañada</option>
                    <option value="descartada">Descartada</option>
                </select>

                {/* Type Filter */}
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm transition-all min-w-[140px]"
                >
                    <option value="">Todos los tipos</option>
                    <option value="3 Pulgadas">3 Pulgadas</option>
                    <option value="4 Pulgadas">4 Pulgadas</option>
                    <option value="Solar 3 Pulgadas">Solar 3 Pulgadas</option>
                    <option value="Solar 4 Pulgadas">Solar 4 Pulgadas</option>
                    <option value="Manual">Manual</option>
                </select>

                {/* Location Filter */}
                <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm transition-all min-w-[160px]"
                >
                    <option value="">Todas las ubicaciones</option>
                    <option value="installed">En molinos</option>
                    <option value="storage">En taller/almacén</option>
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
                    {[search && 'búsqueda', status && 'estado', type && 'tipo', location && 'ubicación']
                        .filter(Boolean).length} filtro(s) activo(s)
                </div>
            )}
        </div>
    );
};

export default PumpSearchFilters;
