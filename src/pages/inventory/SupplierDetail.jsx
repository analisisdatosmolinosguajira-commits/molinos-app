import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SupplierService } from '../../services/supplier';
import { ArrowLeft, Plus, Edit2, Trash2, Tag, Layers, FileText, Phone, Mail } from 'lucide-react';
import CatalogItemModal from '../../components/inventory/CatalogItemModal';

export default function SupplierDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [supplier, setSupplier] = useState(null);
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
        if (id) {
            loadSupplierData();
        }
    }, [id]);

    const loadSupplierData = async () => {
        setLoading(true);
        try {
            const [supplierData, catalogData] = await Promise.all([
                SupplierService.getSupplierById(id),
                SupplierService.getSupplierCatalog(id)
            ]);
            setSupplier(supplierData);
            setCatalog(catalogData);
        } catch (err) {
            console.error("Error loading supplier details", err);
            setError("No se pudo cargar la información del proveedor.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateItem = () => {
        setEditingItem(null);
        setShowModal(true);
    };

    const handleEditItem = (item) => {
        setEditingItem(item);
        setShowModal(true);
    };

    const handleDeleteItem = async (item) => {
        if (window.confirm(`¿Está seguro de eliminar "${item.item_name}" del catálogo de este proveedor?`)) {
            try {
                await SupplierService.removeCatalogItem(item.catalog_id);
                await loadSupplierData();
            } catch (err) {
                console.error("Error deleting catalog item", err);
                alert("Hubo un error al eliminar el artículo.");
            }
        }
    };

    const handleSaveCatalogItem = async (catalogData) => {
        if (editingItem) {
            await SupplierService.updateCatalogItem(editingItem.catalog_id, catalogData);
        } else {
            await SupplierService.addCatalogItem(catalogData);
        }
        setShowModal(false);
        await loadSupplierData();
    };

    const formatCurrency = (value, currency) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: currency || 'COP'
        }).format(value);
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando perfil del proveedor...</div>;
    if (error || !supplier) return <div className="p-8 text-center text-rose-500">{error || 'Proveedor no encontrado'}</div>;

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Header & Back Button */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/inventario', { state: { activeTab: 'proveedores' } })}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{supplier.name}</h1>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                        <Tag size={14} />
                        <span>{supplier.supplier_type || 'General'}</span>
                    </div>
                </div>
            </div>

            {/* Supplier Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                        <Phone size={18} className="text-brand-500" />
                        Contacto
                    </h3>
                    <div className="space-y-2 text-sm">
                        <p><span className="text-slate-500">Nombre:</span> <span className="font-medium text-slate-800">{supplier.contact_name || 'N/A'}</span></p>
                        <p><span className="text-slate-500">Teléfono:</span> <span className="font-medium text-slate-800">{supplier.phone || 'N/A'}</span></p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                        <Mail size={18} className="text-brand-500" />
                        Digital
                    </h3>
                    <div className="space-y-2 text-sm">
                        <p><span className="text-slate-500">Email:</span> <span className="font-medium text-slate-800">{supplier.email || 'N/A'}</span></p>
                        <p><span className="text-slate-500">Ubicación:</span> <span className="font-medium text-slate-800">{supplier.address || 'N/A'}</span></p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                        <FileText size={18} className="text-brand-500" />
                        Notas Adicionales
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-3">
                        {supplier.notes || 'Sin anotaciones registradas.'}
                    </p>
                </div>
            </div>

            {/* Catalog Data Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-8">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Layers size={20} className="text-brand-500" />
                            Lista de Precios y Catálogo
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Variantes comerciales y precios ofrecidos por este proveedor.</p>
                    </div>
                    <button
                        onClick={handleCreateItem}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium shadow-sm"
                    >
                        <Plus size={16} />
                        Agregar Artículo
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Ref / Ítem de Inventario</th>
                                <th className="px-6 py-4">Categoría</th>
                                <th className="px-6 py-4">Marca / Modelo</th>
                                <th className="px-6 py-4 text-right">Precio de Compra</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {catalog.map(item => (
                                <tr key={item.catalog_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{item.item_name}</div>
                                        <div className="text-xs text-slate-400 font-mono mt-0.5">SKU: {item.sku || 'S/C'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium">
                                            {item.item_category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-800 font-medium">{item.brand || '-'}</div>
                                        <div className="text-slate-500 text-xs">{item.model || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="font-bold text-slate-800 text-base">
                                            {formatCurrency(item.price, item.currency)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleEditItem(item)}
                                                className="p-1.5 text-slate-600 hover:bg-slate-100 hover:text-brand-600 rounded transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteItem(item)}
                                                className="p-1.5 text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {catalog.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                        <Layers size={32} className="mx-auto mb-3 text-slate-300 opacity-50" />
                                        <p className="font-medium text-slate-500">Este proveedor no tiene artículos en su catálogo.</p>
                                        <p className="text-sm mt-1">Vincula elementos para establecer listas de precios.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Custom Price Catalog Modal */}
            {showModal && (
                <CatalogItemModal
                    supplierId={parseInt(id)}
                    catalogItem={editingItem}
                    onClose={() => setShowModal(false)}
                    onSave={handleSaveCatalogItem}
                />
            )}
        </div>
    );
}
