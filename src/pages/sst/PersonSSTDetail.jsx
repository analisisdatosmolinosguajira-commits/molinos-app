import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, ShieldCheck, User, Award, Clock, Package,
    Plus, Trash2, Edit2, Save, X, CheckCircle, AlertTriangle,
    Calendar, Building2, FileText, ExternalLink
} from 'lucide-react';
import PersonSilhouette from '../../components/sst/PersonSilhouette';
import { SSTService } from '../../services/sst';

const CERT_TYPES = [
    { value: 'TSA', label: 'Curso TSA 50h' },
    { value: 'ALTURAS', label: 'Trabajo en Alturas' },
    { value: 'PRIMEROS_AUXILIOS', label: 'Primeros Auxilios' },
    { value: 'ESPACIOS_CONFINADOS', label: 'Espacios Confinados' },
    { value: 'ELECTRICO', label: 'Riesgo Eléctrico' },
    { value: 'OTRO', label: 'Otro' },
];

const CONDITION_LABELS = {
    NUEVO: { label: 'Nuevo', color: 'bg-green-100 text-green-700' },
    REPOSICION: { label: 'Reposición', color: 'bg-yellow-100 text-yellow-700' },
    ACTIVIDAD_ESPECIFICA: { label: 'Act. Específica', color: 'bg-blue-100 text-blue-700' },
};

export default function PersonSSTDetail() {
    const { personId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('epp');
    const [quickDelivering, setQuickDelivering] = useState(null);

    // Certification form
    const [showCertForm, setShowCertForm] = useState(false);
    const [editingCert, setEditingCert] = useState(null);
    const [certForm, setCertForm] = useState({
        cert_name: '', cert_type: 'OTRO', issued_date: '', expires_at: '', institution: '', certificate_url: ''
    });
    const [certSaving, setCertSaving] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const detail = await SSTService.getPersonEPPDetail(personId);
            setData(detail);
        } catch (err) {
            console.error('Error loading person SST detail:', err);
        } finally {
            setLoading(false);
        }
    }, [personId]);

    useEffect(() => { loadData(); }, [loadData]);

    // Build zones for silhouette
    const buildZones = () => {
        if (!data) return {};
        const now = new Date();
        const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const zones = {};

        (data.requirements || []).forEach(req => {
            // Find latest delivery for this EPP
            const delivery = data.deliveryHistory.find(d => d.safety_id === req.safety_id);

            let status = 'MISSING';
            if (delivery) {
                let expDate;
                if (delivery.expires_at) {
                    expDate = new Date(delivery.expires_at);
                } else {
                    expDate = new Date(delivery.created_at);
                    expDate.setMonth(expDate.getMonth() + (req.renewal_months || 6));
                }

                if (expDate < now) status = 'EXPIRED';
                else if (expDate < thirtyDays) status = 'EXPIRING';
                else status = 'OK';
            }

            zones[req.body_zone] = {
                status,
                eppName: req.safety_equipment?.name || 'EPP',
                requirement: req,
                lastDelivery: delivery || null,
            };
        });

        return zones;
    };

    const handleZoneClick = async (zoneName, zoneData) => {
        if (!zoneData?.requirement) return;

        const safetyId = zoneData.requirement.safety_id;
        const eppName = zoneData.eppName;
        const renewalMonths = zoneData.requirement.renewal_months || 6;

        if (!confirm(`¿Registrar entrega de "${eppName}" para ${data.person.first_name}?`)) return;

        try {
            setQuickDelivering(zoneName);
            await SSTService.quickDeliverEPP(parseInt(personId), safetyId, renewalMonths);
            await loadData();
        } catch (err) {
            console.error('Quick deliver error:', err);
            alert('Error: ' + err.message);
        } finally {
            setQuickDelivering(null);
        }
    };

    // Certification handlers
    const openCertForm = (cert = null) => {
        if (cert) {
            setEditingCert(cert);
            setCertForm({
                cert_name: cert.cert_name,
                cert_type: cert.cert_type,
                issued_date: cert.issued_date || '',
                expires_at: cert.expires_at || '',
                institution: cert.institution || '',
                certificate_url: cert.certificate_url || '',
            });
        } else {
            setEditingCert(null);
            setCertForm({ cert_name: '', cert_type: 'OTRO', issued_date: '', expires_at: '', institution: '', certificate_url: '' });
        }
        setShowCertForm(true);
    };

    const saveCert = async () => {
        if (!certForm.cert_name) return alert('Nombre de certificación requerido');
        try {
            setCertSaving(true);
            await SSTService.upsertCertification({
                ...(editingCert ? { cert_id: editingCert.cert_id } : {}),
                person_id: parseInt(personId),
                ...certForm,
            });
            setShowCertForm(false);
            await loadData();
        } catch (err) {
            console.error('Error saving certification:', err);
            alert('Error: ' + err.message);
        } finally {
            setCertSaving(false);
        }
    };

    const deleteCert = async (certId) => {
        if (!confirm('¿Eliminar esta certificación?')) return;
        try {
            await SSTService.deleteCertification(certId);
            await loadData();
        } catch (err) {
            console.error('Error deleting cert:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-20">
                <p className="text-slate-500">No se encontró la persona</p>
            </div>
        );
    }

    const { person, requirements, deliveryHistory, certifications } = data;
    const zones = buildZones();
    const now = new Date();

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/sst')}
                    className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
                >
                    <ArrowLeft size={20} className="text-slate-500" />
                </button>
                <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                        {person.first_name?.[0]}{person.last_name?.[0]}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{person.first_name} {person.last_name}</h1>
                        <div className="flex items-center gap-3 text-sm text-slate-400">
                            <span>{person.role}</span>
                            <span>·</span>
                            <span>{person.document_id || 'Sin documento'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {[
                    { id: 'epp', label: 'EPP & Silueta', icon: ShieldCheck },
                    { id: 'certifications', label: 'Certificaciones', icon: Award },
                    { id: 'history', label: 'Historial', icon: Clock },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
                            ${activeTab === tab.id
                                ? 'bg-white text-brand-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* EPP Tab */}
            {activeTab === 'epp' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Silhouette */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center">
                        <h3 className="font-bold text-slate-800 mb-1 text-center">Estado EPP</h3>
                        <p className="text-xs text-slate-400 mb-6 text-center">
                            Click en una zona para registrar entrega rápida
                        </p>
                        <PersonSilhouette
                            zones={zones}
                            onZoneClick={handleZoneClick}
                            width={240}
                        />
                        {quickDelivering && (
                            <div className="mt-3 text-center text-xs text-brand-600 font-bold animate-pulse">
                                Registrando entrega...
                            </div>
                        )}
                    </div>

                    {/* EPP Detail Cards */}
                    <div className="lg:col-span-2 space-y-4">
                        <h3 className="font-bold text-slate-800">EPPs Requeridos ({requirements.length})</h3>

                        {requirements.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                <ShieldCheck size={48} className="mx-auto mb-3 text-slate-200" />
                                <p className="text-slate-400 font-medium">No hay EPPs configurados para el rol "{person.role}"</p>
                                <button
                                    onClick={() => navigate('/sst')}
                                    className="mt-3 text-brand-600 font-bold text-sm hover:text-brand-700"
                                >
                                    Ir a Configuración →
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {requirements.map(req => {
                                    const zone = zones[req.body_zone];
                                    const status = zone?.status || 'MISSING';
                                    const delivery = zone?.lastDelivery;

                                    const statusConfig = {
                                        OK: { bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500', text: 'text-green-700', label: 'Vigente' },
                                        EXPIRING: { bg: 'bg-yellow-50', border: 'border-yellow-200', dot: 'bg-yellow-500', text: 'text-yellow-700', label: 'Por Vencer' },
                                        EXPIRED: { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', text: 'text-red-700', label: 'Vencido' },
                                        MISSING: { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', text: 'text-red-700', label: 'No Entregado' },
                                    };
                                    const sc = statusConfig[status];

                                    return (
                                        <div key={req.id} className={`${sc.bg} border ${sc.border} rounded-xl p-4`}>
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{req.safety_equipment?.name}</p>
                                                    <p className="text-xs text-slate-400">{req.body_zone} · Cada {req.renewal_months}m</p>
                                                </div>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.text} ${sc.bg}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                                    {sc.label}
                                                </span>
                                            </div>
                                            {delivery ? (
                                                <div className="text-xs text-slate-500 space-y-0.5">
                                                    <p>Última entrega: {new Date(delivery.created_at).toLocaleDateString()}</p>
                                                    {delivery.expires_at && (
                                                        <p>Vence: {new Date(delivery.expires_at).toLocaleDateString()}</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-red-400">Sin entregas registradas</p>
                                            )}
                                            <button
                                                onClick={() => handleZoneClick(req.body_zone, zone)}
                                                className="mt-2 w-full text-xs font-bold text-brand-600 hover:text-brand-700 bg-white rounded-lg px-3 py-1.5 border border-brand-200 hover:border-brand-300 transition-all"
                                            >
                                                Entregar {status === 'MISSING' ? '' : 'Nuevo'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Certifications Tab */}
            {activeTab === 'certifications' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800">Certificaciones</h3>
                        <button
                            onClick={() => openCertForm()}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 text-sm shadow-md"
                        >
                            <Plus size={16} /> Agregar
                        </button>
                    </div>

                    {certifications.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                            <Award size={48} className="mx-auto mb-3 text-slate-200" />
                            <p className="text-slate-400 font-medium">Sin certificaciones registradas</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {certifications.map(cert => {
                                const isExpired = cert.expires_at && new Date(cert.expires_at) < now;
                                const isExpiring = cert.expires_at && !isExpired && new Date(cert.expires_at) < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                                return (
                                    <div key={cert.cert_id} className={`bg-white rounded-xl border p-5 shadow-sm ${isExpired ? 'border-red-200' : isExpiring ? 'border-yellow-200' : 'border-slate-100'}`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Award size={18} className={isExpired ? 'text-red-500' : isExpiring ? 'text-yellow-500' : 'text-green-500'} />
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{cert.cert_name}</p>
                                                    <p className="text-xs text-slate-400">{CERT_TYPES.find(t => t.value === cert.cert_type)?.label || cert.cert_type}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => openCertForm(cert)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                                                    <Edit2 size={12} className="text-slate-400" />
                                                </button>
                                                <button onClick={() => deleteCert(cert.cert_id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                                                    <Trash2 size={12} className="text-red-400" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-1 text-xs text-slate-500">
                                            {cert.institution && (
                                                <p className="flex items-center gap-1"><Building2 size={12} /> {cert.institution}</p>
                                            )}
                                            {cert.issued_date && (
                                                <p className="flex items-center gap-1"><Calendar size={12} /> Expedido: {new Date(cert.issued_date).toLocaleDateString()}</p>
                                            )}
                                            {cert.expires_at && (
                                                <p className={`flex items-center gap-1 font-bold ${isExpired ? 'text-red-600' : isExpiring ? 'text-yellow-600' : 'text-green-600'}`}>
                                                    {isExpired ? <AlertTriangle size={12} /> : <Clock size={12} />}
                                                    Vence: {new Date(cert.expires_at).toLocaleDateString()}
                                                    {isExpired && ' (VENCIDO)'}
                                                    {isExpiring && ' (PRÓXIMO)'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Cert Form Modal */}
                    {showCertForm && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="font-bold text-slate-800">{editingCert ? 'Editar' : 'Nueva'} Certificación</h3>
                                    <button onClick={() => setShowCertForm(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                        <X size={18} className="text-slate-400" />
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nombre</label>
                                            <input
                                                type="text"
                                                value={certForm.cert_name}
                                                onChange={e => setCertForm({ ...certForm, cert_name: e.target.value })}
                                                placeholder="Ej: Curso TSA 50 horas"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tipo</label>
                                            <select
                                                value={certForm.cert_type}
                                                onChange={e => setCertForm({ ...certForm, cert_type: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                                            >
                                                {CERT_TYPES.map(t => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Entidad</label>
                                            <input
                                                type="text"
                                                value={certForm.institution}
                                                onChange={e => setCertForm({ ...certForm, institution: e.target.value })}
                                                placeholder="SENA, ARL, etc."
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Fecha Expedición</label>
                                            <input
                                                type="date"
                                                value={certForm.issued_date}
                                                onChange={e => setCertForm({ ...certForm, issued_date: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Fecha Vencimiento</label>
                                            <input
                                                type="date"
                                                value={certForm.expires_at}
                                                onChange={e => setCertForm({ ...certForm, expires_at: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                        <button onClick={() => setShowCertForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={saveCert}
                                            disabled={certSaving}
                                            className="px-5 py-2 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 text-sm disabled:opacity-50"
                                        >
                                            {certSaving ? 'Guardando...' : 'Guardar'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-800">Historial de Entregas EPP</h3>

                    {deliveryHistory.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                            <Package size={48} className="mx-auto mb-3 text-slate-200" />
                            <p className="text-slate-400 font-medium">Sin entregas registradas</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase">Fecha</th>
                                        <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase">EPP</th>
                                        <th className="text-center px-5 py-3 text-xs font-bold text-slate-400 uppercase">Cantidad</th>
                                        <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase">Motivo</th>
                                        <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase">Vencimiento</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deliveryHistory.map(item => {
                                        const cond = CONDITION_LABELS[item.condition] || { label: item.condition, color: 'bg-slate-100 text-slate-600' };
                                        return (
                                            <tr key={item.item_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                                <td className="px-5 py-3 text-sm text-slate-600">
                                                    {item.epp_delivery?.delivery_date
                                                        ? new Date(item.epp_delivery.delivery_date).toLocaleDateString()
                                                        : new Date(item.created_at).toLocaleDateString()
                                                    }
                                                </td>
                                                <td className="px-5 py-3 text-sm font-medium text-slate-800">
                                                    {item.safety_equipment?.name || 'EPP'}
                                                </td>
                                                <td className="px-5 py-3 text-sm text-center font-bold">{item.quantity}</td>
                                                <td className="px-5 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cond.color}`}>
                                                        {cond.label}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-sm text-slate-500">
                                                    {item.expires_at ? new Date(item.expires_at).toLocaleDateString() : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
