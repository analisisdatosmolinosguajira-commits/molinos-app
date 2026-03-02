import React, { useState, useEffect } from 'react';
import { AlertTriangle, Wrench, Clock, Filter, Search, X } from 'lucide-react';
import { MillService } from '../../services/mills';

const FailureHistoryTimeline = ({ millId }) => {
    const [history, setHistory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        type: 'all', // 'all', 'work_orders', 'component_issues'
        search: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchHistory();
    }, [millId, filters]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const filterParams = {};
            if (filters.type !== 'all') filterParams.type = filters.type;
            if (filters.search) filterParams.search = filters.search;
            if (filters.startDate) filterParams.startDate = filters.startDate;
            if (filters.endDate) filterParams.endDate = filters.endDate;

            const data = await MillService.getFailureHistory(millId, filterParams);
            setHistory(data);
        } catch (error) {
            console.error('Error loading failure history:', error);
        } finally {
            setLoading(false);
        }
    };

    const severityConfig = {
        critica: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: 'Crítica', dot: 'bg-red-500' },
        alta: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', label: 'Alta', dot: 'bg-orange-500' },
        media: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', label: 'Media', dot: 'bg-yellow-500' },
        baja: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', label: 'Baja', dot: 'bg-green-500' }
    };

    const typeConfig = {
        work_order: { icon: Wrench, label: 'Falla / Work Order', color: 'text-brand-600', bg: 'bg-brand-50' },
        component_issue: { icon: AlertTriangle, label: 'Problema de Componente', color: 'text-amber-600', bg: 'bg-amber-50' },
        failure_report: { icon: AlertTriangle, label: 'Reporte Manual', color: 'text-purple-600', bg: 'bg-purple-50' }
    };

    const clearFilters = () => {
        setFilters({
            type: 'all',
            search: '',
            startDate: '',
            endDate: ''
        });
    };

    if (loading) {
        return (
            <div className="text-center py-12 bg-slate-50 rounded-xl">
                <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-500">Cargando historial de fallas...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters Header */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Clock size={20} className="text-brand-500" />
                        Historial de Fallas
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="font-semibold">{history?.total || 0}</span> eventos totales
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Type Filter */}
                    <select
                        value={filters.type}
                        onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    >
                        <option value="all">Todos ({history?.total || 0})</option>
                        <option value="work_orders">🔧 OTs ({history?.workOrderCount || 0})</option>
                        <option value="component_issues">⚠️ Componentes ({history?.componentIssueCount || 0})</option>
                        <option value="failure_reports">📝 Reportes ({history?.failureReportCount || 0})</option>
                    </select>

                    {/* Search */}
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        />
                    </div>

                    {/* Date Range */}
                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        placeholder="Fecha inicio"
                        className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        placeholder="Fecha fin"
                        className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                </div>

                {/* Active Filters Indicator */}
                {(filters.type !== 'all' || filters.search || filters.startDate || filters.endDate) && (
                    <button
                        onClick={clearFilters}
                        className="mt-3 flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700"
                    >
                        <X size={16} />
                        Limpiar filtros
                    </button>
                )}
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                {history?.events && history.events.length > 0 ? (
                    <div className="relative">
                        {/* Vertical Line */}
                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200"></div>

                        {/* Events */}
                        <div className="space-y-6">
                            {history.events.map((event, index) => {
                                const severity = severityConfig[event.severity] || severityConfig.media;
                                const typeInfo = typeConfig[event.type];
                                const TypeIcon = typeInfo.icon;

                                return (
                                    <div key={event.id} className="relative pl-16">
                                        {/* Dot */}
                                        <div className={`absolute left-4 top-2 w-4 h-4 rounded-full ${severity.dot} border-4 border-white shadow-md z-10`}></div>

                                        {/* Event Card */}
                                        <div className={`border-2 ${severity.border} rounded-xl p-4 hover:shadow-md transition-all ${severity.bg}`}>
                                            {/* Header */}
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-start gap-3 flex-1">
                                                    <div className={`p-2 rounded-lg ${typeInfo.bg}`}>
                                                        <TypeIcon size={20} className={typeInfo.color} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-slate-900">{event.title}</h4>
                                                        <p className="text-sm text-slate-600 mt-1">{event.description}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1 rounded-lg font-bold text-xs ${severity.bg} ${severity.text}`}>
                                                    {severity.label}
                                                </span>
                                            </div>

                                            {/* Metadata */}
                                            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={14} />
                                                    {new Date(event.date).toLocaleDateString('es-CO', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                                <span className={`px-2 py-1 rounded ${typeInfo.bg} ${typeInfo.color} font-semibold`}>
                                                    {typeInfo.label}
                                                </span>
                                                {event.type === 'component_issue' && event.metadata?.component_name && (
                                                    <span className="px-2 py-1 rounded bg-purple-100 text-purple-700 font-semibold">
                                                        {event.metadata.component_name}
                                                    </span>
                                                )}
                                                {event.status && (
                                                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-600">
                                                        Estado: {event.status}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <AlertTriangle size={48} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500">No se encontraron eventos con los filtros aplicados</p>
                        {(filters.type !== 'all' || filters.search || filters.startDate || filters.endDate) && (
                            <button
                                onClick={clearFilters}
                                className="mt-4 px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
                            >
                                Ver todos los eventos
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FailureHistoryTimeline;
