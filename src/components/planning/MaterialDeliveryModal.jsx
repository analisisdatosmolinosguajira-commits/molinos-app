import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Plus, Trash2, Package, Truck, CheckCircle, Navigation } from 'lucide-react';
import { DeliveryService } from '../../services/deliveries';
import { CommunityService } from '../../services/communities';
import { WorkOrderService } from '../../services/work_orders';
import { WeeklyPlannerService } from '../../services/weeklyPlannerService';

export default function MaterialDeliveryModal({ isOpen, onClose, activity, onSuccess }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Options for dropdowns
    const [options, setOptions] = useState({
        communities: [],
        pieces: [],
        materials: [],
        tools: []
    });

    // The core state: an array of delivery stops.
    const [deliveries, setDeliveries] = useState([]);

    useEffect(() => {
        if (isOpen && activity) {
            loadData();
        } else {
            setDeliveries([]);
        }
    }, [isOpen, activity]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [communitiesRes, inventoryRes, currentPlan, plannedCommunities] = await Promise.all([
                CommunityService.getCommunities(),
                WorkOrderService.getInventoryOptions(),
                DeliveryService.getDeliveryPlan(activity.activity_id),
                WeeklyPlannerService.getActivityCommunities(activity.activity_id)
            ]);

            setOptions({
                communities: communitiesRes || [],
                ...inventoryRes
            });

            if (currentPlan && currentPlan.length > 0) {
                // Map the DB structure to our UI state structure
                setDeliveries(currentPlan.map(d => ({
                    ...d,
                    tempId: Math.random().toString(36).substr(2, 9),
                    isExpanded: false // UI state
                })));
            } else if (plannedCommunities && plannedCommunities.length > 0) {
                // Auto-seed delivery stops from planned communities (activity_community)
                setDeliveries(plannedCommunities.map(pc => ({
                    tempId: Math.random().toString(36).substr(2, 9),
                    delivery_id: null,
                    community_id: pc.community_id || pc.community?.community_id,
                    delivery_status: 'PENDING',
                    notes: '',
                    pieces: [],
                    materials: [],
                    tools: [],
                    isExpanded: false
                })));
            } else {
                setDeliveries([]);
            }

        } catch (err) {
            console.error("Error loading delivery data:", err);
            setError("Error al cargar datos. Verifique su conexión y permisos.");
        } finally {
            setLoading(false);
        }
    };

    const addStop = () => {
        setDeliveries([...deliveries, {
            tempId: Math.random().toString(36).substr(2, 9),
            delivery_id: null, // New stop
            community_id: '',
            delivery_status: 'PENDING',
            notes: '',
            pieces: [],
            materials: [],
            tools: [],
            isExpanded: true
        }]);
    };

    const removeStop = (index) => {
        if (!window.confirm("¿Seguro que desea eliminar esta parada de la ruta?")) return;
        const newList = [...deliveries];
        newList.splice(index, 1);
        setDeliveries(newList);
    };

    const toggleExpand = (index) => {
        const newList = [...deliveries];
        newList[index].isExpanded = !newList[index].isExpanded;
        setDeliveries(newList);
    };

    const updateStopField = (index, field, value) => {
        const newList = [...deliveries];
        newList[index][field] = value;
        setDeliveries(newList);
    };

    // Generic list handlers for resources per stop
    const addResource = (stopIndex, listName, defaultItem) => {
        const newList = [...deliveries];
        newList[stopIndex][listName].push({ ...defaultItem, tempId: Math.random().toString(36).substr(2, 9) });
        setDeliveries(newList);
    };

    const updateResource = (stopIndex, listName, resourceIndex, field, value) => {
        const newList = [...deliveries];
        newList[stopIndex][listName][resourceIndex][field] = value;
        setDeliveries(newList);
    };

    const removeResource = (stopIndex, listName, resourceIndex) => {
        const newList = [...deliveries];
        newList[stopIndex][listName].splice(resourceIndex, 1);
        setDeliveries(newList);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);

            // Validation basics
            if (deliveries.length === 0) {
                throw new Error("Debe agregar al menos una comunidad a la ruta.");
            }
            if (deliveries.some(d => !d.community_id)) {
                throw new Error("Todas las paradas deben tener una comunidad seleccionada.");
            }

            // Optional: Stock check preview
            // (You could implement a sum of all requested materials vs options.availability here)

            await DeliveryService.saveDeliveryPlan(activity.activity_id, deliveries);

            if (onSuccess) onSuccess();
            onClose();

        } catch (err) {
            console.error(err);
            setError(err.message || 'Error al guardar el plan de entrega.');
        } finally {
            setSaving(false);
        }
    };

    const handleCompleteStop = async (deliveryId, index) => {
        const stop = deliveries[index];

        // Final validation before sending
        const insufficient = [...stop.pieces, ...stop.materials, ...stop.tools].some(item => {
            const listType = item.piece_id ? 'pieces' : (item.material_id ? 'materials' : 'tools');
            const idField = item.piece_id ? 'piece_id' : (item.material_id ? 'material_id' : 'tool_id');
            const option = options[listType].find(o => o[idField] === item[idField]);
            return (item.quantity || 0) > (option?.available_stock || 0);
        });

        if (insufficient) {
            setError("No se puede confirmar la entrega: Hay insuficiencia de stock en uno o más ítems.");
            return;
        }

        if (!window.confirm("¿Confirmar la entrega en esta comunidad? Esto descontará los materiales del inventario de forma inmediata.")) return;

        try {
            setSaving(true);
            await DeliveryService.completeDelivery(deliveryId, deliveries[index].notes);
            // Refresh data to show it as completed and get updated stock if we re-fetch
            await loadData();
        } catch (err) {
            setError(err.message || 'Error al completar la entrega.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    /** Internal Select Component to simplify resource rows */
    const ResourceRow = ({ listName, items, optionList, idField, nameField, quantityField, stopIndex, isLocked }) => (
        <div className="space-y-2 mt-2">
            {items.map((item, idx) => {
                const opt = optionList.find(o => o[idField] === item[idField]);
                const isInsufficient = (item[quantityField] || 0) > (opt?.available_stock || 0);

                return (
                    <div key={item.tempId || idx} className="flex items-center gap-2">
                        <div className="flex-1">
                            <select
                                className={`w-full px-3 py-1.5 text-sm border rounded-lg outline-none ${isInsufficient ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'}`}
                                value={item[idField] || ''}
                                onChange={(e) => updateResource(stopIndex, listName, idx, idField, parseInt(e.target.value))}
                                disabled={isLocked}
                            >
                                <option value="">Seleccionar...</option>
                                {optionList.map(opt => (
                                    <option key={opt[idField]} value={opt[idField]}>
                                        {opt.code ? `${opt.code} - ` : ''}{opt[nameField]}
                                        {(opt.available_stock !== undefined) ? ` (${opt.available_stock} disp.)` : ''}
                                    </option>
                                ))}
                            </select>
                            {isInsufficient && item[idField] && (
                                <span className="text-[10px] text-red-600 font-bold ml-1">Stock Insuficiente</span>
                            )}
                        </div>
                        <input
                            type="number"
                            min="1"
                            className={`w-24 px-3 py-1.5 text-sm border rounded-lg outline-none ${isInsufficient ? 'bg-red-50 border-red-300 text-red-700' : 'bg-slate-50 border-slate-200'}`}
                            placeholder="Cant."
                            value={item[quantityField] || ''}
                            onChange={(e) => updateResource(stopIndex, listName, idx, quantityField, parseFloat(e.target.value))}
                            disabled={isLocked}
                        />
                        {!isLocked && (
                            <button
                                onClick={() => removeResource(stopIndex, listName, idx)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                title="Eliminar"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                );
            })}
            {!isLocked && (
                <button
                    onClick={() => addResource(stopIndex, listName, { [quantityField]: 1 })}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
                >
                    <Plus size={14} /> Agregar Item
                </button>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-100 text-brand-700 rounded-xl">
                            <Truck size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                Ruta de Entrega
                            </h2>
                            <p className="text-sm text-slate-500">
                                {activity?.title || 'Definir comunidades y materiales'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-6 px-4 py-3 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 border border-red-100">
                            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {loading ? (
                        <div className="py-12 flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {deliveries.map((stop, index) => {
                                const isCompleted = stop.delivery_status === 'COMPLETED';

                                return (
                                    <div key={stop.tempId || stop.delivery_id} className={`border rounded-xl overflow-hidden transition-colors ${isCompleted ? 'border-green-200 bg-green-50/30' : 'border-slate-200 bg-white shadow-sm'}`}>

                                        {/* Stop Header (Accordion Toggle) */}
                                        <div
                                            className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 ${stop.isExpanded ? 'border-b border-slate-100' : ''}`}
                                            onClick={() => toggleExpand(index)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-slate-900">
                                                            {options.communities.find(c => c.community_id == stop.community_id)?.name || 'Nueva Parada'}
                                                        </span>
                                                        {isCompleted && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                                                                <CheckCircle size={10} /> Entregado
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {stop.pieces?.length + stop.materials?.length} insumos, {stop.tools?.length} equipos
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* Only show Remove if NOT completed and NOT saving */}
                                                {!isCompleted && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeStop(index); }}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Eliminar parada"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stop Body (Expanded) */}
                                        {stop.isExpanded && (
                                            <div className="p-4 space-y-6">
                                                {/* Community Selection */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                                                            Comunidad Destino
                                                        </label>
                                                        <select
                                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm"
                                                            value={stop.community_id}
                                                            onChange={(e) => updateStopField(index, 'community_id', parseInt(e.target.value))}
                                                            disabled={isCompleted}
                                                        >
                                                            <option value="">Seleccione comunidad...</option>
                                                            {options.communities.map(c => (
                                                                <option key={c.community_id} value={c.community_id}>
                                                                    {c.name} ({c.municipality})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                                                            Notas / Novedades
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm"
                                                            placeholder="Observaciones de la entrega..."
                                                            value={stop.notes || ''}
                                                            onChange={(e) => updateStopField(index, 'notes', e.target.value)}
                                                            disabled={isCompleted}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Pieces */}
                                                    <div>
                                                        <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-800 border-b pb-1">
                                                            <Package size={16} className="text-brand-500" />
                                                            Piezas y Tubería
                                                        </h4>
                                                        <ResourceRow
                                                            listName="pieces"
                                                            items={stop.pieces}
                                                            optionList={options.pieces}
                                                            idField="piece_id"
                                                            nameField="name"
                                                            quantityField="quantity"
                                                            stopIndex={index}
                                                            isLocked={isCompleted}
                                                        />
                                                    </div>

                                                    {/* Materials */}
                                                    <div>
                                                        <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-800 border-b pb-1">
                                                            <Package size={16} className="text-brand-500" />
                                                            Materiales (Cemento, etc)
                                                        </h4>
                                                        <ResourceRow
                                                            listName="materials"
                                                            items={stop.materials}
                                                            optionList={options.materials}
                                                            idField="material_id"
                                                            nameField="name"
                                                            quantityField="quantity"
                                                            stopIndex={index}
                                                            isLocked={isCompleted}
                                                        />
                                                    </div>

                                                    {/* Tools */}
                                                    <div>
                                                        <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-800 border-b pb-1">
                                                            <Package size={16} className="text-amber-500" />
                                                            Herramientas
                                                        </h4>
                                                        <ResourceRow
                                                            listName="tools"
                                                            items={stop.tools}
                                                            optionList={options.tools}
                                                            idField="tool_id"
                                                            nameField="name"
                                                            quantityField="quantity"
                                                            stopIndex={index}
                                                            isLocked={isCompleted}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Confirmation Button for existing PENDING deliveries */}
                                                {!isCompleted && stop.delivery_id && (
                                                    <div className="pt-4 border-t border-slate-100 flex flex-col items-end gap-2">
                                                        {([
                                                            ...stop.pieces.map(p => ({ ...p, type: 'pieces', idKey: 'piece_id' })),
                                                            ...stop.materials.map(m => ({ ...m, type: 'materials', idKey: 'material_id' })),
                                                            ...stop.tools.map(t => ({ ...t, type: 'tools', idKey: 'tool_id' }))
                                                        ]).some(item => {
                                                            const opt = options[item.type].find(o => o[item.idKey] === item[item.idKey]);
                                                            const isInsufficient = (item.quantity || 0) > (opt?.available_stock || 0);
                                                            // Inject isInsufficient locally for ResourceRow to handle
                                                            item.isInsufficient = isInsufficient;
                                                            return isInsufficient;
                                                        }) ? (
                                                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100 mb-2">
                                                                <AlertTriangle size={16} />
                                                                <span className="text-xs font-medium">Hay ítems con stock insuficiente.</span>
                                                            </div>
                                                        ) : null}

                                                        <button
                                                            onClick={() => handleCompleteStop(stop.delivery_id, index)}
                                                            disabled={saving || ([
                                                                ...stop.pieces.map(p => ({ category: 'pieces', idKey: 'piece_id', val: p })),
                                                                ...stop.materials.map(m => ({ category: 'materials', idKey: 'material_id', val: m })),
                                                                ...stop.tools.map(t => ({ category: 'tools', idKey: 'tool_id', val: t }))
                                                            ].some(item => {
                                                                const opt = options[item.category].find(o => o[item.idKey] === item.val[item.idKey]);
                                                                return (item.val.quantity || 0) > (opt?.available_stock || 0);
                                                            }))}
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 font-bold rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:grayscale"
                                                        >
                                                            <CheckCircle size={18} />
                                                            Confirmar Entrega Aquí
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-6 flex justify-center">
                        <button
                            onClick={addStop}
                            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-dashed border-slate-300 text-slate-600 rounded-xl hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all font-medium"
                        >
                            <Navigation size={18} />
                            Añadir Comunidad a la Ruta
                        </button>
                    </div>
                </div>

                {/* Footer section (Save Plan) */}
                <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        disabled={saving}
                    >
                        Cerrar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="px-6 py-2.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? 'Guardando...' : 'Guardar Planificada'}
                        {!saving && <Save size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
}

