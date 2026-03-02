import React, { useState, useEffect } from 'react';
import {
    Plus, Loader2, Trash2, Droplets, Users, Calendar, Search,
    Wrench, Package, Hammer, Layers, BookOpen
} from 'lucide-react';
import { FabricationService } from '../../services/fabrication';
import PumpMOModal from './PumpMOModal';
import PumpModelManager from './PumpModelManager';

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

const TypeBadge = ({ moType }) => {
    if (moType === 'pump_repair') {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200"><Wrench size={10} /> Reparación</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-accent-100 text-accent-600 border border-accent-200"><Hammer size={10} /> Fabricación</span>;
};

const PumpOrderCard = ({ order, onClick, onDelete }) => {
    const pct = order.quantityPlanned > 0 ? Math.round((order.quantityCompleted / order.quantityPlanned) * 100) : 0;
    return (
        <div onClick={onClick} className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-accent-200 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden">
            <div className={`h-1.5 ${order.moType === 'pump_repair' ? 'bg-gradient-to-r from-orange-500 to-amber-400' : 'bg-gradient-to-r from-cyan-500 to-blue-400'}`} />
            <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-mono text-slate-400">{order.code || `#${order.id}`}</span>
                            <TypeBadge moType={order.moType} />
                            <StatusBadge status={order.status} />
                        </div>
                        <h4 className="font-bold text-slate-900 text-base truncate">{order.name || 'Orden de Bomba'}</h4>
                        {order.moType === 'pump_repair' && order.pumpSerial && (
                            <p className="text-xs text-orange-500 mt-0.5 flex items-center gap-1"><Droplets size={11} /> Bomba: {order.pumpSerial}</p>
                        )}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(order.id); }} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                </div>

                <div className="mb-3">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="text-slate-500 font-medium">Progreso</span>
                        <span className="font-bold text-slate-700">{order.quantityCompleted}/{order.quantityPlanned} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : pct > 50 ? 'bg-gradient-to-r from-cyan-600 to-blue-500' : 'bg-gradient-to-r from-amber-500 to-orange-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    {order.crewName && <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg"><Users size={12} className="text-slate-400" />{order.crewName}</span>}
                    {order.startDate && <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg"><Calendar size={12} className="text-slate-400" />{new Date(order.startDate).toLocaleDateString()}</span>}
                </div>
            </div>
        </div>
    );
};

const STATUS_TABS = [
    { id: 'ALL', label: 'Todas' },
    { id: 'pendiente', label: 'Pendientes' },
    { id: 'en_proceso', label: 'En Proceso' },
    { id: 'terminada', label: 'Terminadas' },
    { id: 'cancelada', label: 'Canceladas' }
];

// ============================================================================
// ORDERS LIST SUB-COMPONENT
// ============================================================================
function PumpOrdersList() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [modalType, setModalType] = useState('pump_fabrication');

    useEffect(() => { loadOrders(); }, []);

    const loadOrders = async () => { try { setLoading(true); setOrders(await FabricationService.getPumpManufacturingOrders()); } catch (e) { console.error(e); } finally { setLoading(false); } };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar esta orden?')) return;
        try { await FabricationService.deleteManufacturingOrder(id); loadOrders(); } catch (e) { alert('Error: ' + e.message); }
    };

    const filteredOrders = orders.filter(o => {
        if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
        if (searchQuery) { const q = searchQuery.toLowerCase(); return o.code?.toLowerCase().includes(q) || o.name?.toLowerCase().includes(q) || o.pumpSerial?.toLowerCase().includes(q); }
        return true;
    });

    const counts = {
        ALL: orders.length,
        pendiente: orders.filter(o => o.status === 'pendiente').length,
        en_proceso: orders.filter(o => o.status === 'en_proceso').length,
        terminada: orders.filter(o => o.status === 'terminada').length,
        cancelada: orders.filter(o => o.status === 'cancelada').length
    };

    return (
        <>
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: 'Pendientes', value: counts.pendiente, color: 'text-amber-500' },
                    { label: 'En Proceso', value: counts.en_proceso, color: 'text-brand-500' },
                    { label: 'Terminadas', value: counts.terminada, color: 'text-emerald-500' },
                    { label: 'Total', value: counts.ALL, color: 'text-accent-500' }
                ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                        <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
                    {STATUS_TABS.map(tab => (
                        <button key={tab.id} onClick={() => setStatusFilter(tab.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${statusFilter === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            {tab.label} ({counts[tab.id]})
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 max-w-xs">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500/20" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { setEditingOrderId(null); setModalType('pump_fabrication'); setModalOpen(true); }} className="bg-accent-600 hover:bg-accent-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-accent-500/20 active:scale-95"><Hammer size={16} /> Fabricar</button>
                    <button onClick={() => { setEditingOrderId(null); setModalType('pump_repair'); setModalOpen(true); }} className="bg-orange-500 hover:bg-orange-400 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95"><Wrench size={16} /> Reparar</button>
                </div>
            </div>

            {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-300" size={32} /></div>
                : filteredOrders.length === 0 ? (
                    <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 border-dashed">
                        <Droplets className="mx-auto text-slate-300 mb-3" size={56} />
                        <h3 className="text-lg font-bold text-slate-900 mb-1">{searchQuery || statusFilter !== 'ALL' ? 'Sin resultados' : 'No hay órdenes de bomba'}</h3>
                        <p className="text-slate-500 text-sm">Crea una fabricación o reparación para comenzar.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredOrders.map(order => (
                            <PumpOrderCard key={order.id} order={order} onClick={() => { setEditingOrderId(order.id); setModalType(order.moType); setModalOpen(true); }} onDelete={handleDelete} />
                        ))}
                    </div>
                )}

            <PumpMOModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingOrderId(null); }} orderId={editingOrderId} onSuccess={loadOrders} initialType={modalType} />
        </>
    );
}

// ============================================================================
// MAIN COMPONENT WITH SUB-TABS
// ============================================================================
export default function PumpOrdersManager() {
    const [subTab, setSubTab] = useState('ORDERS');

    return (
        <div className="space-y-6">
            {/* Sub-tabs */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                <button onClick={() => setSubTab('ORDERS')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${subTab === 'ORDERS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Package size={14} /> Órdenes
                </button>
                <button onClick={() => setSubTab('MODELS')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${subTab === 'MODELS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <BookOpen size={14} /> Modelos
                </button>
            </div>

            {subTab === 'ORDERS' && <PumpOrdersList />}
            {subTab === 'MODELS' && <PumpModelManager />}
        </div>
    );
}
