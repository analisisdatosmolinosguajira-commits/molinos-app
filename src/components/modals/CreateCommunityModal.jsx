import React, { useState, useEffect } from 'react';
import { X, MapPin, Factory, Loader } from 'lucide-react';

const DEPARTMENTS = ['La Guajira', 'Cesar', 'Magdalena', 'Atlantico']; // Extend as needed

const CreateCommunityModal = ({ isOpen, onClose, onSave, initialData = null }) => {
    const [formData, setFormData] = useState({
        name: '',
        municipality: '',
        department: DEPARTMENTS[0],
        latitude: '',
        longitude: '',
        location_description: '',
        notes: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    name: initialData.name || '',
                    municipality: initialData.municipality || '',
                    department: initialData.department || DEPARTMENTS[0],
                    latitude: initialData.latitude || '',
                    longitude: initialData.longitude || '',
                    location_description: initialData.location_description || '',
                    notes: initialData.notes || ''
                });
            } else {
                setFormData({
                    name: '',
                    municipality: '',
                    department: DEPARTMENTS[0],
                    latitude: '',
                    longitude: '',
                    location_description: '',
                    notes: ''
                });
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error(error);
            alert("Error al guardar comunidad");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-800 text-lg">
                        {initialData ? 'Editar Comunidad' : 'Nueva Comunidad'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                        <input
                            required
                            type="text"
                            placeholder="Ej. Comunidad San José"
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Departamento</label>
                            <select
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                                value={formData.department}
                                onChange={e => setFormData({ ...formData, department: e.target.value })}
                            >
                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Municipio</label>
                            <input
                                required
                                type="text"
                                placeholder="Ej. Uribia"
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                value={formData.municipality}
                                onChange={e => setFormData({ ...formData, municipality: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Latitud</label>
                            <input
                                type="number"
                                step="any"
                                placeholder="Ej. 11.543..."
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                value={formData.latitude}
                                onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Longitud</label>
                            <input
                                type="number"
                                step="any"
                                placeholder="Ej. -72.123..."
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                value={formData.longitude}
                                onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descripción de Ubicación</label>
                        <textarea
                            rows={2}
                            placeholder="Referencias para llegar..."
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
                            value={formData.location_description}
                            onChange={e => setFormData({ ...formData, location_description: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notas Adicionales</label>
                        <textarea
                            rows={3}
                            placeholder="Información relevante..."
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-medium shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving && <Loader size={16} className="animate-spin" />}
                            {initialData ? 'Guardar Cambios' : 'Crear Comunidad'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateCommunityModal;
