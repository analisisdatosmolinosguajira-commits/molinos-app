import React, { useState, useRef, useCallback } from 'react';
import {
    X, Download, Upload, CheckCircle, AlertTriangle,
    AlertCircle, FileSpreadsheet, Loader2, ChevronRight,
    ArrowRight, RotateCcw, ClipboardList
} from 'lucide-react';
import { DiagnosisBulkService } from '../../services/diagnosisBulk';

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

export default function DiagnosisBulkModal({ isOpen, onClose, onSuccess }) {
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
        try { await DiagnosisBulkService.downloadTemplate(); }
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
            const { errors: errs, preview: prev } = await DiagnosisBulkService.parseAndValidate(file);
            setErrors(errs || []);
            setPreview(prev);
            setStep(STEP_PREVIEW);
        } catch (err) {
            setErrors([{ sheet: 'Diagnosticos', row: '-', message: `Error procesando el archivo: ${err.message}` }]);
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
            const result = await DiagnosisBulkService.applyChanges(preview, (pct, label) => {
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

    const totalChanges  = preview ? (preview.create?.length || 0) + (preview.update?.length || 0) : 0;
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
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-900 to-blue-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shadow-inner">
                            <ClipboardList size={22} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Cargue Masivo — Diagnósticos</h2>
                            <p className="text-blue-200 text-xs mt-0.5">Gestión en lote para diagnósticos históricos</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-blue-300 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-colors">
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
                                    isActive ? 'bg-blue-700 text-white'          :
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
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700 flex-shrink-0">
                                    <Download size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-blue-900">Paso 1: Descargar Plantilla</h3>
                                    <p className="text-sm text-blue-700 mt-1">
                                        Descarga el formato estandarizado. Llena los datos como fecha, hallazgos, causa raíz y el link de Drive sin modificar las cabeceras.
                                    </p>
                                    <button 
                                        onClick={handleDownload}
                                        disabled={downloading}
                                        className="mt-3 bg-white text-blue-700 font-bold border border-blue-200 px-4 py-2 rounded-lg text-sm hover:bg-blue-50 transition-colors shadow-sm flex items-center gap-2"
                                    >
                                        {downloading ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                                        {downloading ? 'Generando...' : 'Descargar Plantilla .xlsx'}
                                    </button>
                                </div>
                            </div>

                            <div 
                                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                                    dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                                }`}
                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                            >
                                <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Upload size={28} className={dragging ? 'text-brand-500' : 'text-slate-400'} />
                                </div>
                                <h3 className="font-bold text-slate-800">Paso 2: Subir Plantilla Diligenciada</h3>
                                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto mb-6">
                                    Arrastra el archivo aquí o haz clic para seleccionarlo desde tu computadora.
                                </p>
                                <input 
                                    type="file" 
                                    accept=".xlsx" 
                                    onChange={handleFileChange} 
                                    className="hidden" 
                                    ref={fileRef}
                                />
                                <button 
                                    onClick={() => fileRef.current?.click()}
                                    className="bg-slate-900 text-white font-bold px-6 py-2.5 rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    Seleccionar Archivo
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── VALIDATING ── */}
                    {step === STEP_VALIDATING && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Loader2 size={48} className="text-brand-500 animate-spin mb-4" />
                            <h3 className="text-xl font-bold text-slate-800">Procesando y validando...</h3>
                            <p className="text-slate-500 mt-2">Revisando estructura y códigos de molino.</p>
                            <p className="text-xs text-slate-400 mt-1">Archivo: {fileName}</p>
                        </div>
                    )}

                    {/* ── PREVIEW ── */}
                    {step === STEP_PREVIEW && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                        <FileSpreadsheet size={20} className="text-slate-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{fileName}</h3>
                                        <p className="text-sm text-slate-500">Validación completada</p>
                                    </div>
                                </div>
                                <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg">
                                    <RotateCcw size={14} /> Subir otro
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-emerald-800">Crear: {preview?.create?.length || 0} | Actualizar: {preview?.update?.length || 0}</p>
                                        <p className="text-3xl font-bold text-emerald-600 mt-1">{(preview?.create?.length || 0) + (preview?.update?.length || 0)}</p>
                                    </div>
                                    <CheckCircle size={32} className="text-emerald-200" />
                                </div>
                                <div className={`${errors.length > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'} border rounded-xl p-4 flex items-center justify-between`}>
                                    <div>
                                        <p className={`text-sm font-medium ${errors.length > 0 ? 'text-red-800' : 'text-slate-600'}`}>Alertas de Validación</p>
                                        <p className={`text-3xl font-bold mt-1 ${errors.length > 0 ? 'text-red-600' : 'text-slate-400'}`}>{errors.length}</p>
                                    </div>
                                    <AlertTriangle size={32} className={errors.length > 0 ? 'text-red-200' : 'text-slate-200'} />
                                </div>
                            </div>

                            {errors.length > 0 && (
                                <div className="bg-white border border-red-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="bg-red-50 border-b border-red-100 px-4 py-3 flex items-center justify-between">
                                        <h4 className="font-bold text-red-800 flex items-center gap-2">
                                            <AlertCircle size={18} /> Detalle de Errores ({filteredErrors.length})
                                        </h4>
                                        <input 
                                            type="text" 
                                            placeholder="Filtrar errores..." 
                                            value={errorFilter}
                                            onChange={(e) => setErrorFilter(e.target.value)}
                                            className="text-sm px-3 py-1.5 rounded-lg border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                                        />
                                    </div>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-2 font-medium text-slate-600">Hoja</th>
                                                    <th className="px-4 py-2 font-medium text-slate-600">Fila</th>
                                                    <th className="px-4 py-2 font-medium text-slate-600">Mensaje</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredErrors.map((err, idx) => (
                                                    <tr key={idx} className="hover:bg-red-50/50">
                                                        <td className="px-4 py-2 font-medium text-slate-700">{err.sheet}</td>
                                                        <td className="px-4 py-2 text-slate-600">
                                                            <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-xs">{err.row}</span>
                                                        </td>
                                                        <td className="px-4 py-2 text-red-700">{err.message}</td>
                                                    </tr>
                                                ))}
                                                {filteredErrors.length === 0 && (
                                                    <tr>
                                                        <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                                                            No se encontraron errores con ese filtro.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="p-3 bg-red-50 border-t border-red-100 text-sm text-red-700">
                                        <strong>Nota:</strong> Los registros con errores serán ignorados. Los registros válidos sí se procesarán si decides continuar.
                                    </div>
                                </div>
                            )}

                            {preview?.create?.length > 0 && errors.length === 0 && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                                    <CheckCircle size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-bold text-emerald-800">Archivo Válido</h4>
                                        <p className="text-sm text-emerald-700 mt-1">
                                            No se encontraron errores. Se crearán {preview.create.length} diagnósticos.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── APPLYING ── */}
                    {step === STEP_APPLYING && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Loader2 size={48} className="text-brand-500 animate-spin mb-4" />
                            <h3 className="text-xl font-bold text-slate-800">Aplicando Cambios...</h3>
                            <p className="text-slate-500 mt-2 font-medium">{progress}%</p>
                            <p className="text-sm text-slate-400 mt-1 max-w-sm">{progressLabel}</p>
                            
                            <div className="w-full max-w-md bg-slate-100 h-2 rounded-full mt-6 overflow-hidden">
                                <div 
                                    className="bg-brand-500 h-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* ── DONE ── */}
                    {step === STEP_DONE && applyResult && (
                        <div className="space-y-6 text-center py-8">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle size={40} className="text-emerald-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800">Proceso Completado</h3>
                            
                            <div className="flex justify-center gap-6 mt-4">
                                <div className="bg-slate-50 border border-slate-200 px-6 py-4 rounded-xl">
                                    <p className="text-sm font-medium text-slate-500">Registros Exitosos</p>
                                    <p className="text-3xl font-bold text-emerald-600 mt-1">{applyResult.success}</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 px-6 py-4 rounded-xl">
                                    <p className="text-sm font-medium text-slate-500">Errores al Insertar</p>
                                    <p className={`text-3xl font-bold mt-1 ${applyResult.errors?.length > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                        {applyResult.errors?.length || 0}
                                    </p>
                                </div>
                            </div>

                            {applyResult.errors?.length > 0 && (
                                <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-left">
                                    <h4 className="font-bold text-red-800 mb-2">Detalle de errores de BD:</h4>
                                    <ul className="text-sm text-red-700 space-y-1 list-disc pl-5">
                                        {applyResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* FOOTER */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                    {step === STEP_DONE ? (
                        <button onClick={handleClose} className="bg-slate-900 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-slate-800 transition-colors">
                            Cerrar
                        </button>
                    ) : (
                        <>
                            <button onClick={handleClose} disabled={step === STEP_APPLYING} className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50">
                                Cancelar
                            </button>
                            {step === STEP_PREVIEW && (
                                <button 
                                    onClick={handleApply}
                                    disabled={totalChanges === 0}
                                    className="bg-brand-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-brand-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    Confirmar e Insertar <ArrowRight size={18} />
                                </button>
                            )}
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}
