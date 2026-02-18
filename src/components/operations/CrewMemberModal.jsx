import React, { useState, useEffect } from 'react';
import { X, Search, User, AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { CrewService } from '../../services/crews';
import { OperationalStaffService } from '../../services/operationalStaff';

export default function CrewMemberModal({ isOpen, onClose, onSave, crew, member = null }) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [availableStaff, setAvailableStaff] = useState([]);
    const [roles, setRoles] = useState([]);

    // Form State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPersonId, setSelectedPersonId] = useState('');
    const [role, setRole] = useState('Técnico');

    // Derived state for warning
    const [reassignmentWarning, setReassignmentWarning] = useState(null);

    useEffect(() => {
        if (isOpen) {
            loadData();
            if (member) {
                // Edit Mode
                setSelectedPersonId(member.person_id);
                setRole(member.role_in_crew || member.role || 'Técnico');
            } else {
                // Add Mode - Reset
                setSearchTerm('');
                setSelectedPersonId('');
                setRole('Técnico');
                setReassignmentWarning(null);
            }
        }
    }, [isOpen, member]);

    // Check for reassignment warning whenever person selection changes
    useEffect(() => {
        if (!member && selectedPersonId) {
            const person = availableStaff.find(p => p.person_id === selectedPersonId);
            if (person?.isAssigned) {
                setReassignmentWarning(`Esta persona está asignada actualmente a la cuadrilla "${person.currentCrew}". Al agregarla aquí, se desvinculará automáticamente de su cuadrilla anterior.`);
            } else {
                setReassignmentWarning(null);
            }
        } else {
            setReassignmentWarning(null);
        }
    }, [selectedPersonId, availableStaff]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [staffData, rolesData] = await Promise.all([
                CrewService.getAvailableStaff(),
                OperationalStaffService.getOperationalRoles()
            ]);
            setAvailableStaff(staffData);

            const roleNames = rolesData.map(r => r.name);
            if (roleNames.length === 0) {
                setRoles(['Líder', 'Técnico', 'Ayudante', 'Conductor']);
            } else {
                setRoles(roleNames);
            }
        } catch (err) {
            console.error("Error loading data:", err);
            setError("Error al cargar personal disponible.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            if (member) {
                // Update Role
                await CrewService.updateMemberRole(member.crew_member_id, role);
            } else {
                // Add New Member (Start date is auto-set in service)
                if (!selectedPersonId) {
                    throw new Error("Debe seleccionar una persona.");
                }
                // Confirmation for reassignment
                if (reassignmentWarning) {
                    if (!window.confirm("¿Confirma que desea mover a esta persona de su cuadrilla actual a esta nueva cuadrilla?")) {
                        setSaving(false);
                        return;
                    }
                }

                await CrewService.addMember(crew.crew_id, selectedPersonId, role);
            }
            onSave();
            onClose();
        } catch (err) {
            console.error("Error saving member:", err);
            setError(err.message || "Error al guardar miembro.");
        } finally {
            setSaving(false);
        }
    };

    // Filter staff based on search
    const filteredStaff = availableStaff.filter(person =>
        person.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.document_id?.includes(searchTerm) ||
        person.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-800">
                        {member ? 'Editar Rol de Miembro' : 'Agregar Miembro'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Person Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Personal
                        </label>
                        {member ? (
                            <div className="p-3 bg-slate-100 rounded-lg text-slate-700 font-medium border border-slate-200">
                                {member.name || 'Desconocido'}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* Search Input */}
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre o cédula..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                                        disabled={loading}
                                    />
                                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                </div>

                                {/* Selection List */}
                                <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto bg-slate-50">
                                    {loading ? (
                                        <div className="p-4 text-center text-slate-400 text-sm">Cargando personal...</div>
                                    ) : filteredStaff.length > 0 ? (
                                        filteredStaff.map(person => (
                                            <div
                                                key={person.person_id}
                                                onClick={() => setSelectedPersonId(person.person_id)}
                                                className={`p-3 cursor-pointer text-sm border-b border-slate-100 last:border-0 hover:bg-white transition-colors flex justify-between items-center ${selectedPersonId === person.person_id ? 'bg-brand-50 hover:bg-brand-50 ring-1 ring-inset ring-brand-200' : ''}`}
                                            >
                                                <div>
                                                    <div className="font-medium text-slate-800">{person.fullName}</div>
                                                    <div className="text-xs text-slate-500">{person.role} {person.document_id ? `• ${person.document_id}` : ''}</div>
                                                </div>
                                                {person.isAssigned && (
                                                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded border border-amber-200">
                                                        En {person.currentCrew}
                                                    </span>
                                                )}
                                                {selectedPersonId === person.person_id && !person.isAssigned && (
                                                    <span className="text-brand-600">
                                                        <User size={16} />
                                                    </span>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-slate-400 text-sm">
                                            No se encontraron personas.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reassignment Warning */}
                    {reassignmentWarning && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
                            <p className="text-sm text-amber-800">
                                {reassignmentWarning}
                            </p>
                        </div>
                    )}

                    {/* Role Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Rol en Nueva Cuadrilla
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            required
                        >
                            {roles.map((r, index) => (
                                <option key={index} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6 md:mt-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                            disabled={saving}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving || (!member && !selectedPersonId)}
                            className={`px-6 py-2 text-white rounded-lg shadow-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${reassignmentWarning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-brand-600 hover:bg-brand-700'}`}
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    {member ? 'Guardando...' : (reassignmentWarning ? 'Mover y Guardar' : 'Agregar')}
                                </>
                            ) : (
                                member ? 'Guardar Cambios' : (reassignmentWarning ? 'Mover Miembro' : 'Agregar Miembro')
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
