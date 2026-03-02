import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Link as LinkIcon, Plus, Search, Calendar, MapPin, Users, Wrench, ClipboardList, MessageSquare, Package } from 'lucide-react';
import { MovementService } from '../../services/visits';
import { WorkOrderService } from '../../services/work_orders';
import { DiagnosisService } from '../../services/diagnosis';
import { ConcertationService } from '../../services/concertations';
import { ManufacturingService } from '../../services/fabrication';

const LinkActivityModal = ({ isOpen, onClose, activity, onSuccess }) => {
    const navigate = useNavigate();
    const [linkType, setLinkType] = useState('movement'); // 'movement' | 'workorder' | 'diagnosis' | 'concertation' | 'manufacturing'
    const [mode, setMode] = useState('create'); // 'create' or 'link'
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItemId, setSelectedItemId] = useState(null);

    const linkTypes = [
        { id: 'movement', label: 'Desplazamiento', icon: MapPin, color: 'purple' },
        { id: 'workorder', label: 'Orden de Trabajo', icon: Wrench, color: 'blue' },
        { id: 'diagnosis', label: 'Diagnóstico', icon: ClipboardList, color: 'orange' },
        { id: 'concertation', label: 'Concertación', icon: MessageSquare, color: 'green' },
        { id: 'manufacturing', label: 'Fabricación', icon: Package, color: 'indigo' }
    ];

    useEffect(() => {
        if (isOpen && mode === 'link') {
            loadAvailableItems();
        }
    }, [isOpen, mode, linkType]);

    const loadAvailableItems = async () => {
        try {
            setLoading(true);
            let data = [];

            // Helper to remove duplicates based on unique ID field
            const deduplicate = (items, idField) => {
                if (!items || !Array.isArray(items)) return [];
                const seen = new Set();
                const result = items.filter(item => {
                    const id = item[idField];
                    if (id === undefined || id === null) {
                        console.warn(`Item found with no ID (${idField}):`, item);
                        return false; // Skip items without ID
                    }
                    if (seen.has(id)) {
                        console.warn(`Duplicate item found for ID ${id} (${idField})`);
                        return false;
                    }
                    seen.add(id);
                    return true;
                });
                console.log(`Loaded ${items.length} items, ${result.length} unique items for ${linkType}`);
                return result;
            };

            switch (linkType) {
                case 'movement':
                    const movements = await MovementService.getMovements();
                    data = deduplicate(movements, 'movement_id').filter(m => !m.related_activity_id);
                    break;
                case 'workorder':
                    const workOrders = await WorkOrderService.getWorkOrders();
                    data = deduplicate(workOrders, 'work_order_id').filter(wo => !wo.related_activity_id);
                    break;
                case 'diagnosis':
                    const diagnoses = await DiagnosisService.getDiagnoses();
                    data = deduplicate(diagnoses, 'diagnosis_id').filter(d => !d.related_activity_id);
                    break;
                case 'concertation':
                    const concertations = await ConcertationService.getConcertations();
                    data = deduplicate(concertations, 'concertation_id').filter(c => !c.related_activity_id);
                    break;
                case 'manufacturing':
                    const manufacturing = await ManufacturingService.getManufacturingOrders();
                    data = deduplicate(manufacturing, 'id').filter(mo => !mo.related_activity_id);
                    break;
            }

            setItems(data);
        } catch (error) {
            console.error('Error loading items:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        // Redirect to the appropriate form with activity_id in query params
        // The form will pre-fill fields from the activity data
        const routes = {
            'movement': `/visitas?action=new&type=movement&activity_id=${activity.activity_id}`,
            'workorder': `/ordenes?action=new&activity_id=${activity.activity_id}`,
            'diagnosis': `/diagnosticos?action=new&activity_id=${activity.activity_id}`,
            'concertation': `/concertaciones?action=new&activity_id=${activity.activity_id}`,
            'manufacturing': `/fabricacion?action=new&activity_id=${activity.activity_id}`
        };

        const route = routes[linkType];
        if (route) {
            navigate(route);
            onClose();
        } else {
            alert(`Ruta no configurada para ${getLinkTypeLabel()}`);
        }
    };

    const handleLink = async () => {
        if (!selectedItemId) {
            alert('Por favor selecciona un elemento');
            return;
        }

        try {
            setLoading(true);

            switch (linkType) {
                case 'movement':
                    await MovementService.linkMovementToActivity(selectedItemId, activity.activity_id);
                    break;
                case 'workorder':
                    await WorkOrderService.linkWorkOrderToActivity(selectedItemId, activity.activity_id);
                    break;
                case 'diagnosis':
                    await DiagnosisService.linkDiagnosisToActivity(selectedItemId, activity.activity_id);
                    break;
                case 'concertation':
                    await ConcertationService.linkConcertationToActivity(selectedItemId, activity.activity_id);
                    break;
                case 'manufacturing':
                    await ManufacturingService.linkManufacturingOrderToActivity(selectedItemId, activity.activity_id);
                    break;
            }

            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Error linking:', error);
            alert(`Error al vincular ${getLinkTypeLabel()}. Por favor intenta de nuevo.`);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = () => {
        if (mode === 'create') {
            handleCreate();
        } else {
            handleLink();
        }
    };

    const getLinkTypeLabel = () => {
        return linkTypes.find(t => t.id === linkType)?.label || '';
    };

    const getCurrentTypeIcon = () => {
        const type = linkTypes.find(t => t.id === linkType);
        if (!type) return null;
        const Icon = type.icon;
        return <Icon size={20} />;
    };

    const filteredItems = items.filter(item => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();

        // Search based on type
        switch (linkType) {
            case 'movement':
                return item.objective?.toLowerCase().includes(search);
            case 'workorder':
                return item.wo_code?.toLowerCase().includes(search) ||
                    item.description?.toLowerCase().includes(search);
            case 'diagnosis':
                return item.mill_code?.toLowerCase().includes(search);
            case 'concertation':
                return item.title?.toLowerCase().includes(search);
            case 'manufacturing':
                return item.pieceCode?.toLowerCase().includes(search) ||
                    item.pieceName?.toLowerCase().includes(search);
            default:
                return true;
        }
    });

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Helper to get linked items for current type
    const getLinkedItems = () => {
        if (!activity) return [];

        switch (linkType) {
            case 'movement':
                return activity.related_movements || [];
            case 'workorder':
                return activity.related_work_order || [];
            case 'diagnosis':
                return activity.related_diagnosis || [];
            case 'concertation':
                return activity.related_concertation || [];
            case 'manufacturing':
                return activity.related_manufacturing || [];
            default:
                return [];
        }
    };

    const renderLinkedItems = () => {
        const linkedItems = getLinkedItems();
        if (linkedItems.length === 0) return null;

        return (
            <div className="px-6 py-4 bg-brand-50 border-b border-brand-100">
                <p className="text-xs font-semibold text-brand-800 uppercase tracking-wide mb-2">
                    Vinculado Actualmente ({linkedItems.length})
                </p>
                <div className="space-y-2">
                    {linkedItems.map((item, index) => (
                        <div key={`linked-${index}`} className="bg-white p-3 rounded-lg border border-brand-200 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    {/* Content specific to type */}
                                    {linkType === 'movement' && (
                                        <>
                                            <div className="text-xs font-mono text-slate-500 mb-0.5">#{item.movement_id}</div>
                                            <div className="font-medium text-slate-900">{item.objective}</div>
                                            <div className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                                                <Calendar size={10} /> {formatDate(item.start_date)}
                                            </div>
                                        </>
                                    )}
                                    {linkType === 'workorder' && (
                                        <>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-xs font-mono text-slate-500">{item.code || item.wo_code}</span>
                                                {item.mill?.code && (
                                                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                                        {item.mill.code}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="font-medium text-slate-900">{item.description || 'Sin descripción'}</div>
                                            <div className="text-xs text-slate-600 mt-1">Status: {item.status}</div>
                                        </>
                                    )}
                                    {linkType === 'diagnosis' && (
                                        <>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-xs font-mono text-slate-500">{item.code || `DIAG-${item.diagnosis_id}`}</span>
                                                {item.mill?.code && (
                                                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                                        {item.mill.code}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="font-medium text-slate-900">Diagnóstico</div>
                                            <div className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                                                <Calendar size={10} /> {formatDate(item.diagnosis_date)}
                                            </div>
                                        </>
                                    )}
                                    {linkType === 'concertation' && (
                                        <>
                                            <div className="font-medium text-slate-900">
                                                {item.community?.name || item.title || 'Concertación'}
                                            </div>
                                            <div className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                                                <Calendar size={10} /> {formatDate(item.meeting_date)}
                                            </div>
                                        </>
                                    )}
                                    {linkType === 'manufacturing' && (
                                        <>
                                            <div className="text-xs font-mono text-slate-500 mb-0.5">MO-{item.mo_id || item.id}</div>
                                            <div className="font-medium text-slate-900">
                                                {item.piece?.name || 'Orden de Fabricación'}
                                            </div>
                                            {item.notes && (
                                                <div className="text-xs text-slate-500 mt-1 italic">"{item.notes}"</div>
                                            )}
                                            <div className="text-xs text-slate-600 mt-1">Cant: {item.quantity_planned}</div>
                                        </>
                                    )}
                                </div>
                                <div className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                                    <LinkIcon size={10} />
                                    Vinculado
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderItemCard = (item, index) => {
        switch (linkType) {
            case 'movement':
                return (
                    <div key={`${item.movement_id}-${index}`} onClick={() => setSelectedItemId(item.movement_id)}
                        className={getItemCardClassName(item.movement_id)}>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-mono text-slate-500">#{item.movement_id}</span>
                                </div>
                                <p className="font-medium text-slate-900 mb-1">
                                    {item.objective || 'Sin objetivo'}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-slate-600">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        {formatDate(item.start_date)}
                                    </span>
                                </div>
                            </div>
                            {renderCheckmark(item.movement_id)}
                        </div>
                    </div>
                );
            case 'workorder':
                return (
                    <div key={`${item.work_order_id}-${index}`} onClick={() => setSelectedItemId(item.work_order_id)}
                        className={getItemCardClassName(item.work_order_id)}>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-mono text-slate-500">{item.wo_code}</span>
                                </div>
                                <p className="font-medium text-slate-900 mb-1">
                                    {item.description || 'Sin descripción'}
                                </p>
                                <div className="text-xs text-slate-600">
                                    Molino: {item.mill_code || 'N/A'}
                                </div>
                            </div>
                            {renderCheckmark(item.work_order_id)}
                        </div>
                    </div>
                );
            case 'diagnosis':
                return (
                    <div key={`${item.diagnosis_id}-${index}`} onClick={() => setSelectedItemId(item.diagnosis_id)}
                        className={getItemCardClassName(item.diagnosis_id)}>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="font-medium text-slate-900 mb-1">
                                    Diagnóstico - {item.mill?.code || 'N/A'}
                                </p>
                                <div className="text-xs text-slate-600">
                                    Fecha: {formatDate(item.diagnosis_date)}
                                </div>
                            </div>
                            {renderCheckmark(item.diagnosis_id)}
                        </div>
                    </div>
                );
            case 'concertation':
                return (
                    <div key={`${item.concertation_id}-${index}`} onClick={() => setSelectedItemId(item.concertation_id)}
                        className={getItemCardClassName(item.concertation_id)}>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="font-medium text-slate-900 mb-1">
                                    {item.community?.name || 'Concertación sin comunidad'}
                                </p>
                                <div className="text-xs text-slate-600">
                                    Fecha: {formatDate(item.meeting_date)}
                                </div>
                            </div>
                            {renderCheckmark(item.concertation_id)}
                        </div>
                    </div>
                );
            case 'manufacturing':
                return (
                    <div key={`${item.id}-${index}`} onClick={() => setSelectedItemId(item.id)}
                        className={getItemCardClassName(item.id)}>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-mono text-slate-500">{item.pieceCode || 'MO-' + item.id}</span>
                                </div>
                                <p className="font-medium text-slate-900 mb-1">
                                    {item.pieceName || 'Pieza sin nombre'}
                                </p>
                                <div className="text-xs text-slate-600">
                                    Cantidad: {item.quantityPlanned || 0} unidades
                                </div>
                                {(item.notes || item.workOrderDescription) && (
                                    <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                                        {item.notes || item.workOrderDescription}
                                    </div>
                                )}
                            </div>
                            {renderCheckmark(item.id)}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const getItemCardClassName = (itemId) => {
        return `p-4 border rounded-lg cursor-pointer transition-all ${selectedItemId === itemId
            ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200'
            : 'border-gray-200 hover:border-brand-300 hover:bg-slate-50'
            }`;
    };

    const renderCheckmark = (itemId) => {
        if (selectedItemId !== itemId) return null;
        return (
            <div className="ml-2">
                <div className="w-5 h-5 bg-brand-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <LinkIcon size={24} className="text-brand-600" />
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    Vincular Actividad
                                </h2>
                                <p className="text-sm text-slate-600 mt-0.5">
                                    {activity?.title}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Link Type Selection */}
                    <div className="px-6 py-4 bg-slate-50 border-b border-gray-200">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Tipo de Vinculación</p>
                        <div className="grid grid-cols-5 gap-2">
                            {linkTypes.map((type) => {
                                const Icon = type.icon;
                                return (
                                    <button
                                        key={type.id}
                                        onClick={() => {
                                            setLinkType(type.id);
                                            setSelectedItemId(null);
                                        }}
                                        className={`p-3 rounded-lg font-medium text-sm transition-all ${linkType === type.id
                                            ? `bg-${type.color}-600 text-white shadow-md`
                                            : 'bg-white text-slate-700 border border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Icon size={16} className="mx-auto mb-1" />
                                        <div className="text-xs">{type.label}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Currently Linked Entities */}
                    {renderLinkedItems()}

                    {/* Mode Selection */}
                    <div className="px-6 py-4 bg-white border-b border-gray-200">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setMode('create')}
                                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${mode === 'create'
                                    ? 'bg-brand-600 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Plus size={18} />
                                    Crear y Vincular
                                </div>
                            </button>
                            <button
                                onClick={() => setMode('link')}
                                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${mode === 'link'
                                    ? 'bg-brand-600 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Search size={18} />
                                    Vincular Existente
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {mode === 'create' ? (
                            <div className="space-y-4">
                                <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
                                    <h3 className="font-semibold text-brand-900 mb-2 flex items-center gap-2">
                                        {getCurrentTypeIcon()}
                                        Se creará {getLinkTypeLabel()} con datos de la actividad
                                    </h3>
                                    <p className="text-sm text-brand-800">
                                        La actividad se vinculará automáticamente al nuevo registro.
                                        Podrás editar los detalles después.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Search */}
                                <div className="relative">
                                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder={`Buscar ${getLinkTypeLabel().toLowerCase()}...`}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    />
                                </div>

                                {/* Items List */}
                                {loading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                                    </div>
                                ) : filteredItems.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Search size={48} className="mx-auto text-slate-300 mb-4" />
                                        <p className="text-slate-600">
                                            No hay {getLinkTypeLabel().toLowerCase()}s disponibles
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {filteredItems.map((item, index) => renderItemCard(item, index))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-slate-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || (mode === 'link' && !selectedItemId)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <LinkIcon size={18} />
                            {loading
                                ? 'Procesando...'
                                : mode === 'create'
                                    ? `Crear y Vincular ${getLinkTypeLabel()}`
                                    : 'Vincular Seleccionado'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LinkActivityModal;
