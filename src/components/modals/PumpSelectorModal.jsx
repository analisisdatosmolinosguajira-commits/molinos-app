import React, { useState, useEffect } from 'react';
import { X, Search, Settings, Loader } from 'lucide-react';
import { PumpService } from '../../services/pumps';

/**
 * Pump Selector Modal
 * Allows user to search and select a pump from available pumps
 * Used when installing a pump to a mill from mill detail page
 * 
 * @param {function} onSelect - Callback with selected pump_id
 * @param {function} onClose - Callback to close modal
 * @param {function} filter - Optional filter function (e.g., only almacenada pumps)
 */
const PumpSelectorModal = ({ onSelect, onClose, filter }) => {
    const [pumps, setPumps] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadPumps();
    }, []);

    const loadPumps = async () => {
        try {
            setLoading(true);
            setError(null);
            const allPumps = await PumpService.getAllPumps();
            // Default filter: only show pumps in storage (almacenada)
            const defaultFilter = (p) => p.status === 'almacenada';
            const filterFn = filter || defaultFilter;
            const filtered = allPumps.filter(filterFn);
            setPumps(filtered);
        } catch (err) {
            console.error('Error loading pumps:', err);
            setError('Error al cargar las bombas');
        } finally {
            setLoading(false);
        }
    };

    const filteredPumps = pumps.filter(pump =>
        pump.serial_number.toLowerCase().includes(search.toLowerCase()) ||
        pump.model?.toLowerCase().includes(search.toLowerCase()) ||
        pump.type?.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusColor = (status) => {
        const colors = {
            'almacenada': 'bg-blue-100 text-blue-700',
            'instalada': 'bg-green-100 text-green-700',
            'en_reparacion': 'bg-yellow-100 text-yellow-700',
            'dañada': 'bg-red-100 text-red-700',
            'descartada': 'bg-gray-100 text-gray-700'
        };
        return colors[status] || 'bg-slate-100 text-slate-700';
    };

    const getStatusLabel = (status) => {
        const labels = {
            'almacenada': 'Almacenada',
            'instalada': 'Instalada',
            'en_reparacion': 'En Reparación',
            'dañada': 'Dañada',
            'descartada': 'Descartada'
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
                                Seleccionar Bomba
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                Escoge la bomba que se instalará en el molino
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
                            placeholder="Buscar bomba por serial, modelo o tipo..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Pump List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader className="animate-spin text-blue-600 mb-3" size={32} />
                            <p className="text-slate-500">Cargando bombas...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-red-600">{error}</p>
                            <button
                                onClick={loadPumps}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : filteredPumps.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                            <p className="text-slate-500">
                                {search
                                    ? 'No se encontraron bombas con ese criterio'
                                    : 'No hay bombas disponibles en almacén'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredPumps.map((pump) => (
                                <button
                                    key={pump.pump_id}
                                    onClick={() => onSelect(pump.pump_id)}
                                    className="w-full p-4 bg-slate-50 hover:bg-green-50 border border-slate-200 hover:border-green-300 rounded-xl transition-all text-left group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 group-hover:bg-green-200 transition-colors">
                                                <Settings size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-900 font-mono">
                                                    {pump.serial_number}
                                                </p>
                                                <div className="flex items-center gap-2 text-sm text-slate-600 mt-0.5">
                                                    {pump.model && <span>{pump.model}</span>}
                                                    {pump.model && pump.type && <span className="text-slate-300">•</span>}
                                                    {pump.type && <span>{pump.type}</span>}
                                                </div>
                                                {(pump.max_depth || pump.capacity) && (
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {pump.max_depth && `Max: ${pump.max_depth}m`}
                                                        {pump.max_depth && pump.capacity && ' • '}
                                                        {pump.capacity && `${pump.capacity} L/h`}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(pump.status)}`}>
                                                {getStatusLabel(pump.status)}
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
                        {filteredPumps.length} {filteredPumps.length === 1 ? 'bomba disponible' : 'bombas disponibles'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PumpSelectorModal;
