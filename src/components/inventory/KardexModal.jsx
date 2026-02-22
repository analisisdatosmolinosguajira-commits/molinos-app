import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, TrendingDown, Package, Calendar, FileText, Activity } from 'lucide-react';
import { InventoryService } from '../../services/inventory';

/**
 * Kardex modal - Shows stock movement history for an inventory item
 */
const KardexModal = ({ category, item, onClose }) => {
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMovements();
    }, []);

    async function loadMovements() {
        try {
            setLoading(true);
            const data = await InventoryService.getStockMovements(category, item.rawId);
            setMovements(data || []);
        } catch (error) {
            console.error('Error loading movements:', error);
        } finally {
            setLoading(false);
        }
    }

    const getMovementIcon = (type) => {
        if (type === 'ENTRY' || type === 'INGRESO') return <TrendingUp size={16} className="text-green-600" />;
        if (type === 'EXIT' || type === 'SALIDA') return <TrendingDown size={16} className="text-rose-600" />;
        return <Activity size={16} className="text-slate-500" />;
    };

    const getMovementLabel = (type) => {
        const labels = {
            'ENTRY': 'Ingreso',
            'INGRESO': 'Ingreso',
            'EXIT': 'Salida',
            'SALIDA': 'Salida',
            'ADJUSTMENT': 'Ajuste',
            'AJUSTE': 'Ajuste'
        };
        return labels[type] || type;
    };

    const getReferenceLabel = (refType) => {
        const labels = {
            'WORK_ORDER': 'Orden de Trabajo',
            'PURCHASE': 'Compra',
            'TRANSFER': 'Transferencia',
            'MANUFACTURING_ORDER': 'Orden de Fabricación',
            'MANUAL': 'Manual',
            'INITIAL': 'Inventario Inicial'
        };
        return labels[refType] || refType;
    };

    return createPortal(
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-8 flex flex-col max-h-[calc(100vh-4rem)]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white flex-shrink-0 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Package size={24} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Kardex - {item.name}</h2>
                            <p className="text-sm text-slate-500">Código: {item.code || 'S/C'}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="overflow-y-auto flex-1 min-h-0 p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : movements.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="inline-flex p-4 bg-slate-100 rounded-full mb-4">
                                <FileText size={40} className="text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">No hay movimientos registrados</h3>
                            <p className="text-slate-500 text-sm">Este elemento aún no tiene historial de movimientos.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Summary Card */}
                            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-100">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-600 mb-1">Stock Actual</p>
                                        <p className="text-2xl font-bold text-slate-800">{item.stock} <span className="text-sm font-normal text-slate-500">{item.unit}</span></p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-600 mb-1">Stock Mínimo</p>
                                        <p className="text-2xl font-bold text-slate-800">{item.min} <span className="text-sm font-normal text-slate-500">{item.unit}</span></p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-600 mb-1">Total Movimientos</p>
                                        <p className="text-2xl font-bold text-slate-800">{movements.length}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Movements Table */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">Tipo</th>
                                            <th className="px-4 py-3 text-right font-semibold text-slate-700">Cantidad</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">Referencia</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">Notas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {movements.map((movement, index) => (
                                            <tr key={index} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-slate-400" />
                                                        <span className="font-mono text-slate-700">
                                                            {new Date(movement.date).toLocaleDateString('es-CO')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {getMovementIcon(movement.type)}
                                                        <span className="font-medium">{getMovementLabel(movement.type)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`font-bold font-mono ${movement.type === 'ENTRY' || movement.type === 'INGRESO' || movement.type === 'IN' || movement.type === 'RETURN'
                                                        ? 'text-green-600'
                                                        : movement.type === 'EXIT' || movement.type === 'SALIDA' || movement.type === 'OUT' || movement.type === 'USE'
                                                            ? 'text-rose-600'
                                                            : 'text-amber-600'
                                                        }`}>
                                                        {movement.type === 'ENTRY' || movement.type === 'INGRESO' || movement.type === 'IN' || movement.type === 'RETURN' ? '+' : movement.type === 'EXIT' || movement.type === 'SALIDA' || movement.type === 'OUT' || movement.type === 'USE' ? '-' : ''}
                                                        {Math.abs(movement.quantity)}
                                                    </span>
                                                    <span className="text-xs text-slate-500 ml-1">{item.unit}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <p className="text-slate-700 font-medium">{getReferenceLabel(movement.reference_type)}</p>
                                                        {movement.reference_id && (
                                                            <p className="text-xs text-slate-500">ID: {movement.reference_id}</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-slate-600 text-xs line-clamp-2">
                                                        {movement.notes || '-'}
                                                    </p>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 flex justify-end bg-slate-50 rounded-b-2xl flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default KardexModal;
