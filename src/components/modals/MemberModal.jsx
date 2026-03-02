import React, { useState, useEffect } from 'react';
import { X, Search, User, Check, Loader, Plus } from 'lucide-react';
import { CommunityService } from '../../services/communities';
import CreatePersonModal from './CreatePersonModal';

const MemberModal = ({ isOpen, onClose, onSave, initialMember = null }) => {
    const [step, setStep] = useState(initialMember ? 2 : 1); // 1: Select Person, 2: Select Role
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedPerson, setSelectedPerson] = useState(initialMember ? {
        id: initialMember.personId,
        name: initialMember.name,
        document_id: ''
    } : null);

    // Roles now fetched from DB
    const [availableRoles, setAvailableRoles] = useState([]);
    const [selectedRole, setSelectedRole] = useState(initialMember?.roleId || initialMember?.role || null);

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, saving, error

    // Create Person Modal State
    const [isCreatePersonOpen, setCreatePersonOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadRoles();
            if (!initialMember) {
                resetForm();
            } else {
                setStep(2);
                setSelectedPerson({
                    id: initialMember.personId,
                    name: initialMember.name
                });
                // Assuming initialMember.role might be ID or Name. 
                // Best if we pass ID, but handles name match too if needed.
                // Logic below in loadRoles will help if we only really pass IDs now.
                setSelectedRole(initialMember.roleId);
            }
        }
    }, [isOpen, initialMember]);

    const loadRoles = async () => {
        try {
            const roles = await CommunityService.getRoles();
            setAvailableRoles(roles);
            // Auto Select first if not editing
            if (!initialMember && roles.length > 0) {
                setSelectedRole(roles[0].role_id);
            }
        } catch (e) {
            console.error("Failed to load roles", e);
        }
    };

    const resetForm = () => {
        setStep(1);
        setSearchQuery("");
        setSearchResults([]);
        setSelectedPerson(null);
        setSelectedRole(null);
        setStatus('idle');
    };

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (step === 1) {
                if (searchQuery.length >= 2) {
                    setLoading(true);
                    try {
                        const results = await CommunityService.searchPeople(searchQuery);
                        setSearchResults(results);
                    } catch (error) {
                        console.error(error);
                    } finally {
                        setLoading(false);
                    }
                } else if (searchQuery.length === 0) {
                    // Load unassigned people by default
                    setLoading(true);
                    try {
                        const results = await CommunityService.getUnassignedPeople();
                        setSearchResults(results);
                    } catch (error) {
                        console.error(error);
                    } finally {
                        setLoading(false);
                    }
                } else {
                    // 1 char - too short for search, not empty for default
                    setSearchResults([]);
                }
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, step]);

    const handleSave = async () => {
        if (!selectedPerson || !selectedRole) return;

        setStatus('saving');
        try {
            await onSave(selectedPerson.id || selectedPerson.person_id, selectedRole);
            onClose();
        } catch (error) {
            console.error("Error saving member:", error);
            setStatus('error');
        } finally {
            if (status !== 'error') setStatus('idle');
        }
    };

    const handlePersonCreated = (newPerson) => {
        // Callback from CreatePersonModal
        setSelectedPerson(newPerson);
        setStep(2); // Move to role selection
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-800 text-lg">
                        {initialMember ? 'Editar Rol' : 'Agregar Miembro'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Step 1: Select Person (Only for New) */}
                    {!initialMember && step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Buscar Persona</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Nombre o Cédula..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="min-h-[200px] max-h-[300px] overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl bg-slate-50 relative">
                                {loading ? (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                        <Loader className="animate-spin" />
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    <div className="divide-y divide-slate-100">
                                        {searchQuery.length === 0 && (
                                            <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                                Personas sin comunidad asignada
                                            </div>
                                        )}
                                        {searchResults.map(person => (
                                            <button
                                                key={person.person_id}
                                                onClick={() => {
                                                    setSelectedPerson(person);
                                                    setStep(2);
                                                }}
                                                className="w-full text-left p-3 hover:bg-white transition-colors flex items-center gap-3 group"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs group-hover:bg-brand-100 group-hover:text-brand-600 transition-colors">
                                                    {person.first_name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-700 text-sm group-hover:text-brand-700">{person.first_name} {person.last_name}</p>
                                                    <p className="text-xs text-slate-400 font-mono">{person.document_id}</p>
                                                </div>
                                                <ChevronRight className="ml-auto text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" size={16} />
                                            </button>
                                        ))}
                                    </div>
                                ) : searchQuery.length >= 2 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                                        <p className="text-sm text-slate-500 mb-3">No encontramos a esa persona.</p>
                                        <button
                                            onClick={() => setCreatePersonOpen(true)}
                                            className="flex items-center gap-2 text-brand-600 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                                        >
                                            <Plus size={16} /> Crear Nueva Persona
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-400 text-sm opacity-60">
                                        Escribe para buscar...
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Select Role */}
                    {step === 2 && selectedPerson && (
                        <div className="space-y-6">
                            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold">
                                    <User size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-brand-500 font-bold uppercase tracking-wider">Persona Seleccionada</p>
                                    <p className="font-bold text-brand-900">{selectedPerson.name || `${selectedPerson.first_name} ${selectedPerson.last_name}`}</p>
                                </div>
                                {!initialMember && (
                                    <button
                                        onClick={() => setStep(1)}
                                        className="ml-auto text-xs text-brand-400 hover:text-brand-600 underline"
                                    >
                                        Cambiar
                                    </button>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-3">Asignar Rol en la Comunidad</label>
                                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                    {availableRoles.map(role => (
                                        <button
                                            key={role.role_id}
                                            onClick={() => setSelectedRole(role.role_id)}
                                            className={`p-3 rounded-xl border text-sm font-medium transition-all text-left flex justify-between items-center
                                                ${selectedRole === role.role_id
                                                    ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-500/20'
                                                    : 'border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50'}
                                            `}
                                        >
                                            {role.name}
                                            {selectedRole === role.role_id && <Check size={16} className="text-brand-600" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    {!initialMember && step === 2 ? (
                        <button
                            onClick={() => setStep(1)}
                            className="text-slate-500 hover:text-slate-700 text-sm font-medium px-4 py-2"
                        >
                            Atrás
                        </button>
                    ) : (
                        <div />
                    )}

                    {step === 2 && (
                        <button
                            onClick={handleSave}
                            disabled={!selectedRole || status === 'saving'}
                            className={`bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2`}
                        >
                            {status === 'saving' && <Loader size={16} className="animate-spin" />}
                            {initialMember ? 'Guardar Cambios' : 'Confirmar & Asignar'}
                        </button>
                    )}
                </div>

                {/* Nested Modal: Create Person */}
                <CreatePersonModal
                    isOpen={isCreatePersonOpen}
                    onClose={() => setCreatePersonOpen(false)}
                    onSave={async (data) => {
                        const newPerson = await CommunityService.createPerson(data);
                        handlePersonCreated(newPerson);
                    }}
                />
            </div>
        </div>
    );
};

// Start Icon helper
function ChevronRight(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m9 18 6-6-6-6" />
        </svg>
    )
}

export default MemberModal;
