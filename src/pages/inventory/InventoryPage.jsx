import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Package, Wrench, Shield, Box, Search, AlertTriangle, Plus, Edit2, Trash2, TrendingUp, Users, FolderOpen, ClipboardList } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { InventoryService } from '../../services/inventory';
import { SupplierService } from '../../services/supplier';
import InventoryItemModal from '../../components/inventory/InventoryItemModal';
import KardexModal from '../../components/inventory/KardexModal';
import BatchMovementForm from '../../components/inventory/BatchMovementForm';
import MovementHistoryTable from '../../components/inventory/MovementHistoryTable';
import OrderPlanningTab from '../../components/inventory/OrderPlanningTab';
import SupplyBoxesTab from '../../components/inventory/SupplyBoxesTab';
import PermissionGate from '../../components/auth/PermissionGate';

export default function InventoryPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeCategory, setActiveCategory] = useState(location.state?.activeTab || 'materiales');
    const [inventory, setInventory] = useState([]);
    const [allInventory, setAllInventory] = useState([]); // Full inventory for BatchMovementForm
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Pagination state
    const PAGE_SIZE = 25;
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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

    // Debounce search input (300ms)
    const searchTimerRef = useRef(null);
    useEffect(() => {
        searchTimerRef.current = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1); // Reset to page 1 on new search
        }, 300);
        return () => clearTimeout(searchTimerRef.current);
    }, [searchTerm]);

    // Load paginated data when category, page, or search changes
    const inventoryTabs = ['materiales', 'piezas', 'herramientas', 'epp', 'proveedores'];
    useEffect(() => {
        if (inventoryTabs.includes(activeCategory)) {
            loadCategoryPage();
        }
    }, [activeCategory, currentPage, debouncedSearch]);

    async function loadCategoryPage() {
        try {
            setLoading(true);
            const { items, totalCount: count } = await InventoryService.getInventoryByCategory(
                activeCategory, currentPage, PAGE_SIZE, debouncedSearch
            );
            setInventory(items);
            setTotalCount(count);
        } catch (err) {
            console.error('Error loading inventory page:', err);
            setError('No se pudo cargar el inventario.');
        } finally {
            setLoading(false);
        }
    }

    // Load full inventory only when the Movimientos tab needs it (for BatchMovementForm)
    async function loadFullInventory() {
        if (allInventory.length > 0) return; // Already loaded
        try {
            const data = await InventoryService.getInventory();
            setAllInventory(data || []);
        } catch (err) {
            console.error('Error loading full inventory:', err);
        }
    }

    // Reset page when switching tabs
    const handleCategoryChange = (catId) => {
        setActiveCategory(catId);
        setCurrentPage(1);
        setSearchTerm('');
        setDebouncedSearch('');
    };

    const categories = [
        { id: 'materiales', label: 'Materiales', icon: Box },
        { id: 'piezas', label: 'Piezas', icon: Package },
        { id: 'herramientas', label: 'Herramientas', icon: Wrench },
        { id: 'epp', label: 'EPP', icon: Shield },
        { id: 'proveedores', label: 'Proveedores', icon: Users },
        { id: 'movimientos', label: 'Movimientos', icon: TrendingUp },
        { id: 'cajas', label: 'Cajas', icon: Package },
    ];

    // Items are now already filtered server-side — no client-side filtering needed
    const filteredItems = inventory;

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
                case 'proveedores':
                    await SupplierService.deleteSupplier(item.rawId);
                    break;
            }
            await loadCategoryPage(); // Reload current page
            alert('Elemento eliminado correctamente.');
        } catch (error) {
            console.error('Error deleting item:', error);
            if (error?.code === '23503') {
                alert(`No se puede eliminar "${item.name}" porque está siendo utilizado de forma activa actualmente en el sistema (ej. en órdenes de trabajo, equipos o inventario relacionado).`);
            } else {
                alert('Hubo un error al eliminar el elemento.');
            }
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
            // Reload movements list and invalidate cached full inventory
            setAllInventory([]);
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

    // Load movements and full inventory when tab is activated or filters change
    useEffect(() => {
        if (activeCategory === 'movimientos') {
            loadMovements();
            loadFullInventory();
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
                    case 'proveedores':
                        await SupplierService.updateSupplier(editingItem.supplier_id, formData);
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
                    case 'proveedores':
                        await SupplierService.createSupplier(formData);
                        break;
                }
            }
            await loadCategoryPage(); // Reload current page
            setShowModal(false);
        } catch (error) {
            console.error('Error saving item:', error);
            throw error; // Let the modal handle the error
        }
    };

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
                        onClick={() => handleCategoryChange(cat.id)}
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
                    <h3 className="font-bold text-slate-700 capitalize">{activeCategory === 'planificacion' ? 'Planificación de Pedidos' : categories.find(c => c.id === activeCategory)?.label}</h3>
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
                        {/* Only show Nuevo button in inventory tabs, not in Movimientos or Planificacion */}
                        {activeCategory !== 'movimientos' && activeCategory !== 'planificacion' && activeCategory !== 'cajas' && (
                            <PermissionGate module="inventario" action="create">
                                <button
                                    onClick={handleCreate}
                                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
                                >
                                    <Plus size={16} />
                                    Nuevo
                                </button>
                            </PermissionGate>
                        )}
                        {activeCategory === 'movimientos' && (
                            <button
                                onClick={() => setActiveCategory('planificacion')}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white object-center rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium shadow-sm hover:shadow"
                            >
                                <ClipboardList size={16} />
                                Planificar Pedido
                            </button>
                        )}
                        {activeCategory === 'planificacion' && (
                            <button
                                onClick={() => setActiveCategory('movimientos')}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                            >
                                Volver a Movimientos
                            </button>
                        )}
                    </div>
                </div>

                {/* Movimientos and Planificacion Content */}
                {activeCategory === 'cajas' ? (
                    <SupplyBoxesTab />
                ) : activeCategory === 'planificacion' ? (
                    <OrderPlanningTab onNotification={(notif) => alert(notif.message)} />
                ) : activeCategory === 'movimientos' ? (
                    <div className="space-y-6">
                        <BatchMovementForm
                            onSubmit={handleMovementSubmit}
                            inventory={allInventory}
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
                        {loading ? (
                            <div className="p-8 text-center text-slate-500">Cargando...</div>
                        ) : (
                            <>
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                        <tr>
                                            {activeCategory === 'proveedores' ? (
                                                <>
                                                    <th className="px-6 py-4">Razón Social</th>
                                                    <th className="px-6 py-4">Contacto</th>
                                                    <th className="px-6 py-4">Información</th>
                                                    <th className="px-6 py-4">Tipo</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="px-6 py-4">Código / Ítem</th>
                                                    <th className="px-6 py-4">Stock Actual</th>
                                                    <th className="px-6 py-4">Stock Mínimo</th>
                                                    <th className="px-6 py-4">Estado</th>
                                                </>
                                            )}
                                            <th className="px-6 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredItems.map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                {activeCategory === 'proveedores' ? (
                                                    <>
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-slate-800">{item.name}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-700">
                                                            {item.location}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-slate-700">{item.status}</div>
                                                            <div className="text-xs text-slate-500">{item.raw?.email || 'N/A'}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-500 text-sm">
                                                            {item.description}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
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
                                                    </>
                                                )}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {activeCategory !== 'proveedores' && (
                                                            <button
                                                                className="text-brand-600 font-medium hover:underline text-xs"
                                                                onClick={() => handleShowKardex(item)}
                                                            >
                                                                Ver Kardex
                                                            </button>
                                                        )}
                                                        {activeCategory === 'proveedores' && (
                                                            <button
                                                                onClick={() => navigate(`/inventario/supplier/${item.rawId}`)}
                                                                className="p-1.5 text-brand-600 hover:bg-brand-50 rounded transition-colors"
                                                                title="Ver Perfil y Catálogo"
                                                            >
                                                                <FolderOpen size={16} />
                                                            </button>
                                                        )}
                                                        <PermissionGate module="inventario" action="update">
                                                            <button
                                                                onClick={() => handleEdit(item)}
                                                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                        </PermissionGate>
                                                        <PermissionGate module="inventario" action="delete">
                                                            <button
                                                                onClick={() => handleDelete(item)}
                                                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </PermissionGate>
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

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                                        <span className="text-sm text-slate-500">
                                            Mostrando {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)} de {totalCount} ítems
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage <= 1}
                                                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <ChevronLeft size={16} />
                                                Anterior
                                            </button>
                                            <span className="text-sm font-semibold text-slate-700 px-2">
                                                {currentPage} / {totalPages}
                                            </span>
                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage >= totalPages}
                                                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Siguiente
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
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
