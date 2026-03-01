import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShieldCheck, Users, Package, Settings, BarChart3, Search,
    AlertTriangle, CheckCircle, Clock, XCircle, ChevronRight,
    Plus, Award, HardHat, Eye, Hand, ArrowDown
} from 'lucide-react';
import { SSTService } from '../../services/sst';
import EPPDeliveryModal from '../../components/sst/EPPDeliveryModal';
import SSTConfigTab from '../../components/sst/SSTConfigTab';
import SSTAnalyticsTab from '../../components/sst/SSTAnalyticsTab';

const STATUS_BADGE = {
    OK: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Completo' },
    EXPIRING: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock, label: 'Por Vencer' },
    INCOMPLETE: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, label: 'Incompleto' },
    NO_REQUIREMENTS: { color: 'bg-slate-100 text-slate-500 border-slate-200', icon: Settings, label: 'Sin Config.' },
};

export default function SSTPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('personnel');
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [alerts, setAlerts] = useState({ eppAlerts: [], certAlerts: [] });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [staffData, alertsData] = await Promise.all([
                SSTService.getStaffWithEPPStatus(),
                SSTService.getExpiringAlerts(),
            ]);
            setStaff(staffData);
            setAlerts(alertsData);
        } catch (err) {
            console.error('Error loading SST data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Filtered staff
    const filtered = staff.filter(p => {
        const matchesSearch = search === '' ||
            `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
            (p.document_id || '').toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || p.eppStatus === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // KPIs
    const kpis = {
        total: staff.length,
        complete: staff.filter(s => s.eppStatus === 'OK').length,
        expiring: staff.filter(s => s.eppStatus === 'EXPIRING').length,
        incomplete: staff.filter(s => s.eppStatus === 'INCOMPLETE').length,
        totalAlerts: alerts.eppAlerts.length + alerts.certAlerts.length,
    };
    const compliancePercent = kpis.total > 0 ? Math.round((kpis.complete / kpis.total) * 100) : 0;

    const tabs = [
        { id: 'personnel', label: 'Personal', icon: Users },
        { id: 'deliveries', label: 'Entregas', icon: Package },
        { id: 'config', label: 'Configuración', icon: Settings },
        { id: 'analytics', label: 'Analíticas', icon: BarChart3 },
    ];

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl text-white shadow-lg shadow-orange-500/20">
                        <ShieldCheck size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Gestión SST</h1>
                        <p className="text-sm text-slate-400">Seguridad y Salud en el Trabajo · EPP y Certificaciones</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowDeliveryModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all"
                >
                    <Plus size={18} /> Nueva Entrega
                </button>
            </div>

            {/* Alert Banner */}
            {kpis.totalAlerts > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertTriangle className="text-amber-600 flex-shrink-0" size={22} />
                    <div className="flex-1">
                        <span className="font-bold text-amber-800">
                            {kpis.totalAlerts} alerta{kpis.totalAlerts > 1 ? 's' : ''} activa{kpis.totalAlerts > 1 ? 's' : ''}
                        </span>
                        <span className="text-amber-600 text-sm ml-2">
                            {alerts.eppAlerts.length} EPP · {alerts.certAlerts.length} certificaciones por vencer
                        </span>
                    </div>
                </div>
            )}

            {/* KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <KpiCard label="Personal Total" value={kpis.total} icon={Users} color="from-slate-600 to-slate-700" />
                <KpiCard label="EPP Completo" value={kpis.complete} icon={CheckCircle} color="from-green-500 to-green-600" />
                <KpiCard label="Por Vencer" value={kpis.expiring} icon={Clock} color="from-yellow-500 to-amber-600" />
                <KpiCard label="Incompleto" value={kpis.incomplete} icon={XCircle} color="from-red-500 to-red-600" />
                <KpiCard label="Cumplimiento" value={`${compliancePercent}%`} icon={ShieldCheck} color="from-brand-500 to-brand-600" />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all
                            ${activeTab === tab.id
                                ? 'bg-white text-brand-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'personnel' && (
                <div className="space-y-4">
                    {/* Search & Filter */}
                    <div className="flex gap-3 flex-wrap">
                        <div className="flex-1 min-w-[200px] relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o documento..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm"
                            />
                        </div>
                        <div className="flex gap-2">
                            {[
                                { value: 'ALL', label: 'Todos' },
                                { value: 'INCOMPLETE', label: '🔴 Incompleto' },
                                { value: 'EXPIRING', label: '🟡 Por Vencer' },
                                { value: 'OK', label: '🟢 Completo' },
                            ].map(f => (
                                <button
                                    key={f.value}
                                    onClick={() => setStatusFilter(f.value)}
                                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all
                                        ${statusFilter === f.value
                                            ? 'bg-brand-600 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Staff List */}
                    {loading ? (
                        <div className="text-center py-16">
                            <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4" />
                            <p className="text-slate-400">Cargando personal...</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase">Persona</th>
                                        <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase">Rol</th>
                                        <th className="text-center px-5 py-3 text-xs font-bold text-slate-400 uppercase">Estado EPP</th>
                                        <th className="text-center px-5 py-3 text-xs font-bold text-slate-400 uppercase">EPP</th>
                                        <th className="text-center px-5 py-3 text-xs font-bold text-slate-400 uppercase">Certificaciones</th>
                                        <th className="px-5 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(person => {
                                        const badge = STATUS_BADGE[person.eppStatus] || STATUS_BADGE.NO_REQUIREMENTS;
                                        const BadgeIcon = badge.icon;

                                        return (
                                            <tr
                                                key={person.person_id}
                                                className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                                                onClick={() => navigate(`/sst/${person.person_id}`)}
                                            >
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white text-xs font-bold">
                                                            {person.first_name?.[0]}{person.last_name?.[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-800 text-sm">{person.first_name} {person.last_name}</p>
                                                            <p className="text-xs text-slate-400">{person.document_id || 'Sin documento'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg">
                                                        {person.role}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${badge.color}`}>
                                                        <BadgeIcon size={12} />
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <div className="text-sm">
                                                        <span className="font-bold text-slate-700">{person.eppOk}</span>
                                                        <span className="text-slate-400">/{person.eppTotal}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Award size={14} className={person.certStatus === 'OK' ? 'text-green-500' : person.certStatus === 'EXPIRING' ? 'text-yellow-500' : 'text-red-500'} />
                                                        <span className="text-xs text-slate-500">{person.certifications.length}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <ChevronRight size={16} className="text-slate-300" />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="text-center py-12 text-slate-400">
                                                No se encontró personal
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'deliveries' && (
                <DeliveriesTab onNewDelivery={() => setShowDeliveryModal(true)} />
            )}

            {activeTab === 'config' && (
                <SSTConfigTab />
            )}

            {activeTab === 'analytics' && (
                <SSTAnalyticsTab />
            )}

            {/* Delivery Modal */}
            {showDeliveryModal && (
                <EPPDeliveryModal
                    isOpen={showDeliveryModal}
                    onClose={() => setShowDeliveryModal(false)}
                    onSuccess={() => {
                        setShowDeliveryModal(false);
                        loadData();
                    }}
                />
            )}
        </div>
    );
}

// ─── KPI Card ─────────────────────
function KpiCard({ label, value, icon: Icon, color }) {
    return (
        <div className={`bg-gradient-to-br ${color} text-white p-4 rounded-xl shadow-lg`}>
            <div className="flex items-center justify-between mb-2">
                <Icon size={20} className="opacity-70" />
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs opacity-80 font-medium">{label}</p>
        </div>
    );
}

// ─── Deliveries Tab ─────────────────
function DeliveriesTab({ onNewDelivery }) {
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const data = await SSTService.getDeliveryHistory();
                setDeliveries(data);
            } catch (err) {
                console.error('Error loading deliveries:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return (
            <div className="text-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-slate-400">Cargando historial de entregas...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">Historial de Entregas</h3>
                <button
                    onClick={onNewDelivery}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors text-sm"
                >
                    <Plus size={16} /> Nueva Entrega
                </button>
            </div>

            {deliveries.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <Package size={48} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500 font-medium">No hay entregas registradas</p>
                    <button onClick={onNewDelivery} className="mt-4 text-brand-600 font-bold text-sm hover:text-brand-700">
                        Registrar primera entrega →
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {deliveries.map(d => (
                        <div key={d.delivery_id} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-brand-50 rounded-lg">
                                        <Package size={16} className="text-brand-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">
                                            Entrega #{d.delivery_id}
                                        </p>
                                        <p className="text-xs text-slate-400">{new Date(d.delivery_date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <span className="text-xs bg-brand-50 text-brand-600 px-2.5 py-1 rounded-full font-bold">
                                    {d.epp_delivery_item?.length || 0} ítem(s)
                                </span>
                            </div>
                            {d.notes && <p className="text-xs text-slate-500 mb-3">{d.notes}</p>}
                            <div className="flex flex-wrap gap-2">
                                {(d.epp_delivery_item || []).slice(0, 5).map(item => (
                                    <span key={item.item_id} className="inline-flex items-center gap-1 text-xs bg-slate-50 text-slate-600 px-2 py-1 rounded-md border border-slate-100">
                                        {item.safety_equipment?.name} → {item.person?.first_name} {item.person?.last_name}
                                    </span>
                                ))}
                                {(d.epp_delivery_item || []).length > 5 && (
                                    <span className="text-xs text-slate-400">+{d.epp_delivery_item.length - 5} más</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
