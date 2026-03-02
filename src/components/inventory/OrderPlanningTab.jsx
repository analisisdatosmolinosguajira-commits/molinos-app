import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, AlertCircle, ShoppingCart, Trash2, Calculator, Save, FileText, X, ArrowLeft, Download, FileSpreadsheet, Trash } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { InventoryService } from '../../services/inventory';
import { SupplierService } from '../../services/supplier';

export default function OrderPlanningTab({ onNotification }) {
    // Left Pane State (Low Stock)
    const [lowStockItems, setLowStockItems] = useState([]);
    const [loadingLowStock, setLoadingLowStock] = useState(true);

    // Right Pane State (Planning Board)
    const [planningList, setPlanningList] = useState([]);
    const [saving, setSaving] = useState(false);

    // Search/Add State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchCategory, setSearchCategory] = useState('materiales'); // default

    // Low Stock Filters
    const [lowStockSearch, setLowStockSearch] = useState('');
    const [lowStockCategory, setLowStockCategory] = useState(''); // empty = all

    // Catalogs State - stores catalog options for each item in the planning board
    // Key: row id, Value: array of catalog options
    const [itemCatalogs, setItemCatalogs] = useState({});

    // === NEW STATE FOR ORDER MANAGEMENT ===
    const [currentView, setCurrentView] = useState('list'); // 'list' | 'editor'
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [currentOrder, setCurrentOrder] = useState(null);

    useEffect(() => {
        loadLowStockItems();
    }, []);

    useEffect(() => {
        if (currentView === 'list') {
            loadPurchaseOrders();
        }
    }, [currentView]);

    const loadPurchaseOrders = async () => {
        try {
            setLoadingOrders(true);
            const orders = await InventoryService.getPurchaseOrders();
            setPurchaseOrders(orders || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
            onNotification({ type: 'error', message: 'Error cargando los pedidos.' });
        } finally {
            setLoadingOrders(false);
        }
    };

    const handleCreateNewOrder = () => {
        setCurrentOrder(null);
        setPlanningList([]);
        setItemCatalogs({});
        setCurrentView('editor');
    };

    const handleLoadOrder = async (orderId) => {
        try {
            setLoadingOrders(true);
            const details = await InventoryService.getPurchaseOrderDetails(orderId);

            // Map items back to planningList format
            const mappedItems = (details.items || []).map(item => ({
                id: crypto.randomUUID(), // New UI id for row
                rawId: item.piece_id || item.tool_id || item.material_id || item.safety_id,
                category: item.material_id ? 'materiales' : item.piece_id ? 'piezas' : item.tool_id ? 'herramientas' : item.safety_id ? 'epp' : undefined,
                name: item.name,
                description: item.description || '',
                unit: item.unit || 'ud',
                quantity: item.quantity,
                unitPrice: item.unit_price,
                total: item.total_price,
                notes: '',
                supplier_notes: item.supplier_notes || '',
                isManual: !(item.piece_id || item.tool_id || item.material_id || item.safety_id)
            }));

            setCurrentOrder(details);
            setPlanningList(mappedItems);
            setItemCatalogs({});
            setCurrentView('editor');
        } catch (error) {
            console.error('Error fetching order details:', error);
            onNotification({ type: 'error', message: 'Error al abrir el pedido.' });
        } finally {
            setLoadingOrders(false);
        }
    };

    const loadLowStockItems = async () => {
        try {
            setLoadingLowStock(true);
            const items = await InventoryService.getLowStockItems();
            setLowStockItems(items);
        } catch (error) {
            console.error('Error loading low stock items:', error);
            onNotification({
                type: 'error',
                message: 'Error al cargar los ítems con stock bajo.'
            });
        } finally {
            setLoadingLowStock(false);
        }
    };

    const filteredLowStockItems = useMemo(() => {
        return lowStockItems.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(lowStockSearch.toLowerCase()) ||
                item.code.toLowerCase().includes(lowStockSearch.toLowerCase());
            const matchesCategory = lowStockCategory === '' || item.category === lowStockCategory;
            return matchesSearch && matchesCategory;
        });
    }, [lowStockItems, lowStockSearch, lowStockCategory]);

    // --- Search functionality for adding items ---
    useEffect(() => {
        const searchItems = async () => {
            // Wait for at least 2 characters if typing, otherwise fetch all (empty)
            if (searchTerm.length === 1) {
                return;
            }

            try {
                setIsSearching(true);
                const results = await InventoryService.getItemsByCategory(searchCategory, searchTerm);
                // Allow adding the same item multiple times (no filtering)
                setSearchResults(results);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(searchItems, 300);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, searchCategory, planningList]);


    // --- Handlers for the Planning Board ---

    const addItemToPlan = async (item, source = 'db') => {
        // We now allow duplicate additions so users can select different suppliers for the same base item
        const newRowId = crypto.randomUUID();
        const newItem = {
            id: newRowId, // Unique UI id for the row
            rawId: item.rawId || item.id,
            category: item.category || searchCategory,
            name: item.name || '',
            description: item.description || '',
            unit: item.unit || 'Unidad',
            quantity: 1, // Default to 1
            unitPrice: item.defaultPrice || 0,
            notes: '',
            catalog_id: null, // Tracks the selected supplier catalog id
            isManual: source === 'manual'
        };

        setPlanningList(prev => [...prev, newItem]);
        if (source === 'db') {
            // Reset search if added from search bar
            setSearchTerm('');
            setSearchResults([]);

            // Asynchronously load supplier catalog options for this item
            try {
                const catalogs = await SupplierService.getCatalogsForItem(newItem.category, newItem.rawId);
                if (catalogs && catalogs.length > 0) {
                    setItemCatalogs(prev => ({
                        ...prev,
                        [newRowId]: catalogs
                    }));
                }
            } catch (err) {
                console.error("Error loading catalogs for item:", err);
            }
        }
    };

    const addManualItem = () => {
        addItemToPlan({ name: 'Nuevo Ítem Manual', unit: 'Unidad' }, 'manual');
    };

    const updateItem = (id, field, value) => {
        if (field === 'catalog_id') {
            // Handle specific catalog selection changes to update price automatically
            const catalogs = itemCatalogs[id] || [];
            const selectedCatalog = catalogs.find(c => c.catalog_id.toString() === value.toString());

            setPlanningList(prev => prev.map(item => {
                if (item.id === id) {
                    return {
                        ...item,
                        catalog_id: value,
                        unitPrice: selectedCatalog ? selectedCatalog.price : item.unitPrice,
                        supplier_notes: selectedCatalog ? `${selectedCatalog.supplier?.name} - ${selectedCatalog.brand || ''}` : item.supplier_notes
                    };
                }
                return item;
            }));
        } else {
            setPlanningList(prev => prev.map(item => {
                if (item.id === id) {
                    return { ...item, [field]: value };
                }
                return item;
            }));
        }
    };

    const removeItemFromPlan = (id) => {
        setPlanningList(prev => prev.filter(item => item.id !== id));
        // Also cleanup cached catalogs
        setItemCatalogs(prev => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
        });
    };

    const clearPlan = () => {
        if (window.confirm('¿Estás seguro de que deseas limpiar toda la lista de planificación?')) {
            setPlanningList([]);
        }
    };

    // --- Calculations ---
    const calculateTotals = useMemo(() => {
        return planningList.reduce((acc, item) => {
            const rowTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
            return acc + rowTotal;
        }, 0);
    }, [planningList]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const handleDeleteOrder = async (e, orderId, title) => {
        e.stopPropagation(); // prevent row click from triggering
        if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el pedido "${title}"?`)) {
            try {
                setLoadingOrders(true);
                await InventoryService.deletePurchaseOrder(orderId);
                onNotification({ type: 'success', message: 'Pedido eliminado exitosamente.' });
                loadPurchaseOrders(); // reload list
            } catch (err) {
                console.error("Error deleting order:", err);
                onNotification({ type: 'error', message: 'Error al eliminar el pedido.' });
                setLoadingOrders(false);
            }
        }
    };

    const handleDeleteCurrentOrder = async () => {
        if (!currentOrder) return;
        if (window.confirm(`¿Seguro que deseas eliminar este pedido ("${currentOrder.title}")? Se perderán todos sus ítems.`)) {
            try {
                setSaving(true);
                await InventoryService.deletePurchaseOrder(currentOrder.order_id);
                onNotification({ type: 'success', message: 'Pedido eliminado.' });
                setCurrentView('list');
            } catch (err) {
                console.error("Error:", err);
                onNotification({ type: 'error', message: 'Error eliminando pedido.' });
            } finally {
                setSaving(false);
            }
        }
    };

    // --- Export Functions ---
    const exportToExcel = () => {
        if (planningList.length === 0) return;

        // Formato para XLSX
        const rows = planningList.map((item, index) => ({
            "Ítem #": index + 1,
            "Nombre del Producto": item.name,
            "Descripción Adicional": item.description || '',
            "Proveedor Sugerido / Marca": item.supplier_notes || '',
            "Cantidad a Comprar": item.quantity,
            "Unidad de Medida": item.unit || 'ud',
            "Costo Unitario (Estimado)": item.unitPrice,
            "Costo Total (Estimado)": (item.quantity * item.unitPrice),
            "Observaciones Internas": item.notes || ''
        }));

        // Añadir fila de totales
        rows.push({
            "Ítem #": "",
            "Nombre del Producto": "TOTAL ESTIMADO",
            "Descripción Adicional": "",
            "Proveedor Sugerido / Marca": "",
            "Cantidad a Comprar": "",
            "Unidad de Medida": "",
            "Costo Unitario (Estimado)": "",
            "Costo Total (Estimado)": calculateTotals,
            "Observaciones Internas": ""
        });

        // Crear hoja de trabajo
        const worksheet = XLSX.utils.json_to_sheet(rows);

        // --- Estilizar Celdas (Formatos de Número y Moneda) ---
        // En xlsx (SheetJS), el formato de número se asigna a la propiedad .z de cada celda
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        // Las columnas de moneda son la G (Costo Unitario, índice 6) y la H (Costo Total, índice 7)
        for (let R = range.s.r + 1; R <= range.e.r; ++R) { // Saltar la primera fila (cabeceras)
            // Formatear Costo Unitario
            const cellG = worksheet[XLSX.utils.encode_cell({ c: 6, r: R })];
            if (cellG && cellG.t === 'n') {
                cellG.z = '"$"#,##0.00'; // Formato de moneda
            }
            // Formatear Costo Total
            const cellH = worksheet[XLSX.utils.encode_cell({ c: 7, r: R })];
            if (cellH && cellH.t === 'n') {
                cellH.z = '"$"#,##0.00'; // Formato de moneda
            }
        }

        // Estilizar un poco las columnas (ancho)
        const columnWidths = [
            { wch: 8 },  // #
            { wch: 30 }, // Nombre
            { wch: 25 }, // Descripcion
            { wch: 25 }, // Proveedor
            { wch: 18 }, // Cantidad
            { wch: 18 }, // Unidad
            { wch: 22 }, // Costo Unitario
            { wch: 22 }, // Costo Total
            { wch: 30 }  // Observaciones
        ];
        worksheet['!cols'] = columnWidths;

        // Crear libro y guardarlo
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Planificación de Compras");

        const title = currentOrder ? currentOrder.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'plan_de_orden';
        XLSX.writeFile(workbook, `pedido_${title}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const exportToPDF = () => {
        if (planningList.length === 0) return;

        const doc = new jsPDF();
        const title = currentOrder ? currentOrder.title : 'Plan de Orden de Compra';
        const dateStr = new Date().toLocaleDateString('es-CO');

        // Header
        doc.setFontSize(18);
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text(title, 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(`Fecha de exportación: ${dateStr}`, 14, 30);

        if (currentOrder) {
            doc.text(`Estado actual: ${currentOrder.status.toUpperCase()}`, 14, 36);
        }

        // Table
        const tableColumn = ["#", "Ítem", "Proveedor / Marca", "Cant.", "V. Unitario", "Total", "Obs."];
        const tableRows = [];

        planningList.forEach((item, index) => {
            const itemData = [
                index + 1,
                item.name + (item.description ? `\n(${item.description})` : ''),
                item.supplier_notes || 'N/A',
                `${item.quantity} ${item.unit}`,
                formatCurrency(item.unitPrice),
                formatCurrency(item.quantity * item.unitPrice),
                item.notes || ''
            ];
            tableRows.push(itemData);
        });

        autoTable(doc, {
            startY: 45,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [59, 130, 246] }, // blue-500
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                3: { cellWidth: 20, halign: 'center' },
                4: { cellWidth: 25, halign: 'right' },
                5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
            }
        });

        // Totals sum at bottom
        const finalY = doc.lastAutoTable?.finalY || 45;
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text(`Presupuesto Estimado Total: ${formatCurrency(calculateTotals)}`, 14, finalY + 10);

        doc.save(`Pedido_${title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    };

    const handleSaveOrder = async () => {
        if (planningList.length === 0) {
            onNotification({ type: 'warning', message: 'No hay ítems en la hoja de pedido.' });
            return;
        }

        const title = currentOrder ? currentOrder.title : prompt('Ingrese un nombre o referencia para este pedido (ej. "Pedido Mensual Marzo"):');
        if (!title) return; // cancelled

        try {
            setSaving(true);
            await InventoryService.savePurchaseOrder(
                title,
                planningList,
                calculateTotals,
                currentOrder?.notes || 'Generado desde el módulo de planificación.',
                currentOrder?.order_id
            );

            setCurrentView('list'); // Clear the board on success and return to list

            // Trigger a success notification instead of alert if possible, or use onNotification
            onNotification({ type: 'success', message: `Pedido "${title}" guardado correctamente.` });

        } catch (error) {
            console.error('Error al guardar el pedido:', error);
            onNotification({ type: 'error', message: 'Hubo un error al guardar el pedido. Intente nuevamente.' });
        } finally {
            setSaving(false);
        }
    };

    if (currentView === 'list') {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[calc(100vh-140px)] flex flex-col">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Gestión de Pedidos</h2>
                        <p className="text-sm text-slate-500">Administra tus planes y órdenes de compra</p>
                    </div>
                    <button
                        onClick={handleCreateNewOrder}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium shadow-sm"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Pedido
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    {loadingOrders ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : purchaseOrders.length === 0 ? (
                        <div className="text-center py-16 text-slate-500">
                            <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                            <h3 className="text-lg font-medium text-slate-700 mb-1">No hay pedidos todavía</h3>
                            <p className="text-sm">Comienza creando tu primera hoja de planificación de compras.</p>
                            <button
                                onClick={handleCreateNewOrder}
                                className="mt-4 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                            >
                                Crear Pedido
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold text-slate-700 text-xs tracking-wider uppercase">ID</th>
                                        <th className="px-6 py-3 font-semibold text-slate-700 text-xs tracking-wider uppercase">Título / Referencia</th>
                                        <th className="px-6 py-3 font-semibold text-slate-700 text-xs tracking-wider uppercase">Estado</th>
                                        <th className="px-6 py-3 font-semibold text-slate-700 text-xs tracking-wider uppercase text-right">Monto Estimado</th>
                                        <th className="px-6 py-3 font-semibold text-slate-700 text-xs tracking-wider uppercase">Fecha</th>
                                        <th className="px-6 py-3 font-semibold text-slate-700 text-xs tracking-wider uppercase text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {purchaseOrders.map(order => (
                                        <tr
                                            key={order.order_id}
                                            onClick={() => handleLoadOrder(order.order_id)}
                                            className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4 font-mono text-slate-500">#{order.order_id}</td>
                                            <td className="px-6 py-4 font-medium text-slate-800">{order.title}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${order.status === 'recibido' ? 'bg-green-100 text-green-700' :
                                                    order.status === 'pedido' ? 'bg-brand-100 text-brand-700' :
                                                        'bg-orange-100 text-orange-700'
                                                    }`}>
                                                    {order.status === 'recibido' ? 'Recibido' : order.status === 'pedido' ? 'Solicitado' : 'Borrador'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-700">
                                                {formatCurrency(order.total_estimated)}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={(e) => handleDeleteOrder(e, order.order_id, order.title)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Eliminar este pedido"
                                                >
                                                    <Trash className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">
            {/* Left Pane: Low Stock Watchlist (Col-span-3) */}
            <div className="col-span-12 lg:col-span-3 flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-4 py-4 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-2 text-orange-600 mb-1">
                        <AlertCircle className="w-5 h-5" />
                        <h3 className="font-semibold">Atención de Stock</h3>
                    </div>
                    <p className="text-xs text-slate-500">Ítems que han alcanzado su límite mínimo.</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {/* Low Stock Filters Toolbar */}
                    <div className="bg-white sticky top-0 z-10 pb-2 space-y-2">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar en bajas de stock..."
                                value={lowStockSearch}
                                onChange={(e) => setLowStockSearch(e.target.value)}
                                className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-brand-500"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                        </div>
                        <select
                            value={lowStockCategory}
                            onChange={(e) => setLowStockCategory(e.target.value)}
                            className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-brand-500 bg-slate-50"
                        >
                            <option value="">Todas las categorías</option>
                            <option value="materiales">Materiales</option>
                            <option value="piezas">Piezas</option>
                            <option value="herramientas">Herramientas</option>
                            <option value="epp">EPP</option>
                        </select>
                    </div>

                    {loadingLowStock ? (
                        <div className="flex justify-center py-8">
                            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : filteredLowStockItems.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                            <p className="text-sm font-medium text-slate-700">Stock Saludable o Sin Resultados</p>
                            <p className="text-xs">{(lowStockItems.length === 0) ? 'No hay ítems por debajo del mínimo.' : 'No hay ítems que coincidan con los filtros.'}</p>
                        </div>
                    ) : (
                        filteredLowStockItems.map(item => (
                            <div key={`${item.category}-${item.rawId}`} className="p-3 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800 line-clamp-1" title={item.name}>{item.name}</p>
                                        <p className="text-xs text-slate-500 capitalize">{item.category} • {item.code}</p>
                                    </div>
                                </div>
                                <div className="flex items-end justify-between mt-1">
                                    <div className="text-xs">
                                        <span className="text-orange-600 font-bold">{item.currentStock}</span> / {item.minStock} {item.unit}
                                    </div>
                                    <button
                                        onClick={() => addItemToPlan(item, 'db')}
                                        className="p-1.5 bg-white text-brand-600 rounded shadow-sm hover:bg-brand-50 hover:text-brand-700 transition-colors border border-slate-200"
                                        title="Añadir a la planificación"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Pane: Planning Board (Col-span-9) */}
            <div className="col-span-12 lg:col-span-9 flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Header Toolbar */}
                <div className="px-6 py-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentView('list')}
                            className="mr-2 p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors border border-transparent hover:border-brand-200"
                            title="Volver a la lista"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="p-2 bg-brand-100 text-brand-600 rounded-lg">
                            <ShoppingCart className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-bold text-slate-800">{currentOrder ? currentOrder.title : 'Nueva Hoja de Pedido'}</h2>
                                {currentOrder && (
                                    <select
                                        value={currentOrder.status}
                                        onChange={async (e) => {
                                            const newStatus = e.target.value;
                                            try {
                                                await InventoryService.updatePurchaseOrderStatus(currentOrder.order_id, newStatus);
                                                setCurrentOrder({ ...currentOrder, status: newStatus });
                                                onNotification({ type: 'success', message: 'Estado del pedido actualizado.' });
                                            } catch (err) {
                                                onNotification({ type: 'error', message: 'Error actualizando estado.' });
                                            }
                                        }}
                                        className="text-xs px-2 py-1 bg-slate-100 border border-slate-200 rounded-md font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                    >
                                        <option value="borrador">Borrador</option>
                                        <option value="pedido">Solicitado</option>
                                        <option value="recibido">Recibido</option>
                                    </select>
                                )}
                            </div>
                            <p className="text-sm text-slate-500">Planeación de compras y presupuesto</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {currentOrder && (
                            <button
                                onClick={handleDeleteCurrentOrder}
                                className="mr-2 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                title="Eliminar este pedido permanentemente"
                            >
                                <Trash className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={exportToExcel}
                            disabled={planningList.length === 0}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Exportar a Excel (CSV)"
                        >
                            <FileSpreadsheet className="w-5 h-5" />
                        </button>
                        <button
                            onClick={exportToPDF}
                            disabled={planningList.length === 0}
                            className="mr-3 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Exportar a PDF"
                        >
                            <Download className="w-5 h-5" />
                        </button>

                        <button
                            onClick={addManualItem}
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                        >
                            <FileText className="w-4 h-4" />
                            Ítem Manual
                        </button>
                        {planningList.length > 0 && (
                            <button
                                onClick={clearPlan}
                                className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                            >
                                <Trash2 className="w-4 h-4" />
                                Limpiar
                            </button>
                        )}
                    </div>
                </div>

                {/* Finder Bar */}
                <div className="px-6 py-4 bg-white border-b border-slate-200">
                    <div className="flex gap-3">
                        <select
                            value={searchCategory}
                            onChange={(e) => setSearchCategory(e.target.value)}
                            className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-slate-50 text-sm font-semibold text-slate-700 tracking-wide uppercase min-w-[140px]"
                        >
                            <option value="materiales">Materiales</option>
                            <option value="piezas">Piezas</option>
                            <option value="herramientas">Herramientas</option>
                            <option value="epp">EPP</option>
                        </select>
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder={`Buscar en catálogo de ${searchCategory}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm bg-white"
                            />
                            <Search className="absolute left-4 top-3.5 w-4 h-4 text-brand-500" />
                            {isSearching && (
                                <div className="absolute right-4 top-3.5">
                                    <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Expanded Catalog view */}
                    <div className="mt-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                Ítems Disponibles ({searchResults.length})
                            </h4>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Click para agregar al lote
                            </span>
                        </div>

                        {searchResults.length > 0 ? (
                            <div className="max-h-60 overflow-y-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white sticky top-0 border-b border-slate-100 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Código</th>
                                            <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre del ítem</th>
                                            <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Stock Actual</th>
                                            <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-24">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {searchResults.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-5 py-3">
                                                    <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded md:text-xs text-[10px] font-mono font-bold border border-slate-200 uppercase">
                                                        {item.code || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 font-bold text-slate-800">
                                                    {item.name}
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <span className="font-bold text-slate-700 mr-1">{item.currentStock || 0}</span>
                                                    <span className="text-slate-400 text-xs font-semibold">{item.unit || 'u'}</span>
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    <button
                                                        onClick={() => addItemToPlan(item, 'db')}
                                                        className="p-1.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-lg hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-colors mx-auto block shadow-sm"
                                                        title="Añadir a la planificación"
                                                    >
                                                        <Plus className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-500">
                                {isSearching ? (
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-sm">Buscando catálogo...</p>
                                    </div>
                                ) : (
                                    <p className="text-sm">No se encontraron ítems en la categoría <strong>{searchCategory}</strong> para "{searchTerm}".</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Spreadsheet Table */}
                <div className="flex-1 overflow-auto bg-slate-50">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-700 w-10">#</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-700 w-1/4">Nombre del Elemento</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-700 w-1/6">Descripción</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-700">Proveedor y Variante (Catálogo)</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-700 w-24">Unidad</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-700 bg-[#E6F4EA] w-32 border-l border-r border-[#C3E6CB]">Cantidad a Pedir</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-700 min-w-[140px]">Valor Unitario</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-700 min-w-[140px]">Valor Total</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-700 w-1/6">Observaciones</th>
                                <th className="px-4 py-3 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {planningList.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-12 text-center text-slate-500">
                                        <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-sm font-medium">La hoja de pedido está vacía</p>
                                        <p className="text-xs mt-1">Añade ítems desde el buscador, o los sugerimos en el panel izquierdo.</p>
                                    </td>
                                </tr>
                            ) : (
                                planningList.map((item, index) => {
                                    const rowTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50 group transition-colors">
                                            <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                                            <td className="px-4 py-3">
                                                {item.isManual ? (
                                                    <input
                                                        type="text"
                                                        value={item.name}
                                                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                                        className="w-full text-sm font-medium text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none transition-colors"
                                                        placeholder="Nombre..."
                                                    />
                                                ) : (
                                                    <span className="text-sm font-medium text-slate-800">{item.name}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                    className="w-full text-xs text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none transition-colors"
                                                    placeholder="Breve desc..."
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                {!item.isManual && itemCatalogs[item.id] && itemCatalogs[item.id].length > 0 ? (
                                                    <select
                                                        value={item.catalog_id || ''}
                                                        onChange={(e) => updateItem(item.id, 'catalog_id', e.target.value)}
                                                        className="w-full text-xs text-slate-700 bg-white border border-slate-300 rounded px-2 py-1 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                                                    >
                                                        <option value="">Seleccione proveedor...</option>
                                                        {itemCatalogs[item.id].map(cat => (
                                                            <option key={cat.catalog_id} value={cat.catalog_id}>
                                                                {cat.supplier?.name} {cat.brand ? `- ${cat.brand}` : ''} {cat.model ? `(${cat.model})` : ''} - {formatCurrency(cat.price)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : item.supplier_notes ? (
                                                    <span className="text-xs font-semibold text-slate-600 block w-full truncate" title={item.supplier_notes}>
                                                        {item.supplier_notes}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">No disponible o manual</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="text"
                                                    value={item.unit}
                                                    onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                                    className="w-16 text-xs text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none transition-colors text-center"
                                                    placeholder="Unidad"
                                                />
                                            </td>
                                            <td className="px-4 py-2 bg-[#F4FAF6] border-l border-r border-[#E6F4EA]">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                                                    className="w-full text-sm font-bold text-center text-brand-700 bg-white border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="relative">
                                                    <span className="absolute left-1 top-1.5 text-xs text-slate-500">$</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={item.unitPrice}
                                                        onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                                                        className="w-full pl-4 pr-1 py-1 text-sm text-right text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none transition-colors"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-slate-800 text-right bg-slate-50">
                                                {formatCurrency(rowTotal)}
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="text"
                                                    value={item.notes}
                                                    onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                                                    className="w-full text-xs text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none transition-colors"
                                                    placeholder="Opcional..."
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => removeItemFromPlan(item.id)}
                                                    className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Totals */}
                <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center shadow-inner relative z-20">
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-slate-300">
                            Total Ítems: <span className="text-white font-bold ml-1">{planningList.length}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">Presupuesto Estimado</p>
                            <p className="text-2xl font-bold text-[#E6F4EA] font-mono tracking-tight drop-shadow-md">
                                {formatCurrency(calculateTotals)}
                            </p>
                        </div>
                        {/* Future Action Button */}
                        <button
                            onClick={handleSaveOrder}
                            disabled={saving || planningList.length === 0}
                            className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Guardar como borrador en la base de datos"
                        >
                            <Save className="w-5 h-5" />
                            {saving ? 'Guardando...' : 'Guardar Pedido'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
