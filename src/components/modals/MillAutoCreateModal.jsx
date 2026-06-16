import React, { useState, useEffect, useCallback } from 'react';
import {
    X, Wand2, Factory, MapPin, CheckSquare, Square, Loader2,
    ChevronRight, CheckCircle, AlertTriangle, Info, RefreshCw,
    ArrowRight, RotateCcw
} from 'lucide-react';
import { MillBulkService } from '../../services/millBulk';

// ── Estados del flujo ─────────────────────────────────────────
const STEP_SELECT   = 'select';    // Elegir comunidades
const STEP_PREVIEW  = 'preview';   // Vista previa de molinos a crear
const STEP_CREATING = 'creating';  // Aplicando
const STEP_DONE     = 'done';      // Resultado

const STEPS = [
    { id: STEP_SELECT,   label: '1. Seleccionar' },
    { id: STEP_PREVIEW,  label: '2. Vista Previa' },
    { id: STEP_CREATING, label: '3. Creando'      },
    { id: STEP_DONE,     label: '4. Resultado'    },
];

// ── Helper para generar vista previa del código ───────────────
function previewCode(name, index) {
    const clean = (name || 'UNK')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 3)
        .padEnd(3, 'X');
    const year = new Date().getFullYear();
    return `MOL-${clean}-${year}-${String(index + 1).padStart(2, '0')}`;
}

// ── Componente principal ──────────────────────────────────────
export default function MillAutoCreateModal({ isOpen, onClose, onSuccess }) {
    const [step, setStep]                   = useState(STEP_SELECT);
    const [loading, setLoading]             = useState(false);
    const [communities, setCommunities]     = useState([]);  // Sin molino
    const [selected, setSelected]           = useState(new Set()); // IDs seleccionados
    const [searchQuery, setSearchQuery]     = useState('');
    const [progress, setProgress]           = useState(0);
    const [progressLabel, setProgressLabel] = useState('');
    const [result, setResult]               = useState(null);

    // Cargar comunidades sin molino al abrir
    const loadCommunities = useCallback(async () => {
        setLoading(true);
        try {
            const data = await MillBulkService.getCommunitiesWithoutMill();
            setCommunities(data || []);
            setSelected(new Set()); // reset selection
        } catch (err) {
            console.error('Error cargando comunidades:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            setStep(STEP_SELECT);
            setResult(null);
            setProgress(0);
            setProgressLabel('');
            setSearchQuery('');
            loadCommunities();
        }
    }, [isOpen, loadCommunities]);

    // ── Filtrado local ────────────────────────────────────────
    const filtered = communities.filter(c =>
        !searchQuery ||
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.municipality?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ── Selección ─────────────────────────────────────────────
    const toggleAll = () => {
        if (selected.size === filtered.length && filtered.length > 0) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filtered.map(c => c.community_id)));
        }
    };

    const toggle = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectedCommunities = communities.filter(c => selected.has(c.community_id));

    // ── Acción: Crear ─────────────────────────────────────────
    const handleCreate = async () => {
        if (selectedCommunities.length === 0) return;
        setStep(STEP_CREATING);
        setProgress(0);
        try {
            const res = await MillBulkService.createMillsFromCommunities(
                selectedCommunities,
                (pct, label) => { setProgress(pct); setProgressLabel(label); }
            );
            setResult(res);
            setStep(STEP_DONE);
            if (res.errors.length === 0) onSuccess?.();
        } catch (err) {
            setResult({ success: 0, errors: [`Error crítico: ${err.message}`], created: [] });
            setStep(STEP_DONE);
        }
    };

    const handleReset = () => {
        setStep(STEP_SELECT);
        setResult(null);
        setSelected(new Set());
        loadCommunities();
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    if (!isOpen) return null;

    const currentStepIndex = STEPS.findIndex(s => s.id === step);
    const allFilteredSelected = filtered.length > 0 && filtered.every(c => selected.has(c.community_id));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* HEADER */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-violet-700 to-blue-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shadow-inner">
                            <Wand2 size={22} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Crear Molinos Masivamente</h2>
                            <p className="text-violet-200 text-xs mt-0.5">Desde comunidades sin molino asignado</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-violet-200 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* STEP INDICATOR */}
                <div className="px-6 pt-4 flex items-center gap-2 text-xs font-semibold text-slate-500 flex-wrap">
                    {STEPS.map((s, i) => {
                        const isActive = s.id === step;
                        const isPast   = currentStepIndex > i;
                        return (
                            <React.Fragment key={s.id}>
                                <span className={`px-2.5 py-1 rounded-full transition-all ${
                                    isPast   ? 'bg-emerald-100 text-emerald-700' :
                                    isActive ? 'bg-violet-700 text-white'        :
                                               'bg-slate-100 text-slate-400'
                                }`}>
                                    {isPast ? '✓ ' : ''}{s.label}
                                </span>
                                {i < STEPS.length - 1 && <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">

                    {/* ── SELECT ── */}
                    {step === STEP_SELECT && (
                        <>
                            {/* Info banner */}
                            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex gap-3 items-start">
                                <Info size={18} className="text-violet-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-violet-800">
                                    Se detectaron <strong>{communities.length}</strong> comunidad{communities.length !== 1 ? 'es' : ''} sin molino.
                                    Selecciona las que deseas incluir. El sistema generará un molino estándar por cada una,
                                    usando los datos de la comunidad (nombre, ubicación, coordenadas).
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <Loader2 size={32} className="text-violet-600 animate-spin" />
                                    <p className="text-slate-500 text-sm">Detectando comunidades sin molino...</p>
                                </div>
                            ) : communities.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                                        <CheckCircle size={32} className="text-emerald-500" />
                                    </div>
                                    <p className="font-bold text-slate-700">¡Todas las comunidades tienen molino!</p>
                                    <p className="text-sm text-slate-400 max-w-xs">No hay comunidades sin molino asignado en este momento.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Barra de búsqueda + acciones rápidas */}
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type="text"
                                                placeholder="Buscar comunidad o municipio..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                className="w-full pl-4 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none"
                                            />
                                        </div>
                                        <button
                                            onClick={toggleAll}
                                            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                                                allFilteredSelected
                                                    ? 'bg-violet-600 text-white border-violet-600'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-violet-50 hover:border-violet-300'
                                            }`}
                                        >
                                            {allFilteredSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                            {allFilteredSelected ? 'Deseleccionar' : 'Seleccionar'} todas
                                        </button>
                                    </div>

                                    {/* Contador seleccionados */}
                                    {selected.size > 0 && (
                                        <div className="text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                                            {selected.size} comunidad{selected.size !== 1 ? 'es' : ''} seleccionada{selected.size !== 1 ? 's' : ''} — se crearán {selected.size} molino{selected.size !== 1 ? 's' : ''}
                                        </div>
                                    )}

                                    {/* Lista */}
                                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto custom-scrollbar">
                                        {filtered.length === 0 ? (
                                            <div className="p-8 text-center text-slate-400 text-sm">No hay coincidencias</div>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {filtered.map((comm, idx) => {
                                                    const isChecked = selected.has(comm.community_id);
                                                    return (
                                                        <div
                                                            key={comm.community_id}
                                                            onClick={() => toggle(comm.community_id)}
                                                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                                                                isChecked ? 'bg-violet-50/60 hover:bg-violet-100/50' : 'hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                                                                isChecked ? 'bg-violet-600 border-violet-600' : 'border-slate-300'
                                                            }`}>
                                                                {isChecked && (
                                                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                                                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                                    </svg>
                                                                )}
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`font-semibold text-sm ${isChecked ? 'text-violet-900' : 'text-slate-800'}`}>
                                                                        {comm.name}
                                                                    </span>
                                                                    {(comm.latitude || comm.longitude) && (
                                                                        <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium">
                                                                            <MapPin size={8} />
                                                                            Coords
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-slate-400 truncate mt-0.5">
                                                                    {comm.municipality && `${comm.municipality}, `}{comm.department || 'Colombia'}
                                                                </div>
                                                            </div>

                                                            <div className="text-xs font-mono text-slate-400 hidden sm:block">
                                                                ID:{comm.community_id}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {/* ── PREVIEW ── */}
                    {step === STEP_PREVIEW && (
                        <>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
                                <Info size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-800">
                                    Se crearán <strong>{selectedCommunities.length} molinos</strong> con datos estándar.
                                    Los códigos son orientativos; el sistema garantiza unicidad al guardar.
                                    Revisa la lista y pulsa <strong>"Crear"</strong> para continuar.
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-bold text-slate-600">Código Previsto</th>
                                            <th className="px-4 py-3 text-left font-bold text-slate-600">Nombre del Molino</th>
                                            <th className="px-4 py-3 text-left font-bold text-slate-600">Comunidad</th>
                                            <th className="px-4 py-3 text-center font-bold text-slate-600">Coordenadas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {selectedCommunities.map((comm, idx) => (
                                            <tr key={comm.community_id} className="hover:bg-slate-50">
                                                <td className="px-4 py-2.5 font-mono font-semibold text-violet-700">
                                                    {previewCode(comm.name, idx)}
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-700">
                                                    Molino {comm.name}
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-500">
                                                    {comm.name}
                                                    {comm.municipality && <span className="text-slate-400"> · {comm.municipality}</span>}
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    {(comm.latitude && comm.longitude) ? (
                                                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                                                            <MapPin size={10} />
                                                            {parseFloat(comm.latitude).toFixed(4)}, {parseFloat(comm.longitude).toFixed(4)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* ── CREATING ── */}
                    {step === STEP_CREATING && (
                        <div className="flex flex-col items-center justify-center py-10 gap-6">
                            <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center shadow-inner">
                                <Loader2 size={32} className="text-violet-600 animate-spin" />
                            </div>
                            <div className="text-center w-full max-w-sm">
                                <p className="font-bold text-slate-800 text-lg mb-1">Creando molinos...</p>
                                <p className="text-slate-500 text-sm mb-4 min-h-[20px]">{progressLabel}</p>
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                                    <div
                                        className="bg-gradient-to-r from-violet-500 to-blue-500 h-3 rounded-full transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-2">{progress}%</p>
                            </div>
                        </div>
                    )}

                    {/* ── DONE ── */}
                    {step === STEP_DONE && result && (
                        <div className="space-y-4">
                            {result.errors.length === 0 ? (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center shadow-sm">
                                    <CheckCircle size={40} className="mx-auto text-emerald-500 mb-3" />
                                    <p className="font-bold text-emerald-800 text-xl">¡Molinos creados exitosamente!</p>
                                    <p className="text-emerald-700 mt-2">
                                        <strong>{result.success}</strong> molino{result.success !== 1 ? 's' : ''} creado{result.success !== 1 ? 's' : ''} correctamente.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle size={20} className="text-amber-600" />
                                        <p className="font-bold text-amber-800">
                                            {result.success} creado{result.success !== 1 ? 's' : ''} — {result.errors.length} con error
                                        </p>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar">
                                        {result.errors.map((e, i) => (
                                            <div key={i} className="text-xs text-amber-800 bg-white border border-amber-100 rounded p-2 shadow-sm">{e}</div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Lista de creados */}
                            {result.created?.length > 0 && (
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Molinos creados</p>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                                        {result.created.map((m, i) => (
                                            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                                                <Factory size={14} className="text-violet-500 flex-shrink-0" />
                                                <span className="font-mono text-xs font-bold text-violet-700">{m.code}</span>
                                                <span className="text-xs text-slate-500">→</span>
                                                <span className="text-xs text-slate-700 truncate">{m.community}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-400">
                        {step === STEP_SELECT   && communities.length > 0 && `${selected.size} de ${communities.length} comunidades seleccionadas`}
                        {step === STEP_PREVIEW  && `${selectedCommunities.length} molinos listos para crear`}
                        {step === STEP_DONE     && 'Proceso finalizado.'}
                    </div>
                    <div className="flex gap-2">
                        {/* Botón recargar comunidades */}
                        {step === STEP_SELECT && !loading && (
                            <button
                                onClick={loadCommunities}
                                className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                                title="Recargar lista"
                            >
                                <RefreshCw size={16} />
                            </button>
                        )}

                        {/* Volver a seleccionar desde preview */}
                        {step === STEP_PREVIEW && (
                            <button
                                onClick={() => setStep(STEP_SELECT)}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                            >
                                <RotateCcw size={14} />
                                Editar selección
                            </button>
                        )}

                        {/* Reiniciar desde done */}
                        {step === STEP_DONE && (
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 text-sm bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                            >
                                Nueva operación
                            </button>
                        )}

                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium transition-colors"
                        >
                            {step === STEP_DONE ? 'Cerrar' : 'Cancelar'}
                        </button>

                        {/* Siguiente: SELECT → PREVIEW */}
                        {step === STEP_SELECT && selected.size > 0 && (
                            <button
                                onClick={() => setStep(STEP_PREVIEW)}
                                className="flex items-center gap-2 px-5 py-2 bg-violet-600 text-white rounded-lg font-bold text-sm hover:bg-violet-700 transition-all active:scale-95 shadow-md shadow-violet-500/30"
                            >
                                Vista Previa
                                <ArrowRight size={16} />
                            </button>
                        )}

                        {/* Crear: PREVIEW → CREATING */}
                        {step === STEP_PREVIEW && (
                            <button
                                onClick={handleCreate}
                                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition-all active:scale-95 shadow-md shadow-emerald-500/30"
                            >
                                <Wand2 size={16} />
                                Crear {selectedCommunities.length} Molino{selectedCommunities.length !== 1 ? 's' : ''}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
