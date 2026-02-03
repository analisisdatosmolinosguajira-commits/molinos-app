import React, { useState, useEffect } from 'react';
import { Users, Plus, Shield, Wrench, UserCheck, Briefcase, UserCog } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { CrewService } from '../../services/crews';
import { OperationalStaffService } from '../../services/operationalStaff';

export default function PersonnelPage() {
    // View state: 'crews' | 'staff'
    const [activeView, setActiveView] = useState('crews');

    // Crews state
    const [crews, setCrews] = useState([]);
    const [selectedCrew, setSelectedCrew] = useState(null);

    // Staff state
    const [staff, setStaff] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (activeView === 'crews') {
            loadCrews();
        } else {
            loadStaff();
        }
    }, [activeView]);

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
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

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

    if (loading && ((activeView === 'crews' && !crews.length) || (activeView === 'staff' && !staff.length))) {
        return <div className="p-8 text-center text-slate-500">Cargando...</div>;
    }
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Personal Operativo</h1>
                    <p className="text-slate-500 mt-1">Gestión de cuadrillas y personal técnico</p>
                </div>
                <button className="bg-brand-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all font-medium">
                    <Plus size={20} />
                    {activeView === 'crews' ? 'Nueva Cuadrilla' : 'Nueva Persona'}
                </button>
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
            </div>

            {/* Content based on activeView */}
            {activeView === 'crews' ? (
                <CrewsView
                    crews={crews}
                    selectedCrew={selectedCrew}
                    onSelectCrew={loadCrewDetails}
                />
            ) : (
                <StaffView
                    staff={staff}
                    selectedStaff={selectedStaff}
                    onSelectStaff={setSelectedStaff}
                />
            )}
        </div>
    );
}

// Crews View Component (Existing functionality)
function CrewsView({ crews, selectedCrew, onSelectCrew }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Crew List (Sidebar) */}
            <div className="space-y-4">
                {crews.map(crew => (
                    <div
                        key={crew.crew_id}
                        onClick={() => onSelectCrew(crew.crew_id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedCrew?.crew_id === crew.crew_id
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
                        <p className="text-xs text-slate-500 line-clamp-2">{crew.description || 'Sin descripción'}</p>
                    </div>
                ))}
                {crews.length === 0 && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-500 text-sm">
                        No hay cuadrillas registradas.
                    </div>
                )}
            </div>

            {/* Crew Details (Main) */}
            <div className="lg:col-span-2">
                {selectedCrew ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        {/* Crew Header */}
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
                                    </div>
                                </div>
                            </div>
                            <button className="text-slate-400 hover:text-brand-600">
                                <Plus size={20} />
                            </button>
                        </div>

                        {/* Members List */}
                        <div className="p-6">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Miembros del Equipo</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedCrew.members && selectedCrew.members.length > 0 ? (
                                    selectedCrew.members.map(member => (
                                        <div key={member.crew_member_id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                                <UserCheck size={18} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{member.name || `Miembro #${member.crew_member_id}`}</p>
                                                <p className="text-xs text-slate-500 capitalize">{member.role || 'Técnico'}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-2 text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        No hay técnicos asignados a esta cuadrilla.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center p-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        Selecciona una cuadrilla para ver detalles.
                    </div>
                )}
            </div>
        </div>
    );
}

// Staff View Component (New)
function StaffView({ staff, selectedStaff, onSelectStaff }) {
    // Role badge colors
    const getRoleBadge = (role) => {
        const colors = {
            'Tecnico': 'bg-blue-100 text-blue-700 border-blue-200',
            'Ingeniero': 'bg-purple-100 text-purple-700 border-purple-200',
            'Operario': 'bg-green-100 text-green-700 border-green-200',
            'Supervisor': 'bg-orange-100 text-orange-700 border-orange-200'
        };
        return colors[role] || 'bg-slate-100 text-slate-700 border-slate-200';
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Staff List (Sidebar) */}
            <div className="space-y-4">
                {staff.map(person => (
                    <div
                        key={person.person_id}
                        onClick={() => onSelectStaff(person)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedStaff?.person_id === person.person_id
                            ? 'bg-brand-50 border-brand-200 shadow-sm ring-1 ring-brand-200'
                            : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                            }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                                {person.first_name?.[0]}{person.last_name?.[0]}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">{person.first_name} {person.last_name}</h3>
                                <p className="text-xs text-slate-500">{person.document_id || 'Sin cédula'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getRoleBadge(person.role)}`}>
                                {person.role}
                            </span>
                            {person.primaryCrew && (
                                <span className="px-2 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {person.primaryCrew}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
                {staff.length === 0 && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-500 text-sm">
                        No hay personal registrado.
                    </div>
                )}
            </div>

            {/* Staff Details (Main) */}
            <div className="lg:col-span-2">
                {selectedStaff ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        {/* Staff Header */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
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
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500">Cédula</p>
                                    <p className="font-medium text-slate-900">{selectedStaff.document_id || 'No registrada'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Teléfono</p>
                                    <p className="font-medium text-slate-900">{selectedStaff.phone || 'No registrado'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Crew Assignments */}
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Asignaciones a Cuadrillas</h3>
                                <button className="text-brand-600 hover:text-brand-700 text-sm font-medium">
                                    + Asignar
                                </button>
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

                        {/* Actions */}
                        <div className="p-6 border-t border-slate-100 flex gap-3">
                            <button className="flex-1 bg-brand-600 text-white px-4 py-2 rounded-xl hover:bg-brand-700 font-medium">
                                Editar Datos
                            </button>
                            <button className="px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-medium">
                                Eliminar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center p-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        Selecciona una persona para ver detalles.
                    </div>
                )}
            </div>
        </div>
    );
}
