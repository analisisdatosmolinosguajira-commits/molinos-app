
import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Truck, Info, Settings } from 'lucide-react';
import { VehicleService } from '../../services/vehicleService';

const VehicleModal = ({ isOpen, onClose, onSuccess, vehicleToEdit = null }) => {
    const [formData, setFormData] = useState({
        plate_number: '',
        make: '',
        model: '',
        vehicle_type: 'CAMIONETA',
        capacity_passengers: 4,
        status: 'DISPONIBLE',
        notes: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Load data if editing
    useEffect(() => {
        if (vehicleToEdit) {
            setFormData({
                plate_number: vehicleToEdit.plate_number || '',
                make: vehicleToEdit.make || '',
                model: vehicleToEdit.model || '',
                vehicle_type: vehicleToEdit.vehicle_type || 'CAMIONETA',
                capacity_passengers: vehicleToEdit.capacity_passengers || 4,
                status: vehicleToEdit.status || 'DISPONIBLE',
                notes: vehicleToEdit.notes || ''
            });
        } else {
            // Reset form for new vehicle
            setFormData({
                plate_number: '',
                make: '',
                model: '',
                vehicle_type: 'CAMIONETA',
                capacity_passengers: 4,
                status: 'DISPONIBLE',
                notes: ''
            });
        }
        setError(null);
    }, [vehicleToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (vehicleToEdit) {
                await VehicleService.updateVehicle(vehicleToEdit.vehicle_id, formData);
            } else {
                await VehicleService.createVehicle(formData);
            }
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Error saving vehicle:", err);
            setError("Error al guardar el vehículo. Verifique los datos.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Truck className="text-indigo-600" size={20} />
                        {vehicleToEdit ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 text-sm border border-red-100">
                            <AlertCircle size={16} className="flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* Plate Number */}
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Placa</label>
                            <input
                                type="text"
                                required
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none uppercase font-mono"
                                value={formData.plate_number}
                                onChange={e => setFormData({ ...formData, plate_number: e.target.value.toUpperCase() })}
                                placeholder="ABC-123"
                            />
                        </div>

                        {/* Status */}
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estado</label>
                            <select
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="DISPONIBLE">Disponible</option>
                                <option value="MANTENIMIENTO">En Mantenimiento</option>
                                <option value="EN_USO">En Uso</option>
                                <option value="FUERA_DE_SERVICIO">Fuera de Servicio</option>
                            </select>
                        </div>

                        {/* Brand */}
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Marca</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                                value={formData.make}
                                onChange={e => setFormData({ ...formData, make: e.target.value })}
                                placeholder="Toyota"
                            />
                        </div>

                        {/* Model */}
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Modelo</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                                value={formData.model}
                                onChange={e => setFormData({ ...formData, model: e.target.value })}
                                placeholder="Hilux"
                            />
                        </div>

                        {/* Type */}
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                            <select
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                                value={formData.vehicle_type}
                                onChange={e => setFormData({ ...formData, vehicle_type: e.target.value })}
                            >
                                <option value="CAMIONETA">Camioneta</option>
                                <option value="CAMION">Camión</option>
                                <option value="MOTO">Moto</option>
                                <option value="AUTO">Auto</option>
                                <option value="MAQUINARIA">Maquinaria</option>
                                <option value="OTRO">Otro</option>
                            </select>
                        </div>

                        {/* Capacity */}
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pasajeros</label>
                            <input
                                type="number"
                                min="1"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                                value={formData.capacity_passengers}
                                onChange={e => setFormData({ ...formData, capacity_passengers: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        {/* Notes */}
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notas</label>
                            <textarea
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none resize-none h-20"
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Información adicional..."
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl shadow-md font-medium flex items-center gap-2 transition-all hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            {vehicleToEdit ? 'Guardar Cambios' : 'Registrar Vehículo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VehicleModal;
