
import React, { useState, useEffect } from 'react';
import {
    Search, Plus, Truck, MoreVertical, Edit2, Trash2,
    Car, Bike, AlertCircle, CheckCircle2, XCircle
} from 'lucide-react';
import { VehicleService } from '../../services/vehicleService';
import VehicleModal from './VehicleModal';

const VehicleManager = () => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);

    // Initial Load
    useEffect(() => {
        loadVehicles();
    }, []);

    const loadVehicles = async () => {
        setLoading(true);
        try {
            const data = await VehicleService.getVehicles();
            setVehicles(data || []);
        } catch (error) {
            console.error("Error loading vehicles:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Está seguro de eliminar este vehículo?")) return;
        try {
            await VehicleService.deleteVehicle(id);
            loadVehicles();
        } catch (error) {
            console.error("Error deleting vehicle:", error);
            alert("Error al eliminar el vehículo");
        }
    };

    const handleEdit = (vehicle) => {
        setSelectedVehicle(vehicle);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedVehicle(null);
        setIsModalOpen(true);
    };

    // Filter Logic
    const filteredVehicles = vehicles.filter(v =>
        v.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.model?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Helper for Icons
    const getVehicleIcon = (type) => {
        switch (type) {
            case 'MOTO': return <Bike size={24} />;
            case 'AUTO': return <Car size={24} />;
            case 'MAQUINARIA': return <Settings size={24} />; // Using generic settings icon if Tractor not available or import Settings
            default: return <Truck size={24} />;
        }
    };

    // Helper for Status Color
    const getStatusColor = (status) => {
        switch (status) {
            case 'DISPONIBLE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'MANTENIMIENTO': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'EN_USO': return 'bg-brand-100 text-brand-700 border-brand-200';
            case 'FUERA_DE_SERVICIO': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por placa, marca..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-brand-300 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={handleCreate}
                    className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl shadow-sm font-medium flex items-center justify-center gap-2 transition-all hover:translate-y-[-1px]"
                >
                    <Plus size={20} />
                    <span>Nuevo Vehículo</span>
                </button>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                </div>
            ) : filteredVehicles.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Truck className="text-slate-300" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-1">No se encontraron vehículos</h3>
                    <p className="text-slate-500">Intenta registrar uno nuevo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredVehicles.map(vehicle => (
                        <div key={vehicle.vehicle_id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-4 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 bg-gradient-to-l from-white via-white to-transparent">
                                <button
                                    onClick={() => handleEdit(vehicle)}
                                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                    title="Editar"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(vehicle.vehicle_id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="flex items-start gap-4 mb-3">
                                <div className={`p-3 rounded-xl ${getStatusColor(vehicle.status).replace('text-', 'bg-opacity-20 ')}`}>
                                    {getVehicleIcon(vehicle.vehicle_type)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">{vehicle.plate_number}</h3>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                                        {vehicle.make} {vehicle.model}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(vehicle.status)}`}>
                                    {vehicle.status === 'DISPONIBLE' && <CheckCircle2 size={12} />}
                                    {vehicle.status === 'MANTENIMIENTO' && <AlertCircle size={12} />}
                                    {vehicle.status === 'FUERA_DE_SERVICIO' && <XCircle size={12} />}
                                    {vehicle.status}
                                </span>

                                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 mt-2">
                                    <span>Capacidad: {vehicle.capacity_passengers} pax</span>
                                    <span>{vehicle.vehicle_type}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <VehicleModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadVehicles}
                vehicleToEdit={selectedVehicle}
            />
        </div>
    );
};

export default VehicleManager;
