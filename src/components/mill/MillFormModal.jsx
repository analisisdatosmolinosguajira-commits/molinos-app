import React, { useState, useEffect } from 'react';
import { X, Loader, MapPin, Calendar, Activity } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { MillService } from '../../services/mills';

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
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        community_id: '',
        location_details: '',
        status: 'OPERATIONAL',
        install_date: '',
        last_maintenance_reported_date: '',
        technical_specs: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            loadCommunities();
            if (millData) {
                // Populate form with existing data
                setFormData({
                    code: millData.code || '',
                    name: millData.name || '',
                    community_id: millData.community_id || '',
                    location_details: millData.location_details || '',
                    status: millData.status || 'OPERATIONAL',
                    install_date: millData.install_date || '',
                    last_maintenance_reported_date: millData.last_maintenance_reported_date || '',
                    technical_specs: millData.technical_specs || ''
                });
            } else {
                // Reset form for create mode
                setFormData({
                    code: '',
                    name: '',
                    community_id: '',
                    location_details: '',
                    status: 'OPERATIONAL',
                    install_date: '',
                    last_maintenance_reported_date: '',
                    technical_specs: ''
                });
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
            // Prepare data
            const dataToSave = {
                ...formData,
                install_date: formData.install_date || null,
                last_maintenance_reported_date: formData.last_maintenance_reported_date || null
            };

            if (isEdit) {
                // Update existing mill
                await MillService.updateMill(millData.mill_id, dataToSave);
            } else {
                // Create new mill
                await MillService.createMill(dataToSave);
            }

            onSuccess();
            onClose();
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
                                    name="location_details"
                                    value={formData.location_details}
                                    onChange={handleChange}
                                    placeholder="Coordenadas, referencias, cómo llegar..."
                                    rows={3}
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
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
                                    name="install_date"
                                    value={formData.install_date}
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

                    {/* Section 4: Technical Specs */}
                    <div className="bg-slate-50 p-6 rounded-xl space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">
                            Especificaciones Técnicas
                        </h3>
                        <textarea
                            name="technical_specs"
                            value={formData.technical_specs}
                            onChange={handleChange}
                            placeholder="Altura de torre, capacidad, tipo de estructura, etc."
                            rows={4}
                            disabled={loading}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
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
