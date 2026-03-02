import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    ClipboardList, Users, Package, AlertTriangle, CheckCircle,
    Clock, XCircle, ChevronDown, ChevronUp, Plus, Trash2, X,
    Download, Filter, Search, ShieldCheck
} from 'lucide-react';
import { SSTService } from '../../services/sst';
import * as XLSX from 'xlsx';

const SIZES = ['XS', 'S', 'M', 'L', 'XL'];

const STATUS_CONFIG = {
    MISSING: { color: 'bg-red-100 text-red-700', dot: 'bg-red-500', label: 'No Entregado', icon: XCircle },
    EXPIRED: { color: 'bg-red-100 text-red-700', dot: 'bg-red-500', label: 'Vencido', icon: AlertTriangle },
    EXPIRING: { color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500', label: 'Por Vencer', icon: Clock },
    OK: { color: 'bg-green-100 text-green-700', dot: 'bg-green-500', label: 'Vigente', icon: CheckCircle },
};

export default function SSTRequisitionPlanTab() {
    const [loading, setLoading] = useState(true);
    const [planItems, setPlanItems] = useState([]);
    const [allItems, setAllItems] = useState([]);
    const [subTab, setSubTab] = useState('person'); // 'person' | 'consolidated'
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('NEEDS_ACTION'); // ALL | NEEDS_ACTION
    const [expandedPersons, setExpandedPersons] = useState(new Set());

    // Manual add modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [eppList, setEppList] = useState([]);
    const [manualItem, setManualItem] = useState({ epp_name: '', safety_id: '', size: '', quantity: 1, notes: '' });

    useEffect(() => {
        loadPlan();
    }, []);

    const loadPlan = async () => {
        try {
            setLoading(true);
            const [planData, eppData] = await Promise.all([
                SSTService.getRequisitionPlanData(),
                SSTService.getSafetyEquipmentList(),
            ]);
            setAllItems(planData.plan);
            setPlanItems(planData.plan.map(item => ({ ...item })));
            setEppList(eppData);
        } catch (err) {
            console.error('Error loading plan:', err);
        } finally {
            setLoading(false);
        }
    };

    // Toggle include in plan
    const toggleItem = (index) => {
        const updated = [...planItems];
        updated[index].include_in_plan = !updated[index].include_in_plan;
        setPlanItems(updated);
    };

    // Update size for a specific item
    const updateItemSize = (index, size) => {
        const updated = [...planItems];
        updated[index].last_size = size;
        setPlanItems(updated);
    };

    // Update quantity for a specific item
    const updateItemQuantity = (index, qty) => {
        const updated = [...planItems];
        updated[index].quantity = Math.max(1, parseInt(qty) || 1);
        setPlanItems(updated);
    };

    // Toggle person expand
    const togglePerson = (personId) => {
        const next = new Set(expandedPersons);
        if (next.has(personId)) next.delete(personId);
        else next.add(personId);
        setExpandedPersons(next);
    };

    // Get filtered items
    const filteredItems = planItems.filter(item => {
        if (search) {
            const term = search.toLowerCase();
            const match = `${item.first_name} ${item.last_name} ${item.epp_name} ${item.role}`.toLowerCase().includes(term);
            if (!match) return false;
        }
        if (statusFilter === 'NEEDS_ACTION') return item.needs_action;
        return true;
    });

    // Group by person
    const personGroups = {};
    filteredItems.forEach(item => {
        if (!personGroups[item.person_id]) {
            personGroups[item.person_id] = {
                person_id: item.person_id,
                name: `${item.first_name} ${item.last_name}`,
                role: item.role,
                items: [],
            };
        }
        personGroups[item.person_id].items.push(item);
    });
    const personList = Object.values(personGroups).sort((a, b) => a.name.localeCompare(b.name));

    // Build consolidated view
    const getConsolidated = () => {
        const included = planItems.filter(i => i.include_in_plan);
        const map = {};

        included.forEach(item => {
            const key = `${item.safety_id}_${item.last_size || 'SIN_TALLA'}`;
            if (!map[key]) {
                map[key] = {
                    safety_id: item.safety_id,
                    epp_name: item.epp_name,
                    epp_code: item.epp_code,
                    size: item.last_size || '',
                    quantity: 0,
                    people: [],
                };
            }
            map[key].quantity += item.quantity;
            map[key].people.push(`${item.first_name} ${item.last_name}`);
        });

        // Add manual items
        manualItems.forEach(mi => {
            const key = `manual_${mi.id}`;
            map[key] = {
                safety_id: mi.safety_id,
                epp_name: mi.epp_name,
                epp_code: '',
                size: mi.size,
                quantity: mi.quantity,
                people: [mi.notes || 'Ítem manual'],
                isManual: true,
                manualId: mi.id,
            };
        });

        return Object.values(map).sort((a, b) => a.epp_name.localeCompare(b.epp_name));
    };

    // Manual items state
    const [manualItems, setManualItems] = useState([]);

    const addManualItem = () => {
        if (!manualItem.safety_id) return alert('Seleccione un EPP');
        const epp = eppList.find(e => e.safety_id === parseInt(manualItem.safety_id));
        setManualItems([
            ...manualItems,
            {
                id: Date.now(),
                safety_id: parseInt(manualItem.safety_id),
                epp_name: epp?.name || 'EPP',
                size: manualItem.size,
                quantity: parseInt(manualItem.quantity) || 1,
                notes: manualItem.notes,
            },
        ]);
        setManualItem({ epp_name: '', safety_id: '', size: '', quantity: 1, notes: '' });
        setShowAddModal(false);
    };

    const removeManualItem = (id) => {
        setManualItems(manualItems.filter(m => m.id !== id));
    };

    // Export as Excel (.xlsx)
    const exportExcel = () => {
        const wb = XLSX.utils.book_new();
        const today = new Date().toLocaleDateString('es-CO');

        // ── Sheet 1: Consolidado ──
        const consData = getConsolidated();
        const consRows = [
            ['SOLICITUD DE EPP - CONSOLIDADO'],
            [`Fecha de generación: ${today}`],
            [],
            ['#', 'EPP', 'Código', 'Talla', 'Cantidad', 'Tipo', 'Personas'],
            ...consData.map((c, i) => [
                i + 1,
                c.epp_name,
                c.epp_code || '',
                c.size || 'N/A',
                c.quantity,
                c.isManual ? 'Manual' : 'Automático',
                c.people.join(', '),
            ]),
            [],
            ['', 'TOTAL', '', '', consData.reduce((s, c) => s + c.quantity, 0), '', `${consData.length} productos`],
        ];
        const wsConsol = XLSX.utils.aoa_to_sheet(consRows);

        // Set column widths
        wsConsol['!cols'] = [
            { wch: 4 },  // #
            { wch: 30 }, // EPP
            { wch: 12 }, // Código
            { wch: 8 },  // Talla
            { wch: 10 }, // Cantidad
            { wch: 12 }, // Tipo
            { wch: 50 }, // Personas
        ];

        // Merge title row
        wsConsol['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
        ];

        XLSX.utils.book_append_sheet(wb, wsConsol, 'Consolidado');

        // ── Sheet 2: Detalle por Persona ──
        const included = planItems.filter(i => i.include_in_plan);
        const detailRows = [
            ['DETALLE EPP POR PERSONA'],
            [`Fecha: ${today}`],
            [],
            ['Persona', 'Rol', 'EPP', 'Zona', 'Estado', 'Talla', 'Cantidad', 'Vencimiento', 'Últ. Entrega'],
            ...included.map(item => [
                `${item.first_name} ${item.last_name}`,
                item.role,
                item.epp_name,
                item.body_zone || '',
                STATUS_CONFIG[item.status]?.label || item.status,
                item.last_size || 'N/A',
                item.quantity,
                item.expires_at || '—',
                item.last_delivery_date || '—',
            ]),
            [],
            ['TOTAL', '', '', '', '', '', included.reduce((s, i) => s + i.quantity, 0), '', ''],
        ];
        const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);

        wsDetail['!cols'] = [
            { wch: 25 }, // Persona
            { wch: 18 }, // Rol
            { wch: 25 }, // EPP
            { wch: 12 }, // Zona
            { wch: 14 }, // Estado
            { wch: 8 },  // Talla
            { wch: 10 }, // Cantidad
            { wch: 14 }, // Vencimiento
            { wch: 14 }, // Últ. Entrega
        ];

        wsDetail['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
        ];

        XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle por Persona');

        // Download
        XLSX.writeFile(wb, `solicitud_epp_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // KPIs
    const totalNeeded = planItems.filter(i => i.needs_action).length;
    const totalIncluded = planItems.filter(i => i.include_in_plan).length;
    const consolidated = getConsolidated();
    const totalUnits = consolidated.reduce((sum, c) => sum + c.quantity, 0);

    if (loading) {
        return (
            <div className="text-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-slate-400">Analizando requerimientos...</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">Requieren Acción</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{totalNeeded}</p>
                    <p className="text-xs text-slate-400">EPPs vencidos o faltantes</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">En Solicitud</p>
                    <p className="text-2xl font-bold text-brand-600 mt-1">{totalIncluded}</p>
                    <p className="text-xs text-slate-400">ítems seleccionados</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">Unidades Totales</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{totalUnits}</p>
                    <p className="text-xs text-slate-400">incluyendo manuales</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">EPPs Distintos</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{consolidated.length}</p>
                    <p className="text-xs text-slate-400">productos a solicitar</p>
                </div>
            </div>

            {/* Sub-tabs & Actions */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setSubTab('person')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
                            ${subTab === 'person' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Users size={15} /> Por Persona
                    </button>
                    <button
                        onClick={() => setSubTab('consolidated')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
                            ${subTab === 'consolidated' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ClipboardList size={15} /> Consolidado
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-brand-50 text-brand-600 font-semibold rounded-xl text-xs hover:bg-brand-100"
                    >
                        <Plus size={14} /> Agregar Manual
                    </button>
                    <button
                        onClick={exportExcel}
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 font-semibold rounded-xl text-xs hover:bg-green-100 border border-green-200"
                    >
                        <Download size={14} /> Exportar Excel
                    </button>
                </div>
            </div>

            {/* ──── PER PERSON VIEW ──── */}
            {subTab === 'person' && (
                <div className="space-y-4">
                    {/* Search & Filter */}
                    <div className="flex gap-3 flex-wrap">
                        <div className="flex-1 min-w-[200px] relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar persona o EPP..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setStatusFilter('NEEDS_ACTION')}
                                className={`px-3 py-2 rounded-lg text-xs font-semibold ${statusFilter === 'NEEDS_ACTION' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                            >
                                Solo Pendientes
                            </button>
                            <button
                                onClick={() => setStatusFilter('ALL')}
                                className={`px-3 py-2 rounded-lg text-xs font-semibold ${statusFilter === 'ALL' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                            >
                                Todos
                            </button>
                        </div>
                    </div>

                    {personList.length === 0 ? (
                        <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <ShieldCheck size={48} className="mx-auto mb-3 text-slate-200" />
                            <p className="text-slate-400 font-medium">
                                {statusFilter === 'NEEDS_ACTION'
                                    ? 'Todo el personal tiene sus EPPs al día 🎉'
                                    : 'No se encontraron resultados'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {personList.map(group => {
                                const isExpanded = expandedPersons.has(group.person_id);
                                const needsAction = group.items.filter(i => i.needs_action).length;
                                const includedCount = group.items.filter(i => i.include_in_plan).length;

                                return (
                                    <div key={group.person_id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                        <button
                                            onClick={() => togglePerson(group.person_id)}
                                            className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                {group.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-800 text-sm">{group.name}</p>
                                                <p className="text-xs text-slate-400">{group.role} · {group.items.length} EPPs</p>
                                            </div>
                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                {needsAction > 0 && (
                                                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                                                        {needsAction} pendiente{needsAction > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                                {includedCount > 0 && (
                                                    <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-full">
                                                        {includedCount} en solicitud
                                                    </span>
                                                )}
                                                {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="border-t border-slate-100">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="bg-slate-50/50">
                                                            <th className="w-10 px-3 py-2"></th>
                                                            <th className="text-left px-3 py-2 text-[10px] font-bold text-slate-400 uppercase">EPP</th>
                                                            <th className="text-center px-3 py-2 text-[10px] font-bold text-slate-400 uppercase">Estado</th>
                                                            <th className="text-center px-3 py-2 text-[10px] font-bold text-slate-400 uppercase">Vencimiento</th>
                                                            <th className="text-center px-3 py-2 text-[10px] font-bold text-slate-400 uppercase">Talla</th>
                                                            <th className="text-center px-3 py-2 text-[10px] font-bold text-slate-400 uppercase">Cant.</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.items.map(item => {
                                                            const globalIdx = planItems.findIndex(p =>
                                                                p.person_id === item.person_id && p.safety_id === item.safety_id
                                                            );
                                                            const sc = STATUS_CONFIG[item.status];
                                                            const StatusIcon = sc.icon;

                                                            return (
                                                                <tr key={`${item.person_id}-${item.safety_id}`} className={`border-b border-slate-50 ${item.include_in_plan ? 'bg-brand-50/30' : ''}`}>
                                                                    <td className="px-3 py-2.5 text-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={item.include_in_plan}
                                                                            onChange={() => toggleItem(globalIdx)}
                                                                            className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2.5">
                                                                        <p className="text-sm font-medium text-slate-800">{item.epp_name}</p>
                                                                        <p className="text-xs text-slate-400">{item.body_zone} · {item.renewal_months}m</p>
                                                                    </td>
                                                                    <td className="px-3 py-2.5 text-center">
                                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.color}`}>
                                                                            <StatusIcon size={10} /> {sc.label}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-2.5 text-center text-xs text-slate-500">
                                                                        {item.expires_at || '—'}
                                                                    </td>
                                                                    <td className="px-3 py-2.5 text-center">
                                                                        <select
                                                                            value={item.last_size}
                                                                            onChange={e => updateItemSize(globalIdx, e.target.value)}
                                                                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs bg-white text-center min-w-[60px]"
                                                                        >
                                                                            <option value="">—</option>
                                                                            {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                                                        </select>
                                                                    </td>
                                                                    <td className="px-3 py-2.5 text-center">
                                                                        <input
                                                                            type="number"
                                                                            min="1"
                                                                            value={item.quantity}
                                                                            onChange={e => updateItemQuantity(globalIdx, e.target.value)}
                                                                            className="w-12 px-1 py-1 border border-slate-200 rounded-lg text-xs text-center"
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ──── CONSOLIDATED VIEW ──── */}
            {subTab === 'consolidated' && (
                <div className="space-y-4">
                    {consolidated.length === 0 ? (
                        <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <ClipboardList size={48} className="mx-auto mb-3 text-slate-200" />
                            <p className="text-slate-400 font-medium">No hay ítems en la solicitud</p>
                            <p className="text-xs text-slate-400 mt-1">Seleccione EPPs en la pestaña "Por Persona" o agregue manualmente</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase">EPP</th>
                                        <th className="text-center px-5 py-3 text-xs font-bold text-slate-400 uppercase">Talla</th>
                                        <th className="text-center px-5 py-3 text-xs font-bold text-slate-400 uppercase">Cantidad</th>
                                        <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase">Personas</th>
                                        <th className="px-3 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {consolidated.map((c, idx) => (
                                        <tr key={idx} className={`border-b border-slate-50 hover:bg-slate-50/50 ${c.isManual ? 'bg-blue-50/30' : ''}`}>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <Package size={16} className={c.isManual ? 'text-blue-500' : 'text-slate-400'} />
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-800">{c.epp_name}</p>
                                                        {c.epp_code && <p className="text-xs text-slate-400">{c.epp_code}</p>}
                                                        {c.isManual && <span className="text-[10px] text-blue-600 font-bold">MANUAL</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.size ? 'bg-slate-100 text-slate-700' : 'bg-slate-50 text-slate-400'}`}>
                                                    {c.size || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <span className="text-lg font-bold text-slate-800">{c.quantity}</span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <p className="text-xs text-slate-500 max-w-xs truncate" title={c.people.join(', ')}>
                                                    {c.people.slice(0, 3).join(', ')}
                                                    {c.people.length > 3 && ` +${c.people.length - 3} más`}
                                                </p>
                                            </td>
                                            <td className="px-3 py-3.5 text-center">
                                                {c.isManual && (
                                                    <button
                                                        onClick={() => removeManualItem(c.manualId)}
                                                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                                        <td className="px-5 py-3 font-bold text-slate-800 text-sm">TOTAL</td>
                                        <td></td>
                                        <td className="px-5 py-3 text-center">
                                            <span className="text-lg font-bold text-brand-600">{totalUnits}</span>
                                        </td>
                                        <td colSpan="2" className="px-5 py-3 text-xs text-slate-400">
                                            {consolidated.length} productos distintos
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ──── ADD MANUAL ITEM MODAL ──── */}
            {showAddModal && createPortal(
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-50 rounded-xl">
                                    <Plus size={20} className="text-brand-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">Agregar EPP Manual</h2>
                                    <p className="text-xs text-slate-400">Agregar ítem adicional a la solicitud</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">EPP *</label>
                                <select
                                    value={manualItem.safety_id}
                                    onChange={e => setManualItem({ ...manualItem, safety_id: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                                >
                                    <option value="">Seleccionar EPP...</option>
                                    {eppList.map(epp => (
                                        <option key={epp.safety_id} value={epp.safety_id}>{epp.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Talla</label>
                                    <select
                                        value={manualItem.size}
                                        onChange={e => setManualItem({ ...manualItem, size: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                                    >
                                        <option value="">N/A</option>
                                        {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cantidad</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={manualItem.quantity}
                                        onChange={e => setManualItem({ ...manualItem, quantity: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-center"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Notas</label>
                                <input
                                    type="text"
                                    value={manualItem.notes}
                                    onChange={e => setManualItem({ ...manualItem, notes: e.target.value })}
                                    placeholder="Para actividad especial, repuesto extra, etc."
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 pt-0">
                            <button onClick={() => setShowAddModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm">
                                Cancelar
                            </button>
                            <button
                                onClick={addManualItem}
                                disabled={!manualItem.safety_id}
                                className="px-6 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-500/30 text-sm disabled:opacity-50"
                            >
                                Agregar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
