import React from 'react';
import { Eye, Edit, Trash2, CheckCircle, XCircle, AlertTriangle, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Mill Table Component
 * Displays mills in a table format with actions
 * 
 * @param {array} mills - Array of mill objects
 * @param {function} onEdit - Callback when edit button clicked
 * @param {function} onDelete - Callback when delete button clicked
 * @param {boolean} loading - Loading state
 */
const MillTable = ({ mills, onEdit, onDelete, loading }) => {
    const navigate = useNavigate();

    const getStatusIcon = (status) => {
        const icons = {
            'OPERATIONAL': <CheckCircle className="text-green-500" size={16} />,
            'NON_OPERATIONAL': <XCircle className="text-red-500" size={16} />,
            'UNDER_MAINTENANCE': <AlertTriangle className="text-yellow-500" size={16} />,
            'DECOMMISSIONED': <XCircle className="text-gray-500" size={16} />
        };
        return icons[status] || icons['OPERATIONAL'];
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

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12">
                <div className="flex flex-col items-center justify-center">
                    <Loader className="animate-spin text-blue-600 mb-3" size={32} />
                    <p className="text-slate-500">Cargando molinos...</p>
                </div>
            </div>
        );
    }

    if (mills.length === 0) {
        return (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12">
                <div className="text-center">
                    <div className="text-6xl mb-4">🏭</div>
                    <p className="text-slate-500 text-lg">No se encontraron molinos</p>
                    <p className="text-slate-400 text-sm mt-2">
                        Intenta ajustar los filtros o agrega un nuevo molino
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
                                Código
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                Nombre
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                Comunidad
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                Estado
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                                Bomba
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                                Componentes
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {mills.map((mill) => (
                            <tr
                                key={mill.mill_id}
                                className="hover:bg-slate-50 transition-colors cursor-pointer"
                                onClick={() => navigate(`/molinos/${mill.mill_id}`)}
                            >
                                <td className="px-6 py-4">
                                    <span className="font-mono text-sm font-bold text-slate-900">
                                        {mill.code}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm text-slate-700">
                                        {mill.name || <span className="text-slate-400 italic">Sin nombre</span>}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm text-slate-600">
                                        {mill.community?.name || <span className="text-slate-400">-</span>}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(mill.status)}
                                        <span className="text-sm font-medium text-slate-700">
                                            {getStatusLabel(mill.status)}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {mill.has_pump ? (
                                        <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full font-bold text-sm">
                                            ✓
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-100 text-slate-300 rounded-full text-sm">
                                            ✗
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {mill.components_count > 0 ? (
                                        <div className="relative group">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 cursor-help">
                                                {mill.components_count}
                                            </span>
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                                <div className="bg-slate-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg max-w-xs">
                                                    <div className="font-semibold mb-1">Componentes instalados:</div>
                                                    <ul className="space-y-1">
                                                        {mill.components.map((comp, idx) => (
                                                            <li key={idx} className="text-slate-200">
                                                                • {comp.mill_component?.code} - {comp.mill_component?.name}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                                        <div className="border-4 border-transparent border-t-slate-900"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 text-sm">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => navigate(`/molinos/${mill.mill_id}`)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Ver detalles"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEdit(mill);
                                            }}
                                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(mill);
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

export default MillTable;
