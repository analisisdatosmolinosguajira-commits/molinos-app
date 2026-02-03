import React, { useState, useEffect } from 'react';
import { ClipboardList, Filter, Plus, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { WorkOrderService } from '../../services/work_orders';
import OrdenDetail from './OrdenDetail';

export default function OrdenesPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedOrderId, setSelectedOrderId] = useState(null);

    useEffect(() => {
        async function loadOrders() {
            try {
                setLoading(true);
                const data = await WorkOrderService.getWorkOrders();
                setOrders(data || []);
            } catch (err) {
                console.error("Error loading orders:", err);
                setError("No se pudieron cargar las órdenes de trabajo.");
            } finally {
                setLoading(false);
            }
        }
        loadOrders();
    }, []);

    if (selectedOrderId) {
        return <OrdenDetail orderId={selectedOrderId} onBack={() => setSelectedOrderId(null)} />;
    }

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando órdenes...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    // Calculate generic stats based on loaded orders
    const stats = {
        Abiertas: orders.filter(o => o.status === 'PENDING').length,
        'En Proceso': orders.filter(o => o.status === 'IN_PROGRESS').length,
        Canceladas: orders.filter(o => o.status === 'CANCELLED').length,
        Cerradas: orders.filter(o => o.status === 'COMPLETED').length
    };

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Órdenes de Trabajo</h1>
                    <p className="text-slate-500 mt-1">Mantenimiento correctivo y preventivo</p>
                </div>
                <button className="bg-brand-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all font-medium">
                    <Plus size={20} />
                    Nueva Orden
                </button>
            </div>

            {/* Kanban-like Status Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(stats).map(([label, count]) => (
                    <div key={label} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                        <p className="text-2xl font-bold text-slate-800">{count}</p>
                    </div>
                ))}
            </div>

            {/* Orders List */}
            <div className="space-y-4">
                {orders.map(wo => (
                    <div
                        key={wo.work_order_id}
                        onClick={() => setSelectedOrderId(wo.work_order_id)}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-brand-200 hover:shadow-md transition-all group cursor-pointer"
                    >
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-start">

                            <div className="flex items-start gap-4">
                                <div className={`mt-1 w-2 h-12 rounded-full ${wo.priority === 'CRITICAL' || wo.priority === 'HIGH' ? 'bg-rose-500' : 'bg-brand-500'
                                    }`}></div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg group-hover:text-brand-600 transition-colors">{wo.description || 'Mantenimiento General'}</h3>
                                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                        <span className="font-mono bg-slate-100 px-1.5 rounded text-slate-600">OT-{wo.code || wo.work_order_id}</span>
                                        <span>•</span>
                                        <span className="font-medium text-slate-700">{wo.mill?.code || 'S/C'}</span>
                                        <span>•</span>
                                        <span className="capitalize">{wo.type}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                <StatusBadge status={wo.status} />
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                                    <Clock size={14} />
                                    {new Date(wo.created_at).toLocaleDateString()}
                                </div>
                            </div>

                        </div>
                    </div>
                ))}

                {orders.length === 0 && (
                    <div className="p-8 text-center text-slate-500">No hay órdenes de trabajo registradas.</div>
                )}
            </div>
        </div>
    );
}
