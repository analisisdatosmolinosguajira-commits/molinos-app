import React, { useState, useEffect } from 'react';
import {
    Users, MapPin, Factory, History, Calendar,
    Phone, Award, Trash2, Edit2, Plus, Package,
    ChevronDown, ChevronUp, Hash, Home, Baby,
    GraduationCap, Briefcase, Building2, BookOpen, Save, X, Check
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
    const [editingImpact, setEditingImpact] = useState(false);
    const [impactSaving, setImpactSaving] = useState(false);
    const [impactForm, setImpactForm] = useState({
        number_of_families: community?.number_of_families ?? '',
        number_of_inhabitants: community?.number_of_inhabitants ?? '',
        number_of_children: community?.number_of_children ?? '',
        uca_school: community?.uca_school ?? '',
        main_productive_activity: community?.main_productive_activity ?? '',
        benefited_communities_count: community?.benefited_communities_count ?? '',
        training_communities: community?.training_communities ?? '',
    });

    const handleEditImpact = () => {
        setImpactForm({
            number_of_families: community?.number_of_families ?? '',
            number_of_inhabitants: community?.number_of_inhabitants ?? '',
            number_of_children: community?.number_of_children ?? '',
            uca_school: community?.uca_school ?? '',
            main_productive_activity: community?.main_productive_activity ?? '',
            benefited_communities_count: community?.benefited_communities_count ?? '',
            training_communities: community?.training_communities ?? '',
        });
        setEditingImpact(true);
    };

    const handleCancelImpact = () => setEditingImpact(false);

    const handleSaveImpact = async () => {
        setImpactSaving(true);
        try {
            const payload = {
                number_of_families: impactForm.number_of_families !== '' ? Number(impactForm.number_of_families) : null,
                number_of_inhabitants: impactForm.number_of_inhabitants !== '' ? Number(impactForm.number_of_inhabitants) : null,
                number_of_children: impactForm.number_of_children !== '' ? Number(impactForm.number_of_children) : null,
                uca_school: impactForm.uca_school || null,
                main_productive_activity: impactForm.main_productive_activity || null,
                benefited_communities_count: impactForm.benefited_communities_count !== '' ? Number(impactForm.benefited_communities_count) : null,
                training_communities: impactForm.training_communities || null,
            };
            await CommunityService.updateCommunity(community.community_id, payload);
            setEditingImpact(false);
            onSocialUpdate?.();
        } catch (err) {
            console.error('Error guardando información social:', err);
            alert('Error al guardar. Verifique su conexión e intente de nuevo.');
        } finally {
            setImpactSaving(false);
        }
    };

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
                            ${activeTab === 'general' ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'}
                        `}
                    >
                        General & Molino
                    </button>
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2
                            ${activeTab === 'members' ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'}
                        `}
                    >
                        Miembros <span className="bg-slate-200 text-slate-600 px-1.5 rounded-full text-[10px]">{community.members?.length || 0}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 
                            ${activeTab === 'history' ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'}
                        `}
                    >
                        Historial de Visitas
                    </button>
                    <button
                        onClick={() => setActiveTab('social_info')}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2
                            ${activeTab === 'social_info' ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'}
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
                            ${activeTab === 'deliveries' ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'}
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
                                <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex items-start gap-4 relaltive group">
                                    <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center text-brand-600">
                                        <Factory size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-brand-900">{community.mill.name}</h4>
                                            <StatusBadge status={community.mill.status} size="sm" />
                                        </div>
                                        <p className="text-brand-700 font-mono text-sm mt-1">{community.mill.code}</p>
                                        <div className="mt-3 flex gap-3 text-xs text-brand-800">
                                            <span className="bg-brand-200/50 px-2 py-1 rounded">Modelo A-2023</span>
                                            <span className="bg-brand-200/50 px-2 py-1 rounded">Instalado: 2024</span>
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
                                        className="text-brand-600 text-sm font-medium mt-2 hover:underline"
                                    >
                                        Asignar Molino
                                    </button>
                                </div>
                            )}
                        </section>

                        {/* Social Impact Data */}
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Users size={16} /> Información Social e Impacto
                                </h3>
                                {!editingImpact ? (
                                    <button
                                        onClick={handleEditImpact}
                                        className="flex items-center gap-1.5 text-xs bg-brand-50 text-brand-600 hover:bg-brand-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                                    >
                                        <Edit2 size={13} /> Editar
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleCancelImpact}
                                            className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
                                        >
                                            <X size={13} /> Cancelar
                                        </button>
                                        <button
                                            onClick={handleSaveImpact}
                                            disabled={impactSaving}
                                            className="flex items-center gap-1.5 text-xs bg-emerald-500 text-white hover:bg-emerald-600 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-60"
                                        >
                                            {impactSaving ? (
                                                <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> Guardando...</>
                                            ) : (
                                                <><Check size={13} /> Guardar</>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {!editingImpact ? (
                                /* ── READ MODE ── */
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600"><Home size={20} /></div>
                                        <div>
                                            <p className="text-blue-500 text-[10px] uppercase font-bold">Familias</p>
                                            <p className="text-xl font-bold text-blue-800">{community.number_of_families ?? <span className="text-sm text-slate-400 italic">Sin info</span>}</p>
                                        </div>
                                    </div>
                                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600"><Users size={20} /></div>
                                        <div>
                                            <p className="text-emerald-500 text-[10px] uppercase font-bold">Habitantes</p>
                                            <p className="text-xl font-bold text-emerald-800">{community.number_of_inhabitants ?? <span className="text-sm text-slate-400 italic">Sin info</span>}</p>
                                        </div>
                                    </div>
                                    <div className="bg-pink-50 p-4 rounded-xl border border-pink-100 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center text-pink-600"><Baby size={20} /></div>
                                        <div>
                                            <p className="text-pink-500 text-[10px] uppercase font-bold">Niños</p>
                                            <p className="text-xl font-bold text-pink-800">{community.number_of_children ?? <span className="text-sm text-slate-400 italic">Sin info</span>}</p>
                                        </div>
                                    </div>
                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600"><GraduationCap size={20} /></div>
                                        <div>
                                            <p className="text-amber-500 text-[10px] uppercase font-bold">UCA / Colegio</p>
                                            <p className="text-sm font-semibold text-amber-800">{community.uca_school || <span className="text-slate-400 italic">Sin info</span>}</p>
                                        </div>
                                    </div>
                                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-center gap-3 col-span-2">
                                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600"><Briefcase size={20} /></div>
                                        <div>
                                            <p className="text-purple-500 text-[10px] uppercase font-bold">Actividad Productiva Principal</p>
                                            <p className="text-sm font-semibold text-purple-800">{community.main_productive_activity || <span className="text-slate-400 italic">Sin info</span>}</p>
                                        </div>
                                    </div>
                                    <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center text-teal-600"><Building2 size={20} /></div>
                                        <div>
                                            <p className="text-teal-500 text-[10px] uppercase font-bold">Com. Beneficiadas</p>
                                            <p className="text-xl font-bold text-teal-800">{community.benefited_communities_count ?? <span className="text-sm text-slate-400 italic">Sin info</span>}</p>
                                        </div>
                                    </div>
                                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600"><BookOpen size={20} /></div>
                                        <div>
                                            <p className="text-indigo-500 text-[10px] uppercase font-bold">Com. p/ Formación</p>
                                            <p className="text-sm font-semibold text-indigo-800">{community.training_communities || <span className="text-slate-400 italic">Sin info</span>}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* ── EDIT MODE ── */
                                <div className="bg-slate-50 border-2 border-brand-200 rounded-xl p-4 space-y-4 animate-in fade-in duration-200">
                                    <p className="text-xs text-brand-600 font-semibold">✏️ Modo edición — Modifique los campos y pulse Guardar</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Familias */}
                                        <div>
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-blue-600 mb-1.5 uppercase">
                                                <Home size={12} /> Familias
                                            </label>
                                            <input
                                                type="number" min="0"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-400 outline-none"
                                                value={impactForm.number_of_families}
                                                onChange={e => setImpactForm(f => ({ ...f, number_of_families: e.target.value }))}
                                                placeholder="Nro. de familias"
                                            />
                                        </div>
                                        {/* Habitantes */}
                                        <div>
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 mb-1.5 uppercase">
                                                <Users size={12} /> Habitantes
                                            </label>
                                            <input
                                                type="number" min="0"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-400 outline-none"
                                                value={impactForm.number_of_inhabitants}
                                                onChange={e => setImpactForm(f => ({ ...f, number_of_inhabitants: e.target.value }))}
                                                placeholder="Nro. de habitantes"
                                            />
                                        </div>
                                        {/* Niños */}
                                        <div>
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-pink-600 mb-1.5 uppercase">
                                                <Baby size={12} /> Niños
                                            </label>
                                            <input
                                                type="number" min="0"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-400 outline-none"
                                                value={impactForm.number_of_children}
                                                onChange={e => setImpactForm(f => ({ ...f, number_of_children: e.target.value }))}
                                                placeholder="Nro. de niños"
                                            />
                                        </div>
                                        {/* UCA / Colegio */}
                                        <div>
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-amber-600 mb-1.5 uppercase">
                                                <GraduationCap size={12} /> UCA / Colegio
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-400 outline-none"
                                                value={impactForm.uca_school}
                                                onChange={e => setImpactForm(f => ({ ...f, uca_school: e.target.value }))}
                                                placeholder="Ej: UCA, Colegio, Ambos"
                                            />
                                        </div>
                                        {/* Actividad Productiva */}
                                        <div className="col-span-2">
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-purple-600 mb-1.5 uppercase">
                                                <Briefcase size={12} /> Actividad Productiva Principal
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-400 outline-none"
                                                value={impactForm.main_productive_activity}
                                                onChange={e => setImpactForm(f => ({ ...f, main_productive_activity: e.target.value }))}
                                                placeholder="Ej: Pastoreo y Artesanía, Agricultura"
                                            />
                                        </div>
                                        {/* Com. Beneficiadas */}
                                        <div>
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-teal-600 mb-1.5 uppercase">
                                                <Building2 size={12} /> Com. Beneficiadas
                                            </label>
                                            <input
                                                type="number" min="0"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-400 outline-none"
                                                value={impactForm.benefited_communities_count}
                                                onChange={e => setImpactForm(f => ({ ...f, benefited_communities_count: e.target.value }))}
                                                placeholder="Nro. comunidades"
                                            />
                                        </div>
                                        {/* Com. p/ Formación */}
                                        <div>
                                            <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 mb-1.5 uppercase">
                                                <BookOpen size={12} /> Com. p/ Formación
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-400 outline-none"
                                                value={impactForm.training_communities}
                                                onChange={e => setImpactForm(f => ({ ...f, training_communities: e.target.value }))}
                                                placeholder="Ej: Sí, No, 3 comunidades"
                                            />
                                        </div>
                                    </div>
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
                                className="text-xs flex items-center gap-1 bg-brand-50 text-brand-600 px-3 py-1.5 rounded-lg hover:bg-brand-100 font-medium transition-colors"
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
                                                ${['Presidente', 'Lider'].includes(member.role) ? 'bg-brand-600' : 'bg-slate-400'}
                                            `}>
                                                {member.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800 text-sm">{member.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-brand-600 font-bold bg-brand-50 px-1.5 py-0.5 rounded">{member.role}</span>
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
                                                className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded"
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
                                    ${visit.type === 'LOGISTICA' ? 'bg-brand-500 ring-brand-100' : 'bg-green-500 ring-green-100'}
                                `} />
                                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white
                                            ${visit.type === 'LOGISTICA' ? 'bg-brand-500' : 'bg-green-500'}
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
                <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-2" />
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
                                <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600">
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
