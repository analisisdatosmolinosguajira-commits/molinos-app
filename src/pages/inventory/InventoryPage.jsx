import React, { useState, useEffect } from 'react';
import { Package, Wrench, Shield, Box, Search, AlertTriangle } from 'lucide-react';
import { InventoryService } from '../../services/inventory';

export default function InventoryPage() {
    const [activeCategory, setActiveCategory] = useState('materiales');
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
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
        loadInventory();
    }, []);

    const categories = [
        { id: 'materiales', label: 'Materiales', icon: Box },
        { id: 'piezas', label: 'Piezas', icon: Package },
        { id: 'herramientas', label: 'Herramientas', icon: Wrench },
        { id: 'epp', label: 'EPP', icon: Shield },
    ];

    // Map DB categories (which might be English or slightly different) to UI tabs
    // Assuming DB has 'material', 'part', 'tool', 'ppe' or similar
    // For now, simple matching or default to 'piezas'
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
                </div>

                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4">Código / Ítem</th>
                            <th className="px-6 py-4">Stock Actual</th>
                            <th className="px-6 py-4">Stock Mínimo</th>
                            <th className="px-6 py-4">Estado</th>
                            <th className="px-6 py-4 text-right">Movimientos</th>
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
                                <td className="px-6 py-4 text-right">
                                    <button className="text-brand-600 font-medium hover:underline text-xs">Ver Kardex</button>
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
            </div>
        </div>
    );
}
