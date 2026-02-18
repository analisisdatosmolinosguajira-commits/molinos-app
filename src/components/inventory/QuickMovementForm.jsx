import React, { useState, useEffect } from 'react';
import { Search, Package, TrendingUp, TrendingDown, Edit3 } from 'lucide-react';
import { InventoryService } from '../../services/inventory';

export default function QuickMovementForm({ onSubmit, inventory }) {
    const [formData, setFormData] = useState({
        category: 'materiales',
        itemId: null,
        selectedItem: null,
        type: 'IN',
        quantity: '',
        reference_type: 'MANUAL',
        reference_id: '',
        notes: ''
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);

    // Filter inventory by category
    const categoryItems = inventory.filter(item => item.category === formData.category);

    // Search handler
    useEffect(() => {
        if (searchTerm.length >= 2) {
            const filteredByCategory = inventory.filter(item => item.category === formData.category);
            const results = filteredByCategory.filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.code.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setSearchResults(results.slice(0, 10));
            setShowDropdown(true);
        } else {
            setSearchResults([]);
            setShowDropdown(false);
        }
    }, [searchTerm, formData.category, inventory]);

    const handleCategoryChange = (category) => {
        setFormData({
            ...formData,
            category,
            itemId: null,
            selectedItem: null
        });
        setSearchTerm('');
        setSearchResults([]);
    };

    const handleItemSelect = (item) => {
        setFormData({
            ...formData,
            itemId: item.rawId,
            selectedItem: item
        });
        setSearchTerm(`${item.code} - ${item.name}`);
        setShowDropdown(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.itemId) {
            alert('Por favor seleccione un ítem');
            return;
        }

        if (!formData.quantity || formData.quantity <= 0) {
            alert('Por favor ingrese una cantidad válida');
            return;
        }

        setLoading(true);
        try {
            await onSubmit({
                category: formData.category,
                itemId: formData.itemId,
                movementData: {
                    type: formData.type,
                    quantity: parseFloat(formData.quantity),
                    reference_type: formData.reference_type,
                    reference_id: formData.reference_id || null,
                    notes: formData.notes
                }
            });

            // Reset form
            setFormData({
                ...formData,
                itemId: null,
                selectedItem: null,
                quantity: '',
                reference_id: '',
                notes: ''
            });
            setSearchTerm('');
            alert('Movimiento registrado correctamente');
        } catch (error) {
            console.error('Error creating movement:', error);
            alert('Error al registrar el movimiento');
        } finally {
            setLoading(false);
        }
    };

    const categoryLabels = {
        materiales: 'Materiales',
        piezas: 'Piezas',
        herramientas: 'Herramientas',
        epp: 'EPP'
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
                    <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-800">Registrar Movimiento</h3>
                    <p className="text-sm text-slate-500">Ingreso, salida o ajuste manual de stock</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Category Selector */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Categoría</label>
                    <div className="grid grid-cols-4 gap-2">
                        {Object.entries(categoryLabels).map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => handleCategoryChange(key)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${formData.category === key
                                    ? 'bg-brand-600 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Item Search */}
                <div className="relative">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Ítem</label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar por código o nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        />
                        <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                    </div>

                    {/* Dropdown */}
                    {showDropdown && searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {searchResults.map((item) => (
                                <button
                                    key={`${item.category}-${item.rawId}`}
                                    type="button"
                                    onClick={() => handleItemSelect(item)}
                                    className="w-full px-4 py-2 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                                >
                                    <div className="font-medium text-slate-800">{item.name}</div>
                                    <div className="text-sm text-slate-500">
                                        {item.code} • Stock actual: {item.stock} {item.unit}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Type Selector */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Movimiento</label>
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'IN' })}
                                className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${formData.type === 'IN'
                                    ? 'bg-green-100 border-2 border-green-500 text-green-700'
                                    : 'bg-slate-50 border border-slate-200 text-slate-700'
                                    }`}
                            >
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-sm font-medium">Ingreso</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'OUT' })}
                                className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${formData.type === 'OUT'
                                    ? 'bg-red-100 border-2 border-red-500 text-red-700'
                                    : 'bg-slate-50 border border-slate-200 text-slate-700'
                                    }`}
                            >
                                <TrendingDown className="w-4 h-4" />
                                <span className="text-sm font-medium">Salida</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'ADJUST' })}
                                className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${formData.type === 'ADJUST'
                                    ? 'bg-yellow-100 border-2 border-yellow-500 text-yellow-700'
                                    : 'bg-slate-50 border border-slate-200 text-slate-700'
                                    }`}
                            >
                                <Edit3 className="w-4 h-4" />
                                <span className="text-sm font-medium">Ajuste</span>
                            </button>
                        </div>
                    </div>

                    {/* Quantity & Reference */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Cantidad {formData.selectedItem && `(${formData.selectedItem.unit})`}
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                placeholder="0"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Referencia</label>
                            <select
                                value={formData.reference_type}
                                onChange={(e) => setFormData({ ...formData, reference_type: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            >
                                <option value="MANUAL">Manual</option>
                                <option value="PURCHASE">Compra</option>
                                <option value="TRANSFER">Transferencia</option>
                                <option value="RETURN">Devolución</option>
                                <option value="DAMAGE">Daño/Pérdida</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Notas</label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        placeholder="Detalles opcionales del movimiento..."
                    />
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading || !formData.itemId}
                    className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                    {loading ? 'Registrando...' : 'Registrar Movimiento'}
                </button>
            </form>
        </div>
    );
}
