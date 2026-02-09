import React, { useState, useEffect } from 'react';
import { X, Loader, MapPin, Calendar, Activity, FileText, Link2, Boxes, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { MillService } from '../../services/mills';
import { ComponentService } from '../../services/components';

/**
 * Create/Edit Mill Modal
 * Form for creating new mill or editing existing one
 * 
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Callback to close modal
 * @param {function} onSuccess - Callback after successful save
 * @param {object} millData - Existing mill data for edit mode (null for create)
 */
const MillFormModal = ({ isOpen, onClose, onSuccess, millData = null }) => {
    const isEdit = !!millData;
    const [loading, setLoading] = useState(false);
    const [communities, setCommunities] = useState([]);
    const [availableComponents, setAvailableComponents] = useState([]);
    const [formData, setFormData] = useState({
        code: '',
        registration_number: '',
        name: '',
        community_id: '',
        location_description: '',
        latitude: '',
        longitude: '',
        model: '',
        manufacturer: '',
        installation_date: '',
        status: 'OPERATIONAL',
        last_maintenance_reported_date: '',
        notes: '',
        technical_specs_url: ''
    });
    const [selectedComponents, setSelectedComponents] = useState([]);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            loadCommunities();
            loadComponents();
            if (millData) {
                // Populate form with existing data
                setFormData({
                    code: millData.code || '',
                    registration_number: millData.registration_number || '',
                    name: millData.name || '',
                    community_id: millData.community_id || '',
                    location_description: millData.location_description || '',
                    latitude: millData.latitude || '',
                    longitude: millData.longitude || '',
                    model: millData.model || '',
                    manufacturer: millData.manufacturer || '',
                    installation_date: millData.installation_date || '',
                    status: millData.status || 'OPERATIONAL',
                    last_maintenance_reported_date: millData.last_maintenance_reported_date || '',
                    notes: millData.notes || '',
                    technical_specs_url: millData.technical_specs_url || ''
                });
                // Load existing components for this mill
                if (isEdit) {
                    loadMillComponents(millData.mill_id);
                }
            } else {
                // Reset form for create mode
                setFormData({
                    code: '',
                    registration_number: '',
                    name: '',
                    community_id: '',
                    location_description: '',
                    latitude: '',
                    longitude: '',
                    model: '',
                    manufacturer: '',
                    installation_date: '',
                    status: 'OPERATIONAL',
                    last_maintenance_reported_date: '',
                    notes: '',
                    technical_specs_url: ''
                });
                setSelectedComponents([]);
            }
            setErrors({});
        }
    }, [isOpen, millData]);

    const loadCommunities = async () => {
        try {
            const { data, error } = await supabase
                .from('community')
                .select('community_id, name')
                .order('name');

            if (error) throw error;
            setCommunities(data || []);
        } catch (error) {
            console.error('Error loading communities:', error);
        }
    };

    const loadComponents = async () => {
        try {
            const components = await ComponentService.getAllComponents();
            setAvailableComponents(components);
        } catch (error) {
            console.error('Error loading components:', error);
        }
    };

    const loadMillComponents = async (millId) => {
        try {
            console.log('🔍 Loading components for mill:', millId);
            const millComponents = await ComponentService.getMillComponents(millId);
            console.log('📦 Components received from service:', millComponents);

            // Transform to selectedComponents format
            const formatted = millComponents.map(mc => ({
                component_id: mc.component_id,
                component_name: mc.mill_component?.name || 'Unknown',
                component_code: mc.mill_component?.code || 'Unknown',
                installed_date: mc.installed_date || '',
                status: mc.status || 'FUNCIONAL',
                relation_id: mc.id  // For deletion later
            }));

            console.log('✅ Formatted components for form:', formatted);
            setSelectedComponents(formatted);
        } catch (error) {
            console.error('❌ Error loading mill components:', error);
            setSelectedComponents([]);
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

    const handleAddComponent = (componentId) => {
        const component = availableComponents.find(c => c.component_id === parseInt(componentId));
        if (!component) return;

        // Check if already selected
        if (selectedComponents.find(sc => sc.component_id === component.component_id)) {
            return;
        }

        setSelectedComponents(prev => [...prev, {
            component_id: component.component_id,
            component_name: component.name,
            component_code: component.code,
            installed_date: new Date().toISOString().split('T')[0],
            status: 'FUNCIONAL',
            relation_id: null  // New component, no DB relation yet
        }]);
    };

    const handleRemoveComponent = (index) => {
        setSelectedComponents(prev => prev.filter((_, i) => i !== index));
    };

    const handleComponentChange = (index, field, value) => {
        setSelectedComponents(prev => prev.map((comp, i) =>
            i === index ? { ...comp, [field]: value } : comp
        ));
    };

    const validate = () => {
        const newErrors = {};

        // Code validation
        if (!formData.code.trim()) {
            newErrors.code = 'El código es requerido';
        } else if (!/^[A-Z]{3}-\d{3}$/.test(formData.code)) {
            newErrors.code = 'Formato inválido. Use: XXX-###';
        }

        // Community validation
        if (!formData.community_id) {
            newErrors.community_id = 'Debe seleccionar una comunidad';
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
            // Prepare mill data with all fields
            const dataToSave = {
                code: formData.code.trim(),
                registration_number: formData.registration_number || null,
                name: formData.name || null,
                community_id: parseInt(formData.community_id),
                location_description: formData.location_description || null,
                latitude: formData.latitude ? parseFloat(formData.latitude) : null,
                longitude: formData.longitude ? parseFloat(formData.longitude) : null,
                model: formData.model || null,
                manufacturer: formData.manufacturer || null,
                installation_date: formData.installation_date || null,
                status: formData.status,
                last_maintenance_reported_date: formData.last_maintenance_reported_date || null,
                notes: formData.notes || null,
                technical_specs_url: formData.technical_specs_url || null
            };

            let millId;

            if (isEdit) {
                // Update existing mill
                await MillService.updateMill(millData.mill_id, dataToSave);
                millId = millData.mill_id;

                // Update components strategy:
                // 1. Get ALL existing components for this mill
                // 2. Delete ALL of them
                // 3. Re-add only the ones currently selected
                try {
                    const existingMillComponents = await ComponentService.getMillComponents(millId);

                    // Delete all existing component relations
                    for (const comp of existingMillComponents) {
                        await ComponentService.removeComponentFromMill(comp.id);
                    }
                } catch (error) {
                    console.error('Error removing old components:', error);
                    // Continue anyway to add new components
                }
            } else {
                // Create new mill
                const result = await MillService.createMill(dataToSave);
                millId = result.mill_id;
            }

            // Add all selected components (works for both create and edit)
            for (const component of selectedComponents) {
                await ComponentService.addComponentToMill({
                    mill_id: millId,
                    component_id: component.component_id,
                    installed_date: component.installed_date || null,
                    status: component.status || 'FUNCIONAL'
                });
            }

            // Close modal first, then reload data
            onClose();

            // Small delay to ensure DB has committed the transaction
            setTimeout(() => {
                onSuccess();
            }, 100);
        } catch (error) {
            console.error('Error saving mill:', error);
            if (error.message.includes('duplicate') || error.code === '23505') {
                setErrors({ code: 'Este código ya existe' });
            } else {
                setErrors({ submit: error.message || 'Error al guardar el molino' });
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
                            {isEdit ? 'Editar Molino' : 'Agregar Nuevo Molino'}
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
                    {/* Section 1: Basic Information */}
                    <div className="bg-slate-50 p-6 rounded-xl space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">
                            Información Básica
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Code */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Código del Molino <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="code"
                                    value={formData.code}
                                    onChange={handleChange}
                                    placeholder="Ej: LAG-001"
                                    pattern="^[A-Z]{3}-\d{3}$"
                                    disabled={loading}
                                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono uppercase ${errors.code ? 'border-red-300 bg-red-50' : 'border-slate-300'
                                        }`}
                                />
                                {errors.code ? (
                                    <p className="text-xs text-red-600 mt-1">{errors.code}</p>
                                ) : (
                                    <p className="text-xs text-slate-500 mt-1">Formato: XXX-###</p>
                                )}
                            </div>

                            {/* Registration Number */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Número de Registro
                                </label>
                                <input
                                    type="text"
                                    name="registration_number"
                                    value={formData.registration_number}
                                    onChange={handleChange}
                                    placeholder="Ej: REG-2024-001"
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Nombre del Molino
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Ej: Molino Central"
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Specifications */}
                    <div className="bg-slate-50 p-6 rounded-xl space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Activity size={20} className="text-green-500" />
                            Especificaciones del Molino
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    placeholder="Ej: TIPO A-20"
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Manufacturer */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Fabricante
                                </label>
                                <input
                                    type="text"
                                    name="manufacturer"
                                    value={formData.manufacturer}
                                    onChange={handleChange}
                                    placeholder="Ej: Empresas Varias"
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Location */}
                    <div className="bg-slate-50 p-6 rounded-xl space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <MapPin size={20} className="text-blue-500" />
                            Ubicación
                        </h3>
                        <div className="space-y-4">
                            {/* Community */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Comunidad <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="community_id"
                                    value={formData.community_id}
                                    onChange={handleChange}
                                    disabled={loading}
                                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.community_id ? 'border-red-300 bg-red-50' : 'border-slate-300'
                                        }`}
                                >
                                    <option value="">Seleccionar comunidad...</option>
                                    {communities.map(c => (
                                        <option key={c.community_id} value={c.community_id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.community_id && (
                                    <p className="text-xs text-red-600 mt-1">{errors.community_id}</p>
                                )}
                            </div>

                            {/* Location Details */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Detalles de Ubicación
                                </label>
                                <textarea
                                    name="location_description"
                                    value={formData.location_description}
                                    onChange={handleChange}
                                    placeholder="Coordenadas, referencias, cómo llegar..."
                                    rows={3}
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Coordinates */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Latitude */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Latitud
                                    </label>
                                    <input
                                        type="number"
                                        name="latitude"
                                        value={formData.latitude}
                                        onChange={handleChange}
                                        placeholder="11.123456"
                                        step="0.000001"
                                        disabled={loading}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Longitude */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Longitud
                                    </label>
                                    <input
                                        type="number"
                                        name="longitude"
                                        value={formData.longitude}
                                        onChange={handleChange}
                                        placeholder="-72.123456"
                                        step="0.000001"
                                        disabled={loading}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Operational Status */}
                    <div className="bg-slate-50 p-6 rounded-xl space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Activity size={20} className="text-green-500" />
                            Estado Operacional
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Status */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Estado <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="OPERATIONAL">Operativo</option>
                                    <option value="NON_OPERATIONAL">Inoperativo</option>
                                    <option value="UNDER_MAINTENANCE">En Mantenimiento</option>
                                    <option value="DECOMMISSIONED">Desmantelado</option>
                                </select>
                            </div>

                            {/* Install Date */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                                    <Calendar size={14} />
                                    Fecha de Instalación
                                </label>
                                <input
                                    type="date"
                                    name="installation_date"
                                    value={formData.installation_date}
                                    onChange={handleChange}
                                    max={new Date().toISOString().split('T')[0]}
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Last Maintenance */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                                    <Calendar size={14} />
                                    Última Fecha de Mantenimiento
                                </label>
                                <input
                                    type="date"
                                    name="last_maintenance_reported_date"
                                    value={formData.last_maintenance_reported_date}
                                    onChange={handleChange}
                                    max={new Date().toISOString().split('T')[0]}
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 5: Components */}
                    <div className="bg-slate-50 p-6 rounded-xl space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Boxes size={20} className="text-purple-500" />
                                Componentes del Molino
                            </h3>
                            <select
                                onChange={(e) => { handleAddComponent(e.target.value); e.target.value = ''; }}
                                disabled={loading}
                                className="px-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">+ Agregar Componente</option>
                                {availableComponents.filter(ac =>
                                    !selectedComponents.find(sc => sc.component_id === ac.component_id)
                                ).map(comp => (
                                    <option key={comp.component_id} value={comp.component_id}>
                                        {comp.code} - {comp.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {selectedComponents.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">No se han agregado componentes</p>
                        ) : (
                            <div className="space-y-2">
                                {selectedComponents.map((comp, index) => (
                                    <div key={index} className="bg-white p-4 rounded-lg border border-slate-200 grid grid-cols-12 gap-3 items-center">
                                        <div className="col-span-4">
                                            <p className="text-sm font-semibold text-slate-900">{comp.component_name}</p>
                                            <p className="text-xs text-slate-500">{comp.component_code}</p>
                                        </div>
                                        <div className="col-span-3">
                                            <input
                                                type="date"
                                                value={comp.installed_date}
                                                onChange={(e) => handleComponentChange(index, 'installed_date', e.target.value)}
                                                disabled={loading}
                                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                            />
                                        </div>
                                        <div className="col-span-4">
                                            <select
                                                value={comp.status}
                                                onChange={(e) => handleComponentChange(index, 'status', e.target.value)}
                                                disabled={loading}
                                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                            >
                                                <option value="FUNCIONAL">Funcional</option>
                                                <option value="DANADO">Dañado</option>
                                                <option value="REQUIERE_CAMBIO">Requiere Cambio</option>
                                                <option value="NO_INSTALADO">No Instalado</option>
                                            </select>
                                        </div>
                                        <div className="col-span-1 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveComponent(index)}
                                                disabled={loading}
                                                className="text-red-500 hover:text-red-700 p-1"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Section 6: Documentation */}
                    <div className="bg-slate-50 p-6 rounded-xl space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <FileText size={20} className="text-orange-500" />
                            Documentación
                        </h3>
                        <div className="space-y-4">
                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Notas
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    placeholder="Observaciones, historial, comentarios..."
                                    rows={3}
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Technical Specs URL */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                                    <Link2 size={14} />
                                    URL de Especificaciones Técnicas
                                </label>
                                <input
                                    type="url"
                                    name="technical_specs_url"
                                    value={formData.technical_specs_url}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">Enlace a documentación externa (planos, manuales, etc.)</p>
                            </div>
                        </div>
                    </div>

                    {/* Submit Error */}
                    {
                        errors.submit && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <p className="text-sm text-red-700">{errors.submit}</p>
                            </div>
                        )
                    }
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
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading && <Loader className="animate-spin" size={16} />}
                        {loading ? 'Guardando...' : (isEdit ? 'Actualizar Molino' : 'Crear Molino')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MillFormModal;
