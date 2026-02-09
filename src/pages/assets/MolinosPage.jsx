import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Boxes, Edit2, Trash2 } from 'lucide-react';
import MillSearchFilters from '../../components/mill/MillSearchFilters';
import MillTable from '../../components/mill/MillTable';
import MillFormModal from '../../components/mill/MillFormModal';
import ComponentFormModal from '../../components/mill/ComponentFormModal';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
import Pagination from '../../components/ui/Pagination';
import MillDetail from './MillDetail';
import { MillService } from '../../services/mills';
import { ComponentService } from '../../services/components';

export default function MolinosPage() {
    // Tab state
    const [activeTab, setActiveTab] = useState('mills'); // 'mills' or 'components'

    // Mills State
    const [mills, setMills] = useState([]);
    const [filteredMills, setFilteredMills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Components State
    const [components, setComponents] = useState([]);
    const [componentsLoading, setComponentsLoading] = useState(false);

    // View state
    const [selectedMillId, setSelectedMillId] = useState(null);

    // Modal state
    const [showFormModal, setShowFormModal] = useState(false);
    const [showComponentModal, setShowComponentModal] = useState(false);
    const [editingMill, setEditingMill] = useState(null);
    const [editingComponent, setEditingComponent] = useState(null);
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
            console.log('🔄 Reloading mills...');
            const data = await MillService.getAllMills();
            console.log('📋 Mills loaded with components:', data.map(m => ({
                code: m.code,
                components_count: m.components_count,
                components: m.components
            })));
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

    // Component functions
    const loadComponents = async () => {
        try {
            setComponentsLoading(true);
            const data = await ComponentService.getComponentsWithUsage();
            setComponents(data || []);
        } catch (error) {
            console.error('Error loading components:', error);
        } finally {
            setComponentsLoading(false);
        }
    };

    const handleAddComponent = () => {
        setEditingComponent(null);
        setShowComponentModal(true);
    };

    const handleEditComponent = (component) => {
        setEditingComponent(component);
        setShowComponentModal(true);
    };

    const handleDeleteComponent = async (component) => {
        if (component.mills_using > 0) {
            alert(`No se puede eliminar. Este componente está en uso en ${component.mills_using} molino(s).`);
            return;
        }

        if (window.confirm(`¿Eliminar componente "${component.name}" (${component.code})?`)) {
            try {
                await ComponentService.deleteComponent(component.component_id);
                await loadComponents();
            } catch (error) {
                console.error('Error deleting component:', error);
                alert(`Error al eliminar: ${error.message}`);
            }
        }
    };

    const handleComponentSuccess = async () => {
        await loadComponents();
    };

    // Load data when tab changes
    useEffect(() => {
        if (activeTab === 'components' && components.length === 0) {
            loadComponents();
        }
    }, [activeTab]);

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
                        onClick={activeTab === 'mills' ? loadMills : loadComponents}
                        disabled={activeTab === 'mills' ? loading : componentsLoading}
                        className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={(activeTab === 'mills' ? loading : componentsLoading) ? 'animate-spin' : ''} />
                        Actualizar
                    </button>
                    {activeTab === 'mills' ? (
                        <button
                            onClick={handleAddMill}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all font-bold flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Agregar Molino
                        </button>
                    ) : (
                        <button
                            onClick={handleAddComponent}
                            className="px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-600/30 transition-all font-bold flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Agregar Componente
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <div className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('mills')}
                        className={`pb-3 px-2 font-semibold transition-colors relative ${activeTab === 'mills'
                            ? 'text-blue-600'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        Molinos
                        {activeTab === 'mills' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('components')}
                        className={`pb-3 px-2 font-semibold transition-colors relative flex items-center gap-2 ${activeTab === 'components'
                            ? 'text-purple-600'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        <Boxes size={18} />
                        Componentes
                        {activeTab === 'components' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mills Tab Content */}
            {activeTab === 'mills' && (
                <>
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
                </>
            )}

            {/* Components Tab Content */}
            {activeTab === 'components' && (
                <div className="space-y-4">
                    {/* Components Count */}
                    {!componentsLoading && (
                        <div className="flex items-center justify-between px-2">
                            <p className="text-sm text-slate-600">
                                <span className="font-bold text-slate-900">{components.length}</span> componente(s) registrado(s)
                            </p>
                        </div>
                    )}

                    {/* Components Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Código</th>
                                        <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Nombre</th>
                                        <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">Molinos Usando</th>
                                        <th className="px-6 py-4 text-right text-sm font-bold text-slate-700">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {componentsLoading ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center">
                                                <div className="flex items-center justify-center gap-2 text-slate-500">
                                                    <RefreshCw size={18} className="animate-spin" />
                                                    Cargando componentes...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : components.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                                                No hay componentes registrados. Haz click en "Agregar Componente" para comenzar.
                                            </td>
                                        </tr>
                                    ) : (
                                        components.map((component) => (
                                            <tr key={component.component_id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="font-mono font-semibold text-slate-900">{component.code}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-slate-700">{component.name}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${component.mills_using > 0
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {component.mills_using || 0}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleEditComponent(component)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteComponent(component)}
                                                            disabled={component.mills_using > 0}
                                                            className={`p-2 rounded-lg transition-colors ${component.mills_using > 0
                                                                ? 'text-slate-300 cursor-not-allowed'
                                                                : 'text-red-600 hover:bg-red-50'
                                                                }`}
                                                            title={component.mills_using > 0 ? 'No se puede eliminar (en uso)' : 'Eliminar'}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
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

            <ComponentFormModal
                isOpen={showComponentModal}
                onClose={() => {
                    setShowComponentModal(false);
                    setEditingComponent(null);
                }}
                onSuccess={handleComponentSuccess}
                componentData={editingComponent}
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
