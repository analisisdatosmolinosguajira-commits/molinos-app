import React, { useState, useEffect } from 'react';
import { X, FileText, Download, AlertTriangle } from 'lucide-react';
import { MillService } from '../../services/mills';
import { SystemService } from '../../services/systems';
import { DiagnosisFormatGenerator } from './DiagnosisFormatGenerator';

export default function DiagnosisExportModal({ isOpen, onClose }) {
    const [mills, setMills] = useState([]);
    const [selectedMillId, setSelectedMillId] = useState('');
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            loadMills();
        }
    }, [isOpen]);

    async function loadMills() {
        try {
            setLoading(true);
            const data = await MillService.getAllMills();
            setMills(data || []);
            if (data?.length > 0) {
                setSelectedMillId(data[0].mill_id);
            }
        } catch (err) {
            setError("Error al cargar los molinos");
        } finally {
            setLoading(false);
        }
    }

    const handleExport = async (format) => {
        if (!selectedMillId) return;

        try {
            setGenerating(true);
            setError(null);
            
            const mill = mills.find(m => m.mill_id === selectedMillId);
            const systems = await SystemService.getMillSystemStatus(selectedMillId);

            if (format === 'pdf') {
                await DiagnosisFormatGenerator.generatePDF(mill, systems);
            } else if (format === 'excel') {
                await DiagnosisFormatGenerator.generateExcel(mill, systems);
            }
            
            onClose();
        } catch (err) {
            console.error("Error generating export", err);
            setError("Error al generar el documento. Intente de nuevo.");
        } finally {
            setGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3 text-brand-600">
                        <FileText size={24} />
                        <h2 className="text-xl font-bold text-slate-800">Generar Formato Físico</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <p className="text-slate-600 text-sm">
                        Genera un formato en blanco para diligenciar en campo. La información básica y los componentes estarán pre-cargados según el molino seleccionado.
                    </p>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Seleccione el Molino</label>
                        {loading ? (
                            <div className="text-sm text-slate-500">Cargando molinos...</div>
                        ) : (
                            <select
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                value={selectedMillId}
                                onChange={(e) => setSelectedMillId(e.target.value)}
                            >
                                {mills.map(m => (
                                    <option key={m.mill_id} value={m.mill_id}>
                                        {m.code} - {m.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <button
                            onClick={() => handleExport('pdf')}
                            disabled={loading || generating || !selectedMillId}
                            className="flex flex-col items-center justify-center gap-2 p-4 border border-slate-200 rounded-xl hover:border-brand-300 hover:bg-brand-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="p-3 bg-red-50 text-red-600 rounded-full group-hover:scale-110 transition-transform">
                                <Download size={24} />
                            </div>
                            <span className="font-bold text-slate-700 text-sm">Descargar PDF</span>
                        </button>

                        <button
                            onClick={() => handleExport('excel')}
                            disabled={loading || generating || !selectedMillId}
                            className="flex flex-col items-center justify-center gap-2 p-4 border border-slate-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="p-3 bg-green-50 text-green-600 rounded-full group-hover:scale-110 transition-transform">
                                <Download size={24} />
                            </div>
                            <span className="font-bold text-slate-700 text-sm">Descargar Excel</span>
                        </button>
                    </div>
                    
                    {generating && (
                        <div className="text-center text-sm text-brand-600 font-medium animate-pulse mt-4">
                            Generando documento, por favor espere...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
