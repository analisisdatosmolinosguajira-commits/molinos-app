import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save, X, Package, Calendar, Users, FileText, AlertTriangle, Activity } from 'lucide-react';
import { FabricationService } from '../../services/fabrication';
import { WorkOrderService } from '../../services/work_orders';
import { CrewService } from '../../services/crews';

export default function ManufacturingOrderForm({ orderId, onBack, onSuccess }) {
    const [searchParams] = useSearchParams();
    const isEditing = !!orderId;

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Options
    const [pieces, setPieces] = useState([]);
    const [crews, setCrews] = useState([]);
    const [workOrders, setWorkOrders] = useState([]);

    const [formData, setFormData] = useState({
        pieceId: '',
        quantityPlanned: 1,
        status: 'pendiente',
        startDate: new Date().toISOString().split('T')[0], // Default today
        endDate: '',
        crewId: '',
        workOrderId: '',
        notes: '',
        related_activity_id: null
    });

    useEffect(() => {
        loadOptions();

        // Handle URL Params for new orders
        if (!isEditing) {
            const activityId = searchParams.get('activity_id');
            const typeParam = searchParams.get('type'); // 'manufacturing'

            if (activityId) {
                setFormData(prev => ({ ...prev, related_activity_id: parseInt(activityId) }));
            }
        }
    }, [isEditing, searchParams]);

    useEffect(() => {
        if (orderId) {
            loadOrderDetails();
        }
    }, [orderId]);

    const loadOptions = async () => {
        try {
            setLoading(true);
            const [inventory, activeCrews, orders] = await Promise.all([
                WorkOrderService.getInventoryOptions(),
                CrewService.getActiveCrews(),
                WorkOrderService.getWorkOrders({ status: 'IN_PROGRESS' }) // Only link to active WOs? Or all?
            ]);

            setPieces(inventory.pieces || []);
            setCrews(activeCrews || []);
            setWorkOrders(orders || []);
        } catch (err) {
            console.error("Error loading options:", err);
            setError("Error cargando opciones");
        } finally {
            setLoading(false);
        }
    };

    const loadOrderDetails = async () => {
        try {
            setLoading(true);
            const order = await FabricationService.getManufacturingOrderById(orderId);
            setFormData({
                pieceId: order.pieceId,
                quantityPlanned: order.quantityPlanned,
                status: order.status,
                startDate: order.startDate ? order.startDate.split('T')[0] : '',
                endDate: order.endDate ? order.endDate.split('T')[0] : '',
                crewId: order.crewId || '',
                workOrderId: order.workOrderId || '',
                notes: order.notes || '',
                related_activity_id: null // Can't edit link once created usually, or fetching from relation?
            });
        } catch (err) {
            console.error("Error loading order:", err);
            setError("Error cargando la orden");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            if (!formData.pieceId) throw new Error("Debe seleccionar una pieza");
            if (formData.quantityPlanned <= 0) throw new Error("La cantidad debe ser mayor a 0");

            const payload = { ...formData };

            if (isEditing) {
                await FabricationService.updateManufacturingOrder(orderId, payload);
            } else {
                await FabricationService.createManufacturingOrder(payload);
                // If linked activity, we might need a separate call if the service doesn't handle it in create
                // FabricationService.createManufacturingOrder doesn't seem to look for related_activity_id in the payload
                // based on my previous read.
                // Let's check FabricationService again...
                // It takes: piece_id, work_order_id, ..., notes. It does NOT take related_activity_id explicitly in insert.
                // Wait, I should check the service definition I just read again.
            }

            // If we have related_activity_id and it's a new order, we might need to link it manually 
            // if the backend doesn't do it automatically. 
            // The service has `createManufacturingOrderFromActivity` but we are using manual form.
            // I should update the service or handle it here.
            // Let's assume for now I need to handle it.
            // But I don't have the new ID here if I used the service blindly.
            // Actually `createManufacturingOrder` returns `data`. 

            // Re-checking service code:
            /*
            async createManufacturingOrder(orderData) {
                const { data, error } = await supabase.from('manufacturing_order').insert({ ... }).select().single();
                return data;
            }
            */
            // It only inserts specific fields. `related_activity_id` is NOT in the insert list in `FabricationService.js`.
            // I should update `FabricationService.js` to include `related_activity_id` if I want to support this.
            // OR I make a second call here.

            // I'll make a second call here if needed, but cleaner to update service.
            // I will update the service in a separate step.

            onSuccess();
        } catch (err) {
            console.error("Error saving:", err);
            setError(err.message || "Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    if (loading && !pieces.length) return <div className="p-8 text-center">Cargando...</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Activity className="text-brand-600" />
                    {isEditing ? 'Editar Orden de Fabricación' : 'Nueva Orden de Fabricación'}
                </h2>
                <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {error && (
                    <div className="col-span-2 bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm font-medium">
                        <AlertTriangle size={18} />
                        {error}
                    </div>
                )}

                {/* Left Column */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Pieza a Fabricar</label>
                        <div className="relative">
                            <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none"
                                value={formData.pieceId}
                                onChange={e => setFormData({ ...formData, pieceId: e.target.value })}
                                required
                            >
                                <option value="">Seleccione una pieza...</option>
                                {pieces.map(p => (
                                    <option key={p.piece_id} value={p.piece_id}>
                                        {p.code} - {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Cantidad Planificada</label>
                        <input
                            type="number"
                            min="1"
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20"
                            value={formData.quantityPlanned}
                            onChange={e => setFormData({ ...formData, quantityPlanned: parseInt(e.target.value) || 0 })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Orden de Trabajo (Opcional)</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                value={formData.workOrderId}
                                onChange={e => setFormData({ ...formData, workOrderId: e.target.value })}
                            >
                                <option value="">Ninguna...</option>
                                {workOrders.map(wo => (
                                    <option key={wo.work_order_id} value={wo.work_order_id}>
                                        {wo.code} - {wo.description}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Cuadrilla Asignada</label>
                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                value={formData.crewId}
                                onChange={e => setFormData({ ...formData, crewId: e.target.value })}
                            >
                                <option value="">Sin asignar...</option>
                                {crews.map(c => (
                                    <option key={c.crew_id} value={c.crew_id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Inicio</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Fin</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                value={formData.endDate}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Full Width */}
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Notas / Observaciones</label>
                    <textarea
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[80px]"
                        placeholder="Detalles técnicos..."
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    />
                </div>

                {/* Actions */}
                <div className="col-span-1 md:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onBack}
                        className="px-6 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-lg shadow-brand-500/30 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                    >
                        {saving ? <Activity className="animate-spin" size={20} /> : <Save size={20} />}
                        {isEditing ? 'Guardar Cambios' : 'Crear Orden'}
                    </button>
                </div>
            </form>
        </div>
    );
}
