import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Users, FileText, Play, CheckCircle, Trash2, Plus, Download } from 'lucide-react';
import { ConcertationService } from '../../services/concertations';
import { MillService } from '../../services/mills';
import { DiagnosisService } from '../../services/diagnosis';
import { ConcertationPDF } from '../../services/ConcertationPDF';
import StatusBadge from '../../components/ui/StatusBadge';

export default function ConcertationForm({ concertationId, onBack }) {
    const isEditing = !!concertationId;
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [searchParams] = useSearchParams();

    // Data Sources
    const [communities, setCommunities] = useState([]);
    const [diagnoses, setDiagnoses] = useState([]);
    const [availableMembers, setAvailableMembers] = useState([]);
    const [availablePersonnel, setAvailablePersonnel] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        code: '',
        community_id: '',
        diagnosis_id: '',
        meeting_date: new Date().toISOString().split('T')[0],
        start_date: '',
        end_date: '',
        status: 'pendiente',
        decision: 'pending',
        conditions: '',
        notes: '',
        closing_note: '',
        act_url: '',
        conclusions: '',
        related_activity_id: null
    });

    // Participants State
    const [participants, setParticipants] = useState({
        communityMembers: [],
        personnel: []
    });

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (concertationId) {
            loadConcertationDetails();
        }
    }, [concertationId]);

    useEffect(() => {
        if (formData.community_id) {
            loadCommunityMembers(formData.community_id);
        }
    }, [formData.community_id]);

    useEffect(() => {
        const activityId = searchParams.get('activity_id');
        if (activityId && !isEditing) {
            setFormData(prev => ({ ...prev, related_activity_id: parseInt(activityId) }));
        }
    }, []);

    async function loadInitialData() {
        try {
            const mills = await MillService.getMills();
            const uniqueComs = [];
            const map = new Map();
            mills.forEach(m => {
                if (m.community && !map.has(m.community.community_id)) {
                    map.set(m.community.community_id, true);
                    uniqueComs.push(m.community);
                }
            });
            setCommunities(uniqueComs);

            const allDiagnoses = await DiagnosisService.getAllDiagnoses();
            setDiagnoses(allDiagnoses);

            const personnel = await ConcertationService.getAllPersonnel();
            setAvailablePersonnel(personnel || []);

        } catch (err) {
            console.error("Error loading initial data:", err);
            setError("Error cargando listas de datos.");
        }
    }

    async function loadConcertationDetails() {
        try {
            setLoading(true);
            const data = await ConcertationService.getConcertationById(concertationId);
            setFormData({
                code: data.code || '',
                community_id: data.community_id || '',
                diagnosis_id: data.diagnosis_id || '',
                meeting_date: data.meeting_date || '',
                start_date: data.start_date || '',
                end_date: data.end_date || '',
                status: data.status || 'pendiente',
                decision: data.decision || 'pending',
                conditions: data.conditions || '',
                notes: data.notes || '',
                closing_note: data.closing_note || '',
                act_url: data.act_url || '',
                conclusions: data.notes || ''
            });

            setParticipants({
                communityMembers: data.concertation_community_member || [],
                personnel: data.concertation_person || []
            });

        } catch (err) {
            console.error("Error loading details:", err);
            setError("Error cargando detalles.");
        } finally {
            setLoading(false);
        }
    }

    async function loadCommunityMembers(communityId) {
        try {
            const members = await ConcertationService.getCommunityMembers(communityId);
            setAvailableMembers(members || []);
        } catch (err) {
            console.error("Error fetching members:", err);
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...formData };
            if (!payload.diagnosis_id) payload.diagnosis_id = null;
            delete payload.code; // Read only
            delete payload.conclusions;
            delete payload.start_date; // Managed by actions
            delete payload.end_date;   // Managed by actions

            if (isEditing) {
                await ConcertationService.updateConcertation(concertationId, payload);
            } else {
                await ConcertationService.createConcertation(payload);
                onBack();
                return;
            }
            alert("Guardado correctamente");
        } catch (err) {
            console.error("Error saving:", err);
            setError("Error guardando datos.");
        } finally {
            setSaving(false);
        }
    };

    const handleStart = async () => {
        if (!confirm("¿Iniciar la concertación ahora? Esto establecerá la fecha de inicio y guardará los cambios actuales.")) return;
        try {
            const now = new Date().toISOString();
            // Merge current form data with updates
            const fullUpdates = {
                ...formData,
                status: 'en_proceso',
                start_date: now
            };

            // Clean up read-only or managed fields before sending
            delete fullUpdates.code;
            delete fullUpdates.conclusions;

            // Sanitize dates and nullables (Fixes 22P02: invalid input syntax for type integer: "")
            if (!fullUpdates.diagnosis_id) fullUpdates.diagnosis_id = null;
            if (!fullUpdates.end_date) fullUpdates.end_date = null;

            await ConcertationService.updateConcertation(concertationId, fullUpdates);

            setFormData(prev => ({ ...prev, status: 'en_proceso', start_date: now }));
            loadConcertationDetails();
        } catch (err) {
            console.error(err);
            alert(`Error al iniciar: ${err.message || 'Desconocido'}`);
        }
    };

    const handleFinish = async () => {
        const finalNotes = prompt("Ingrese las conclusiones finales para cerrar el acta:");
        if (!finalNotes) return;

        try {
            const now = new Date().toISOString();
            // Merge current form data with updates
            const fullUpdates = {
                ...formData,
                status: 'finalizada',
                closing_note: finalNotes,
                end_date: now
            };

            // Clean up
            delete fullUpdates.code;
            delete fullUpdates.conclusions;

            // Sanitize dates and nullables (Fixes 22P02)
            if (!fullUpdates.diagnosis_id) fullUpdates.diagnosis_id = null;
            if (!fullUpdates.start_date) fullUpdates.start_date = null;

            await ConcertationService.updateConcertation(concertationId, fullUpdates);

            setFormData(prev => ({ ...prev, status: 'finalizada', closing_note: finalNotes, end_date: now }));
            loadConcertationDetails();
        } catch (err) {
            console.error(err);
            alert("Error al finalizar");
        }
    };

    const handleDownloadPDF = () => {
        // Construct full data object for PDF
        const selectedCommunity = communities.find(c => c.community_id == formData.community_id);
        const selectedDiagnosis = diagnoses.find(d => d.diagnosis_id == formData.diagnosis_id);

        const pdfData = {
            ...formData,
            concertation_id: concertationId, // might be null if new
            community: selectedCommunity,
            diagnosis: selectedDiagnosis,
            concertation_community_member: participants.communityMembers,
            concertation_person: participants.personnel
        };

        ConcertationPDF.generate(pdfData);
    };


    // --- Participant Logic ---

    const handleAddMember = async (memberId) => {
        try {
            await ConcertationService.addCommunityMember(concertationId, memberId);
            loadConcertationDetails();
        } catch (err) {
            alert(err.message);
            console.error(err);
        }
    };

    const handleRemoveMember = async (relationId) => {
        try {
            await ConcertationService.removeCommunityMember(relationId);
            loadConcertationDetails();
        } catch (err) { console.error(err); }
    };

    const handleAddPerson = async (personId) => {
        try {
            await ConcertationService.addPerson(concertationId, personId);
            loadConcertationDetails();
        } catch (err) { console.error(err); }
    };

    const handleRemovePerson = async (relationId) => {
        try {
            await ConcertationService.removePerson(relationId);
            loadConcertationDetails();
        } catch (err) { console.error(err); }
    };


    if (loading) return <div className="p-8 text-center">Cargando...</div>;

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Toolbar */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                            {isEditing ? `Acta ${formData.code ? `#${formData.code}` : ''}` : 'Nueva Concertación'}
                            {isEditing && <StatusBadge status={formData.status} size="sm" />}
                        </h1>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                            {formData.start_date && (
                                <span className="flex items-center gap-1">
                                    <Play size={14} className="text-blue-500" />
                                    Inicio: {new Date(formData.start_date).toLocaleString()}
                                </span>
                            )}
                            {formData.end_date && (
                                <span className="flex items-center gap-1">
                                    <CheckCircle size={14} className="text-green-500" />
                                    Fin: {new Date(formData.end_date).toLocaleString()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Action Buttons based on Status */}

                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
                        title="Descargar Acta"
                    >
                        <Download size={18} />
                        Acta
                    </button>

                    {isEditing && formData.status === 'pendiente' && (
                        <button
                            onClick={handleStart}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-bold"
                        >
                            <Play size={16} /> Iniciar Concertación
                        </button>
                    )}
                    {isEditing && formData.status === 'en_proceso' && (
                        <button
                            onClick={handleFinish}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
                        >
                            <CheckCircle size={16} /> Finalizar
                        </button>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-bold disabled:opacity-50"
                    >
                        <Save size={18} />
                        {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'general' ? 'border-social-500 text-social-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <FileText size={16} /> Información General
                </button>
                <button
                    onClick={() => setActiveTab('participants')}
                    disabled={!isEditing}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'participants' ? 'border-social-500 text-social-600' : 'border-transparent text-slate-500 hover:text-slate-700 disabled:opacity-50'
                        }`}
                >
                    <Users size={16} /> Participantes
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Area */}
                <div className="lg:col-span-3 space-y-6">

                    {/* TAB: GENERAL */}
                    {activeTab === 'general' && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Comunidad *</label>
                                    <select
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                        value={formData.community_id}
                                        onChange={(e) => setFormData({ ...formData, community_id: e.target.value, diagnosis_id: '' })}
                                        disabled={isEditing} // Lock community after creation? Usually safer.
                                    >
                                        <option value="">Seleccione una comunidad...</option>
                                        {communities.map(c => (
                                            <option key={c.community_id} value={c.community_id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Diagnóstico Relacionado (Opcional)</label>
                                    <select
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                        value={formData.diagnosis_id}
                                        onChange={(e) => setFormData({ ...formData, diagnosis_id: e.target.value })}
                                        disabled={!formData.community_id}
                                    >
                                        <option value="">Ninguno</option>
                                        {diagnoses
                                            .filter(d => !formData.community_id || d.mill?.community_id == formData.community_id)
                                            .map(d => (
                                                <option key={d.diagnosis_id} value={d.diagnosis_id}>{d.code} - {d.description}</option>
                                            ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Programada / Reunión</label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                        value={formData.meeting_date ? new Date(formData.meeting_date).toISOString().split('T')[0] : ''}
                                        onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio Real</label>
                                    <input
                                        type="text"
                                        readOnly
                                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500"
                                        value={formData.start_date ? new Date(formData.start_date).toLocaleString() : 'Pendiente'}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Fin Real</label>
                                    <input
                                        type="text"
                                        readOnly
                                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500"
                                        value={formData.end_date ? new Date(formData.end_date).toLocaleString() : 'Pendiente'}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Decisión</label>
                                    <select
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                        value={formData.decision}
                                        onChange={(e) => setFormData({ ...formData, decision: e.target.value })}
                                    >
                                        <option value="">Sin decisión</option>
                                        <option value="pending">Aplazada</option>
                                        <option value="approved">Aprobada</option>
                                        <option value="rejected">Rechazada</option>
                                        <option value="conditional">Condicionada</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Condiciones / Acuerdos</label>
                                <textarea
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 h-24"
                                    value={formData.conditions || ''}
                                    onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                                    placeholder="Especifique las condiciones acordadas..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Notas / Conclusiones</label>
                                <textarea
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 h-24"
                                    value={formData.notes || ''}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Notas generales o conclusiones finales..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Conclusiones de Cierre (Finalización)</label>
                                <textarea
                                    readOnly
                                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none text-slate-500 h-24"
                                    value={formData.closing_note || ''}
                                    onChange={(e) => setFormData({ ...formData, closing_note: e.target.value })}
                                    placeholder="Estas conclusiones se generan automáticamente al finalizar el acta."
                                />
                            </div>
                        </div>
                    )}

                    {/* TAB: PARTICIPANTS */}
                    {activeTab === 'participants' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Community Members */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-[500px]">
                                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                                    <Users size={20} className="text-social-600" />
                                    Miembros de la Comunidad
                                </h3>

                                <div className="flex gap-2 mb-4">
                                    <select
                                        id="memberSelect"
                                        className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg"
                                    >
                                        <option value="">Seleccionar miembro...</option>
                                        {availableMembers
                                            .filter(m => !participants.communityMembers.some(p => p.community_member_id === m.id))
                                            .map(m => (
                                                <option key={m.id} value={m.id}>
                                                    {m.person?.first_name} {m.person?.last_name} ({m.community_role?.name})
                                                </option>
                                            ))}
                                    </select>
                                    <button
                                        onClick={() => {
                                            const select = document.getElementById('memberSelect');
                                            if (select.value) handleAddMember(parseInt(select.value, 10));
                                        }}
                                        className="bg-social-100 text-social-700 p-2 rounded-lg hover:bg-social-200"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                    {participants.communityMembers.map(record => (
                                        <div key={record.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <div>
                                                <p className="font-bold text-slate-700 text-sm">
                                                    {record.community_member?.person?.first_name} {record.community_member?.person?.last_name}
                                                </p>
                                                <p className="text-xs text-slate-500">{record.community_member?.community_role?.name}</p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveMember(record.id)}
                                                className="text-red-400 hover:text-red-600 p-1"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {participants.communityMembers.length === 0 && (
                                        <p className="text-center text-slate-400 text-sm py-4">No hay participantes registrados</p>
                                    )}
                                </div>
                            </div>

                            {/* Personnel */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-[500px]">
                                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                                    <Users size={20} className="text-brand-600" />
                                    Personal Operativo
                                </h3>

                                <div className="flex gap-2 mb-4">
                                    <select
                                        id="personSelect"
                                        className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg"
                                    >
                                        <option value="">Seleccionar personal...</option>
                                        {availablePersonnel
                                            .filter(p => !participants.personnel.some(pp => pp.person_id === p.person_id))
                                            .map(p => (
                                                <option key={p.person_id} value={p.person_id}>
                                                    {p.first_name} {p.last_name} ({p.role})
                                                </option>
                                            ))}
                                    </select>
                                    <button
                                        onClick={() => {
                                            const select = document.getElementById('personSelect');
                                            if (select.value) handleAddPerson(select.value);
                                        }}
                                        className="bg-brand-100 text-brand-700 p-2 rounded-lg hover:bg-blue-200"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                    {participants.personnel.map(record => (
                                        <div key={record.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <div>
                                                <p className="font-bold text-slate-700 text-sm">
                                                    {record.person?.first_name} {record.person?.last_name}
                                                </p>
                                                <p className="text-xs text-slate-500">{record.person?.role}</p>
                                            </div>
                                            <button
                                                onClick={() => handleRemovePerson(record.id)}
                                                className="text-red-400 hover:text-red-600 p-1"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {participants.personnel.length === 0 && (
                                        <p className="text-center text-slate-400 text-sm py-4">No hay personal registrado</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
