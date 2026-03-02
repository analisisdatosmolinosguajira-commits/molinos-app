import React, { useState, useEffect, useMemo } from 'react';
import {
    X, Save, Trash2, Plus, Package, Calendar, Users, AlertTriangle,
    Layers, FlaskConical, Loader2, Wrench, Droplets, Hammer
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
// TAB 1: PUMP ORDER FORM
// ============================================================================
const PumpOrderTab = ({ formData, setFormData, crews, pumps, pumpModels, errors, isEditing }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-6">
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Código</label>
            <input type="text" className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono text-slate-600" value={formData.code} readOnly placeholder="Autogenerado" />
        </div>
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre / Descripción</label>
            <input type="text" className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all ${errors.name ? 'border-red-400' : 'border-slate-200'}`}
                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Reparación Bomba BOM-003" />
        </div>
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Orden</label>
            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={formData.moType} onChange={e => setFormData({ ...formData, moType: e.target.value, pumpId: '', pumpModelId: '' })} disabled={isEditing}>
                <option value="pump_fabrication">🔨 Fabricación de Bomba Nueva</option>
                <option value="pump_repair">🔧 Reparación de Bomba Existente</option>
            </select>
        </div>
        {formData.moType === 'pump_fabrication' && (
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Modelo de Bomba</label>
                <select className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500/20 ${errors.pumpModelId ? 'border-red-400' : 'border-slate-200'}`}
                    value={formData.pumpModelId} onChange={e => setFormData({ ...formData, pumpModelId: e.target.value })}>
                    <option value="">Seleccionar modelo...</option>
                    {pumpModels.map(m => <option key={m.pump_model_id} value={m.pump_model_id}>{m.code} — {m.name}</option>)}
                </select>
                {errors.pumpModelId && <p className="text-xs text-red-500 mt-1">{errors.pumpModelId}</p>}
            </div>
        )}
        {formData.moType === 'pump_repair' && (
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Bomba a Reparar</label>
                <select className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500/20 ${errors.pumpId ? 'border-red-400' : 'border-slate-200'}`}
                    value={formData.pumpId} onChange={e => setFormData({ ...formData, pumpId: e.target.value })} disabled={isEditing}>
                    <option value="">Seleccionar bomba...</option>
                    {pumps.map(p => <option key={p.pump_id} value={p.pump_id}>{p.serial_number || `PUMP-${p.pump_id}`} — {p.model || 'Sin modelo'} ({p.status})</option>)}
                </select>
                {errors.pumpId && <p className="text-xs text-red-500 mt-1">{errors.pumpId}</p>}
            </div>
        )}
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Estado</label>
            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value} disabled={s.disabled}>{s.label}</option>)}
            </select>
        </div>
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cantidad</label>
            <input type="number" min="1" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={formData.quantityPlanned} onChange={e => setFormData({ ...formData, quantityPlanned: parseInt(e.target.value) || 1 })} />
        </div>
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Fecha Inicio</label>
            <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="date" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
            </div>
        </div>
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Fecha Fin</label>
            <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="date" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
            </div>
        </div>
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cuadrilla</label>
            <div className="relative"><Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={formData.crewId} onChange={e => setFormData({ ...formData, crewId: e.target.value })}>
                    <option value="">Sin asignar...</option>
                    {crews.map(c => <option key={c.crew_id} value={c.crew_id}>{c.name}</option>)}
                </select>
            </div>
        </div>
        <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notas</label>
            <textarea className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[80px] resize-none" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
        </div>
    </div>
);

// ============================================================================
// PROGRESS BAR for planned vs actual
// ============================================================================
const ConsumptionProgress = ({ planned, actual }) => {
    const pct = planned > 0 ? Math.min(Math.round((actual / planned) * 100), 999) : (actual > 0 ? 100 : 0);
    const isOver = actual > planned;
    return (
        <div className="flex-1 min-w-0">
            <div className="flex justify-between text-xs mb-0.5">
                <span className={`font-mono font-bold ${isOver ? 'text-red-600' : pct >= 100 ? 'text-emerald-600' : 'text-slate-600'}`}>
                    {actual} / {planned}
                </span>
                <span className={`text-xs ${isOver ? 'text-red-500' : 'text-slate-400'}`}>{pct}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : pct >= 100 ? 'bg-emerald-500' : 'bg-accent-500'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
        </div>
    );
};

// ============================================================================
// TAB 2: UNIFIED CONSUMPTION (Materials + Pieces with BOM comparison)
// ============================================================================
const UnifiedConsumptionTab = ({ moId, pumpModelId }) => {
    const [matConsumptions, setMatConsumptions] = useState([]);
    const [pieceConsumptions, setPieceConsumptions] = useState([]);
    const [bomMaterials, setBomMaterials] = useState([]);
    const [bomPieces, setBomPieces] = useState([]);
    const [allMaterials, setAllMaterials] = useState([]);
    const [allPieces, setAllPieces] = useState([]);
    const [matStockMap, setMatStockMap] = useState({});
    const [pieceStockMap, setPieceStockMap] = useState({});
    const [loading, setLoading] = useState(true);

    const [addMatId, setAddMatId] = useState('');
    const [addMatQty, setAddMatQty] = useState(1);
    const [addPieceId, setAddPieceId] = useState('');
    const [addPieceQty, setAddPieceQty] = useState(1);

    useEffect(() => { if (moId) loadAll(); }, [moId, pumpModelId]);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [mConsumptions, pConsumptions, { data: mats }, { data: pcs }, { data: matStockRows }, { data: pieceStockRows }] = await Promise.all([
                FabricationService.getMaterialConsumptions(moId),
                FabricationService.getPumpPieceConsumptions(moId),
                supabase.from('material').select('material_id, code, name, unit').order('name'),
                supabase.from('piece').select('piece_id, code, name, unit').order('code'),
                supabase.rpc('get_material_stock_summary'),
                supabase.rpc('get_piece_stock_summary')
            ]);
            setMatConsumptions(mConsumptions || []);
            setPieceConsumptions(pConsumptions || []);
            setAllMaterials(mats || []);
            setAllPieces(pcs || []);

            // Build stock maps
            const msMap = {};
            (matStockRows || []).forEach(r => { msMap[r.material_id] = parseFloat(r.stock); });
            setMatStockMap(msMap);
            const psMap = {};
            (pieceStockRows || []).forEach(r => { psMap[r.piece_id] = parseInt(r.stock); });
            setPieceStockMap(psMap);

            // Load BOM if pump model exists
            if (pumpModelId) {
                try {
                    const model = await FabricationService.getPumpModelById(parseInt(pumpModelId));
                    setBomMaterials(model?.materials || []);
                    setBomPieces(model?.pieces || []);
                } catch (e) { console.error('Error loading BOM:', e); }
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    // Aggregate actual consumption by item ID
    const matActualMap = useMemo(() => {
        const map = {};
        matConsumptions.forEach(c => {
            const mid = c.material_id || c.material?.material_id;
            if (mid) map[mid] = (map[mid] || 0) + parseFloat(c.quantity_used);
        });
        return map;
    }, [matConsumptions]);

    const pieceActualMap = useMemo(() => {
        const map = {};
        pieceConsumptions.forEach(c => {
            const pid = c.piece_id || c.piece?.piece_id;
            if (pid) map[pid] = (map[pid] || 0) + parseInt(c.quantity_used);
        });
        return map;
    }, [pieceConsumptions]);

    // Add handlers
    const handleAddMat = async () => {
        if (!addMatId) return;
        try { await FabricationService.addMaterialConsumption(moId, parseInt(addMatId), parseFloat(addMatQty)); setAddMatId(''); setAddMatQty(1); loadAll(); }
        catch (e) { alert('Error: ' + e.message); }
    };
    const handleDeleteMat = async (id) => {
        if (!window.confirm('¿Eliminar? Se revertirá el stock.')) return;
        try { await FabricationService.deleteMaterialConsumption(id); loadAll(); } catch (e) { alert('Error: ' + e.message); }
    };
    const handleAddPiece = async () => {
        if (!addPieceId) return;
        try { await FabricationService.addPumpPieceConsumption(moId, parseInt(addPieceId), parseInt(addPieceQty)); setAddPieceId(''); setAddPieceQty(1); loadAll(); }
        catch (e) { alert('Error: ' + e.message); }
    };
    const handleDeletePiece = async (id) => {
        if (!window.confirm('¿Eliminar? Se devolverá al stock.')) return;
        try { await FabricationService.deletePumpPieceConsumption(id); loadAll(); } catch (e) { alert('Error: ' + e.message); }
    };

    if (!moId) return <div className="p-6 text-center text-slate-400">Guarda la orden primero para registrar consumos.</div>;
    if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-300" size={28} /></div>;

    return (
        <div className="p-6 space-y-6">
            {/* ───── MATERIALS SECTION ───── */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <FlaskConical size={16} className="text-accent-600" />
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Consumo de Materiales</h3>
                    {bomMaterials.length > 0 && <span className="text-xs text-slate-400 ml-auto">{bomMaterials.length} planificados (BOM)</span>}
                </div>

                {/* BOM planned materials with progress */}
                {bomMaterials.length > 0 && (
                    <div className="space-y-2 mb-4">
                        {bomMaterials.map(bm => {
                            const mid = bm.material_id;
                            const planned = parseFloat(bm.quantity_required);
                            const actual = matActualMap[mid] || 0;
                            return (
                                <div key={bm.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">
                                    <div className="min-w-0 flex-shrink-0" style={{ width: '40%' }}>
                                        <span className="font-medium text-sm text-slate-800 truncate block">{bm.material?.name}</span>
                                        <span className="text-xs text-slate-400">{bm.material?.code} · {bm.material?.unit}</span>
                                    </div>
                                    <ConsumptionProgress planned={planned} actual={actual} />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Add material */}
                <div className="flex items-center gap-2">
                    <select className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={addMatId} onChange={e => setAddMatId(e.target.value)}>
                        <option value="">+ Agregar material...</option>
                        {allMaterials.map(m => {
                            const stock = matStockMap[m.material_id] ?? 0;
                            return <option key={m.material_id} value={m.material_id}>{m.code || ''} — {m.name} ({m.unit}) [Stock: {stock}]</option>;
                        })}
                    </select>
                    <input type="number" min="0.01" step="0.01" className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={addMatQty} onChange={e => setAddMatQty(e.target.value)} />
                    <button onClick={handleAddMat} disabled={!addMatId} className="px-3 py-2 bg-accent-600 text-white rounded-xl text-sm font-bold hover:bg-accent-500 disabled:opacity-40 flex items-center gap-1"><Plus size={14} /></button>
                </div>

                {/* Actual consumption log */}
                {matConsumptions.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                        <p className="text-xs text-slate-400 font-medium">Registros:</p>
                        {matConsumptions.map(c => (
                            <div key={c.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100 text-sm">
                                <span className="text-slate-700">{c.material?.name} <span className="text-slate-400">({c.material?.code})</span></span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-slate-600 text-xs">{parseFloat(c.quantity_used).toFixed(2)} {c.material?.unit || ''}</span>
                                    <button onClick={() => handleDeleteMat(c.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <hr className="border-slate-100" />

            {/* ───── PIECES SECTION ───── */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Layers size={16} className="text-brand-600" />
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Consumo de Piezas</h3>
                    {bomPieces.length > 0 && <span className="text-xs text-slate-400 ml-auto">{bomPieces.length} planificadas (BOM)</span>}
                </div>

                {/* BOM planned pieces with progress */}
                {bomPieces.length > 0 && (
                    <div className="space-y-2 mb-4">
                        {bomPieces.map(bp => {
                            const pid = bp.piece_id;
                            const planned = parseInt(bp.quantity_required);
                            const actual = pieceActualMap[pid] || 0;
                            return (
                                <div key={bp.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">
                                    <div className="min-w-0 flex-shrink-0" style={{ width: '40%' }}>
                                        <span className="font-medium text-sm text-slate-800 truncate block">{bp.piece?.name}</span>
                                        <span className="text-xs text-slate-400">{bp.piece?.code}</span>
                                    </div>
                                    <ConsumptionProgress planned={planned} actual={actual} />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Add piece */}
                <div className="flex items-center gap-2">
                    <select className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={addPieceId} onChange={e => setAddPieceId(e.target.value)}>
                        <option value="">+ Agregar pieza...</option>
                        {allPieces.map(p => {
                            const stock = pieceStockMap[p.piece_id] ?? 0;
                            return <option key={p.piece_id} value={p.piece_id}>{p.code} — {p.name} [Stock: {stock}]</option>;
                        })}
                    </select>
                    <input type="number" min="1" className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" value={addPieceQty} onChange={e => setAddPieceQty(e.target.value)} />
                    <button onClick={handleAddPiece} disabled={!addPieceId} className="px-3 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-500 disabled:opacity-40 flex items-center gap-1"><Plus size={14} /></button>
                </div>

                {/* Actual piece consumption log */}
                {pieceConsumptions.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                        <p className="text-xs text-slate-400 font-medium">Registros:</p>
                        {pieceConsumptions.map(c => (
                            <div key={c.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100 text-sm">
                                <span className="text-slate-700">{c.piece?.name} <span className="text-slate-400">({c.piece?.code})</span></span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-slate-600 text-xs">x{c.quantity_used}</span>
                                    <button onClick={() => handleDeletePiece(c.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// MAIN PUMP MO MODAL
// ============================================================================
export default function PumpMOModal({ isOpen, onClose, orderId = null, onSuccess, initialType = 'pump_fabrication' }) {
    const isEditing = !!orderId;
    const [activeTab, setActiveTab] = useState('ORDER');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [errors, setErrors] = useState({});

    const [crews, setCrews] = useState([]);
    const [pumps, setPumps] = useState([]);
    const [pumpModels, setPumpModels] = useState([]);

    const [formData, setFormData] = useState({
        code: '', name: '', moType: initialType, pumpId: '', pumpModelId: '',
        quantityPlanned: 1, status: 'pendiente',
        startDate: new Date().toISOString().split('T')[0], endDate: '', crewId: '', notes: '',
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
            const prefix = initialType === 'pump_repair' ? 'REP' : 'FAB';
            setFormData({
                code: `${prefix}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
                name: '', moType: initialType, pumpId: '', pumpModelId: '',
                quantityPlanned: 1, status: 'pendiente',
                startDate: new Date().toISOString().split('T')[0], endDate: '', crewId: '', notes: '',
            });
        }
    }, [isOpen, orderId, initialType]);

    const loadOptions = async () => {
        try {
            const [{ data: crewData }, pumpData, modelData] = await Promise.all([
                supabase.from('crew').select('crew_id, name').eq('active', true).order('name'),
                FabricationService.getAvailablePumpsForRepair(),
                FabricationService.getPumpModels()
            ]);
            setCrews(crewData || []);
            setPumps(pumpData || []);
            setPumpModels(modelData || []);
        } catch (err) { console.error(err); }
    };

    const loadOrder = async () => {
        setLoading(true);
        try {
            const order = await FabricationService.getManufacturingOrderById(orderId);
            setFormData({
                code: order.code || '', name: order.name || '',
                moType: order.mo_type || 'pump_fabrication',
                pumpId: order.pump_id || '', pumpModelId: order.pump_model_id || '',
                quantityPlanned: order.quantity_planned, status: order.status,
                startDate: order.start_date ? String(order.start_date).split('T')[0] : '',
                endDate: order.end_date ? String(order.end_date).split('T')[0] : '',
                crewId: order.crew_id || '', notes: order.notes || '',
            });
        } catch (err) { setError('Error cargando la orden'); }
        finally { setLoading(false); }
    };

    const validate = () => {
        const e = {};
        if (!formData.name?.trim()) e.name = 'Requerido';
        if (formData.moType === 'pump_repair' && !formData.pumpId) e.pumpId = 'Selecciona la bomba';
        if (formData.moType === 'pump_fabrication' && !formData.pumpModelId) e.pumpModelId = 'Selecciona el modelo';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true); setError(null);
        try {
            if (isEditing) {
                await FabricationService.updatePumpManufacturingOrder(orderId, formData);
            } else {
                await FabricationService.createPumpManufacturingOrder(formData);
            }
            onSuccess?.(); onClose();
        } catch (err) { setError(err.message || 'Error al guardar'); }
        finally { setSaving(false); }
    };

    const handleComplete = async () => {
        const typeLabel = formData.moType === 'pump_repair' ? 'reparación' : 'fabricación';
        if (!window.confirm(`¿Completar esta orden de ${typeLabel}? ${formData.moType === 'pump_fabrication' ? 'Se CREARÁ una nueva bomba.' : 'La bomba pasará a "Almacenada".'}`)) return;
        setSaving(true); setError(null);
        try { await FabricationService.completeManufacturingOrder(orderId); onSuccess?.(); onClose(); }
        catch (err) { setError(err.message || 'Error al completar'); setSaving(false); }
    };

    const handleDelete = async () => {
        if (!window.confirm('¿Eliminar esta orden? Se revertirán consumos.')) return;
        try { await FabricationService.deleteManufacturingOrder(orderId); onSuccess?.(); onClose(); }
        catch (err) { alert('Error: ' + err.message); }
    };

    if (!isOpen) return null;

    const TABS = [
        { id: 'ORDER', label: 'Orden', icon: Droplets },
        ...(isEditing ? [{ id: 'CONSUMPTION', label: 'Consumos', icon: Package }] : [])
    ];

    const typeColor = formData.moType === 'pump_repair' ? 'from-orange-600 to-amber-600' : 'from-cyan-600 to-blue-600';

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className={`bg-gradient-to-r ${typeColor} p-5 text-white flex items-center justify-between shrink-0`}>
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center"><Droplets size={20} /></div>
                        <div>
                            <h2 className="text-lg font-bold">
                                {isEditing ? (formData.moType === 'pump_repair' ? '🔧 Reparación de Bomba' : '🔨 Fabricación de Bomba') : (initialType === 'pump_repair' ? '🔧 Nueva Reparación' : '🔨 Nueva Fabricación')}
                            </h2>
                            <p className="text-sm text-white/70">{formData.code || 'Nueva orden'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl"><X size={20} /></button>
                </div>

                {error && <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>}

                <div className="flex border-b border-slate-100 px-6 pt-2 shrink-0">
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === tab.id ? 'border-accent-500 text-accent-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-300" size={32} /></div> : (
                        <>
                            {activeTab === 'ORDER' && <PumpOrderTab formData={formData} setFormData={setFormData} crews={crews} pumps={pumps} pumpModels={pumpModels} errors={errors} isEditing={isEditing} />}
                            {activeTab === 'CONSUMPTION' && <UnifiedConsumptionTab moId={orderId} pumpModelId={formData.pumpModelId} />}
                        </>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                    <div className="flex gap-2">
                        {isEditing && <button onClick={handleDelete} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium flex items-center gap-1.5"><Trash2 size={15} /> Eliminar</button>}
                        {isEditing && formData?.status !== 'terminada' && <button onClick={handleComplete} disabled={saving} className="px-4 py-2 text-emerald-600 hover:bg-emerald-50 rounded-xl text-sm font-bold flex items-center gap-1.5"><Package size={15} /> Completar Orden</button>}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">Cancelar</button>
                        {formData?.status !== 'terminada' && (
                            <button onClick={handleSave} disabled={saving} className={`px-5 py-2.5 bg-gradient-to-r ${typeColor} text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50`}>
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {isEditing ? 'Guardar' : 'Crear Orden'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
