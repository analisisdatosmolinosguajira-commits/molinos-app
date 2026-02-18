import React, { useState, useEffect } from 'react';
import { Package, Wrench, Shield, Box, Search, AlertTriangle, Plus, Edit2, Trash2, TrendingUp } from 'lucide-react';
import { InventoryService } from '../../services/inventory';
import InventoryItemModal from '../../components/inventory/InventoryItemModal';
import KardexModal from '../../components/inventory/KardexModal';
import BatchMovementForm from '../../components/inventory/BatchMovementForm';
import MovementHistoryTable from '../../components/inventory/MovementHistoryTable';

export default function InventoryPage() {
    const [activeCategory, setActiveCategory] = useState('materiales');
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    // Kardex state
    const [showKardex, setShowKardex] = useState(false);
    const [kardexItem, setKardexItem] = useState(null);

    // Movements state
    const [movements, setMovements] = useState([]);
    const [movementFilters, setMovementFilters] = useState({
        startDate: null,
        endDate: null,
        category: null,
        itemId: null,
        type: null
    });
    const [loadingMovements, setLoadingMovements] = useState(false);

    useEffect(() => {
        loadInventory();
    }, []);

    async function loadInventory() {
        try {
            setLoading(true);
            const data = await InventoryService.getInventory();
            setInventory(data || []);
        } catch (err) {
            console.error("Error loading inventory:", err);
            setError("No se pudo cargar el inventario.");
        } finally {
            setLoading(false);
        }
    }

    const categories = [
        { id: 'materiales', label: 'Materiales', icon: Box },
        { id: 'piezas', label: 'Piezas', icon: Package },
        { id: 'herramientas', label: 'Herramientas', icon: Wrench },
        { id: 'epp', label: 'EPP', icon: Shield },
        { id: 'movimientos', label: 'Movimientos', icon: TrendingUp },
    ];

    const normalizeCategory = (cat) => {
        if (!cat) return 'materiales';
        const lower = cat.toLowerCase();
        if (lower.includes('mater')) return 'materiales';
        if (lower.includes('herram') || lower.includes('tool')) return 'herramientas';
        if (lower.includes('epp') || lower.includes('ppe')) return 'epp';
        return 'piezas';
    };

    const filteredItems = inventory.filter(item => {
        const matchesCategory = normalizeCategory(item.category) === activeCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    // ========== CRUD Handlers ==========
    const handleCreate = () => {
        setEditingItem(null);
        setShowModal(true);
    };

    const handleEdit = (item) => {
        setEditingItem(item.raw); // Pass the raw DB object
        setShowModal(true);
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`¿Eliminar "${item.name}"? Esta acción no se puede deshacer.`)) return;

        try {
            // Determine which delete method to call based on category
            switch (activeCategory) {
                case 'materiales':
                    await InventoryService.deleteMaterial(item.rawId);
                    break;
                case 'piezas':
                    await InventoryService.deletePiece(item.rawId);
                    break;
                case 'herramientas':
                    await InventoryService.deleteTool(item.rawId);
                    break;
                case 'epp':
                    await InventoryService.deleteSafetyEquipment(item.rawId);
                    break;
            }
            await loadInventory(); // Reload inventory
            alert('Elemento eliminado correctamente.');
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Hubo un error al eliminar el elemento.');
        }
    };

    const handleShowKardex = (item) => {
        setKardexItem(item);
        setShowKardex(true);
    };

    // Movement handlers
    const handleMovementSubmit = async (movements) => {
        try {
            await InventoryService.createBatchMovements(movements);
            // Reload inventory to reflect new stock levels
            await loadInventory();
            // Reload movements list
            await loadMovements();
        } catch (error) {
            console.error('Error creating movements:', error);
            throw error;
        }
    };

    const loadMovements = async () => {
        try {
            setLoadingMovements(true);
            const data = await InventoryService.getAllMovements(movementFilters);
            setMovements(data || []);
        } catch (error) {
            console.error('Error loading movements:', error);
        } finally {
            setLoadingMovements(false);
        }
    };

    // Load movements when tab is activated or filters change
    useEffect(() => {
        if (activeCategory === 'movimientos') {
            loadMovements();
        }
    }, [activeCategory, movementFilters]);

    const handleSave = async (formData) => {
        try {
            if (editingItem) {
                // Update existing item
                switch (activeCategory) {
                    case 'materiales':
                        await InventoryService.updateMaterial(editingItem.material_id, formData);
                        break;
                    case 'piezas':
                        await InventoryService.updatePiece(editingItem.piece_id, formData);
                        break;
                    case 'herramientas':
                        await InventoryService.updateTool(editingItem.tool_id, formData);
                        break;
                    case 'epp':
                        await InventoryService.updateSafetyEquipment(editingItem.safety_id, formData);
                        break;
                }
            } else {
                // Create new item
                switch (activeCategory) {
                    case 'materiales':
                        await InventoryService.createMaterial(formData);
                        break;
                    case 'piezas':
                        await InventoryService.createPiece(formData);
                        break;
                    case 'herramientas':
                        await InventoryService.createTool(formData);
                        break;
                    case 'epp':
                        await InventoryService.createSafetyEquipment(formData);
                        break;
                }
            }
            await loadInventory(); // Reload inventory
            setShowModal(false);
        } catch (error) {
            console.error('Error saving item:', error);
            throw error; // Let the modal handle the error
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando inventario...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Inventario Unificado</h1>
                    <p className="text-slate-500 mt-1">Control de stock: Materiales, Piezas, Herramientas y EPP</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-4 border-b border-slate-200 pb-1">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-xl transition-all relative top-0.5 ${activeCategory === cat.id
                            ? 'bg-white text-brand-600 border border-slate-200 border-b-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                    >
                        <cat.icon size={18} />
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 capitalize">{categories.find(c => c.id === activeCategory)?.label}</h3>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar ítem..."
                                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-brand-300"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {/* Only show Nuevo button in inventory tabs, not in Movimientos */}
                        {activeCategory !== 'movimientos' && (
                            <button
                                onClick={handleCreate}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                            >
                                <Plus size={16} />
                                Nuevo
                            </button>
                        )}
                    </div>
                </div>

                {/* Movimientos Tab Content */}
                {activeCategory === 'movimientos' ? (
                    <div className="space-y-6">
                        <BatchMovementForm
                            onSubmit={handleMovementSubmit}
                            inventory={inventory}
                        />
                        <MovementHistoryTable
                            movements={movements}
                            filters={movementFilters}
                            onFilterChange={setMovementFilters}
                            loading={loadingMovements}
                        />
                    </div>
                ) : (
                    <>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">Código / Ítem</th>
                                    <th className="px-6 py-4">Stock Actual</th>
                                    <th className="px-6 py-4">Stock Mínimo</th>
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredItems.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{item.name}</div>
                                            <div className="text-xs text-slate-400 font-mono">{item.code || 'S/C'}</div>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-slate-700">{item.stock} <span className="text-xs text-slate-400 font-normal">{item.unit}</span></td>
                                        <td className="px-6 py-4 text-slate-500">{item.min} {item.unit}</td>
                                        <td className="px-6 py-4">
                                            {item.stock < item.min ? (
                                                <span className="flex items-center gap-1 text-rose-600 font-bold text-xs bg-rose-50 px-2 py-1 rounded w-fit">
                                                    <AlertTriangle size={12} />
                                                    BAJO STOCK
                                                </span>
                                            ) : (
                                                <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded w-fit">
                                                    OK
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    className="text-brand-600 font-medium hover:underline text-xs"
                                                    onClick={() => handleShowKardex(item)}
                                                >
                                                    Ver Kardex
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredItems.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-slate-400 italic">No hay ítems registrados en esta categoría.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </>
                )}
            </div>

            {/* CRUD Modal */}
            {showModal && (
                <InventoryItemModal
                    category={activeCategory}
                    item={editingItem}
                    onClose={() => setShowModal(false)}
                    onSave={handleSave}
                />
            )}

            {/* Kardex Modal */}
            {showKardex && kardexItem && (
                <KardexModal
                    category={activeCategory}
                    item={kardexItem}
                    onClose={() => {
                        setShowKardex(false);
                        setKardexItem(null);
                    }}
                />
            )}
        </div>
    );
}
