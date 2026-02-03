import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Users, Wrench, FileText, CheckCircle, AlertCircle, Package } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { WorkOrderService } from '../../services/work_orders';

export default function OrdenDetail({ orderId, onBack }) { // Accepting orderId prop for modal/view context
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadOrder() {
            try {
                setLoading(true);
                const data = await WorkOrderService.getWorkOrderById(orderId);
                setOrder(data);
            } catch (err) {
                console.error("Error loading order:", err);
                setError("No se pudo cargar la orden de trabajo.");
            } finally {
                setLoading(false);
            }
        }
        if (orderId) loadOrder();
    }, [orderId]);

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando orden...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!order) return null;

    return (
        <div className="space-y-6 animate-slide-up">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 transition-colors mb-4">
                <ArrowLeft size={18} />
                Volver
            </button>

            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold text-slate-900">Orden #{order.code || order.work_order_id}</h1>
                            <StatusBadge status={order.status} />
                        </div>
                        <p className="text-slate-500 text-lg">{order.description || 'Mantenimiento Correctivo'}</p>
                        <div className="flex items-center gap-4 mt-4 text-sm font-medium text-slate-500">
                            <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                                <Wrench size={16} /> {order.mill?.name || 'Molino General'}
                            </span>
                            <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                                <Clock size={16} /> {new Date(order.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Crew Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Users className="text-brand-500" />
                        Cuadrilla Asignada
                    </h3>
                    {order.crew ? (
                        <div className="flex items-center gap-4 p-4 bg-brand-50 rounded-xl border border-brand-100">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-brand-600 font-bold text-lg shadow-sm">
                                {order.crew.name?.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">{order.crew.name}</h4>
                                <p className="text-sm text-slate-500">{order.crew.description || 'Equipo técnico estándar'}</p>
                            </div>
                            <span className="ml-auto px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded uppercase">
                                Asignada
                            </span>
                        </div>
                    ) : (
                        <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                            Sin cuadrilla asignada
                        </div>
                    )}
                </div>

                {/* Diagnosis / Notes Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <FileText className="text-purple-500" />
                        Diagnóstico y Notas
                    </h3>
                    <div className="space-y-4">
                        {order.diagnosis && (
                            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 text-sm text-purple-800">
                                <p className="font-bold mb-1">Diagnóstico Previo:</p>
                                {order.diagnosis}
                            </div>
                        )}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600">
                            <p className="font-bold mb-1 text-slate-700">Notas de la Orden:</p>
                            {order.notes || 'Sin notas adicionales.'}
                        </div>
                    </div>
                </div>

                {/* Materials Consumed (Placeholder for now) */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 lg:col-span-2">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Package className="text-orange-500" />
                        Materiales y Piezas Consumidas
                    </h3>
                    <div className="overflow-hidden border border-slate-200 rounded-xl">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3">Material / Pieza</th>
                                    <th className="px-4 py-3">Cantidad</th>
                                    <th className="px-4 py-3">Unidad</th>
                                    <th className="px-4 py-3 text-right">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {order.materials?.length > 0 ? (
                                    order.materials.map((mat, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium text-slate-700">{mat.name}</td>
                                            <td className="px-4 py-3">{mat.quantity}</td>
                                            <td className="px-4 py-3 text-slate-500">{mat.unit}</td>
                                            <td className="px-4 py-3 text-right text-green-600 font-bold">Consumido</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-4 py-8 text-center text-slate-400">
                                            No se han registrado materiales para esta orden.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
