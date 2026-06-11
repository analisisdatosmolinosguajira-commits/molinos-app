import React, { useState, useRef, useCallback } from 'react';
import {
    X, Download, Upload, CheckCircle, AlertTriangle,
    AlertCircle, FileSpreadsheet, Loader2, ChevronRight,
    FileSignature, ArrowRight, RotateCcw
} from 'lucide-react';
import { ConcertationBulkService } from '../../services/concertationBulk';

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

export default function ConcertationBulkModal({ isOpen, onClose, onSuccess }) {
    const [step, setStep]               = useState(STEP_IDLE);
    const [dragging, setDragging]       = useState(false);
    const [fileName, setFileName]       = useState('');
    const [errors, setErrors]           = useState([]);
    const [preview, setPreview]         = useState(null);
    const [progress, setProgress]       = useState(0);
    const [progressLabel, setProgressLabel] = useState('');
    const [applyResult, setApplyResult] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const [errorFilter, setErrorFilter] = useState('');
    const fileRef = useRef(null);

    const reset = () => {
        setStep(STEP_IDLE); setFileName(''); setErrors([]); setPreview(null);
        setProgress(0); setProgressLabel(''); setApplyResult(null); setErrorFilter('');
    };

    const handleClose = () => { reset(); onClose(); };

    const handleDownload = async () => {
        setDownloading(true);
        try { await ConcertationBulkService.downloadTemplate(); }
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
            const { errors: errs, preview: prev } = await ConcertationBulkService.parseAndValidate(file);
            setErrors(errs || []);
            setPreview(prev);
            setStep(STEP_PREVIEW);
        } catch (err) {
            setErrors([{ sheet: 'General', row: '-', col: '-', message: `Error procesando el archivo: ${err.message}` }]);
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
            const result = await ConcertationBulkService.applyChanges(preview, (pct, label) => {
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

    const totalChanges  = preview ? preview.update.length + preview.create.length : 0;
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
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-900 to-teal-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                            <FileSignature size={22} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Cargue Masivo — Concertaciones</h2>
                            <p className="text-teal-200 text-xs mt-0.5">Descargue la plantilla, edítela y suba los cambios</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-teal-300 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-colors">
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
                                    isActive ? 'bg-teal-700 text-white'          :
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
                <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">

                    {/* ── IDLE ── */}
                    {step === STEP_IDLE && (
                        <>
                            <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 flex items-start gap-4">
                                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-teal-700 flex-shrink-0">
                                    <Download size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-teal-900 mb-1">Paso 1 — Descargar Plantilla</h3>
                                    <p className="text-teal-700 text-sm mb-3">
                                        Genera un Excel con <strong>todas las concertaciones actuales</strong>.
                                        Edite los campos y agregue nuevas filas para crear registros.
                                    </p>
                                    <ul className="text-teal-600 text-xs space-y-1 mb-4">
                                        <li>• Columnas <strong>ID Concertación</strong> y <strong>Código</strong>: no modificar.</li>
                                        <li>• <strong>Fila nueva</strong> (sin ID) = nueva concertación en la BD.</li>
                                        <li>• Hoja <strong>Comunidades_Validas</strong>: IDs de comunidad de referencia.</li>
                                        <li>• Hoja <strong>Valores_Validos</strong>: listas de estado y decisión.</li>
                                    </ul>
                                    <button
                                        onClick={handleDownload}
                                        disabled={downloading}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white rounded-lg font-bold text-sm hover:bg-teal-800 transition-all active:scale-95 disabled:opacity-60"
                                    >
                                        {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                        {downloading ? 'Generando...' : 'Descargar Plantilla'}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <Upload size={18} className="text-emerald-600" />
                                    Paso 2 — Subir Planilla Modificada
                                </h3>
                                <div
                                    className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
                                        dragging ? 'border-teal-400 bg-teal-50' : 'border-slate-200 bg-slate-50 hover:border-teal-300 hover:bg-teal-50/40'
                                    }`}
                                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                    onDragLeave={() => setDragging(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileRef.current?.click()}
                                >
                                    <FileSpreadsheet size={40} className={`mb-3 ${dragging ? 'text-teal-500' : 'text-slate-300'}`} />
                                    <p className="font-semibold text-slate-700 mb-1">Arrastra el archivo aquí o haz clic para seleccionar</p>
                                    <p className="text-xs text-slate-400">Solo archivos .xlsx</p>
                                    <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── VALIDATING ── */}
                    {step === STEP_VALIDATING && (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center">
                                <Loader2 size={32} className="text-teal-600 animate-spin" />
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-slate-800 text-lg">Validando archivo...</p>
                                <p className="text-slate-500 text-sm mt-1">{fileName}</p>
                                <p className="text-slate-400 text-xs mt-2">Verificando datos y comparando con la base de datos</p>
                            </div>
                        </div>
                    )}

                    {/* ── PREVIEW ── */}
                    {step === STEP_PREVIEW && (
                        <>
                            <div className="flex items-center gap-3 mb-1">
                                <FileSpreadsheet size={16} className="text-slate-500" />
                                <span className="text-sm text-slate-500 truncate">{fileName}</span>
                                <button onClick={reset} className="ml-auto text-xs text-slate-400 hover:text-teal-600 flex items-center gap-1">
                                    <RotateCcw size={12} /> Cargar otro
                                </button>
                            </div>

                            {/* ERRORS */}
                            {errors.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle size={20} className="text-red-600" />
                                        <h3 className="font-bold text-red-800">
                                            {errors.length} Error{errors.length !== 1 ? 'es' : ''} encontrado{errors.length !== 1 ? 's' : ''}
                                        </h3>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{errors.length}</span>
                                        <p className="text-xs text-red-600 ml-auto">Corrija el archivo y vuelva a subirlo</p>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Filtrar errores..."
                                        className="w-full px-3 py-1.5 text-sm border border-red-200 rounded-lg bg-white mb-3 outline-none focus:ring-2 focus:ring-red-300"
                                        value={errorFilter}
                                        onChange={e => setErrorFilter(e.target.value)}
                                    />
                                    <div className="max-h-60 overflow-y-auto rounded-lg border border-red-100 custom-scrollbar">
                                        <table className="w-full text-xs">
                                            <thead className="bg-red-100 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-bold text-red-700">Hoja</th>
                                                    <th className="px-3 py-2 text-left font-bold text-red-700">Fila</th>
                                                    <th className="px-3 py-2 text-left font-bold text-red-700">Columna</th>
                                                    <th className="px-3 py-2 text-left font-bold text-red-700">Descripción del Error</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-red-50">
                                                {filteredErrors.map((err, i) => (
                                                    <tr key={i} className="bg-white hover:bg-red-50">
                                                        <td className="px-3 py-2 font-mono font-semibold text-red-600">{err.sheet}</td>
                                                        <td className="px-3 py-2 font-mono text-slate-600">{err.row}</td>
                                                        <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{err.col}</td>
                                                        <td className="px-3 py-2 text-slate-700">{err.message}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* SUCCESS PREVIEW */}
                            {preview && totalChanges > 0 && errors.length === 0 && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <CheckCircle size={20} className="text-emerald-600" />
                                        <h3 className="font-bold text-emerald-800">
                                            Validación Exitosa — {totalChanges} cambio{totalChanges !== 1 ? 's' : ''} detectado{totalChanges !== 1 ? 's' : ''}
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {preview.update.length > 0 && (
                                            <div className="bg-white border border-amber-200 rounded-xl p-4">
                                                <p className="font-bold text-slate-800 text-sm mb-2">✏️ Actualizar</p>
                                                <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg font-medium">
                                                    {preview.update.length} concertación{preview.update.length !== 1 ? 'es' : ''}
                                                </span>
                                            </div>
                                        )}
                                        {preview.create.length > 0 && (
                                            <div className="bg-white border border-emerald-200 rounded-xl p-4">
                                                <p className="font-bold text-slate-800 text-sm mb-2">✚ Crear</p>
                                                <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg font-medium">
                                                    {preview.create.length} concertación{preview.create.length !== 1 ? 'es' : ''} nueva{preview.create.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {preview && totalChanges === 0 && errors.length === 0 && (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                                    <AlertCircle size={32} className="mx-auto text-slate-300 mb-2" />
                                    <p className="font-semibold text-slate-600">No se detectaron cambios</p>
                                    <p className="text-sm text-slate-400 mt-1">El archivo es idéntico a los datos actuales.</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── APPLYING ── */}
                    {step === STEP_APPLYING && (
                        <div className="flex flex-col items-center justify-center py-10 gap-6">
                            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                                <Loader2 size={32} className="text-emerald-600 animate-spin" />
                            </div>
                            <div className="text-center w-full max-w-sm">
                                <p className="font-bold text-slate-800 text-lg mb-1">Aplicando cambios...</p>
                                <p className="text-slate-500 text-sm mb-4 min-h-[20px]">{progressLabel}</p>
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-teal-400 to-emerald-500 h-3 rounded-full transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-2">{progress}%</p>
                            </div>
                        </div>
                    )}

                    {/* ── DONE ── */}
                    {step === STEP_DONE && applyResult && (
                        <div className="space-y-4">
                            {applyResult.errors.length === 0 ? (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                                    <CheckCircle size={40} className="mx-auto text-emerald-500 mb-3" />
                                    <p className="font-bold text-emerald-800 text-xl">¡Cargue completado!</p>
                                    <p className="text-emerald-700 mt-2">
                                        <strong>{applyResult.success}</strong> registro{applyResult.success !== 1 ? 's' : ''} guardado{applyResult.success !== 1 ? 's' : ''} correctamente.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle size={20} className="text-amber-600" />
                                        <p className="font-bold text-amber-800">
                                            {applyResult.success} registros guardados — {applyResult.errors.length} con error
                                        </p>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto space-y-1.5">
                                        {applyResult.errors.map((e, i) => (
                                            <div key={i} className="text-xs text-amber-800 bg-white border border-amber-100 rounded p-2">{e}</div>
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
                        {step === STEP_IDLE    && 'Descargue la plantilla, edite y suba el archivo.'}
                        {step === STEP_PREVIEW && errors.length > 0   && `${errors.length} error${errors.length !== 1 ? 'es' : ''} — corrija y vuelva a cargar.`}
                        {step === STEP_PREVIEW && errors.length === 0 && totalChanges > 0 && 'Revise los cambios y pulse "Aplicar".'}
                        {step === STEP_DONE    && 'Cargue finalizado.'}
                    </div>
                    <div className="flex gap-2">
                        {step === STEP_DONE && (
                            <button onClick={reset} className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium">
                                Cargar Otro
                            </button>
                        )}
                        <button onClick={handleClose} className="px-4 py-2 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium">
                            {step === STEP_DONE ? 'Cerrar' : 'Cancelar'}
                        </button>
                        {step === STEP_PREVIEW && errors.length === 0 && totalChanges > 0 && (
                            <button
                                onClick={handleApply}
                                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition-all active:scale-95"
                            >
                                <ArrowRight size={16} />
                                Aplicar {totalChanges} cambio{totalChanges !== 1 ? 's' : ''}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
