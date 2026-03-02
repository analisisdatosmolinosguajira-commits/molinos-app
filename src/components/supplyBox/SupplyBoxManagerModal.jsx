import React, { useState, useEffect } from 'react';
import { X, Package, ArrowDownRight, ArrowUpRight, Search, Loader2 } from 'lucide-react';
import { SupplyBoxService } from '../../services/supplyBox';

const ITEM_TYPES = [
    { id: 'material', label: 'Material' },
    { id: 'piece', label: 'Pieza' },
    { id: 'tool', label: 'Herramienta' },
    { id: 'epp', label: 'EPP' }
];

export default function SupplyBoxManagerModal({ box, onClose, onComplete }) {
    const [activeTab, setActiveTab] = useState('entrada'); // 'entrada' | 'devolucion'
    const [itemType, setItemType] = useState('material');
    const [inventoryItems, setInventoryItems] = useState([]);
    const [boxItems, setBoxItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (activeTab === 'entrada') {
            loadInventoryItems();
        } else {
            loadBoxItems();
        }
        setSelectedItem(null);
        setQuantity('');
        setSearchTerm('');
    }, [activeTab, itemType]);

    const loadInventoryItems = async () => {
        setLoading(true);
        try {
            const data = await SupplyBoxService.getInventoryItemsByType(itemType);
            setInventoryItems(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadBoxItems = async () => {
        setLoading(true);
        try {
            const data = await SupplyBoxService.getBoxItems(box.box_id);
            setBoxItems(data.filter(i => i.item_type === itemType));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedItem || !quantity || parseFloat(quantity) <= 0) return;
        setSubmitting(true);
        try {
            if (activeTab === 'entrada') {
                await SupplyBoxService.addItemToBox(box.box_id, itemType, selectedItem.id || selectedItem.item_ref_id, parseFloat(quantity), notes);
            } else {
                await SupplyBoxService.returnItem(box.box_id, itemType, selectedItem.item_ref_id, parseFloat(quantity), notes);
            }
            alert(activeTab === 'entrada' ? 'Item asignado a la caja' : 'Item devuelto al inventario');
            setSelectedItem(null);
            setQuantity('');
            setNotes('');
            // Reload
            if (activeTab === 'entrada') loadInventoryItems();
            else loadBoxItems();
            if (onComplete) onComplete();
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredItems = activeTab === 'entrada'
        ? inventoryItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
        : boxItems.filter(i => i.item_name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Gestionar Caja</h2>
                        <p className="text-xs text-slate-500">{box.label || `Caja #${box.box_id}`}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-5 pt-4 flex gap-2">
                    <button
                        onClick={() => setActiveTab('entrada')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${activeTab === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <ArrowDownRight size={16} />
                        Entrada a Caja
                    </button>
                    <button
                        onClick={() => setActiveTab('devolucion')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${activeTab === 'devolucion' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <ArrowUpRight size={16} />
                        Devolución
                    </button>
                </div>

                {/* Item Type Filter */}
                <div className="px-5 pt-3 flex gap-2 flex-wrap">
                    {ITEM_TYPES.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setItemType(t.id)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${itemType === t.id ? 'bg-brand-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="px-5 pt-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar item..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                        />
                    </div>
                </div>

                {/* Item List */}
                <div className="px-5 pt-3 flex-1 overflow-y-auto min-h-0">
                    {loading ? (
                        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
                    ) : filteredItems.length === 0 ? (
                        <p className="text-center text-sm text-slate-400 py-8">No hay items disponibles</p>
                    ) : (
                        <div className="space-y-1.5">
                            {filteredItems.map(item => {
                                const isSelected = selectedItem && (
                                    (activeTab === 'entrada' && selectedItem.id === item.id) ||
                                    (activeTab === 'devolucion' && selectedItem.item_id === item.item_id)
                                );
                                return (
                                    <button
                                        key={item.id || item.item_id}
                                        onClick={() => setSelectedItem(item)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${isSelected ? 'bg-brand-50 border-2 border-brand-300' : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                                            }`}
                                    >
                                        <span className="text-sm font-medium text-slate-700">
                                            {activeTab === 'entrada' ? item.name : item.item_name}
                                        </span>
                                        <span className="text-xs font-mono text-slate-500">
                                            {activeTab === 'entrada'
                                                ? `Stock: ${item.stock} ${item.unit}`
                                                : `En caja: ${item.quantity} ${item.item_unit}`
                                            }
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer: Quantity + Submit */}
                {selectedItem && (
                    <div className="p-5 border-t border-slate-100 space-y-3">
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cantidad</label>
                                <input
                                    type="number" min="0.01" step="0.01"
                                    max={activeTab === 'entrada' ? selectedItem.stock : selectedItem.quantity}
                                    value={quantity} onChange={e => setQuantity(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notas</label>
                                <input
                                    type="text" value={notes} onChange={e => setNotes(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    placeholder="Observaciones..."
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleSubmit} disabled={submitting || !quantity}
                            className={`w-full py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 ${activeTab === 'entrada' ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-600 hover:bg-blue-500'
                                }`}
                        >
                            {submitting && <Loader2 size={14} className="animate-spin" />}
                            {activeTab === 'entrada' ? '✅ Asignar a Caja' : '↩️ Devolver a Inventario'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
