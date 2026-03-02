import React, { useState, useEffect } from 'react';
import {
    Search, Plus, Users, MapPin, Factory, Trash2,
    ChevronRight, Home, Edit2, User, Phone, FileText, Briefcase, Shield
} from 'lucide-react';
import { CommunityService } from '../../services/communities';
import CommunityDetail from './CommunityDetail';
import MemberModal from '../../components/modals/MemberModal';
import CreateCommunityModal from '../../components/modals/CreateCommunityModal';

import { PeopleService } from '../../services/people';
import PersonModal from '../../components/modals/PersonModal';

import MillSelectorModal from '../../components/modals/MillSelectorModal';

const CommunitiesPage = () => {
    // View State
    const [activeView, setActiveView] = useState('communities'); // 'communities', 'people'

    // Community State
    const [communities, setCommunities] = useState([]);
    const [filteredCommunities, setFilteredCommunities] = useState([]);

    // People State
    const [people, setPeople] = useState([]);
    const [filteredPeople, setFilteredPeople] = useState([]);

    // Common State
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const [selectedId, setSelectedId] = useState(null);
    const [selectedCommunity, setSelectedCommunity] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Modal States
    const [isMemberModalOpen, setMemberModalOpen] = useState(false);
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isPersonModalOpen, setPersonModalOpen] = useState(false); // For People View
    const [isMillModalOpen, setMillModalOpen] = useState(false); // For Mill Association

    const [editingMember, setEditingMember] = useState(null);
    const [editingPerson, setEditingPerson] = useState(null); // For Person Modal
    const [editingCommunity, setEditingCommunity] = useState(null); // For Community Edit

    const [selectedPerson, setSelectedPerson] = useState(null); // For Detail View

    useEffect(() => {
        if (activeView === 'communities') {
            loadCommunities();
            setSelectedPerson(null);
        } else {
            loadPeople();
            setSelectedId(null);
        }
    }, [activeView]);

    // ... (Filter effect remains same) ...

    // Filter Effect
    useEffect(() => {
        const q = searchQuery.toLowerCase();

        if (activeView === 'communities') {
            const filtered = communities.filter(c =>
                c.name?.toLowerCase().includes(q) ||
                c.municipality?.toLowerCase().includes(q) ||
                c.mill?.name?.toLowerCase().includes(q)
            );
            setFilteredCommunities(filtered);
        } else {
            const filtered = people.filter(p =>
                p.first_name?.toLowerCase().includes(q) ||
                p.last_name?.toLowerCase().includes(q) ||
                p.document_id?.toLowerCase().includes(q)
            );
            setFilteredPeople(filtered);
        }
    }, [searchQuery, communities, people, activeView]);

    // Detail Effect (Only for Communities)
    useEffect(() => {
        if (selectedId && activeView === 'communities') {
            loadDetail(selectedId);
        } else {
            setSelectedCommunity(null);
        }
    }, [selectedId, activeView]);

    const loadCommunities = async () => {
        setLoading(true);
        try {
            const data = await CommunityService.getCommunities();
            setCommunities(data);
            setFilteredCommunities(data);
        } catch (error) {
            console.error("Error loading communities:", error);
            alert(`Error loading list: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const loadPeople = async () => {
        setLoading(true);
        try {
            const data = await PeopleService.getPeople();
            setPeople(data);
            setFilteredPeople(data);
        } catch (error) {
            console.error("Error loading people:", error);
            alert(`Error loading people: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const loadDetail = async (id) => {
        setLoadingDetail(true);
        try {
            const detail = await CommunityService.getCommunityById(id);
            setSelectedCommunity(detail);
        } catch (error) {
            console.error("Error details:", error);
            alert(`Error loading details: ${error.message}`);
        } finally {
            setLoadingDetail(false);
        }
    };

    // Community CRUD Handlers
    const handleSaveCommunity = async (data) => {
        try {
            if (editingCommunity) {
                await CommunityService.updateCommunity(editingCommunity.community_id, data);
            } else {
                await CommunityService.createCommunity(data);
            }
            loadCommunities();
            // If editing current selection, reload detail
            if (editingCommunity && selectedId === editingCommunity.community_id) {
                loadDetail(selectedId);
            }
        } catch (error) {
            console.error(error);
            alert("Error al guardar comunidad");
        }
    };

    const handleEditCommunity = (e, community) => {
        e.stopPropagation();
        setEditingCommunity(community);
        setCreateModalOpen(true);
    };

    const handleDeleteCommunity = async (e, id) => {
        e.stopPropagation();
        if (!confirm("¿Eliminar esta comunidad? Se eliminarán también sus historiales.")) return;
        try {
            await CommunityService.deleteCommunity(id);
            if (selectedId === id) setSelectedId(null);
            loadCommunities();
        } catch (error) {
            console.error(error);
            alert("Error al eliminar comunidad");
        }
    };

    // Mill Association Handlers
    const handleAssignMill = () => {
        setMillModalOpen(true);
    };

    const handleMillSelected = async (millId) => {
        try {
            await CommunityService.associateMill(selectedId, millId);
            setMillModalOpen(false);
            loadDetail(selectedId);
            loadCommunities(); // Refresh list to show mill icon
        } catch (error) {
            console.error(error);
            alert("Error al asociar molino");
        }
    };

    const handleUnlinkMill = async (millId) => {
        if (!confirm("¿Desvincular molino de esta comunidad?")) return;
        try {
            await CommunityService.disassociateMill(millId);
            loadDetail(selectedId);
            loadCommunities();
        } catch (error) {
            console.error(error);
            alert("Error al desvincular molino");
        }
    };

    // Member Handlers
    const handleAddMember = () => {
        setEditingMember(null);
        setMemberModalOpen(true);
    };

    const handleUpdateMember = (member) => {
        setEditingMember(member);
        setMemberModalOpen(true);
    };

    const handleSaveMember = async (personId, role) => {
        if (!selectedId) return;

        try {
            if (editingMember) {
                // Update
                await CommunityService.updateMemberRole(editingMember.membershipId, role);
            } else {
                // Create
                await CommunityService.addMember(selectedId, personId, role);
            }
            // Refresh
            loadDetail(selectedId);
            loadCommunities();
        } catch (error) {
            console.error(error);
            alert("Error al guardar miembro");
        }
    };

    const handleRemoveMember = async (memId) => {
        if (!confirm("¿Remover miembro?")) return;
        try {
            await CommunityService.removeMember(memId);
            loadDetail(selectedId);
            loadCommunities();
        } catch (e) { console.error(e); alert("Error al remover"); }
    };

    // People Handlers
    const handleSavePerson = async (result) => {
        await loadPeople(); // Refresh list
        // Update selection if editing currently selected
        if (selectedPerson && (result.person_id === selectedPerson.person_id || result.id === selectedPerson.person_id)) {
            // Re-find the updated person from the new list or update locally
            // Ideally we fetch the single person detail again, but let's just find in list after reload
            // For now, simpler: deselect or keep old (might be stale).
            // Let's try to update the selected person with the result (result usually has new data)
            // But result from service might not have community name resolved...
            setSelectedPerson(null); // Reset selection to force re-pick or implementing reload logic
        }
    };

    const handleEditPerson = (person) => {
        setEditingPerson(person);
        setPersonModalOpen(true);
    };

    const handleDeletePerson = async (id) => {
        if (!confirm("¿Estás seguro de eliminar esta persona? Esta acción no se puede deshacer.")) return;
        try {
            await PeopleService.deletePerson(id);
            setSelectedPerson(null);
            loadPeople();
        } catch (error) {
            console.error(error);
            alert("Error al eliminar persona");
        }
    };

    return (
        <div className="h-[calc(100vh-64px)] flex bg-slate-50 overflow-hidden relative">
            {/* Sidebar List */}
            <div className={`w-full md:w-1/3 lg:w-[400px] bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0 absolute md:relative z-10 transition-transform duration-300
                 ${selectedId ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
            `}>
                {/* Header */}
                <div className="p-4 border-b border-slate-100 bg-white z-20">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-xl font-bold text-slate-800">Gestión</h1>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => { setActiveView('communities'); setSelectedId(null); }}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${activeView === 'communities' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Comunidades
                            </button>
                            <button
                                onClick={() => { setActiveView('people'); setSelectedId(null); }}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${activeView === 'people' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Personas
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2 mb-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder={activeView === 'communities' ? "Buscar comunidad..." : "Buscar persona..."}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-100 transition-all placeholder:text-slate-400"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button
                            className="bg-brand-600 hover:bg-brand-700 text-white p-2 rounded-xl shadow-sm transition-all hover:scale-105 flex-shrink-0"
                            onClick={() => {
                                if (activeView === 'communities') {
                                    setEditingCommunity(null);
                                    setCreateModalOpen(true);
                                } else {
                                    setEditingPerson(null);
                                    setPersonModalOpen(true);
                                }
                            }}
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400">
                            <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-2" />
                            Cargando...
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {/* COMMUNITIES LIST */}
                            {activeView === 'communities' && filteredCommunities.map(comm => (
                                <div
                                    key={comm.community_id}
                                    onClick={() => setSelectedId(comm.community_id)}
                                    className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 relative group
                                        ${selectedId === comm.community_id ? 'bg-brand-50/60' : ''}
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`font-semibold text-sm ${selectedId === comm.community_id ? 'text-brand-900' : 'text-slate-700'}`}>
                                            {comm.name}
                                        </h4>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-mono">
                                                ID: {comm.community_id}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                        <MapPin size={12} />
                                        <span>{comm.municipality || 'Municipio'}, {comm.department}</span>
                                    </div>

                                    <div className="flex items-center gap-3 mt-3">
                                        <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100/50 px-2 py-1 rounded">
                                            <Users size={12} />
                                            <span>{comm.memberCount} Miembros</span>
                                        </div>
                                        {comm.mill && (
                                            <div className="flex items-center gap-1 text-xs text-brand-600 bg-brand-50 px-2 py-1 rounded border border-brand-100">
                                                <Factory size={12} />
                                                <span className="truncate max-w-[100px]">{comm.mill.name}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => handleEditCommunity(e, comm)}
                                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteCommunity(e, comm.community_id)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* PEOPLE LIST */}
                            {activeView === 'people' && filteredPeople.map(person => (
                                <div
                                    key={person.person_id || person.id}
                                    onClick={() => setSelectedPerson(person)}
                                    className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 relative group
                                        ${selectedPerson?.person_id === person.person_id ? 'bg-brand-50/60' : ''}
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm
                                            ${person.communityId ? 'bg-brand-500' : 'bg-slate-400'}
                                        `}>
                                            {person.first_name?.[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-800 text-sm group-hover:text-brand-700 transition-colors">
                                                {person.first_name} {person.last_name}
                                            </h4>
                                            <p className="text-xs text-slate-500 font-mono">{person.document_id || 'Sin Documento'}</p>
                                        </div>
                                    </div>

                                    <div className="mt-3 pl-[52px]">
                                        {person.community ? (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-brand-50 text-brand-700 text-xs font-medium border border-brand-100">
                                                <Home size={10} />
                                                {person.community} • {person.role}
                                            </span>
                                        ) : (
                                            <span className="inline-block px-2 py-1 rounded-md bg-slate-100 text-slate-500 text-xs text-[10px]">
                                                Sin Comunidad
                                            </span>
                                        )}
                                    </div>

                                    <div className="absolute right-4 top-4 text-slate-300 group-hover:text-brand-400 transition-colors">
                                        <Edit2 size={14} />
                                    </div>
                                </div>
                            ))}

                            {((activeView === 'communities' && filteredCommunities.length === 0) || (activeView === 'people' && filteredPeople.length === 0)) && (
                                <div className="p-8 text-center text-slate-400">
                                    <Home size={32} className="mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">No se encontraron resultados</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Detail View (Only for Communities) */}
            <div className={`flex-1 bg-slate-50 h-full relative transition-transform duration-300 w-full absolute md:static
                 ${selectedId ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
            `}>
                {loadingDetail ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-20">
                        <div className="animate-spin w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full" />
                    </div>
                ) : null}

                {/* Main Content Area Logic */}
                {activeView === 'communities' ? (
                    selectedCommunity ? (
                        <CommunityDetail
                            community={selectedCommunity}
                            onClose={() => setSelectedId(null)}
                            onAddMember={handleAddMember}
                            onRemoveMember={handleRemoveMember}
                            onUpdateMember={handleUpdateMember}
                            onAssignMill={handleAssignMill}
                            onUnlinkMill={handleUnlinkMill}
                            onSocialUpdate={() => loadDetail(selectedId)}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/50">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                <Home size={32} className="text-slate-300" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-600">Gestión de Comunidades</h3>
                            <p className="text-sm mt-1 max-w-xs">Selecciona una comunidad para ver detalles.</p>
                        </div>
                    )
                ) : (
                    // PEOPLE DETAIL VIEW
                    selectedPerson ? (
                        <div className="h-full flex flex-col bg-white overflow-hidden animate-in fade-in duration-300">
                            {/* Header */}
                            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/30">
                                <div className="flex items-center gap-5">
                                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg
                                        ${selectedPerson.communityId ? 'bg-gradient-to-br from-indigo-500 to-blue-600' : 'bg-slate-400'}
                                   `}>
                                        {selectedPerson.first_name?.[0]}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800">{selectedPerson.first_name} {selectedPerson.last_name}</h2>
                                        <div className="flex items-center gap-3 mt-1 text-slate-500 text-sm">
                                            <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">
                                                ID: {selectedPerson.person_id || selectedPerson.id}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <FileText size={14} />
                                                {selectedPerson.document_id || 'Sin Cédula'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedPerson(null)}
                                    className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full md:hidden"
                                >
                                    <ChevronRight className="rotate-180" size={24} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-8">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl">
                                    {/* Info Card */}
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                            <User size={20} className="text-brand-500" />
                                            Información Personal
                                        </h3>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-semibold text-slate-400 uppercase">Teléfono</label>
                                                <div className="text-slate-700 font-medium flex items-center gap-2 mt-1">
                                                    <Phone size={16} className="text-slate-400" />
                                                    {selectedPerson.phone || 'No registrado'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-400 uppercase">Especialidad / Ocupación</label>
                                                <div className="text-slate-700 font-medium flex items-center gap-2 mt-1">
                                                    <Briefcase size={16} className="text-slate-400" />
                                                    {selectedPerson.specialty || selectedPerson.role || 'No especificada'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Community Card */}
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                            <Home size={20} className="text-brand-500" />
                                            Comunidad Asignada
                                        </h3>

                                        {selectedPerson.community ? (
                                            <div className="bg-brand-50 rounded-xl p-5 border border-brand-100">
                                                <div className="flex items-start justify-between mb-2">
                                                    <span className="text-xs font-bold text-brand-400 uppercase tracking-wide">Comunidad Actual</span>
                                                    <span className="bg-brand-200 text-brand-800 text-[10px] px-2 py-0.5 rounded-full font-bold">ACTIVO</span>
                                                </div>
                                                <div className="text-xl font-bold text-brand-900 mb-1">
                                                    {selectedPerson.community}
                                                </div>
                                                <div className="text-brand-700 font-medium flex items-center gap-2">
                                                    <Shield size={16} />
                                                    {selectedPerson.role}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-50 rounded-xl p-8 border border-slate-100 text-center">
                                                <Home size={32} className="mx-auto text-slate-300 mb-2" />
                                                <p className="text-slate-500 text-sm">Esta persona no está asignada a ninguna comunidad.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                                <button
                                    onClick={() => handleDeletePerson(selectedPerson.person_id || selectedPerson.id)}
                                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold transition-colors"
                                >
                                    Eliminar Persona
                                </button>
                                <button
                                    onClick={() => handleEditPerson(selectedPerson)}
                                    className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <Edit2 size={16} />
                                    Editar Datos
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/50">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                <Users size={32} className="text-slate-300" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-600">Gestión de Personas</h3>
                            <p className="text-sm mt-1 max-w-xs">Selecciona una persona de la lista para ver su ficha detallada.</p>
                        </div>
                    )
                )}
            </div>

            {/* Modals */}
            <MemberModal
                isOpen={isMemberModalOpen}
                onClose={() => setMemberModalOpen(false)}
                onSave={handleSaveMember}
                initialMember={editingMember}
            />
            <CreateCommunityModal
                isOpen={isCreateModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onSave={handleSaveCommunity}
                initialData={editingCommunity}
            />
            <PersonModal
                isOpen={isPersonModalOpen}
                onClose={() => setPersonModalOpen(false)}
                onSave={handleSavePerson}
                personToEdit={editingPerson}
                communities={communities}
            />
            {isMillModalOpen && (
                <MillSelectorModal
                    onSelect={handleMillSelected}
                    onClose={() => setMillModalOpen(false)}
                />
            )}
        </div>
    );
};

export default CommunitiesPage;
