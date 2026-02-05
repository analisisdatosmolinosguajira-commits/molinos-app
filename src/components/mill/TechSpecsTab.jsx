import React, { useState } from 'react';
import { FileText, Download, Printer, Settings, AlertTriangle } from 'lucide-react';
import ComponentMatrix from './ComponentMatrix';
import { MillService } from '../../services/mills';
import { PdfGeneratorService } from '../../services/pdfGenerator';

const TechSpecsTab = ({ millId, millCode, components, loading }) => {
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState(null);

    const handleDownloadReport = async () => {
        setDownloading(true);
        setError(null);
        try {
            // Use client-side generator instead of Edge Function
            await PdfGeneratorService.generateMillReport(millId);

            // Note: PdfGeneratorService handles the save/download directly via jspdf.save()
            // so we don't need to create a blob link here anymore.
        } catch (err) {
            console.error('Download error:', err);
            setError('Error al generar el reporte. Por favor intente nuevamente.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header / Actions Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="text-brand-500" />
                        Ficha Técnica y Especificaciones
                    </h3>
                    <p className="text-slate-500 text-sm mt-1">
                        Información detallada de componentes y reporte oficial.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownloadReport}
                        disabled={downloading}
                        className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all
                            ${downloading
                                ? 'bg-slate-100 text-slate-400 cursor-wait'
                                : 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-500/20 active:transform active:scale-95'
                            }`}
                    >
                        {downloading ? (
                            <>
                                <div className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full"></div>
                                Generando...
                            </>
                        ) : (
                            <>
                                <Download size={18} />
                                Descargar Reporte PDF
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                    <AlertTriangle size={18} />
                    {error}
                </div>
            )}

            {/* Component Matrix */}
            <div>
                <h4 className="text-md font-bold text-slate-700 mb-4 px-1">Matriz de Componentes</h4>
                {loading ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl">
                        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-500">Cargando componentes...</p>
                    </div>
                ) : (
                    <ComponentMatrix components={components} />
                )}
            </div>
        </div>
    );
};

export default TechSpecsTab;
