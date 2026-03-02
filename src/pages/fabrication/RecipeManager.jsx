import React, { useState, useEffect, useCallback } from 'react';
import {
    Search, Plus, Trash2, Save, X, Package, Layers,
    Image, Loader2, ChevronRight, BookOpen
} from 'lucide-react';
import { FabricationService } from '../../services/fabrication';
import { supabase } from '../../services/supabase';

export default function RecipeManager() {
    const [pieces, setPieces] = useState([]);
    const [allMaterials, setAllMaterials] = useState([]);
    const [selectedPieceId, setSelectedPieceId] = useState(null);
    const [recipe, setRecipe] = useState([]);
    const [loadingPieces, setLoadingPieces] = useState(true);
    const [loadingRecipe, setLoadingRecipe] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [newRow, setNewRow] = useState({ materialId: '', quantity: '' });
    const [editingId, setEditingId] = useState(null);
    const [editQty, setEditQty] = useState('');

    // Load all pieces
    useEffect(() => {
        const loadPieces = async () => {
            setLoadingPieces(true);
            try {
                const { data } = await supabase
                    .from('piece')
                    .select('piece_id, code, name, image_url, drawing_code')
                    .order('code');
                setPieces(data || []);

                const { data: matData } = await supabase
                    .from('material')
                    .select('material_id, code, name, unit')
                    .order('name');
                setAllMaterials(matData || []);
            } catch (err) {
                console.error('Error loading pieces:', err);
            } finally {
                setLoadingPieces(false);
            }
        };
        loadPieces();
    }, []);

    // Load recipe when a piece is selected
    const loadRecipe = useCallback(async () => {
        if (!selectedPieceId) return;
        setLoadingRecipe(true);
        try {
            const data = await FabricationService.getRecipeForPiece(selectedPieceId);
            setRecipe(data);
        } catch (err) {
            console.error('Error loading recipe:', err);
        } finally {
            setLoadingRecipe(false);
        }
    }, [selectedPieceId]);

    useEffect(() => { loadRecipe(); }, [loadRecipe]);

    const selectedPiece = pieces.find(p => p.piece_id === selectedPieceId);
    const filteredPieces = pieces.filter(p => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return p.code?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q);
    });

    const availableMaterials = allMaterials.filter(m => !recipe.some(r => r.material_id === m.material_id));

    const handleAdd = async () => {
        if (!newRow.materialId || !newRow.quantity) return;
        try {
            await FabricationService.addRecipeItem(selectedPieceId, parseInt(newRow.materialId), parseFloat(newRow.quantity));
            setNewRow({ materialId: '', quantity: '' });
            loadRecipe();
        } catch (err) { alert('Error: ' + err.message); }
    };

    const handleUpdate = async (id) => {
        if (!editQty) return;
        try {
            await FabricationService.updateRecipeItem(id, parseFloat(editQty));
            setEditingId(null);
            loadRecipe();
        } catch (err) { alert('Error: ' + err.message); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este material de la receta?')) return;
        try {
            await FabricationService.deleteRecipeItem(id);
            loadRecipe();
        } catch (err) { alert('Error: ' + err.message); }
    };

    // Count recipes per piece
    const [recipeCounts, setRecipeCounts] = useState({});
    useEffect(() => {
        const loadCounts = async () => {
            const { data } = await supabase
                .from('piece_material')
                .select('piece_id');
            if (data) {
                const counts = {};
                data.forEach(r => { counts[r.piece_id] = (counts[r.piece_id] || 0) + 1; });
                setRecipeCounts(counts);
            }
        };
        loadCounts();
    }, [recipe]);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex" style={{ minHeight: '500px' }}>
            {/* LEFT: Piece List */}
            <div className="w-72 border-r border-slate-100 flex flex-col bg-slate-50/50 shrink-0">
                <div className="p-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                        <BookOpen size={18} className="text-brand-500" />
                        Catálogo de Recetas
                    </h3>
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar pieza..."
                            className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loadingPieces ? (
                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-300" size={20} /></div>
                    ) : (
                        <div className="p-2 space-y-0.5">
                            {filteredPieces.map(piece => (
                                <button
                                    key={piece.piece_id}
                                    onClick={() => setSelectedPieceId(piece.piece_id)}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2 transition-all ${selectedPieceId === piece.piece_id
                                            ? 'bg-brand-600 text-white shadow-md'
                                            : 'hover:bg-white text-slate-700'
                                        }`}
                                >
                                    <Package size={14} className={selectedPieceId === piece.piece_id ? 'text-indigo-200' : 'text-slate-400'} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{piece.name}</p>
                                        <p className={`text-xs ${selectedPieceId === piece.piece_id ? 'text-indigo-200' : 'text-slate-400'} font-mono`}>{piece.code}</p>
                                    </div>
                                    {recipeCounts[piece.piece_id] && (
                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${selectedPieceId === piece.piece_id
                                                ? 'bg-white/20 text-white'
                                                : 'bg-brand-50 text-brand-600'
                                            }`}>
                                            {recipeCounts[piece.piece_id]}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: Recipe Editor + Drawing */}
            {selectedPieceId ? (
                <div className="flex-1 flex flex-col md:flex-row">
                    {/* Materials List */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                <Layers size={18} className="text-brand-500" />
                                Receta: {selectedPiece?.name}
                            </h4>
                            <span className="text-xs text-slate-400 font-medium">{recipe.length} materiales</span>
                        </div>

                        {loadingRecipe ? (
                            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-300" size={20} /></div>
                        ) : (
                            <>
                                <div className="space-y-2 mb-4">
                                    {recipe.map(item => (
                                        <div key={item.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-brand-200 transition-all">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-700 truncate">
                                                    {item.material?.code} — {item.material?.name}
                                                </p>
                                                <p className="text-xs text-slate-400">{item.material?.unit || 'und'}</p>
                                            </div>
                                            {editingId === item.id ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        className="w-20 px-2 py-1 text-sm border border-brand-300 rounded-lg bg-white outline-none"
                                                        value={editQty}
                                                        onChange={e => setEditQty(e.target.value)}
                                                        autoFocus
                                                        onKeyDown={e => e.key === 'Enter' && handleUpdate(item.id)}
                                                    />
                                                    <button onClick={() => handleUpdate(item.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Save size={14} /></button>
                                                    <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X size={14} /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => { setEditingId(item.id); setEditQty(item.quantity_required.toString()); }}
                                                        className="px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs font-bold hover:bg-brand-100 transition-colors"
                                                    >
                                                        {parseFloat(item.quantity_required)}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {recipe.length === 0 && (
                                        <p className="text-center text-slate-400 text-sm py-6 italic">Sin materiales en la receta. Agregue uno abajo.</p>
                                    )}
                                </div>

                                {/* Add Material Row */}
                                <div className="flex items-center gap-2 p-2.5 bg-brand-50/50 rounded-xl border border-dashed border-brand-200">
                                    <select
                                        className="flex-1 px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white outline-none"
                                        value={newRow.materialId}
                                        onChange={e => setNewRow({ ...newRow, materialId: e.target.value })}
                                    >
                                        <option value="">Material...</option>
                                        {availableMaterials.map(m => (
                                            <option key={m.material_id} value={m.material_id}>{m.code} — {m.name}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number" min="0.01" step="0.01" placeholder="Cant."
                                        className="w-20 px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white outline-none"
                                        value={newRow.quantity}
                                        onChange={e => setNewRow({ ...newRow, quantity: e.target.value })}
                                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                                    />
                                    <button
                                        onClick={handleAdd}
                                        disabled={!newRow.materialId || !newRow.quantity}
                                        className="p-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Drawing Panel */}
                    <div className="w-full md:w-64 p-5 bg-slate-50/50 border-l border-slate-100 flex flex-col shrink-0">
                        <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-3 text-sm">
                            <Image size={16} className="text-blue-500" />
                            Plano / Imagen
                        </h4>
                        {selectedPiece?.drawing_code && (
                            <p className="text-xs text-slate-500 mb-2 font-mono bg-slate-100 px-2 py-1 rounded">
                                {selectedPiece.drawing_code}
                            </p>
                        )}
                        <div className="flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white overflow-hidden min-h-[160px]">
                            {selectedPiece?.image_url ? (
                                <img
                                    src={selectedPiece.image_url}
                                    alt={`Plano de ${selectedPiece.name}`}
                                    className="w-full h-full object-contain max-h-[300px] p-2"
                                />
                            ) : (
                                <div className="text-center text-slate-300 p-4">
                                    <Image size={36} className="mx-auto mb-2 opacity-30" />
                                    <p className="text-xs">Sin imagen</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                    <BookOpen size={56} className="opacity-15 mb-3" />
                    <p className="text-sm font-medium">Seleccione una pieza para ver y editar su receta</p>
                    <p className="text-xs text-slate-300 mt-1">Las recetas se cargan automáticamente al crear procesos en las órdenes</p>
                </div>
            )}
        </div>
    );
}
