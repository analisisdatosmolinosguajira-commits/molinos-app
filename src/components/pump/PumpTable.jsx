import React from 'react';
import { Eye, Edit, Trash2, CheckCircle, AlertTriangle, XCircle, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Pump Table Component
 * Displays pumps in a table format with actions
 * 
 * @param {array} pumps - Array of pump objects
 * @param {function} onEdit - Callback when edit button clicked
 * @param {function} onDelete - Callback when delete button clicked
 * @param {boolean} loading - Loading state
 */
const PumpTable = ({ pumps, onEdit, onDelete, loading }) => {
    const navigate = useNavigate();

    const getStatusIcon = (status) => {
        const icons = {
            'instalada': <CheckCircle className="text-green-500" size={16} />,
            'almacenada': <CheckCircle className="text-blue-500" size={16} />,
            'en_reparacion': <AlertTriangle className="text-yellow-500" size={16} />,
            'dañada': <XCircle className="text-red-500" size={16} />,
            'descartada': <XCircle className="text-gray-500" size={16} />
        };
        return icons[status] || icons['almacenada'];
    };

    const getStatusLabel = (status) => {
        const labels = {
            'instalada': 'Instalada',
            'almacenada': 'Almacenada',
            'en_reparacion': 'En Reparación',
            'dañada': 'Dañada',
            'descartada': 'Descartada'
        };
        return labels[status] || status;
    };

    const getStatusColor = (status) => {
        const colors = {
            'instalada': 'text-green-700 bg-green-50',
            'almacenada': 'text-brand-700 bg-brand-50',
            'en_reparacion': 'text-yellow-700 bg-yellow-50',
            'dañada': 'text-red-700 bg-red-50',
            'descartada': 'text-gray-700 bg-gray-50'
        };
        return colors[status] || colors['almacenada'];
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12">
                <div className="flex flex-col items-center justify-center">
                    <Loader className="animate-spin text-brand-600 mb-3" size={32} />
                    <p className="text-slate-500">Cargando bombas...</p>
                </div>
            </div>
        );
    }

    if (pumps.length === 0) {
        return (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12">
                <div className="text-center">
                    <div className="text-6xl mb-4">⚙️</div>
                    <p className="text-slate-500 text-lg">No se encontraron bombas</p>
                    <p className="text-slate-400 text-sm mt-2">
                        Intenta ajustar los filtros o registra una nueva bomba
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                Serial
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                Modelo
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                Tipo
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                Estado
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                Ubicación
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {pumps.map((pump) => (
                            <tr
                                key={pump.pump_id}
                                className="hover:bg-slate-50 transition-colors cursor-pointer"
                                onClick={() => navigate(`/bombas/${pump.pump_id}`)}
                            >
                                <td className="px-6 py-4">
                                    <span className="font-mono text-sm font-bold text-slate-900">
                                        {pump.serial_number}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm text-slate-700">
                                        {pump.model || <span className="text-slate-400 italic">-</span>}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm text-slate-600">
                                        {pump.type || <span className="text-slate-400">-</span>}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(pump.status)}
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${getStatusColor(pump.status)}`}>
                                            {getStatusLabel(pump.status)}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm text-slate-600">
                                        {pump.current_mill_code ? (
                                            <span className="font-mono font-semibold">{pump.current_mill_code}</span>
                                        ) : pump.status === 'almacenada' ? (
                                            <span className="text-slate-500">Taller</span>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => navigate(`/bombas/${pump.pump_id}`)}
                                            className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                            title="Ver detalles"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEdit(pump);
                                            }}
                                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(pump);
                                            }}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PumpTable;
