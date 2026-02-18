import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, FileText, Briefcase } from 'lucide-react';
import { createPortal } from 'react-dom';
import { OperationalStaffService } from '../../services/operationalStaff';

export default function OperationalStaffModal({ isOpen, onClose, onSave, person = null }) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [roles, setRoles] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        document_id: '',
        email: '',
        specialty: '',
        phone: '',
        role_id: ''
    });

    useEffect(() => {
        if (isOpen) {
            loadRoles();
            if (person) {
                // Edit Mode
                setFormData({
                    first_name: person.first_name || '',
                    last_name: person.last_name || '',
                    document_id: person.document_id || '',
                    email: person.email || '',
                    specialty: person.specialty || '',
                    phone: person.phone || '',
                    role_id: person.roleId || person.person_role?.role_id || ''
                });
            } else {
                // Add Mode - Reset
                setFormData({
                    first_name: '',
                    last_name: '',
                    document_id: '',
                    email: '',
                    specialty: '',
                    phone: '',
                    role_id: ''
                });
            }
        }
    }, [isOpen, person]);

    const loadRoles = async () => {
        try {
            const data = await OperationalStaffService.getOperationalRoles();
            setRoles(data);
            // Set default role if adding new and not set
            if (!person && data.length > 0 && !formData.role_id) {
                setFormData(prev => ({ ...prev, role_id: data[0].role_id }));
            }
        } catch (err) {
            console.error("Error loading roles:", err);
            setError("Error al cargar roles.");
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            if (person) {
                await OperationalStaffService.updateStaffMember(person.person_id, formData);
            } else {
                await OperationalStaffService.createStaffMember(formData);
            }
            onSave();
            onClose();
        } catch (err) {
            console.error("Error saving staff:", err);
            setError(err.message || "Error al guardar personal.");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-800">
                        {person ? 'Editar Personal' : 'Nuevo Personal'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Nombre
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    required
                                    placeholder="Ej. Juan"
                                />
                                <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Apellido
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    required
                                    placeholder="Ej. Pérez"
                                />
                                <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Cédula / Identificación
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="document_id"
                                    value={formData.document_id}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    placeholder="Ej. 1234567890"
                                />
                                <FileText className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Especialidad
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="specialty"
                                    value={formData.specialty}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    placeholder="Ej. Electricista"
                                />
                                <Briefcase className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Teléfono
                            </label>
                            <div className="relative">
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    placeholder="Ej. 300 123 4567"
                                />
                                <Phone className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Email
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    placeholder="Ej. correo@ejemplo.com"
                                />
                                <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Cargo / Rol
                        </label>
                        <div className="relative">
                            <select
                                name="role_id"
                                value={formData.role_id}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent appearance-none"
                                required
                            >
                                <option value="">Seleccione un rol...</option>
                                {roles.map(role => (
                                    <option key={role.role_id} value={role.role_id}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                            <Briefcase className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                            disabled={saving}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg shadow-sm font-medium transition-colors flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    {person ? 'Actualizar' : 'Guardar'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
