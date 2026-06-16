import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Filter, Plus, AlertCircle, CheckCircle, Clock, Search, Briefcase, Factory, Users } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { WorkOrderService } from '../../services/work_orders';
import OrdenDetail from './OrdenDetail';
import WorkOrderForm from './WorkOrderForm';
import PermissionGate from '../../components/auth/PermissionGate';
import WorkOrderBulkModal from '../../components/modals/WorkOrderBulkModal';

export default function OrdenesPage() {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [globalStats, setGlobalStats] = useState({ PENDING: 0, IN_PROGRESS: 0, CANCELLED: 0, COMPLETED: 0 });

    // View State
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [isCreateMode, setIsCreateMode] = useState(false);
    const [showBulk, setShowBulk] = useState(false);
    const [searchParams] = useSearchParams();

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const PAGE_SIZE = 10;

    // Filters
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PENDING, IN_PROGRESS, COMPLETED
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        // Reset page to 1 when filters change
        setCurrentPage(1);
    }, [statusFilter, searchQuery]);

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
    }, [searchParams, currentPage, statusFilter, searchQuery]);

    async function loadOrders() {
        try {
            setLoading(true);
            const filters = {
                status: statusFilter,
                search: searchQuery
            };
            const { data, count } = await WorkOrderService.getWorkOrders(filters, currentPage, PAGE_SIZE);
            setOrders(data || []);
            setFilteredOrders(data || []); // Rendering consistency
            setTotalCount(count || 0);
            setTotalPages(Math.ceil((count || 0) / PAGE_SIZE) || 1);

            const stats = await WorkOrderService.getGlobalStats();
            setGlobalStats(stats || { PENDING: 0, IN_PROGRESS: 0, CANCELLED: 0, COMPLETED: 0 });
        } catch (err) {
            console.error("Error loading orders:", err);
            setError("No se pudieron cargar las órdenes de trabajo.");
        } finally {
            setLoading(false);
        }
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
                        className="bg-slate-100 text-slate-600 px-3 py-2.5 rounded-xl hover:bg-slate-200 transition-all font-medium text-xs hidden md:block"
                    >
                        🌱 Seed Data
                    </button>
                    <PermissionGate module="ordenes_trabajo" action="create">
                        <button
                            onClick={() => setShowBulk(true)}
                            className="bg-slate-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-800 transition-all font-medium text-sm"
                        >
                            <span className="hidden sm:inline">📥</span>
                            <span>Cargue Masivo</span>
                        </button>
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
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Abiertas (Global)</p>
                    <p className="text-2xl font-bold text-slate-800">{globalStats?.PENDING || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">En Proceso (Global)</p>
                    <p className="text-2xl font-bold text-slate-800">{globalStats?.IN_PROGRESS || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Canceladas (Global)</p>
                    <p className="text-2xl font-bold text-slate-800">{globalStats?.CANCELLED || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cerradas (Global)</p>
                    <p className="text-2xl font-bold text-slate-800">{globalStats?.COMPLETED || 0}</p>
                </div>
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
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                OT-{wo.code || wo.work_order_id}
                                            </span>
                                            <span className="font-semibold text-sm text-slate-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
                                                {wo.mill?.name || wo.mill?.code || (wo.mill_id ? `Molino ID: ${wo.mill_id}` : 'Sin Molino')}
                                            </span>
                                            <StatusBadge status={wo.status} />
                                        </div>
                                        <h3 className="font-bold text-slate-800 text-lg group-hover:text-brand-600 transition-colors">
                                            {wo.description || 'Mantenimiento General'}
                                        </h3>
                                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
                                            <div className="flex items-center gap-1.5">
                                                <Factory size={14} />
                                                <span className="font-medium text-slate-700">{wo.mill?.name || wo.mill?.code || (wo.mill_id ? `Molino ID: ${wo.mill_id}` : 'Sin Molino')}</span>
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
                                        {new Date(wo.end_date || wo.start_date || wo.created_at).toLocaleDateString()}
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-4 py-3 border border-slate-200 rounded-xl shadow-sm mt-6">
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-slate-700">
                                Mostrando <span className="font-medium">{((currentPage - 1) * PAGE_SIZE) + 1}</span> a{' '}
                                <span className="font-medium">
                                    {Math.min(currentPage * PAGE_SIZE, totalCount)}
                                </span>{' '}
                                de <span className="font-medium">{totalCount}</span> resultados
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="sr-only">Anterior</span>
                                    {/* Chevron Left */}
                                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                <span className="relative inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700">
                                    Página {currentPage} de {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="sr-only">Siguiente</span>
                                    {/* Chevron Right */}
                                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </nav>
                        </div>
                    </div>
                    {/* Mobile pagination */}
                    <div className="flex items-center justify-between w-full sm:hidden">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <span className="text-sm text-slate-700">Pág. {currentPage} / {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}

            <WorkOrderBulkModal
                isOpen={showBulk}
                onClose={() => setShowBulk(false)}
                onSuccess={() => { setShowBulk(false); loadOrders(); }}
            />
        </div>
    );
}
