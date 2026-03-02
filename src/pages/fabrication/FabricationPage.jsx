import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Plus, Package, Users, Calendar, Search, Trash2,
    Activity, Loader2, BookOpen, Wrench, Droplets
} from 'lucide-react';
import { FabricationService } from '../../services/fabrication';
import ManufacturingOrderModal from './ManufacturingOrderModal';
import RecipeManager from './RecipeManager';
import PumpOrdersManager from './PumpOrdersManager';

const STATUS_CONFIG = {
    'pendiente': { label: 'Pendiente', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    'planificada': { label: 'Planificada', bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-brand-500' },
    'en_proceso': { label: 'En Proceso', bg: 'bg-brand-100', text: 'text-brand-700', border: 'border-brand-200', dot: 'bg-brand-500' },
    'terminada': { label: 'Terminada', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    'cancelada': { label: 'Cancelada', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' }
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['pendiente'];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
};

const ProgressBar = ({ completed, planned }) => {
    const pct = planned > 0 ? Math.min((completed / planned) * 100, 100) : 0;
    return (
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                    pct > 50 ? 'bg-gradient-to-r from-blue-600 to-brand-500' :
                        'bg-gradient-to-r from-amber-500 to-orange-400'
                    }`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
};

const OrderCard = ({ order, onClick, onDelete }) => {
    // Summarize processes
    const processNames = order.processes?.map(p => p.pieceName).join(', ') || order.pieceName || 'Sin piezas';
    const totalPlanned = order.processes?.reduce((sum, p) => sum + p.quantityPlanned, 0) || order.quantityPlanned;
    const totalCompleted = order.processes?.reduce((sum, p) => sum + p.quantityCompleted, 0) || order.quantityCompleted;
    const pct = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;

    return (
        <div
            onClick={onClick}
            className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-brand-200 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden"
        >
            <div className={`h-1 ${STATUS_CONFIG[order.status]?.dot || 'bg-slate-300'}`} />
            <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-slate-400">{order.code || `#${order.id}`}</span>
                            <StatusBadge status={order.status} />
                        </div>
                        <h4 className="font-bold text-slate-900 text-base truncate" title={order.name || processNames}>{order.name || processNames}</h4>
                        {order.processes?.length > 0 && (
                            <p className="text-xs text-slate-400 mt-0.5">{order.processes.length} proceso(s)</p>
                        )}
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(order.id); }}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>

                <div className="mb-4">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="text-slate-500 font-medium">Progreso</span>
                        <span className="font-bold text-slate-700">{totalCompleted}/{totalPlanned} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                    </div>
                    <ProgressBar completed={totalCompleted} planned={totalPlanned} />
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    {order.crewName && (
                        <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                            <Users size={12} className="text-slate-400" />
                            {order.crewName}
                        </span>
                    )}
                    {order.startDate && (
                        <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                            <Calendar size={12} className="text-slate-400" />
                            {new Date(order.startDate).toLocaleDateString()}
                        </span>
                    )}
                </div>

                {order.relatedActivity && (
                    <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-1.5 text-xs text-brand-600">
                        <Activity size={12} />
                        <span className="truncate font-medium">{order.relatedActivity.title}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function FabricationPage() {
    const [pageTab, setPageTab] = useState('ORDERS');
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchParams] = useSearchParams();

    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState(null);

    useEffect(() => {
        loadOrders();
        if (searchParams.get('action') === 'new') setModalOpen(true);
    }, [searchParams]);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const data = await FabricationService.getManufacturingOrders();
            setOrders(data || []);
        } catch (err) {
            console.error('Error loading orders:', err);
            setError('No se pudieron cargar las órdenes.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar esta orden de fabricación?')) return;
        try {
            await FabricationService.deleteManufacturingOrder(id);
            loadOrders();
        } catch (err) { alert('Error: ' + err.message); }
    };

    const filteredOrders = orders.filter(order => {
        if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const processMatch = order.processes?.some(p => p.pieceName?.toLowerCase().includes(q) || p.pieceCode?.toLowerCase().includes(q));
            return processMatch || order.crewName?.toLowerCase().includes(q) || String(order.id).includes(q);
        }
        return true;
    });

    const counts = {
        ALL: orders.length,
        pendiente: orders.filter(o => o.status === 'pendiente').length,
        planificada: orders.filter(o => o.status === 'planificada').length,
        en_proceso: orders.filter(o => o.status === 'en_proceso').length,
        terminada: orders.filter(o => o.status === 'terminada').length,
        cancelada: orders.filter(o => o.status === 'cancelada').length
    };

    const STATUS_TABS = [
        { id: 'ALL', label: 'Todas' },
        { id: 'pendiente', label: 'Pendientes' },
        { id: 'planificada', label: 'Planificadas' },
        { id: 'en_proceso', label: 'En Proceso' },
        { id: 'terminada', label: 'Terminadas' },
        { id: 'cancelada', label: 'Canceladas' }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-900/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Wrench size={26} className="text-brand-400" />
                            Fabricación
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Gestión de órdenes, recetas y consumo de materiales
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Page Tabs */}
                        <div className="flex bg-white/10 rounded-xl p-1">
                            <button
                                onClick={() => setPageTab('ORDERS')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${pageTab === 'ORDERS' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/70 hover:text-white'
                                    }`}
                            >
                                <Activity size={15} />
                                Órdenes
                            </button>
                            <button
                                onClick={() => setPageTab('RECIPES')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${pageTab === 'RECIPES' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/70 hover:text-white'
                                    }`}
                            >
                                <BookOpen size={15} />
                                Recetas
                            </button>
                            <button
                                onClick={() => setPageTab('PUMPS')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${pageTab === 'PUMPS' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/70 hover:text-white'
                                    }`}
                            >
                                <Droplets size={15} />
                                Bombas
                            </button>
                        </div>
                        {pageTab === 'ORDERS' && (
                            <button
                                onClick={() => { setEditingOrderId(null); setModalOpen(true); }}
                                className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
                            >
                                <Plus size={18} />
                                Nueva Orden
                            </button>
                        )}
                    </div>
                </div>

                {pageTab === 'ORDERS' && (
                    <div className="grid grid-cols-4 gap-3 mt-5">
                        {[
                            { label: 'Planificadas', value: counts.planificada, color: 'text-violet-400' },
                            { label: 'En Proceso', value: counts.en_proceso, color: 'text-brand-400' },
                            { label: 'Terminadas', value: counts.terminada, color: 'text-emerald-400' },
                            { label: 'Total', value: counts.ALL, color: 'text-white' }
                        ].map(stat => (
                            <div key={stat.label} className="bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/5">
                                <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
                                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ORDERS TAB */}
            {pageTab === 'ORDERS' && (
                <>
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
                            {STATUS_TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setStatusFilter(tab.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${statusFilter === tab.id
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {tab.label} <span className="text-slate-400">({counts[tab.id]})</span>
                                </button>
                            ))}
                        </div>
                        <div className="relative flex-1 max-w-xs">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar pieza, código, cuadrilla..."
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="animate-spin text-slate-300" size={32} />
                        </div>
                    ) : error ? (
                        <div className="text-center py-16 text-red-500">{error}</div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 border-dashed">
                            <Package className="mx-auto text-slate-300 mb-3" size={56} />
                            <h3 className="text-lg font-bold text-slate-900 mb-1">
                                {searchQuery || statusFilter !== 'ALL' ? 'Sin resultados' : 'No hay órdenes'}
                            </h3>
                            <p className="text-slate-500 text-sm">
                                {searchQuery || statusFilter !== 'ALL' ? 'Prueba con otros filtros.' : 'Crea una nueva orden para comenzar.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredOrders.map(order => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    onClick={() => { setEditingOrderId(order.id); setModalOpen(true); }}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* RECIPES TAB */}
            {pageTab === 'RECIPES' && <RecipeManager />}

            {/* PUMPS TAB */}
            {pageTab === 'PUMPS' && <PumpOrdersManager />}

            {/* Modal */}
            <ManufacturingOrderModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setEditingOrderId(null); }}
                orderId={editingOrderId}
                onSuccess={loadOrders}
            />
        </div>
    );
}
