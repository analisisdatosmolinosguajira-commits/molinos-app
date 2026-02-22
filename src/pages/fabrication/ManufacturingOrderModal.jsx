import React, { useState, useEffect, useCallback } from 'react';
import {
    X, Save, Trash2, Plus, Package, Calendar, Users, FileText, AlertTriangle,
    Activity, Layers, FlaskConical, Loader2, Wrench, Image
} from 'lucide-react';
import { FabricationService } from '../../services/fabrication';
import { supabase } from '../../services/supabase';

const STATUS_OPTIONS = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'planificada', label: 'Planificada' },
    { value: 'en_proceso', label: 'En Proceso' },
    { value: 'terminada', label: 'Terminada (Automático)', disabled: true },
    { value: 'cancelada', label: 'Cancelada' }
];

// ============================================================================
// TAB 1: ORDER FORM (general info, no piece picker here)
// ============================================================================
const OrderTab = ({ formData, setFormData, crews, workOrders, errors }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-6">
        {/* Code */}
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Código</label>
            <input
                type="text"
                className={`w-full px-4 py-2.5 bg-slate-100 border rounded-xl text-sm outline-none font-mono text-slate-600 ${errors.code ? 'border-red-400' : 'border-slate-200'}`}
                value={formData.code}
                readOnly
                placeholder="Autogenerado"
            />
        </div>

        {/* Name */}
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre / Descripción</label>
            <input
                type="text"
                className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all ${errors.name ? 'border-red-400' : 'border-slate-200'}`}
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Producción Lote A"
            />
        </div>

        {/* Status */}
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Estado</label>
            <select
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
            >
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value} disabled={s.disabled}>{s.label}</option>)}
            </select>
        </div>

        {/* Qty Planned (general) */}
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cantidad Planificada (Global)</label>
            <input
                type="number" min="1"
                className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all ${errors.quantityPlanned ? 'border-red-400' : 'border-slate-200'}`}
                value={formData.quantityPlanned}
                onChange={e => setFormData({ ...formData, quantityPlanned: parseInt(e.target.value) || 0 })}
            />
        </div>

        {/* Start Date */}
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Fecha Inicio</label>
            <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                    type="date"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                />
            </div>
        </div>

        {/* End Date */}
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Fecha Fin</label>
            <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                    type="date"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                />
            </div>
        </div>

        {/* Crew */}
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cuadrilla</label>
            <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                    value={formData.crewId}
                    onChange={e => setFormData({ ...formData, crewId: e.target.value })}
                >
                    <option value="">Sin asignar...</option>
                    {crews.map(c => <option key={c.crew_id} value={c.crew_id}>{c.name}</option>)}
                </select>
            </div>
        </div>

        {/* Work Order */}
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Orden de Trabajo</label>
            <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                    value={formData.workOrderId}
                    onChange={e => setFormData({ ...formData, workOrderId: e.target.value })}
                >
                    <option value="">Ninguna...</option>
                    {workOrders.map(wo => <option key={wo.work_order_id} value={wo.work_order_id}>{wo.code} — {wo.description?.substring(0, 40)}</option>)}
                </select>
            </div>
        </div>

        {/* Notes */}
        <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notas</label>
            <textarea
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all min-h-[80px] resize-none"
                placeholder="Detalles técnicos, instrucciones..."
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
        </div>
    </div>
);

// ============================================================================
// TAB 2: PROCESSES (multi-piece + auto-fill recipe)
// ============================================================================
const ProcessesTab = ({ moId, pieces }) => {
    const [processes, setProcesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addPieceId, setAddPieceId] = useState('');
    const [addQty, setAddQty] = useState('1');
    const [expandedId, setExpandedId] = useState(null);
    const [recipeMap, setRecipeMap] = useState({});

    const loadProcesses = useCallback(async () => {
        if (!moId) return;
        setLoading(true);
        try {
            const data = await FabricationService.getProcessesForOrder(moId);
            setProcesses(data);
            // Load recipes for all pieces in processes
            for (const proc of data) {
                if (!recipeMap[proc.piece_id]) {
                    const recipe = await FabricationService.getRecipeForPiece(proc.piece_id);
                    setRecipeMap(prev => ({ ...prev, [proc.piece_id]: recipe }));
                }
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [moId]);

    useEffect(() => { loadProcesses(); }, [loadProcesses]);

    const handleAdd = async () => {
        if (!addPieceId || !addQty) return;
        try {
            const proc = await FabricationService.addProcess(moId, parseInt(addPieceId), parseInt(addQty));
            setAddPieceId('');
            setAddQty('1');
            // Immediately load recipe
            const recipe = await FabricationService.getRecipeForPiece(proc.piece_id);
            setRecipeMap(prev => ({ ...prev, [proc.piece_id]: recipe }));
            loadProcesses();
        } catch (err) { alert('Error: ' + err.message); }
    };

    const handleUpdateQty = async (id, field, value) => {
        try {
            await FabricationService.updateProcess(id, { [field]: parseInt(value) || 0 });
            loadProcesses();
        } catch (err) { alert('Error: ' + err.message); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este proceso?')) return;
        try {
            await FabricationService.deleteProcess(id);
            loadProcesses();
        } catch (err) { alert('Error: ' + err.message); }
    };

    const usedPieceIds = processes.map(p => p.piece_id);
    const availablePieces = pieces.filter(p => !usedPieceIds.includes(p.piece_id));

    if (!moId) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 px-6">
                <Wrench size={48} className="opacity-20 mb-3" />
                <p className="text-sm font-medium">Guarde la orden primero para agregar procesos.</p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <Wrench size={18} className="text-violet-500" />
                    Procesos de Fabricación
                </h4>
                <span className="text-xs text-slate-400">{processes.length} proceso(s)</span>
            </div>

            {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-300" size={24} /></div>
            ) : (
                <div className="space-y-3 mb-5">
                    {processes.map(proc => {
                        const recipe = recipeMap[proc.piece_id] || [];
                        const isExpanded = expandedId === proc.id;
                        const pct = proc.quantity_planned > 0 ? Math.round((proc.quantity_completed / proc.quantity_planned) * 100) : 0;

                        return (
                            <div key={proc.id} className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden group hover:border-violet-200 transition-all">
                                {/* Process Row */}
                                <div className="flex items-center gap-3 p-4">
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : proc.id)}
                                        className="p-1 text-slate-400 hover:text-violet-600 transition-colors"
                                    >
                                        <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800">{proc.piece?.name}</p>
                                        <p className="text-xs text-slate-400 font-mono">{proc.piece?.code}</p>
                                    </div>

                                    {/* Qty inputs */}
                                    <div className="flex items-center gap-2 text-xs">
                                        <div className="text-center">
                                            <p className="text-slate-400 mb-0.5">Plan.</p>
                                            <input
                                                type="number" min="1"
                                                className="w-14 px-1.5 py-1 text-center text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-violet-400"
                                                value={proc.quantity_planned}
                                                onChange={e => handleUpdateQty(proc.id, 'quantityPlanned', e.target.value)}
                                            />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-slate-400 mb-0.5">Comp.</p>
                                            <input
                                                type="number" min="0"
                                                className="w-14 px-1.5 py-1 text-center text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-emerald-400"
                                                value={proc.quantity_completed}
                                                onChange={e => handleUpdateQty(proc.id, 'quantityCompleted', e.target.value)}
                                            />
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${pct >= 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                            {pct}%
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => handleDelete(proc.id)}
                                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                {/* Expanded: recipe + drawing */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 p-4 bg-white flex gap-4">
                                        <div className="flex-1">
                                            <h5 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                                <Layers size={12} /> Receta ({recipe.length} materiales)
                                            </h5>
                                            {recipe.length > 0 ? (
                                                <div className="space-y-1">
                                                    {recipe.map(r => (
                                                        <div key={r.id} className="flex items-center justify-between text-sm py-1.5 px-3 bg-slate-50 rounded-lg">
                                                            <span className="text-slate-700">
                                                                <span className="font-mono text-slate-400 mr-1">{r.material?.code}</span>
                                                                {r.material?.name}
                                                            </span>
                                                            <span className="font-bold text-indigo-600">
                                                                {parseFloat(r.quantity_required)} {r.material?.unit || 'und'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic py-2">Sin receta definida. Configúrela en la pestaña "Recetas".</p>
                                            )}
                                        </div>

                                        {/* Drawing thumbnail */}
                                        <div className="w-32 shrink-0">
                                            <h5 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                                <Image size={12} /> Plano
                                            </h5>
                                            <div className="aspect-square rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                                                {proc.piece?.image_url ? (
                                                    <img src={proc.piece.image_url} alt={proc.piece.name} className="w-full h-full object-contain p-1" />
                                                ) : (
                                                    <Image size={20} className="text-slate-200" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {processes.length === 0 && (
                        <p className="text-center text-slate-400 text-sm py-6 italic">Sin procesos. Agregue piezas a fabricar abajo.</p>
                    )}
                </div>
            )}

            {/* Add Process Row */}
            <div className="flex items-center gap-2 p-3 bg-violet-50/50 rounded-xl border border-dashed border-violet-200">
                <Package size={16} className="text-violet-400 shrink-0" />
                <select
                    className="flex-1 px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white outline-none"
                    value={addPieceId}
                    onChange={e => setAddPieceId(e.target.value)}
                >
                    <option value="">Seleccionar pieza...</option>
                    {availablePieces.map(p => <option key={p.piece_id} value={p.piece_id}>{p.code} — {p.name}</option>)}
                </select>
                <input
                    type="number" min="1" placeholder="Cant."
                    className="w-20 px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white outline-none"
                    value={addQty}
                    onChange={e => setAddQty(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
                <button
                    onClick={handleAdd}
                    disabled={!addPieceId}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold flex items-center gap-2"
                >
                    <Plus size={16} /> Agregar Pieza
                </button>
            </div>
        </div>
    );
};

// ============================================================================
// TAB 3: CONSUMPTIONS (unchanged concept)
// ============================================================================
const ConsumptionTab = ({ moId }) => {
    const [consumptions, setConsumptions] = useState([]);
    const [allRecipe, setAllRecipe] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newRow, setNewRow] = useState({ materialId: '', quantity: '', date: new Date().toISOString().split('T')[0] });

    const loadData = useCallback(async () => {
        if (!moId) return;
        setLoading(true);
        try {
            const [consData, { data: matData }, { data: stockData }] = await Promise.all([
                FabricationService.getMaterialConsumptions(moId),
                supabase.from('material').select('material_id, code, name, unit').order('name'),
                supabase.from('material_stock').select('material_id, quantity_available')
            ]);
            setConsumptions(consData);

            const stockMap = {};
            (stockData || []).forEach(s => { stockMap[s.material_id] = parseFloat(s.quantity_available) || 0; });

            const enrichedMaterials = (matData || []).map(m => ({
                ...m,
                stock: stockMap[m.material_id] || 0
            }));

            setMaterials(enrichedMaterials);

            // Aggregate recipe from all processes
            const processes = await FabricationService.getProcessesForOrder(moId);
            const recipeAgg = {};
            for (const proc of processes) {
                const recipe = await FabricationService.getRecipeForPiece(proc.piece_id);
                recipe.forEach(r => {
                    const key = r.material_id;
                    if (!recipeAgg[key]) {
                        recipeAgg[key] = { ...r, totalRequired: parseFloat(r.quantity_required) * proc.quantity_planned };
                    } else {
                        recipeAgg[key].totalRequired += parseFloat(r.quantity_required) * proc.quantity_planned;
                    }
                });
            }
            setAllRecipe(Object.values(recipeAgg));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [moId]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleAdd = async () => {
        if (!newRow.materialId || !newRow.quantity) return;
        try {
            await FabricationService.addMaterialConsumption(moId, parseInt(newRow.materialId), parseFloat(newRow.quantity), newRow.date);
            setNewRow({ materialId: '', quantity: '', date: new Date().toISOString().split('T')[0] });
            loadData();
        } catch (err) { alert('Error: ' + err.message); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este consumo?')) return;
        try {
            await FabricationService.deleteMaterialConsumption(id);
            loadData();
        } catch (err) { alert('Error: ' + err.message); }
    };

    if (!moId) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 px-6">
                <FlaskConical size={48} className="opacity-20 mb-3" />
                <p className="text-sm font-medium">Guarde la orden primero para registrar consumos.</p>
            </div>
        );
    }

    // Comparison table
    const comparisonData = allRecipe.map(r => {
        const consumed = consumptions
            .filter(c => c.material_id === r.material_id)
            .reduce((sum, c) => sum + parseFloat(c.quantity_used), 0);
        return {
            materialId: r.material_id,
            materialName: r.material?.name || 'N/A',
            materialCode: r.material?.code || '',
            unit: r.material?.unit || 'und',
            planned: r.totalRequired,
            consumed,
            diff: r.totalRequired - consumed
        };
    });

    return (
        <div className="p-6 space-y-6">
            {/* Comparison Table */}
            {comparisonData.length > 0 && (
                <div>
                    <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                        <Layers size={18} className="text-purple-500" />
                        Receta Total vs. Consumo Real
                    </h4>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-left text-xs font-bold text-slate-500 uppercase">
                                    <th className="px-4 py-2.5">Material</th>
                                    <th className="px-4 py-2.5 text-right">Receta Total</th>
                                    <th className="px-4 py-2.5 text-right">Consumido</th>
                                    <th className="px-4 py-2.5 text-right">Diferencia</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonData.map(row => (
                                    <tr key={row.materialId} className="border-t border-slate-100">
                                        <td className="px-4 py-2.5">
                                            <span className="font-medium text-slate-700">{row.materialCode}</span>
                                            <span className="text-slate-400 ml-1">— {row.materialName}</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-mono text-slate-600">{row.planned.toFixed(1)} {row.unit}</td>
                                        <td className="px-4 py-2.5 text-right font-mono text-slate-600">{row.consumed.toFixed(1)} {row.unit}</td>
                                        <td className={`px-4 py-2.5 text-right font-mono font-bold ${row.diff > 0 ? 'text-blue-600' : row.diff < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {row.diff > 0 ? `−${row.diff.toFixed(1)}` : row.diff < 0 ? `+${Math.abs(row.diff).toFixed(1)}` : '✓'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Consumption Log */}
            <div>
                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <FlaskConical size={18} className="text-orange-500" />
                    Registro de Consumos
                </h4>

                {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-300" size={24} /></div>
                ) : (
                    <div className="space-y-2 mb-4">
                        {consumptions.map(item => (
                            <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-orange-200 transition-all">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-700">{item.material?.code} — {item.material?.name}</p>
                                    <p className="text-xs text-slate-400">{new Date(item.date).toLocaleDateString()}</p>
                                </div>
                                <span className="text-sm font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg">{parseFloat(item.quantity_used)}</span>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        {consumptions.length === 0 && (
                            <p className="text-center text-slate-400 text-sm py-4 italic">Sin consumos registrados.</p>
                        )}
                    </div>
                )}

                {/* Add Consumption */}
                <div className="flex items-center gap-2 p-2.5 bg-orange-50/50 rounded-xl border border-dashed border-orange-200">
                    <select
                        className="flex-1 px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white outline-none"
                        value={newRow.materialId}
                        onChange={e => setNewRow({ ...newRow, materialId: e.target.value })}
                    >
                        <option value="">Material...</option>
                        {materials.map(m => (
                            <option key={m.material_id} value={m.material_id} disabled={m.stock <= 0}>
                                {m.code} — {m.name} ({m.stock} {m.unit} disp.)
                            </option>
                        ))}
                    </select>
                    <input type="number" min="0.01" step="0.01" placeholder="Cant."
                        className="w-20 px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white outline-none"
                        value={newRow.quantity}
                        onChange={e => setNewRow({ ...newRow, quantity: e.target.value })}
                    />
                    <input type="date"
                        className="w-36 px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white outline-none"
                        value={newRow.date}
                        onChange={e => setNewRow({ ...newRow, date: e.target.value })}
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!newRow.materialId || !newRow.quantity}
                        className="p-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// MAIN MODAL
// ============================================================================
export default function ManufacturingOrderModal({ isOpen, onClose, orderId = null, onSuccess }) {
    const isEditing = !!orderId;
    const [activeTab, setActiveTab] = useState('ORDER');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [errors, setErrors] = useState({});

    const [pieces, setPieces] = useState([]);
    const [crews, setCrews] = useState([]);
    const [workOrders, setWorkOrders] = useState([]);

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        quantityPlanned: 1,
        quantityCompleted: 0,
        status: 'pendiente',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        crewId: '',
        workOrderId: '',
        notes: '',
    });

    useEffect(() => {
        if (!isOpen) return;
        setActiveTab('ORDER');
        setError(null);
        setErrors({});
        loadOptions();
        if (orderId) {
            loadOrder();
        } else {
            setFormData({
                code: `MO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
                name: '',
                quantityPlanned: 1,
                quantityCompleted: 0,
                status: 'pendiente',
                startDate: new Date().toISOString().split('T')[0],
                endDate: '',
                crewId: '',
                workOrderId: '',
                notes: '',
            });
        }
    }, [isOpen, orderId]);

    const loadOptions = async () => {
        try {
            const [{ data: pieceData }, { data: crewData }, { data: woData }] = await Promise.all([
                supabase.from('piece').select('piece_id, code, name, image_url, drawing_code').order('code'),
                supabase.from('crew').select('crew_id, name').eq('active', true).order('name'),
                supabase.from('work_order').select('work_order_id, code, description').order('code', { ascending: false })
            ]);
            setPieces(pieceData || []);
            setCrews(crewData || []);
            setWorkOrders(woData || []);
        } catch (err) { console.error(err); }
    };

    const loadOrder = async () => {
        setLoading(true);
        try {
            const order = await FabricationService.getManufacturingOrderById(orderId);
            setFormData({
                code: order.code || '',
                name: order.name || '',
                quantityPlanned: order.quantity_planned,
                quantityCompleted: order.quantity_completed,
                status: order.status,
                startDate: order.start_date ? String(order.start_date).split('T')[0] : '',
                endDate: order.end_date ? String(order.end_date).split('T')[0] : '',
                crewId: order.crew_id || '',
                workOrderId: order.work_order_id || '',
                notes: order.notes || '',
            });
        } catch (err) { setError('Error cargando la orden'); }
        finally { setLoading(false); }
    };

    const validate = () => {
        const e = {};
        if (!formData.name?.trim()) e.name = 'Requerido';
        if (!formData.quantityPlanned || formData.quantityPlanned <= 0) e.quantityPlanned = 'Cantidad inválida';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        setError(null);
        try {
            if (isEditing) {
                await FabricationService.updateManufacturingOrder(orderId, formData);
            } else {
                const created = await FabricationService.createManufacturingOrder(formData);
                // After create, re-open modal for the new order to add processes
                onSuccess?.();
                onClose();
                return;
            }
            onSuccess?.();
            onClose();
        } catch (err) { setError(err.message || 'Error al guardar'); }
        finally { setSaving(false); }
    };

    const handleComplete = async () => {
        if (!window.confirm('¿Marcar esta orden como COMPLETA? Esta acción calculará y cargará automáticamente todo el stock de las piezas producidas en el inventario. Es irreversible.')) return;
        setSaving(true);
        setError(null);
        try {
            await FabricationService.completeManufacturingOrder(orderId);
            onSuccess?.();
            onClose();
        } catch (err) { setError(err.message || 'Error al completar la orden'); setSaving(false); }
    };

    const handleDelete = async () => {
        if (!window.confirm('¿Eliminar esta orden? Se eliminarán todos los procesos asociados.')) return;
        try {
            await FabricationService.deleteManufacturingOrder(orderId);
            onSuccess?.();
            onClose();
        } catch (err) { setError(err.message || 'Error al eliminar'); }
    };

    if (!isOpen) return null;

    const TABS = [
        { id: 'ORDER', label: 'Orden', icon: Activity },
        { id: 'PROCESSES', label: 'Procesos', icon: Wrench, disabled: !isEditing },
        { id: 'CONSUMPTION', label: 'Consumos', icon: FlaskConical, disabled: !isEditing }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 px-6 py-5 text-white shrink-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Activity size={22} />
                            {isEditing ? `Orden de Fabricación #${orderId}` : 'Nueva Orden de Fabricación'}
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex gap-1 mt-4">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                disabled={tab.disabled}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-t-xl text-sm font-medium flex items-center gap-1.5 transition-all ${activeTab === tab.id
                                    ? 'bg-white text-slate-900'
                                    : tab.disabled
                                        ? 'text-white/30 cursor-not-allowed'
                                        : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <tab.icon size={15} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 px-6 py-3 flex items-center gap-2 text-sm font-medium shrink-0 border-b border-red-100">
                        <AlertTriangle size={16} />{error}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-slate-300" size={32} /></div>
                    ) : (
                        <>
                            {activeTab === 'ORDER' && <OrderTab formData={formData} setFormData={setFormData} crews={crews} workOrders={workOrders} errors={errors} />}
                            {activeTab === 'PROCESSES' && <ProcessesTab moId={orderId} pieces={pieces} />}
                            {activeTab === 'CONSUMPTION' && <ConsumptionTab moId={orderId} />}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                    <div className="flex gap-2">
                        {isEditing && (
                            <button onClick={handleDelete} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors">
                                <Trash2 size={15} /> Eliminar
                            </button>
                        )}
                        {isEditing && formData?.status !== 'terminada' && (
                            <button onClick={handleComplete} disabled={saving} className="px-4 py-2 text-emerald-600 hover:bg-emerald-50 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors">
                                <Package size={15} /> Completar Orden
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                            {activeTab === 'ORDER' ? 'Cancelar' : 'Cerrar'}
                        </button>
                        {activeTab === 'ORDER' ? (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                            >
                                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                {isEditing ? 'Guardar Cambios' : 'Crear Orden'}
                            </button>
                        ) : (
                            <div className="px-5 py-2.5 text-slate-400 text-sm italic flex items-center">
                                Los cambios en esta pestaña se guardan automáticamente
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
