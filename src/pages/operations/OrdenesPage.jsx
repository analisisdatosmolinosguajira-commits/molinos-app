import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Filter, Plus, AlertCircle, CheckCircle, Clock, Search, Briefcase, Factory, Users } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { WorkOrderService } from '../../services/work_orders';
import OrdenDetail from './OrdenDetail';
import WorkOrderForm from './WorkOrderForm';
import PermissionGate from '../../components/auth/PermissionGate';

export default function OrdenesPage() {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // View State
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [isCreateMode, setIsCreateMode] = useState(false);
    const [searchParams] = useSearchParams();

    // Filters
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PENDING, IN_PROGRESS, COMPLETED
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadOrders();
        // Check for create action in URL
        if (searchParams.get('action') === 'new') {
            setIsCreateMode(true);
        }
        // Auto-select a specific order from URL ?id=
        const targetId = searchParams.get('id');
        if (targetId) {
            setSelectedOrderId(targetId);
        }
    }, [searchParams]);

    useEffect(() => {
        filterOrders();
    }, [orders, statusFilter, searchQuery]);

    async function loadOrders() {
        try {
            setLoading(true);
            const data = await WorkOrderService.getWorkOrders();
            setOrders(data || []);
            setFilteredOrders(data || []);
        } catch (err) {
            console.error("Error loading orders:", err);
            setError("No se pudieron cargar las órdenes de trabajo.");
        } finally {
            setLoading(false);
        }
    }

    function filterOrders() {
        let result = orders;

        // Status Filter
        if (statusFilter !== 'ALL') {
            result = result.filter(o => o.status === statusFilter);
        }

        // Search Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(o =>
                o.code?.toLowerCase().includes(q) ||
                o.description?.toLowerCase().includes(q) ||
                o.mill?.name?.toLowerCase().includes(q) ||
                o.mill?.code?.toLowerCase().includes(q)
            );
        }

        setFilteredOrders(result);
    }

    if (selectedOrderId) {
        // Use WorkOrderForm for editing (detail view)
        return <WorkOrderForm orderId={selectedOrderId} onBack={() => { setSelectedOrderId(null); loadOrders(); }} />;
    }

    if (isCreateMode) {
        return <WorkOrderForm onBack={() => { setIsCreateMode(false); loadOrders(); }} />;
    }


    if (loading && orders.length === 0) return <div className="p-8 text-center text-slate-500">Cargando órdenes...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    // Calculate generic stats based on loaded orders
    const stats = {
        Abiertas: orders.filter(o => o.status === 'PENDING').length,
        'En Proceso': orders.filter(o => o.status === 'IN_PROGRESS').length,
        Canceladas: orders.filter(o => o.status === 'CANCELLED').length,
        Cerradas: orders.filter(o => o.status === 'COMPLETED').length
    };

    return (
        <div className="space-y-6 animate-slide-up pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Órdenes de Trabajo</h1>
                    <p className="text-slate-500 mt-1">Gestión de mantenimiento y reparaciones</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            if (confirm("Generar datos de prueba?")) {
                                const { seedWorkOrders } = await import('../../utils/seed_work_orders');
                                await seedWorkOrders();
                                window.location.reload();
                            }
                        }}
                        className="bg-slate-100 text-slate-600 px-3 py-2.5 rounded-xl hover:bg-slate-200 transition-all font-medium text-xs hidden md:block" // Hidden on mobile, visible on desktop
                    >
                        🌱 Seed Data
                    </button>
                    <PermissionGate module="ordenes_trabajo" action="create">
                        <button
                            onClick={() => setIsCreateMode(true)}
                            className="bg-brand-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-brand-700 shadow-lg shadow-indigo-500/30 transition-all font-medium"
                        >
                            <Plus size={20} />
                            Nueva Orden
                        </button>
                    </PermissionGate>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats).map(([label, count]) => (
                    <div key={label} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                        <p className="text-2xl font-bold text-slate-800">{count}</p>
                    </div>
                ))}
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between sticky top-0 z-10">

                {/* Status Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
                    {[
                        { id: 'ALL', label: 'Todas' },
                        { id: 'PENDING', label: 'Pendientes' },
                        { id: 'IN_PROGRESS', label: 'En Proceso' },
                        { id: 'COMPLETED', label: 'Cerradas' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id)}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all whitespace-nowrap
                                ${statusFilter === tab.id
                                    ? 'bg-white text-brand-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'}
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar orden, molino..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
                {filteredOrders.length > 0 ? (
                    filteredOrders.map(wo => (
                        <div
                            key={wo.work_order_id}
                            onClick={() => setSelectedOrderId(wo.work_order_id)}
                            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-brand-300 hover:shadow-md transition-all group cursor-pointer relative overflow-hidden"
                        >
                            <div className="flex flex-col md:flex-row gap-4 justify-between items-start relative z-10">
                                <div className="flex items-start gap-4">
                                    <div className={`mt-1 w-1.5 h-12 rounded-full ${wo.priority === 'CRITICAL' ? 'bg-rose-500' :
                                        wo.priority === 'HIGH' ? 'bg-orange-500' : 'bg-brand-500'
                                        }`}></div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                OT-{wo.code || wo.work_order_id}
                                            </span>
                                            <StatusBadge status={wo.status} />
                                        </div>
                                        <h3 className="font-bold text-slate-800 text-lg group-hover:text-brand-600 transition-colors">
                                            {wo.description || 'Mantenimiento General'}
                                        </h3>
                                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
                                            <div className="flex items-center gap-1.5">
                                                <Factory size={14} />
                                                <span className="font-medium text-slate-700">{wo.mill?.name || wo.mill?.code || 'Sin Molino'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Briefcase size={14} />
                                                <span className="capitalize">{wo.type}</span>
                                            </div>
                                            {wo.crew && (
                                                <div className="flex items-center gap-1.5">
                                                    <Users size={14} />
                                                    <span>{wo.crew.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 text-right">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                                        <Clock size={14} />
                                        {new Date(wo.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ClipboardList size={32} className="text-slate-300" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">No se encontraron órdenes</h3>
                        <p className="text-slate-500 text-sm mt-1">Intenta ajustar los filtros o crea una nueva orden.</p>
                        <button
                            onClick={() => { setStatusFilter('ALL'); setSearchQuery(''); }}
                            className="text-brand-600 font-medium text-sm mt-4 hover:underline"
                        >
                            Limpiar filtros
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}



