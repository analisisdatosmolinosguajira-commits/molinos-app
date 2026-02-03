import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Plus } from 'lucide-react';

export default function NewDiagnosisButton({ millId }) {
    const navigate = useNavigate();

    return (
        <button
            onClick={() => navigate(`/diagnosticos/new?mill_id=${millId}`)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-all shadow-md active:scale-95"
        >
            <Plus size={18} />
            Nuevo Diagnóstico
        </button>
    );
}
