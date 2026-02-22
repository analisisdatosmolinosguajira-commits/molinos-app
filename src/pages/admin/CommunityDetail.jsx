import React, { useState, useEffect } from 'react';
import {
    Users, MapPin, Factory, History, Calendar,
    Phone, Award, Trash2, Edit2, Plus, Package,
    ChevronDown, ChevronUp, Hash
} from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import SocialInfoSection from '../../components/social/SocialInfoSection';
import { CommunityService } from '../../services/communities';
import { DeliveryService } from '../../services/deliveries';

const CommunityDetail = ({
    community,
    onAddMember,
    onRemoveMember,
    onUpdateMember,
    onClose,
    onAssignMill,
    onUnlinkMill,
    onSocialUpdate
}) => {
    const [activeTab, setActiveTab] = useState('general'); // general, members, history, social_info, deliveries

    if (!community) return null;

    return (
        <div className="bg-white h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">ID: {community.community_id}</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">ACTIVA</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 leading-tight">{community.name}</h2>
                        <div className="flex items-center gap-2 text-slate-500 mt-1">
                            <MapPin size={16} />
                            <span className="text-sm">{community.municipality || 'Municipio'}, {community.department || 'Departamento'}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-6 mt-6 border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 
                            ${activeTab === 'general' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}
                        `}
                    >
                        General & Molino
                    </button>
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2
                            ${activeTab === 'members' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}
                        `}
                    >
                        Miembros <span className="bg-slate-200 text-slate-600 px-1.5 rounded-full text-[10px]">{community.members?.length || 0}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 
                            ${activeTab === 'history' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}
                        `}
                    >
                        Historial de Visitas
                    </button>
                    <button
                        onClick={() => setActiveTab('social_info')}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2
                            ${activeTab === 'social_info' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}
                        `}
                    >
                        Situaciones Sociales
                        {community.activeSituations?.length > 0 && (
                            <span className="bg-amber-100 text-amber-600 px-1.5 rounded-full text-[10px] font-bold ring-1 ring-amber-200 animate-pulse">
                                {community.activeSituations.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('deliveries')}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2
                            ${activeTab === 'deliveries' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}
                        `}
                    >
                        <Package size={16} />
                        Entregas Material
                    </button>
                </div>
            </div>

            {/* Content Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

                {/* TAB: GENERAL */}
                {activeTab === 'general' && (
                    <div className="space-y-6">
                        {/* Mill Card */}
                        <section>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Factory size={16} /> Molino Asignado
                            </h3>
                            {community.mill ? (
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-4 relaltive group">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                        <Factory size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-blue-900">{community.mill.name}</h4>
                                            <StatusBadge status={community.mill.status} size="sm" />
                                        </div>
                                        <p className="text-blue-700 font-mono text-sm mt-1">{community.mill.code}</p>
                                        <div className="mt-3 flex gap-3 text-xs text-blue-800">
                                            <span className="bg-blue-200/50 px-2 py-1 rounded">Modelo A-2023</span>
                                            <span className="bg-blue-200/50 px-2 py-1 rounded">Instalado: 2024</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onUnlinkMill(community.mill.mill_id)}
                                        className="absolute top-4 right-4 p-2 bg-white text-red-500 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                                        title="Desvincular Molino"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400">
                                    <Factory size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>No hay molino asignado</p>
                                    <button
                                        onClick={onAssignMill}
                                        className="text-indigo-600 text-sm font-medium mt-2 hover:underline"
                                    >
                                        Asignar Molino
                                    </button>
                                </div>
                            )}
                        </section>

                        {/* Recent Activity Summary */}
                        <section>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Resumen</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-slate-500 text-xs uppercase">Total Visitas</p>
                                    <p className="text-2xl font-bold text-slate-700">{community.visits?.length || 0}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-slate-500 text-xs uppercase">Miembros</p>
                                    <p className="text-2xl font-bold text-slate-700">{community.members?.length || 0}</p>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {/* TAB: MEMBERS */}
                {activeTab === 'members' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Liderazgo y Comunidad</h3>
                            <button
                                onClick={onAddMember}
                                className="text-xs flex items-center gap-1 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-medium transition-colors"
                            >
                                <Plus size={14} /> Asociar Persona
                            </button>
                        </div>

                        {community.members && community.members.length > 0 ? (
                            <div className="grid gap-3">
                                {community.members.map((member) => (
                                    <div key={member.membershipId} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-shadow group">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm
                                                ${['Presidente', 'Lider'].includes(member.role) ? 'bg-indigo-600' : 'bg-slate-400'}
                                            `}>
                                                {member.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800 text-sm">{member.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">{member.role}</span>
                                                    {member.phone && <span className="text-xs text-slate-400 flex items-center gap-1"><Phone size={10} /> {member.phone}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onUpdateMember({
                                                    membershipId: member.membershipId,
                                                    personId: member.personId,
                                                    name: member.name,
                                                    roleId: member.roleId
                                                })}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                                title="Editar Rol"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => onRemoveMember(member.membershipId)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                title="Remover"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <Users size={32} className="mx-auto mb-2 opacity-50" />
                                <p>No hay miembros registrados.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: HISTORY */}
                {activeTab === 'history' && (
                    <div className="relative pl-6 border-l-2 border-slate-100 space-y-8">
                        {community.visits?.map((visit, idx) => (
                            <div key={idx} className="relative">
                                <div className={`absolute -left-[29px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ring-1 
                                    ${visit.type === 'LOGISTICA' ? 'bg-indigo-500 ring-indigo-100' : 'bg-green-500 ring-green-100'}
                                `} />
                                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white
                                            ${visit.type === 'LOGISTICA' ? 'bg-indigo-500' : 'bg-green-500'}
                                        `}>
                                            {visit.type}
                                        </span>
                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                            <Calendar size={12} /> {new Date(visit.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-sm mb-1">{visit.title}</h4>
                                    <p className="text-slate-600 text-xs mb-3">{visit.description}</p>

                                    {visit.crew && (
                                        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 p-2 rounded">
                                            <Users size={12} />
                                            <span>Equipo: {visit.crew}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {(!community.visits || community.visits.length === 0) && (
                            <div className="text-center py-8 text-slate-400">
                                <History size={32} className="mx-auto mb-2 opacity-50" />
                                <p>Sin historial de visitas.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: DELIVERIES */}
                {activeTab === 'deliveries' && (
                    <CommunityDeliveriesTab communityId={community.community_id} />
                )}

                {/* TAB: SOCIAL INFO */}
                {activeTab === 'social_info' && (
                    <SocialInfoSection
                        socialData={{
                            ...community,
                            community_name: community.name,
                            concertations: community.visits?.filter(v => v.type === 'SOCIAL') || []
                        }}
                        onRefresh={onSocialUpdate}
                        service={CommunityService}
                        hideHeader={true}
                        hideMembers={true}
                        hideConcertations={true}
                    />
                )}

            </div>
        </div>
    );
};

// Internal component for the deliveries tab to encapsulate logic
const CommunityDeliveriesTab = ({ communityId }) => {
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        const loadDeliveries = async () => {
            setLoading(true);
            try {
                const data = await DeliveryService.getDeliveriesByCommunity(communityId);
                setDeliveries(data);
            } catch (error) {
                console.error("Error loading community deliveries:", error);
            } finally {
                setLoading(false);
            }
        };
        loadDeliveries();
    }, [communityId]);

    if (loading) {
        return (
            <div className="py-12 text-center text-slate-400">
                <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2" />
                Cargando entregas...
            </div>
        );
    }

    if (deliveries.length === 0) {
        return (
            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Package size={32} className="mx-auto mb-2 opacity-50" />
                <p>No hay registros de entregas de material.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Historico de Entregas</h3>
            <div className="space-y-3">
                {deliveries.map((delivery) => (
                    <div key={delivery.delivery_id} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div
                            className="p-4 flex items-center justify-between cursor-pointer"
                            onClick={() => setExpandedId(expandedId === delivery.delivery_id ? null : delivery.delivery_id)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                    <Package size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-slate-800 text-sm">
                                            {delivery.activity?.title || 'Entrega de Material'}
                                        </h4>
                                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">Completado</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            {new Date(delivery.activity?.actual_start_date || delivery.activity?.created_at || Date.now()).toLocaleString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Hash size={12} />
                                            ID: {delivery.delivery_id}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {expandedId === delivery.delivery_id ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                        </div>

                        {expandedId === delivery.delivery_id && (
                            <div className="px-4 pb-4 border-t border-slate-50 bg-slate-50/30">
                                <div className="mt-4 space-y-4">
                                    {/* Pieces */}
                                    {delivery.pieces?.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Piezas</p>
                                            <div className="grid gap-2">
                                                {delivery.pieces.map((p, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 text-xs">
                                                        <span className="font-medium text-slate-700">{p.piece?.name}</span>
                                                        <span className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold">{p.quantity} {p.piece?.unit || 'und'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Materials */}
                                    {delivery.materials?.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Materiales</p>
                                            <div className="grid gap-2">
                                                {delivery.materials.map((m, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 text-xs">
                                                        <span className="font-medium text-slate-700">{m.material?.name}</span>
                                                        <span className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold">{m.quantity} {m.material?.unit || 'und'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tools */}
                                    {delivery.tools?.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Herramientas</p>
                                            <div className="grid gap-2">
                                                {delivery.tools.map((t, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 text-xs">
                                                        <span className="font-medium text-slate-700">{t.tool?.name}</span>
                                                        <span className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold">{t.quantity} und</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {delivery.notes && (
                                        <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                                            <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Notas de Entrega</p>
                                            <p className="text-xs text-amber-800">{delivery.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div >
    );
};

export default CommunityDetail;
