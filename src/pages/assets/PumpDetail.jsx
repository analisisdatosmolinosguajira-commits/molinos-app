import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Settings, History, Activity, Wrench, AlertTriangle,
    CheckCircle, Package, BarChart3, FileText, Clipboard
} from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { PumpService } from '../../services/pumps';
import InstallPumpModal from '../../components/pump/InstallPumpModal';
import PumpAnalytics from '../../components/pump/PumpAnalytics';
import PumpTechSpecsTab from '../../components/pump/PumpTechSpecsTab';
import PumpEventTimeline from '../../components/pump/PumpEventTimeline';

export default function PumpDetail() {
    const { id: pumpId } = useParams();
    const navigate = useNavigate();

    const [pump, setPump] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [workOrders, setWorkOrders] = useState([]);
    const [currentInstallation, setCurrentInstallation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const [pumpData, history, analyticsData, woData, installation] = await Promise.all([
                    PumpService.getPumpById(pumpId),
                    PumpService.getPumpHistory(pumpId),
                    PumpService.getPumpAnalytics(pumpId),
                    PumpService.getRelatedWorkOrders(pumpId),
                    PumpService.getCurrentInstallation(pumpId)
                ]);

                setPump(pumpData);
                setTimeline(history);
                setAnalytics(analyticsData);
                setWorkOrders(woData);
                setCurrentInstallation(installation);
            } catch (err) {
                console.error("Error loading pump:", err);
                setError("No se pudo cargar la información de la bomba.");
            } finally {
                setLoading(false);
            }
        }
        if (pumpId) loadData();
    }, [pumpId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500">Cargando información de la bomba...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertTriangle className="mx-auto mb-3 text-red-500" size={48} />
                    <p className="text-red-700 font-medium">{error}</p>
                    <button
                        onClick={() => navigate('/bombas')}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Volver a Bombas
                    </button>
                </div>
            </div>
        );
    }

    const isOperational = pump?.status !== 'descartada' && pump?.status !== 'dañada';
    const isInstalled = pump?.status === 'instalada';
    const totalInstallations = analytics?.totalInstallations || 0;

    const handleInstallPump = (workOrderData) => {
        console.log('Work Order Data prepared for pump installation:', workOrderData);
        alert(`Preparando instalación de bomba ${pump.model} en molino ${workOrderData.mill_id}\n\nEn el futuro, esto navegará a la página de crear Orden de Trabajo con los datos prellenados.`);
    };

    const tabs = [
        { id: 'overview', label: 'Vista General', icon: Activity },
        { id: 'analytics', label: 'Analíticas', icon: BarChart3 },
        { id: 'specs', label: 'Especificaciones', icon: Settings },
        { id: 'history', label: 'Historial', icon: History },
        { id: 'work-orders', label: 'Órdenes de Trabajo', icon: Wrench }
    ];

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Header / Nav */}
            <button
                onClick={() => navigate('/bombas')}
                className="flex items-center gap-2 text-slate-500 hover:text-brand-600 transition-colors mb-4"
            >
                <ArrowLeft size={18} />
                Volver a Bombas
            </button>

            {/* Header Card */}
            <div className="bg-gradient-to-r from-white to-slate-50 rounded-2xl shadow-lg border border-slate-200 p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
                            <Settings size={40} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-1">
                                {pump.model || 'Bomba Genérica'}
                            </h1>
                            <p className="text-slate-500 font-mono text-lg mb-2">
                                SN: {pump.serial_number}
                            </p>
                            <div className="flex gap-2">
                                <span className={`px-3 py-1 rounded-lg text-sm font-bold uppercase border ${pump.status === 'almacenada' ? 'bg-brand-50 text-brand-700 border-brand-200' :
                                        pump.status === 'instalada' ? 'bg-green-50 text-green-700 border-green-200' :
                                            pump.status === 'en_reparacion' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}>
                                    {pump.status?.replace('_', ' ')}
                                </span>
                                {isInstalled && currentInstallation && (
                                    <span className="px-3 py-1 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                                        📍 {currentInstallation.mill?.code} - {currentInstallation.mill?.name}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 items-center">
                        <div className="flex gap-4 text-center">
                            <div className="p-4 bg-white/80 backdrop-blur rounded-xl border border-slate-200 shadow-sm">
                                <p className="text-3xl font-bold text-brand-600">{totalInstallations}</p>
                                <p className="text-xs text-slate-500 uppercase font-bold mt-1">Instalaciones</p>
                            </div>
                            <div className="p-4 bg-white/80 backdrop-blur rounded-xl border border-slate-200 shadow-sm">
                                <p className="text-3xl font-bold text-slate-800">{timeline.length}</p>
                                <p className="text-xs text-slate-500 uppercase font-bold mt-1">Eventos</p>
                            </div>
                        </div>

                        {pump.status === 'almacenada' && (
                            <button
                                onClick={() => setIsInstallModalOpen(true)}
                                className="px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-700 text-white font-bold rounded-xl hover:from-brand-700 hover:to-brand-800 shadow-lg shadow-brand-500/30 transition-all flex items-center gap-2 hover:scale-105"
                            >
                                <Package size={20} />
                                Instalar Bomba
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
                <div className="border-b border-slate-200 px-6">
                    <nav className="flex gap-1 -mb-px">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition-all
                                        ${activeTab === tab.id
                                            ? 'border-brand-600 text-brand-600'
                                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                        }
                                    `}
                                >
                                    <Icon size={18} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Quick Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className={`p-5 rounded-xl border-2 ${isOperational
                                        ? 'bg-green-50 border-green-200 text-green-700'
                                        : 'bg-red-50 border-red-200 text-red-700'
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        {isOperational ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                                        <div>
                                            <p className="font-bold text-lg">
                                                {isOperational ? 'Operativa' : 'Requiere Atención'}
                                            </p>
                                            <p className="text-sm opacity-80">
                                                {isOperational ? 'Lista para operación' : 'Marcada como dañada'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 rounded-xl border-2 bg-brand-50 border-brand-200 text-brand-700">
                                    <div className="flex items-center gap-3">
                                        <Package size={24} />
                                        <div>
                                            <p className="font-bold text-lg">
                                                {pump.origin || 'N/A'}
                                            </p>
                                            <p className="text-sm opacity-80">Origen de la bomba</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 rounded-xl border-2 bg-purple-50 border-purple-200 text-purple-700">
                                    <div className="flex items-center gap-3">
                                        <Activity size={24} />
                                        <div>
                                            <p className="font-bold text-lg">
                                                {analytics?.totalActiveDays || 0} días
                                            </p>
                                            <p className="text-sm opacity-80">Total en operación</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Current Installation Details */}
                            {currentInstallation && (
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                                    <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
                                        <CheckCircle size={20} />
                                        Instalación Actual
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-sm text-green-700 opacity-80 mb-1">Molino</p>
                                            <p className="font-bold text-green-900">
                                                {currentInstallation.mill?.code} - {currentInstallation.mill?.name}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-green-700 opacity-80 mb-1">Fecha de instalación</p>
                                            <p className="font-bold text-green-900">
                                                {new Date(currentInstallation.installed_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-green-700 opacity-80 mb-1">Días operando</p>
                                            <p className="font-bold text-green-900">
                                                {analytics?.currentInstallationDays || 0} días
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Basic Info Table */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
                                    Información General
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex justify-between py-2 border-b border-slate-100">
                                        <span className="text-slate-600">Modelo</span>
                                        <span className="font-medium text-slate-900">{pump.model || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-100">
                                        <span className="text-slate-600">Origen</span>
                                        <span className="font-medium text-slate-900">{pump.origin || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-100">
                                        <span className="text-slate-600">Almacenamiento</span>
                                        <span className="font-medium text-slate-900">{pump.storage_location || 'Taller'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-100">
                                        <span className="text-slate-600">Fecha de fabricación</span>
                                        <span className="font-medium text-slate-900">
                                            {pump.manufacture_date ? new Date(pump.manufacture_date).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <PumpAnalytics analytics={analytics} />
                    )}

                    {activeTab === 'specs' && (
                        <PumpTechSpecsTab pump={pump} />
                    )}

                    {activeTab === 'history' && (
                        <PumpEventTimeline timeline={timeline} />
                    )}

                    {activeTab === 'work-orders' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Órdenes de Trabajo Relacionadas</h3>
                                    <p className="text-sm text-slate-500">{workOrders.length} órdenes encontradas</p>
                                </div>
                            </div>

                            {workOrders.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                                    <Clipboard size={48} className="mx-auto mb-3 text-slate-300" />
                                    <p className="text-slate-500">No hay órdenes de trabajo relacionadas</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {workOrders.map(wo => (
                                        <div
                                            key={wo.work_order_id}
                                            className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-brand-300 transition-all cursor-pointer"
                                            onClick={() => navigate(`/ordenes/${wo.work_order_id}`)}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-bold text-slate-900 mb-1">
                                                        {wo.code} - {wo.type}
                                                    </h4>
                                                    <p className="text-sm text-slate-600">
                                                        Molino: {wo.mill_code} - {wo.mill_name}
                                                    </p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${wo.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                        wo.status === 'IN_PROGRESS' ? 'bg-brand-100 text-brand-700' :
                                                            wo.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {wo.status}
                                                </span>
                                            </div>
                                            {wo.description && (
                                                <p className="text-sm text-slate-600 mb-3">
                                                    {wo.description}
                                                </p>
                                            )}
                                            <div className="flex gap-4 text-xs text-slate-500">
                                                {wo.scheduled_date && (
                                                    <span>📅 {new Date(wo.scheduled_date).toLocaleDateString()}</span>
                                                )}
                                                {wo.crew_name && (
                                                    <span>👷 {wo.crew_name}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Install Pump Modal */}
            {pump && (
                <InstallPumpModal
                    isOpen={isInstallModalOpen}
                    onClose={() => setIsInstallModalOpen(false)}
                    pump={pump}
                    onInstall={handleInstallPump}
                />
            )}
        </div>
    );
}
