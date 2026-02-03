import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, MapPin, Wind, Droplet, ClipboardList, History, Wrench, Settings, AlertTriangle, Activity, Users, FileText
} from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { MillService } from '../../services/mills';

export default function MillDetail({ millId, onBack }) {
    const [mill, setMill] = useState(null);
    const [lifeRecord, setLifeRecord] = useState([]);
    const [reliability, setReliability] = useState(null);
    const [social, setSocial] = useState(null);
    const [installedPump, setInstalledPump] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('life_record');

    useEffect(() => {
        async function loadMillData() {
            try {
                setLoading(true);
                // 1. Core Data
                const millData = await MillService.getMillById(millId);
                setMill(millData);

                // 2. Installed Pump
                const pump = millData.mill_pump?.find(p => p.status === 'INSTALLED' || !p.removal_date);
                setInstalledPump(pump);

                // 3. Advanced Metrics (Parallel Fetch)
                const [record, relMetrics, socStatus] = await Promise.all([
                    MillService.getLifeRecord(millId),
                    MillService.getReliabilityMetrics(millId),
                    MillService.getSocialStatus(millId)
                ]);

                setLifeRecord(record);
                setReliability(relMetrics);
                setSocial(socStatus);

            } catch (err) {
                console.error("Error loading mill:", err);
                setError("No se pudo cargar la información completa del molino.");
            } finally {
                setLoading(false);
            }
        }

        if (millId) {
            loadMillData();
        }
    }, [millId]);

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando ecosistema del molino...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!mill) return <div className="p-8 text-center text-slate-500">Molino no encontrado</div>;

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Header / Nav */}
            <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 transition-colors mb-4">
                <ArrowLeft size={18} />
                Volver al listado
            </button>

            {/* SUPER HERO CARD: Operational & Social Context */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-brand-50 rounded-bl-full opacity-50 -mr-16 -mt-16 pointer-events-none"></div>

                <div className="flex flex-col md:flex-row justify-between items-start gap-6 relative z-10">
                    <div className="flex items-start gap-6">
                        <div className="w-24 h-24 bg-brand-100 rounded-2xl flex items-center justify-center text-brand-600 shadow-inner">
                            <Wind size={48} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold text-slate-900">{mill.name || 'Molino Sin Nombre'}</h1>
                                <StatusBadge status={mill.status} />
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-slate-500 font-medium">
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-200">
                                    <Settings size={16} /> {mill.code}
                                </span>
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-200">
                                    <MapPin size={16} /> {mill.community_name || 'Sin Comunidad'}
                                </span>
                                {/* Social Status Badge */}
                                {social && (
                                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border ${social.status === 'CONCERTADO' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                        <Users size={16} /> {social.status === 'CONCERTADO' ? 'Comunidad Concertada' : 'Concertación Pendiente'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-col gap-2 w-full md:w-auto">
                        <button className="px-6 py-2 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-colors flex items-center justify-center gap-2">
                            <FileText size={18} /> Reportar Falla
                        </button>
                        <button className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                            <Activity size={18} /> Nuevo Diagnóstico
                        </button>
                    </div>
                </div>
            </div>

            {/* Reliability Micro-Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-full"><Activity size={20} /></div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Tiempo en Servicio</p>
                        <p className="text-lg font-bold text-slate-800">{reliability?.daysSinceLastIntervention || 0} Días <span className="text-xs font-normal text-slate-400">sin fallas</span></p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-full"><AlertTriangle size={20} /></div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Fallas (12 meses)</p>
                        <p className="text-lg font-bold text-slate-800">{reliability?.failuresLastYear || 0} Incidentes</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-full"><Users size={20} /></div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Impacto Social</p>
                        <p className="text-lg font-bold text-slate-800">{social?.count || 0} <span className="text-xs font-normal text-slate-400">Concertaciones</span></p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-slate-200">
                {[
                    { id: 'life_record', label: 'Línea de Vida', icon: History },
                    { id: 'components', label: 'Bomba y Componentes', icon: Wrench },
                    { id: 'specs', label: 'Ficha Técnica', icon: ClipboardList }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-all border-b-2 ${activeTab === tab.id
                            ? 'text-brand-600 border-brand-600'
                            : 'text-slate-400 border-transparent hover:text-slate-600'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">

                    {activeTab === 'life_record' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Línea de Vida (Life Record)</h3>
                            <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-200 h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                                {lifeRecord.map(event => (
                                    <div key={event.id} className="relative animate-fade-in group">
                                        <div className={`absolute -left-[29px] w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center transition-transform group-hover:scale-110 
                                            ${event.type === 'WORK_ORDER' ? 'bg-brand-500' : event.type === 'DIAGNOSIS' ? 'bg-purple-500' : 'bg-orange-500'}`}>
                                        </div>

                                        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{new Date(event.date).toLocaleDateString()}</span>
                                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border 
                                                    ${event.type === 'WORK_ORDER' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        event.type === 'DIAGNOSIS' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                                    {event.type}
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-slate-800">{event.title}</h4>
                                            <p className="text-sm text-slate-500 mt-1">{event.subtitle}</p>
                                        </div>
                                    </div>
                                ))}

                                {lifeRecord.length === 0 && (
                                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500">
                                        No hay registros en la línea de vida.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'components' && (
                        <div className="space-y-6">
                            {/* Installed Pump Card */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Droplet className="text-blue-500" />
                                    Bomba Instalada Actual
                                </h3>

                                {installedPump ? (
                                    <div className="flex items-center gap-4 p-4 bg-brand-50 rounded-xl border border-brand-100">
                                        <div className="p-3 bg-white rounded-lg text-brand-600 shadow-sm">
                                            <Settings size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-900">{installedPump.model || 'Modelo Desconocido'}</p>
                                            <p className="text-sm text-slate-500">Serial: {installedPump.serial_number || 'N/A'}</p>
                                        </div>
                                        <StatusBadge status={installedPump.status} size="sm" />
                                        <button className="text-sm font-semibold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-red-100 transition-colors">
                                            Desinstalar
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        <p className="text-slate-500 mb-4">No hay bomba instalada.</p>
                                        <button className="px-4 py-2 bg-brand-600 text-white font-medium rounded-lg shadow-lg shadow-brand-500/20 hover:bg-brand-700">
                                            Instalar Bomba
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Ubicación Geo</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-slate-500 text-sm">Latitud</span>
                                <span className="font-mono text-slate-700 font-medium">{mill.latitude || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-slate-500 text-sm">Longitud</span>
                                <span className="font-mono text-slate-700 font-medium">{mill.longitude || 'N/A'}</span>
                            </div>
                        </div>
                        <div className="mt-4 h-32 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs text-center p-4">
                            {/* Placeholder for Map Component */}
                            Mapa Interactivo no disponible en demo
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
