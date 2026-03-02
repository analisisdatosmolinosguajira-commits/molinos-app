import React, { useState, useEffect } from 'react';
import { X, Search, MapPin, Loader } from 'lucide-react';
import { MillService } from '../../services/mills';

/**
 * Mill Selector Modal
 * Allows user to search and select a mill from available mills
 * Used when scheduling pump installation from pump detail page
 * 
 * @param {function} onSelect - Callback with selected mill_id
 * @param {function} onClose - Callback to close modal
 * @param {function} filter - Optional filter function to filter mills
 */
const MillSelectorModal = ({ onSelect, onClose, filter }) => {
    const [mills, setMills] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadMills();
    }, []);

    const loadMills = async () => {
        try {
            setLoading(true);
            setError(null);
            const allMills = await MillService.getAllMills();
            const filtered = filter ? allMills.filter(filter) : allMills;
            setMills(filtered);
        } catch (err) {
            console.error('Error loading mills:', err);
            setError('Error al cargar los molinos');
        } finally {
            setLoading(false);
        }
    };

    const filteredMills = mills.filter(mill =>
        mill.code.toLowerCase().includes(search.toLowerCase()) ||
        mill.name?.toLowerCase().includes(search.toLowerCase()) ||
        mill.community?.name?.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusColor = (status) => {
        const colors = {
            'OPERATIONAL': 'bg-green-100 text-green-700',
            'NON_OPERATIONAL': 'bg-red-100 text-red-700',
            'UNDER_MAINTENANCE': 'bg-yellow-100 text-yellow-700',
            'DECOMMISSIONED': 'bg-gray-100 text-gray-700'
        };
        return colors[status] || 'bg-slate-100 text-slate-700';
    };

    const getStatusLabel = (status) => {
        const labels = {
            'OPERATIONAL': 'Operativo',
            'NON_OPERATIONAL': 'Inoperativo',
            'UNDER_MAINTENANCE': 'Mantenimiento',
            'DECOMMISSIONED': 'Desmantelado'
        };
        return labels[status] || status;
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                Seleccionar Molino
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                Escoge el molino donde se instalará la bomba
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar molino por código, nombre o comunidad..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Mill List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader className="animate-spin text-brand-600 mb-3" size={32} />
                            <p className="text-slate-500">Cargando molinos...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-red-600">{error}</p>
                            <button
                                onClick={loadMills}
                                className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : filteredMills.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                            <p className="text-slate-500">
                                {search ? 'No se encontraron molinos con ese criterio' : 'No hay molinos disponibles'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredMills.map((mill) => (
                                <button
                                    key={mill.mill_id}
                                    onClick={() => onSelect(mill.mill_id)}
                                    className="w-full p-4 bg-slate-50 hover:bg-brand-50 border border-slate-200 hover:border-brand-300 rounded-xl transition-all text-left group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center text-brand-600 group-hover:bg-brand-200 transition-colors">
                                                <MapPin size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-900 font-mono">
                                                    {mill.code}
                                                </p>
                                                <p className="text-sm text-slate-600">
                                                    {mill.name || 'Sin nombre'}
                                                </p>
                                                {mill.community && (
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        📍 {mill.community.name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {mill.installed_pump && (
                                                <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded">
                                                    Con bomba
                                                </span>
                                            )}
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(mill.status)}`}>
                                                {getStatusLabel(mill.status)}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl">
                    <p className="text-xs text-slate-500 text-center">
                        {filteredMills.length} {filteredMills.length === 1 ? 'molino disponible' : 'molinos disponibles'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MillSelectorModal;
