import React, { useState, useEffect } from 'react';
import { Search, Package, TrendingUp, TrendingDown, Edit3, Plus, X, ShoppingCart } from 'lucide-react';

export default function BatchMovementForm({ onSubmit, inventory }) {
    // Movement header state
    const [movementType, setMovementType] = useState('IN');
    const [referenceType, setReferenceType] = useState('MANUAL');
    const [referenceId, setReferenceId] = useState('');
    const [globalNotes, setGlobalNotes] = useState('');

    // Item selection state
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('materiales');

    // Items list state
    const [itemsList, setItemsList] = useState([]);
    const [loading, setLoading] = useState(false);

    const categoryLabels = {
        materiales: 'Materiales',
        piezas: 'Piezas',
        herramientas: 'Herramientas',
        epp: 'EPP'
    };

    const referenceLabels = {
        MANUAL: 'Manual',
        PURCHASE: 'Compra',
        TRANSFER: 'Transferencia',
        RETURN: 'Devolución',
        DAMAGE: 'Daño/Pérdida'
    };

    // Search handler
    useEffect(() => {
        if (searchTerm.length >= 2) {
            const filteredByCategory = inventory.filter(item => item.category === selectedCategory);
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
    }, [searchTerm, selectedCategory, inventory]);

    const handleAddItem = (item) => {
        // Check if item already in list
        const exists = itemsList.find(i => i.rawId === item.rawId && i.category === item.category);
        if (exists) {
            alert('Este ítem ya está en la lista');
            return;
        }

        setItemsList([...itemsList, {
            ...item,
            quantity: 1 // Default quantity
        }]);

        setSearchTerm('');
        setShowDropdown(false);
    };

    const handleRemoveItem = (index) => {
        setItemsList(itemsList.filter((_, i) => i !== index));
    };

    const handleQuantityChange = (index, quantity) => {
        const updated = [...itemsList];
        updated[index].quantity = parseFloat(quantity) || 0;
        setItemsList(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (itemsList.length === 0) {
            alert('Agregue al menos un ítem a la lista');
            return;
        }

        // Validate all quantities
        const invalidQty = itemsList.find(item => !item.quantity || item.quantity <= 0);
        if (invalidQty) {
            alert('Todas las cantidades deben ser mayores a 0');
            return;
        }

        setLoading(true);
        try {
            // Build movements array
            const movements = itemsList.map(item => ({
                category: item.category,
                itemId: item.rawId,
                type: movementType,
                quantity: item.quantity,
                reference_type: referenceType,
                reference_id: referenceId || null,
                notes: globalNotes
            }));

            await onSubmit(movements);

            // Reset form
            setItemsList([]);
            setGlobalNotes('');
            setReferenceId('');
            alert(`${movements.length} movimientos registrados correctamente`);
        } catch (error) {
            console.error('Error creating batch movements:', error);
            alert('Error al registrar los movimientos');
        } finally {
            setLoading(false);
        }
    };

    const categoryColors = {
        materiales: 'bg-blue-100 text-blue-700 border-blue-300',
        piezas: 'bg-purple-100 text-purple-700 border-purple-300',
        herramientas: 'bg-orange-100 text-orange-700 border-orange-300',
        epp: 'bg-green-100 text-green-700 border-green-300'
    };

    const itemsByCategory = itemsList.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <form onSubmit={handleSubmit}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-brand-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">Registrar Movimiento de Stock</h3>
                            <p className="text-sm text-slate-500">Agregue múltiples ítems en una sola transacción</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Movement Type & Reference */}
                    <div className="grid grid-cols-3 gap-4">
                        {/* Type Selector */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Movimiento</label>
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => setMovementType('IN')}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${movementType === 'IN'
                                            ? 'bg-green-100 border-2 border-green-500 text-green-700'
                                            : 'bg-slate-50 border border-slate-200 text-slate-700'
                                        }`}
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="font-medium">Ingreso</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMovementType('OUT')}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${movementType === 'OUT'
                                            ? 'bg-red-100 border-2 border-red-500 text-red-700'
                                            : 'bg-slate-50 border border-slate-200 text-slate-700'
                                        }`}
                                >
                                    <TrendingDown className="w-4 h-4" />
                                    <span className="font-medium">Salida</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMovementType('ADJUST')}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${movementType === 'ADJUST'
                                            ? 'bg-yellow-100 border-2 border-yellow-500 text-yellow-700'
                                            : 'bg-slate-50 border border-slate-200 text-slate-700'
                                        }`}
                                >
                                    <Edit3 className="w-4 h-4" />
                                    <span className="font-medium">Ajuste</span>
                                </button>
                            </div>
                        </div>

                        {/* Reference Type & ID */}
                        <div className="col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Referencia</label>
                                <select
                                    value={referenceType}
                                    onChange={(e) => setReferenceType(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                >
                                    {Object.entries(referenceLabels).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">ID Referencia (Opcional)</label>
                                <input
                                    type="text"
                                    value={referenceId}
                                    onChange={(e) => setReferenceId(e.target.value)}
                                    placeholder="Ej: Factura #1234"
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Global Notes */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Notas Generales</label>
                        <textarea
                            value={globalNotes}
                            onChange={(e) => setGlobalNotes(e.target.value)}
                            rows={2}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            placeholder="Notas que se aplicarán a todos los ítems..."
                        />
                    </div>

                    {/* Item Search & Add */}
                    <div className="border-t border-slate-200 pt-6">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Agregar Ítems</h4>
                        <div className="grid grid-cols-5 gap-3">
                            {/* Category Filter */}
                            <div>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => {
                                        setSelectedCategory(e.target.value);
                                        setSearchTerm('');
                                    }}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 text-sm"
                                >
                                    {Object.entries(categoryLabels).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Search Input */}
                            <div className="col-span-4 relative">
                                <input
                                    type="text"
                                    placeholder="Buscar por código o nombre..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />

                                {/* Dropdown */}
                                {showDropdown && searchResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {searchResults.map((item) => (
                                            <button
                                                key={`${item.category}-${item.rawId}`}
                                                type="button"
                                                onClick={() => handleAddItem(item)}
                                                className="w-full px-4 py-2 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium text-slate-800">{item.name}</div>
                                                        <div className="text-sm text-slate-500">
                                                            {item.code} • Stock: {item.stock} {item.unit}
                                                        </div>
                                                    </div>
                                                    <Plus className="w-4 h-4 text-brand-600" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Items List */}
                    {itemsList.length > 0 && (
                        <div className="border-t border-slate-200 pt-6">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">
                                Ítems Agregados ({itemsList.length})
                            </h4>
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Categoría</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Código</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Ítem</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Stock Actual</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Cantidad</th>
                                            <th className="px-4 py-2 text-center text-xs font-medium text-slate-600">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {itemsList.map((item, index) => (
                                            <tr key={index} className="hover:bg-slate-50">
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${categoryColors[item.category]}`}>
                                                        {categoryLabels[item.category]}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.code}</td>
                                                <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                                                <td className="px-4 py-3 text-slate-600">
                                                    {item.stock} {item.unit}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={item.quantity}
                                                        onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                        className="w-24 px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                                    />
                                                    <span className="ml-2 text-xs text-slate-500">{item.unit}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary */}
                            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex gap-4">
                                        <span className="text-slate-600">
                                            <strong className="text-slate-800">{itemsList.length}</strong> ítem(s) total
                                        </span>
                                        {Object.entries(itemsByCategory).map(([cat, count]) => (
                                            <span key={cat} className="text-slate-600">
                                                {categoryLabels[cat]}: <strong className="text-slate-800">{count}</strong>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="border-t border-slate-200 pt-6">
                        <button
                            type="submit"
                            disabled={loading || itemsList.length === 0}
                            className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Registrando...
                                </>
                            ) : (
                                <>
                                    <Package className="w-5 h-5" />
                                    Registrar {itemsList.length} Movimiento{itemsList.length !== 1 ? 's' : ''}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
