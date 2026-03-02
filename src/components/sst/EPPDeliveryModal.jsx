import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Users, Package, Search } from 'lucide-react';
import { SSTService } from '../../services/sst';

export default function EPPDeliveryModal({ isOpen, onClose, onSuccess }) {
    const [staff, setStaff] = useState([]);
    const [eppList, setEppList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([{ person_id: '', safety_id: '', quantity: 1, condition: 'NUEVO', size: '' }]);
    const [staffSearch, setStaffSearch] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const [staffData, eppData] = await Promise.all([
                    SSTService.getStaffWithEPPStatus(),
                    SSTService.getSafetyEquipmentList(),
                ]);
                setStaff(staffData);
                setEppList(eppData);
            } catch (err) {
                console.error('Error loading delivery data:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const addItem = () => {
        setItems([...items, { person_id: '', safety_id: '', quantity: 1, condition: 'NUEVO', size: '' }]);
    };

    const removeItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index, field, value) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };
        setItems(updated);
    };

    const handleSubmit = async () => {
        const validItems = items.filter(i => i.person_id && i.safety_id);
        if (validItems.length === 0) return alert('Agregue al menos un ítem válido');

        try {
            setSaving(true);

            // Calculate expiration for each item based on role requirements
            const enrichedItems = validItems.map(item => {
                const person = staff.find(s => s.person_id === parseInt(item.person_id));
                const req = person?.zones ? Object.values(person.zones).find(z => z.requirement?.safety_id === parseInt(item.safety_id)) : null;
                const renewalMonths = req?.requirement?.renewal_months || 6;

                const expiresAt = new Date();
                expiresAt.setMonth(expiresAt.getMonth() + renewalMonths);

                return {
                    ...item,
                    person_id: parseInt(item.person_id),
                    safety_id: parseInt(item.safety_id),
                    quantity: parseInt(item.quantity) || 1,
                    expires_at: expiresAt.toISOString().split('T')[0],
                };
            });

            await SSTService.createDelivery({
                delivery_date: deliveryDate,
                notes,
                items: enrichedItems,
            });

            onSuccess?.();
        } catch (err) {
            console.error('Error creating delivery:', err);
            alert('Error al registrar entrega: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Apply "all same person" shortcut
    const applyPersonToAll = (personId) => {
        setItems(items.map(item => ({ ...item, person_id: personId })));
    };

    if (!isOpen) return null;

    const filteredStaff = staff.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(staffSearch.toLowerCase())
    );

    return createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-50 rounded-xl">
                            <Package size={20} className="text-brand-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Registrar Entrega de EPP</h2>
                            <p className="text-xs text-slate-400">Seleccione personas y elementos a entregar</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-16">
                        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4" />
                    </div>
                ) : (
                    <div className="p-6 space-y-5">
                        {/* Date & Notes */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Fecha Entrega</label>
                                <input
                                    type="date"
                                    value={deliveryDate}
                                    onChange={e => setDeliveryDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Observaciones</label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Notas opcionales..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Items */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-xs font-bold text-slate-500 uppercase">Ítems de Entrega</label>
                                <button
                                    onClick={addItem}
                                    className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                                >
                                    <Plus size={14} /> Agregar ítem
                                </button>
                            </div>

                            <div className="space-y-3">
                                {items.map((item, idx) => (
                                    <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-100 relative">
                                        <div className="grid grid-cols-12 gap-3">
                                            {/* Person */}
                                            <div className="col-span-4">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Persona</label>
                                                <select
                                                    value={item.person_id}
                                                    onChange={e => updateItem(idx, 'person_id', e.target.value)}
                                                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {filteredStaff.map(s => (
                                                        <option key={s.person_id} value={s.person_id}>
                                                            {s.first_name} {s.last_name} ({s.role})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* EPP */}
                                            <div className="col-span-3">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">EPP</label>
                                                <select
                                                    value={item.safety_id}
                                                    onChange={e => updateItem(idx, 'safety_id', e.target.value)}
                                                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {eppList.map(epp => (
                                                        <option key={epp.safety_id} value={epp.safety_id}>
                                                            {epp.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Quantity */}
                                            <div className="col-span-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Cant.</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center"
                                                />
                                            </div>

                                            {/* Condition */}
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Motivo</label>
                                                <select
                                                    value={item.condition}
                                                    onChange={e => updateItem(idx, 'condition', e.target.value)}
                                                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                                                >
                                                    <option value="NUEVO">Nuevo</option>
                                                    <option value="REPOSICION">Reposición</option>
                                                    <option value="ACTIVIDAD_ESPECIFICA">Act. Específica</option>
                                                </select>
                                            </div>

                                            {/* Size */}
                                            <div className="col-span-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Talla</label>
                                                <select
                                                    value={item.size}
                                                    onChange={e => updateItem(idx, 'size', e.target.value)}
                                                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                                                >
                                                    <option value="">-</option>
                                                    <option value="XS">XS</option>
                                                    <option value="S">S</option>
                                                    <option value="M">M</option>
                                                    <option value="L">L</option>
                                                    <option value="XL">XL</option>
                                                </select>
                                            </div>

                                            {/* Remove */}
                                            <div className="col-span-1 flex items-end">
                                                {items.length > 1 && (
                                                    <button
                                                        onClick={() => removeItem(idx)}
                                                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="px-6 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all disabled:opacity-50"
                            >
                                {saving ? 'Registrando...' : 'Registrar Entrega'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
