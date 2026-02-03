import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Wrench } from 'lucide-react';

const InstallPumpPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const millId = searchParams.get('mill_id');

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
            >
                <ArrowLeft size={20} />
                Volver
            </button>

            <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm text-center">
                <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Wrench size={32} />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Instalación de Bomba</h1>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                    Estás iniciando el proceso de instalación para el molino <span className="font-mono font-bold bg-slate-100 px-2 py-1 rounded">{millId || 'N/A'}</span>.
                    <br />Esta funcionalidad está en desarrollo.
                </p>

                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        disabled
                        className="px-6 py-2.5 bg-brand-600 text-white font-medium rounded-xl opacity-50 cursor-not-allowed"
                    >
                        Continuar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallPumpPage;
