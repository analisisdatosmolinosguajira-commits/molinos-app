import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';

export default function NewDiagnosisPage() {
    const [searchParams] = useSearchParams();
    const millId = searchParams.get('mill_id');
    const navigate = useNavigate();

    return (
        <div className="p-8">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 font-medium"
            >
                <ArrowLeft size={20} />
                Volver
            </button>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Construction size={40} className="text-brand-500" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Nuevo Diagnóstico</h1>
                <p className="text-slate-500 text-lg mb-8 max-w-md mx-auto">
                    Módulo de creación de diagnósticos para el Molino #{millId}
                </p>
                {searchParams.get('activity_id') && (
                    <div className="mb-6 p-2 bg-brand-50 text-brand-700 rounded-lg text-sm inline-block border border-brand-200">
                        Vinculado a Actividad #{searchParams.get('activity_id')}
                    </div>
                )}
                <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-200 inline-block">
                    🚧 Funcionalidad en construcción
                </div>
            </div>
        </div>
    );
}
