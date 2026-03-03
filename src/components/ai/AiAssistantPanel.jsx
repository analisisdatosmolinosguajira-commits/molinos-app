import React, { useState, useRef, useCallback } from 'react';
import { Sparkles, Upload, Mic, MicOff, Send, Check, AlertTriangle, Lightbulb, ChevronDown, ChevronUp, X, FileText, Image, Loader } from 'lucide-react';
import { extractFormData } from '../../services/aiService';

/**
 * AiAssistantPanel - Reusable AI assistant panel for form modals
 * 
 * @param {string} modalType - The type of modal (e.g., 'mill')
 * @param {function} onApplyFields - Callback with extracted fields to apply to form
 * @param {boolean} disabled - Whether the panel is disabled
 */
const AiAssistantPanel = ({ modalType, onApplyFields, disabled = false }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [instruction, setInstruction] = useState('');
    const [files, setFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const fileInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const handleFileSelect = useCallback((e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(prev => [...prev, ...selectedFiles]);
        setError(null);
    }, []);

    const handleFileDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        const droppedFiles = Array.from(e.dataTransfer.files);
        setFiles(prev => [...prev, ...droppedFiles]);
        setError(null);
    }, []);

    const removeFile = useCallback((index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    }, []);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], `nota_voz_${Date.now()}.webm`, { type: 'audio/webm' });
                setFiles(prev => [...prev, audioFile]);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;
            setIsRecording(true);
        } catch (err) {
            setError('No se pudo acceder al micrófono. Verifica los permisos.');
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, [isRecording]);

    const handleExtract = useCallback(async () => {
        if (!instruction.trim() && files.length === 0) {
            setError('Escribe una instrucción o sube un archivo');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setResult(null);

        try {
            const data = await extractFormData(modalType, files, instruction);
            setResult(data);
        } catch (err) {
            setError(err.message || 'Error al procesar. Intenta de nuevo.');
        } finally {
            setIsProcessing(false);
        }
    }, [modalType, files, instruction]);

    const handleApply = useCallback(() => {
        if (result?.fields) {
            onApplyFields(result.fields);
            setIsExpanded(false);
            setResult(null);
            setInstruction('');
            setFiles([]);
        }
    }, [result, onApplyFields]);

    const handleReset = useCallback(() => {
        setResult(null);
        setError(null);
        setInstruction('');
        setFiles([]);
    }, []);

    const getFileIcon = (file) => {
        if (file.type.startsWith('image/')) return <Image size={14} />;
        if (file.type.startsWith('audio/')) return <Mic size={14} />;
        return <FileText size={14} />;
    };

    const getConfidenceColor = (level) => {
        switch (level) {
            case 'high': return 'text-green-600 bg-green-50';
            case 'medium': return 'text-amber-600 bg-amber-50';
            case 'low': return 'text-red-600 bg-red-50';
            default: return 'text-slate-600 bg-slate-50';
        }
    };

    const getConfidenceIcon = (level) => {
        switch (level) {
            case 'high': return <Check size={12} />;
            case 'medium': return <AlertTriangle size={12} />;
            case 'low': return <X size={12} />;
            default: return null;
        }
    };

    // Collapsed banner
    if (!isExpanded) {
        return (
            <button
                type="button"
                onClick={() => setIsExpanded(true)}
                disabled={disabled}
                className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl hover:from-violet-100 hover:to-indigo-100 transition-all group disabled:opacity-50"
            >
                <span className="flex items-center gap-2 text-sm font-medium text-violet-700">
                    <Sparkles size={16} className="text-violet-500 group-hover:animate-pulse" />
                    ✨ Usar IA para completar automáticamente
                </span>
                <ChevronDown size={16} className="text-violet-400" />
            </button>
        );
    }

    // Expanded panel
    return (
        <div className="border border-violet-200 rounded-xl overflow-hidden bg-gradient-to-b from-violet-50/50 to-white">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-100 to-indigo-100 border-b border-violet-200">
                <span className="flex items-center gap-2 text-sm font-bold text-violet-800">
                    <Sparkles size={16} className="text-violet-600" />
                    Asistente IA
                </span>
                <button type="button" onClick={() => setIsExpanded(false)} className="text-violet-400 hover:text-violet-600">
                    <ChevronUp size={16} />
                </button>
            </div>

            <div className="p-4 space-y-3">
                {/* Instructions */}
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Describe qué quieres registrar o da contexto:
                    </label>
                    <textarea
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder='Ej: "Molino nuevo en la comunidad Ishurupa, operativo, modelo Jober A-20, instalado en enero 2024"'
                        rows={2}
                        disabled={isProcessing}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none"
                    />
                </div>

                {/* File upload area */}
                <div
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={handleFileDrop}
                    className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center hover:border-violet-400 transition-colors"
                >
                    <div className="flex items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            <Upload size={14} />
                            Subir archivo/foto
                        </button>

                        <button
                            type="button"
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={isProcessing}
                            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium disabled:opacity-50 ${isRecording
                                ? 'bg-red-50 border-red-300 text-red-700 animate-pulse'
                                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                            {isRecording ? 'Detener' : 'Nota de voz'}
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">Arrastra archivos aquí o usa los botones</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        multiple
                        accept="image/*,audio/*,.pdf,.xlsx,.xls,.csv,.doc,.docx"
                        className="hidden"
                    />
                </div>

                {/* Selected files */}
                {files.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {files.map((file, i) => (
                            <span key={i} className="flex items-center gap-1 px-2 py-1 bg-violet-50 border border-violet-200 rounded-md text-xs text-violet-700">
                                {getFileIcon(file)}
                                {file.name.length > 20 ? file.name.slice(0, 17) + '...' : file.name}
                                <button type="button" onClick={() => removeFile(i)} className="text-violet-400 hover:text-red-500 ml-0.5">
                                    <X size={12} />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {/* Extract button */}
                <button
                    type="button"
                    onClick={handleExtract}
                    disabled={isProcessing || (!instruction.trim() && files.length === 0)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg text-sm font-bold hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-violet-200"
                >
                    {isProcessing ? (
                        <>
                            <Loader size={16} className="animate-spin" />
                            Analizando con IA...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Extraer con IA
                        </>
                    )}
                </button>

                {/* Error */}
                {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-700">{error}</p>
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div className="space-y-3 border-t border-violet-200 pt-3">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Datos extraídos</h4>

                        {/* Fields */}
                        <div className="space-y-1.5">
                            {Object.entries(result.fields).filter(([key]) => !key.startsWith('_')).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between px-3 py-1.5 bg-white rounded-md border border-slate-200">
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-medium text-slate-600">{key}: </span>
                                        <span className="text-xs text-slate-900 font-semibold">
                                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                        </span>
                                    </div>
                                    {result.confidence?.[key] && (
                                        <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ml-2 ${getConfidenceColor(result.confidence[key])}`}>
                                            {getConfidenceIcon(result.confidence[key])}
                                            {result.confidence[key]}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Warnings */}
                        {result.warnings?.length > 0 && (
                            <div className="space-y-1">
                                {result.warnings.map((w, i) => (
                                    <div key={i} className="flex items-start gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md">
                                        <AlertTriangle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-amber-800">{w}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Suggestions */}
                        {result.suggestions?.length > 0 && (
                            <div className="space-y-1">
                                {result.suggestions.map((s, i) => (
                                    <div key={i} className="flex items-start gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
                                        <Lightbulb size={12} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-blue-800">{s}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Alternatives (fuzzy match suggestions) */}
                        {result.alternatives?.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                                    <AlertTriangle size={12} className="text-amber-500" />
                                    ¿Quizás quisiste decir?
                                </h4>
                                {result.alternatives.map((alt, ai) => (
                                    <div key={ai} className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                                        <p className="text-xs text-amber-800">
                                            <span className="font-semibold">{alt.fieldLabel}:</span> No se encontró "{alt.searchedValue}"
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {alt.options.map((opt, oi) => (
                                                <button
                                                    key={oi}
                                                    type="button"
                                                    onClick={() => {
                                                        // Update the result fields with the selected option
                                                        setResult(prev => ({
                                                            ...prev,
                                                            fields: {
                                                                ...prev.fields,
                                                                [alt.field]: opt.value,
                                                                [`_${alt.field}_selected`]: opt.label
                                                            },
                                                            // Remove this alternative since user picked one
                                                            alternatives: prev.alternatives.filter((_, idx) => idx !== ai)
                                                        }));
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-medium text-amber-900 hover:bg-amber-100 hover:border-amber-400 transition-all hover:shadow-sm"
                                                >
                                                    <span>{opt.label}</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 rounded-full text-amber-600 font-bold">
                                                        {opt.score}%
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleApply}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors"
                            >
                                <Check size={16} />
                                Aplicar al formulario
                            </button>
                            <button
                                type="button"
                                onClick={handleReset}
                                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                            >
                                Reintentar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AiAssistantPanel;
