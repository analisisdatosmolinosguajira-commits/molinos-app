import React, { useState, useEffect } from 'react';
import { Droplet, Search, Filter, Plus, Wrench, Wind, MapPin } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import PumpDetail from './PumpDetail';
import { PumpService } from '../../services/pumps';

export default function BombasPage() {
    const [pumps, setPumps] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPumpId, setSelectedPumpId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadPumps() {
            try {
                setLoading(true);
                const data = await PumpService.getPumps();
                setPumps(data || []);
            } catch (err) {
                console.error("Error loading pumps:", err);
                setError("No se pudieron cargar las bombas.");
            } finally {
                setLoading(false);
            }
        }
        loadPumps();
    }, []);

    // Toggle Detail View
    if (selectedPumpId) {
        return <PumpDetail pumpId={selectedPumpId} onBack={() => setSelectedPumpId(null)} />;
    }

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando inventario...</div>;
    if (error) return (
        <div className="p-8 text-center text-red-500">
            <p className="font-bold">No se pudieron cargar las bombas.</p>
            <p className="text-sm mt-2 font-mono bg-red-50 p-2 rounded inline-block text-red-700">
                {typeof error === 'object' ? JSON.stringify(error) : error}
            </p>
        </div>
    );

    // Filter
    const filteredPumps = pumps.filter(p =>
        (p.serial_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.model || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestión de Bombas</h1>
                    <p className="text-slate-500 mt-1">Inventario y estado de equipos de bombeo</p>
                </div>
                <button className="bg-brand-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all font-medium">
                    <Plus size={20} />
                    Nueva Bomba
                </button>
            </div>

            {/* Kpi Mini */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-lg"><Droplet size={24} /></div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{pumps.filter(p => p.status === 'instalada').length}</p>
                        <p className="text-xs text-slate-500 font-medium uppercase">Instaladas</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Filter size={24} /></div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{pumps.filter(p => p.status === 'almacenada' || p.status === 'nueva').length}</p>
                        <p className="text-xs text-slate-500 font-medium uppercase">En Almacén</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-lg"><Wrench size={24} /></div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{pumps.filter(p => p.status === 'en_reparacion' || p.status === 'descartada').length}</p>
                        <p className="text-xs text-slate-500 font-medium uppercase">En Taller/Dañadas</p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h2 className="font-bold text-slate-700">Inventario Completo</h2>
                    <div className="flex gap-2">
                        <input
                            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-300"
                            placeholder="Buscar serial..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4">Serial / Modelo</th>
                            <th className="px-6 py-4">Estado</th>
                            <th className="px-6 py-4">Ubicación Actual</th>
                            <th className="px-6 py-4">Detalles Salud</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredPumps.map(pump => (
                            <tr key={pump.pump_id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <p className="font-bold text-slate-800">{pump.serial_number}</p>
                                    <p className="text-xs text-slate-500">{pump.model}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={pump.status} size="sm" />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {pump.status === 'instalada' ? <Wind size={14} className="text-slate-400" /> : <MapPin size={14} className="text-slate-400" />}
                                        <span className={pump.status === 'instalada' ? 'font-medium text-brand-600' : 'text-slate-600'}>
                                            {/* Logic to show joined mill name would likely need a standard join in service, 
                                                currently assuming status or simple location field if available.
                                                Service does join mill_pump -> mill(name).
                                                We need to find the active installation from the joined mill_pump array.
                                            */}
                                            {pump.mill_pump?.find(mp => !mp.removal_date)?.mill?.name || pump.storage_location || 'Sin Ubicación'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="capitalize text-slate-600">{pump.condition || 'N/A'}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => setSelectedPumpId(pump.pump_id)}
                                        className="text-brand-600 font-medium hover:underline opacity-100 transition-opacity"
                                    >
                                        Ver Ficha
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredPumps.length === 0 && (
                    <div className="p-8 text-center text-slate-500">No se encontraron bombas.</div>
                )}
            </div>
        </div>
    );
}
