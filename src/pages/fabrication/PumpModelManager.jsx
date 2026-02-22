import React, { useState, useEffect } from 'react';
import {
    Plus, Trash2, Loader2, X, Save, Package, Layers, FlaskConical,
    Droplets, Image, FileText, AlertTriangle, Search, Upload
} from 'lucide-react';
import { FabricationService } from '../../services/fabrication';
import { supabase } from '../../services/supabase';

// ============================================================================
// PUMP MODEL MODAL (Info + BOM Materials + BOM Pieces)
// ============================================================================
function PumpModelModal({ isOpen, onClose, modelId, onSuccess }) {
    const isEditing = !!modelId;
    const [activeTab, setActiveTab] = useState('INFO');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const [formData, setFormData] = useState({ code: '', name: '', description: '', drawingCode: '', imageUrl: '', notes: '' });

    // BOM state
    const [bomMaterials, setBomMaterials] = useState([]);
    const [bomPieces, setBomPieces] = useState([]);
    const [allMaterials, setAllMaterials] = useState([]);
    const [allPieces, setAllPieces] = useState([]);
    const [addMatId, setAddMatId] = useState('');
    const [addMatQty, setAddMatQty] = useState(1);
    const [addPieceId, setAddPieceId] = useState('');
    const [addPieceQty, setAddPieceQty] = useState(1);

    useEffect(() => {
        if (!isOpen) return;
        setActiveTab('INFO');
        setError(null);
        loadOptions();
        if (modelId) {
            loadModel();
        } else {
            setFormData({ code: '', name: '', description: '', drawingCode: '', imageUrl: '', notes: '' });
            setBomMaterials([]);
            setBomPieces([]);
        }
    }, [isOpen, modelId]);

    const loadOptions = async () => {
        try {
            const [{ data: mats }, { data: pcs }] = await Promise.all([
                supabase.from('material').select('material_id, code, name, unit').order('name'),
                supabase.from('piece').select('piece_id, code, name, unit, image_url').order('code')
            ]);
            setAllMaterials(mats || []);
            setAllPieces(pcs || []);
        } catch (err) { console.error(err); }
    };

    const loadModel = async () => {
        setLoading(true);
        try {
            const m = await FabricationService.getPumpModelById(modelId);
            setFormData({
                code: m.code || '', name: m.name || '', description: m.description || '',
                drawingCode: m.drawing_code || '', imageUrl: m.image_url || '', notes: m.notes || ''
            });
            setBomMaterials(m.materials || []);
            setBomPieces(m.pieces || []);
        } catch (err) { setError('Error cargando modelo'); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        if (!formData.name?.trim()) { setError('Nombre es obligatorio.'); return; }
        setSaving(true);
        setError(null);
        try {
            if (isEditing) {
                await FabricationService.updatePumpModel(modelId, formData);
            } else {
                await FabricationService.createPumpModel(formData);
            }
            onSuccess?.();
            onClose();
        } catch (err) { setError(err.message || 'Error al guardar'); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!window.confirm('¿Eliminar este modelo de bomba y todo su BOM?')) return;
        try {
            await FabricationService.deletePumpModel(modelId);
            onSuccess?.();
            onClose();
        } catch (err) { alert('Error: ' + err.message); }
    };

    const handleAddMaterial = async () => {
        if (!addMatId) return;
        try {
            await FabricationService.addPumpModelMaterial(modelId, parseInt(addMatId), parseFloat(addMatQty));
            setAddMatId(''); setAddMatQty(1);
            loadModel();
        } catch (err) { alert('Error: ' + err.message); }
    };

    const handleDeleteMaterial = async (id) => {
        try { await FabricationService.deletePumpModelMaterial(id); loadModel(); }
        catch (err) { alert('Error: ' + err.message); }
    };

    const handleAddPiece = async () => {
        if (!addPieceId) return;
        try {
            await FabricationService.addPumpModelPiece(modelId, parseInt(addPieceId), parseInt(addPieceQty));
            setAddPieceId(''); setAddPieceQty(1);
            loadModel();
        } catch (err) { alert('Error: ' + err.message); }
    };

    const handleDeletePiece = async (id) => {
        try { await FabricationService.deletePumpModelPiece(id); loadModel(); }
        catch (err) { alert('Error: ' + err.message); }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `pump_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `pump_models/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('molinos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('molinos').getPublicUrl(filePath);
            setFormData(prev => ({ ...prev, imageUrl: data.publicUrl }));
        } catch (err) {
            setError('Error subiendo imagen: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    const TABS = [
        { id: 'INFO', label: 'General', icon: Droplets },
        ...(isEditing ? [
            { id: 'BOM_MAT', label: 'Materiales', icon: FlaskConical },
            { id: 'BOM_PIECE', label: 'Piezas', icon: Layers }
        ] : [])
    ];

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-5 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center"><Droplets size={20} /></div>
                        <div>
                            <h2 className="text-lg font-bold">{isEditing ? 'Editar Modelo' : 'Nuevo Modelo de Bomba'}</h2>
                            <p className="text-sm text-white/70">{formData.code || 'Sin código'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><X size={20} /></button>
                </div>

                {error && (
                    <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                        <AlertTriangle size={16} /> {error}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-slate-100 px-6 pt-2 shrink-0">
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === tab.id ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-300" size={32} /></div>
                    ) : activeTab === 'INFO' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Código</label>
                                <input type="text" className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono text-slate-500" value={formData.code || 'Autogenerado'} readOnly />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre *</label>
                                <input type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Bomba Centrífuga 4 pulgadas" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Código de Plano</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input type="text" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={formData.drawingCode} onChange={e => setFormData({ ...formData, drawingCode: e.target.value })} placeholder="DWG-PUMP-001" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Imagen de la Bomba</label>
                                <div className="flex gap-3">
                                    <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 border-dashed rounded-xl text-sm font-medium hover:bg-slate-50 cursor-pointer transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {isUploading ? <Loader2 size={16} className="animate-spin text-slate-400" /> : <Upload size={16} className="text-slate-400" />}
                                        <span className="text-slate-600 truncate">{formData.imageUrl ? 'Cambiar Imagen' : 'Subir Imagen'}</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                                    </label>
                                    {formData.imageUrl && (
                                        <div className="w-[42px] h-[42px] rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                                            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descripción</label>
                                <textarea className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[60px] resize-none" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Especificaciones técnicas..." />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notas</label>
                                <textarea className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[60px] resize-none" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                            </div>
                        </div>
                    ) : activeTab === 'BOM_MAT' ? (
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <select className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={addMatId} onChange={e => setAddMatId(e.target.value)}>
                                    <option value="">Seleccionar material...</option>
                                    {allMaterials.map(m => <option key={m.material_id} value={m.material_id}>{m.code || ''} — {m.name} ({m.unit})</option>)}
                                </select>
                                <input type="number" min="0.01" step="0.01" className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={addMatQty} onChange={e => setAddMatQty(e.target.value)} />
                                <button onClick={handleAddMaterial} disabled={!addMatId} className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-500 disabled:opacity-50 flex items-center gap-1.5"><Plus size={14} /> Agregar</button>
                            </div>
                            {bomMaterials.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">Sin materiales en el BOM.</div>
                            ) : (
                                <div className="space-y-2">
                                    {bomMaterials.map(bm => (
                                        <div key={bm.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                                            <div><span className="font-bold text-sm text-slate-800">{bm.material?.name}</span> <span className="text-xs text-slate-400">{bm.material?.code}</span></div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-mono text-slate-600">{parseFloat(bm.quantity_required).toFixed(2)} {bm.material?.unit || ''}</span>
                                                <button onClick={() => handleDeleteMaterial(bm.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'BOM_PIECE' ? (
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <select className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={addPieceId} onChange={e => setAddPieceId(e.target.value)}>
                                    <option value="">Seleccionar pieza...</option>
                                    {allPieces.map(p => <option key={p.piece_id} value={p.piece_id}>{p.code} — {p.name}</option>)}
                                </select>
                                <input type="number" min="1" className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={addPieceQty} onChange={e => setAddPieceQty(e.target.value)} />
                                <button onClick={handleAddPiece} disabled={!addPieceId} className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-500 disabled:opacity-50 flex items-center gap-1.5"><Plus size={14} /> Agregar</button>
                            </div>
                            {bomPieces.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">Sin piezas en el BOM.</div>
                            ) : (
                                <div className="space-y-2">
                                    {bomPieces.map(bp => (
                                        <div key={bp.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                                            <div><span className="font-bold text-sm text-slate-800">{bp.piece?.name}</span> <span className="text-xs text-slate-400">{bp.piece?.code}</span></div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-mono text-slate-600">x{bp.quantity_required}</span>
                                                <button onClick={() => handleDeletePiece(bp.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                    <div>
                        {isEditing && (
                            <button onClick={handleDelete} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium flex items-center gap-1.5"><Trash2 size={15} /> Eliminar</button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">Cancelar</button>
                        <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {isEditing ? 'Guardar' : 'Crear Modelo'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// PUMP MODEL LIST (main component)
// ============================================================================
export default function PumpModelManager() {
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingModelId, setEditingModelId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => { loadModels(); }, []);

    const loadModels = async () => {
        setLoading(true);
        try {
            const data = await FabricationService.getPumpModels();
            setModels(data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const filtered = models.filter(m => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return m.code?.toLowerCase().includes(q) || m.name?.toLowerCase().includes(q);
    });

    return (
        <>
            <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1 max-w-xs">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Buscar modelo..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <button onClick={() => { setEditingModelId(null); setModalOpen(true); }} className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 active:scale-95">
                    <Plus size={16} /> Nuevo Modelo
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-300" size={32} /></div>
            ) : filtered.length === 0 ? (
                <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 border-dashed">
                    <Droplets className="mx-auto text-slate-300 mb-3" size={48} />
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Sin modelos de bomba</h3>
                    <p className="text-slate-500 text-sm">Crea un modelo y define sus materiales y piezas necesarias.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(model => (
                        <div key={model.pump_model_id}
                            onClick={() => { setEditingModelId(model.pump_model_id); setModalOpen(true); }}
                            className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-teal-200 hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden">
                            <div className="h-1.5 bg-gradient-to-r from-teal-500 to-cyan-400" />
                            {model.image_url && (
                                <div className="h-32 bg-slate-100 overflow-hidden">
                                    <img src={model.image_url} alt={model.name} className="w-full h-full object-cover" />
                                </div>
                            )}
                            <div className="p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-mono text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg">{model.code}</span>
                                    {model.drawing_code && <span className="text-xs text-slate-400 flex items-center gap-1"><FileText size={10} /> {model.drawing_code}</span>}
                                </div>
                                <h4 className="font-bold text-slate-900 text-sm mb-2 truncate">{model.name}</h4>
                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                                        <FlaskConical size={11} /> {model.materials?.length || 0} mat.
                                    </span>
                                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                                        <Layers size={11} /> {model.pieces?.length || 0} pzas.
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <PumpModelModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setEditingModelId(null); }}
                modelId={editingModelId}
                onSuccess={loadModels}
            />
        </>
    );
}
