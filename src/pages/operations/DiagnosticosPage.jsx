import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Stethoscope, Plus, Search, Filter, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { DiagnosisService } from '../../services/diagnosis';
import StatusBadge from '../../components/ui/StatusBadge';
import DiagnosisForm from './DiagnosisForm';
import PermissionGate from '../../components/auth/PermissionGate';

export default function DiagnosticosPage() {
    const [diagnoses, setDiagnoses] = useState([]);
    const [filteredDiagnoses, setFilteredDiagnoses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // View State
    const [selectedDiagnosisId, setSelectedDiagnosisId] = useState(null);
    const [isCreateMode, setIsCreateMode] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PENDING, IN_PROGRESS, COMPLETED
    const [searchQuery, setSearchQuery] = useState('');

    const [searchParams] = useSearchParams();

    useEffect(() => {
        loadDiagnoses();
        // Check for create action in URL
        if (searchParams.get('action') === 'new') {
            setIsCreateMode(true);
        }
        // Auto-select a specific diagnosis from URL ?id=
        const targetId = searchParams.get('id');
        if (targetId) {
            setSelectedDiagnosisId(targetId);
        }
    }, [searchParams]);

    useEffect(() => {
        filterDiagnoses();
    }, [diagnoses, statusFilter, searchQuery]);

    async function loadDiagnoses() {
        try {
            setLoading(true);
            const data = await DiagnosisService.getAllDiagnoses();
            setDiagnoses(data || []);
            setFilteredDiagnoses(data || []);
        } catch (err) {
            console.error("Error loading diagnoses:", err);
            setError("No se pudieron cargar los diagnósticos.");
        } finally {
            setLoading(false);
        }
    }

    function filterDiagnoses() {
        let result = diagnoses;

        // Status Filter
        if (statusFilter !== 'ALL') {
            result = result.filter(d => d.status === statusFilter);
        }

        // Search Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(d =>
                d.code?.toLowerCase().includes(q) ||
                d.description?.toLowerCase().includes(q) ||
                d.mill?.name?.toLowerCase().includes(q) ||
                d.mill?.code?.toLowerCase().includes(q)
            );
        }

        setFilteredDiagnoses(result);
    }

    // If editing a specific diagnosis
    if (selectedDiagnosisId) {
        return <DiagnosisForm diagnosisId={selectedDiagnosisId} onBack={() => { setSelectedDiagnosisId(null); loadDiagnoses(); }} />;
    }

    // If creating a new diagnosis
    if (isCreateMode) {
        return <DiagnosisForm onBack={() => { setIsCreateMode(false); loadDiagnoses(); }} />;
    }

    if (loading && diagnoses.length === 0) return <div className="p-8 text-center text-slate-500">Cargando diagnósticos...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    // Calculate stats
    const stats = {
        Pendientes: diagnoses.filter(d => d.status === 'PENDING').length,
        'En Proceso': diagnoses.filter(d => d.status === 'IN_PROGRESS').length,
        Completados: diagnoses.filter(d => d.status === 'COMPLETED').length,
        Cancelados: diagnoses.filter(d => d.status === 'CANCELLED').length
    };

    return (
        <div className="space-y-6 animate-slide-up pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Diagnósticos</h1>
                    <p className="text-slate-500 mt-1">Evaluaciones técnicas y análisis de componentes</p>
                </div>
                <PermissionGate module="diagnosticos" action="create">
                    <button
                        onClick={() => setIsCreateMode(true)}
                        className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/30 transition-all font-bold active:scale-95"
                    >
                        <Plus size={20} />
                        Nuevo Diagnóstico
                    </button>
                </PermissionGate>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Pendientes</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.Pendientes}</p>
                        </div>
                        <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl">
                            <AlertCircle size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 font-medium">En Proceso</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{stats['En Proceso']}</p>
                        </div>
                        <div className="p-3 bg-brand-100 text-brand-600 rounded-xl">
                            <Clock size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Completados</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.Completados}</p>
                        </div>
                        <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                            <CheckCircle size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Cancelados</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.Cancelados}</p>
                        </div>
                        <div className="p-3 bg-slate-100 text-slate-500 rounded-xl">
                            <Stethoscope size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por código, molino, descripción..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Status Filter */}
                <div className="flex gap-2 items-center">
                    <Filter size={18} className="text-slate-400" />
                    <select
                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">Todos los Estados</option>
                        <option value="PENDING">Pendientes</option>
                        <option value="IN_PROGRESS">En Proceso</option>
                        <option value="COMPLETED">Completados</option>
                        <option value="CANCELLED">Cancelados</option>
                    </select>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Código</th>
                            <th className="px-6 py-4">Molino</th>
                            <th className="px-6 py-4">Tipo</th>
                            <th className="px-6 py-4">Descripción</th>
                            <th className="px-6 py-4">Prioridad</th>
                            <th className="px-6 py-4">Estado</th>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredDiagnoses.map(d => (
                            <tr key={d.diagnosis_id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedDiagnosisId(d.diagnosis_id)}>
                                <td className="px-6 py-4 font-mono font-bold text-slate-700 text-xs">{d.code}</td>
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-900">{d.mill?.code}</div>
                                    <div className="text-xs text-slate-500">{d.mill?.name}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-brand-50 text-brand-700 rounded text-xs font-medium">
                                        {d.diagnosis_type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{d.description}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${d.priority === 'URGENTE' ? 'bg-red-100 text-red-700' :
                                        d.priority === 'ALTA' ? 'bg-orange-100 text-orange-700' :
                                            d.priority === 'MEDIA' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-slate-100 text-slate-600'
                                        }`}>
                                        {d.priority}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={d.status} size="sm" />
                                </td>
                                <td className="px-6 py-4 text-slate-500 text-xs">
                                    {d.diagnosis_date ? new Date(d.diagnosis_date).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedDiagnosisId(d.diagnosis_id);
                                        }}
                                        className="text-brand-600 font-medium text-xs hover:underline"
                                    >
                                        Ver Detalles
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredDiagnoses.length === 0 && (
                            <tr>
                                <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                                    <Stethoscope className="mx-auto mb-3 opacity-20" size={48} />
                                    <p className="font-medium">No se encontraron diagnósticos</p>
                                    <p className="text-sm mt-1">Intenta ajustar los filtros o crear uno nuevo</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
