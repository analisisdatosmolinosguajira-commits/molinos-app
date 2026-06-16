import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Users, FileText, Play, CheckCircle, Trash2, Plus, Download, Link2, ExternalLink } from 'lucide-react';
import { ConcertationService } from '../../services/concertations';
import { MillService } from '../../services/mills';
import { DiagnosisService } from '../../services/diagnosis';
import { ConcertationPDF } from '../../services/ConcertationPDF';
import StatusBadge from '../../components/ui/StatusBadge';
import AiAssistantPanel from '../../components/ai/AiAssistantPanel';

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
        concertation_act_url: '',
        delivery_act_url: '',
        conclusions: '',
        related_activity_id: null
    });

    // Participants State
    const [participants, setParticipants] = useState({
        communityMembers: [],
        personnel: []
    });

    const handleAiApplyFields = useCallback((fields) => {
        setFormData(prev => {
            const updated = { ...prev };
            if (fields.community_id) updated.community_id = String(fields.community_id);
            if (fields.meeting_date) updated.meeting_date = fields.meeting_date;
            if (fields.decision) updated.decision = fields.decision;
            if (fields.conditions) updated.conditions = fields.conditions;
            if (fields.notes) updated.notes = fields.notes;
            return updated;
        });
    }, []);

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
                concertation_act_url: data.concertation_act_url || '',
                delivery_act_url: data.delivery_act_url || '',
                conclusions: data.notes || '',
                related_activity_id: data.related_activity_id || null
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
            if (!payload.concertation_act_url || payload.concertation_act_url.trim() === '') payload.concertation_act_url = null;
            else payload.concertation_act_url = payload.concertation_act_url.trim();
            if (!payload.delivery_act_url || payload.delivery_act_url.trim() === '') payload.delivery_act_url = null;
            else payload.delivery_act_url = payload.delivery_act_url.trim();
            if (!payload.related_activity_id) payload.related_activity_id = null;
            delete payload.code;        // Read only
            delete payload.conclusions;
            delete payload.start_date;  // Managed by actions
            delete payload.end_date;    // Managed by actions

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

    // Save act urls independently without reloading the full form
    const handleSaveUrls = async () => {
        if (!concertationId) return;
        setSaving(true);
        try {
            const updates = {
                concertation_act_url: formData.concertation_act_url?.trim() || null,
                delivery_act_url: formData.delivery_act_url?.trim() || null
            };
            await ConcertationService.updateConcertation(concertationId, updates);
            setFormData(prev => ({ ...prev, ...updates }));
            alert('Links de las actas guardados correctamente.');
        } catch (err) {
            console.error('Error guardando links:', err);
            alert('Error al guardar los links de las actas.');
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

    const handleDownloadPDF = async () => {
        // Construct full data object for PDF
        const selectedCommunity = communities.find(c => c.community_id == formData.community_id);
        const selectedDiagnosis = diagnoses.find(d => d.diagnosis_id == formData.diagnosis_id);

        const pdfData = {
            ...formData,
            concertation_id: concertationId,
            community: selectedCommunity,
            diagnosis: selectedDiagnosis,
            concertation_community_member: participants.communityMembers,
            concertation_person: participants.personnel
        };

        await ConcertationPDF.generateCombined(pdfData);
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
                                    <Play size={14} className="text-brand-500" />
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
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                            formData.concertation_act_url || formData.delivery_act_url
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                        title={(formData.concertation_act_url || formData.delivery_act_url) ? 'Descarga el resumen PDF + abre el/las actas firmadas de Drive' : 'Descargar resumen del acta (sin PDFs vinculados)'}
                    >
                        <Download size={18} />
                        Acta {(formData.concertation_act_url || formData.delivery_act_url) ? '✓' : ''}
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
                            {!isEditing && (
                                <AiAssistantPanel
                                    modalType="concertation"
                                    onApplyFields={handleAiApplyFields}
                                    disabled={saving}
                                />
                            )}
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

                            {/* Google Drive Links */}
                            <div className="border-t border-slate-100 pt-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <Link2 size={15} className="text-blue-500" />
                                            Actas Firmadas — Links de Google Drive
                                        </label>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Pegue el link del PDF firmado alojado en Google Drive. El archivo debe estar compartido como
                                            <span className="font-semibold"> "Cualquier persona con el enlace"</span>.
                                        </p>
                                    </div>
                                    {isEditing && (
                                        <button
                                            type="button"
                                            onClick={handleSaveUrls}
                                            disabled={saving}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-60 flex-shrink-0"
                                            title="Guardar links en la base de datos"
                                        >
                                            <Save size={14} />
                                            Guardar links
                                        </button>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Acta de Concertación */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">URL Acta de Concertación</label>
                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-1">
                                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                    <svg viewBox="0 0 87.3 78" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                                                        <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                                                        <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                                                        <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                                                        <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                                                        <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                                                    </svg>
                                                </div>
                                                <input
                                                    type="url"
                                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm transition-all"
                                                    value={formData.concertation_act_url || ''}
                                                    onChange={(e) => setFormData({ ...formData, concertation_act_url: e.target.value })}
                                                    placeholder="https://drive.google.com/file/d/..."
                                                />
                                            </div>
                                            {formData.concertation_act_url && (
                                                <a
                                                    href={formData.concertation_act_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-colors flex-shrink-0"
                                                    title="Abrir en Google Drive"
                                                >
                                                    <ExternalLink size={16} />
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Acta de Entrega */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">URL Acta de Entrega</label>
                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-1">
                                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                    <svg viewBox="0 0 87.3 78" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                                                        <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                                                        <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                                                        <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                                                        <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                                                        <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                                                    </svg>
                                                </div>
                                                <input
                                                    type="url"
                                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm transition-all"
                                                    value={formData.delivery_act_url || ''}
                                                    onChange={(e) => setFormData({ ...formData, delivery_act_url: e.target.value })}
                                                    placeholder="https://drive.google.com/file/d/..."
                                                />
                                            </div>
                                            {formData.delivery_act_url && (
                                                <a
                                                    href={formData.delivery_act_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-colors flex-shrink-0"
                                                    title="Abrir en Google Drive"
                                                >
                                                    <ExternalLink size={16} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {(formData.concertation_act_url || formData.delivery_act_url) && (
                                    <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                                        <span>✓</span> Link(s) configurado(s). Al descargar el acta se generará el resumen más lo(s) PDF(s) de Drive.
                                    </p>
                                )}
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
                                        className="bg-brand-100 text-brand-700 p-2 rounded-lg hover:bg-brand-200"
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
