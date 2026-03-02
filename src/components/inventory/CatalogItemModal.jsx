import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Search } from 'lucide-react';
import { InventoryService } from '../../services/inventory';

const CatalogItemModal = ({ supplierId, catalogItem, onClose, onSave }) => {
    const isEdit = !!catalogItem;

    const [formData, setFormData] = useState({
        brand: catalogItem?.brand || '',
        model: catalogItem?.model || '',
        price: catalogItem?.price || 0,
        currency: catalogItem?.currency || 'COP',
        sku: catalogItem?.sku || '',
        item_type: catalogItem?.base_item ?
            (catalogItem.material_id ? 'material' :
                catalogItem.piece_id ? 'piece' :
                    catalogItem.tool_id ? 'tool' : 'safety') : 'material', // Default to material
        selected_item_id: catalogItem?.base_item ?
            (catalogItem.material_id || catalogItem.piece_id || catalogItem.tool_id || catalogItem.safety_id) : ''
    });

    const [saving, setSaving] = useState(false);

    // Inventory items for the searchable dropdown
    const [inventoryOptions, setInventoryOptions] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadInventoryOptions();
    }, [formData.item_type]);

    const loadInventoryOptions = async () => {
        setLoadingOptions(true);
        try {
            // We fetch the full unified inventory to steal items from it based on type
            const fullInventory = await InventoryService.getInventory();

            // Map our specific dropdown type to the unified category string
            const typeToCategoryMap = {
                'material': 'materiales',
                'piece': 'piezas',
                'tool': 'herramientas',
                'safety': 'epp'
            };

            const targetCategory = typeToCategoryMap[formData.item_type];

            const filteredOptions = fullInventory.filter(item => item.category === targetCategory);
            setInventoryOptions(filteredOptions);

            // Pre-select if we are in edit mode and just loaded the correct category
            if (isEdit && catalogItem && !searchTerm) {
                const searchName = catalogItem.base_item?.name || '';
                setSearchTerm(searchName);
            }

        } catch (error) {
            console.error("Error loading inventory options", error);
        } finally {
            setLoadingOptions(false);
        }
    };

    const handleChange = (field, value) => {
        if (field === 'item_type') {
            // Reset selection if user changes the underlying category
            setFormData(prev => ({ ...prev, item_type: value, selected_item_id: '' }));
            setSearchTerm('');
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleSelectOption = (item) => {
        setFormData(prev => ({ ...prev, selected_item_id: item.rawId }));
        setSearchTerm(item.name);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.selected_item_id) {
            alert("Debe seleccionar un ítem del inventario.");
            return;
        }

        setSaving(true);
        try {
            // Reconstruct the polymorphic payload
            const payload = {
                supplier_id: supplierId,
                brand: formData.brand,
                model: formData.model,
                price: parseFloat(formData.price),
                currency: formData.currency,
                sku: formData.sku,

                // Reset all polymorphic keys to null initially
                material_id: null,
                piece_id: null,
                tool_id: null,
                safety_id: null
            };

            // Inject the selected item ID into the correct polymorphic column
            if (formData.item_type === 'material') payload.material_id = formData.selected_item_id;
            if (formData.item_type === 'piece') payload.piece_id = formData.selected_item_id;
            if (formData.item_type === 'tool') payload.tool_id = formData.selected_item_id;
            if (formData.item_type === 'safety') payload.safety_id = formData.selected_item_id;

            await onSave(payload);
        } catch (error) {
            console.error('Error saving catalog item:', error);
            alert('Hubo un error al guardar el artículo en el catálogo.');
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 flex flex-col max-h-[calc(100vh-4rem)]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white flex-shrink-0 rounded-t-2xl">
                    <h2 className="text-xl font-bold text-slate-800">
                        {isEdit ? 'Editar Precio/Artículo' : 'Añadir Artículo al Catálogo'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <div className="overflow-y-auto flex-1 min-h-0">
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">

                        {/* Underlying Item Selection */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                            <h3 className="text-sm font-semibold text-slate-700">Vincular con Inventario General</h3>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Categoría
                                </label>
                                <select
                                    value={formData.item_type}
                                    onChange={(e) => handleChange('item_type', e.target.value)}
                                    disabled={isEdit} // Cannot change core binding on edit
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-100 focus:border-brand-300 outline-none disabled:bg-slate-100"
                                >
                                    <option value="material">Material de Consumo</option>
                                    <option value="piece">Pieza / Repuesto</option>
                                    <option value="tool">Herramienta</option>
                                    <option value="safety">Equipo de Protección (EPP)</option>
                                </select>
                            </div>

                            <div className="relative">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Buscar Ítem Maestro *
                                </label>
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Escribe para filtrar..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            // Wipe selected ID if user types something new
                                            setFormData(prev => ({ ...prev, selected_item_id: '' }));
                                        }}
                                        disabled={loadingOptions || isEdit}
                                        className="pl-9 pr-4 py-2 w-full bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-brand-300 disabled:bg-slate-100"
                                    />
                                </div>

                                {/* Dropdown results if searching and no absolute selection is locked */}
                                {searchTerm.length > 0 && !formData.selected_item_id && !isEdit && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {inventoryOptions.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                                            <div
                                                key={item.id}
                                                className="px-4 py-2 text-sm hover:bg-brand-50 cursor-pointer flex justify-between"
                                                onClick={() => handleSelectOption(item)}
                                            >
                                                <span className="font-medium text-slate-700">{item.name}</span>
                                                <span className="text-slate-400 text-xs">{item.code}</span>
                                            </div>
                                        ))}
                                        {inventoryOptions.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                            <div className="px-4 py-3 text-sm text-slate-500 text-center italic">
                                                No se encontraron coincidencias.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Commercial Details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Marca
                                </label>
                                <input
                                    type="text"
                                    value={formData.brand}
                                    onChange={(e) => handleChange('brand', e.target.value)}
                                    placeholder="Ej: Stanley, 3M, Makita"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-100 focus:border-brand-300 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Modelo
                                </label>
                                <input
                                    type="text"
                                    value={formData.model}
                                    onChange={(e) => handleChange('model', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-100 focus:border-brand-300 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Precio *
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-500 font-medium">$</span>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => handleChange('price', e.target.value)}
                                        required
                                        min="0"
                                        step="0.01"
                                        className="pl-8 pr-4 py-2 w-full border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-100 focus:border-brand-300 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Moneda
                                </label>
                                <select
                                    value={formData.currency}
                                    onChange={(e) => handleChange('currency', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-100 focus:border-brand-300 outline-none"
                                >
                                    <option value="COP">COP (Pesos Colombianos)</option>
                                    <option value="USD">USD (Dólares)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Código de Referencia / SKU (Interno del Proveedor)
                            </label>
                            <input
                                type="text"
                                value={formData.sku}
                                onChange={(e) => handleChange('sku', e.target.value)}
                                placeholder="Ref. comercial de la factura"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-100 focus:border-brand-300 outline-none"
                            />
                        </div>

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
                                disabled={saving || !formData.selected_item_id}
                                className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {saving ? 'Guardando...' : (isEdit ? 'Actualizar Precio' : 'Añadir al Catálogo')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CatalogItemModal;
