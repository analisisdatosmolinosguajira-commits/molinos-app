import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, FileText, Loader, Briefcase, MapPin, Shield } from 'lucide-react';
import { PeopleService } from '../../services/people';
import { CommunityService } from '../../services/communities';

const PersonModal = ({ isOpen, onClose, onSave, personToEdit = null, communities = [] }) => {
    const [activeTab, setActiveTab] = useState('info'); // 'info', 'assignment'
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        document_id: '',
        phone: '',
        specialty: ''
    });

    // Assignment State
    const [roles, setRoles] = useState([]);
    const [assignmentData, setAssignmentData] = useState({
        communityId: '',
        roleId: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            loadRoles();
            if (personToEdit) {
                setFormData({
                    first_name: personToEdit.first_name || '',
                    last_name: personToEdit.last_name || '',
                    document_id: personToEdit.document_id || '',
                    phone: personToEdit.phone || '',
                    specialty: personToEdit.specialty || ''
                });

                // Pre-fill assignment if exists
                if (personToEdit.communityId) {
                    setAssignmentData({
                        communityId: personToEdit.communityId,
                        roleId: personToEdit.roleId || ''
                    });
                } else {
                    setAssignmentData({ communityId: '', roleId: '' });
                }
            } else {
                setFormData({
                    first_name: '',
                    last_name: '',
                    document_id: '',
                    phone: '',
                    specialty: ''
                });
                setAssignmentData({ communityId: '', roleId: '' });
            }
            setActiveTab('info');
            setError(null);
        }
    }, [isOpen, personToEdit]);

    const loadRoles = async () => {
        try {
            const data = await CommunityService.getRoles();
            setRoles(data);
        } catch (e) { console.error("Error loading roles", e); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Logic: If assigning to community, Global Role MUST be 'Miembro de Comunidad' (handled by service via role_id)
            const isAssigning = (assignmentData.communityId && assignmentData.roleId);
            const finalData = {
                ...formData
                // role: ... is removed. Service handles role_id.
            };

            let result;
            // 1. Save Person Data
            if (personToEdit) {
                // For updates, we process the update. Service filters out invalid fields.
                const updateData = { ...finalData };

                result = await PeopleService.updatePerson(personToEdit.person_id || personToEdit.id, updateData);

                // 2. Handle Assignment Change (only if editing existing person for now, creates flow is trickier with IDs)
                if (assignmentData.communityId && assignmentData.roleId) {
                    // Check if changed
                    if (assignmentData.communityId !== personToEdit.communityId || assignmentData.roleId !== personToEdit.roleId) {
                        if (personToEdit.membershipId) {
                            // Update existing
                            await PeopleService.updateAssignment(personToEdit.membershipId, assignmentData.communityId, assignmentData.roleId);
                        } else {
                            // Create new
                            await PeopleService.assignCommunity(personToEdit.person_id, assignmentData.communityId, assignmentData.roleId);
                        }
                    }
                }
            } else {
                result = await PeopleService.createPerson(finalData);
                // If created, and assignment selected?
                if (assignmentData.communityId && assignmentData.roleId && result.person_id) {
                    await PeopleService.assignCommunity(result.person_id, assignmentData.communityId, assignmentData.roleId);
                }
            }

            if (onSave) onSave(result);
            onClose();
        } catch (err) {
            console.error("Error saving person:", err);
            setError(err.message || "Error al guardar la persona.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
                    <h3 className="font-bold text-slate-800 text-lg">
                        {personToEdit ? 'Editar Persona' : 'Registrar Nueva Persona'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'info' ? 'border-brand-500 text-brand-700 bg-brand-50/30' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Información Personal
                    </button>
                    <button
                        onClick={() => setActiveTab('assignment')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'assignment' ? 'border-brand-500 text-brand-700 bg-brand-50/30' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Comunidad y Rol
                    </button>
                </div>

                <div className="overflow-y-auto custom-scrollbar p-6">
                    <form id="person-form" onSubmit={handleSubmit} className="space-y-4">
                        {activeTab === 'info' && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nombre</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                            <input
                                                type="text"
                                                required
                                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-medium"
                                                placeholder="Juan"
                                                value={formData.first_name}
                                                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Apellido</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-medium"
                                            placeholder="Pérez"
                                            value={formData.last_name}
                                            onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Documento / Cédula</label>
                                    <div className="relative">
                                        <FileText className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            required
                                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-medium font-mono"
                                            placeholder="V-12345678"
                                            value={formData.document_id}
                                            onChange={e => setFormData({ ...formData, document_id: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Teléfono</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                            <input
                                                type="tel"
                                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-medium"
                                                placeholder="0414..."
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Especialidad</label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                            <input
                                                type="text"
                                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-medium"
                                                placeholder="Mecánico..."
                                                value={formData.specialty}
                                                onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'assignment' && (
                            <div className="space-y-4">
                                <div className="bg-brand-50 p-4 rounded-xl border border-brand-100">
                                    <h4 className="text-sm font-bold text-brand-900 mb-2">Asignación Actual</h4>
                                    {personToEdit?.community ? (
                                        <div className="flex items-center gap-2 text-brand-700">
                                            <MapPin size={16} />
                                            <span className="font-semibold">{personToEdit.community}</span>
                                            <span className="text-brand-400">•</span>
                                            <span className="text-sm">{personToEdit.role}</span>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-brand-400 italic">No asignado a ninguna comunidad.</div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Asignar a Comunidad</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                        <select
                                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-medium text-slate-700 appearance-none"
                                            value={assignmentData.communityId}
                                            onChange={e => setAssignmentData({ ...assignmentData, communityId: e.target.value })}
                                        >
                                            <option value="">-- Seleccionar Comunidad --</option>
                                            {communities.map(c => (
                                                <option key={c.community_id} value={c.community_id}>
                                                    {c.name} ({c.municipality})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Rol en la Comunidad</label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                        <select
                                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-medium text-slate-700 appearance-none"
                                            value={assignmentData.roleId}
                                            onChange={e => setAssignmentData({ ...assignmentData, roleId: e.target.value })}
                                            disabled={!assignmentData.communityId}
                                        >
                                            <option value="">-- Seleccionar Rol --</option>
                                            {Array.isArray(roles) && roles.map(r => (
                                                <option key={r.role_id} value={r.role_id}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg flex items-center gap-2">
                                <X size={14} /> {error}
                            </div>
                        )}
                    </form>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
                    <button
                        type="submit"
                        form="person-form"
                        disabled={loading}
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-indigo-500/30 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? <Loader className="animate-spin" size={20} /> : <><Save size={18} /> Guardar Cambios</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PersonModal;
