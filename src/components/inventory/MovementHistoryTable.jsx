import React, { useState } from 'react';
import { Filter, TrendingUp, TrendingDown, Edit3, FileText, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export default function MovementHistoryTable({ movements, filters, onFilterChange, loading }) {
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const categoryColors = {
        materiales: 'bg-blue-100 text-blue-700',
        piezas: 'bg-purple-100 text-purple-700',
        herramientas: 'bg-orange-100 text-orange-700',
        epp: 'bg-green-100 text-green-700'
    };

    const categoryLabels = {
        materiales: 'Material',
        piezas: 'Pieza',
        herramientas: 'Herramienta',
        epp: 'EPP'
    };

    const typeConfig = {
        IN: { label: 'Ingreso', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', sign: '+' },
        OUT: { label: 'Salida', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50', sign: '-' },
        USE: { label: 'Uso', icon: TrendingDown, color: 'text-orange-600', bg: 'bg-orange-50', sign: '-' },
        RETURN: { label: 'Devolución', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', sign: '+' },
        ADJUST: { label: 'Ajuste', icon: Edit3, color: 'text-yellow-600', bg: 'bg-yellow-50', sign: '±' }
    };

    const referenceLabels = {
        MANUAL: 'Manual',
        PURCHASE: 'Compra',
        TRANSFER: 'Transferencia',
        WORK_ORDER: 'Orden de Trabajo',
        RETURN: 'Devolución',
        DAMAGE: 'Daño/Pérdida'
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    // Pagination logic
    const totalPages = Math.ceil(movements.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedMovements = movements.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [movements.length]);

    const goToPage = (page) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800">Historial de Movimientos</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        {movements.length} movimiento{movements.length !== 1 ? 's' : ''} registrados
                    </p>
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                    <Filter className="w-4 h-4" />
                    <span className="text-sm font-medium">Filtros</span>
                </button>
            </div>

            {/* Filters (Collapsible) */}
            {showFilters && (
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 grid grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Categoría</label>
                        <select
                            value={filters.category || ''}
                            onChange={(e) => onFilterChange({ ...filters, category: e.target.value || null })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">Todas</option>
                            <option value="materiales">Materiales</option>
                            <option value="piezas">Piezas</option>
                            <option value="herramientas">Herramientas</option>
                            <option value="epp">EPP</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                        <select
                            value={filters.type || ''}
                            onChange={(e) => onFilterChange({ ...filters, type: e.target.value || null })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">Todos</option>
                            <option value="IN">Ingreso</option>
                            <option value="OUT">Salida</option>
                            <option value="USE">Uso</option>
                            <option value="RETURN">Devolución</option>
                            <option value="ADJUST">Ajuste</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Desde</label>
                        <input
                            type="date"
                            value={filters.startDate || ''}
                            onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value || null })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Hasta</label>
                        <input
                            type="date"
                            value={filters.endDate || ''}
                            onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value || null })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                        />
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                {loading ? (
                    <div className="py-12 text-center">
                        <div className="inline-block w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-slate-500">Cargando movimientos...</p>
                    </div>
                ) : movements.length === 0 ? (
                    <div className="py-12 text-center">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No hay movimientos registrados</p>
                        <p className="text-sm text-slate-400 mt-1">
                            Los movimientos aparecerán aquí cuando se registren
                        </p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                    Fecha
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                    Categoría
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                    Ítem
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                    Tipo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                    Cantidad
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                    Referencia
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                    Notas
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {paginatedMovements.map((movement, index) => {
                                const typeInfo = typeConfig[movement.type] || typeConfig.ADJUST;
                                const TypeIcon = typeInfo.icon;
                                // Create unique key using category, item ID, and timestamp
                                const uniqueKey = `${movement.category}-${movement.itemId}-${movement.date}-${index}`;

                                return (
                                    <tr
                                        key={uniqueKey}
                                        className={`hover:bg-slate-50 transition-colors ${typeInfo.bg}`}
                                    >
                                        {/* Date */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                {formatDate(movement.date)}
                                            </div>
                                        </td>

                                        {/* Category */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[movement.category]}`}>
                                                {categoryLabels[movement.category]}
                                            </span>
                                        </td>

                                        {/* Item */}
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-800">
                                                {movement.itemName}
                                            </div>
                                            <div className="text-xs text-slate-500">{movement.itemCode}</div>
                                        </td>

                                        {/* Type */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className={`flex items-center gap-2 ${typeInfo.color}`}>
                                                <TypeIcon className="w-4 h-4" />
                                                <span className="text-sm font-medium">{typeInfo.label}</span>
                                            </div>
                                        </td>

                                        {/* Quantity */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-sm font-semibold ${typeInfo.color}`}>
                                                {typeInfo.sign}{Math.abs(movement.quantity)}
                                            </span>
                                        </td>

                                        {/* Reference */}
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-700">
                                                {referenceLabels[movement.reference_type] || movement.reference_type}
                                            </div>
                                            {movement.reference_id && (
                                                <div className="text-xs text-slate-500">
                                                    ID: {movement.reference_id}
                                                </div>
                                            )}
                                        </td>

                                        {/* Notes */}
                                        <td className="px-6 py-4">
                                            {movement.notes ? (
                                                <div className="text-sm text-slate-600 max-w-xs truncate" title={movement.notes}>
                                                    {movement.notes}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-slate-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer with pagination */}
            {movements.length > 0 && (
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-slate-600">
                            Mostrando {startIndex + 1} - {Math.min(endIndex, movements.length)} de {movements.length} movimientos
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-600">Por página:</label>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-brand-500"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Página anterior"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className="flex items-center gap-1">
                                {[...Array(totalPages)].map((_, i) => {
                                    const page = i + 1;
                                    // Show first page, last page, current page, and pages around current
                                    if (
                                        page === 1 ||
                                        page === totalPages ||
                                        (page >= currentPage - 1 && page <= currentPage + 1)
                                    ) {
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => goToPage(page)}
                                                className={`min-w-[2rem] px-2 py-1 rounded text-sm font-medium transition-colors ${currentPage === page
                                                    ? 'bg-brand-600 text-white'
                                                    : 'border border-slate-300 hover:bg-slate-100'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    } else if (
                                        page === currentPage - 2 ||
                                        page === currentPage + 2
                                    ) {
                                        return <span key={page} className="text-slate-400">...</span>;
                                    }
                                    return null;
                                })}
                            </div>

                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Página siguiente"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
