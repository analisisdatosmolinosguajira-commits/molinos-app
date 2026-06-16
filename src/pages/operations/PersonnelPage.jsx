import React, { useState, useEffect } from 'react';
import { Users, Plus, Shield, Wrench, UserCheck, Briefcase, UserCog, Calendar, Circle, Edit2, Trash2, LayoutGrid, Package, Filter } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { CrewService } from '../../services/crews';
import { OperationalStaffService } from '../../services/operationalStaff';
import { ActivityService } from '../../services/activities';
import { supabase } from '../../services/supabase';
import ActivityPlanning from '../../components/planning/ActivityPlanning';
import CrewActivitiesPanel from '../../components/personnel/CrewActivitiesPanel';
import CrewTimeline from '../../components/personnel/CrewTimeline';
import CrewModal from '../../components/personnel/CrewModal';
import CrewMemberModal from '../../components/operations/CrewMemberModal';
import OperationalStaffModal from '../../components/operations/OperationalStaffModal';
import CrewAssignmentBoard from '../../components/personnel/CrewAssignmentBoard';
import CrewSignatureEditor from './CrewSignatureEditor';
import SupplyBoxPanel from '../../components/supplyBox/SupplyBoxPanel';
import SupplyBoxManagerModal from '../../components/supplyBox/SupplyBoxManagerModal';
import { SupplyBoxService } from '../../services/supplyBox';
import PermissionGate from '../../components/auth/PermissionGate';

export default function PersonnelPage() {
    // View state: 'crews' | 'staff' | 'planning'
    const [activeView, setActiveView] = useState('crews');
    const [quickAssignmentMode, setQuickAssignmentMode] = useState(false);

    // Crews state
    const [crews, setCrews] = useState([]);
    const [selectedCrew, setSelectedCrew] = useState(null);
    const [crewActivities, setCrewActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [showCrewModal, setShowCrewModal] = useState(false);
    const [editingCrew, setEditingCrew] = useState(null);

    // Staff state
    const [staff, setStaff] = useState([]);
    const [selectedStaffId, setSelectedStaffId] = useState(null); // Valid ID or null
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [availableStaff, setAvailableStaff] = useState([]); // For assignment board

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Derive selected staff from list to ensure it's always up to date
    const selectedStaff = staff.find(p => p.person_id === selectedStaffId) || null;

    useEffect(() => {
        if (activeView === 'crews') {
            loadCrews();
        } else if (activeView === 'staff') {
            loadStaff();
        }
        // Planning view loads its own data
        // If entering quick assignment mode, we might need to load available staff if not already
    }, [activeView]);

    useEffect(() => {
        if (quickAssignmentMode) {
            loadAssignmentData();
        }
    }, [quickAssignmentMode]);

    // Crews functions
    async function loadCrews() {
        try {
            setLoading(true);
            const data = await CrewService.getCrews();
            setCrews(data || []);
            if (data?.length > 0 && !selectedCrew) {
                loadCrewDetails(data[0].crew_id);
            } else if (data?.length === 0) {
                setLoading(false);
            }
        } catch (err) {
            console.error("Error loading crews:", err);
            setError("No se pudieron cargar las cuadrillas.");
            setLoading(false);
        }
    }

    async function loadCrewDetails(id) {
        try {
            const detail = await CrewService.getCrewById(id);
            setSelectedCrew(detail);

            // Load crew activities
            loadCrewActivities(id);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function loadCrewActivities(crewId) {
        try {
            setLoadingActivities(true);
            const activities = await ActivityService.getActivitiesByCrew(crewId);
            setCrewActivities(activities || []);
        } catch (err) {
            console.error('Error loading crew activities:', err);
        } finally {
            setLoadingActivities(false);
        }
    }

    async function loadAssignmentData() {
        try {
            const staffData = await CrewService.getAvailableStaff();
            setAvailableStaff(staffData);
            // Also refresh crews to get latest member counts/names if needed
            const crewData = await CrewService.getCrews();
            setCrews(crewData);
        } catch (error) {
            console.error("Error loading assignment data:", error);
            setError("Error cargando datos para asignación.");
        }
    }

    const handleCreateCrew = () => {
        setEditingCrew(null);
        setShowCrewModal(true);
    };

    const handleEditCrew = (crew) => {
        setEditingCrew(crew);
        setShowCrewModal(true);
    };

    const handleSaveCrew = async (crewData) => {
        try {
            if (editingCrew) {
                await CrewService.updateCrew(editingCrew.crew_id, crewData);
            } else {
                await CrewService.createCrew(crewData);
            }
            await loadCrews();
            setShowCrewModal(false);
            setEditingCrew(null);
        } catch (error) {
            console.error('Error saving crew:', error);
            // Optionally set error state here to show in UI
        }
    };

    const handleSaveAssignments = async (assignments, removals) => {
        try {
            setLoading(true);
            await CrewService.updateCrewAssignments(assignments, removals);
            setQuickAssignmentMode(false);
            // Reload standard view data
            loadCrews();
            if (selectedCrew) loadCrewDetails(selectedCrew.crew_id);
        } catch (error) {
            console.error("Error saving assignments:", error);
            alert("Error al guardar asignaciones: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Staff functions
    async function loadStaff() {
        try {
            setLoading(true);
            const data = await OperationalStaffService.getOperationalStaff();
            setStaff(data || []);
        } catch (err) {
            console.error("Error loading staff:", err);
            setError("No se pudo cargar el personal.");
        } finally {
            setLoading(false);
        }
    }

    const handleCreateStaff = () => {
        setEditingStaff(null);
        setShowStaffModal(true);
    };

    const handleEditStaff = (person) => {
        setEditingStaff(person);
        setShowStaffModal(true);
    };

    const handleSelectStaff = (person) => {
        setSelectedStaffId(person?.person_id || null);
    };

    if (loading && !quickAssignmentMode && ((activeView === 'crews' && !crews.length) || (activeView === 'staff' && !staff.length))) {
        return <div className="p-8 text-center text-slate-500">Cargando...</div>;
    }
    if (error && !quickAssignmentMode) return <div className="p-8 text-center text-red-500">{error}</div>;

    // Full screen mode for assignment board
    if (quickAssignmentMode) {
        return (
            <CrewAssignmentBoard
                crews={crews}
                staff={availableStaff}
                onSave={handleSaveAssignments}
                onCancel={() => setQuickAssignmentMode(false)}
            />
        );
    }

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Personal Operativo</h1>
                    <p className="text-slate-500 mt-1">Gestión de cuadrillas y personal técnico</p>
                </div>
                {activeView !== 'planning' && (
                    <button
                        onClick={activeView === 'crews' ? handleCreateCrew : handleCreateStaff}
                        className="bg-brand-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all font-medium"
                    >
                        <Plus size={20} />
                        {activeView === 'crews' ? 'Nueva Cuadrilla' : 'Nueva Persona'}
                    </button>
                )}
            </div>

            {/* View Toggles */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveView('crews')}
                    className={`px-4 py-2 font-medium transition-all ${activeView === 'crews'
                        ? 'text-brand-600 border-b-2 border-brand-600'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Users size={18} />
                        Cuadrillas
                    </div>
                </button>
                <button
                    onClick={() => setActiveView('staff')}
                    className={`px-4 py-2 font-medium transition-all ${activeView === 'staff'
                        ? 'text-brand-600 border-b-2 border-brand-600'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <UserCog size={18} />
                        Personal
                    </div>
                </button>
                <button
                    onClick={() => setActiveView('planning')}
                    className={`px-4 py-2 font-medium transition-all ${activeView === 'planning'
                        ? 'text-brand-600 border-b-2 border-brand-600'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Calendar size={18} />
                        Planificación
                    </div>
                </button>
            </div>

            {/* Content based on activeView */}
            {activeView === 'crews' ? (
                <CrewsView
                    crews={crews}
                    selectedCrew={selectedCrew}
                    onSelectCrew={loadCrewDetails}
                    onEditCrew={handleEditCrew}
                    activities={crewActivities}
                    loadingActivities={loadingActivities}
                    onStartQuickAssignment={() => setQuickAssignmentMode(true)}
                />
            ) : activeView === 'staff' ? (
                <StaffView
                    staff={staff}
                    selectedStaff={selectedStaff}
                    onSelectStaff={handleSelectStaff}
                    onEditStaff={handleEditStaff}
                    onUpdate={loadStaff}
                />
            ) : (
                <ActivityPlanning />
            )}

            {/* Modals */}
            {showCrewModal && (
                <CrewModal
                    crew={editingCrew}
                    onClose={() => setShowCrewModal(false)}
                    onSave={handleSaveCrew}
                />
            )}

            <OperationalStaffModal
                isOpen={showStaffModal}
                onClose={() => setShowStaffModal(false)}
                onSave={loadStaff}
                person={editingStaff}
            />
        </div>
    );
}

// Crews View Component (Enhanced with Activities and Timeline)
function CrewsView({ crews, selectedCrew, onSelectCrew, onEditCrew, activities = [], loadingActivities = false, onStartQuickAssignment }) {
    const [activeTab, setActiveTab] = useState('members'); // 'members' | 'activities' | 'timeline'
    const [crewStatusFilter, setCrewStatusFilter] = useState('active');

    const filteredCrews = crews.filter(crew => {
        if (crewStatusFilter === 'active') return crew.active === true;
        if (crewStatusFilter === 'inactive') return crew.active === false;
        return true;
    });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Crew List (Sidebar) */}
            <div className="space-y-4">
                <button
                    onClick={onStartQuickAssignment}
                    className="w-full py-3 px-4 bg-white border border-brand-200 text-brand-700 rounded-xl font-bold hover:bg-brand-50 transition-colors shadow-sm flex items-center justify-center gap-2 mb-2"
                >
                    <LayoutGrid size={20} />
                    Modo Asignación Rápida
                </button>

                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select
                        value={crewStatusFilter}
                        onChange={(e) => setCrewStatusFilter(e.target.value)}
                        className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors appearance-none cursor-pointer"
                    >
                        <option value="all">Todas las Cuadrillas</option>
                        <option value="active">Solo Activas</option>
                        <option value="inactive">Solo Inactivas</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

                {filteredCrews.map(crew => (
                    <div
                        key={crew.crew_id}
                        onClick={() => onSelectCrew(crew.crew_id)}
                        className={`group p-4 rounded-xl border cursor-pointer transition-all relative ${selectedCrew?.crew_id === crew.crew_id
                            ? 'bg-brand-50 border-brand-200 shadow-sm ring-1 ring-brand-200'
                            : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                            }`}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <h3 className={`font-bold ${selectedCrew?.crew_id === crew.crew_id ? 'text-brand-700' : 'text-slate-700'}`}>
                                {crew.name}
                            </h3>
                            {crew.active ? (
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            ) : (
                                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 pr-6">{crew.description || 'Sin descripción'}</p>

                        {/* Edit Button - Visible on Hover */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditCrew(crew);
                            }}
                            className="absolute top-4 right-4 p-1.5 bg-white rounded-lg border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200"
                            title="Editar cuadrilla"
                        >
                            <Edit2 size={14} />
                        </button>
                    </div>
                ))}
                {crews.length === 0 && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-500 text-sm">
                        No hay cuadrillas registradas.
                    </div>
                )}
            </div>

            {/* Crew Details (Main) */}
            <div className="lg:col-span-2 space-y-6">
                {selectedCrew ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-brand-600 shadow-sm text-2xl font-bold border border-slate-100">
                                    {selectedCrew.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">{selectedCrew.name}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${selectedCrew.active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                            {selectedCrew.active ? 'Activa' : 'Inactiva'}
                                        </span>
                                        <span className="text-slate-400 text-sm">•</span>
                                        <span className="text-slate-500 text-sm">{selectedCrew.members?.length || 0} Miembros</span>
                                        <span className="text-slate-400 text-sm">•</span>
                                        <span className="text-slate-500 text-sm">{activities.length} Actividades</span>
                                    </div>
                                </div>
                            </div>
                            <button className="text-slate-400 hover:text-brand-600">
                                <Plus size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 px-6 pt-4 border-b border-slate-100">
                            <button
                                onClick={() => setActiveTab('members')}
                                className={`px-4 py-2 font-medium text-sm transition-all rounded-t-lg ${activeTab === 'members'
                                    ? 'text-brand-600 bg-brand-50 border-b-2 border-brand-500'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                Miembros
                            </button>
                            <button
                                onClick={() => setActiveTab('activities')}
                                className={`px-4 py-2 font-medium text-sm transition-all rounded-t-lg ${activeTab === 'activities'
                                    ? 'text-brand-600 bg-brand-50 border-b-2 border-brand-500'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                Actividades
                            </button>
                            <button
                                onClick={() => setActiveTab('timeline')}
                                className={`px-4 py-2 font-medium text-sm transition-all rounded-t-lg ${activeTab === 'timeline'
                                    ? 'text-brand-600 bg-brand-50 border-b-2 border-brand-500'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                Cronograma
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="p-6 min-h-[400px]">
                            {activeTab === 'members' && (
                                <CrewMembersList
                                    members={selectedCrew.members || []}
                                    crewId={selectedCrew.crew_id}
                                    crewName={selectedCrew.name}
                                    onUpdate={() => onSelectCrew(selectedCrew.crew_id)} // Trigger reload
                                />
                            )}

                            {activeTab === 'activities' && (
                                <CrewActivitiesPanel
                                    activities={activities}
                                    loading={loadingActivities}
                                />
                            )}

                            {activeTab === 'timeline' && (
                                <CrewTimeline
                                    activities={activities}
                                    loading={loadingActivities}
                                />
                            )}
                        </div>

                        {/* Crew Signature */}
                        <CrewSignatureEditor 
                            crew={selectedCrew} 
                            onUpdated={(updatedCrew) => {
                                onSelectCrew(selectedCrew.crew_id); // reload crew details
                            }} 
                        />
                    </div>
                ) : (
                    <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 h-96 flex flex-col items-center justify-center text-slate-400">
                        <Users size={48} className="mb-4 opacity-50" />
                        <p>Selecciona una cuadrilla para ver sus detalles</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Sub-component for Member List with Actions
function CrewMembersList({ members, crewId, crewName, onUpdate }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [removingId, setRemovingId] = useState(null);

    const handleAddClick = () => {
        setEditingMember(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (member) => {
        setEditingMember(member);
        setIsModalOpen(true);
    };

    const handleRemoveClick = async (member) => {
        if (window.confirm(`¿Estás seguro de quitar a ${member.name} de la cuadrilla ${crewName}?`)) {
            setRemovingId(member.crew_member_id);
            try {
                await CrewService.removeMember(member.crew_member_id);
                onUpdate();
            } catch (error) {
                console.error("Error removing member:", error);
                alert("Error al quitar miembro: " + error.message);
            } finally {
                setRemovingId(null);
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Miembros del Equipo</h3>
                <button
                    onClick={handleAddClick}
                    className="flex items-center gap-2 px-3 py-1.5 bg-brand-100 text-brand-700 hover:bg-brand-200 rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus size={16} />
                    Agregar
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {members.map((member, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-all group">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                            {member.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 truncate">{member.name}</h4>
                            <p className="text-sm text-brand-600 font-medium">{member.role}</p>
                            <p className="text-xs text-slate-400 mt-1">
                                Desde: {new Date(member.start_date).toLocaleDateString()}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => handleEditClick(member)}
                                className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                title="Editar Rol"
                            >
                                <Edit2 size={14} />
                            </button>
                            <button
                                onClick={() => handleRemoveClick(member)}
                                disabled={removingId === member.crew_member_id}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Quitar de Cuadrilla"
                            >
                                {/* Loading spinner for remove action if needed, currently using alert interaction blocking */}
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}

                {members.length === 0 && (
                    <div className="col-span-full py-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                        No hay miembros asignados a esta cuadrilla.
                    </div>
                )}
            </div>

            {/* Member Modal */}
            <CrewMemberModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={onUpdate}
                crew={{ crew_id: crewId, name: crewName }}
                member={editingMember}
            />
        </div>
    );
}


// Staff View Component
function StaffView({ staff, selectedStaff, onSelectStaff, onUpdate, onEditStaff }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('Todos');
    const [currentPage, setCurrentPage] = useState(1);
    const [deletingId, setDeletingId] = useState(null);
    const [showBoxModal, setShowBoxModal] = useState(false);
    const [selectedBox, setSelectedBox] = useState(null);
    const itemsPerPage = 6;

    // Filter staff based on search and role
    const filteredStaff = staff.filter(person => {
        const matchesSearch = (
            person.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            person.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            person.document_id?.includes(searchTerm)
        );
        const matchesRole = roleFilter === 'Todos' || person.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
    const paginatedStaff = filteredStaff.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, roleFilter]);


    // Role badge colors
    const getRoleBadge = (role) => {
        const colors = {
            'Tecnico': 'bg-brand-100 text-brand-700 border-brand-200',
            'Ingeniero': 'bg-purple-100 text-purple-700 border-purple-200',
            'Operario': 'bg-green-100 text-green-700 border-green-200',
            'Supervisor': 'bg-orange-100 text-orange-700 border-orange-200'
        };
        return colors[role] || 'bg-slate-100 text-slate-700 border-slate-200';
    };

    const handleDeleteClick = async (person, e) => {
        e.stopPropagation();
        if (window.confirm(`¿Estás seguro de eliminar a ${person.first_name} ${person.last_name}?`)) {
            setDeletingId(person.person_id);
            try {
                await OperationalStaffService.deleteStaffMember(person.person_id);
                // If the deleted person was selected, deselect them
                if (selectedStaff?.person_id === person.person_id) {
                    onSelectStaff(null);
                }
                onUpdate();
            } catch (error) {
                console.error("Error deleting staff:", error);
                alert("Error al eliminar personal: " + error.message);
            } finally {
                setDeletingId(null);
            }
        }
    };

    const handleOpenBoxManager = async (person) => {
        try {
            let box = await SupplyBoxService.getBoxByPersonId(person.person_id);
            if (!box) {
                // Auto-create box if missing
                const { data } = await supabase
                    .from('supply_box')
                    .insert({ person_id: person.person_id, label: `${person.first_name} ${person.last_name}` })
                    .select().single();
                box = data;
            }
            setSelectedBox(box);
            setShowBoxModal(true);
        } catch (err) {
            console.error(err);
            alert('Error al abrir caja: ' + err.message);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Staff List (Sidebar) */}
            <div className="space-y-4">
                {/* Search and Filters */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar por nombre o cédula..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                        />
                        <Users className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {['Todos', 'Administrador', 'Conductor', 'Gestor Social', 'Ingeniero', 'Ingeniero Lider', 'Lider de equipo de seguridad', 'Lider de equipo social', 'Lider logística', 'Operario', 'SISO', 'Supervisor', 'Tecnico', 'Tecnologo'].map(role => (
                            <button
                                key={role}
                                onClick={() => setRoleFilter(role)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${roleFilter === role
                                    ? 'bg-brand-100 text-brand-700 border border-brand-200'
                                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                            >
                                {role}
                            </button>
                        ))}
                    </div>
                </div>

                {paginatedStaff.map(person => (
                    <div
                        key={person.person_id}
                        onClick={() => onSelectStaff(person)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all group ${selectedStaff?.person_id === person.person_id
                            ? 'bg-brand-50 border-brand-200 shadow-sm ring-1 ring-brand-200'
                            : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                            }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                                {person.first_name?.[0]}{person.last_name?.[0]}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-800">{person.first_name} {person.last_name}</h3>
                                <p className="text-xs text-slate-500">{person.document_id || 'Sin cédula'}</p>
                            </div>
                            {/* Availability Status Indicator */}
                            <div className="flex items-center gap-1">
                                <Circle
                                    size={10}
                                    className={`${person.crews?.length === 0 || !person.crews
                                        ? 'fill-green-500 text-green-500'
                                        : person.crews.length === 1
                                            ? 'fill-yellow-500 text-yellow-500'
                                            : 'fill-red-500 text-red-500'
                                        }`}
                                    title={
                                        person.crews?.length === 0 || !person.crews
                                            ? 'Disponible'
                                            : person.crews.length === 1
                                                ? 'Parcialmente asignado'
                                                : 'Completamente asignado'
                                    }
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getRoleBadge(person.role)}`}>
                                    {person.role}
                                </span>
                                {person.primaryCrew && (
                                    <span className="px-2 py-0.5 rounded text-xs bg-brand-50 text-brand-700 border border-brand-200">
                                        {person.primaryCrew}
                                    </span>
                                )}
                            </div>

                            {/* Action Buttons (Visible on hover or selected) */}
                            <div className={`flex gap-1 ${selectedStaff?.person_id === person.person_id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEditStaff(person);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                    title="Editar"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={(e) => handleDeleteClick(person, e)}
                                    disabled={deletingId === person.person_id}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredStaff.length === 0 && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-500 text-sm">
                        {staff.length === 0 ? 'No hay personal registrado.' : 'No se encontraron resultados.'}
                    </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            Anterior
                        </button>
                        <span className="px-3 py-1 text-sm text-slate-600 flex items-center">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            Siguiente
                        </button>
                    </div>
                )}
            </div>

            {/* Staff Details (Main) */}
            <div className="lg:col-span-2">
                {selectedStaff ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        {/* Staff Header */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-brand-600 shadow-sm text-2xl font-bold border border-slate-100">
                                        {selectedStaff.first_name?.[0]}{selectedStaff.last_name?.[0]}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">{selectedStaff.first_name} {selectedStaff.last_name}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${getRoleBadge(selectedStaff.role)}`}>
                                                {selectedStaff.role}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEditStaff(selectedStaff);
                                        }}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-200 rounded-lg text-sm font-medium transition-colors shadow-sm"
                                    >
                                        <Edit2 size={16} />
                                        Editar
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteClick(selectedStaff, e)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 rounded-lg text-sm font-medium transition-colors shadow-sm"
                                    >
                                        <Trash2 size={16} />
                                        Eliminar
                                    </button>
                                    {['Ingeniero Lider', 'Supervisor'].includes(selectedStaff.role) && (
                                        <PermissionGate module="inventario" action="update">
                                            <button
                                                onClick={() => handleOpenBoxManager(selectedStaff)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 rounded-lg text-sm font-medium transition-colors shadow-sm"
                                            >
                                                <Package size={16} />
                                                Gestionar Caja
                                            </button>
                                        </PermissionGate>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                                <div>
                                    <p className="text-slate-500">Cédula</p>
                                    <p className="font-medium text-slate-900">{selectedStaff.document_id || 'No registrada'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Teléfono</p>
                                    <p className="font-medium text-slate-900">{selectedStaff.phone || 'No registrado'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Email</p>
                                    <p className="font-medium text-slate-900">{selectedStaff.email || 'No registrado'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Especialidad</p>
                                    <p className="font-medium text-slate-900">{selectedStaff.specialty || 'No registrada'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Crew Assignments */}
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Asignaciones a Cuadrillas</h3>
                                {/* Assignment button removed as requested */}
                            </div>
                            <div className="space-y-3">
                                {selectedStaff.crews && selectedStaff.crews.length > 0 ? (
                                    selectedStaff.crews.map(crew => (
                                        <div key={crew.crewMemberId} className="p-3 rounded-xl border border-slate-100 bg-slate-50">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-slate-800">{crew.crewName}</p>
                                                    <p className="text-xs text-slate-500">Como {crew.roleInCrew}</p>
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        Desde: {new Date(crew.startDate).toLocaleDateString()}
                                                        {crew.endDate && ` hasta ${new Date(crew.endDate).toLocaleDateString()}`}
                                                    </p>
                                                </div>
                                                {!crew.endDate && (
                                                    <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">
                                                        Activo
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        No está asignado a ninguna cuadrilla.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Supply Box Section - for Ingeniero Lider / Supervisor */}
                        {['Ingeniero Lider', 'Supervisor'].includes(selectedStaff.role) && (
                            <div className="p-6 border-t border-slate-100">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Package size={16} /> Caja de Suministros
                                </h3>
                                <SupplyBoxPanel personId={selectedStaff.person_id} canReport={false} />
                            </div>
                        )}

                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center p-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        Selecciona una persona para ver detalles.
                    </div>
                )}
            </div>

            {/* Supply Box Manager Modal */}
            {showBoxModal && selectedBox && (
                <SupplyBoxManagerModal
                    box={selectedBox}
                    onClose={() => setShowBoxModal(false)}
                    onComplete={() => { /* triggers refresh via React re-render */ }}
                />
            )}
        </div>
    );
}
