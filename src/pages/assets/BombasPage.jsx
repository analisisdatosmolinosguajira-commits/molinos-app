import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Droplet, Settings, Wrench } from 'lucide-react';
import PumpSearchFilters from '../../components/pump/PumpSearchFilters';
import PumpTable from '../../components/pump/PumpTable';
import PumpFormModal from '../../components/pump/PumpFormModal';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
import Pagination from '../../components/ui/Pagination';
import PumpDetail from './PumpDetail';
import { PumpService } from '../../services/pumps';

export default function BombasPage() {
    // State
    const [pumps, setPumps] = useState([]);
    const [filteredPumps, setFilteredPumps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // View state
    const [selectedPumpId, setSelectedPumpId] = useState(null);

    // Modal state
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingPump, setEditingPump] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ open: false, pump: null });

    // Filter state
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        type: '',
        location: ''
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Load pumps on mount
    useEffect(() => {
        loadPumps();
    }, []);

    // Apply filters when pumps or filters change
    useEffect(() => {
        applyFilters();
    }, [pumps, filters]);

    const loadPumps = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await PumpService.getAllPumps();
            setPumps(data || []);
        } catch (err) {
            console.error('Error loading pumps:', err);
            setError(err.message || 'Error al cargar las bombas');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let result = [...pumps];

        // Search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter(p =>
                (p.serial_number || '').toLowerCase().includes(searchLower) ||
                (p.model || '').toLowerCase().includes(searchLower) ||
                (p.type || '').toLowerCase().includes(searchLower)
            );
        }

        // Status filter
        if (filters.status) {
            result = result.filter(p => p.status === filters.status);
        }

        // Type filter
        if (filters.type) {
            result = result.filter(p => p.type === filters.type);
        }

        // Location filter
        if (filters.location) {
            if (filters.location === 'installed') {
                result = result.filter(p => p.status === 'instalada');
            } else if (filters.location === 'storage') {
                result = result.filter(p => p.status === 'almacenada' || p.status === 'en_reparacion');
            }
        }

        setFilteredPumps(result);
        setCurrentPage(1); // Reset to first page on filter change
    };

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
    };

    const handleAddPump = () => {
        setEditingPump(null);
        setShowFormModal(true);
    };

    const handleEditPump = (pump) => {
        setEditingPump(pump);
        setShowFormModal(true);
    };

    const handleDeletePump = async (pump) => {
        // Check for dependencies
        const dependencies = [];

        // Check if installed
        if (pump.status === 'instalada') {
            dependencies.push('Bomba actualmente instalada en un molino');
        }

        // Could check for MO history
        // dependencies.push('2 órdenes de manufactura');

        setDeleteModal({
            open: true,
            pump: pump,
            itemName: pump.serial_number,
            dependencies
        });
    };

    const confirmDelete = async () => {
        try {
            await PumpService.deletePump(deleteModal.pump.pump_id);

            // Show success message
            console.log('Bomba eliminada exitosamente');

            // Reload pumps
            await loadPumps();

            setDeleteModal({ open: false, pump: null });
        } catch (error) {
            console.error('Error deleting pump:', error);
            alert(`Error al eliminar bomba: ${error.message}`);
        }
    };

    const handleFormSuccess = async () => {
        await loadPumps();
    };

    // KPI calculations
    const kpis = {
        installed: pumps.filter(p => p.status === 'instalada').length,
        storage: pumps.filter(p => p.status === 'almacenada').length,
        maintenance: pumps.filter(p => p.status === 'en_reparacion' || p.status === 'dañada').length,
        total: pumps.length
    };

    // Pagination calculations
    const totalPages = Math.ceil(filteredPumps.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedPumps = filteredPumps.slice(startIndex, endIndex);

    // Detail view
    if (selectedPumpId) {
        return <PumpDetail pumpId={selectedPumpId} onBack={() => setSelectedPumpId(null)} />;
    }

    // Error view
    if (error && !loading) {
        return (
            <div className="p-8 text-center">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md mx-auto">
                    <p className="font-bold text-red-900">Error cargando bombas</p>
                    <p className="text-sm mt-2 text-red-700">{error}</p>
                    <button
                        onClick={loadPumps}
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
                        ⚙️ Gestión de Bombas
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Inventario, estado y trazabilidad de equipos de bombeo
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={loadPumps}
                        disabled={loading}
                        className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Actualizar
                    </button>
                    <button
                        onClick={handleAddPump}
                        className="px-6 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 shadow-lg shadow-blue-600/30 transition-all font-bold flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Registrar Bomba
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{kpis.total}</p>
                                <p className="text-xs text-slate-500 font-medium uppercase mt-1">
                                    Total Registradas
                                </p>
                            </div>
                            <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
                                <Settings size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold text-green-600">{kpis.installed}</p>
                                <p className="text-xs text-slate-500 font-medium uppercase mt-1">
                                    Instaladas
                                </p>
                            </div>
                            <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                                <Droplet size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold text-brand-600">{kpis.storage}</p>
                                <p className="text-xs text-slate-500 font-medium uppercase mt-1">
                                    En Almacén
                                </p>
                            </div>
                            <div className="p-3 bg-brand-100 text-brand-600 rounded-xl">
                                <Settings size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold text-yellow-600">{kpis.maintenance}</p>
                                <p className="text-xs text-slate-500 font-medium uppercase mt-1">
                                    En Taller/Dañadas
                                </p>
                            </div>
                            <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl">
                                <Wrench size={24} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Search & Filters */}
            <PumpSearchFilters onFilterChange={handleFilterChange} />

            {/* Results Count */}
            {!loading && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-slate-600">
                        {filteredPumps.length === pumps.length ? (
                            <span>
                                <span className="font-bold text-slate-900">{pumps.length}</span> bomba(s) registrada(s)
                            </span>
                        ) : (
                            <span>
                                <span className="font-bold text-slate-900">{filteredPumps.length}</span> de{' '}
                                <span className="font-bold text-slate-900">{pumps.length}</span> bomba(s)
                            </span>
                        )}
                    </p>
                </div>
            )}

            {/* Table */}
            <PumpTable
                pumps={paginatedPumps}
                onEdit={handleEditPump}
                onDelete={handleDeletePump}
                loading={loading}
            />

            {/* Pagination */}
            {!loading && filteredPumps.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredPumps.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            )}

            {/* Modals */}
            <PumpFormModal
                isOpen={showFormModal}
                onClose={() => {
                    setShowFormModal(false);
                    setEditingPump(null);
                }}
                onSuccess={handleFormSuccess}
                pumpData={editingPump}
            />

            <ConfirmDeleteModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, pump: null })}
                onConfirm={confirmDelete}
                itemName={deleteModal.itemName}
                itemType="bomba"
                dependencies={deleteModal.dependencies}
            />
        </div>
    );
}
