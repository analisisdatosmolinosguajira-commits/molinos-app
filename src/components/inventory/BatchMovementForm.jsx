import React, { useState, useEffect } from 'react';
import { Search, Package, TrendingUp, TrendingDown, Edit3, Plus, X, ShoppingCart, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function BatchMovementForm({ onSubmit, inventory }) {
    // Movement header state
    const [movementType, setMovementType] = useState('IN');
    const [referenceType, setReferenceType] = useState('MANUAL');
    const [referenceId, setReferenceId] = useState('');
    const [globalNotes, setGlobalNotes] = useState('');

    // Item selection state
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('materiales');

    // Items list state
    const [itemsList, setItemsList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasErrors, setHasErrors] = useState(false);

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

    // Filters and populates the available items for Step 2
    useEffect(() => {
        const filteredByCategory = inventory.filter(item => item.category === selectedCategory);
        let results = filteredByCategory;

        if (searchTerm.trim().length > 0) {
            const lowerTerm = searchTerm.toLowerCase();
            results = filteredByCategory.filter(item =>
                item.name.toLowerCase().includes(lowerTerm) ||
                item.code.toLowerCase().includes(lowerTerm)
            );
        }

        // Exclude items already added to the list to avoid duplicate entries natively
        results = results.filter(item => !itemsList.some(i => i.rawId === item.rawId && i.category === item.category));

        setSearchResults(results);
    }, [searchTerm, selectedCategory, inventory, itemsList]);

    // Validation Effect - Runs every time itemsList or movementType changes
    useEffect(() => {
        let errorFound = false;
        itemsList.forEach(item => {
            if (item.quantity === '' || item.quantity <= 0) errorFound = true;
            if (movementType === 'OUT' && (parseFloat(item.quantity) || 0) > item.stock) errorFound = true;
        });
        setHasErrors(errorFound);
    }, [itemsList, movementType]);

    const handleAddItem = (item) => {
        setItemsList([...itemsList, {
            ...item,
            quantity: 1 // Default quantity
        }]);
    };

    const handleRemoveItem = (index) => {
        setItemsList(itemsList.filter((_, i) => i !== index));
    };

    const handleQuantityChange = (index, quantity) => {
        const updated = [...itemsList];
        // Keep string if empty to avoid forcing 'NaN' in inputs
        updated[index].quantity = quantity === '' ? '' : quantity;
        setItemsList(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (itemsList.length === 0) {
            alert('Agregue al menos un ítem a la lista');
            return;
        }

        if (hasErrors) {
            alert('Por favor corrija los errores en las cantidades antes de registrar.');
            return;
        }

        setLoading(true);
        try {
            // Build movements array
            const movements = itemsList.map(item => ({
                category: item.category,
                itemId: item.rawId,
                type: movementType,
                quantity: parseFloat(item.quantity) || 0,
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

    // Table Contextual Logic
    const getTableHeaders = () => {
        if (movementType === 'ADJUST') return "Nuevo Stock Físico";
        if (movementType === 'IN') return "Cantidad a Ingresar";
        return "Cantidad a Retirar";
    };

    const calculateFinalStock = (currentStock, quantity) => {
        const qty = parseFloat(quantity) || 0;
        if (movementType === 'IN') return currentStock + qty;
        if (movementType === 'OUT') return currentStock - qty;
        if (movementType === 'ADJUST') return qty;
        return currentStock;
    };

    const getFinalStockDisplay = (currentStock, quantity) => {
        const final = calculateFinalStock(currentStock, quantity);
        const diff = final - currentStock;

        let colorClass = 'text-slate-700';
        let bgClass = 'bg-slate-100/50';
        let indicator = null;

        if (movementType === 'IN' && diff > 0) {
            colorClass = 'text-green-700';
            bgClass = 'bg-green-100/50';
            indicator = <span className="text-green-600 text-[10px] ml-1.5 flex items-center justify-center font-bold">+{diff}</span>;
        } else if (movementType === 'OUT' && diff < 0) {
            colorClass = 'text-rose-700';
            bgClass = 'bg-rose-50';
            indicator = <span className="text-rose-500 text-[10px] ml-1.5 flex items-center justify-center font-bold">{diff}</span>;
        } else if (movementType === 'ADJUST') {
            colorClass = 'text-amber-700';
            bgClass = 'bg-amber-50';
            indicator = diff !== 0
                ? <span className="text-amber-500 text-[10px] ml-1.5 flex items-center justify-center font-bold">{diff > 0 ? `+${diff}` : diff}</span>
                : <span className="text-slate-400 text-[10px] ml-1.5">=</span>;
        }

        return (
            <div className={`flex items-center justify-center w-max mx-auto px-3 py-1.5 rounded-lg border border-transparent ${bgClass} ${diff !== 0 && movementType === 'OUT' ? 'border-rose-100' : ''}`}>
                <span className={`text-base font-bold ${colorClass}`}>{final}</span>
                {indicator}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-slide-up">
            <form onSubmit={handleSubmit}>
                {/* Header Title */}
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                        <ShoppingCart className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 tracking-tight">Registro de Movimientos Masivos</h3>
                        <p className="text-sm text-slate-500 font-medium">Procesa ingresos, salidas o calibraciones físicas en grupo</p>
                    </div>
                </div>

                <div className="p-0">
                    {/* STEP 1: Configuration */}
                    <div className="px-8 py-8 border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-bold shadow-sm">1</div>
                            <h4 className="text-lg font-bold text-slate-800">Configuración del Lote</h4>
                        </div>

                        <div className="space-y-8 pl-10">
                            {/* Cards for Movement Type */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-3">¿Qué acción deseas operar sobre el inventario?</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <label className={`relative flex cursor-pointer rounded-2xl border-2 p-4 transition-all hover:-translate-y-0.5 ${movementType === 'IN'
                                            ? 'border-green-500 bg-green-50/30 shadow-md ring-2 ring-green-500/20'
                                            : 'border-slate-200 bg-white hover:border-green-200 hover:shadow-sm'
                                        }`}>
                                        <input type="radio" name="movementType" value="IN" className="sr-only" onChange={() => setMovementType('IN')} checked={movementType === 'IN'} />
                                        <div className="flex w-full items-start justify-between">
                                            <div className="flex items-start gap-4">
                                                <div className={`p-2.5 rounded-xl ${movementType === 'IN' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                                    <TrendingUp className="w-6 h-6" />
                                                </div>
                                                <div className="pt-0.5">
                                                    <p className={`font-bold text-base ${movementType === 'IN' ? 'text-green-800' : 'text-slate-700'}`}>Ingreso</p>
                                                    <p className="text-xs text-slate-500 mt-1 leading-snug">Sumar nueva cantidad comprada o ingresada al stock.</p>
                                                </div>
                                            </div>
                                            {movementType === 'IN' && <CheckCircle2 className="w-5 h-5 text-green-500 absolute top-4 right-4" />}
                                        </div>
                                    </label>

                                    <label className={`relative flex cursor-pointer rounded-2xl border-2 p-4 transition-all hover:-translate-y-0.5 ${movementType === 'OUT'
                                            ? 'border-rose-500 bg-rose-50/30 shadow-md ring-2 ring-rose-500/20'
                                            : 'border-slate-200 bg-white hover:border-rose-200 hover:shadow-sm'
                                        }`}>
                                        <input type="radio" name="movementType" value="OUT" className="sr-only" onChange={() => setMovementType('OUT')} checked={movementType === 'OUT'} />
                                        <div className="flex w-full items-start justify-between">
                                            <div className="flex items-start gap-4">
                                                <div className={`p-2.5 rounded-xl ${movementType === 'OUT' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                                                    <TrendingDown className="w-6 h-6" />
                                                </div>
                                                <div className="pt-0.5">
                                                    <p className={`font-bold text-base ${movementType === 'OUT' ? 'text-rose-800' : 'text-slate-700'}`}>Salida</p>
                                                    <p className="text-xs text-slate-500 mt-1 leading-snug">Despachar o gastar recursos del inventario disponible.</p>
                                                </div>
                                            </div>
                                            {movementType === 'OUT' && <CheckCircle2 className="w-5 h-5 text-rose-500 absolute top-4 right-4" />}
                                        </div>
                                    </label>

                                    <label className={`relative flex cursor-pointer rounded-2xl border-2 p-4 transition-all hover:-translate-y-0.5 ${movementType === 'ADJUST'
                                            ? 'border-amber-500 bg-amber-50/30 shadow-md ring-2 ring-amber-500/20'
                                            : 'border-slate-200 bg-white hover:border-amber-200 hover:shadow-sm'
                                        }`}>
                                        <input type="radio" name="movementType" value="ADJUST" className="sr-only" onChange={() => setMovementType('ADJUST')} checked={movementType === 'ADJUST'} />
                                        <div className="flex w-full items-start justify-between">
                                            <div className="flex items-start gap-4">
                                                <div className={`p-2.5 rounded-xl ${movementType === 'ADJUST' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                                                    <Edit3 className="w-6 h-6" />
                                                </div>
                                                <div className="pt-0.5">
                                                    <p className={`font-bold text-base ${movementType === 'ADJUST' ? 'text-amber-800' : 'text-slate-700'}`}>Ajuste o Calibración</p>
                                                    <p className="text-xs text-slate-500 mt-1 leading-snug">Sobrescribir el stock del sistema por el valor de conteo físico.</p>
                                                </div>
                                            </div>
                                            {movementType === 'ADJUST' && <CheckCircle2 className="w-5 h-5 text-amber-500 absolute top-4 right-4" />}
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Reference & Notes Grouping */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/70 p-5 rounded-2xl border border-slate-100">
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Origen del Movimiento</label>
                                        <select
                                            value={referenceType}
                                            onChange={(e) => setReferenceType(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm transition-shadow shadow-sm hover:border-brand-300 pointer-events-auto"
                                        >
                                            {Object.entries(referenceLabels).map(([key, label]) => (
                                                <option key={key} value={key}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex justify-between">
                                            ID de Referencia Documental
                                            <span className="text-slate-400 font-normal text-xs">Opcional</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={referenceId}
                                            onChange={(e) => setReferenceId(e.target.value)}
                                            placeholder="Ej: Factura #1234, Vale #99"
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-shadow text-sm shadow-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Justificación General</label>
                                    <textarea
                                        value={globalNotes}
                                        onChange={(e) => setGlobalNotes(e.target.value)}
                                        className="w-full h-[calc(100%-24px)] min-h-[120px] px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-shadow text-sm resize-none shadow-sm"
                                        placeholder="Escribe aquí observaciones que apliquen a todo este lote de movimientos (ej: Recepción de material semanal, auditoría mensual rotativa...)"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STEP 2: Item Search & Selection Table */}
                    <div className="px-8 py-8 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-bold shadow-sm">2</div>
                            <h4 className="text-lg font-bold text-slate-800">Catálogo Expandido y Selección</h4>
                        </div>

                        <div className="pl-10">
                            {/* Search and Filter Inputs */}
                            <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-2 relative mb-4">
                                {/* Category Filter */}
                                <div className="md:w-64 shrink-0">
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => {
                                            setSelectedCategory(e.target.value);
                                            setSearchTerm('');
                                        }}
                                        className="w-full px-4 py-3 bg-slate-50 border border-transparent hover:border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 font-bold text-slate-700 outline-none cursor-pointer tracking-wide uppercase text-[13px]"
                                    >
                                        {Object.entries(categoryLabels).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Search Input */}
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder={`Buscar en catálogo de ${categoryLabels[selectedCategory].toLowerCase()}...`}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 border border-transparent rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-800 bg-transparent placeholder-slate-400 text-base font-medium"
                                    />
                                    <Search className="w-6 h-6 text-brand-500 absolute left-3 top-2.5" />
                                </div>
                            </div>

                            {/* Available Items Table */}
                            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white flex flex-col">
                                <div className="bg-slate-100/50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                                    <span className="font-bold text-slate-700 text-[13px] uppercase tracking-wider">Ítems Disponibles ({searchResults.length})</span>
                                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5"><Plus size={14} className="text-brand-500" /> CLICK PARA AGREGAR AL LOTE</span>
                                </div>

                                <div className="max-h-[300px] overflow-y-auto overflow-x-auto relative">
                                    {searchResults.length === 0 ? (
                                        <div className="p-10 text-center text-slate-500 flex flex-col items-center justify-center">
                                            <Search className="w-8 h-8 text-slate-300 mb-3" />
                                            {searchTerm
                                                ? <><span className="font-bold text-slate-600">Sin coincidencias</span><span className="text-sm">No se encontraron ítems para tu búsqueda.</span></>
                                                : <><span className="font-bold text-slate-600">Catálogo vacío</span><span className="text-sm">No hay más ítems disponibles o todos ya fueron agregados.</span></>}
                                        </div>
                                    ) : (
                                        <table className="w-full text-sm text-left relative">
                                            <thead className="sticky top-0 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-20">
                                                <tr className="border-b border-slate-100">
                                                    <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px] w-32">Código</th>
                                                    <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Nombre del Ítem</th>
                                                    <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px] w-32 text-center">Stock Actual</th>
                                                    <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-[10px] w-20 text-center">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {searchResults.map((item) => (
                                                    <tr key={`${item.category}-${item.rawId}`} className="hover:bg-brand-50/40 transition-colors group">
                                                        <td className="px-5 py-3">
                                                            <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg group-hover:bg-white group-hover:shadow-[0_0_0_1px_rgba(0,0,0,0.05)] transition-all">
                                                                {item.code}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3 font-bold text-slate-800 text-sm group-hover:text-brand-700 transition-colors">
                                                            {item.name}
                                                        </td>
                                                        <td className="px-5 py-3 text-center">
                                                            <div className="font-bold text-slate-600">
                                                                {item.stock} <span className="text-[11px] font-semibold text-slate-400 ml-0.5">{item.unit}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center border-l border-slate-100/50 relative">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAddItem(item)}
                                                                className="absolute inset-x-0 inset-y-0 w-full h-full opacity-0 cursor-pointer hidden md:block"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAddItem(item)}
                                                                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-brand-500 hover:text-white text-slate-500 flex items-center justify-center transition-all mx-auto shadow-[0_1px_2px_rgba(0,0,0,0.05)] group-hover:shadow-brand-500/30 group-hover:-translate-y-0.5 relative z-10"
                                                                title="Agregar al lote de movimiento"
                                                            >
                                                                <Plus className="w-5 h-5 pointer-events-none" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STEP 3: Review & Quantities */}
                    <div className="px-8 py-8 bg-white">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-bold shadow-sm">3</div>
                                <h4 className="text-lg font-bold text-slate-800">Cantidades y Validación</h4>
                            </div>
                            {itemsList.length > 0 && (
                                <span className="px-3.5 py-1.5 bg-brand-50 text-brand-700 rounded-full text-xs font-extrabold border border-brand-200 flex items-center gap-1.5">
                                    <Package size={14} />
                                    {itemsList.length} ÍTEM{itemsList.length !== 1 ? 'S' : ''}
                                </span>
                            )}
                        </div>

                        <div className="pl-10">
                            {itemsList.length === 0 ? (
                                <div className="py-14 px-6 border-2 border-dashed border-slate-200 rounded-2xl text-center flex flex-col items-center justify-center bg-slate-50/50">
                                    <Package className="w-14 h-14 text-slate-300 mb-4" />
                                    <h5 className="text-slate-600 font-bold text-lg">Aún no hay ítems seleccionados para afectar</h5>
                                    <p className="text-slate-500 text-sm mt-1 max-w-md leading-relaxed">
                                        Empieza usando el catálogo de arriba (Paso 2). Puedes agrupar múltiples materiales o piezas en esta misma operación localizándolos y apretando el botón (+).
                                    </p>
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm mt-0 relative">
                                            <thead className="bg-slate-100/80 border-b border-slate-200 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-6 py-4 text-left font-bold text-slate-600 uppercase tracking-wider text-[11px]">Ítem en Lote de Operación</th>
                                                    <th className="px-5 py-4 text-center font-bold text-slate-600 uppercase tracking-wider text-[11px] w-36 border-l border-slate-200">Stock Actual</th>
                                                    <th className="px-5 py-4 text-center font-extrabold text-brand-800 uppercase tracking-wider text-[11px] w-48 bg-brand-50/50 border-l border-brand-100">{getTableHeaders()}</th>
                                                    <th className="px-5 py-4 text-center font-bold text-slate-600 uppercase tracking-wider text-[11px] w-40 border-l border-slate-200">Proyección Final</th>
                                                    <th className="px-5 py-4 text-center font-bold text-slate-600 w-16 border-l border-slate-200"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {itemsList.map((item, index) => {
                                                    const qty = parseFloat(item.quantity) || 0;
                                                    const isOutboundExceeding = movementType === 'OUT' && qty > item.stock;
                                                    const isInvalidEmpty = item.quantity === '' || qty <= 0;

                                                    return (
                                                        <tr key={index} className={`transition-colors group ${isOutboundExceeding ? 'bg-rose-50/40' : 'hover:bg-slate-50'}`}>
                                                            {/* Item Description */}
                                                            <td className="px-6 py-4">
                                                                <div className="font-bold text-slate-800 text-base">{item.name}</div>
                                                                <div className="flex items-center gap-2.5 mt-1.5">
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded uppercase tracking-wider text-[10px] font-bold border ${categoryColors[item.category]}`}>
                                                                        {categoryLabels[item.category]}
                                                                    </span>
                                                                    <span className="font-mono text-[11px] font-semibold text-slate-400 bg-slate-100 px-1.5 rounded">{item.code}</span>
                                                                </div>
                                                            </td>

                                                            {/* Current Stock */}
                                                            <td className="px-5 py-4 text-center border-l border-slate-100 bg-slate-50/50">
                                                                <div className="font-bold text-slate-600 text-[15px]">
                                                                    {item.stock} <span className="text-xs font-semibold ml-0.5">{item.unit}</span>
                                                                </div>
                                                            </td>

                                                            {/* Action Input */}
                                                            <td className="px-5 py-4 bg-brand-50/20 border-l border-brand-50">
                                                                <div className="flex flex-col items-center justify-center">
                                                                    <div className="relative">
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0"
                                                                            value={item.quantity}
                                                                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                                            placeholder="0"
                                                                            className={`w-32 px-3 py-2.5 text-center font-extrabold text-lg border-2 rounded-xl outline-none transition-all ${isOutboundExceeding
                                                                                    ? 'border-rose-300 focus:ring-rose-500 bg-white text-rose-700 shadow-[0_0_0_4px_rgba(255,228,230,0.5)]'
                                                                                    : isInvalidEmpty
                                                                                        ? 'border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 bg-white text-slate-800'
                                                                                        : 'border-brand-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 bg-white text-brand-700 shadow-inner'
                                                                                }`}
                                                                        />
                                                                    </div>
                                                                    {isOutboundExceeding && (
                                                                        <div className="flex items-center justify-center gap-1.5 mt-2 bg-rose-100 text-rose-700 px-2 py-1 rounded-md">
                                                                            <AlertTriangle className="w-3.5 h-3.5" />
                                                                            <span className="text-[10px] font-bold uppercase tracking-wider">Supera el Stock</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            {/* Final Stock Projection */}
                                                            <td className="px-5 py-4 border-l border-slate-100">
                                                                {getFinalStockDisplay(item.stock, item.quantity)}
                                                            </td>

                                                            {/* Delete Action */}
                                                            <td className="px-5 py-4 text-center border-l border-slate-100">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveItem(index)}
                                                                    className="p-2.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 rounded-xl transition-colors group-hover:text-slate-600"
                                                                    title="Remover de la lista"
                                                                >
                                                                    <X className="w-5 h-5 mx-auto" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Toolbar */}
                <div className="border-t border-slate-200 bg-slate-900 px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex flex-col text-slate-100">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Resumen y Validación</span>
                        <div className="flex items-center gap-5 mt-1">
                            <span className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-brand-400" />
                                <strong className="text-white text-lg">{itemsList.length}</strong>
                                <span className="text-slate-300 font-medium">Ítems</span>
                            </span>
                            {hasErrors && (
                                <span className="flex items-center gap-1.5 text-rose-400 font-semibold bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                                    <AlertTriangle className="w-4 h-4" /> Resuelve los errores en la tabla
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || itemsList.length === 0 || hasErrors}
                        className={`min-w-[280px] py-4 px-8 rounded-xl font-bold transition-all flex items-center justify-center gap-3 text-sm tracking-wide ${hasErrors || itemsList.length === 0
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : movementType === 'IN'
                                    ? 'bg-green-500 text-white hover:bg-green-400 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:-translate-y-0.5'
                                    : movementType === 'OUT'
                                        ? 'bg-rose-500 text-white hover:bg-rose-400 hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:-translate-y-0.5'
                                        : 'bg-amber-500 text-slate-900 hover:bg-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:-translate-y-0.5'
                            }`}
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                <span>PROCESANDO...</span>
                            </>
                        ) : (
                            <>
                                <span>
                                    {movementType === 'IN' ? 'CONFIRMAR INGRESO AL INVENTARIO' : movementType === 'OUT' ? 'DESCONTAR SALIDA DEL INVENTARIO' : 'SOBRESCRIBIR AJUSTE FÍSICO'}
                                </span>
                                <ArrowRight className="w-5 h-5 opacity-80" />
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
