
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Save, X, Calendar, User, Briefcase, FileText,
    Package, Wrench, Shield, Activity, Plus, Trash2,
    AlertTriangle, CheckCircle, Download
} from 'lucide-react';
import { WorkOrderService } from '../../services/work_orders';
import { MillService } from '../../services/mills';
import { CrewService } from '../../services/crews';
import { SystemService } from '../../services/systems';
import { WorkOrderFormatGenerator } from '../../components/export/WorkOrderFormatGenerator';
import AiAssistantPanel from '../../components/ai/AiAssistantPanel';

export default function WorkOrderForm({ orderId, onBack }) {
    // Mode
    const isEditing = !!orderId;

    // View State
    const [activeTab, setActiveTab] = useState('general'); // general, components
    const [millSystems, setMillSystems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completionNotes, setCompletionNotes] = useState('');

    // Data Options
    const [options, setOptions] = useState({
        mills: [],
        crews: [],
        pieces: [],
        materials: [],
        tools: [],
        safety: [],
        pumpsForInstall: [],
        pumpsForRemoval: []
    });

    // Additional WO Data
    const [requirements, setRequirements] = useState([]);
    const [canStart, setCanStart] = useState(false);

    // Form Stats (for badge counts)
    const [stats, setStats] = useState({
        resources: 0,
        safety: 0
    });

    // Pump Logic State
    const [repairSamePump, setRepairSamePump] = useState(false);
    const [searchParams] = useSearchParams();

    // Form Data
    const [formData, setFormData] = useState({
        // Basic Info
        code: '', // Read-only
        mill_id: '',
        crew_id: '',
        type: 'preventivo', // preventivo, correctivo, emergencia, mejora
        is_reintervention: false,
        priority: 'MEDIUM', // LOW, MEDIUM, HIGH, CRITICAL
        status: 'PENDING', // PENDING, IN_PROGRESS, COMPLETED, CANCELLED
        description: '',
        diagnosis: '',
        notes: '',
        final_observations: '',
        scheduled_date: '',
        start_date: '', // New field
        end_date: '',   // New field
        report_url: '', // New field
        related_activity_id: null, // Linked Activity

        // Pump Operations
        pump_id_to_install: null,
        pump_id_to_remove: null,
        pump_procedure_type: '',
        pump_installation_notes: '',

        // Relations
        pieces: [],     // { piece_id, quantity_used, tempId? }
        materials: [],  // { material_id, quantity_used, tempId? }
        tools: [],      // { tool_id, quantity, tempId? }
        safety: [],     // { safety_id, quantity_required, tempId? }
        components: [], // { component_id, status, observation } (Loaded from mill)
        system_observations: {} // { [component_id]: 'text' } for system-level observations
    });

    const handleAiApplyFields = useCallback((fields) => {
        setFormData(prev => {
            const updated = { ...prev };
            if (fields.description) updated.description = fields.description;
            if (fields.diagnosis) updated.diagnosis = fields.diagnosis;
            if (fields.notes) updated.notes = fields.notes;
            if (fields.final_observations) updated.final_observations = fields.final_observations;
            if (fields.pump_status) updated.pump_status = fields.pump_status;
            if (fields.scheduled_date) updated.scheduled_date = fields.scheduled_date;
            if (fields.type) updated.type = fields.type;
            if (fields.priority) updated.priority = fields.priority;
            if (fields.is_reintervention !== undefined) updated.is_reintervention = fields.is_reintervention;
            // Mill matching via fuzzy
            if (fields.mill_id) updated.mill_id = fields.mill_id;
            // Crew matching via fuzzy
            if (fields.crew_id) updated.crew_id = fields.crew_id;
            return updated;
        });
    }, []);

    // Load Data Effect
    useEffect(() => {
        loadAllData();
    }, [orderId]);

    // Recalculate stats when lists change
    useEffect(() => {
        setStats({
            resources: formData.pieces.length + formData.materials.length + formData.tools.length,
            safety: formData.safety.length
        });
    }, [formData.pieces, formData.materials, formData.tools, formData.safety]);

    // If Mill changes, we might need to load components (only for new orders or if logic dictates)
    // For editing, we load saved components status. 
    // For new, we fetch mill components when mill is selected.
    useEffect(() => {
        if (!isEditing && formData.mill_id) {
            loadMillComponents(formData.mill_id);
        }
    }, [formData.mill_id, isEditing]);

    // Pre-fill from URL params (New Order only)
    useEffect(() => {
        if (!isEditing) {
            const millIdParam = searchParams.get('mill_id');
            const pumpIdParam = searchParams.get('pump_target');
            const actionParam = searchParams.get('pump_action');
            const activityIdParam = searchParams.get('activity_id');

            if (activityIdParam) {
                setFormData(prev => ({ ...prev, related_activity_id: parseInt(activityIdParam) }));
            }

            if (millIdParam) {
                setFormData(prev => ({ ...prev, mill_id: millIdParam }));
            }
            if (actionParam === 'uninstall' && pumpIdParam) {
                setFormData(prev => ({
                    ...prev,
                    pump_id_to_remove: parseInt(pumpIdParam),
                    description: 'Desinstalación de Bomba',
                    type: 'correctivo',
                    priority: 'HIGH'
                }));
            }
            if (actionParam === 'install') {
                setFormData(prev => ({
                    ...prev,
                    description: 'Instalación de Bomba',
                    type: 'preventivo',
                    priority: 'MEDIUM',
                    // pump_id_to_install left null for user selection
                }));
            }
        }
    }, [isEditing, searchParams]);


    // Pump Logic: Repair Same Pump Sync
    useEffect(() => {
        if (repairSamePump && formData.pump_id_to_remove) {
            setFormData(prev => ({
                ...prev,
                pump_id_to_install: prev.pump_id_to_remove
            }));
        } else if (repairSamePump && !formData.pump_id_to_remove) {
            // If checkbox checked but no pump to remove, clear install? or wait?
            // Better to clear to avoid confusion
            setFormData(prev => ({ ...prev, pump_id_to_install: null }));
        }
    }, [repairSamePump, formData.pump_id_to_remove]);

    async function loadAllData() {
        try {
            setLoading(true);

            // 1. Load Options (Concurrent)
            const [mills, crews, inventory, pumpsInstall, pumpsRemove] = await Promise.all([
                MillService.getAllMills(),
                CrewService.getActiveCrews(),
                WorkOrderService.getInventoryOptions(),
                WorkOrderService.getAvailablePumps(true),
                WorkOrderService.getAvailablePumps(false)
            ]);

            setOptions({
                mills,
                crews,
                ...inventory,
                pumpsForInstall: pumpsInstall,
                pumpsForRemoval: pumpsRemove
            });

            // 2. Load Existing Order (if editing)
            if (isEditing) {
                const order = await WorkOrderService.getWorkOrderById(orderId);
                console.log('Loaded Order:', order);
                console.log('Requirements:', order.requirements);
                console.log('Can Start:', order.canStart);
                console.log('Pieces with stock:', order.resources?.pieces);

                // Extract requirements and canStart
                setRequirements(order.requirements || []);
                setCanStart(order.canStart || false);

                // Check if this is a "Repair Same Pump" scenario
                const isRepair = order.pump_id_to_install &&
                    order.pump_id_to_remove &&
                    order.pump_id_to_install === order.pump_id_to_remove;

                setRepairSamePump(!!isRepair);

                // If repairing, ensure the pump is in the "Install" options
                if (isRepair) {
                    const pumpId = order.pump_id_to_install;
                    const alreadyInList = pumpsInstall.find(p => p.pump_id === pumpId);

                    if (!alreadyInList) {
                        // Find details in mills (it should be the active pump of the mill)
                        const mill = mills.find(m => m.mill_id === order.mill_id);
                        const activePump = mill?.active_pump;

                        if (activePump && activePump.pump_id === pumpId) {
                            const tempOption = {
                                pump_id: pumpId,
                                serial_number: activePump.pump?.serial_number || 'Unknown',
                                model: activePump.pump?.model || 'Unknown',
                                status: 'REINSTALACIÓN'
                            };

                            // Update options state to include this pump (with dedupe)
                            setOptions(prev => {
                                if (prev.pumpsForInstall.some(p => p.pump_id === tempOption.pump_id)) {
                                    return prev;
                                }
                                return {
                                    ...prev,
                                    pumpsForInstall: [...prev.pumpsForInstall, tempOption]
                                };
                            });
                        }
                    }
                }

                // Map DB data to Form Structure
                setFormData({
                    mill_id: order.mill_id,
                    crew_id: order.crew_id || '',
                    type: order.type,
                    is_reintervention: order.is_reintervention || false,
                    priority: order.priority,
                    status: order.status,
                    description: order.description || '',
                    diagnosis: order.diagnosis || '',
                    notes: order.notes || '',
                    final_observations: order.final_observations || '',
                    code: order.code || '',
                    scheduled_date: order.scheduled_date ? new Date(order.scheduled_date).toISOString().split('T')[0] : '',
                    start_date: order.start_date ? order.start_date.split('T')[0] : '',
                    end_date: order.end_date ? order.end_date.split('T')[0] : '',
                    report_url: order.report_url || '',

                    // Pump Operations
                    pump_id_to_install: order.pump_id_to_install || null,
                    pump_id_to_remove: order.pump_id_to_remove || null,
                    pump_procedure_type: order.pump_procedure_type || '',
                    pump_installation_notes: order.pump_installation_notes || '',

                    pieces: order.resources.pieces.map(p => ({ ...p, tempId: Math.random() })),
                    materials: order.resources.materials.map(m => ({ ...m, tempId: Math.random() })),
                    tools: order.resources.tools.map(t => ({ ...t, tempId: Math.random() })),
                    safety: order.safety.requirements.map(s => ({ ...s, tempId: Math.random() })),
                    components: order.components.map(c => ({ ...c })),
                    system_observations: order.system_observations || {}
                });

                // Always load mill systems hierarchy (required for UI grouping)
                await loadMillComponents(order.mill_id);

            }

        } catch (err) {
            console.error("Error loading form data:", err);
            setError("Error cargando datos del formulario");
        } finally {
            setLoading(false);
        }
    }

    async function loadMillComponents(millId) {
        if (!millId) return;
        try {
            // Always load mill systems hierarchy for UI grouping
            const systems = await SystemService.getMillSystemStatus(millId);
            setMillSystems(systems);

            const comps = await WorkOrderService.getMillComponents(millId);
            setFormData(prev => {
                if (prev.components.length > 0 && isEditing) return prev;
                return {
                    ...prev,
                    components: comps.map(c => ({
                        component_id: c.component_id,
                        name: c.name,
                        code: c.code,
                        status: 'FUNCIONAL',
                        observation: ''
                    }))
                };
            });
        } catch (e) {
            console.error("Error loading mill components", e);
        }
    }

    // Helper to deduplicate items by ID
    const dedupeItems = (items, idField) => {
        const unique = new Map();
        items.forEach(item => {
            if (!item[idField]) return;
            // If duplicate, sum quantities? Or just keep last? 
            // Better to keep last edit or sum if logical. For now, let's keep last but warn if needed.
            // Actually, for safety, let's sum quantities if they are the same item type
            if (unique.has(item[idField])) {
                const existing = unique.get(item[idField]);
                // Check if we should sum based on field existence
                if (existing.quantity_used && item.quantity_used) {
                    existing.quantity_used = parseFloat(existing.quantity_used || 0) + parseFloat(item.quantity_used || 0);
                } else if (existing.quantity && item.quantity) {
                    existing.quantity = parseInt(existing.quantity || 0) + parseInt(item.quantity || 0);
                }
            } else {
                unique.set(item[idField], { ...item });
            }
        });
        return Array.from(unique.values());
    };

    // Internal Save Function (returns promise)
    const saveWorkOrder = async () => {
        // Validation
        if (!formData.description) throw new Error("La descripción es obligatoria");
        if (!formData.mill_id) throw new Error("El molino es obligatorio");
        if (formData.status === 'COMPLETED' && !formData.crew_id) throw new Error("Debe asignar una cuadrilla para cerrar la orden");

        // Deduplicate Resources
        const uniquePieces = dedupeItems(formData.pieces, 'piece_id');
        const uniqueMaterials = dedupeItems(formData.materials, 'material_id');
        const uniqueTools = dedupeItems(formData.tools, 'tool_id');
        const uniqueSafety = dedupeItems(formData.safety, 'safety_id');

        // Payload Construction
        const payload = {
            basicInfo: {
                mill_id: formData.mill_id,
                crew_id: formData.crew_id || null,
                type: formData.type,
                priority: formData.priority,
                status: formData.status,
                description: formData.description,
                notes: formData.notes,
                final_observations: formData.final_observations,
                scheduled_date: formData.scheduled_date || null,
                start_date: formData.start_date || null,
                end_date: formData.end_date || null,
                diagnosis: formData.diagnosis,
                is_reintervention: formData.is_reintervention,
                report_url: formData.report_url,
                related_activity_id: formData.related_activity_id,

                // Add Pump Operations
                pump_id_to_install: formData.pump_id_to_install,
                pump_id_to_remove: formData.pump_id_to_remove,
                pump_procedure_type: formData.pump_procedure_type || null,
                pump_installation_notes: formData.pump_installation_notes
            },
            pieces: uniquePieces.map(p => ({
                piece_id: p.piece_id,
                quantity_used: parseFloat(p.quantity_used)
            })),
            materials: uniqueMaterials.map(m => ({
                material_id: m.material_id,
                quantity_used: parseFloat(m.quantity_used)
            })),
            tools: uniqueTools.map(t => ({
                tool_id: t.tool_id,
                quantity: parseInt(t.quantity)
            })),
            safety: uniqueSafety.map(s => ({
                safety_id: s.safety_id,
                quantity_required: parseInt(s.quantity_required)
            })),
            // Component status
            components: formData.components.map(c => ({
                component_id: c.component_id,
                status: c.status,
                observation: c.observation,
                damage_description: c.damage_description
            })),
            system_observations: formData.system_observations || {}
        };

        if (isEditing) {
            await WorkOrderService.updateWorkOrder(orderId, payload);
        } else {
            await WorkOrderService.createWorkOrder(payload);
        }
    };

    const handleSubmit = async () => {
        try {
            setSaving(true);
            setError(null);

            // Date Checks
            if (formData.start_date && formData.end_date) {
                if (new Date(formData.end_date) < new Date(formData.start_date)) {
                    throw new Error("La Fecha de Fin no puede ser anterior a la Fecha de Inicio.");
                }
            }

            await saveWorkOrder();
            onBack(); // Go back to list on success
        } catch (err) {
            console.error("Error saving work order:", err);
            setError(err.message || "Error al guardar la orden.");
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadPDF = async () => {
        try {
            const mill = options.mills.find(m => m.mill_id === formData.mill_id) || {};
            const crew = options.crews.find(c => String(c.crew_id) === String(formData.crew_id)) || {};
            
            // Get pump info if exists
            let pumpInfo = null;
            if (formData.pump_id_to_install || formData.pump_id_to_remove || formData.pump_procedure_type) {
                const pumpIds = [];
                if (formData.pump_id_to_install) pumpIds.push(formData.pump_id_to_install);
                if (formData.pump_id_to_remove && formData.pump_id_to_remove !== formData.pump_id_to_install) pumpIds.push(formData.pump_id_to_remove);
                
                let pumpInstall = null;
                let pumpRemove = null;

                if (pumpIds.length > 0) {
                    const { data: pumps } = await supabase.from('pump').select('pump_id, serial_number, model').in('pump_id', pumpIds);
                    if (pumps) {
                        pumpInstall = pumps.find(p => String(p.pump_id) === String(formData.pump_id_to_install));
                        pumpRemove = pumps.find(p => String(p.pump_id) === String(formData.pump_id_to_remove));
                    }
                }

                let operation = '';
                if (formData.pump_id_to_install && formData.pump_id_to_remove && formData.pump_id_to_install === formData.pump_id_to_remove) {
                    operation = 'Reparación de Misma Bomba';
                } else if (formData.pump_id_to_install && formData.pump_id_to_remove) {
                    operation = 'Cambio de Bomba';
                } else if (formData.pump_id_to_install) {
                    operation = 'Instalación de Bomba';
                } else if (formData.pump_id_to_remove) {
                    operation = 'Desinstalación de Bomba';
                } else if (formData.pump_procedure_type === 'reparacion_bomba') {
                    operation = 'Reparación de Bomba';
                } else if (formData.pump_procedure_type === 'bomba_nueva') {
                    operation = 'Instalación de Bomba Nueva';
                } else if (formData.pump_procedure_type === 'bomba_sena') {
                    operation = 'Instalación Bomba SENA';
                } else {
                    operation = 'Operación de Bomba';
                }

                pumpInfo = {
                    operation,
                    install: pumpInstall,
                    remove: pumpRemove,
                    procedure_type: formData.pump_procedure_type
                };
            }

            await WorkOrderFormatGenerator.generatePDF(mill, millSystems, { ...formData, pumpInfo }, crew);
        } catch (err) {
            console.error("Error generating PDF:", err);
            alert("Hubo un error al generar el PDF.");
        }
    };

    const handleTransitionToInProgress = async () => {
        try {
            // Check if crew assignment is required (if tools or safety equipment are used)
            const hasTools = formData.tools && formData.tools.some(t => t.tool_id);
            const hasSafety = formData.safety && formData.safety.some(s => s.safety_id);

            if ((hasTools || hasSafety) && !formData.crew_id) {
                setError("Debe asignar una Cuadrilla Responsable para iniciar la orden con herramientas o EPP.");
                return;
            }

            setSaving(true);
            setError(null);

            // 1. Auto-save first to ensure DB has latest requirements
            await saveWorkOrder();

            // 2. Perform transition check and update
            await WorkOrderService.transitionToInProgress(orderId);

            // 3. Reload to get updated status
            await loadAllData();
        } catch (err) {
            console.error("Error transitioning to IN_PROGRESS:", err);
            setError(err.message || "Error al iniciar la orden");
        } finally {
            setSaving(false);
        }
    };

    const handleTransitionToCompleted = () => {
        // Validate components have been reported
        if (formData.components.length === 0) {
            setError("Debe reportar el estado de los componentes antes de completar");
            return;
        }

        const hasUnreportedComponents = formData.components.some(c => !c.status || c.status === 'FUNCIONAL');
        if (hasUnreportedComponents) {
            const confirmed = window.confirm("Algunos componentes no han sido revisados. ¿Desea continuar?");
            if (!confirmed) return;
        }

        // Show completion modal instead of completing directly
        setShowCompletionModal(true);
    };

    const handleConfirmCompletion = async () => {
        if (!completionNotes || completionNotes.trim().length === 0) {
            setError('Las notas de finalización son obligatorias');
            return;
        }

        try {
            setSaving(true);
            setError(null);

            // 1. UI STOCK VALIDATION (Pre-flight check)
            const insufficientItems = [];

            // Check Pieces
            formData.pieces.forEach(item => {
                if (!item.piece_id) return;
                const opt = options.pieces.find(p => p.piece_id == item.piece_id);
                const currentStock = opt ? (opt.available_stock || 0) : 0;
                // If editing, we might need to account for what we already hold? 
                // But available_stock usually excludes held items? 
                // Actually, our API returns "current_stock". 
                // If we are strictly checking, let's assume UI knows best.
                // NOTE: If the user is increasing quantity, they need MORE stock.
                if (item.quantity_used > currentStock) {
                    insufficientItems.push(`${opt?.name || 'Pieza'} (Req: ${item.quantity_used}, Disp: ${currentStock})`);
                }
            });

            // Check Materials
            formData.materials.forEach(item => {
                if (!item.material_id) return;
                const opt = options.materials.find(m => m.material_id == item.material_id);
                const currentStock = opt ? (opt.available_stock || 0) : 0;
                if (item.quantity_used > currentStock) {
                    insufficientItems.push(`${opt?.name || 'Material'} (Req: ${item.quantity_used}, Disp: ${currentStock})`);
                }
            });

            if (insufficientItems.length > 0) {
                throw new Error("No hay suficiente stock para completar la orden:\n" + insufficientItems.join("\n"));
            }

            // 2. SAVE CHANGES (Trigger DB Constraints)
            await saveWorkOrder();

            // 3. COMPLETE ORDER
            await WorkOrderService.completeWorkOrder(orderId, completionNotes);

            setShowCompletionModal(false);
            setCompletionNotes('');
            // Reload to get updated status
            await loadAllData();
        } catch (err) {
            console.error("Error completing work order:", err);
            setError(err.message || "Error al completar la orden");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteOrder = async () => {
        const confirmed = window.confirm(
            "⚠️ ADVERTENCIA: Esto eliminará completamente la orden y todos sus datos asociados. " +
            "Si la orden está en progreso, se liberarán todas las herramientas y EPP asignados. " +
            "\n\n¿Está seguro de que desea eliminar esta orden?"
        );

        if (!confirmed) return;

        try {
            setSaving(true);
            setError(null);
            await WorkOrderService.deleteWorkOrder(orderId);
            // Go back to list after successful deletion
            onBack();
        } catch (err) {
            console.error("Error deleting work order:", err);
            setError(err.message || "Error al eliminar la orden");
        } finally {
            setSaving(false);
        }
    };

    // Helper to generic add/remove items from lists
    const addListItem = (listName, defaultItem) => {
        setFormData(prev => ({
            ...prev,
            [listName]: [...prev[listName], { ...defaultItem, tempId: Math.random() }]
        }));
    };

    const removeListItem = (listName, index) => {
        setFormData(prev => ({
            ...prev,
            [listName]: prev[listName].filter((_, i) => i !== index)
        }));
    };

    const updateListItem = (listName, index, field, value) => {
        setFormData(prev => {
            const newList = [...prev[listName]];
            newList[index] = { ...newList[index], [field]: value };
            return { ...prev, [listName]: newList };
        });
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando formulario...</div>;

    const TabButton = ({ id, icon: Icon, label, count }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items - center gap - 2 px - 4 py - 3 font - medium transition - all relative ${activeTab === id
                ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                } `}
        >
            <Icon size={18} />
            {label}
            {count > 0 && (
                <span className="bg-slate-200 text-slate-600 text-xs px-1.5 py-0.5 rounded-full font-bold ml-1">
                    {count}
                </span>
            )}
        </button>
    );

    return (
        <div className="space-y-6 animate-slide-up pb-20">
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                        <X size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">
                            {isEditing ? `Editar Orden` : 'Nueva Orden de Trabajo'}
                        </h1>
                        <p className="text-sm text-slate-500">
                            {isEditing ? 'Modifique los detalles de la orden existente.' : 'Complete la información para crear una nueva orden.'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {error && (
                        <div className="text-red-600 text-sm font-medium flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-lg">
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}

                    {/* Delete Button - Show only if editing existing order */}
                    {isEditing && (
                        <button
                            onClick={handleDeleteOrder}
                            disabled={saving}
                            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-red-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            <Trash2 size={20} />
                            {saving ? 'Eliminando...' : 'Eliminar Orden'}
                        </button>
                    )}

                    {/* STATE TRANSITION BUTTONS */}
                    {isEditing && formData.status === 'PENDING' && canStart && (
                        <button
                            onClick={handleTransitionToInProgress}
                            disabled={saving}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-green-500/30 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                        >
                            <Activity size={20} />
                            Iniciar Orden
                        </button>
                    )}

                    {isEditing && formData.status === 'PENDING' && !canStart && requirements.length > 0 && (
                        <div className="text-orange-600 text-sm font-medium flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg">
                            <AlertTriangle size={16} />
                            Faltan {requirements.filter(r => r.status === 'PENDING').length} recursos
                        </div>
                    )}

                    {isEditing && formData.status === 'IN_PROGRESS' && (
                        <button
                            onClick={handleTransitionToCompleted}
                            disabled={saving}
                            className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                        >
                            <CheckCircle size={20} />
                            Completar Orden
                        </button>
                    )}

                    {isEditing && (
                        <button
                            onClick={handleDownloadPDF}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-bold border border-slate-300 flex items-center gap-2 transition-all active:scale-95"
                        >
                            <Download size={20} />
                            Descargar PDF
                        </button>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                        {saving ? <Activity className="animate-spin" /> : <Save size={20} />}
                        {isEditing ? 'Guardar Cambios' : 'Crear Orden'}
                    </button>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex overflow-x-auto">
                <TabButton id="general" icon={FileText} label="Información General" />
                {/* Recursos y EPP ocultos temporalmente
                <TabButton id="resources" icon={Package} label="Recursos y Materiales" count={stats.resources} />
                <TabButton id="safety" icon={Shield} label="Seguridad (EPP)" count={stats.safety} />
                */}
                <TabButton id="components" icon={Activity} label="Estado de Componentes" />
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[400px]">

                {/* 1. GENERAL TAB */}
                {activeTab === 'general' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {/* AI Assistant - only for creation */}
                        {!isEditing && (
                            <div className="col-span-2">
                                <AiAssistantPanel
                                    modalType="work_order"
                                    onApplyFields={handleAiApplyFields}
                                />
                            </div>
                        )}

                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Código (Auto-generado)</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-100 border border-slate-300 rounded-xl outline-none text-slate-600 font-bold"
                                value={formData.code || 'N/A'}
                                disabled
                                readOnly
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Descripción Corta / Título</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                                placeholder="Ej: Reparación de Bomba Principal"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Diagnóstico Inicial</label>
                            <textarea
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[80px]"
                                placeholder="Diagnóstico previo o razón detallada de la orden..."
                                value={formData.diagnosis}
                                onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Molino</label>
                            <select
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                value={formData.mill_id}
                                onChange={e => setFormData({ ...formData, mill_id: e.target.value })}
                                disabled={isEditing} // Prevent changing mill on edit to avoid component mismatch logic complexity
                            >
                                <option value="">Seleccione un molino...</option>
                                {options.mills.map(m => (
                                    <option key={m.mill_id} value={m.mill_id}>{m.code} - {m.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Cuadrilla Responsable</label>
                            <select
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                value={formData.crew_id}
                                onChange={e => setFormData({ ...formData, crew_id: e.target.value })}
                            >
                                <option value="">Sin asignar...</option>
                                {options.crews.map(c => (
                                    <option key={c.crew_id} value={c.crew_id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col justify-end pb-2">
                            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500"
                                    checked={formData.is_reintervention}
                                    onChange={e => setFormData({ ...formData, is_reintervention: e.target.checked })}
                                />
                                <span className="font-bold text-slate-700">Es Reintervención</span>
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Orden</label>
                            <select
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none capitalize"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                {['preventivo', 'correctivo', 'emergencia', 'mejora'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Prioridad</label>
                            <select
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                            >
                                <option value="LOW">Baja (Low)</option>
                                <option value="MEDIUM">Media (Medium)</option>
                                <option value="HIGH">Alta (High)</option>
                                <option value="CRITICAL">Crítica (Critical)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Estado Actual</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-100 border border-slate-300 rounded-xl outline-none text-slate-600 font-bold uppercase"
                                value={formData.status}
                                disabled
                                readOnly
                            />
                            <p className="text-xs text-slate-500 mt-1">Use los botones de transición para cambiar el estado</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Programada</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                value={formData.scheduled_date}
                                onChange={e => setFormData({ ...formData, scheduled_date: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Inicio Real</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                value={formData.start_date}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Fin Real</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                value={formData.end_date}
                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Reporte Final</label>
                            <textarea
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[100px]"
                                placeholder="Resumen de labores realizadas, hallazgos, conclusiones y recomendaciones..."
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Observaciones Finales</label>
                            <textarea
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[100px]"
                                placeholder="Observaciones o notas de cierre de la OT..."
                                value={formData.final_observations}
                                onChange={e => setFormData({ ...formData, final_observations: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">URL del Reporte (Externo)</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-brand-600 underline"
                                placeholder="https://..."
                                value={formData.report_url}
                                onChange={e => setFormData({ ...formData, report_url: e.target.value })}
                            />
                        </div>

                        {/* PUMP OPERATIONS SECTION */}
                        <div className="col-span-2 border-t-2 border-slate-200 pt-6 mt-4">
                            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                                <Activity size={20} className="text-brand-500" />
                                Operaciones de Bomba
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Bomba a Instalar</label>
                                    <select
                                        className={`w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none ${repairSamePump ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`}
                                        value={formData.pump_id_to_install || ''}
                                        onChange={e => {
                                            const newPumpId = e.target.value || null;

                                            setFormData(prev => {
                                                const updates = { ...prev, pump_id_to_install: newPumpId };

                                                // Auto-select pump to remove if installing a different one
                                                if (newPumpId && prev.mill_id && !repairSamePump) {
                                                    const selectedMill = options.mills.find(m => m.mill_id == prev.mill_id);
                                                    if (selectedMill?.active_pump?.pump_id && selectedMill.active_pump.pump_id != newPumpId) {
                                                        // Only set if not already set or override? User request implies "automatically select"
                                                        // We will set it ensuring we don't overwrite if manual change was intended, 
                                                        // but typically this is a helper. Let's set it.
                                                        updates.pump_id_to_remove = selectedMill.active_pump.pump_id;
                                                    }
                                                }
                                                return updates;
                                            });
                                        }}
                                        disabled={repairSamePump}
                                    >
                                        <option value="">Ninguna...</option>
                                        {options.pumpsForInstall.map(p => (
                                            <option key={p.pump_id} value={p.pump_id}>
                                                {p.serial_number} - {p.model} ({p.status})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center pt-6">
                                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-bold text-sm bg-brand-50 px-3 py-2 rounded-lg border border-brand-100 hover:bg-brand-100 transition-colors">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                                            checked={repairSamePump}
                                            onChange={(e) => {
                                                const isChecked = e.target.checked;
                                                setRepairSamePump(isChecked);

                                                if (isChecked) {
                                                    let pumpIdToUse = formData.pump_id_to_remove;

                                                    // If no pump selected to remove, try to find active pump from mill
                                                    if (!pumpIdToUse && formData.mill_id) {
                                                        const selectedMill = options.mills.find(m => m.mill_id == formData.mill_id);
                                                        console.log("PumpLogic: Selected Mill for Repair:", selectedMill);
                                                        if (selectedMill && selectedMill.active_pump) {
                                                            console.log("PumpLogic: Found Active Pump:", selectedMill.active_pump);
                                                            pumpIdToUse = selectedMill.active_pump.pump_id;

                                                            // CRITICAL FIX: Ensure this pump is in the "Install" options so the value is valid
                                                            // We check if it's already there
                                                            const alreadyInInstall = options.pumpsForInstall.find(p => p.pump_id == pumpIdToUse);
                                                            if (!alreadyInInstall) {
                                                                // Add it temporarily to options so the select can show it
                                                                const pumpDetails = selectedMill.active_pump.pump || {};
                                                                const tempOption = {
                                                                    pump_id: pumpIdToUse,
                                                                    serial_number: pumpDetails.serial_number || 'Unknown',
                                                                    model: pumpDetails.model || 'Unknown',
                                                                    status: 'REINSTALACIÓN' // Special label
                                                                };
                                                                // Update options state to include this pump (with dedupe)
                                                                setOptions(prev => {
                                                                    if (prev.pumpsForInstall.some(p => p.pump_id === tempOption.pump_id)) {
                                                                        return prev;
                                                                    }
                                                                    return {
                                                                        ...prev,
                                                                        pumpsForInstall: [...prev.pumpsForInstall, tempOption]
                                                                    };
                                                                });
                                                            }
                                                        } else {
                                                            console.warn("PumpLogic: No active pump found on mill", selectedMill);
                                                        }
                                                    }

                                                    if (pumpIdToUse) {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            pump_id_to_remove: pumpIdToUse,
                                                            pump_id_to_install: pumpIdToUse
                                                        }));
                                                    } else {
                                                        // If no pump could be auto-filled, ensure the checkbox is unchecked
                                                        // to prevent a misleading state.
                                                        setRepairSamePump(false);
                                                        alert("No se pudo auto-seleccionar una bomba para reparar. Asegúrese de que el molino tenga una bomba activa o seleccione una bomba a remover manualmente.");
                                                    }
                                                } else {
                                                    // If unchecked, clear both pump fields if they were set by this logic
                                                    // (or if user wants to clear them)
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        pump_id_to_remove: null,
                                                        pump_id_to_install: null
                                                    }));
                                                }
                                            }}
                                        />
                                        <span>Reparación de misma bomba (Desinstalar e Instalar)</span>
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Bomba a Remover</label>
                                    <select
                                        className={`w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none ${repairSamePump ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`}
                                        value={formData.pump_id_to_remove || ''}
                                        onChange={e => setFormData({ ...formData, pump_id_to_remove: e.target.value || null })}
                                        disabled={repairSamePump}
                                    >
                                        <option value="">Ninguna...</option>
                                        {options.pumpsForRemoval.map(p => (
                                            <option key={p.pump_id} value={p.pump_id}>
                                                {p.serial_number} - {p.model}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Procedimiento (Si no hay bomba asignada)</label>
                                    <select
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                        value={formData.pump_procedure_type || ''}
                                        onChange={e => setFormData({ ...formData, pump_procedure_type: e.target.value })}
                                        disabled={repairSamePump || !!formData.pump_id_to_install || !!formData.pump_id_to_remove}
                                    >
                                        <option value="">Ninguno / No Aplica</option>
                                        <option value="reparacion_bomba">Reparación de bomba</option>
                                        <option value="bomba_nueva">Instalación de bomba nueva</option>
                                        <option value="bomba_sena">Instalación bomba fabricación SENA</option>
                                    </select>
                                    <p className="text-xs text-slate-500 mt-1">Úselo cuando el molino no tiene bomba en sistema pero se realizó una labor.</p>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Notas de Instalación / Remoción</label>
                                    <textarea
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[80px]"
                                        placeholder="Detalles sobre la instalación o remoción de la bomba..."
                                        value={formData.pump_installation_notes}
                                        onChange={e => setFormData({ ...formData, pump_installation_notes: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. RESOURCES TAB */}
                {activeTab === 'resources' && (
                    <div className="space-y-8">
                        {/* Pieces Section */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    <Package size={20} className="text-orange-500" />
                                    Piezas (Repuestos)
                                </h3>
                                <button
                                    onClick={() => addListItem('pieces', { piece_id: '', quantity_used: 1 })}
                                    className="text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <Plus size={14} /> Agregar Pieza
                                </button>
                            </div>

                            {formData.pieces.length === 0 && <div className="text-sm text-slate-400 italic">No hay piezas asignadas.</div>}

                            <div className="grid gap-3">
                                {formData.pieces.map((item, idx) => {
                                    // Lookup stock for this piece (Use == for ID comparison)
                                    const pieceOption = options.pieces.find(p => p.piece_id == item.piece_id);
                                    const availableStock = pieceOption ? (pieceOption.available_stock || 0) : 0;
                                    const isSufficient = availableStock >= item.quantity_used;

                                    return (
                                        <div key={item.tempId || idx} className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm animate-in fade-in">
                                            <select
                                                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                                                value={item.piece_id}
                                                onChange={(e) => updateListItem('pieces', idx, 'piece_id', e.target.value)}
                                            >
                                                <option value="">Seleccione pieza...</option>
                                                {options.pieces.map(p => {
                                                    const stockLabel = p.available_stock !== undefined ? ` (Stock: ${p.available_stock})` : '';
                                                    return (
                                                        <option key={p.piece_id} value={p.piece_id}>
                                                            {p.code} - {p.name}{stockLabel}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                                                placeholder="Cant."
                                                value={item.quantity_used}
                                                onChange={(e) => updateListItem('pieces', idx, 'quantity_used', e.target.value)}
                                            />
                                            {/* Stock Status Indicator */}
                                            {item.piece_id && (
                                                <div className={`text-xs px-2 py-1 rounded-lg font-bold whitespace-nowrap ${isSufficient
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    Stock: {availableStock}
                                                </div>
                                            )}
                                            <button onClick={() => removeListItem('pieces', idx)} className="text-slate-400 hover:text-red-500 p-1">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Materials Section */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    <Package size={20} className="text-brand-500" />
                                    Materiales (Consumibles)
                                </h3>
                                <button
                                    onClick={() => addListItem('materials', { material_id: '', quantity_used: 1 })}
                                    className="text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <Plus size={14} /> Agregar Material
                                </button>
                            </div>

                            {formData.materials.length === 0 && <div className="text-sm text-slate-400 italic">No hay materiales asignados.</div>}

                            <div className="grid gap-3">
                                {formData.materials.map((item, idx) => {
                                    // Lookup stock for this material (Use == for ID comparison)
                                    const materialOption = options.materials.find(m => m.material_id == item.material_id);
                                    const availableStock = materialOption ? (materialOption.available_stock || 0) : 0;
                                    const isSufficient = availableStock >= item.quantity_used;

                                    return (
                                        <div key={item.tempId || idx} className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm animate-in fade-in">
                                            <select
                                                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                                                value={item.material_id}
                                                onChange={(e) => updateListItem('materials', idx, 'material_id', e.target.value)}
                                            >
                                                <option value="">Seleccione material...</option>
                                                {options.materials.map(m => {
                                                    const stockLabel = m.available_stock !== undefined ? ` (Stock: ${m.available_stock})` : '';
                                                    return (
                                                        <option key={m.material_id} value={m.material_id}>
                                                            {m.code} - {m.name}{stockLabel}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                                                placeholder="Cant."
                                                value={item.quantity_used}
                                                onChange={(e) => updateListItem('materials', idx, 'quantity_used', e.target.value)}
                                            />
                                            {/* Stock Status Indicator */}
                                            {item.material_id && (
                                                <div className={`text-xs px-2 py-1 rounded-lg font-bold whitespace-nowrap ${isSufficient
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    Stock: {availableStock}
                                                </div>
                                            )}
                                            <button onClick={() => removeListItem('materials', idx)} className="text-slate-400 hover:text-red-500 p-1">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Tools Section */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    <Wrench size={20} className="text-slate-500" />
                                    Herramientas (Reservas)
                                </h3>
                                <button
                                    onClick={() => addListItem('tools', { tool_id: '', quantity: 1 })}
                                    className="text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <Plus size={14} /> Reservar Herramienta
                                </button>
                            </div>

                            {formData.tools.length === 0 && <div className="text-sm text-slate-400 italic">No hay herramientas reservadas.</div>}

                            <div className="grid gap-3">
                                {formData.tools.map((item, idx) => {
                                    // Lookup stock for this tool (Use == for ID comparison)
                                    const toolOption = options.tools.find(t => t.tool_id == item.tool_id);
                                    const availableStock = toolOption ? (toolOption.available_stock || 0) : 0;
                                    const isSufficient = availableStock >= item.quantity;

                                    return (
                                        <div key={item.tempId || idx} className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm animate-in fade-in">
                                            <select
                                                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                                                value={item.tool_id}
                                                onChange={(e) => updateListItem('tools', idx, 'tool_id', e.target.value)}
                                            >
                                                <option value="">Seleccione herramienta...</option>
                                                {options.tools.map(t => {
                                                    const stockLabel = t.available_stock !== undefined ? ` (Stock: ${t.available_stock})` : '';
                                                    return (
                                                        <option key={t.tool_id} value={t.tool_id}>
                                                            {t.code} - {t.name}{stockLabel}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                                                placeholder="Cant."
                                                value={item.quantity}
                                                onChange={(e) => updateListItem('tools', idx, 'quantity', e.target.value)}
                                            />
                                            {/* Stock Status Indicator */}
                                            {item.tool_id && (
                                                <div className={`text-xs px-2 py-1 rounded-lg font-bold whitespace-nowrap ${isSufficient
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    Stock: {availableStock}
                                                </div>
                                            )}
                                            <button onClick={() => removeListItem('tools', idx)} className="text-slate-400 hover:text-red-500 p-1">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                )}

                {/* 3. SAFETY TAB */}
                {activeTab === 'safety' && (
                    <div className="space-y-6">
                        <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl flex gap-3 text-yellow-800 text-sm mb-6">
                            <AlertTriangle className="shrink-0" size={20} />
                            <p>Asegúrese de registrar todo el Equipo de Protección Personal (EPP) y elementos de seguridad necesarios para esta labor. Los supervisores verificarán esta lista.</p>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    <Shield size={20} className="text-emerald-500" />
                                    Requerimientos de Seguridad
                                </h3>
                                <button
                                    onClick={() => addListItem('safety', { safety_id: '', quantity_required: 1 })}
                                    className="text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <Plus size={14} /> Agregar EPP
                                </button>
                            </div>

                            {formData.safety.length === 0 && <div className="text-sm text-slate-400 italic">No hay requerimientos de seguridad asignados.</div>}

                            <div className="grid gap-3">
                                {formData.safety.map((item, idx) => {
                                    // Lookup stock for this safety item (Use == for ID comparison)
                                    const safetyOption = options.safety.find(s => s.safety_id == item.safety_id);
                                    const availableStock = safetyOption ? (safetyOption.available_stock || 0) : 0;
                                    const isSufficient = availableStock >= item.quantity_required;

                                    return (
                                        <div key={item.tempId || idx} className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm animate-in fade-in">
                                            <select
                                                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                                                value={item.safety_id}
                                                onChange={(e) => updateListItem('safety', idx, 'safety_id', e.target.value)}
                                            >
                                                <option value="">Seleccione EPP...</option>
                                                {options.safety.map(s => {
                                                    const stockLabel = s.available_stock !== undefined ? ` (Stock: ${s.available_stock})` : '';
                                                    return (
                                                        <option key={s.safety_id} value={s.safety_id}>
                                                            {s.name} - {s.code}{stockLabel}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                                                placeholder="Cant."
                                                value={item.quantity_required}
                                                onChange={(e) => updateListItem('safety', idx, 'quantity_required', e.target.value)}
                                            />
                                            {/* Stock Status Indicator */}
                                            {item.safety_id && (
                                                <div className={`text-xs px-2 py-1 rounded-lg font-bold whitespace-nowrap ${isSufficient
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    Stock: {availableStock}
                                                </div>
                                            )}
                                            <button onClick={() => removeListItem('safety', idx)} className="text-slate-400 hover:text-red-500 p-1">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. COMPONENTS TAB — identical structure to DiagnosisForm */}
                {activeTab === 'components' && (
                    <div className="space-y-6">
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex gap-3 text-slate-600 text-sm mb-6">
                            <Activity className="shrink-0" size={20} />
                            <p>Reporte de estado agrupado por sistemas. Revise las imágenes de referencia e indique el estado de cada componente. Se guardará al presionar <strong>Guardar Cambios</strong>.</p>
                        </div>

                        {millSystems.length === 0 && (
                            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                                {formData.mill_id ? 'Cargando sistemas...' : 'Seleccione un molino para cargar componentes.'}
                            </div>
                        )}

                        <div className="space-y-8">
                            {millSystems.map((sys) => (
                                <div key={sys.component_id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                    {/* System Header */}
                                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold font-mono text-brand-600 bg-brand-50 px-2 py-0.5 rounded">{sys.code}</span>
                                            <h3 className="font-bold text-slate-800 text-lg">{sys.name}</h3>
                                        </div>
                                    </div>

                                    {/* Split layout: table left, images right (same as DiagnosisForm) */}
                                    <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                                        <div className="flex-1 overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-white text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-6 py-3 w-1/3">Componente</th>
                                                        <th className="px-6 py-3 w-1/4">Estado</th>
                                                        <th className="px-6 py-3">Observaciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {sys.components?.map((sysComp) => {
                                                        const idx = formData.components.findIndex(c => c.component_id === sysComp.component_id);
                                                        if (idx === -1) return null;
                                                        const comp = formData.components[idx];
                                                        return (
                                                            <tr key={comp.component_id} className="hover:bg-slate-50">
                                                                <td className="px-6 py-4 font-medium text-slate-700">
                                                                    {comp.name || sysComp.name}
                                                                    {(comp.code || sysComp.code) && <span className="ml-2 text-xs text-slate-400 font-mono">{comp.code || sysComp.code}</span>}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <select
                                                                        className={`w-full px-3 py-2 rounded-lg border text-sm font-bold uppercase ${{
                                                                            'FUNCIONAL':         'bg-green-50 border-green-200 text-green-700',
                                                                            'DESGASTADO':        'bg-yellow-50 border-yellow-200 text-yellow-700',
                                                                            'REQUIERE_REVISION': 'bg-brand-50 border-brand-200 text-brand-700',
                                                                            'DANADO':            'bg-red-50 border-red-200 text-red-700',
                                                                            'FALTANTE':          'bg-slate-200 border-slate-300 text-slate-600',
                                                                            'NO_REVISADO':       'bg-slate-100 border-slate-200 text-slate-500'
                                                                        }[comp.status] || 'bg-slate-50 border-slate-200 text-slate-700'}`}
                                                                        value={comp.status || 'NO_REVISADO'}
                                                                        onChange={(e) => updateListItem('components', idx, 'status', e.target.value)}
                                                                    >
                                                                        <option value="FUNCIONAL">Funcional</option>
                                                                        <option value="DESGASTADO">Desgastado</option>
                                                                        <option value="REQUIERE_REVISION">Req. Revisión</option>
                                                                        <option value="DANADO">Dañado</option>
                                                                        <option value="FALTANTE">Faltante</option>
                                                                        <option value="NO_REVISADO">No Revisado</option>
                                                                    </select>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <textarea
                                                                        className="w-full bg-slate-50 border border-slate-200 focus:border-brand-300 rounded-lg outline-none text-slate-600 placeholder:text-slate-300 text-sm px-3 py-2 min-h-[60px]"
                                                                        placeholder="Observación..."
                                                                        value={comp.observation || ''}
                                                                        onChange={(e) => updateListItem('components', idx, 'observation', e.target.value)}
                                                                    />
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {(!sys.components || sys.components.length === 0) && (
                                                        <tr>
                                                            <td colSpan="3" className="px-6 py-4 text-sm text-slate-400 italic">No hay componentes en este sistema.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>

                                            {/* Observación general del sistema — red border */}
                                            <div className="p-4 border-t border-slate-200 bg-slate-50">
                                                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Observación general del sistema ({sys.name})</label>
                                                <textarea
                                                    className="w-full bg-white border-4 border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-500/20 rounded-lg outline-none text-slate-700 text-sm px-4 py-3 min-h-[80px]"
                                                    placeholder="Escriba aquí las observaciones generales sobre el estado de todo el sistema..."
                                                    value={formData.system_observations?.[sys.component_id] || ''}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        system_observations: {
                                                            ...prev.system_observations,
                                                            [sys.component_id]: e.target.value
                                                        }
                                                    }))}
                                                />
                                            </div>
                                        </div>

                                        {/* Reference images panel — identical to DiagnosisForm */}
                                        {sys.photo_urls && sys.photo_urls.length > 0 && (
                                            <div className="w-full lg:w-1/3 p-6 bg-slate-50/50">
                                                <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-4">
                                                    Imágenes de Referencia
                                                </h4>
                                                <div className="flex flex-col gap-4">
                                                    {sys.photo_urls.map((url, i) => (
                                                        <a href={url} target="_blank" rel="noopener noreferrer" key={i} className="block bg-slate-900 rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                                            <img src={url} alt={`Referencia ${i}`} className="w-full h-auto max-h-[600px] object-contain hover:scale-[1.02] transition-transform duration-300" />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}


            </div>
            {/* Completion Modal */}
            {showCompletionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-in fade-in zoom-in">
                        <div className="flex items-center gap-3 mb-4">
                            <CheckCircle size={28} className="text-green-500" />
                            <h2 className="text-2xl font-bold text-slate-800">Finalizar Orden de Trabajo</h2>
                        </div>

                        <p className="text-slate-600 mb-6">
                            Por favor, escriba las notas conclusivas de esta orden de trabajo.
                            Esta información quedará registrada permanentemente.
                        </p>

                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Notas Conclusivas <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={completionNotes}
                                onChange={(e) => setCompletionNotes(e.target.value)}
                                placeholder="Ejemplo: Se completó el mantenimiento preventivo del molino. Se reemplazaron 3 aspas desgastadas y se lubricaron todos los rodamientos. El molino quedó operativo y funcional."
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 min-h-[120px]"
                                rows={5}
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                Mínimo requerido: Descripción clara del trabajo realizado
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
                                <AlertTriangle size={20} />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowCompletionModal(false);
                                    setCompletionNotes('');
                                    setError(null);
                                }}
                                disabled={saving}
                                className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmCompletion}
                                disabled={saving || !completionNotes.trim()}
                                className="px-6 py-2.5 rounded-xl font-bold text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                                <CheckCircle size={20} />
                                {saving ? 'Finalizando...' : 'Finalizar Orden'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
