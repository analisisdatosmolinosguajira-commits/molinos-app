import React, { useState } from 'react';
import {
    Users, MapPin, Factory, History, Calendar,
    Phone, Award, Trash2, Edit2, Plus
} from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';

const CommunityDetail = ({ community, onAddMember, onRemoveMember, onUpdateMember, onClose, onAssignMill, onUnlinkMill }) => {
    const [activeTab, setActiveTab] = useState('general'); // general, members, history

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

            </div>
        </div>
    );
};

export default CommunityDetail;
