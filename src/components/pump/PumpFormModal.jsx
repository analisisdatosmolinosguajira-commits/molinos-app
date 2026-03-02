import React, { useState, useEffect } from 'react';
import { X, Loader, Settings, Wrench, Activity, Package, Calendar, MapPin } from 'lucide-react';
import { PumpService } from '../../services/pumps';
import { supabase } from '../../services/supabase';

/**
 * Create/Edit Pump Modal
 * Form for creating new pump or editing existing one
 * 
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Callback to close modal
 * @param {function} onSuccess - Callback after successful save
 * @param {object} pumpData - Existing pump data for edit mode (null for create)
 */
const PumpFormModal = ({ isOpen, onClose, onSuccess, pumpData = null }) => {
    const isEdit = !!pumpData;
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [formData, setFormData] = useState({
        serial_number: '',
        model: '',
        type: '',
        max_depth: '',
        capacity: '',
        status: 'almacenada',
        origin: '',
        supplier_id: '',
        manufacture_date: '',
        storage_location: '',
        manufacturing_order_id: '',
        notes: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            loadSuppliers();
            if (pumpData) {
                // Populate form with existing data
                setFormData({
                    serial_number: pumpData.serial_number || '',
                    model: pumpData.model || '',
                    type: pumpData.type || '',
                    max_depth: pumpData.max_depth || '',
                    capacity: pumpData.capacity || '',
                    status: pumpData.status || 'almacenada',
                    origin: pumpData.origin || '',
                    supplier_id: pumpData.supplier_id || '',
                    manufacture_date: pumpData.manufacture_date || '',
                    storage_location: pumpData.storage_location || '',
                    manufacturing_order_id: pumpData.manufacturing_order_id || '',
                    notes: pumpData.notes || ''
                });
            } else {
                // Reset form for create mode
                setFormData({
                    serial_number: '',
                    model: '',
                    type: '',
                    max_depth: '',
                    capacity: '',
                    status: 'almacenada',
                    origin: '',
                    supplier_id: '',
                    manufacture_date: '',
                    storage_location: '',
                    manufacturing_order_id: '',
                    notes: ''
                });
            }
            setErrors({});
        }
    }, [isOpen, pumpData]);

    const loadSuppliers = async () => {
        try {
            const { data, error } = await supabase
                .from('supplier')
                .select('supplier_id, name')
                .order('name');

            if (error) throw error;
            setSuppliers(data || []);
        } catch (error) {
            console.error('Error loading suppliers:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validate = () => {
        const newErrors = {};

        // Serial number validation
        if (!formData.serial_number.trim()) {
            newErrors.serial_number = 'El número de serie es requerido';
        } else if (!/^[A-Z0-9-]+$/.test(formData.serial_number)) {
            newErrors.serial_number = 'Formato inválido. Use solo letras mayúsculas, números y guiones';
        }

        // Numeric validations
        if (formData.max_depth && (formData.max_depth < 0 || formData.max_depth > 500)) {
            newErrors.max_depth = 'Debe estar entre 0 y 500 metros';
        }

        if (formData.capacity && formData.capacity < 0) {
            newErrors.capacity = 'La capacidad debe ser positiva';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        setLoading(true);
        try {
            // Prepare data
            const dataToSave = {
                serial_number: formData.serial_number.trim(),
                model: formData.model || null,
                origin: formData.origin || null,
                status: formData.status,
                notes: formData.notes || null,
                // Nuevos campos
                supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
                manufacture_date: formData.manufacture_date || null,
                storage_location: formData.storage_location || null,
                manufacturing_order_id: formData.manufacturing_order_id ? parseInt(formData.manufacturing_order_id) : null
            };

            if (isEdit) {
                // Update existing pump
                await PumpService.updatePump(pumpData.pump_id, dataToSave);
            } else {
                // Create new pump
                await PumpService.createPump(dataToSave);
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving pump:', error);
            if (error.message.includes('duplicate') || error.code === '23505') {
                setErrors({ serial_number: 'Este número de serie ya existe' });
            } else {
                setErrors({ submit: error.message || 'Error al guardar la bomba' });
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full my-8">
                {/* Header */}
                <div className="p-6 border-b border-slate-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-slate-900">
                            {isEdit ? 'Editar Bomba' : 'Registrar Nueva Bomba'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                            disabled={loading}
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {/* Section 1: Identification */}
                    <div className="bg-slate-50 p-6 rounded-xl space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Settings size={20} className="text-brand-500" />
                            Identificación
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Serial Number */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Número de Serie <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="serial_number"
                                    value={formData.serial_number}
                                    onChange={handleChange}
                                    placeholder="Ej: ABC-123"
                                    pattern="^[A-Z0-9-]+$"
                                    disabled={loading}
                                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-mono uppercase ${errors.serial_number ? 'border-red-300 bg-red-50' : 'border-slate-300'
                                        }`}
                                />
                                {errors.serial_number ? (
                                    <p className="text-xs text-red-600 mt-1">{errors.serial_number}</p>
                                ) : (
                                    <p className="text-xs text-slate-500 mt-1">Debe ser único en el sistema</p>
                                )}
                            </div>

                            {/* Model */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Modelo
                                </label>
                                <input
                                    type="text"
                                    name="model"
                                    value={formData.model}
                                    onChange={handleChange}
                                    placeholder="Ej: M-200"
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                />
                            </div>

                            {/* Type */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Tipo de Bomba
                                </label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                >
                                    <option value="">Seleccionar tipo/tamaño...</option>
                                    <option value="3 Pulgadas">3 Pulgadas</option>
                                    <option value="4 Pulgadas">4 Pulgadas</option>
                                    <option value="Solar 3 Pulgadas">Solar 3 Pulgadas</option>
                                    <option value="Solar 4 Pulgadas">Solar 4 Pulgadas</option>
                                    <option value="Manual">Manual (Standard)</option>
                                    <option value="Mecánica">Mecánica (Otras)</option>
                                </select>
                            </div>

                            {/* Origin */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Origen
                                </label>
                                <select
                                    name="origin"
                                    value={formData.origin}
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                >
                                    <option value="">Seleccionar origen...</option>
                                    <option value="nueva">Nueva (Comprada)</option>
                                    <option value="fabricada">Fabricada en Taller</option>
                                    <option value="reparada">Reparada</option>
                                    <option value="donada">Donada</option>
                                </select>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Estado
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                >
                                    <option value="almacenada">En Almacén</option>
                                    <option value="instalada">Instalada</option>
                                    <option value="en_reparacion">En Reparación</option>
                                    <option value="dañada">Dañada</option>
                                    <option value="descartada">Descartada</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Origen y Adquisición */}
                    <div className="bg-slate-50 p-6 rounded-xl space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Package size={20} className="text-purple-500" />
                            Origen y Adquisición
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Supplier */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Proveedor
                                </label>
                                <select
                                    name="supplier_id"
                                    value={formData.supplier_id}
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                >
                                    <option value="">Seleccionar proveedor...</option>
                                    {suppliers.map(s => (
                                        <option key={s.supplier_id} value={s.supplier_id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-500 mt-1">Opcional - Si fue comprada o donada</p>
                            </div>

                            {/* Manufacture Date */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                                    <Calendar size={14} />
                                    Fecha de Fabricación
                                </label>
                                <input
                                    type="date"
                                    name="manufacture_date"
                                    value={formData.manufacture_date}
                                    onChange={handleChange}
                                    max={new Date().toISOString().split('T')[0]}
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                />
                            </div>

                            {/* Manufacturing Order ID */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Orden de Fabricación
                                </label>
                                <input
                                    type="number"
                                    name="manufacturing_order_id"
                                    value={formData.manufacturing_order_id}
                                    onChange={handleChange}
                                    placeholder="ID de la orden"
                                    min="1"
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">Opcional - Solo si fue fabricada en taller</p>
                            </div>

                            {/* Storage Location - solo si está almacenada */}
                            {formData.status === 'almacenada' && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                                        <MapPin size={14} />
                                        Ubicación de Almacenamiento
                                    </label>
                                    <input
                                        type="text"
                                        name="storage_location"
                                        value={formData.storage_location}
                                        onChange={handleChange}
                                        placeholder="Ej: Estante A3, Bodega Principal"
                                        disabled={loading}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Ubicación física en el almacén</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 3: Technical Specs */}
                    <div className="bg-slate-50 p-6 rounded-xl space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Wrench size={20} className="text-orange-500" />
                            Especificaciones Técnicas
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Max Depth */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Profundidad Máxima (metros)
                                </label>
                                <input
                                    type="number"
                                    name="max_depth"
                                    value={formData.max_depth}
                                    onChange={handleChange}
                                    placeholder="50"
                                    min="0"
                                    max="500"
                                    step="0.1"
                                    disabled={loading}
                                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errors.max_depth ? 'border-red-300 bg-red-50' : 'border-slate-300'
                                        }`}
                                />
                                {errors.max_depth && (
                                    <p className="text-xs text-red-600 mt-1">{errors.max_depth}</p>
                                )}
                            </div>

                            {/* Capacity */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Capacidad (litros/hora)
                                </label>
                                <input
                                    type="number"
                                    name="capacity"
                                    value={formData.capacity}
                                    onChange={handleChange}
                                    placeholder="1000"
                                    min="0"
                                    disabled={loading}
                                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${errors.capacity ? 'border-red-300 bg-red-50' : 'border-slate-300'
                                        }`}
                                />
                                {errors.capacity && (
                                    <p className="text-xs text-red-600 mt-1">{errors.capacity}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Notes */}
                    <div className="bg-slate-50 p-6 rounded-xl space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">
                            Notas y Observaciones
                        </h3>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            placeholder="Detalles adicionales sobre el estado o características de la bomba..."
                            rows={4}
                            disabled={loading}
                        />
                    </div>

                    {/* Submit Error */}
                    {errors.submit && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-2">
                            <Activity size={16} />
                            {errors.submit}
                        </div>
                    )}
                </form>
                {/* Form Actions */}
                <div className="p-6 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-6 py-2.5 text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-bold shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading && <Loader className="animate-spin" size={16} />}
                        {loading ? 'Guardando...' : (isEdit ? 'Actualizar Bomba' : 'Registrar Bomba')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PumpFormModal;
