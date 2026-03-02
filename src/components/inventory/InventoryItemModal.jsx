import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Upload, Image, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { InventoryService } from '../../services/inventory';

/**
 * Generic modal for CRUD operations on inventory items.
 * Auto-generates internal codes. Includes image upload for pieces.
 * Supplier is NOT managed here — it has its own dedicated tab.
 */
const InventoryItemModal = ({ category, item, onClose, onSave }) => {
    const isEdit = !!item;
    const [nextCode, setNextCode] = useState('');
    const [loadingCode, setLoadingCode] = useState(!isEdit);
    const [uploading, setUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState(item?.image_url || '');

    const CODE_CONFIG = {
        materiales: { prefix: 'MAT', table: 'material', idCol: 'material_id', padLen: 3 },
        piezas: { prefix: 'PIE', table: 'piece', idCol: 'piece_id', padLen: 3 },
        herramientas: { prefix: 'TL', table: 'tool', idCol: 'tool_id', padLen: 4 },
        epp: { prefix: 'SE', table: 'safety_equipment', idCol: 'safety_id', padLen: 4 }
    };

    const getInitialState = () => {
        if (category === 'materiales') {
            return {
                code: item?.code || '',
                name: item?.name || '',
                description: item?.description || '',
                unit: item?.unit || 'ud',
                min_stock: item?.min_stock ?? 0,
                location: item?.location || ''
            };
        } else if (category === 'piezas') {
            return {
                code: item?.code || '',
                name: item?.name || '',
                description: item?.description || '',
                drawing_code: item?.drawing_code || '',
                unit: item?.unit || 'ud',
                min_stock: item?.min_stock ?? 0,
                image_url: item?.image_url || '',
                origin: item?.origin || ''
            };
        } else if (category === 'herramientas') {
            return {
                code: item?.code || '',
                name: item?.name || '',
                type: item?.type || '',
                serial_number: item?.serial_number || '',
                status: item?.status || 'disponible',
                location: item?.location || '',
                notes: item?.notes || '',
                min_stock: item?.min_stock ?? 0
            };
        } else if (category === 'epp') {
            return {
                code: item?.code || '',
                name: item?.name || '',
                description: item?.description || '',
                unit: item?.unit || 'ud',
                min_stock: item?.min_stock ?? 0
            };
        }
        return {};
    };

    const [formData, setFormData] = useState(getInitialState);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isEdit && CODE_CONFIG[category]) {
            const cfg = CODE_CONFIG[category];
            setLoadingCode(true);
            supabase
                .from(cfg.table)
                .select(cfg.idCol)
                .order(cfg.idCol, { ascending: false })
                .limit(1)
                .then(({ data }) => {
                    const lastId = data?.[0]?.[cfg.idCol] || 0;
                    const newNum = String(lastId + 1).padStart(cfg.padLen, '0');
                    const code = `${cfg.prefix}-${newNum}`;
                    setNextCode(code);
                    setFormData(prev => ({ ...prev, code }));
                })
                .catch(console.error)
                .finally(() => setLoadingCode(false));
        }
    }, []);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await InventoryService.uploadPieceImage(file);
            setImagePreview(url);
            setFormData(prev => ({ ...prev, image_url: url }));
        } catch (err) {
            alert('Error subiendo imagen: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const cleanData = { ...formData };
            if (category === 'piezas' && !cleanData.origin) {
                delete cleanData.origin; // Avoid check constraint violation with empty string
            }
            await onSave(cleanData);
            onClose();
        } catch (error) {
            console.error('Error saving item:', error);
            alert('Error al guardar: ' + (error.message || 'Error desconocido'));
        } finally {
            setSaving(false);
        }
    };

    const getCategoryLabel = () => ({
        materiales: 'Material',
        piezas: 'Pieza/Repuesto',
        herramientas: 'Herramienta',
        epp: 'Equipo de Protección Personal'
    }[category] || 'Elemento');

    const getCategoryColor = () => ({
        materiales: 'from-blue-600 to-indigo-700',
        piezas: 'from-violet-600 to-purple-700',
        herramientas: 'from-amber-600 to-orange-700',
        epp: 'from-emerald-600 to-teal-700'
    }[category] || 'from-slate-600 to-slate-700');

    const inputCls = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all";
    const labelCls = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5";

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 flex flex-col max-h-[calc(100vh-4rem)]" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={`bg-gradient-to-r ${getCategoryColor()} px-6 py-5 flex justify-between items-center rounded-t-2xl text-white`}>
                    <h2 className="text-xl font-bold">{isEdit ? 'Editar' : 'Nuevo'} {getCategoryLabel()}</h2>
                    <button type="button" onClick={onClose} className="text-white/70 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors">
                        <X size={22} />
                    </button>
                </div>

                {/* Form */}
                <div className="overflow-y-auto flex-1 min-h-0">
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* Code + Name */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Código (auto-generado)</label>
                                <input type="text" value={loadingCode ? 'Generando...' : formData.code} readOnly className={`${inputCls} bg-slate-100 text-slate-500 cursor-not-allowed font-mono`} />
                            </div>
                            <div>
                                <label className={labelCls}>Nombre *</label>
                                <input type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)} required placeholder="Nombre del elemento..." className={inputCls} />
                            </div>
                        </div>

                        {/* ===== MATERIALES ===== */}
                        {category === 'materiales' && (
                            <>
                                <div>
                                    <label className={labelCls}>Descripción</label>
                                    <textarea value={formData.description} onChange={e => handleChange('description', e.target.value)} rows={2} placeholder="Descripción del material..." className={inputCls + ' resize-none'} />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelCls}>Unidad *</label>
                                        <select value={formData.unit} onChange={e => handleChange('unit', e.target.value)} className={inputCls}>
                                            <option value="ud">Unidades</option>
                                            <option value="kg">Kilogramos</option>
                                            <option value="m">Metros</option>
                                            <option value="L">Litros</option>
                                            <option value="gal">Galones</option>
                                            <option value="lb">Libras</option>
                                            <option value="pies">Pies</option>
                                            <option value="plg">Pulgadas</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Stock Mínimo</label>
                                        <input type="number" min="0" step="0.01" value={formData.min_stock} onChange={e => handleChange('min_stock', parseFloat(e.target.value) || 0)} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Ubicación</label>
                                        <input type="text" value={formData.location} onChange={e => handleChange('location', e.target.value)} placeholder="Ej: Almacén A" className={inputCls} />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ===== PIEZAS ===== */}
                        {category === 'piezas' && (
                            <>
                                <div>
                                    <label className={labelCls}>Descripción</label>
                                    <textarea value={formData.description} onChange={e => handleChange('description', e.target.value)} rows={2} placeholder="Descripción de la pieza..." className={inputCls + ' resize-none'} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Código de Plano</label>
                                        <input type="text" value={formData.drawing_code} onChange={e => handleChange('drawing_code', e.target.value)} placeholder="Ej: DRW-001" className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Origen</label>
                                        <select value={formData.origin} onChange={e => handleChange('origin', e.target.value)} className={inputCls}>
                                            <option value="">Sin especificar</option>
                                            <option value="comprado">Comprado</option>
                                            <option value="fabricado">Fabricado</option>
                                            <option value="recuperado">Recuperado</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Unidad</label>
                                        <select value={formData.unit} onChange={e => handleChange('unit', e.target.value)} className={inputCls}>
                                            <option value="ud">Unidades</option>
                                            <option value="pares">Pares</option>
                                            <option value="juegos">Juegos</option>
                                            <option value="m">Metros</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Stock Mínimo</label>
                                        <input type="number" min="0" value={formData.min_stock} onChange={e => handleChange('min_stock', parseInt(e.target.value) || 0)} className={inputCls} />
                                    </div>
                                </div>

                                {/* IMAGE UPLOAD */}
                                <div>
                                    <label className={labelCls}>Imagen / Plano de la Pieza</label>
                                    <div className="flex items-start gap-4">
                                        <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                                            {uploading ? (
                                                <Loader2 className="animate-spin text-slate-300" size={24} />
                                            ) : imagePreview ? (
                                                <img src={imagePreview} alt="Pieza" className="w-full h-full object-contain p-1" />
                                            ) : (
                                                <Image size={32} className="text-slate-200" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <label className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 text-violet-700 rounded-xl text-sm font-medium cursor-pointer hover:bg-violet-100 transition-colors border border-violet-200">
                                                <Upload size={16} />
                                                {uploading ? 'Subiendo...' : 'Subir imagen'}
                                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                                            </label>
                                            <p className="text-xs text-slate-400 mt-2">Formatos: JPG, PNG, WebP. Máx. 5MB.</p>
                                            {imagePreview && (
                                                <button type="button" onClick={() => { setImagePreview(''); handleChange('image_url', ''); }} className="text-xs text-red-500 mt-1 hover:text-red-700">
                                                    Eliminar imagen
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ===== HERRAMIENTAS ===== */}
                        {category === 'herramientas' && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Tipo *</label>
                                        <select value={formData.type} onChange={e => handleChange('type', e.target.value)} required className={inputCls}>
                                            <option value="">Seleccionar tipo...</option>
                                            <option value="manual">Manual</option>
                                            <option value="electrica">Eléctrica</option>
                                            <option value="medicion">Medición</option>
                                            <option value="corte">Corte</option>
                                            <option value="soldadura">Soldadura</option>
                                            <option value="elevacion">Elevación</option>
                                            <option value="otro">Otro</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Número de Serie</label>
                                        <input type="text" value={formData.serial_number} onChange={e => handleChange('serial_number', e.target.value)} placeholder="S/N" className={inputCls} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelCls}>Estado *</label>
                                        <select value={formData.status} onChange={e => handleChange('status', e.target.value)} required className={inputCls}>
                                            <option value="disponible">Disponible</option>
                                            <option value="en_uso">En Uso</option>
                                            <option value="mantenimiento">Mantenimiento</option>
                                            <option value="dañada">Dañada</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Ubicación</label>
                                        <input type="text" value={formData.location} onChange={e => handleChange('location', e.target.value)} placeholder="Ej: Taller" className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Stock Mínimo</label>
                                        <input type="number" min="0" value={formData.min_stock} onChange={e => handleChange('min_stock', parseInt(e.target.value) || 0)} className={inputCls} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Notas</label>
                                    <textarea value={formData.notes} onChange={e => handleChange('notes', e.target.value)} rows={2} placeholder="Notas adicionales..." className={inputCls + ' resize-none'} />
                                </div>
                            </>
                        )}

                        {/* ===== EPP ===== */}
                        {category === 'epp' && (
                            <>
                                <div>
                                    <label className={labelCls}>Descripción</label>
                                    <textarea value={formData.description} onChange={e => handleChange('description', e.target.value)} rows={2} placeholder="Descripción del EPP..." className={inputCls + ' resize-none'} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Unidad</label>
                                        <select value={formData.unit} onChange={e => handleChange('unit', e.target.value)} className={inputCls}>
                                            <option value="ud">Unidades</option>
                                            <option value="pares">Pares</option>
                                            <option value="juegos">Juegos</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Stock Mínimo</label>
                                        <input type="number" min="0" value={formData.min_stock} onChange={e => handleChange('min_stock', parseInt(e.target.value) || 0)} className={inputCls} />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Footer */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium">
                                Cancelar
                            </button>
                            <button type="submit" disabled={saving || loadingCode} className="px-6 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors flex items-center gap-2 disabled:opacity-50 font-bold shadow-lg shadow-indigo-500/25 active:scale-95">
                                <Save size={18} />
                                {saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default InventoryItemModal;
