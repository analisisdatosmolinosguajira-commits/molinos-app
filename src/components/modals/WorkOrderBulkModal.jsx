import React, { useState, useRef, useCallback } from 'react';
import {
    X, Download, Upload, CheckCircle, AlertTriangle,
    AlertCircle, FileSpreadsheet, Loader2, ChevronRight,
    ArrowRight, RotateCcw, ClipboardList
} from 'lucide-react';
import { WorkOrderBulkService } from '../../services/workOrderBulk';

const STEP_IDLE       = 'idle';
const STEP_VALIDATING = 'validating';
const STEP_PREVIEW    = 'preview';
const STEP_APPLYING   = 'applying';
const STEP_DONE       = 'done';

const STEPS = [
    { id: STEP_IDLE,       label: '1. Plantilla' },
    { id: STEP_VALIDATING, label: '2. Validación' },
    { id: STEP_PREVIEW,    label: '3. Vista Previa' },
    { id: STEP_APPLYING,   label: '4. Aplicando' },
    { id: STEP_DONE,       label: '5. Resultado' },
];

export default function WorkOrderBulkModal({ isOpen, onClose, onSuccess }) {
    const [step, setStep]                   = useState(STEP_IDLE);
    const [dragging, setDragging]           = useState(false);
    const [fileName, setFileName]           = useState('');
    const [errors, setErrors]               = useState([]);
    const [preview, setPreview]             = useState(null);
    const [progress, setProgress]           = useState(0);
    const [progressLabel, setProgressLabel] = useState('');
    const [applyResult, setApplyResult]     = useState(null);
    const [downloading, setDownloading]     = useState(false);
    const [errorFilter, setErrorFilter]     = useState('');
    const fileRef = useRef(null);

    const reset = () => {
        setStep(STEP_IDLE); setFileName(''); setErrors([]); setPreview(null);
        setProgress(0); setProgressLabel(''); setApplyResult(null); setErrorFilter('');
    };

    const handleClose = () => { reset(); onClose(); };

    const handleDownload = async () => {
        setDownloading(true);
        try { await WorkOrderBulkService.downloadTemplate(); }
        catch (err) { alert(`Error generando la plantilla: ${err.message}`); }
        finally { setDownloading(false); }
    };

    const processFile = useCallback(async (file) => {
        if (!file) return;
        if (!file.name.endsWith('.xlsx')) { alert('Solo se aceptan archivos .xlsx'); return; }
        setFileName(file.name);
        setStep(STEP_VALIDATING);
        setErrors([]); setPreview(null);
        try {
            const { errors: errs, preview: prev } = await WorkOrderBulkService.parseAndValidate(file);
            setErrors(errs || []);
            setPreview(prev);
            setStep(STEP_PREVIEW);
        } catch (err) {
            setErrors([{ sheet: 'OrdenesTrabajo', row: '-', message: `Error procesando el archivo: ${err.message}` }]);
            setStep(STEP_PREVIEW);
        }
    }, []);

    const handleFileChange = (e) => processFile(e.target.files?.[0]);

    const handleDrop = useCallback((e) => {
        e.preventDefault(); setDragging(false);
        processFile(e.dataTransfer.files?.[0]);
    }, [processFile]);

    const handleApply = async () => {
        if (!preview) return;
        setStep(STEP_APPLYING); setProgress(0);
        try {
            const result = await WorkOrderBulkService.applyChanges(preview, (pct, label) => {
                setProgress(pct); setProgressLabel(label);
            });
            setApplyResult(result);
            setStep(STEP_DONE);
            if (result.errors.length === 0) onSuccess?.();
        } catch (err) {
            setApplyResult({ success: 0, errors: [`Error crítico: ${err.message}`] });
            setStep(STEP_DONE);
        }
    };

    if (!isOpen) return null;

    const totalChanges   = preview ? (preview.create?.length || 0) + (preview.update?.length || 0) : 0;
    const filteredErrors = errors.filter(e =>
        !errorFilter ||
        e.sheet?.toLowerCase().includes(errorFilter.toLowerCase()) ||
        e.message?.toLowerCase().includes(errorFilter.toLowerCase()) ||
        String(e.row).includes(errorFilter)
    );

    const currentStepIndex = STEPS.findIndex(s => s.id === step);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* HEADER */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-900 to-indigo-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shadow-inner">
                            <ClipboardList size={22} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Cargue Masivo — Órdenes de Trabajo</h2>
                            <p className="text-indigo-200 text-xs mt-0.5">Gestión en lote de órdenes, componentes y observaciones</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-indigo-300 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-colors">
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
                                    isActive ? 'bg-indigo-700 text-white'        :
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
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* IDLE */}
                    {step === STEP_IDLE && (
                        <>
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 flex items-start gap-4">
                                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-700 flex-shrink-0">
                                    <Download size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-indigo-900 mb-1">Paso 1: Descarga la plantilla Excel</h3>
                                    <p className="text-sm text-indigo-700 mb-3">
                                        La plantilla incluye las órdenes existentes con toda su información, componentes y observaciones.
                                        Incluye hojas de referencia de molinos, cuadrillas y componentes con sus IDs.
                                    </p>
                                    <button
                                        onClick={handleDownload}
                                        disabled={downloading}
                                        className="inline-flex items-center gap-2 bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-800 transition-colors disabled:opacity-50"
                                    >
                                        {downloading ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
                                        {downloading ? 'Generando...' : 'Descargar Plantilla'}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <Upload size={18} className="text-slate-500" />
                                    Paso 2: Sube el archivo completado
                                </h3>
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                    onDragLeave={() => setDragging(false)}
                                    onClick={() => fileRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                                        dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-100'
                                    }`}
                                >
                                    <FileSpreadsheet size={36} className="mx-auto mb-2 text-slate-400" />
                                    <p className="font-semibold text-slate-600">Arrastra tu archivo .xlsx aquí</p>
                                    <p className="text-sm text-slate-400 mt-1">o haz clic para seleccionar</p>
                                    <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
                                </div>
                            </div>
                        </>
                    )}

                    {/* VALIDATING */}
                    {step === STEP_VALIDATING && (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <Loader2 size={40} className="text-indigo-600 animate-spin" />
                            <p className="font-semibold text-slate-700">Validando archivo: <span className="text-indigo-700">{fileName}</span></p>
                            <p className="text-sm text-slate-400">Verificando molinos, cuadrillas, componentes y enumeraciones...</p>
                        </div>
                    )}

                    {/* PREVIEW */}
                    {step === STEP_PREVIEW && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                                    <p className="text-3xl font-black text-emerald-700">{preview?.create?.length || 0}</p>
                                    <p className="text-sm font-semibold text-emerald-600 mt-1">Órdenes nuevas a crear</p>
                                </div>
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                                    <p className="text-3xl font-black text-amber-700">{preview?.update?.length || 0}</p>
                                    <p className="text-sm font-semibold text-amber-600 mt-1">Órdenes existentes a actualizar</p>
                                </div>
                            </div>

                            {filteredErrors.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle size={18} className="text-red-600" />
                                        <h4 className="font-bold text-red-800">{errors.length} error(es) encontrados</h4>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Filtrar errores..."
                                        className="w-full px-3 py-1.5 text-sm border border-red-200 rounded-lg mb-3 bg-white"
                                        value={errorFilter}
                                        onChange={e => setErrorFilter(e.target.value)}
                                    />
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {filteredErrors.map((e, i) => (
                                            <div key={i} className="text-xs text-red-700 bg-red-100 rounded px-3 py-1.5 flex gap-2">
                                                <span className="font-mono text-red-500">Fila {e.row}</span>
                                                <span>{e.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {errors.length === 0 && totalChanges > 0 && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                                    <CheckCircle size={20} className="text-emerald-600" />
                                    <p className="text-sm font-semibold text-emerald-800">Archivo válido. Listo para aplicar {totalChanges} cambios.</p>
                                </div>
                            )}

                            {totalChanges === 0 && (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                                    <AlertCircle size={20} className="text-slate-500" />
                                    <p className="text-sm text-slate-600">No se detectaron filas con datos. Revisa que hayas diligenciado la hoja "OrdenesTrabajo".</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* APPLYING */}
                    {step === STEP_APPLYING && (
                        <div className="flex flex-col items-center justify-center py-16 gap-5">
                            <Loader2 size={40} className="text-indigo-600 animate-spin" />
                            <div className="w-full max-w-sm">
                                <div className="flex justify-between text-sm font-semibold text-slate-600 mb-1">
                                    <span>{progressLabel}</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div
                                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DONE */}
                    {step === STEP_DONE && applyResult && (
                        <>
                            <div className={`rounded-xl p-5 border flex items-start gap-4 ${
                                applyResult.errors.length === 0
                                    ? 'bg-emerald-50 border-emerald-200'
                                    : 'bg-amber-50 border-amber-200'
                            }`}>
                                {applyResult.errors.length === 0
                                    ? <CheckCircle size={28} className="text-emerald-600 flex-shrink-0" />
                                    : <AlertTriangle size={28} className="text-amber-600 flex-shrink-0" />
                                }
                                <div>
                                    <h3 className="font-bold text-lg">
                                        {applyResult.errors.length === 0 ? '¡Cargue completado!' : 'Completado con errores'}
                                    </h3>
                                    <p className="text-sm mt-1">
                                        {applyResult.success} orden(es) procesadas correctamente.
                                        {applyResult.errors.length > 0 && ` ${applyResult.errors.length} fallo(s).`}
                                    </p>
                                </div>
                            </div>

                            {applyResult.errors.length > 0 && (
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                    {applyResult.errors.map((e, i) => (
                                        <div key={i} className="text-xs text-red-700 bg-red-50 border border-red-100 rounded px-3 py-1.5">{e}</div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* FOOTER ACTIONS */}
                <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                    <button
                        onClick={reset}
                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
                    >
                        <RotateCcw size={15} /> Reiniciar
                    </button>

                    <div className="flex gap-3">
                        <button onClick={handleClose} className="px-5 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                            Cerrar
                        </button>

                        {step === STEP_PREVIEW && totalChanges > 0 && errors.length === 0 && (
                            <button
                                onClick={handleApply}
                                className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-indigo-700 rounded-xl hover:bg-indigo-800 transition-colors shadow-lg shadow-indigo-500/30"
                            >
                                Aplicar {totalChanges} cambios <ArrowRight size={16} />
                            </button>
                        )}

                        {step === STEP_DONE && applyResult?.errors.length === 0 && (
                            <button
                                onClick={handleClose}
                                className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
                            >
                                <CheckCircle size={16} /> Listo
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
