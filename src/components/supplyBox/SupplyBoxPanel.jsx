import React, { useState, useEffect } from 'react';
import { Package, ArrowDownRight, ArrowUpRight, AlertTriangle, Trash2, History, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { SupplyBoxService } from '../../services/supplyBox';

const TYPE_LABELS = { material: 'Material', piece: 'Pieza', tool: 'Herramienta', epp: 'EPP' };
const TYPE_COLORS = {
    material: 'bg-blue-100 text-blue-700',
    piece: 'bg-purple-100 text-purple-700',
    tool: 'bg-amber-100 text-amber-700',
    epp: 'bg-green-100 text-green-700'
};
const MOVEMENT_LABELS = {
    entrada: { label: 'Entrada', icon: ArrowDownRight, color: 'text-green-600 bg-green-50' },
    devolucion: { label: 'Devolución', icon: ArrowUpRight, color: 'text-blue-600 bg-blue-50' },
    gasto: { label: 'Gasto', icon: Package, color: 'text-amber-600 bg-amber-50' },
    perdida: { label: 'Pérdida', icon: AlertTriangle, color: 'text-red-600 bg-red-50' }
};

export default function SupplyBoxPanel({ personId, canReport = false }) {
    const [box, setBox] = useState(null);
    const [items, setItems] = useState([]);
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [reportModal, setReportModal] = useState(null); // { item, type: 'gasto'|'perdida' }
    const [reportQty, setReportQty] = useState('');
    const [reportNotes, setReportNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadBox();
    }, [personId]);

    const loadBox = async () => {
        setLoading(true);
        try {
            const boxData = await SupplyBoxService.getBoxByPersonId(personId);
            setBox(boxData);
            if (boxData) {
                const [itemsData, movsData] = await Promise.all([
                    SupplyBoxService.getBoxItems(boxData.box_id),
                    SupplyBoxService.getBoxMovements(boxData.box_id)
                ]);
                setItems(itemsData);
                setMovements(movsData);
            }
        } catch (err) {
            console.error('Error loading supply box:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleReport = async () => {
        if (!reportModal || !reportQty || parseFloat(reportQty) <= 0) return;
        setSubmitting(true);
        try {
            await SupplyBoxService.reportConsumptionOrLoss(
                box.box_id, reportModal.item.item_type, reportModal.item.item_ref_id,
                parseFloat(reportQty), reportModal.type, reportNotes
            );
            setReportModal(null);
            setReportQty('');
            setReportNotes('');
            await loadBox();
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-brand-500" size={24} />
        </div>
    );

    if (!box) return (
        <div className="text-center py-12 text-slate-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No tienes una caja de suministros asignada.</p>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Items Grid */}
            <div>
                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Package size={16} className="text-brand-500" />
                    Contenido de la Caja ({items.length} items)
                </h4>

                {items.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">
                        <Package size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Tu caja está vacía</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {items.map(item => (
                            <div key={item.item_id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-shadow">
                                <div className="flex items-center gap-3">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${TYPE_COLORS[item.item_type]}`}>
                                        {TYPE_LABELS[item.item_type]}
                                    </span>
                                    <span className="text-sm font-medium text-slate-700">{item.item_name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-mono font-bold text-slate-800">
                                        {item.quantity} <span className="text-xs text-slate-400 font-normal">{item.item_unit}</span>
                                    </span>
                                    {canReport && (
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => setReportModal({ item, type: 'gasto' })}
                                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                title="Reportar gasto"
                                            >
                                                <Package size={14} />
                                            </button>
                                            <button
                                                onClick={() => setReportModal({ item, type: 'perdida' })}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Reportar pérdida"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Movement History */}
            <div>
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
                >
                    <History size={16} className="text-slate-400" />
                    Historial de Movimientos ({movements.length})
                    {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showHistory && (
                    <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                        {movements.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">Sin movimientos registrados</p>
                        ) : movements.map(mov => {
                            const config = MOVEMENT_LABELS[mov.movement_type];
                            const Icon = config?.icon || Package;
                            return (
                                <div key={mov.movement_id} className={`flex items-center gap-3 p-2.5 rounded-lg ${config?.color || 'bg-slate-50'}`}>
                                    <Icon size={14} />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-semibold">{config?.label}</span>
                                        <span className="text-xs text-slate-500 ml-2">{mov.item_name}</span>
                                        {mov.notes && <span className="text-xs text-slate-400 ml-1">— {mov.notes}</span>}
                                    </div>
                                    <span className="text-xs font-mono font-bold whitespace-nowrap">
                                        {mov.movement_type === 'entrada' ? '+' : '-'}{mov.quantity}
                                    </span>
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                        {new Date(mov.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Report Modal */}
            {reportModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setReportModal(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800">
                            {reportModal.type === 'gasto' ? '📦 Reportar Gasto' : '⚠️ Reportar Pérdida'}
                        </h3>
                        <p className="text-sm text-slate-500">
                            <strong>{reportModal.item.item_name}</strong> — Disponible: {reportModal.item.quantity} {reportModal.item.item_unit}
                        </p>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cantidad</label>
                            <input
                                type="number" min="0.01" max={reportModal.item.quantity} step="0.01"
                                value={reportQty} onChange={e => setReportQty(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                placeholder="Cantidad a reportar"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notas</label>
                            <textarea
                                value={reportNotes} onChange={e => setReportNotes(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none"
                                rows={2} placeholder="Motivo del gasto o pérdida..."
                            />
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                            <button onClick={() => setReportModal(null)}
                                className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl">
                                Cancelar
                            </button>
                            <button
                                onClick={handleReport} disabled={submitting || !reportQty}
                                className={`px-6 py-2 text-sm font-bold text-white rounded-xl disabled:opacity-40 flex items-center gap-2
                                    ${reportModal.type === 'gasto' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-red-600 hover:bg-red-500'}`}
                            >
                                {submitting && <Loader2 size={14} className="animate-spin" />}
                                Confirmar {reportModal.type === 'gasto' ? 'Gasto' : 'Pérdida'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
