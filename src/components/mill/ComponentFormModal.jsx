import React, { useState, useEffect } from 'react';
import { X, Loader, Box } from 'lucide-react';
import { ComponentService } from '../../services/components';

/**
 * Component Form Modal
 * For creating/editing mill components (master catalog)
 */
const ComponentFormModal = ({ isOpen, onClose, onSuccess, componentData = null }) => {
    const isEdit = !!componentData;
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        code: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            if (componentData) {
                setFormData({
                    name: componentData.name || '',
                    code: componentData.code || ''
                });
            } else {
                setFormData({ name: '', code: '' });
            }
            setErrors({});
        }
    }, [isOpen, componentData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'El nombre es requerido';
        }

        if (!formData.code.trim()) {
            newErrors.code = 'El código es requerido';
        } else if (!/^[A-Z0-9-]+$/.test(formData.code.toUpperCase())) {
            newErrors.code = 'Solo letras mayúsculas, números y guiones';
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
            const dataToSave = {
                name: formData.name.trim(),
                code: formData.code.trim().toUpperCase()
            };

            if (isEdit) {
                await ComponentService.updateComponent(componentData.component_id, dataToSave);
            } else {
                await ComponentService.createComponent(dataToSave);
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving component:', error);
            if (error.message.includes('duplicate') || error.code === '23505') {
                setErrors({
                    submit: 'Ya existe un componente con este código o nombre',
                    code: 'Este código ya existe',
                    name: 'Este nombre ya existe'
                });
            } else {
                setErrors({ submit: error.message || 'Error al guardar el componente' });
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="p-6 border-b border-slate-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Box size={24} className="text-purple-600" />
                            {isEdit ? 'Editar Componente' : 'Agregar Componente'}
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
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Code */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Código <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="code"
                            value={formData.code}
                            onChange={handleChange}
                            placeholder="Ej: BOM-HID, TOR-001"
                            disabled={loading}
                            className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono uppercase ${errors.code ? 'border-red-300 bg-red-50' : 'border-slate-300'
                                }`}
                        />
                        {errors.code ? (
                            <p className="text-xs text-red-600 mt-1">{errors.code}</p>
                        ) : (
                            <p className="text-xs text-slate-500 mt-1">Solo letras, números y guiones</p>
                        )}
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Nombre <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Ej: Bomba Hidráulica, Torre Principal"
                            disabled={loading}
                            className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${errors.name ? 'border-red-300 bg-red-50' : 'border-slate-300'
                                }`}
                        />
                        {errors.name && (
                            <p className="text-xs text-red-600 mt-1">{errors.name}</p>
                        )}
                    </div>

                    {/* Submit Error */}
                    {errors.submit && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                            <p className="text-sm text-red-800">{errors.submit}</p>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader size={18} className="animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                isEdit ? 'Actualizar' : 'Crear Componente'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ComponentFormModal;
