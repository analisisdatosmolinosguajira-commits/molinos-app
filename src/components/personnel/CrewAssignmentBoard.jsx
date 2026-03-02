import React, { useState, useEffect, useMemo } from 'react';
import { Users, Save, X, RotateCcw, User, GripVertical, UserCheck, Search, Filter } from 'lucide-react';

export default function CrewAssignmentBoard({ crews, staff, onSave, onCancel }) {
    // assignments: { [personId]: { crewId, role, crewMemberId (if existing) } }

    // Derived state for the board
    // We need to know where each person is currently placed on the board.
    const [boardState, setBoardState] = useState({
        unassigned: [],
        crews: {} // crewId -> [persons]
    });

    const [draggedItem, setDraggedItem] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [crewStatusFilter, setCrewStatusFilter] = useState('active');

    // Initialize board state from props
    useEffect(() => {
        if (crews.length > 0 && staff.length > 0) {
            initializeBoard();
        }
    }, [crews, staff]);

    const initializeBoard = () => {
        const initialCrews = {};
        crews.forEach(c => {
            initialCrews[c.crew_id] = [];
        });

        const initialUnassigned = [];

        staff.forEach(person => {
            if (person.currentCrewId && initialCrews[person.currentCrewId]) {
                initialCrews[person.currentCrewId].push(person);
            } else {
                initialUnassigned.push(person);
            }
        });

        setBoardState({
            unassigned: initialUnassigned,
            crews: initialCrews
        });
        setHasChanges(false);
    };

    // Extract unique roles from staff for the filter
    const availableRoles = useMemo(() => {
        const roles = new Set(staff.map(p => p.role).filter(Boolean));
        return Array.from(roles).sort();
    }, [staff]);

    // Filter unassigned staff
    const filteredUnassigned = useMemo(() => {
        return boardState.unassigned.filter(person => {
            const fullName = `${person.first_name || ''} ${person.last_name || ''}`.toLowerCase();
            const matchesSearch = fullName.includes(searchTerm.toLowerCase());
            const matchesRole = roleFilter === 'all' || person.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [boardState.unassigned, searchTerm, roleFilter]);

    const handleDragStart = (e, person, sourceId) => {
        setDraggedItem({ person, sourceId }); // sourceId = 'unassigned' or crewId
        e.dataTransfer.effectAllowed = 'move';
        // Transparent drag image or default
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetId) => {
        e.preventDefault();
        if (!draggedItem) return;

        const { person, sourceId } = draggedItem;

        // If dropped in same place, do nothing
        if (String(sourceId) === String(targetId)) {
            setDraggedItem(null);
            return;
        }

        // Logic to move item
        setBoardState(prev => {
            const newState = {
                unassigned: [...prev.unassigned],
                crews: { ...prev.crews }
            };

            const personIdStr = String(person.person_id);

            // Remove from source
            if (String(sourceId) === 'unassigned') {
                newState.unassigned = newState.unassigned.filter(p => String(p.person_id) !== personIdStr);
            } else {
                const sId = String(sourceId);
                // Find the key that matches the sourceId
                const crewKey = Object.keys(newState.crews).find(k => String(k) === sId);
                if (crewKey && newState.crews[crewKey]) {
                    newState.crews[crewKey] = newState.crews[crewKey].filter(p => String(p.person_id) !== personIdStr);
                }
            }

            // Add to target
            if (String(targetId) === 'unassigned') {
                // Check if already exists
                if (!newState.unassigned.some(p => String(p.person_id) === personIdStr)) {
                    newState.unassigned.push(person);
                }
            } else {
                const tId = String(targetId);
                let crewKey = Object.keys(newState.crews).find(k => String(k) === tId);

                if (!crewKey) {
                    crewKey = tId;
                    newState.crews[crewKey] = [];
                }

                if (!newState.crews[crewKey].some(p => String(p.person_id) === personIdStr)) {
                    newState.crews[crewKey].push(person);
                }
            }

            return newState;
        });

        setHasChanges(true);
        setDraggedItem(null);
    };

    const handleReset = () => {
        if (window.confirm('¿Estás seguro de restablecer todas las asignaciones a su estado original?')) {
            initializeBoard();
            setSearchTerm('');
            setRoleFilter('all');
        }
    };

    const handleClearAll = () => {
        if (window.confirm('¿Estás seguro de desasignar a TODOS los miembros de todas las cuadrillas?')) {
            setBoardState(prev => {
                // Flatten all people into unassigned
                const allPeople = [...prev.unassigned];
                Object.values(prev.crews).forEach(crewMembers => {
                    allPeople.push(...crewMembers);
                });

                // Clear crews
                const emptyCrews = {};
                Object.keys(prev.crews).forEach(key => emptyCrews[key] = []);

                return {
                    unassigned: allPeople,
                    crews: emptyCrews
                };
            });
            setHasChanges(true);
        }
    };

    const handleSaveClick = () => {
        // Calculate diffs
        const newAssignments = [];
        const idsToRemove = [];

        // 1. Check current crews
        Object.entries(boardState.crews).forEach(([crewId, members]) => {
            members.forEach(p => {
                const numericCrewId = parseInt(crewId);
                // If person was not in this crew originally OR just to be safe, update assignment
                if (p.currentCrewId !== numericCrewId) {
                    newAssignments.push({
                        personId: p.person_id,
                        crewId: numericCrewId,
                        role: p.role // Keep default role
                    });
                }
            });
        });

        // 2. Check unassigned for removals
        boardState.unassigned.forEach(p => {
            // If they had a crew assignment originally, we need to remove it.
            if (p.currentCrewId && p.crewMemberId) {
                idsToRemove.push(p.crewMemberId);
            }
        });

        onSave(newAssignments, idsToRemove);
    };

    return (
        <div className="space-y-6 animate-fade-in h-screen flex flex-col bg-slate-50 fixed top-0 right-0 bottom-0 left-0 lg:left-64 z-[100] overflow-hidden font-sans">
            {/* Toolbar */}
            <div className="bg-white/80 backdrop-blur-xl p-4 px-6 shadow-sm border-b border-slate-200 flex justify-between items-center shrink-0 z-20">
                <div className="flex items-center gap-5">
                    <div className="p-3 bg-slate-900 rounded-xl text-white shadow-xl shadow-slate-900/20">
                        <Users size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Asignación de Cuadrillas</h2>
                        <p className="text-sm text-slate-500 font-medium">Arrastra tarjetas para organizar los equipos operativos</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleReset}
                        className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium flex items-center gap-2 transition-all border border-transparent hover:border-slate-200"
                        title="Volver al estado inicial"
                    >
                        <RotateCcw size={18} />
                        Restablecer
                    </button>
                    <button
                        onClick={handleClearAll}
                        className="px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg font-medium flex items-center gap-2 transition-all border border-transparent hover:border-red-100"
                        title="Mover todos a Sin Asignar"
                    >
                        <X size={18} />
                        Vaciar Todo
                    </button>
                    <div className="h-10 w-px bg-slate-200 mx-2"></div>
                    <button
                        onClick={onCancel}
                        className="px-5 py-2.5 text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSaveClick}
                        disabled={!hasChanges}
                        className="px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-xl shadow-brand-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Save size={20} />
                        Guardar Cambios
                    </button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 lg:grid-rows-[1fr] gap-0 min-h-0 bg-slate-100 overflow-y-auto lg:overflow-hidden">
                {/* Left Column: Unassigned Staff - Darker Contrast Sidebar */}
                <div
                    className="lg:col-span-1 flex flex-col bg-slate-50 border-r border-slate-200 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10 lg:h-full lg:overflow-hidden"
                    onDragOver={(e) => handleDragOver(e)}
                    onDrop={(e) => handleDrop(e, 'unassigned')}
                >
                    <div className="p-5 border-b border-slate-200 bg-slate-50 sticky top-0 z-10 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 text-lg">Personal Disponible</h3>
                            <span className="bg-white text-slate-700 px-3 py-1 rounded-full text-xs font-bold border border-slate-200 shadow-sm">
                                {filteredUnassigned.length}
                            </span>
                        </div>

                        {/* Search & Filter Controls */}
                        <div className="space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all font-medium"
                                />
                            </div>

                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all font-medium appearance-none cursor-pointer"
                                >
                                    <option value="all">Todos los Roles</option>
                                    {availableRoles.map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-100/50 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                        {filteredUnassigned.length === 0 && (
                            <div className="h-40 flex flex-col items-center justify-center text-center p-6 text-slate-400 border-2 border-dashed border-slate-300 rounded-2xl m-2 bg-slate-50/50">
                                {searchTerm || roleFilter !== 'all' ? (
                                    <>
                                        <Search size={32} className="mb-2 opacity-50" />
                                        <p className="text-sm font-medium">No hay resultados</p>
                                        <p className="text-xs mt-1">Intenta con otros filtros</p>
                                    </>
                                ) : (
                                    <>
                                        <Users size={32} className="mb-2 opacity-50" />
                                        <p className="text-sm font-medium">Todo el personal asignado</p>
                                    </>
                                )}
                            </div>
                        )}
                        {filteredUnassigned.map(person => (
                            <DraggableCard
                                key={person.person_id}
                                person={person}
                                sourceId="unassigned"
                                onDragStart={handleDragStart}
                                variant="sidebar"
                            />
                        ))}
                    </div>
                </div>

                {/* Right Column: Crews Grid */}
                <div className="lg:col-span-3 lg:overflow-y-auto bg-slate-200/50 lg:h-full flex flex-col">
                    {/* Crews Header & Filter */}
                    <div className="p-4 px-6 border-b border-slate-200/50 flex justify-between items-center bg-slate-100/50 sticky top-0 z-10">
                        <h3 className="font-bold text-slate-800">Cuadrillas</h3>
                        <div className="w-48 relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select
                                value={crewStatusFilter}
                                onChange={(e) => setCrewStatusFilter(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all font-medium appearance-none cursor-pointer"
                            >
                                <option value="all">Todos los estados</option>
                                <option value="active">Activas</option>
                                <option value="inactive">Inactivas</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
                            {crews
                                .filter(crew => {
                                    if (crewStatusFilter === 'active') return crew.active === true;
                                    if (crewStatusFilter === 'inactive') return crew.active === false;
                                    return true;
                                })
                                .map(crew => (
                                    <div
                                        key={crew.crew_id}
                                        className={`flex flex-col bg-white rounded-2xl transition-all duration-200 overflow-hidden ${draggedItem && String(draggedItem.sourceId) !== String(crew.crew_id)
                                            ? 'border-2 border-brand-400 ring-4 ring-brand-100 shadow-2xl scale-[1.02] z-10'
                                            : 'border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300'
                                            }`}
                                        onDragOver={(e) => handleDragOver(e)}
                                        onDrop={(e) => handleDrop(e, crew.crew_id)}
                                    >
                                        <div className={`p-4 border-b flex justify-between items-center ${crew.active ? 'bg-white' : 'bg-slate-50 border-slate-100'}`}>
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-base">{crew.name}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${crew.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${crew.active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                                        {crew.active ? 'Activa' : 'Inactiva'}
                                                    </div>
                                                    <span className="text-xs text-slate-400 font-medium">{boardState.crews[crew.crew_id]?.length || 0} miembros</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 p-3 space-y-2 min-h-[180px] bg-slate-50/50">
                                            {boardState.crews[crew.crew_id]?.length === 0 && (
                                                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white/50 m-1 p-6 transition-colors hover:border-brand-300 hover:bg-brand-50/20 group">
                                                    <div className="p-3 bg-slate-100 rounded-full mb-3 group-hover:bg-brand-100 transition-colors">
                                                        <Users size={20} className="text-slate-400 group-hover:text-brand-500" />
                                                    </div>
                                                    <p className="font-medium opacity-70">Arrastra personal aquí</p>
                                                </div>
                                            )}
                                            {boardState.crews[crew.crew_id]?.map(person => (
                                                <DraggableCard
                                                    key={person.person_id}
                                                    person={person}
                                                    sourceId={crew.crew_id}
                                                    onDragStart={handleDragStart}
                                                    variant="crew"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DraggableCard({ person, sourceId, onDragStart, variant = 'crew' }) {
    const isSidebar = variant === 'sidebar';

    // Role configurations for badging
    const getRoleStyle = (role) => {
        const r = (role || '').toLowerCase();
        if (r.includes('lider') || r.includes('líder')) return 'bg-brand-100 text-brand-800 border-brand-200';
        if (r.includes('ingeniero')) return 'bg-brand-100 text-brand-800 border-brand-200';
        if (r.includes('supervisor')) return 'bg-violet-100 text-violet-800 border-violet-200';
        if (r.includes('siso')) return 'bg-brand-100 text-brand-800 border-brand-200';
        return 'bg-slate-100 text-slate-700 border-slate-200';
    };

    return (
        <div
            draggable="true"
            onDragStart={(e) => onDragStart(e, person, sourceId)}
            className={`
                group relative flex items-start gap-3 p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none
                ${isSidebar
                    ? 'bg-white border-slate-200 hover:border-brand-400 hover:shadow-lg hover:-translate-y-0.5'
                    : 'bg-white border-slate-200 shadow-sm hover:border-brand-400 hover:shadow-lg hover:-translate-y-0.5'
                }
            `}
        >
            <div className={`mt-1.5 transition-colors ${isSidebar ? 'text-slate-300 group-hover:text-brand-500' : 'text-slate-300 group-hover:text-brand-500'}`}>
                <GripVertical size={16} />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-900 text-sm leading-tight truncate pr-2">
                        {person.first_name} {person.last_name}
                    </h4>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold truncate max-w-full uppercase tracking-tight ${getRoleStyle(person.role)}`}>
                        {person.role || 'Técnico'}
                    </span>
                </div>
            </div>
        </div>
    );
}
