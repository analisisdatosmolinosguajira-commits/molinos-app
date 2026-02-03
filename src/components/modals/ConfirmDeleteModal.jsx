import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Confirm Delete Modal
 * Reusable confirmation dialog for delete operations
 * Shows warning and optional dependency information
 * 
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Callback to close modal
 * @param {function} onConfirm - Callback when delete is confirmed
 * @param {string} itemName - Name of item being deleted (for display)
 * @param {string} itemType - Type of item (e.g., 'molino', 'bomba', 'registro')
 * @param {array} dependencies - Array of dependency descriptions
 */
const ConfirmDeleteModal = ({
    isOpen,
    onClose,
    onConfirm,
    itemName,
    itemType = 'registro',
    dependencies = []
}) => {
    if (!isOpen) return null;

    const hasDependencies = dependencies.length > 0;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="text-red-600" size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-900">
                                Confirmar Eliminación
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Esta acción no se puede deshacer
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-slate-700 mb-4">
                        ¿Estás seguro de que deseas eliminar{' '}
                        <strong className="text-slate-900">{itemName}</strong>?
                    </p>

                    {hasDependencies && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm text-yellow-800 font-semibold mb-2 flex items-center gap-2">
                                <AlertTriangle size={16} />
                                Este {itemType} tiene dependencias:
                            </p>
                            <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1 ml-1">
                                {dependencies.map((dep, idx) => (
                                    <li key={idx}>{dep}</li>
                                ))}
                            </ul>
                            <p className="text-xs text-yellow-600 mt-3">
                                Estas dependencias también podrían verse afectadas o quedar sin referencia.
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-6 bg-slate-50 rounded-b-2xl flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-white text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold shadow-lg shadow-red-600/20"
                    >
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeleteModal;
