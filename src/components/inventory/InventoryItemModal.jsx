import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save } from 'lucide-react';

/**
 * Generic modal for CRUD operations on inventory items
 * @param {string} category - 'materiales', 'piezas', 'herramientas', 'epp'
 * @param {object} item - Existing item for edit, null for create
 * @param {function} onClose - Close modal callback
 * @param {function} onSave - Save callback
 */
const InventoryItemModal = ({ category, item, onClose, onSave }) => {
    const isEdit = !!item;

    // Form state based on category
    const getInitialState = () => {
        if (category === 'materiales') {
            return {
                code: item?.code || '',
                name: item?.name || '',
                description: item?.description || '',
                unit: item?.unit || 'ud',
                min_stock: item?.min_stock || 0,
                location: item?.location || '',
                supplier_id: item?.supplier_id || null
            };
        } else if (category === 'piezas') {
            return {
                code: item?.code || '',
                name: item?.name || '',
                description: item?.description || '',
                drawing_code: item?.drawing_code || '',
                unit: item?.unit || 'ud',
                min_stock: item?.min_stock || 0,
                image_url: item?.image_url || '',
                supplier_id: item?.supplier_id || null,
                origin: item?.origin || ''
            };
        } else if (category === 'herramientas') {
            return {
                code: item?.code || '',
                name: item?.name || '',
                type: item?.type || '',
                serial_number: item?.serial_number || '',
                status: item?.status || 'DISPONIBLE',
                location: item?.location || '',
                notes: item?.notes || '',
                supplier_id: item?.supplier_id || null
            };
        } else if (category === 'epp') {
            return {
                code: item?.code || '',
                name: item?.name || '',
                description: item?.description || '',
                unit: item?.unit || 'ud',
                min_stock: item?.min_stock || 0,
                supplier_id: item?.supplier_id || null
            };
        }
        return {};
    };

    const [formData, setFormData] = useState(getInitialState);
    const [saving, setSaving] = useState(false);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Error saving item:', error);
            alert('Hubo un error al guardar el elemento.');
        } finally {
            setSaving(false);
        }
    };

    const getCategoryLabel = () => {
        const labels = {
            'materiales': 'Material',
            'piezas': 'Pieza/Repuesto',
            'herramientas': 'Herramienta',
            'epp': 'Equipo de Protección Personal'
        };
        return labels[category] || 'Elemento';
    };

    return createPortal(
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 flex flex-col max-h-[calc(100vh-4rem)]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white flex-shrink-0 rounded-t-2xl">
                    <h2 className="text-xl font-bold text-slate-800">
                        {isEdit ? 'Editar' : 'Nuevo'} {getCategoryLabel()}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form - Scrollable */}
                <div className="overflow-y-auto flex-1 min-h-0">
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* Common fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Código *
                                </label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => handleChange('code', e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Nombre *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                                />
                            </div>
                        </div>

                        {/* Category-specific fields */}
                        {category === 'materiales' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Descripción
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Unidad
                                        </label>
                                        <select
                                            value={formData.unit}
                                            onChange={(e) => handleChange('unit', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                                        >
                                            <option value="ud">unidades</option>
                                            <option value="kg">kilogramos</option>
                                            <option value="m">metros</option>
                                            <option value="L">litros</option>
                                            <option value="gal">galones</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Stock Mínimo *
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.min_stock}
                                            onChange={(e) => handleChange('min_stock', parseFloat(e.target.value))}
                                            required
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Ubicación
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={(e) => handleChange('location', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {category === 'piezas' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Descripción
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Código de Plano
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.drawing_code}
                                            onChange={(e) => handleChange('drawing_code', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Origen
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.origin}
                                            onChange={(e) => handleChange('origin', e.target.value)}
                                            placeholder="Ej: Nacional, Importado"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Unidad
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.unit}
                                            onChange={(e) => handleChange('unit', e.target.value)}
                                            placeholder="Ej: ud, pares, juegos"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Stock Mínimo
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.min_stock}
                                            onChange={(e) => handleChange('min_stock', parseInt(e.target.value))}
                                            min="0"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {category === 'herramientas' && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Tipo *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.type}
                                            onChange={(e) => handleChange('type', e.target.value)}
                                            required
                                            placeholder="Ej: Manual, Eléctrica, Medición"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Número de Serie
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.serial_number}
                                            onChange={(e) => handleChange('serial_number', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Estado *
                                        </label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => handleChange('status', e.target.value)}
                                            required
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                                        >
                                            <option value="DISPONIBLE">Disponible</option>
                                            <option value="EN_USO">En Uso</option>
                                            <option value="MANTENIMIENTO">Mantenimiento</option>
                                            <option value="DAÑADA">Dañada</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Ubicación
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={(e) => handleChange('location', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Notas
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => handleChange('notes', e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                                    />
                                </div>
                            </>
                        )}

                        {category === 'epp' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Descripción
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Unidad
                                        </label>
                                        <select
                                            value={formData.unit}
                                            onChange={(e) => handleChange('unit', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                                        >
                                            <option value="ud">unidades</option>
                                            <option value="pares">pares</option>
                                            <option value="juegos">juegos</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Stock Mínimo *
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.min_stock}
                                            onChange={(e) => handleChange('min_stock', parseInt(e.target.value))}
                                            required
                                            min="0"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Footer */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default InventoryItemModal;
