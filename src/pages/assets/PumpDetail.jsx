import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, History, Activity, Wrench, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { PumpService } from '../../services/pumps';

export default function PumpDetail() {
    const { id: pumpId } = useParams();
    const navigate = useNavigate();

    const [pump, setPump] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const pumpData = await PumpService.getPumpById(pumpId);
                const history = await PumpService.getPumpHistory(pumpId);

                setPump(pumpData);
                setTimeline(history);
            } catch (err) {
                console.error("Error loading pump:", err);
                setError("No se pudo cargar la información de la bomba.");
            } finally {
                setLoading(false);
            }
        }
        if (pumpId) loadData();
    }, [pumpId]);

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando historial de la bomba...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    // Derived Tech Status
    const isOperational = pump?.status !== 'DISCARDED' && pump?.status !== 'DAMAGED';
    const totalInstallations = timeline.filter(t => t.type === 'INSTALLATION').length;

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Header / Nav */}
            <button onClick={() => navigate('/bombas')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 transition-colors mb-4">
                <ArrowLeft size={18} />
                Volver
            </button>

            {/* Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600">
                        <Settings size={40} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{pump.model || 'Bomba Genérica'}</h1>
                        <p className="text-slate-500 font-mono">SN: {pump.serial_number}</p>
                        <div className="flex gap-2 mt-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${pump.status === 'IN_STOCK' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                pump.status === 'INSTALLED' ? 'bg-green-50 text-green-700 border-green-200' :
                                    'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                {pump.status?.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 text-center">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-2xl font-bold text-slate-800">{totalInstallations}</p>
                        <p className="text-xs text-slate-500 uppercase font-bold">Instalaciones</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-2xl font-bold text-slate-800">{timeline.length}</p>
                        <p className="text-xs text-slate-500 uppercase font-bold">Eventos Totales</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Tech Status & Actions */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Estado Técnico</h3>

                        <div className="space-y-4">
                            <div className={`p-4 rounded-xl flex items-start gap-3 ${isOperational ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {isOperational ? <CheckCircle size={20} className="mt-0.5" /> : <AlertTriangle size={20} className="mt-0.5" />}
                                <div>
                                    <p className="font-bold">{isOperational ? 'Operativa' : 'Requiere Atención'}</p>
                                    <p className="text-sm opacity-80">{isOperational ? 'Lista para instalación o en uso.' : 'Marcada como dañada o descartada.'}</p>
                                </div>
                            </div>

                            <div className="py-2 border-t border-slate-100 mt-4">
                                <div className="flex justify-between py-2 text-sm">
                                    <span className="text-slate-500">Tipo</span>
                                    <span className="font-medium text-slate-900">{pump.type || 'Manual'}</span>
                                </div>
                                <div className="flex justify-between py-2 text-sm">
                                    <span className="text-slate-500">Profundidad Max</span>
                                    <span className="font-medium text-slate-900">{pump.max_depth || '-'} m</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="lg:col-span-2">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <History size={20} className="text-brand-500" />
                            Historial de Uso y Movimientos
                        </h3>

                        <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-200">
                            {timeline.map((event, idx) => (
                                <div key={idx} className="relative group">
                                    <div className={`absolute -left-[29px] w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center 
                                        ${event.type === 'INSTALLATION' ? 'bg-green-500' :
                                            event.type === 'REMOVAL' ? 'bg-orange-500' : 'bg-slate-400'}`}>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:bg-white hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-slate-900">{event.title}</p>
                                                <p className="text-sm text-slate-500">{event.subtitle}</p>
                                            </div>
                                            <span className="text-xs font-mono text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                                                {new Date(event.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {timeline.length === 0 && (
                                <div className="text-center text-slate-400 py-4">Sin historial registrado</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
