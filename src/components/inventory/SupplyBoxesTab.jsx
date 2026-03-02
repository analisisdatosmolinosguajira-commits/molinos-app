import React, { useState, useEffect } from 'react';
import { Package, User, ChevronDown, ChevronRight, Loader2, Search, ArrowDownRight, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { SupplyBoxService } from '../../services/supplyBox';

const TYPE_LABELS = { material: 'Material', piece: 'Pieza', tool: 'Herramienta', epp: 'EPP' };
const TYPE_COLORS = {
    material: 'bg-brand-100 text-brand-700',
    piece: 'bg-purple-100 text-purple-700',
    tool: 'bg-amber-100 text-amber-700',
    epp: 'bg-green-100 text-green-700'
};
const MOVEMENT_ICONS = {
    entrada: { icon: ArrowDownRight, color: 'text-green-600' },
    devolucion: { icon: ArrowUpRight, color: 'text-brand-600' },
    gasto: { icon: Package, color: 'text-amber-600' },
    perdida: { icon: AlertTriangle, color: 'text-red-600' }
};

export default function SupplyBoxesTab() {
    const [boxes, setBoxes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedBox, setExpandedBox] = useState(null);
    const [boxItems, setBoxItems] = useState({});
    const [boxMovements, setBoxMovements] = useState({});
    const [loadingDetails, setLoadingDetails] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadBoxes();
    }, []);

    const loadBoxes = async () => {
        try {
            const data = await SupplyBoxService.getAllBoxes();
            setBoxes(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleBox = async (box) => {
        if (expandedBox === box.box_id) {
            setExpandedBox(null);
            return;
        }
        setExpandedBox(box.box_id);

        if (!boxItems[box.box_id]) {
            setLoadingDetails(box.box_id);
            try {
                const [items, movements] = await Promise.all([
                    SupplyBoxService.getBoxItems(box.box_id),
                    SupplyBoxService.getBoxMovements(box.box_id, 20)
                ]);
                setBoxItems(prev => ({ ...prev, [box.box_id]: items }));
                setBoxMovements(prev => ({ ...prev, [box.box_id]: movements }));
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingDetails(null);
            }
        }
    };

    const filteredBoxes = boxes.filter(b =>
        b.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.person?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.person?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand-500" size={24} /></div>
    );

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="relative max-w-sm">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                    type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20"
                />
            </div>

            {/* Boxes */}
            {filteredBoxes.length === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl">
                    <Package size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No hay cajas de suministros registradas</p>
                </div>
            ) : (
                filteredBoxes.map(box => {
                    const isExpanded = expandedBox === box.box_id;
                    const items = boxItems[box.box_id] || [];
                    const movements = boxMovements[box.box_id] || [];
                    const roleName = box.person?.person_role?.[0]?.name || box.person?.person_role?.name || '';

                    return (
                        <div key={box.box_id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                            {/* Box Header */}
                            <button
                                onClick={() => toggleBox(box)}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                        <Package size={20} className="text-amber-600" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-slate-800">{box.label}</h3>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <User size={12} />
                                            {box.person?.first_name} {box.person?.last_name}
                                            {roleName && (
                                                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-500 font-medium">{roleName}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                                        {items.length > 0 ? `${items.length} items` : isExpanded ? '0 items' : ''}
                                    </span>
                                    {isExpanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                                </div>
                            </button>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="border-t border-slate-100 p-4">
                                    {loadingDetails === box.box_id ? (
                                        <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Items */}
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Contenido</h4>
                                                {items.length === 0 ? (
                                                    <p className="text-sm text-slate-400 italic">Caja vacía</p>
                                                ) : (
                                                    <div className="space-y-1.5">
                                                        {items.map(item => (
                                                            <div key={item.item_id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${TYPE_COLORS[item.item_type]}`}>
                                                                        {TYPE_LABELS[item.item_type]}
                                                                    </span>
                                                                    <span className="text-sm text-slate-700">{item.item_name}</span>
                                                                </div>
                                                                <span className="text-sm font-mono font-bold text-slate-800">
                                                                    {item.quantity} <span className="text-xs text-slate-400 font-normal">{item.item_unit}</span>
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Recent Movements */}
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Últimos Movimientos</h4>
                                                {movements.length === 0 ? (
                                                    <p className="text-sm text-slate-400 italic">Sin movimientos</p>
                                                ) : (
                                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                                        {movements.map(mov => {
                                                            const config = MOVEMENT_ICONS[mov.movement_type];
                                                            const Icon = config?.icon || Package;
                                                            return (
                                                                <div key={mov.movement_id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-xs">
                                                                    <Icon size={12} className={config?.color} />
                                                                    <span className="font-semibold capitalize">{mov.movement_type}</span>
                                                                    <span className="text-slate-500 flex-1 truncate">{mov.item_name}</span>
                                                                    <span className="font-mono font-bold">
                                                                        {mov.movement_type === 'entrada' ? '+' : '-'}{mov.quantity}
                                                                    </span>
                                                                    <span className="text-slate-400">
                                                                        {new Date(mov.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
}
