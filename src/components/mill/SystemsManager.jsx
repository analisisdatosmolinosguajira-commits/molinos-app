import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Plus, Edit2, Trash2, ChevronDown, ChevronRight,
    ImagePlus, X, Loader2, Box, Settings2, RefreshCw,
    CheckCircle, AlertTriangle, XCircle, Camera, Upload
} from 'lucide-react';
import { SystemService } from '../../services/systems';

// ── Colores por sistema ──────────────────────────────────────────
const SYSTEM_COLORS = {
    'SIS-FRE':     { bg: 'bg-rose-50',    border: 'border-rose-200',    badge: 'bg-rose-100 text-rose-700',    icon: '🛑' },
    'SIS-BOM':     { bg: 'bg-blue-50',    border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700',    icon: '💧' },
    'SIS-CONV':    { bg: 'bg-amber-50',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700',  icon: '⚙️' },
    'SIS-ESTR':    { bg: 'bg-slate-50',   border: 'border-slate-200',   badge: 'bg-slate-100 text-slate-700',  icon: '🏗️' },
    'SIS-ROT-ASP': { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', icon: '🌀' },
    'SIS-PVC':     { bg: 'bg-cyan-50',    border: 'border-cyan-200',    badge: 'bg-cyan-100 text-cyan-700',    icon: '🔧' },
    'AMB':         { bg: 'bg-violet-50',  border: 'border-violet-200',  badge: 'bg-violet-100 text-violet-700', icon: '🌤️' },
};
const DEFAULT_COLOR = { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-700', icon: '📦' };

// ── Helper modal genérico ────────────────────────────────────────
function SimpleModal({ title, isOpen, onClose, children }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-lg">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

// ── Formulario reutilizable código+nombre+descripción ────────────
function ComponentForm({ initial = {}, onSubmit, loading, submitLabel = 'Guardar', onCancel }) {
    const [form, setForm] = useState({ code: initial.code || '', name: initial.name || '', description: initial.description || '' });
    const [errors, setErrors] = useState({});

    const validate = () => {
        const e = {};
        if (!form.code.trim())  e.code = 'El código es requerido';
        if (!form.name.trim())  e.name = 'El nombre es requerido';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = (ev) => {
        ev.preventDefault();
        if (!validate()) return;
        onSubmit(form);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Código *</label>
                <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                    placeholder="Ej: SIS-FRE" disabled={loading}
                    className={`w-full px-3 py-2 border rounded-xl text-sm font-mono uppercase focus:ring-2 focus:ring-violet-400 outline-none ${errors.code ? 'border-red-300' : 'border-slate-200'}`} />
                {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code}</p>}
            </div>
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Nombre descriptivo" disabled={loading}
                    className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-violet-400 outline-none ${errors.name ? 'border-red-300' : 'border-slate-200'}`} />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
            </div>
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Descripción</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Descripción técnica opcional" rows={2} disabled={loading}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-400 outline-none resize-none" />
            </div>
            <div className="flex gap-2 pt-2">
                <button type="button" onClick={onCancel} disabled={loading}
                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                    Cancelar
                </button>
                <button type="submit" disabled={loading}
                    className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                    {submitLabel}
                </button>
            </div>
        </form>
    );
}

// ── Galería de fotos de referencia ──────────────────────────────
function PhotoGallery({ system, onRefresh }) {
    const fileRef = useRef();
    const [uploading, setUploading] = useState(false);
    const photos = Array.isArray(system.photo_urls) ? system.photo_urls : [];

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            await SystemService.uploadPhoto(system.component_id, file);
            onRefresh();
        } catch (err) {
            alert(`Error al subir foto: ${err.message}`);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDelete = async (url) => {
        if (!window.confirm('¿Eliminar esta foto de referencia?')) return;
        try {
            await SystemService.deletePhoto(system.component_id, url);
            onRefresh();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    return (
        <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fotos de referencia</span>
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-semibold disabled:opacity-50 transition-colors">
                    {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
                    Subir foto
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </div>

            {photos.length === 0 ? (
                <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-all"
                >
                    <Camera size={20} className="mx-auto text-slate-300 mb-1" />
                    <p className="text-xs text-slate-400">Haz clic para subir fotos de referencia</p>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-2">
                    {photos.map((url, i) => (
                        <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                            <img src={url} alt={`Referencia ${i + 1}`} className="w-full h-full object-cover" />
                            <button
                                onClick={() => handleDelete(url)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => fileRef.current?.click()}
                        className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:border-violet-300 hover:text-violet-400 transition-all"
                    >
                        <Plus size={20} />
                        <span className="text-[10px] mt-0.5">Agregar</span>
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Fila de componente hijo ──────────────────────────────────────
function ComponentRow({ comp, onEdit, onDelete }) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!window.confirm(`¿Eliminar el componente "${comp.name}"?\nEsto lo quitará de TODOS los molinos.`)) return;
        setDeleting(true);
        try { await onDelete(comp.component_id); }
        catch (err) { alert(`Error: ${err.message}`); setDeleting(false); }
    };

    return (
        <div className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/70 rounded-lg transition-colors group">
            <div className="w-2 h-2 rounded-full bg-slate-300 mt-2 flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">{comp.code}</span>
                    <span className="text-sm text-slate-800 font-medium">{comp.name}</span>
                </div>
                {comp.description && (
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{comp.description}</p>
                )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={() => onEdit(comp)}
                    className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
                    <Edit2 size={13} />
                </button>
                <button onClick={handleDelete} disabled={deleting}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                    {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
            </div>
        </div>
    );
}

// ── Tarjeta de Sistema ───────────────────────────────────────────
function SystemCard({ system, onRefresh }) {
    const [expanded, setExpanded]       = useState(false);
    const [showAddComp, setShowAddComp] = useState(false);
    const [editComp, setEditComp]       = useState(null);
    const [editSystem, setEditSystem]   = useState(false);
    const [saving, setSaving]           = useState(false);
    const [deleting, setDeleting]       = useState(false);

    const colors = SYSTEM_COLORS[system.code] || DEFAULT_COLOR;

    const handleAddComponent = async (form) => {
        setSaving(true);
        try {
            await SystemService.createComponent({ ...form, parent_component_id: system.component_id });
            setShowAddComp(false);
            onRefresh();
        } catch (err) { alert(`Error: ${err.message}`); }
        finally { setSaving(false); }
    };

    const handleEditComponent = async (form) => {
        setSaving(true);
        try {
            await SystemService.updateComponent(editComp.component_id, form);
            setEditComp(null);
            onRefresh();
        } catch (err) { alert(`Error: ${err.message}`); }
        finally { setSaving(false); }
    };

    const handleDeleteComponent = async (componentId) => {
        await SystemService.deleteComponent(componentId);
        onRefresh();
    };

    const handleEditSystem = async (form) => {
        setSaving(true);
        try {
            await SystemService.updateSystem(system.component_id, form);
            setEditSystem(false);
            onRefresh();
        } catch (err) { alert(`Error: ${err.message}`); }
        finally { setSaving(false); }
    };

    const handleDeleteSystem = async () => {
        if (!window.confirm(`¿Eliminar el sistema "${system.name}"?\nSe eliminarán todos sus ${system.children.length} componentes y sus registros en todos los molinos.`)) return;
        setDeleting(true);
        try {
            await SystemService.deleteSystem(system.component_id);
            onRefresh();
        } catch (err) { alert(`Error: ${err.message}`); setDeleting(false); }
    };

    return (
        <>
            <div className={`rounded-2xl border ${colors.border} ${colors.bg} overflow-hidden shadow-sm transition-all`}>
                {/* HEADER del sistema */}
                <div
                    className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:brightness-95 transition-all"
                    onClick={() => setExpanded(e => !e)}
                >
                    <span className="text-2xl select-none">{colors.icon}</span>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${colors.badge}`}>{system.code}</span>
                            <h3 className="font-bold text-slate-900 text-sm">{system.name}</h3>
                        </div>
                        {system.description && (
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-1">{system.description}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-slate-400 font-medium hidden sm:block">
                            {system.children.length} comp.
                        </span>
                        {/* Acciones del sistema */}
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setEditSystem(true)}
                                className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-white/80 rounded-lg transition-colors">
                                <Edit2 size={14} />
                            </button>
                            <button onClick={handleDeleteSystem} disabled={deleting}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white/80 rounded-lg transition-colors disabled:opacity-50">
                                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                        </div>
                        {expanded
                            ? <ChevronDown size={16} className="text-slate-400 transition-transform" />
                            : <ChevronRight size={16} className="text-slate-400 transition-transform" />
                        }
                    </div>
                </div>

                {/* BODY expandible */}
                {expanded && (
                    <div className="border-t border-current/10 bg-white/60 px-4 py-4 space-y-1">
                        {/* Lista de componentes */}
                        {system.children.length === 0 ? (
                            <div className="py-4 text-center text-slate-400 text-sm">
                                No hay componentes en este sistema todavía.
                            </div>
                        ) : (
                            <div className="space-y-0.5 mb-3">
                                {system.children.map(comp => (
                                    <ComponentRow
                                        key={comp.component_id}
                                        comp={comp}
                                        onEdit={setEditComp}
                                        onDelete={handleDeleteComponent}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Botón agregar componente */}
                        {!showAddComp ? (
                            <button
                                onClick={() => setShowAddComp(true)}
                                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-violet-600 hover:text-violet-800 hover:bg-violet-50 rounded-xl border border-dashed border-violet-300 transition-all"
                            >
                                <Plus size={14} /> Agregar componente
                            </button>
                        ) : (
                            <div className="bg-white border border-violet-200 rounded-xl p-4 shadow-sm">
                                <p className="text-xs font-bold text-violet-700 mb-3">Nuevo componente en {system.name}</p>
                                <ComponentForm
                                    onSubmit={handleAddComponent}
                                    loading={saving}
                                    submitLabel="Agregar"
                                    onCancel={() => setShowAddComp(false)}
                                />
                            </div>
                        )}

                        {/* Galería de fotos */}
                        <PhotoGallery system={system} onRefresh={onRefresh} />
                    </div>
                )}
            </div>

            {/* Modal editar sistema */}
            <SimpleModal
                title={`Editar sistema: ${system.code}`}
                isOpen={editSystem}
                onClose={() => setEditSystem(false)}
            >
                <ComponentForm
                    initial={system}
                    onSubmit={handleEditSystem}
                    loading={saving}
                    submitLabel="Actualizar Sistema"
                    onCancel={() => setEditSystem(false)}
                />
            </SimpleModal>

            {/* Modal editar componente */}
            <SimpleModal
                title="Editar componente"
                isOpen={!!editComp}
                onClose={() => setEditComp(null)}
            >
                {editComp && (
                    <ComponentForm
                        initial={editComp}
                        onSubmit={handleEditComponent}
                        loading={saving}
                        submitLabel="Actualizar Componente"
                        onCancel={() => setEditComp(null)}
                    />
                )}
            </SimpleModal>
        </>
    );
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────
export default function SystemsManager() {
    const [systems, setSystems]         = useState([]);
    const [loading, setLoading]         = useState(true);
    const [showAddSystem, setShowAddSystem] = useState(false);
    const [saving, setSaving]           = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await SystemService.getSystemsWithComponents();
            setSystems(data);
        } catch (err) {
            console.error('Error loading systems:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleAddSystem = async (form) => {
        setSaving(true);
        try {
            await SystemService.createSystem(form);
            setShowAddSystem(false);
            load();
        } catch (err) { alert(`Error: ${err.message}`); }
        finally { setSaving(false); }
    };

    const totalComponents = systems.reduce((acc, s) => acc + s.children.length, 0);

    return (
        <div className="space-y-5">
            {/* Barra superior */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">
                        <span className="font-bold text-slate-800">{systems.length}</span> sistemas ·{' '}
                        <span className="font-bold text-slate-800">{totalComponents}</span> componentes
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Todos los molinos comparten este catálogo estándar
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={load} disabled={loading}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setShowAddSystem(s => !s)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm rounded-xl font-bold hover:bg-violet-700 transition-all shadow-md shadow-violet-500/20"
                    >
                        <Plus size={16} />
                        Nuevo Sistema
                    </button>
                </div>
            </div>

            {/* Formulario nuevo sistema */}
            {showAddSystem && (
                <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Settings2 size={18} className="text-violet-600" />
                        <p className="font-bold text-violet-800">Nuevo Sistema</p>
                    </div>
                    <ComponentForm
                        onSubmit={handleAddSystem}
                        loading={saving}
                        submitLabel="Crear Sistema"
                        onCancel={() => setShowAddSystem(false)}
                    />
                </div>
            )}

            {/* Lista de sistemas */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 size={32} className="text-violet-600 animate-spin" />
                    <p className="text-slate-500 text-sm">Cargando sistemas...</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {systems.map(sys => (
                        <SystemCard key={sys.component_id} system={sys} onRefresh={load} />
                    ))}
                </div>
            )}
        </div>
    );
}
