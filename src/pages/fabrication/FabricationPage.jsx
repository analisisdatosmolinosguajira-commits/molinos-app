import React, { useState, useEffect } from 'react';
import { Plus, FileText, Calendar, Users, Package, AlertCircle } from 'lucide-react';
import { FabricationService } from '../../services/fabrication';

export default function FabricationPage() {
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadOrders();
    }, []);

    async function loadOrders() {
        try {
            setLoading(true);
            const data = await FabricationService.getManufacturingOrders();
            setOrders(data || []);
        } catch (err) {
            console.error("Error loading manufacturing orders:", err);
            setError("No se pudieron cargar las órdenes de fabricación.");
        } finally {
            setLoading(false);
        }
    }

    const getStatusBadge = (status) => {
        const colors = {
            'pendiente': 'bg-yellow-100 text-yellow-700 border-yellow-200',
            'en_proceso': 'bg-blue-100 text-blue-700 border-blue-200',
            'terminada': 'bg-green-100 text-green-700 border-green-200',
            'cancelada': 'bg-red-100 text-red-700 border-red-200'
        };
        const labels = {
            'pendiente': 'Pendiente',
            'en_proceso': 'En Proceso',
            'terminada': 'Terminada',
            'cancelada': 'Cancelada'
        };
        return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                {labels[status] || status}
            </span>
        );
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando órdenes de fabricación...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Fabricación</h1>
                    <p className="text-slate-500 mt-1">Gestión de órdenes de fabricación de piezas</p>
                </div>
                <button className="bg-brand-600 text-white px-4 py-2 rounded-xl hover:bg-brand-700 font-medium flex items-center gap-2">
                    <Plus size={18} />
                    Nueva Orden
                </button>
            </div>

            {/* Main Content - Master/Detail Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Orders List (Sidebar) */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Órdenes de Fabricación</h3>
                    {orders.map(order => (
                        <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedOrder?.id === order.id
                                ? 'bg-brand-50 border-brand-200 shadow-sm ring-1 ring-brand-200'
                                : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h4 className="font-bold text-slate-800">Orden #{order.id}</h4>
                                    <p className="text-sm text-slate-600">{order.pieceName}</p>
                                    <p className="text-xs text-slate-400">{order.pieceCode}</p>
                                </div>
                                {getStatusBadge(order.status)}
                            </div>
                            <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                                <span>{order.quantityCompleted}/{order.quantityPlanned} und</span>
                                {order.crewName && (
                                    <span className="flex items-center gap-1">
                                        <Users size={12} />
                                        {order.crewName}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                    {orders.length === 0 && (
                        <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-500 text-sm">
                            No hay órdenes de fabricación registradas.
                        </div>
                    )}
                </div>

                {/* Order Details (Main) */}
                <div className="lg:col-span-2">
                    {selectedOrder ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            {/* Order Header */}
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Orden de Fabricación #{selectedOrder.id}</h2>
                                        <p className="text-slate-500 mt-1">{selectedOrder.pieceName}</p>
                                    </div>
                                    {getStatusBadge(selectedOrder.status)}
                                </div>
                            </div>

                            {/* Order Information */}
                            <div className="p-6 space-y-6">
                                {/* Production Info */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Información de Producción</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-3 rounded-xl">
                                            <p className="text-xs text-slate-500">Pieza</p>
                                            <p className="font-bold text-slate-900">{selectedOrder.pieceName}</p>
                                            <p className="text-xs text-slate-400">{selectedOrder.pieceCode}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl">
                                            <p className="text-xs text-slate-500">Progreso</p>
                                            <p className="font-bold text-slate-900">{selectedOrder.quantityCompleted} / {selectedOrder.quantityPlanned}</p>
                                            <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                                                <div
                                                    className="bg-brand-600 h-2 rounded-full transition-all"
                                                    style={{ width: `${(selectedOrder.quantityCompleted / selectedOrder.quantityPlanned) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Dates & Crew */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Fechas y Asignación</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-3 rounded-xl">
                                            <p className="text-xs text-slate-500">Fecha de Inicio</p>
                                            <p className="font-medium text-slate-900">
                                                {selectedOrder.startDate
                                                    ? new Date(selectedOrder.startDate).toLocaleDateString()
                                                    : 'No definida'}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl">
                                            <p className="text-xs text-slate-500">Fecha de Fin</p>
                                            <p className="font-medium text-slate-900">
                                                {selectedOrder.endDate
                                                    ? new Date(selectedOrder.endDate).toLocaleDateString()
                                                    : 'No definida'}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl col-span-2">
                                            <p className="text-xs text-slate-500">Cuadrilla Asignada</p>
                                            <p className="font-medium text-slate-900">
                                                {selectedOrder.crewName || 'Sin asignar'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Work Order Link */}
                                {selectedOrder.workOrderId && (
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Orden de Trabajo Relacionada</h3>
                                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                                            <p className="text-xs text-blue-600 mb-1">Orden de Trabajo #{selectedOrder.workOrderId}</p>
                                            <p className="text-sm text-blue-700">{selectedOrder.workOrderDescription || 'Sin descripción'}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Notes */}
                                {selectedOrder.notes && (
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Notas</h3>
                                        <div className="bg-slate-50 p-3 rounded-xl">
                                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedOrder.notes}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="p-6 border-t border-slate-100 flex gap-3">
                                <button className="flex-1 bg-brand-600 text-white px-4 py-2 rounded-xl hover:bg-brand-700 font-medium">
                                    Editar Orden
                                </button>
                                <button className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium">
                                    Actualizar Progreso
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center p-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <div className="text-center">
                                <FileText size={48} className="mx-auto mb-4 text-slate-300" />
                                <p>Selecciona una orden para ver detalles.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
