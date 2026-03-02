import React, { useState, useEffect } from 'react';
import {
    X, CheckCircle, Play, CheckSquare, Users, ClipboardList, Link as LinkIcon,
    FileText, User, Save, Loader2, AlertCircle, Plus, Calendar, Trash2, MessageCircle
} from 'lucide-react';
import { ActivityExecutionService } from '../../services/activityExecution';
import { DeliveryService } from '../../services/deliveries';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import MaterialDeliveryModal from './MaterialDeliveryModal';

const TABS = [
    { id: 'summary', label: 'Resumen', icon: FileText },
    { id: 'entities', label: 'Entidades', icon: LinkIcon },
    { id: 'crew', label: 'Cuadrilla', icon: Users },
    { id: 'daily_execution', label: 'Ejecución Diaria', icon: Calendar }
];

export default function ActivityExecutionModal({ activityId, onClose }) {
    const [activeTab, setActiveTab] = useState('summary');
    const [loading, setLoading] = useState(true);
    const [activity, setActivity] = useState(null);
    const [error, setError] = useState(null);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);

    // Refresh trigger
    const [refreshTick, setRefreshTick] = useState(0);
    const refresh = () => setRefreshTick(t => t + 1);

    useEffect(() => {
        loadData();
    }, [activityId, refreshTick]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await ActivityExecutionService.getActivityFullDetails(activityId);
            setActivity(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !activity) {
        return (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 flex flex-col items-center">
                    <Loader2 className="animate-spin text-brand-500 mb-4" size={32} />
                    <p className="text-slate-500 font-medium">Cargando detalles de actividad...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
                    <AlertCircle className="text-red-500 mx-auto mb-4" size={32} />
                    <p className="text-slate-800 font-bold mb-2">Error</p>
                    <p className="text-slate-600 text-sm mb-6">{error}</p>
                    <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium w-full">Cerrar</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white w-full max-w-5xl rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl font-bold text-slate-800">{activity.title}</h2>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${activity.status === 'COMPLETADA' || activity.status === 'FINALIZADA' ? 'bg-emerald-100 text-emerald-700' :
                                activity.status === 'EN_EJECUCION' ? 'bg-brand-100 text-brand-700' :
                                    'bg-slate-200 text-slate-700'
                                }`}>
                                {activity.status}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 font-medium">
                            Cuadrilla Asignada: <span className="text-slate-700">{activity.crew?.name || 'Ninguna'}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center overflow-x-auto border-b border-slate-100 px-6 hide-scrollbar flex-shrink-0">
                    <div className="flex gap-6">
                        {TABS.map(t => (
                            <button key={t.id} onClick={() => setActiveTab(t.id)}
                                className={`flex items-center gap-2 py-4 border-b-2 text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === t.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 max-w-max'
                                    }`}>
                                <t.icon size={16} />
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {activeTab === 'summary' && <TabSummary activity={activity} onRefresh={refresh} onOpenDelivery={() => setShowDeliveryModal(true)} />}
                    {activeTab === 'entities' && <TabEntities activity={activity} onRefresh={refresh} />}
                    {activeTab === 'crew' && <TabCrew crew={activity.crew} onRefresh={refresh} />}
                    {activeTab === 'daily_execution' && <TabDailyExecution activity={activity} />}
                </div>
            </div>

            {showDeliveryModal && (activity.activityTypeName === 'Entrega de Materiales' || activity.activity_type_id == 10) && (
                <MaterialDeliveryModal
                    isOpen={true}
                    activity={activity}
                    onClose={() => {
                        setShowDeliveryModal(false);
                        refresh();
                    }}
                />
            )}
        </div>
    );
}

// -------------------------------------------------------------
// SUB-COMPONENTS FOR TABS
// -------------------------------------------------------------

function TabSummary({ activity, onRefresh, onOpenDelivery }) {
    const [updating, setUpdating] = useState(false);
    const [closingNote, setClosingNote] = useState('');
    const [showCloseModal, setShowCloseModal] = useState(false);

    const handleStatusChange = async (newStatus, note = null) => {
        setUpdating(true);
        try {
            await ActivityExecutionService.updateActivityStatus(activity.activity_id, newStatus, note);
            onRefresh();
            setShowCloseModal(false);
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <AlertCircle size={16} className="text-brand-500" /> Detalles de Planificación
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-slate-400 font-medium mb-1 line-clamp-1">Duración Estimada</p>
                        <p className="font-semibold text-slate-700">{activity.estimated_duration_days} días</p>
                    </div>
                    <div>
                        <p className="text-slate-400 font-medium mb-1">Semana Planificada</p>
                        <p className="font-semibold text-slate-700">{activity.planned_start_week} al {activity.planned_end_week}</p>
                    </div>
                    <div>
                        <p className="text-slate-400 font-medium mb-1">Prioridad</p>
                        <p className="font-semibold text-slate-700">{activity.priority}</p>
                    </div>
                    <div>
                        <p className="text-slate-400 font-medium mb-1">Responsable</p>
                        <p className="font-semibold text-slate-700">
                            {activity.responsible ? `${activity.responsible.first_name} ${activity.responsible.last_name}` : 'Sin asignar'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                    <Play size={16} className="text-emerald-500" /> Acciones de Ejecución
                </h3>

                <div className="flex flex-wrap gap-4">
                    {activity.status === 'PLANIFICADA' || activity.status === 'ASIGNADA' ? (
                        <button onClick={() => handleStatusChange('EN_EJECUCION')} disabled={updating}
                            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
                            {updating ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                            Iniciar Ejecución (En Progreso)
                        </button>
                    ) : null}

                    {activity.status === 'EN_EJECUCION' ? (
                        <button onClick={() => setShowCloseModal(true)} disabled={updating}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
                            <CheckCircle size={18} />
                            Finalizar Actividad
                        </button>
                    ) : null}

                    {activity.status === 'COMPLETADA' || activity.status === 'FINALIZADA' ? (
                        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 w-full flex items-start gap-3">
                            <CheckCircle size={20} className="mt-0.5" />
                            <div>
                                <h4 className="font-bold">Actividad Completada</h4>
                                {activity.completion_notes && (
                                    <p className="text-sm mt-1 text-emerald-700"><strong>Nota:</strong> {activity.completion_notes}</p>
                                )}
                            </div>
                        </div>
                    ) : null}

                    {activity.status !== 'COMPLETADA' && activity.status !== 'CANCELADA' && (activity.activityTypeName === 'Entrega de Materiales' || activity.activity_type_id == 10) ? (
                        <button onClick={onOpenDelivery}
                            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors">
                            <ClipboardList size={18} />
                            Ruta de Entrega
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Modal para nota de cierre */}
            {showCloseModal && (
                <div className="fixed inset-0 z-[60] bg-slate-900/60 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <CheckCircle className="text-emerald-500" />
                            Finalizar Actividad
                        </h3>
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-slate-700 mb-1">Nota de Cierre (Opcional)</label>
                            <textarea
                                value={closingNote} onChange={e => setClosingNote(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl p-3 text-sm min-h-[100px] focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                placeholder="..."
                            />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowCloseModal(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-xl">Cancelar</button>
                            <button onClick={() => handleStatusChange('COMPLETADA', closingNote)} disabled={updating}
                                className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-2">
                                {updating ? <Loader2 size={16} className="animate-spin" /> : null}
                                Confirmar Cierre
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function TabEntities({ activity, onRefresh }) {
    const { user } = useAuth();
    const [linkingType, setLinkingType] = useState(null); // 'work_order', 'diagnosis', 'concertation'
    const [linking, setLinking] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // Filters State
    const [loadingEntities, setLoadingEntities] = useState(false);
    const [filters, setFilters] = useState({ status: '', severity: '', mill_id: '', category: '' });

    // Mill list for filtering
    const [mills, setMills] = useState([]);
    useEffect(() => {
        const fetchMills = async () => {
            const { data } = await supabase.from('mill').select('mill_id, name');
            if (data) setMills(data);
        };
        fetchMills();
    }, []);

    // Load available entities on modal open or filter change
    useEffect(() => {
        if (!linkingType) return;

        const loadEntities = async () => {
            setLoadingEntities(true);
            try {
                const combinedFilters = { ...filters, search: searchQuery };
                let data = [];
                const personId = user?.id; // Or user payload ID based on structure. Assuming user.id

                if (linkingType === 'related_work_order_id') {
                    const woData = await ActivityExecutionService.getAvailableWorkOrders(personId, combinedFilters);
                    data = woData.map(d => ({
                        id: d.work_order_id, title: d.code || `OT-${d.work_order_id}`, subtitle: d.description,
                        status: d.status, isMine: d.assigned_to === personId
                    }));
                } else if (linkingType === 'related_diagnosis_id') {
                    const diagData = await ActivityExecutionService.getAvailableDiagnoses(personId, combinedFilters);
                    data = diagData.map(d => ({
                        id: d.diagnosis_id, title: d.code, subtitle: d.description,
                        status: d.mill?.name || '---', isMine: d.reported_by === personId
                    }));
                } else if (linkingType === 'related_concertation_id') {
                    const concData = await ActivityExecutionService.getAvailableConcertations(personId, combinedFilters);
                    data = concData.map(d => ({
                        id: d.concertation_id, title: d.community?.name || '---', subtitle: d.topic,
                        status: d.status, isMine: d.responsible_id === personId
                    }));
                } else if (linkingType === 'related_manufacturing_order_id') {
                    const moData = await ActivityExecutionService.getAvailableFabricationOrders(personId, combinedFilters);
                    data = moData.map(d => ({
                        id: d.mo_id, title: d.code || `OF-${d.mo_id}`, subtitle: d.name || 'Orden de Fabricación',
                        status: d.status, isMine: false
                    }));
                }
                setSearchResults(data);
            } catch (err) {
                console.error("Error loading entities", err);
            } finally {
                setLoadingEntities(false);
            }
        };

        // Debounce search query
        const timeoutId = setTimeout(() => {
            loadEntities();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [linkingType, searchQuery, filters, user]);

    const handleOpenLinker = (type) => {
        setLinkingType(type);
        setSearchQuery('');
        setFilters({ status: '', severity: '', mill_id: '', category: '' });
        setSearchResults([]);
    };

    const handleLink = async (entityId) => {
        setLinking(true);
        try {
            await ActivityExecutionService.linkEntity(activity.activity_id, linkingType, entityId);
            onRefresh();
            setLinkingType(null);
            setSearchQuery('');
            setSearchResults([]);
        } catch (err) {
            alert(err.message);
        } finally {
            setLinking(false);
        }
    };

    const handleUnlink = async (fieldName, entityId = null) => {
        if (!confirm('¿Estás seguro de que quieres desvincular esta entidad?')) return;
        try {
            await ActivityExecutionService.unlinkEntity(activity.activity_id, fieldName, entityId);
            onRefresh();
        } catch (err) {
            alert(err.message);
        }
    };

    const EntityCard = ({ title, data, icon: Icon, badgeColor, fieldName }) => (
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow relative">
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${badgeColor}`}>
                    <Icon size={16} />
                </div>
                <h4 className="font-bold text-slate-800">{title}</h4>
            </div>
            {data ? (
                <div>
                    <div className="text-sm font-medium text-slate-700 space-y-1 mb-3">
                        {data.content}
                    </div>
                    <button onClick={() => handleUnlink(fieldName, data.id)}
                        className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 border border-red-100 rounded-lg px-2 py-1 bg-red-50 w-full justify-center">
                        <Trash2 size={12} /> Desvincular
                    </button>
                </div>
            ) : null}
        </div>
    );

    // Dynamic header for the modal based on type
    const getLinkerConfig = () => {
        if (linkingType === 'related_work_order_id') return { title: 'Vincular Orden de Trabajo' };
        if (linkingType === 'related_diagnosis_id') return { title: 'Vincular Diagnóstico' };
        if (linkingType === 'related_concertation_id') return { title: 'Vincular Concertación' };
        if (linkingType === 'related_manufacturing_order_id') return { title: 'Vincular Orden de Fabricación' };
        return { title: 'Vincular Entidad' };
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Work Orders Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <ClipboardList size={18} className="text-brand-600" />
                            Órdenes de Trabajo
                        </h3>
                        <button onClick={() => handleOpenLinker('related_work_order_id')} className="p-1 hover:bg-slate-100 rounded-lg text-brand-600 transition-colors" title="Vincular Orden">
                            <Plus size={18} />
                        </button>
                    </div>
                    {activity.work_order && activity.work_order.length > 0 ? (
                        activity.work_order.map(wo => (
                            <EntityCard
                                key={wo.work_order_id}
                                title="OT" icon={ClipboardList} badgeColor="bg-brand-100 text-brand-600" fieldName="related_work_order_id"
                                data={{ id: wo.work_order_id, content: <><p>Código: <span className="font-bold">{wo.code || `OT-${wo.work_order_id}`}</span></p><p>Estado: {wo.status}</p></> }}
                            />
                        ))
                    ) : (
                        <p className="text-sm text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 text-center">No hay órdenes vinculadas</p>
                    )}
                </div>

                {/* Diagnoses Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <AlertCircle size={18} className="text-amber-600" />
                            Diagnósticos
                        </h3>
                        <button onClick={() => handleOpenLinker('related_diagnosis_id')} className="p-1 hover:bg-slate-100 rounded-lg text-amber-600 transition-colors" title="Vincular Diagnóstico">
                            <Plus size={18} />
                        </button>
                    </div>
                    {activity.diagnosis && activity.diagnosis.length > 0 ? (
                        activity.diagnosis.map(diag => (
                            <EntityCard
                                key={diag.diagnosis_id}
                                title="Diagnóstico" icon={AlertCircle} badgeColor="bg-amber-100 text-amber-600" fieldName="related_diagnosis_id"
                                data={{ id: diag.diagnosis_id, content: <><p>Código: <span className="font-bold">{diag.code}</span></p><p>Molino: {diag.mill?.name}</p></> }}
                            />
                        ))
                    ) : (
                        <p className="text-sm text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 text-center">No hay diagnósticos vinculados</p>
                    )}
                </div>

                {/* Concertations Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Users size={18} className="text-social-600" />
                            Concertaciones
                        </h3>
                        <button onClick={() => handleOpenLinker('related_concertation_id')} className="p-1 hover:bg-slate-100 rounded-lg text-social-600 transition-colors" title="Vincular Concertación">
                            <Plus size={18} />
                        </button>
                    </div>
                    {activity.concertation && activity.concertation.length > 0 ? (
                        activity.concertation.map(conc => (
                            <EntityCard
                                key={conc.concertation_id}
                                title="Concertación" icon={Users} badgeColor="bg-social-100 text-social-600" fieldName="related_concertation_id"
                                data={{ id: conc.concertation_id, content: <><p>Comunidad: <span className="font-bold">{conc.community?.name}</span></p></> }}
                            />
                        ))
                    ) : (
                        <p className="text-sm text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 text-center">No hay concertaciones vinculadas</p>
                    )}
                </div>

                {/* Manufacturing Orders Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <ClipboardList size={18} className="text-purple-600" />
                            Órdenes de Fab.
                        </h3>
                        <button onClick={() => handleOpenLinker('related_manufacturing_order_id')} className="p-1 hover:bg-slate-100 rounded-lg text-purple-600 transition-colors" title="Vincular OF">
                            <Plus size={18} />
                        </button>
                    </div>
                    {activity.manufacturing_order && activity.manufacturing_order.length > 0 ? (
                        activity.manufacturing_order.map(mo => (
                            <EntityCard
                                key={mo.mo_id}
                                title="OF" icon={ClipboardList} badgeColor="bg-purple-100 text-purple-600" fieldName="related_manufacturing_order_id"
                                data={{ id: mo.mo_id, content: <><p>Código: <span className="font-bold">{mo.code || `OF-${mo.mo_id}`}</span></p><p>Estado: {mo.status}</p></> }}
                            />
                        ))
                    ) : (
                        <p className="text-sm text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 text-center">No hay OFs vinculadas</p>
                    )}
                </div>

            </div>

            {/* Link Modal */}
            {linkingType && (
                <div className="fixed inset-0 z-[70] bg-slate-900/60 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl flex flex-col max-h-[90vh]">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center justify-between shrink-0">
                            {getLinkerConfig().title}
                            <button onClick={() => setLinkingType(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </h3>

                        {/* Filters Area */}
                        <div className="space-y-3 mb-4 shrink-0">
                            <input type="text" placeholder="Buscar por código, descripción, comunidad..."
                                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus
                                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent" />

                            <div className="flex flex-wrap gap-2">
                                {/* OT Filters */}
                                {linkingType === 'related_work_order_id' && (
                                    <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-500">
                                        <option value="">Cualquier estado</option>
                                        <option value="PENDING">Pendiente</option>
                                        <option value="IN_PROGRESS">En Progreso</option>
                                        <option value="ON_HOLD">Suspendida</option>
                                        <option value="COMPLETED">Completada (Histórico)</option>
                                    </select>
                                )}

                                {/* Diagnosis Filters */}
                                {linkingType === 'related_diagnosis_id' && (
                                    <>
                                        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-500">
                                            <option value="">Cualquier estado</option>
                                            <option value="PENDING">Pendiente</option>
                                            <option value="IN_PROGRESS">En Progreso / Planificado</option>
                                            <option value="COMPLETED">Completado</option>
                                        </select>
                                        <select value={filters.mill_id} onChange={(e) => setFilters({ ...filters, mill_id: e.target.value })}
                                            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-500 max-w-[150px]">
                                            <option value="">Todos los molinos</option>
                                            {mills.map(m => <option key={m.mill_id} value={m.mill_id}>{m.name}</option>)}
                                        </select>
                                    </>
                                )}

                                {/* Concertation Filters */}
                                {linkingType === 'related_concertation_id' && (
                                    <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-500">
                                        <option value="">Cualquier estado</option>
                                        <option value="pendiente">Pendiente</option>
                                        <option value="en_proceso">En Proceso</option>
                                        <option value="finalizada">Finalizada (Histórico)</option>
                                    </select>
                                )}

                                {/* Fabrication Order Filters */}
                                {linkingType === 'related_manufacturing_order_id' && (
                                    <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-500">
                                        <option value="">Cualquier estado</option>
                                        <option value="pendiente">Pendiente</option>
                                        <option value="en_proceso">En Proceso</option>
                                        <option value="terminada">Terminada (Histórico)</option>
                                    </select>
                                )}
                            </div>
                        </div>

                        {/* Results Area */}
                        <div className="flex-1 overflow-y-auto space-y-2 min-h-[300px] border-t border-slate-100 pt-4 relative">
                            {loadingEntities ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                                </div>
                            ) : searchResults.length === 0 ? (
                                <div className="text-center py-10">
                                    <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium">No se encontraron entidades disponibles.</p>
                                    <p className="text-slate-400 text-sm mt-1">Intenta con otros filtros o asegúrate de que existan entidades abiertas.</p>
                                </div>
                            ) : searchResults.map(res => (
                                <div key={res.id} onClick={() => handleLink(res.id)}
                                    className={`p-3 border rounded-xl cursor-pointer transition-colors flex items-center gap-3
                                        ${linking ? 'opacity-50 pointer-events-none' : 'hover:border-brand-500'}
                                        ${res.isMine ? 'bg-brand-50 border-brand-200' : 'border-slate-100 bg-white hover:bg-slate-50'}`}>

                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-slate-800 text-sm">{res.title}</p>
                                                {res.isMine && (
                                                    <span className="bg-brand-600 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm">Tuyo</span>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full whitespace-nowrap">{res.status}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 line-clamp-2">{res.subtitle}</p>
                                    </div>
                                    <button className="p-2 text-brand-600 bg-white rounded-lg opacity-0 group-hover:opacity-100 border border-brand-200 hover:bg-brand-50">
                                        <LinkIcon size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function TabCrew({ crew, onRefresh }) {
    const [updating, setUpdating] = useState(false);

    if (!crew || !crew.crew_member || crew.crew_member.length === 0) {
        return <p className="text-slate-500 text-sm">No hay cuadrilla asignada o la cuadrilla no tiene miembros.</p>;
    }

    const handleRoleChange = async (memberId, newRole) => {
        setUpdating(true);
        try {
            await ActivityExecutionService.updateCrewMemberRole(memberId, newRole);
            onRefresh();
        } catch (err) {
            alert(err.message);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="bg-white border text-center text-sm border-slate-200 rounded-xl overflow-hidden max-w-4xl">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-4 py-3 font-bold text-slate-600">Nombre</th>
                        <th className="px-4 py-3 font-bold text-slate-600">Cédula</th>
                        <th className="px-4 py-3 font-bold text-slate-600 w-48">Rol en Cuadrilla</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 relative">
                    {updating && (
                        <tr className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                            <td><Loader2 className="animate-spin text-brand-500" size={24} /></td>
                        </tr>
                    )}
                    {crew.crew_member.map(m => (
                        <tr key={m.crew_member_id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-medium text-slate-800 flex items-center gap-2">
                                <User size={16} className="text-slate-400" />
                                {m.person?.first_name} {m.person?.last_name}
                            </td>
                            <td className="px-4 py-3 text-slate-500">{m.person?.document_id}</td>
                            <td className="px-4 py-3">
                                <select
                                    className="w-full border-slate-200 rounded-lg text-sm bg-slate-50 py-1.5 focus:ring-brand-500"
                                    value={m.role_in_crew || ''}
                                    onChange={e => handleRoleChange(m.crew_member_id, e.target.value)}
                                >
                                    <option value="">(Sin asignar)</option>
                                    <option value="Ingeniero Lider">Ingeniero Líder</option>
                                    <option value="Soldador">Soldador</option>
                                    <option value="Mecanico">Mecánico</option>
                                    <option value="Ayudante">Ayudante</option>
                                    <option value="Chofer">Chofer</option>
                                    <option value="Trabajador Social">Trabajador Social</option>
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function TabDailyExecution({ activity }) {
    // Generate dates between planned_start_week and planned_end_week
    const getDatesInRange = (start, end) => {
        if (!start || !end) return [];
        // Parse date parts manually to avoid UTC/local timezone shift.
        // new Date('2026-02-23') parses as UTC midnight, which becomes
        // the previous local day for UTC-5 users.
        const parseLocalDate = (dateStr) => {
            const [year, month, day] = dateStr.substring(0, 10).split('-').map(Number);
            return new Date(year, month - 1, day, 12, 0, 0); // noon local time
        };

        let dates = [];
        let curr = parseLocalDate(start);
        const last = parseLocalDate(end);

        while (curr <= last) {
            // Format as YYYY-MM-DD in local time
            const y = curr.getFullYear();
            const m = String(curr.getMonth() + 1).padStart(2, '0');
            const d = String(curr.getDate()).padStart(2, '0');
            dates.push(`${y}-${m}-${d}`);
            curr.setDate(curr.getDate() + 1);
        }
        return dates;
    };

    const dates = getDatesInRange(activity.planned_start_week, activity.planned_end_week);
    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(dates.includes(today) ? today : (dates[0] || today));

    const [sharing, setSharing] = useState(false);

    // Formatear la fecha para que sea legible
    const formatDate = (dateStr) => {
        const d = new Date(dateStr + "T12:00:00Z");
        return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
    };

    const handleShareDay = async () => {
        setSharing(true);
        try {
            // 1. Fetch data for the specific day
            const history = await ActivityExecutionService.getAttendance(activity.activity_id, selectedDate);
            const reports = await ActivityExecutionService.getDailyReports(activity.activity_id);
            const dayReports = reports.filter(r => r.report_date === selectedDate);

            // 2. Build header
            const respName = activity.responsible ? `${activity.responsible.first_name} ${activity.responsible.last_name}` : 'Sin Asignar';
            const crewName = activity.crew ? activity.crew.name : 'Sin Cuadrilla';
            let msg = `👷‍♂️ *REPORTE DIARIO DE EJECUCIÓN* 👷‍♂️\n`;
            msg += `*Fecha*: ${selectedDate}\n`;
            msg += `*Actividad*: ${activity.title}\n`;
            msg += `*Responsable*: ${respName}\n`;
            msg += `*Cuadrilla*: ${crewName}\n\n`;

            // 3. Build Attendance
            msg += `*-- LISTA DE ASISTENCIA --*\n`;
            if (!activity.crew || !activity.crew.crew_member || activity.crew.crew_member.length === 0) {
                msg += `_Sin personal asignado_\n`;
            } else {
                activity.crew.crew_member.forEach(m => {
                    if (!m.person) return;
                    const past = history.find(h => h.person_id === m.person_id);
                    const isPresent = past ? past.present : false;
                    const notes = past ? past.notes : '';
                    msg += `${isPresent ? '✅' : '❌'} ${m.person.first_name} ${m.person.last_name}`;
                    if (notes) msg += ` - _${notes}_`;
                    msg += `\n`;
                });
            }
            msg += `\n`;

            // 4. Build Reports
            msg += `*-- REPORTES TÉCNICOS --*\n`;
            if (dayReports.length === 0) {
                msg += `_No se registraron reportes técnicos en este día._\n`;
            } else {
                dayReports.forEach((r, idx) => {
                    msg += `\n*🔹 Reporte #${r.report_id} (${r.report_type === 'FABRICATION' ? 'FABRICACIÓN' : r.report_type === 'MAINTENANCE' ? 'MANTENIMIENTO' : r.report_type === 'CONCERTATION' ? 'CONCERTACIÓN' : r.report_type === 'DELIVERY' ? 'ENTREGA DE MATERIALES' : 'AVANCE'})*\n`;

                    if (r.report_type === 'FABRICATION' && r.fabrication_items) {
                        r.fabrication_items.forEach(fi => {
                            msg += `➜ *${fi.piece_name}*: Meta ${fi.target_quantity} | Prod: ${fi.produced_quantity} | Def: ${fi.defective_quantity}\n`;
                        });
                    }
                    if (r.report_type === 'MAINTENANCE' && r.maintenance_items) {
                        r.maintenance_items.forEach(mi => {
                            msg += `➜ *Intervención en ${mi.community_name || 'Terreno'}* ${mi.is_reintervention ? '(Reint.)' : ''}\n`;
                            if (mi.technical_report) msg += `   📝 ${mi.technical_report}\n`;
                        });
                    }
                    if (r.report_type === 'CONCERTATION' && r.concertation_items) {
                        r.concertation_items.forEach(ci => {
                            msg += `➜ *Comunidad: ${ci.community_name}*\n`;
                            msg += `   📝 ${ci.concertation_summary}\n`;
                        });
                    }
                    if (r.report_type === 'DELIVERY' && r.delivery_items) {
                        r.delivery_items.forEach(di => {
                            msg += `➜ *${di.community_name}*: ${di.is_successful ? '✅ Entregado' : '❌ Fallido/Pendiente'}\n`;
                            if (di.notes) msg += `   📝 ${di.notes}\n`;
                        });
                    }
                    if (r.general_notes) {
                        msg += `_Obs: ${r.general_notes}_\n`;
                    }
                });
            }

            const encodedMsg = encodeURIComponent(msg);
            window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
        } catch (err) {
            alert('Error al generar reporte: ' + err.message);
        } finally {
            setSharing(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header Dates Selector */}
            {dates.length > 0 ? (
                <div className="flex flex-col gap-4 bg-white border border-slate-200 p-4 rounded-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h3 className="font-bold text-slate-800">Días de Ejecución</h3>
                        <button onClick={handleShareDay} disabled={sharing}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors shadow-sm text-sm disabled:opacity-50">
                            {sharing ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
                            Compartir Día
                        </button>
                    </div>

                    <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
                        {dates.map(d => {
                            const [year, month, day] = d.split('-');
                            // Create a proper local Date object to get the real weekday name
                            const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                            const weekdayName = localDate.toLocaleDateString('es-ES', { weekday: 'long' });

                            return (
                                <button key={d} onClick={() => setSelectedDate(d)}
                                    className={`px-4 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex flex-col items-center min-w-[80px] border ${selectedDate === d
                                        ? 'bg-brand-600 text-white shadow-md border-brand-600'
                                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-200 hover:border-brand-300 hover:text-brand-700'
                                        }`}>
                                    <span className="capitalize text-xs font-semibold tracking-wide opacity-90 mb-1">{weekdayName}</span>
                                    <span className="text-lg">{day}/{month}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="bg-amber-50 text-amber-700 p-4 rounded-xl text-sm font-bold border border-amber-200 flex items-center gap-2">
                    <AlertCircle size={16} /> Asegúrese de que la actividad tenga fechas planificadas.
                </div>
            )}

            <div className="space-y-6">
                <TabAttendance activity={activity} selectedDate={selectedDate} />
                <TabReports activity={activity} selectedDate={selectedDate} />
            </div>
        </div>
    );
}

function TabAttendance({ activity, selectedDate }) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // State to hold attendance records before saving
    // Map person_id -> { person_id, present, notes, personName }
    const [records, setRecords] = useState({});

    useEffect(() => {
        loadAttendance();
    }, [selectedDate]);

    const loadAttendance = async () => {
        if (!activity.crew || !activity.crew.crew_member) return;
        setLoading(true);
        try {
            const history = await ActivityExecutionService.getAttendance(activity.activity_id, selectedDate);

            // Build initial state combining crew members and existing history
            const newRecs = {};
            activity.crew.crew_member.forEach(m => {
                if (!m.person) return;
                const past = history.find(h => h.person_id === m.person_id);
                newRecs[m.person_id] = {
                    person_id: m.person_id,
                    personName: `${m.person.first_name} ${m.person.last_name}`,
                    present: past ? past.present : false,
                    notes: past ? past.notes || '' : ''
                };
            });
            setRecords(newRecs);
        } catch (e) { alert(e.message); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await ActivityExecutionService.saveAttendance(activity.activity_id, selectedDate, Object.values(records));
            alert("Asistencia guardada con éxito.");
        } catch (e) { alert("Error al guardar: " + e.message); }
        finally { setSaving(false); }
    };

    if (!activity.crew) return <p className="text-slate-500 text-sm">No hay cuadrilla asignada para tomar asistencia.</p>;

    return (
        <div className="w-full bg-white border border-slate-200 rounded-xl p-5 space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                    <CheckSquare className="text-emerald-500" size={20} />
                    <h3 className="font-bold text-slate-800">Toma de Asistencia</h3>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-brand-500" /></div>
            ) : Object.keys(records).length === 0 ? (
                <p className="text-slate-400 text-sm text-center">No hay miembros para evaluar.</p>
            ) : (
                <div className="space-y-3">
                    {Object.values(records).map(rec => (
                        <div key={rec.person_id} className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-slate-50 gap-4 hover:bg-slate-50 transition-colors p-2 rounded-lg">
                            <div className="w-1/3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold shrink-0">
                                    {rec.personName.charAt(0)}
                                </div>
                                <span className="font-medium text-slate-800 text-sm">{rec.personName}</span>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${rec.present ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                        onClick={() => setRecords({ ...records, [rec.person_id]: { ...rec, present: !rec.present } })}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${rec.present ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </div>
                                    <span className={`text-sm font-bold ${rec.present ? 'text-emerald-700' : 'text-slate-500'}`}>
                                        {rec.present ? 'Presente' : 'Ausente'}
                                    </span>
                                </label>
                            </div>

                            <div className="flex-1 flex justify-end">
                                <input type="text" placeholder="Nota u observación..." value={rec.notes}
                                    onChange={e => setRecords({ ...records, [rec.person_id]: { ...rec, notes: e.target.value } })}
                                    className="w-full max-w-sm border border-slate-200 rounded-lg py-1.5 px-3 text-sm focus:ring-brand-500 bg-transparent" />
                            </div>
                        </div>
                    ))}

                    <div className="flex justify-end pt-4">
                        <button onClick={handleSave} disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Guardar Asistencia
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function TabReports({ activity, selectedDate }) {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        report_date: selectedDate,
        general_notes: '',
        fabItems: [],
        maintItems: [],
        concertationItems: [],
        deliveryItems: []
    });

    useEffect(() => { loadReports(); }, []);

    // Determine report form type based on activity formatting rules or type.
    const getReportType = () => {
        const title = (activity.title || '').toLowerCase();
        if (title.includes('fabricación') || title.includes('mecanizado') || title.includes('taller') || activity.activity_type_id === 5 || activity.activity_type_id === 6) return 'FABRICATION';
        if (title.includes('mantenimiento') || activity.activity_type_id === 3 || title.includes('reparación')) return 'MAINTENANCE';
        if (title.includes('concertación') || title.includes('búsqueda') || activity.activity_type_id === 2 || activity.activity_type_id === 4) return 'CONCERTATION';
        if (title.includes('entrega') || activity.activity_type_id === 10) return 'DELIVERY';
        return 'GENERAL';
    };

    const rType = getReportType();

    useEffect(() => {
        setFormData(prev => ({ ...prev, report_date: selectedDate }));
    }, [selectedDate]);

    // Load delivery plan for delivery reports
    useEffect(() => {
        if (rType === 'DELIVERY') {
            DeliveryService.getDeliveryPlan(activity.activity_id).then(plan => {
                const pendingItems = plan.filter(p => p.delivery_status !== 'COMPLETED').map(p => ({
                    community_id: p.community_id,
                    community_name: p.community?.name || `Comunidad #${p.community_id}`,
                    is_successful: true,
                    notes: ''
                }));
                setFormData(prev => ({
                    ...prev,
                    deliveryItems: pendingItems
                }));
            }).catch(console.error);
        }
    }, [activity.activity_id, rType]);

    const loadReports = async () => {
        try {
            const data = await ActivityExecutionService.getDailyReports(activity.activity_id);
            setReports(data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const items = rType === 'FABRICATION' ? formData.fabItems :
                rType === 'MAINTENANCE' ? formData.maintItems :
                    rType === 'CONCERTATION' ? formData.concertationItems :
                        rType === 'DELIVERY' ? formData.deliveryItems.filter(i => i.is_successful || !!i.notes) : [];

            const payload = {
                activity_id: activity.activity_id,
                report_date: formData.report_date,
                report_type: rType,
                general_notes: formData.general_notes,
                items
            };

            await ActivityExecutionService.saveDailyReport(payload);
            setShowForm(false);
            loadReports();
            setFormData({ ...formData, general_notes: '', fabItems: [], maintItems: [], concertationItems: [], deliveryItems: formData.deliveryItems }); // reset items except base delivery plan structure
        } catch (err) { alert(err.message); }
        finally { setSaving(false); }
    };

    const updateDeliveryItem = (index, field, value) => {
        const newItems = [...formData.deliveryItems];
        newItems[index][field] = value;
        setFormData(prev => ({ ...prev, deliveryItems: newItems }));
    };

    const addFabItem = () => {
        setFormData(prev => ({
            ...prev,
            fabItems: [...prev.fabItems, { piece_name: '', target_quantity: 0, produced_quantity: 0, defective_quantity: 0 }]
        }));
    };

    const updateFabItem = (index, field, value) => {
        const newItems = [...formData.fabItems];
        newItems[index][field] = value;
        setFormData(prev => ({ ...prev, fabItems: newItems }));
    };

    const removeFabItem = (index) => {
        setFormData(prev => ({ ...prev, fabItems: prev.fabItems.filter((_, i) => i !== index) }));
    };

    const addMaintItem = () => {
        setFormData(prev => ({
            ...prev,
            maintItems: [...prev.maintItems, { community_name: '', is_reintervention: false, technical_report: '' }]
        }));
    };

    const updateMaintItem = (index, field, value) => {
        const newItems = [...formData.maintItems];
        newItems[index][field] = value;
        setFormData(prev => ({ ...prev, maintItems: newItems }));
    };

    const removeMaintItem = (index) => {
        setFormData(prev => ({ ...prev, maintItems: prev.maintItems.filter((_, i) => i !== index) }));
    };

    const addConcertationItem = () => {
        setFormData(prev => ({
            ...prev,
            concertationItems: [...prev.concertationItems, { community_name: '', concertation_summary: '' }]
        }));
    };

    const updateConcertationItem = (index, field, value) => {
        const newItems = [...formData.concertationItems];
        newItems[index][field] = value;
        setFormData(prev => ({ ...prev, concertationItems: newItems }));
    };

    const removeConcertationItem = (index) => {
        setFormData(prev => ({ ...prev, concertationItems: prev.concertationItems.filter((_, i) => i !== index) }));
    };

    const filteredReports = reports.filter(r => r.report_date === selectedDate);

    return (
        <div className="w-full bg-white border border-slate-200 rounded-xl p-5 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                    <ClipboardList className="text-brand-500" size={20} />
                    <h3 className="font-bold text-slate-800">Reportes Diarios</h3>
                </div>
                <button onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-700 hover:bg-brand-100 font-semibold text-sm rounded-lg transition-colors">
                    {showForm ? <X size={16} /> : <Plus size={16} />}
                    {showForm ? 'Cancelar' : 'Nuevo Reporte'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white border text-sm border-brand-200 rounded-xl p-6 shadow-sm mb-6 animate-fade-in space-y-4">
                    <h4 className="font-bold text-brand-800 border-b border-brand-100 pb-2 mb-4">
                        Crear Reporte - {rType === 'FABRICATION' ? 'Taller / Producción' : rType === 'MAINTENANCE' ? 'Mantenimiento en Terreno' : rType === 'CONCERTATION' ? 'Concertación / Social' : rType === 'DELIVERY' ? 'Entrega de Materiales' : 'Avance General'}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha del Reporte</label>
                            <input type="date" required value={formData.report_date} disabled
                                className="w-full bg-slate-100 text-slate-500 border border-slate-200 rounded-lg p-2.5 outline-none cursor-not-allowed" />
                        </div>
                    </div>

                    {/* FABRICATION FIELDS */}
                    {rType === 'FABRICATION' && (
                        <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Ítems Producidos</h5>
                                <button type="button" onClick={addFabItem}
                                    className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1">
                                    <Plus size={14} /> Añadir Pieza
                                </button>
                            </div>

                            {formData.fabItems.length === 0 && <p className="text-xs text-slate-400 italic">No hay ítems agregados.</p>}

                            {formData.fabItems.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-3 items-end bg-white p-3 rounded-lg border border-slate-200 relative group">
                                    <div className="col-span-12 md:col-span-4">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pieza / Item</label>
                                        <input type="text" required value={item.piece_name} onChange={e => updateFabItem(idx, 'piece_name', e.target.value)}
                                            className="w-full border border-slate-200 rounded-lg py-1.5 px-2 outline-none focus:ring-2 focus:ring-brand-500" />
                                    </div>
                                    <div className="col-span-4 md:col-span-2">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Meta</label>
                                        <input type="number" min="0" required value={item.target_quantity} onChange={e => updateFabItem(idx, 'target_quantity', parseInt(e.target.value))}
                                            className="w-full border border-slate-200 rounded-lg py-1.5 px-2 outline-none focus:ring-2 focus:ring-brand-500" />
                                    </div>
                                    <div className="col-span-4 md:col-span-2">
                                        <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">Producidas</label>
                                        <input type="number" min="0" required value={item.produced_quantity} onChange={e => updateFabItem(idx, 'produced_quantity', parseInt(e.target.value))}
                                            className="w-full border border-emerald-200 bg-emerald-50 rounded-lg py-1.5 px-2 outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                    <div className="col-span-4 md:col-span-3">
                                        <label className="block text-[10px] font-bold text-red-600 uppercase mb-1">Defectos</label>
                                        <input type="number" min="0" required value={item.defective_quantity} onChange={e => updateFabItem(idx, 'defective_quantity', parseInt(e.target.value))}
                                            className="w-full border border-red-200 bg-red-50 rounded-lg py-1.5 px-2 outline-none focus:ring-2 focus:ring-red-500" />
                                    </div>
                                    <div className="col-span-12 md:col-span-1 text-center md:text-right pb-1">
                                        <button type="button" onClick={() => removeFabItem(idx)} className="text-red-400 hover:text-red-600 p-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* MAINTENANCE FIELDS */}
                    {rType === 'MAINTENANCE' && (
                        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Intervenciones Diarias</h5>
                                <button type="button" onClick={addMaintItem}
                                    className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1">
                                    <Plus size={14} /> Añadir Comunidad/Reparación
                                </button>
                            </div>

                            {formData.maintItems.length === 0 && <p className="text-xs text-slate-400 italic">No hay intervenciones agregadas.</p>}

                            {formData.maintItems.map((item, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200 relative group space-y-3">
                                    <button type="button" onClick={() => removeMaintItem(idx)} className="absolute top-3 right-3 text-red-400 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={16} />
                                    </button>

                                    <div className="flex flex-col md:flex-row gap-4 pr-6">
                                        <div className="flex-1">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Comunidad / Lugar</label>
                                            <input type="text" value={item.community_name} onChange={e => updateMaintItem(idx, 'community_name', e.target.value)}
                                                className="w-full border border-slate-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
                                        </div>
                                        <div className="flex items-center md:pt-6">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <div className={`w-10 h-5 rounded-full p-1 transition-colors ${item.is_reintervention ? 'bg-amber-500' : 'bg-slate-300'}`}
                                                    onClick={() => updateMaintItem(idx, 'is_reintervention', !item.is_reintervention)}>
                                                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${item.is_reintervention ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </div>
                                                <span className={`text-xs font-bold ${item.is_reintervention ? 'text-amber-600' : 'text-slate-500'}`}>Reintervención</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Informe Técnico</label>
                                        <textarea value={item.technical_report} onChange={e => updateMaintItem(idx, 'technical_report', e.target.value)}
                                            className="w-full border border-slate-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-brand-500 min-h-[60px] text-sm" placeholder="Detalles de reparaciones, fallas..." />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* CONCERTATION FIELDS */}
                    {rType === 'CONCERTATION' && (
                        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Comunidades Visitadas</h5>
                                <button type="button" onClick={addConcertationItem}
                                    className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1">
                                    <Plus size={14} /> Añadir Comunidad
                                </button>
                            </div>

                            {formData.concertationItems.length === 0 && <p className="text-xs text-slate-400 italic">No hay comunidades agregadas.</p>}

                            {formData.concertationItems.map((item, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200 relative group space-y-3">
                                    <button type="button" onClick={() => removeConcertationItem(idx)} className="absolute top-3 right-3 text-red-400 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={16} />
                                    </button>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre de la Comunidad</label>
                                        <input type="text" required value={item.community_name} onChange={e => updateConcertationItem(idx, 'community_name', e.target.value)}
                                            className="w-full border border-slate-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Resumen de Concertación / Resultado</label>
                                        <textarea required value={item.concertation_summary} onChange={e => updateConcertationItem(idx, 'concertation_summary', e.target.value)}
                                            className="w-full border border-slate-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-brand-500 min-h-[60px] text-sm" placeholder="Detalles de la reunión, acuerdos, hallazgos..." />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* DELIVERY FIELDS */}
                    {rType === 'DELIVERY' && (
                        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Comunidades Programadas (Ruta)</h5>
                            </div>

                            {formData.deliveryItems.length === 0 && <p className="text-xs text-slate-400 italic">No hay comunidades pendientes en la ruta de entrega.</p>}

                            {formData.deliveryItems.map((item, idx) => (
                                <div key={idx} className={`bg-white p-4 rounded-lg border relative group space-y-3 transition-colors ${item.is_successful ? 'border-brand-200 shadow-sm' : 'border-slate-200'}`}>
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <div className={`w-10 h-5 rounded-full p-1 transition-colors ${item.is_successful ? 'bg-brand-500' : 'bg-slate-300'}`}
                                                onClick={() => updateDeliveryItem(idx, 'is_successful', !item.is_successful)}>
                                                <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${item.is_successful ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </div>
                                            <span className={`text-sm font-bold ${item.is_successful ? 'text-brand-700' : 'text-slate-500'}`}>{item.community_name}</span>
                                        </label>
                                    </div>
                                    <div>
                                        <input type="text" value={item.notes} onChange={e => updateDeliveryItem(idx, 'notes', e.target.value)}
                                            className="w-full border border-slate-200 rounded-lg py-1.5 px-3 outline-none focus:ring-2 focus:ring-brand-500 text-sm" placeholder="Opcional: Novedades de la entrega..." />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ALL: GENERAL NOTES */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notas Generales / Observaciones</label>
                        <textarea value={formData.general_notes} onChange={e => setFormData({ ...formData, general_notes: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-brand-500 min-h-[60px]" />
                    </div>

                    <div className="flex justify-end pt-2">
                        <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-brand-600 text-white hover:bg-brand-500 font-bold rounded-lg transition-colors disabled:opacity-50">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Guardar Reporte
                        </button>
                    </div>
                </form>
            )}

            {/* List */}
            {loading ? <div className="flex justify-center py-4"><Loader2 className="animate-spin text-brand-500" /></div> :
                filteredReports.length === 0 ? <p className="text-slate-500 text-sm">No hay reportes registrados para esta fecha.</p> : (
                    <div className="space-y-4">
                        {filteredReports.map((r) => (
                            <div key={r.report_id} className="bg-slate-50/50 border border-slate-200 rounded-xl p-5 hover:border-brand-300 transition-colors">
                                <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                                    <div>
                                        <div className="flex text-xs items-center gap-2 mb-1">
                                            <strong className="text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full">{r.report_date}</strong>
                                            <span className="text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full uppercase tracking-wider text-[10px] font-bold">
                                                {r.report_type}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-400">ID: #{r.report_id}</span>
                                </div>

                                {r.report_type === 'FABRICATION' && r.fabrication_items && r.fabrication_items.length > 0 && (
                                    <div className="mb-3 space-y-2">
                                        {r.fabrication_items.map((fi) => (
                                            <div key={fi.item_id} className="grid grid-cols-4 gap-2 bg-slate-50 p-2 rounded-lg text-sm border border-slate-100">
                                                <div className="col-span-4 md:col-span-1"><span className="text-slate-500 text-[10px] block uppercase">Pieza</span> <strong>{fi.piece_name}</strong></div>
                                                <div><span className="text-slate-500 text-[10px] block uppercase">Meta</span> <strong>{fi.target_quantity}</strong></div>
                                                <div><span className="text-emerald-600 text-[10px] block uppercase">Prod</span> <strong>{fi.produced_quantity}</strong></div>
                                                <div><span className="text-red-500 text-[10px] block uppercase">Def</span> <strong>{fi.defective_quantity}</strong></div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {r.report_type === 'MAINTENANCE' && r.maintenance_items && r.maintenance_items.length > 0 && (
                                    <div className="mb-3 space-y-3">
                                        {r.maintenance_items.map((mi) => (
                                            <div key={mi.item_id} className="bg-slate-50 p-3 rounded-lg text-sm border border-slate-100">
                                                <div className="flex justify-between items-center bg-white border border-slate-100 px-3 py-1.5 rounded-lg -mt-1 shadow-sm mb-2">
                                                    <p className="font-medium text-slate-700">{mi.community_name || 'Sin especificar'}</p>
                                                    {mi.is_reintervention && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Reintervención</span>}
                                                </div>
                                                {mi.technical_report && (
                                                    <div>
                                                        <p className="text-slate-700">{mi.technical_report}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {r.report_type === 'CONCERTATION' && r.concertation_items && r.concertation_items.length > 0 && (
                                    <div className="mb-3 space-y-3">
                                        {r.concertation_items.map((ci) => (
                                            <div key={ci.item_id} className="bg-slate-50 p-3 rounded-lg text-sm border border-slate-100">
                                                <div className="flex justify-between items-center bg-white border border-slate-100 px-3 py-1.5 rounded-lg -mt-1 shadow-sm mb-2">
                                                    <p className="font-medium text-slate-700">{ci.community_name}</p>
                                                </div>
                                                {ci.concertation_summary && (
                                                    <div>
                                                        <p className="text-slate-700">{ci.concertation_summary}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {r.report_type === 'DELIVERY' && r.delivery_items && r.delivery_items.length > 0 && (
                                    <div className="mb-3 space-y-2">
                                        {r.delivery_items.map((di) => (
                                            <div key={di.item_id} className={`bg-slate-50 p-3 rounded-lg text-sm border ${di.is_successful ? 'border-brand-100 border-l-4 border-l-brand-500' : 'border-red-100 border-l-4 border-l-red-500'}`}>
                                                <div className="flex items-center gap-2">
                                                    {di.is_successful ? <CheckCircle size={14} className="text-brand-500" /> : <X size={14} className="text-red-500" />}
                                                    <strong className="text-slate-700">{di.community_name}</strong>
                                                </div>
                                                {di.notes && <p className="text-xs text-slate-500 mt-1 ml-5 italic">"{di.notes}"</p>}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {r.general_notes && (
                                    <p className="text-sm text-slate-600 italic">"{r.general_notes}"</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
        </div>
    );
}
