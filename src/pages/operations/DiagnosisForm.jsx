import React, { useState, useEffect } from 'react';
import {
    Save, X, Calendar, User, Briefcase, FileText,
    Package, Wrench, Shield, Activity, Plus, Trash2,
    AlertTriangle, CheckCircle, Search, Thermometer, Zap
} from 'lucide-react';
import { DiagnosisService } from '../../services/diagnosis';
import { MillService } from '../../services/mills';
import { CrewService } from '../../services/crews';
import { WorkOrderService } from '../../services/work_orders';
import { supabase } from '../../services/supabase';

export default function DiagnosisForm({ diagnosisId, onBack }) {
    // Mode
    const isEditing = !!diagnosisId;

    // View State
    const [activeTab, setActiveTab] = useState('general'); // general, findings, resources, safety, components, pump
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
        pumps: []
    });

    // Additional Diagnosis Data
    const [requirements, setRequirements] = useState([]);
    const [canStart, setCanStart] = useState(false);

    // Stock Levels for Real-Time Availability Display
    const [stockLevels, setStockLevels] = useState({
        pieces: {},    // { piece_id: { current_stock, name } }
        materials: {}, // { material_id: { quantity_available, name } }
        tools: {},     // { tool_id: { quantity_available, name } }
        safety: {}     // { safety_id: { quantity_available, name } }
    });

    // Form Stats (for badge counts)
    const [stats, setStats] = useState({
        resources: 0,
        safety: 0
    });

    // Form Data
    const [formData, setFormData] = useState({
        // Basic Info
        mill_id: '',
        crew_id: '',
        pump_id: null, // Optional link to specific pump
        diagnosis_type: 'PREVENTIVO', // PREVENTIVO, CORRECTIVO, PREDICTIVO
        priority: 'MEDIA', // BAJA, MEDIA, ALTA, URGENTE
        severity: 'LEVE', // LEVE, MODERADO, CRITICO
        status: 'PENDING', // PENDING, IN_PROGRESS, COMPLETED, CANCELLED
        description: '',
        diagnosis_date: '',
        scheduled_date: '',

        // Technical Findings (Tab 2)
        technical_findings: '',
        root_cause_analysis: '',
        recommendations: '',

        // Pump Condition (Tab 6)
        pump_condition: '', // BUENO, REGULAR, MALO, CRITICO
        pump_observations: '',

        // General Notes
        notes: '',

        // Relations (Resources & Safety - same as work_order)
        pieces: [],     // { piece_id, quantity_required, tempId? }
        materials: [],  // { material_id, quantity_required, tempId? }
        tools: [],      // { tool_id, quantity, tempId? }
        safety: [],     // { safety_id, quantity_required, tempId? }

        // Enhanced Component Status (Tab 5)
        components: []  // { component_id, status, observation, wear_percentage, vibration_level, etc. }
    });

    // Load Data Effect
    useEffect(() => {
        loadAllData();
        loadStockLevels(); // Load stock for real-time display
    }, [diagnosisId]);

    // Recalculate stats when lists change
    useEffect(() => {
        setStats({
            resources: formData.pieces.length + formData.materials.length + formData.tools.length,
            safety: formData.safety.length
        });
    }, [formData.pieces, formData.materials, formData.tools, formData.safety]);

    // If Mill changes, load components (only for new diagnoses)
    useEffect(() => {
        if (!isEditing && formData.mill_id) {
            loadMillComponents(formData.mill_id);
        }
    }, [formData.mill_id, isEditing]);

    async function loadAllData() {
        try {
            setLoading(true);

            // 1. Load Options (Concurrent)
            const [mills, crews, inventory, pumps] = await Promise.all([
                MillService.getAllMills(),
                CrewService.getActiveCrews(),
                WorkOrderService.getInventoryOptions(), // Reuse same inventory
                WorkOrderService.getAvailablePumps(true) // All pumps for diagnosis linking
            ]);

            setOptions({
                mills,
                crews,
                ...inventory,
                pumps
            });

            // 2. Load Existing Diagnosis (if editing)
            if (isEditing) {
                const diagnosis = await DiagnosisService.getDiagnosisById(diagnosisId);
                console.log('Loaded Diagnosis:', diagnosis);

                // Extract requirements and canStart (same logic as work_order)
                setRequirements(diagnosis.requirements || []);
                setCanStart(!diagnosis.requirements || diagnosis.requirements.length === 0);

                // Map DB data to Form Structure
                setFormData({
                    mill_id: diagnosis.mill_id,
                    crew_id: diagnosis.crew_id || '',
                    pump_id: diagnosis.pump_id || null,
                    diagnosis_type: diagnosis.diagnosis_type,
                    priority: diagnosis.priority || 'MEDIA',
                    severity: diagnosis.severity || 'LEVE',
                    status: diagnosis.status,
                    code: diagnosis.code || '',
                    description: diagnosis.description || '',
                    diagnosis_date: diagnosis.diagnosis_date ? diagnosis.diagnosis_date.split('T')[0] : '',
                    completion_date: diagnosis.completion_date ? diagnosis.completion_date.split('T')[0] : '',
                    scheduled_date: diagnosis.scheduled_date ? diagnosis.scheduled_date.split('T')[0] : '',

                    // Technical Findings
                    technical_findings: diagnosis.technical_findings || '',
                    root_cause_analysis: diagnosis.root_cause_analysis || '',
                    recommendations: diagnosis.recommendations || '',

                    // Pump Condition
                    pump_condition: diagnosis.pump_condition || '',
                    pump_observations: diagnosis.pump_observations || '',

                    notes: diagnosis.notes || '',

                    pieces: diagnosis.pieces?.map(p => ({ ...p, tempId: Math.random() })) || [],
                    materials: diagnosis.materials?.map(m => ({ ...m, tempId: Math.random() })) || [],
                    tools: diagnosis.tools?.map(t => ({ ...t, tempId: Math.random() })) || [],
                    safety: diagnosis.safety?.map(s => ({ ...s, tempId: Math.random() })) || [],
                    components: diagnosis.components?.map(c => ({ ...c })) || []
                });

                // If no component status rows, fetch default from mill
                if (!diagnosis.components || diagnosis.components.length === 0) {
                    await loadMillComponents(diagnosis.mill_id);
                }
            }
        } catch (err) {
            console.error('Error loading data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    // Load Stock Levels for Real-Time Availability Display
    async function loadStockLevels() {
        try {
            const [piecesRes, materialsRes, toolsRes, safetyRes] = await Promise.all([
                supabase.from('piece').select('piece_id, name, code'),
                supabase.from('material').select('material_id, name, code'),
                supabase.from('tool').select('tool_id, name, code'),
                supabase.from('safety_equipment').select('safety_id, name, code')
            ]);

            // Get stock levels separately
            const [pieceStockRes, materialStockRes, toolStockRes, safetyStockRes] = await Promise.all([
                supabase.from('piece_stock').select('piece_id, current_stock'),
                supabase.from('material_stock').select('material_id, quantity_available'),
                supabase.from('tool_stock').select('tool_id, quantity_available'),
                supabase.from('safety_equipment_stock').select('safety_id, quantity_available')
            ]);

            // Merge names with stock levels
            const pieceStockMap = (pieceStockRes.data || []).reduce((acc, s) => {
                acc[s.piece_id] = s.current_stock;
                return acc;
            }, {});

            const materialStockMap = (materialStockRes.data || []).reduce((acc, s) => {
                acc[s.material_id] = s.quantity_available;
                return acc;
            }, {});

            const toolStockMap = (toolStockRes.data || []).reduce((acc, s) => {
                acc[s.tool_id] = s.quantity_available;
                return acc;
            }, {});

            const safetyStockMap = (safetyStockRes.data || []).reduce((acc, s) => {
                acc[s.safety_id] = s.quantity_available;
                return acc;
            }, {});

            // Create final lookup objects with names and stock
            const pieces = (piecesRes.data || []).reduce((acc, p) => {
                acc[p.piece_id] = {
                    name: p.name,
                    current_stock: pieceStockMap[p.piece_id] || 0
                };
                return acc;
            }, {});

            const materials = (materialsRes.data || []).reduce((acc, m) => {
                acc[m.material_id] = {
                    name: m.name,
                    quantity_available: materialStockMap[m.material_id] || 0
                };
                return acc;
            }, {});

            const tools = (toolsRes.data || []).reduce((acc, t) => {
                acc[t.tool_id] = {
                    name: t.name,
                    quantity_available: toolStockMap[t.tool_id] || 0
                };
                return acc;
            }, {});

            const safety = (safetyRes.data || []).reduce((acc, s) => {
                acc[s.safety_id] = {
                    name: s.name,
                    quantity_available: safetyStockMap[s.safety_id] || 0
                };
                return acc;
            }, {});

            setStockLevels({ pieces, materials, tools, safety });
        } catch (err) {
            console.error('Error loading stock levels:', err);
        }
    }

    async function loadMillComponents(millId) {
        if (!millId) return;
        try {
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
                        observation: '',
                        // Enhanced fields for diagnosis
                        wear_percentage: null,
                        vibration_level: null,
                        temperature_status: null,
                        noise_level: null,
                        lubrication_status: null,
                        requires_immediate_action: false,
                        estimated_remaining_life_days: null,
                        priority_for_replacement: null
                    }))
                };
            });
        } catch (e) {
            console.error("Error loading mill components", e);
        }
    }

    const handleSubmit = async () => {
        try {
            setSaving(true);
            setError(null);

            // === VALIDATION SECTION ===
            // 1. Basic validation
            if (!formData.description) throw new Error("La descripción es obligatoria");
            if (!formData.mill_id) throw new Error("El molino es obligatorio");

            // 2. VALIDATE FOR DUPLICATES
            const duplicates = [];

            const pieceIds = formData.pieces.map(p => p.piece_id).filter(Boolean);
            const duplicatePieces = pieceIds.filter((id, index) => pieceIds.indexOf(id) !== index);
            if (duplicatePieces.length > 0) {
                duplicatePieces.forEach(id => {
                    const piece = options.pieces.find(p => p.piece_id === parseInt(id));
                    duplicates.push(`Pieza: ${piece?.name || id}`);
                });
            }

            const materialIds = formData.materials.map(m => m.material_id).filter(Boolean);
            const duplicateMaterials = materialIds.filter((id, index) => materialIds.indexOf(id) !== index);
            if (duplicateMaterials.length > 0) {
                duplicateMaterials.forEach(id => {
                    const material = options.materials.find(m => m.material_id === parseInt(id));
                    duplicates.push(`Material: ${material?.name || id}`);
                });
            }

            const toolIds = formData.tools.map(t => t.tool_id).filter(Boolean);
            const duplicateTools = toolIds.filter((id, index) => toolIds.indexOf(id) !== index);
            if (duplicateTools.length > 0) {
                duplicateTools.forEach(id => {
                    const tool = options.tools.find(t => t.tool_id === parseInt(id));
                    duplicates.push(`Herramienta: ${tool?.name || id}`);
                });
            }

            const safetyIds = formData.safety.map(s => s.safety_id).filter(Boolean);
            const duplicateSafety = safetyIds.filter((id, index) => safetyIds.indexOf(id) !== index);
            if (duplicateSafety.length > 0) {
                duplicateSafety.forEach(id => {
                    const safety = options.safety.find(s => s.safety_id === parseInt(id));
                    duplicates.push(`EPP: ${safety?.name || id}`);
                });
            }

            if (duplicates.length > 0) {
                throw new Error(`❌ No se permiten recursos duplicados:\n${duplicates.join('\n')}`);
            }

            // 3. VALIDATE STOCK SUFFICIENCY (Only for IN_PROGRESS)
            // If PENDING, we allow "overdraft" (it becomes a requirement)
            const insufficient = [];

            if (formData.status === 'IN_PROGRESS') {
                formData.pieces.forEach(p => {
                    if (p.piece_id) {
                        const stock = stockLevels.pieces[p.piece_id];
                        const qty = parseInt(p.quantity_required) || 0;
                        if (stock && qty > stock.current_stock) {
                            insufficient.push(`• Pieza "${stock.name}": Necesita ${qty}, Disponible ${stock.current_stock}`);
                        }
                    }
                });

                formData.materials.forEach(m => {
                    if (m.material_id) {
                        const stock = stockLevels.materials[m.material_id];
                        const qty = parseFloat(m.quantity_required) || 0;
                        if (stock && qty > stock.quantity_available) {
                            insufficient.push(`• Material "${stock.name}": Necesita ${qty}, Disponible ${stock.quantity_available}`);
                        }
                    }
                });

                formData.tools.forEach(t => {
                    if (t.tool_id) {
                        const stock = stockLevels.tools[t.tool_id];
                        const qty = parseInt(t.quantity) || 0;
                        if (stock && qty > stock.quantity_available) {
                            insufficient.push(`• Herramienta "${stock.name}": Necesita ${qty}, Disponible ${stock.quantity_available}`);
                        }
                    }
                });

                formData.safety.forEach(s => {
                    if (s.safety_id) {
                        const stock = stockLevels.safety[s.safety_id];
                        const qty = parseInt(s.quantity_required) || 0;
                        if (stock && qty > stock.quantity_available) {
                            insufficient.push(`• EPP "${stock.name}": Necesita ${qty}, Disponible ${stock.quantity_available}`);
                        }
                    }
                });

                if (insufficient.length > 0) {
                    throw new Error(`❌ STOCK INSUFICIENTE (${insufficient.length} recurso(s)):\n\n${insufficient.join('\n')}`);
                }
            }

            // 4. DEDUPLICATE RESOURCES (safety net before save)
            // Even though we validated above, deduplicate to be extra safe
            const dedupePieces = Array.from(
                new Map(formData.pieces.map(p => [p.piece_id, p])).values()
            );
            const dedupeMaterials = Array.from(
                new Map(formData.materials.map(m => [m.material_id, m])).values()
            );
            const dedupeTools = Array.from(
                new Map(formData.tools.map(t => [t.tool_id, t])).values()
            );
            const dedupeSafety = Array.from(
                new Map(formData.safety.map(s => [s.safety_id, s])).values()
            );

            // Payload Construction
            const payload = {
                mill_id: formData.mill_id,
                crew_id: formData.crew_id || null,
                pump_id: formData.pump_id || null,
                diagnosis_type: formData.diagnosis_type,
                priority: formData.priority,
                severity: formData.severity,
                status: formData.status,
                description: formData.description,
                diagnosis_date: formData.diagnosis_date || null,
                scheduled_date: formData.scheduled_date || null,
                technical_findings: formData.technical_findings || null,
                root_cause_analysis: formData.root_cause_analysis || null,
                recommendations: formData.recommendations || null,
                pump_condition: formData.pump_condition || null,
                pump_observations: formData.pump_observations || null,
                notes: formData.notes || null,

                pieces: dedupePieces
                    .filter(p => p.piece_id) // Remove empty rows
                    .map(p => ({
                        piece_id: parseInt(p.piece_id),
                        quantity_required: parseFloat(p.quantity_required || p.quantity_used || 1)
                    })),
                materials: dedupeMaterials
                    .filter(m => m.material_id)
                    .map(m => ({
                        material_id: parseInt(m.material_id),
                        quantity_required: parseFloat(m.quantity_required || m.quantity_used || 1)
                    })),
                tools: dedupeTools
                    .filter(t => t.tool_id)
                    .map(t => ({
                        tool_id: parseInt(t.tool_id),
                        quantity: parseInt(t.quantity || 1)
                    })),
                safety: dedupeSafety
                    .filter(s => s.safety_id)
                    .map(s => ({
                        safety_id: parseInt(s.safety_id),
                        quantity_required: parseInt(s.quantity_required || 1)
                    })),
                components: formData.components.map(c => ({
                    component_id: c.component_id,
                    status: c.status,
                    observation: c.observation || null,
                    deterioration_notes: c.deterioration_notes || null,
                    wear_percentage: c.wear_percentage || null,
                    vibration_level: c.vibration_level || null,
                    temperature_status: c.temperature_status || null,
                    noise_level: c.noise_level || null,
                    lubrication_status: c.lubrication_status || null,
                    requires_immediate_action: c.requires_immediate_action || false,
                    estimated_remaining_life_days: c.estimated_remaining_life_days || null,
                    priority_for_replacement: c.priority_for_replacement || null
                }))
            };

            // === 4. SAVE ===
            if (isEditing) {
                await DiagnosisService.updateDiagnosis(diagnosisId, payload);
            } else {
                await DiagnosisService.createDiagnosis(payload);
            }

            onBack();
        } catch (err) {
            console.error('Error saving diagnosis:', err);
            setError(err.message || 'Error al guardar el diagnóstico');
        } finally {
            setSaving(false);
        }
    }

    const handleTransitionToInProgress = async () => {
        try {
            // Auto-save changes first to ensure DB has latest values (including potential overdrafts)
            setSaving(true);

            // DEDUPLICATE RESOURCES (Local scope for this function)
            const dedupePieces = Array.from(
                new Map(formData.pieces.map(p => [p.piece_id, p])).values()
            );
            const dedupeMaterials = Array.from(
                new Map(formData.materials.map(m => [m.material_id, m])).values()
            );
            const dedupeTools = Array.from(
                new Map(formData.tools.map(t => [t.tool_id, t])).values()
            );
            const dedupeSafety = Array.from(
                new Map(formData.safety.map(s => [s.safety_id, s])).values()
            );

            // Re-use logic from handleSaveDiagnosis but inline or call it?
            // Calling handleSaveDiagnosis() might trigger navigation "onBack()". 
            // We don't want to go back. We just want to save.
            // Let's call the service update directly here to be safe and explicit.

            const payload = {
                ...formData,
                // Sanitize core fields to ensure NULLs instead of empty strings
                crew_id: formData.crew_id || null,
                pump_id: formData.pump_id || null,
                diagnosis_date: formData.diagnosis_date || null,
                scheduled_date: formData.scheduled_date || null,
                pump_condition: formData.pump_condition || null, // Fixes constraint violation
                pump_observations: formData.pump_observations || null,
                technical_findings: formData.technical_findings || null,
                root_cause_analysis: formData.root_cause_analysis || null,
                recommendations: formData.recommendations || null,
                notes: formData.notes || null,

                pieces: dedupePieces
                    .filter(p => p.piece_id)
                    .map(p => ({
                        piece_id: parseInt(p.piece_id),
                        quantity_required: parseFloat(p.quantity_required || p.quantity_used || 1)
                    })),
                materials: dedupeMaterials
                    .filter(m => m.material_id)
                    .map(m => ({
                        material_id: parseInt(m.material_id),
                        quantity_required: parseFloat(m.quantity_required || m.quantity_used || 1)
                    })),
                tools: dedupeTools
                    .filter(t => t.tool_id)
                    .map(t => ({
                        tool_id: parseInt(t.tool_id),
                        quantity: parseInt(t.quantity || 1)
                    })),
                safety: dedupeSafety
                    .filter(s => s.safety_id)
                    .map(s => ({
                        safety_id: parseInt(s.safety_id),
                        quantity_required: parseInt(s.quantity_required || 1)
                    })),
                components: formData.components.map(c => ({
                    component_id: c.component_id,
                    status: c.status,
                    observation: c.observation || null,
                    deterioration_notes: c.deterioration_notes || null,
                    wear_percentage: c.wear_percentage || null,
                    vibration_level: c.vibration_level || null,
                    temperature_status: c.temperature_status || null,
                    noise_level: c.noise_level || null,
                    lubrication_status: c.lubrication_status || null,
                    requires_immediate_action: c.requires_immediate_action || false,
                    estimated_remaining_life_days: c.estimated_remaining_life_days || null,
                    priority_for_replacement: c.priority_for_replacement || null
                }))
            };

            // Save first (without navigation)
            await DiagnosisService.updateDiagnosis(diagnosisId, payload);

            // Then transition
            setError(null);
            await DiagnosisService.transitionToInProgress(diagnosisId);
            await loadAllData();
        } catch (err) {
            console.error("Error transitioning to IN_PROGRESS:", err);
            setError(err.message || "Error al iniciar el diagnóstico");
        } finally {
            setSaving(false);
        }
    };

    const handleTransitionToCompleted = () => {
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
            await DiagnosisService.completeDiagnosis(diagnosisId, completionNotes);
            setShowCompletionModal(false);
            setCompletionNotes('');
            await loadAllData();
        } catch (err) {
            console.error("Error completing diagnosis:", err);
            setError(err.message || "Error al completar el diagnóstico");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteDiagnosis = async () => {
        const confirmed = window.confirm(
            "⚠️ ADVERTENCIA: Esto eliminará completamente el diagnóstico y todos sus datos asociados. " +
            "Si el diagnóstico está en progreso, se liberarán todas las herramientas y EPP asignados. " +
            "\n\n¿Está seguro de que desea eliminar este diagnóstico?"
        );

        if (!confirmed) return;

        try {
            setSaving(true);
            setError(null);
            await DiagnosisService.deleteDiagnosis(diagnosisId);
            onBack();
        } catch (err) {
            console.error("Error deleting diagnosis:", err);
            setError(err.message || "Error al eliminar el diagnóstico");
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
            const item = { ...newList[index], [field]: value };

            // Compute stock indicators based on resource type
            if (listName === 'pieces' && item.piece_id) {
                const stock = stockLevels.pieces[item.piece_id];
                if (stock) {
                    item.available_stock = stock.current_stock;
                    item.stock_sufficient = (item.quantity_required || 0) <= stock.current_stock;
                }
            } else if (listName === 'materials' && item.material_id) {
                const stock = stockLevels.materials[item.material_id];
                if (stock) {
                    item.available_stock = stock.quantity_available;
                    item.stock_sufficient = (item.quantity_required || 0) <= stock.quantity_available;
                }
            } else if (listName === 'tools' && item.tool_id) {
                const stock = stockLevels.tools[item.tool_id];
                if (stock) {
                    item.available_stock = stock.quantity_available;
                    item.stock_sufficient = (item.quantity || 0) <= stock.quantity_available;
                }
            } else if (listName === 'safety' && item.safety_id) {
                const stock = stockLevels.safety[item.safety_id];
                if (stock) {
                    item.available_stock = stock.quantity_available;
                    item.stock_sufficient = (item.quantity_required || 0) <= stock.quantity_available;
                }
            }

            newList[index] = item;
            return { ...prev, [listName]: newList };
        });
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando formulario...</div>;

    const TabButton = ({ id, icon: Icon, label, count }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-all relative ${activeTab === id
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
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
                            {isEditing ? `Editar Diagnóstico` : 'Nuevo Diagnóstico'}
                        </h1>
                        <p className="text-sm text-slate-500">
                            {isEditing ? 'Modifique los detalles del diagnóstico existente.' : 'Complete la información para crear un nuevo diagnóstico.'}
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

                    {/* Delete Button */}
                    {isEditing && (
                        <button
                            onClick={handleDeleteDiagnosis}
                            disabled={saving}
                            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-red-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            <Trash2 size={20} />
                            {saving ? 'Eliminando...' : 'Eliminar Diagnóstico'}
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
                            Iniciar Diagnóstico
                        </button>
                    )}

                    {isEditing && formData.status === 'PENDING' && !canStart && requirements.length > 0 && (
                        <div className="text-orange-600 text-sm font-medium flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg">
                            <AlertTriangle size={16} />
                            Faltan {requirements.length} recursos
                        </div>
                    )}

                    {isEditing && formData.status === 'IN_PROGRESS' && (
                        <button
                            onClick={handleTransitionToCompleted}
                            disabled={saving}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                        >
                            <CheckCircle size={20} />
                            Completar Diagnóstico
                        </button>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                        {saving ? <Activity className="animate-spin" /> : <Save size={20} />}
                        {isEditing ? 'Guardar Cambios' : 'Crear Diagnóstico'}
                    </button>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex overflow-x-auto">
                <TabButton id="general" icon={FileText} label="Información General" />
                <TabButton id="findings" icon={Search} label="Hallazgos Técnicos" />
                <TabButton id="resources" icon={Package} label="Recursos & Materiales" count={stats.resources} />
                <TabButton id="safety" icon={Shield} label="Seguridad (EPP)" count={stats.safety} />
                <TabButton id="components" icon={Activity} label="Estado de Componentes" />
                <TabButton id="pump" icon={Zap} label="Condición de Bomba" />
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[400px]">

                {/* 1. GENERAL TAB */}
                {activeTab === 'general' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Código (Auto-generado)</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-100 border border-slate-300 rounded-xl outline-none text-slate-600 font-bold"
                                value={formData.code || 'N/A'}
                                disabled
                                readOnly
                            />
                        </div>

                        {formData.status === 'COMPLETED' && (
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Fecha de Finalización</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-2 bg-slate-100 border border-slate-300 rounded-xl outline-none text-slate-600 font-bold"
                                    value={formData.completion_date || ''}
                                    disabled
                                    readOnly
                                />
                            </div>
                        )}

                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Descripción / Título del Diagnóstico</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                placeholder="Ej: Diagnóstico Preventivo - Revisión General"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Molino</label>
                            <select
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                value={formData.mill_id}
                                onChange={e => {
                                    const millId = e.target.value;
                                    // Use loose equality (==) to match string "1" with number 1
                                    const selectedMill = options.mills.find(m => m.mill_id == millId);

                                    console.log('Selected Mill:', selectedMill); // Debug

                                    setFormData(prev => ({
                                        ...prev,
                                        mill_id: millId,
                                        // Auto-select pump if available in the mill data
                                        pump_id: selectedMill?.active_pump?.pump_id || null
                                    }));
                                }}
                                disabled={isEditing}
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

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Diagnóstico</label>
                            <select
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                value={formData.diagnosis_type}
                                onChange={e => setFormData({ ...formData, diagnosis_type: e.target.value })}
                            >
                                <option value="PREVENTIVO">Preventivo</option>
                                <option value="CORRECTIVO">Correctivo</option>
                                <option value="PREDICTIVO">Predictivo</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Prioridad</label>
                            <select
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                            >
                                <option value="BAJA">Baja</option>
                                <option value="MEDIA">Media</option>
                                <option value="ALTA">Alta</option>
                                <option value="URGENTE">Urgente</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Severidad del Problema</label>
                            <select
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                value={formData.severity}
                                onChange={e => setFormData({ ...formData, severity: e.target.value })}
                            >
                                <option value="LEVE">Leve</option>
                                <option value="MODERADO">Moderado</option>
                                <option value="CRITICO">Crítico</option>
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
                            <label className="block text-sm font-bold text-slate-700 mb-2">Fecha de Diagnóstico</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                value={formData.diagnosis_date}
                                onChange={e => setFormData({ ...formData, diagnosis_date: e.target.value })}
                            />
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

                        {/* Pump is auto-populated from mill - display only */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Bomba Instalada en el Molino</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-100 border border-slate-300 rounded-xl outline-none text-slate-600 font-medium"
                                value={
                                    // Try to find in mill options first (most reliable for installed pumps)
                                    options.mills.find(m => m.mill_id == formData.mill_id)?.active_pump?.pump?.serial_number
                                    // Fallback to pumps list (though installed pumps likely won't be here)
                                    || options.pumps.find(p => p.pump_id == formData.pump_id)?.serial_number
                                    // Last resort
                                    || 'Sin bomba instalada'
                                }
                                disabled
                                readOnly
                            />
                            <p className="text-xs text-slate-500 mt-1">La bomba se selecciona automáticamente del molino</p>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Notas Generales</label>
                            <textarea
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[100px]"
                                placeholder="Observaciones generales sobre el diagnóstico..."
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {/* 2. FINDINGS TAB */}
                {activeTab === 'findings' && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-800 text-sm">
                            <Search className="shrink-0" size={20} />
                            <p>Registre todos los hallazgos técnicos, análisis de causa raíz y recomendaciones derivadas del diagnóstico.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Hallazgos Técnicos Detallados</label>
                            <textarea
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[150px]"
                                placeholder="Describa los hallazgos técnicos observados durante el diagnóstico..."
                                value={formData.technical_findings}
                                onChange={e => setFormData({ ...formData, technical_findings: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Análisis de Causa Raíz</label>
                            <textarea
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[120px]"
                                placeholder="¿Cuál es la causa raíz de los problemas identificados?..."
                                value={formData.root_cause_analysis}
                                onChange={e => setFormData({ ...formData, root_cause_analysis: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Recomendaciones Técnicas</label>
                            <textarea
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[120px]"
                                placeholder="Recomendaciones técnicas basadas en los hallazgos..."
                                value={formData.recommendations}
                                onChange={e => setFormData({ ...formData, recommendations: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {/* 3. RESOURCES TAB (Same as Work Order) */}
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
                                    onClick={() => addListItem('pieces', { piece_id: '', quantity_required: 1 })}
                                    className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <Plus size={14} /> Agregar Pieza
                                </button>
                            </div>

                            {formData.pieces.length === 0 && <div className="text-sm text-slate-400 italic">No hay piezas asignadas.</div>}

                            <div className="grid gap-3">
                                {formData.pieces.map((item, idx) => (
                                    <div key={item.tempId || idx} className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm">
                                        <select
                                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                                            value={item.piece_id}
                                            onChange={(e) => updateListItem('pieces', idx, 'piece_id', e.target.value)}
                                        >
                                            <option value="">Seleccione pieza...</option>
                                            {options.pieces.map(p => {
                                                const stock = stockLevels.pieces[p.piece_id];
                                                const stockLabel = stock ? ` (Stock: ${stock.current_stock})` : '';
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
                                            value={item.quantity_required || item.quantity_used || 1}
                                            onChange={(e) => updateListItem('pieces', idx, 'quantity_required', e.target.value)}
                                        />
                                        {item.available_stock !== undefined && (
                                            <div className={`text-xs px-2 py-1 rounded-lg font-bold whitespace-nowrap ${item.stock_sufficient
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                                }`}>
                                                Stock: {item.available_stock}
                                            </div>
                                        )}
                                        <button onClick={() => removeListItem('pieces', idx)} className="text-slate-400 hover:text-red-500 p-1">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Materials Section */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    <Package size={20} className="text-blue-500" />
                                    Materiales (Consumibles)
                                </h3>
                                <button
                                    onClick={() => addListItem('materials', { material_id: '', quantity_required: 1 })}
                                    className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <Plus size={14} /> Agregar Material
                                </button>
                            </div>

                            {formData.materials.length === 0 && <div className="text-sm text-slate-400 italic">No hay materiales asignados.</div>}

                            <div className="grid gap-3">
                                {formData.materials.map((item, idx) => (
                                    <div key={item.tempId || idx} className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm">
                                        <select
                                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                                            value={item.material_id}
                                            onChange={(e) => updateListItem('materials', idx, 'material_id', e.target.value)}
                                        >
                                            <option value="">Seleccione material...</option>
                                            {options.materials.map(m => {
                                                const stock = stockLevels.materials[m.material_id];
                                                const stockLabel = stock ? ` (Stock: ${stock.quantity_available})` : '';
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
                                            value={item.quantity_required || item.quantity_used || 1}
                                            onChange={(e) => updateListItem('materials', idx, 'quantity_required', e.target.value)}
                                        />
                                        {item.available_stock !== undefined && (
                                            <div className={`text-xs px-2 py-1 rounded-lg font-bold whitespace-nowrap ${item.stock_sufficient
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                                }`}>
                                                Stock: {item.available_stock}
                                            </div>
                                        )}
                                        <button onClick={() => removeListItem('materials', idx)} className="text-slate-400 hover:text-red-500 p-1">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
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
                                    className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <Plus size={14} /> Reservar Herramienta
                                </button>
                            </div>

                            {formData.tools.length === 0 && <div className="text-sm text-slate-400 italic">No hay herramientas reservadas.</div>}

                            <div className="grid gap-3">
                                {formData.tools.map((item, idx) => (
                                    <div key={item.tempId || idx} className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm">
                                        <select
                                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                                            value={item.tool_id}
                                            onChange={(e) => updateListItem('tools', idx, 'tool_id', e.target.value)}
                                        >
                                            <option value="">Seleccione herramienta...</option>
                                            {options.tools.map(t => {
                                                const stock = stockLevels.tools[t.tool_id];
                                                const stockLabel = stock ? ` (Stock: ${stock.quantity_available})` : '';
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
                                            value={item.quantity || 1}
                                            onChange={(e) => updateListItem('tools', idx, 'quantity', e.target.value)}
                                        />
                                        {item.available_stock !== undefined && (
                                            <div className={`text-xs px-2 py-1 rounded-lg font-bold whitespace-nowrap ${item.stock_sufficient
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                                }`}>
                                                Stock: {item.available_stock}
                                            </div>
                                        )}
                                        <button onClick={() => removeListItem('tools', idx)} className="text-slate-400 hover:text-red-500 p-1">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. SAFETY TAB (Same as Work Order) */}
                {activeTab === 'safety' && (
                    <div className="space-y-6">
                        <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl flex gap-3 text-yellow-800 text-sm mb-6">
                            <AlertTriangle className="shrink-0" size={20} />
                            <p>Asegúrese de registrar todo el Equipo de Protección Personal (EPP) y elementos de seguridad necesarios para esta labor.</p>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    <Shield size={20} className="text-emerald-500" />
                                    Requerimientos de Seguridad
                                </h3>
                                <button
                                    onClick={() => addListItem('safety', { safety_id: '', quantity_required: 1 })}
                                    className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <Plus size={14} /> Agregar EPP
                                </button>
                            </div>

                            {formData.safety.length === 0 && <div className="text-sm text-slate-400 italic">No hay requerimientos de seguridad asignados.</div>}

                            <div className="grid gap-3">
                                {formData.safety.map((item, idx) => (
                                    <div key={item.tempId || idx} className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm">
                                        <select
                                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                                            value={item.safety_id}
                                            onChange={(e) => updateListItem('safety', idx, 'safety_id', e.target.value)}
                                        >
                                            <option value="">Seleccione equipo...</option>
                                            {options.safety.map(s => {
                                                const stock = stockLevels.safety[s.safety_id];
                                                const stockLabel = stock ? ` (Stock: ${stock.quantity_available})` : '';
                                                return (
                                                    <option key={s.safety_id} value={s.safety_id}>
                                                        {s.code} - {s.name}{stockLabel}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                                            placeholder="Cant."
                                            value={item.quantity_required || 1}
                                            onChange={(e) => updateListItem('safety', idx, 'quantity_required', e.target.value)}
                                        />
                                        {item.available_stock !== undefined && (
                                            <div className={`text-xs px-2 py-1 rounded-lg font-bold whitespace-nowrap ${item.stock_sufficient
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                                }`}>
                                                Stock: {item.available_stock}
                                            </div>
                                        )}
                                        <button onClick={() => removeListItem('safety', idx)} className="text-slate-400 hover:text-red-500 p-1">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. ENHANCED COMPONENTS TAB */}
                {activeTab === 'components' && (
                    <div className="space-y-6">
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex gap-3 text-slate-600 text-sm mb-6">
                            <Activity className="shrink-0" size={20} />
                            <p>Reporte detallado del estado de cada componente con métricas avanzadas para diagnóstico.</p>
                        </div>

                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3">Componente</th>
                                        <th className="px-4 py-3">Estado</th>
                                        <th className="px-4 py-3">Desgaste %</th>
                                        <th className="px-4 py-3">Vibración</th>
                                        <th className="px-4 py-3">Temperatura</th>
                                        <th className="px-4 py-3">Ruido</th>
                                        <th className="px-4 py-3">Lubricación</th>
                                        <th className="px-4 py-3">Observaciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {formData.components.length > 0 ? (
                                        formData.components.map((comp, idx) => (
                                            <tr key={comp.component_id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-medium text-slate-700">
                                                    {comp.name || `Componente ${comp.component_id}`}
                                                    {comp.code && <span className="ml-2 text-xs text-slate-400 font-mono">{comp.code}</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        className={`px-3 py-1 rounded-lg border text-xs font-bold uppercase ${{
                                                            'FUNCIONAL': 'bg-green-50 border-green-200 text-green-700',
                                                            'DESGASTADO': 'bg-yellow-50 border-yellow-200 text-yellow-700',
                                                            'REQUIERE_REVISION': 'bg-indigo-50 border-indigo-200 text-indigo-700',
                                                            'DANADO': 'bg-red-50 border-red-200 text-red-700',
                                                            'REQUIERE_CAMBIO': 'bg-orange-50 border-orange-200 text-orange-700',
                                                            'FALTANTE': 'bg-slate-200 border-slate-300 text-slate-600'
                                                        }[comp.status] || 'bg-slate-50 border-slate-200 text-slate-700'
                                                            }`}
                                                        value={comp.status}
                                                        onChange={(e) => updateListItem('components', idx, 'status', e.target.value)}
                                                    >
                                                        <option value="FUNCIONAL">Funcional</option>
                                                        <option value="DESGASTADO">Desgastado</option>
                                                        <option value="REQUIERE_REVISION">Req. Revisión</option>
                                                        <option value="DANADO">Dañado</option>
                                                        <option value="REQUIERE_CAMBIO">Req. Cambio</option>
                                                        <option value="FALTANTE">Faltante</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                                                        placeholder="%"
                                                        value={comp.wear_percentage || ''}
                                                        onChange={(e) => updateListItem('components', idx, 'wear_percentage', e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                                                        value={comp.vibration_level || ''}
                                                        onChange={(e) => updateListItem('components', idx, 'vibration_level', e.target.value)}
                                                    >
                                                        <option value="">-</option>
                                                        <option value="NORMAL">Normal</option>
                                                        <option value="LEVE">Leve</option>
                                                        <option value="MODERADO">Moderado</option>
                                                        <option value="ALTO">Alto</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                                                        value={comp.temperature_status || ''}
                                                        onChange={(e) => updateListItem('components', idx, 'temperature_status', e.target.value)}
                                                    >
                                                        <option value="">-</option>
                                                        <option value="NORMAL">Normal</option>
                                                        <option value="ELEVADO">Elevado</option>
                                                        <option value="CRITICO">Crítico</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                                                        value={comp.noise_level || ''}
                                                        onChange={(e) => updateListItem('components', idx, 'noise_level', e.target.value)}
                                                    >
                                                        <option value="">-</option>
                                                        <option value="NORMAL">Normal</option>
                                                        <option value="LEVE">Leve</option>
                                                        <option value="MODERADO">Moderado</option>
                                                        <option value="ALTO">Alto</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                                                        value={comp.lubrication_status || ''}
                                                        onChange={(e) => updateListItem('components', idx, 'lubrication_status', e.target.value)}
                                                    >
                                                        <option value="">-</option>
                                                        <option value="BUENO">Bueno</option>
                                                        <option value="REGULAR">Regular</option>
                                                        <option value="MALO">Malo</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="text"
                                                        className="w-full bg-transparent border-b border-transparent focus:border-indigo-300 outline-none text-slate-600 placeholder:text-slate-300 text-xs"
                                                        placeholder="Observación..."
                                                        value={comp.observation || ''}
                                                        onChange={(e) => updateListItem('components', idx, 'observation', e.target.value)}
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="px-4 py-8 text-center text-slate-400">
                                                {formData.mill_id ? 'Cargando componentes...' : 'Seleccione un molino para cargar componentes.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 6. PUMP CONDITION TAB */}
                {activeTab === 'pump' && (
                    <div className="space-y-6">
                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex gap-3 text-indigo-800 text-sm mb-6">
                            <Zap className="shrink-0" size={20} />
                            <p>Complete información detallada sobre la condición de la bomba evaluada durante el diagnóstico.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Condición General de la Bomba</label>
                                <select
                                    className={`w-full px-4 py-2 border rounded-xl font-bold text-sm ${formData.pump_condition === 'BUENO' ? 'bg-green-50 border-green-300 text-green-700'
                                        : formData.pump_condition === 'REGULAR' ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                                            : formData.pump_condition === 'MALO' ? 'bg-orange-50 border-orange-300 text-orange-700'
                                                : formData.pump_condition === 'CRITICO' ? 'bg-red-50 border-red-300 text-red-700'
                                                    : 'bg-slate-50 border-slate-200 text-slate-600'
                                        }`}
                                    value={formData.pump_condition || ''}
                                    onChange={e => setFormData({ ...formData, pump_condition: e.target.value })}
                                >
                                    <option value="">Sin evaluar...</option>
                                    <option value="BUENO">BUENO - Operando correctamente</option>
                                    <option value="REGULAR">REGULAR - Requiere atención menor</option>
                                    <option value="MALO">MALO - Requiere mantenimiento urgente</option>
                                    <option value="CRITICO">CRÍTICO - Fuera de servicio</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Bomba Evaluada (Referencia)</label>
                                <select
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    value={formData.pump_id || ''}
                                    onChange={e => setFormData({ ...formData, pump_id: e.target.value || null })}
                                >
                                    <option value="">Ninguna...</option>

                                    {/* Explicitly add the currently installed pump if it exists */}
                                    {(() => {
                                        const activePump = options.mills.find(m => m.mill_id == formData.mill_id)?.active_pump;
                                        if (activePump) {
                                            return (
                                                <option value={activePump.pump_id}>
                                                    {activePump.pump.serial_number} - {activePump.pump.model} (Actual)
                                                </option>
                                            );
                                        }
                                        return null;
                                    })()}

                                    {/* List other available pumps */}
                                    {options.pumps
                                        // Filter out the active pump to avoid duplicates if it somehow appears
                                        .filter(p => p.pump_id != options.mills.find(m => m.mill_id == formData.mill_id)?.active_pump?.pump_id)
                                        .map(p => (
                                            <option key={p.pump_id} value={p.pump_id}>
                                                {p.serial_number} - {p.model}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Observaciones Detalladas de la Bomba</label>
                                <textarea
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[150px]"
                                    placeholder="Detalles sobre el estado de la bomba, hallazgos específicos, ruidos anormales, fugas, presión, caudal, etc..."
                                    value={formData.pump_observations}
                                    onChange={e => setFormData({ ...formData, pump_observations: e.target.value })}
                                />
                            </div>
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
                            <h2 className="text-2xl font-bold text-slate-800">Finalizar Diagnóstico</h2>
                        </div>

                        <p className="text-slate-600 mb-6">
                            Por favor, escriba las notas conclusivas de este diagnóstico.
                            Esta información quedará registrada permanentemente.
                        </p>

                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Notas Conclusivas <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={completionNotes}
                                onChange={(e) => setCompletionNotes(e.target.value)}
                                placeholder="Ejemplo: Se completó el diagnóstico preventivo del molino. Se identificaron 3 componentes desgastados que requieren reemplazo. Se recomienda orden de trabajo correctiva en los próximos 30 días."
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px]"
                                rows={5}
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                Mínimo requerido: Descripción clara del diagnóstico realizado y hallazgos principales
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
                                {saving ? 'Finalizando...' : 'Finalizar Diagnóstico'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
