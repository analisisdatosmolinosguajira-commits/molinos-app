import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pagination Component
 * Reusable pagination UI for tables and lists
 * 
 * @param {number} currentPage - Current active page (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {number} totalItems - Total number of items across all pages
 * @param {number} itemsPerPage - Items shown per page
 * @param {function} onPageChange - Callback when page changes
 */
const Pagination = ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange
}) => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const renderPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        // Adjust start if we're near the end
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        // Add ellipsis at start if needed
        if (startPage > 1) {
            pages.push(
                <button
                    key={1}
                    onClick={() => onPageChange(1)}
                    className="px-3 py-1 bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                >
                    1
                </button>
            );
            if (startPage > 2) {
                pages.push(
                    <span key="ellipsis-start" className="px-2 text-slate-400">
                        ...
                    </span>
                );
            }
        }

        // Add page numbers
        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => onPageChange(i)}
                    className={`px-3 py-1 rounded-lg transition-colors ${i === currentPage
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                >
                    {i}
                </button>
            );
        }

        // Add ellipsis at end if needed
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push(
                    <span key="ellipsis-end" className="px-2 text-slate-400">
                        ...
                    </span>
                );
            }
            pages.push(
                <button
                    key={totalPages}
                    onClick={() => onPageChange(totalPages)}
                    className="px-3 py-1 bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                >
                    {totalPages}
                </button>
            );
        }

        return pages;
    };

    if (totalPages <= 1) {
        return null; // Don't show pagination if only one page
    }

    return (
        <div className="flex items-center justify-between mt-6 px-4">
            <div className="text-sm text-slate-600">
                Mostrando <span className="font-semibold text-slate-900">{startItem}-{endItem}</span> de{' '}
                <span className="font-semibold text-slate-900">{totalItems}</span> registros
            </div>

            <div className="flex items-center gap-2">
                {/* Previous Button */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Página anterior"
                >
                    <ChevronLeft size={18} />
                </button>

                {/* Page Numbers */}
                <div className="flex gap-1">
                    {renderPageNumbers()}
                </div>

                {/* Next Button */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Página siguiente"
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
