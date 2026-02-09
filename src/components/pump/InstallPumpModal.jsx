import React, { useState, useEffect } from 'react';
import { X, Search, MapPin, Wind, CheckCircle } from 'lucide-react';
import { MillService } from '../../services/mills';

export default function InstallPumpModal({ isOpen, onClose, pump, onInstall }) {
    const [mills, setMills] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMill, setSelectedMill] = useState(null);

    useEffect(() => {
        if (isOpen) {
            loadAvailableMills();
        }
    }, [isOpen]);

    const loadAvailableMills = async () => {
        try {
            setLoading(true);
            // Get all mills - in the future, filter only those without active pumps
            const allMills = await MillService.getAllMills();
            setMills(allMills);
        } catch (error) {
            console.error('Error loading mills:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredMills = mills.filter(mill =>
        mill.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mill.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mill.community_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleInstall = () => {
        if (selectedMill) {
            // Prepare data for Work Order creation
            const workOrderData = {
                mill_id: selectedMill.mill_id,
                pump_id_to_install: pump.pump_id,
                type: 'INSTALACION_BOMBA',
                description: `Instalación de bomba ${pump.model} (SN: ${pump.serial_number}) en molino ${selectedMill.code}`,
                priority: 'MEDIA',
                // Future: navigate to /ordenes/new with this prefilled data
            };

            onInstall(workOrderData);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up">
                {/* Header */}
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-2xl font-bold text-slate-900">Instalar Bomba</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>
                    <p className="text-sm text-slate-500">
                        Selecciona el molino donde instalar: <span className="font-semibold text-slate-700">{pump?.model} (SN: {pump?.serial_number})</span>
                    </p>
                </div>

                {/* Search Bar */}
                <div className="p-6 border-b border-slate-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, código o comunidad..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Mills List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-slate-500">Cargando molinos...</p>
                        </div>
                    ) : filteredMills.length > 0 ? (
                        filteredMills.map((mill) => (
                            <div
                                key={mill.mill_id}
                                onClick={() => setSelectedMill(mill)}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedMill?.mill_id === mill.mill_id
                                        ? 'border-brand-500 bg-brand-50'
                                        : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1">
                                        <div className={`p-2 rounded-lg ${selectedMill?.mill_id === mill.mill_id
                                                ? 'bg-brand-100 text-brand-600'
                                                : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            <Wind size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-900">{mill.name || 'Sin nombre'}</h3>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                                <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                                                    {mill.code}
                                                </span>
                                                {mill.community_name && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={14} />
                                                        {mill.community_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {selectedMill?.mill_id === mill.mill_id && (
                                        <CheckCircle className="text-brand-600" size={24} />
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 bg-slate-50 rounded-xl">
                            <p className="text-slate-500">No se encontraron molinos</p>
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="mt-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
                                >
                                    Limpiar búsqueda
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleInstall}
                        disabled={!selectedMill}
                        className={`px-6 py-2 rounded-xl font-bold transition-all ${selectedMill
                                ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-500/30'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        {selectedMill
                            ? `Crear Orden de Trabajo`
                            : 'Selecciona un molino'}
                    </button>
                </div>
            </div>
        </div>
    );
}
