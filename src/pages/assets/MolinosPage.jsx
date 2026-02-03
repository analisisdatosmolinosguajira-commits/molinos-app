import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import MillSearchFilters from '../../components/mill/MillSearchFilters';
import MillTable from '../../components/mill/MillTable';
import MillFormModal from '../../components/mill/MillFormModal';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
import Pagination from '../../components/ui/Pagination';
import MillDetail from './MillDetail';
import { MillService } from '../../services/mills';

export default function MolinosPage() {
    // State
    const [mills, setMills] = useState([]);
    const [filteredMills, setFilteredMills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // View state
    const [selectedMillId, setSelectedMillId] = useState(null);

    // Modal state
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingMill, setEditingMill] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ open: false, mill: null });

    // Filter state
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        communityId: '',
        hasPump: ''
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Load mills on mount
    useEffect(() => {
        loadMills();
    }, []);

    // Apply filters when mills or filters change
    useEffect(() => {
        applyFilters();
    }, [mills, filters]);

    const loadMills = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await MillService.getAllMills();
            setMills(data || []);
        } catch (err) {
            console.error('Error loading mills:', err);
            setError(err.message || 'Error al cargar los molinos');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let result = [...mills];

        // Search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter(m =>
                (m.code || '').toLowerCase().includes(searchLower) ||
                (m.name || '').toLowerCase().includes(searchLower) ||
                (m.community?.name || '').toLowerCase().includes(searchLower)
            );
        }

        // Status filter
        if (filters.status) {
            result = result.filter(m => m.status === filters.status);
        }

        // Community filter
        if (filters.communityId) {
            result = result.filter(m => m.community?.community_id === parseInt(filters.communityId));
        }

        // Pump filter
        if (filters.hasPump !== '') {
            const hasPump = filters.hasPump === 'true';
            result = result.filter(m => !!m.has_pump === hasPump);
        }

        setFilteredMills(result);
        setCurrentPage(1); // Reset to first page on filter change
    };

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
    };

    const handleAddMill = () => {
        setEditingMill(null);
        setShowFormModal(true);
    };

    const handleEditMill = (mill) => {
        setEditingMill(mill);
        setShowFormModal(true);
    };

    const handleDeleteMill = async (mill) => {
        // Check for dependencies
        const dependencies = [];

        // Check if has installed pump
        if (mill.has_pump) {
            dependencies.push('Tiene una bomba instalada');
        }

        // Check work orders (you would need to query this)
        // dependencies.push('3 órdenes de trabajo');

        setDeleteModal({
            open: true,
            mill: mill,
            itemName: mill.code,
            dependencies
        });
    };

    const confirmDelete = async () => {
        try {
            await MillService.deleteMill(deleteModal.mill.mill_id);

            // Show success message (you can add toast notification here)
            console.log('Molino eliminado exitosamente');

            // Reload mills
            await loadMills();

            setDeleteModal({ open: false, mill: null });
        } catch (error) {
            console.error('Error deleting mill:', error);
            alert(`Error al eliminar molino: ${error.message}`);
        }
    };

    const handleFormSuccess = async () => {
        await loadMills();
    };

    // Pagination calculations
    const totalPages = Math.ceil(filteredMills.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedMills = filteredMills.slice(startIndex, endIndex);

    // Detail view
    if (selectedMillId) {
        return <MillDetail millId={selectedMillId} onBack={() => setSelectedMillId(null)} />;
    }

    // Error view
    if (error && !loading) {
        return (
            <div className="p-8 text-center">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md mx-auto">
                    <p className="font-bold text-red-900">Error cargando molinos</p>
                    <p className="text-sm mt-2 text-red-700">{error}</p>
                    <button
                        onClick={loadMills}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                        🏭 Gestión de Molinos
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Gestión técnica de activos, historial y mantenimiento
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={loadMills}
                        disabled={loading}
                        className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Actualizar
                    </button>
                    <button
                        onClick={handleAddMill}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all font-bold flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Agregar Molino
                    </button>
                </div>
            </div>

            {/* Search & Filters */}
            <MillSearchFilters onFilterChange={handleFilterChange} />

            {/* Results Count */}
            {!loading && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-slate-600">
                        {filteredMills.length === mills.length ? (
                            <span>
                                <span className="font-bold text-slate-900">{mills.length}</span> molino(s) registrado(s)
                            </span>
                        ) : (
                            <span>
                                <span className="font-bold text-slate-900">{filteredMills.length}</span> de{' '}
                                <span className="font-bold text-slate-900">{mills.length}</span> molino(s)
                            </span>
                        )}
                    </p>
                </div>
            )}

            {/* Table */}
            <MillTable
                mills={paginatedMills}
                onEdit={handleEditMill}
                onDelete={handleDeleteMill}
                loading={loading}
            />

            {/* Pagination */}
            {!loading && filteredMills.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredMills.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            )}

            {/* Modals */}
            <MillFormModal
                isOpen={showFormModal}
                onClose={() => {
                    setShowFormModal(false);
                    setEditingMill(null);
                }}
                onSuccess={handleFormSuccess}
                millData={editingMill}
            />

            <ConfirmDeleteModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, mill: null })}
                onConfirm={confirmDelete}
                itemName={deleteModal.itemName}
                itemType="molino"
                dependencies={deleteModal.dependencies}
            />
        </div>
    );
}
