import { useState } from 'react';
import { Plus, Trash2, Package, Wrench, Shield, Cog, Truck } from 'lucide-react';

const ResourceRequirementsForm = ({ activityId, initialResources = [], onUpdate }) => {
    const [resources, setResources] = useState(initialResources);
    const [newResource, setNewResource] = useState({
        resource_type: 'material',
        resource_name: '',
        quantity_needed: 1,
        notes: ''
    });

    const resourceTypes = [
        { value: 'material', label: 'Material', icon: Package },
        { value: 'tool', label: 'Herramienta', icon: Wrench },
        { value: 'safety_equipment', label: 'EPP', icon: Shield },
        { value: 'piece', label: 'Pieza', icon: Cog },
        { value: 'vehicle', label: 'Vehículo', icon: Truck }
    ];

    const getIcon = (type) => {
        const resourceType = resourceTypes.find(rt => rt.value === type);
        const Icon = resourceType?.icon || Package;
        return Icon;
    };

    const handleAddResource = () => {
        if (!newResource.resource_name.trim()) {
            alert('Por favor ingresa el nombre del recurso');
            return;
        }

        const resource = {
            ...newResource,
            requirement_id: Date.now(), // Temporary ID for new resources
            isNew: true
        };

        const updated = [...resources, resource];
        setResources(updated);
        onUpdate?.(updated);

        // Reset form
        setNewResource({
            resource_type: 'material',
            resource_name: '',
            quantity_needed: 1,
            notes: ''
        });
    };

    const handleRemoveResource = (requirementId) => {
        const updated = resources.filter(r => r.requirement_id !== requirementId);
        setResources(updated);
        onUpdate?.(updated);
    };

    return (
        <div className="space-y-4">
            {/* Resources List */}
            {resources.length > 0 && (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Recursos Requeridos ({resources.length})
                    </label>
                    <div className="space-y-2">
                        {resources.map((resource) => {
                            const Icon = getIcon(resource.resource_type);
                            const typeLabel = resourceTypes.find(rt => rt.value === resource.resource_type)?.label;

                            return (
                                <div
                                    key={resource.requirement_id}
                                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                                >
                                    <Icon size={18} className="text-slate-600" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-slate-900">
                                                {resource.resource_name}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                ({typeLabel})
                                            </span>
                                        </div>
                                        <div className="text-sm text-slate-600 mt-0.5">
                                            Cantidad: {resource.quantity_needed}
                                            {resource.notes && (
                                                <span className="ml-2 text-slate-500">• {resource.notes}</span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveResource(resource.requirement_id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Add New Resource Form */}
            <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                    Agregar Recurso
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Resource Type */}
                    <div>
                        <label className="block text-xs text-slate-600 mb-1">Tipo</label>
                        <select
                            value={newResource.resource_type}
                            onChange={(e) => setNewResource({ ...newResource, resource_type: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {resourceTypes.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Resource Name */}
                    <div>
                        <label className="block text-xs text-slate-600 mb-1">Nombre *</label>
                        <input
                            type="text"
                            value={newResource.resource_name}
                            onChange={(e) => setNewResource({ ...newResource, resource_name: e.target.value })}
                            placeholder="Ej: Rodamiento 6205"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Quantity */}
                    <div>
                        <label className="block text-xs text-slate-600 mb-1">Cantidad</label>
                        <input
                            type="number"
                            min="1"
                            value={newResource.quantity_needed}
                            onChange={(e) => setNewResource({ ...newResource, quantity_needed: parseInt(e.target.value) || 1 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs text-slate-600 mb-1">Notas</label>
                        <input
                            type="text"
                            value={newResource.notes}
                            onChange={(e) => setNewResource({ ...newResource, notes: e.target.value })}
                            placeholder="Especificaciones adicionales"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Add Button */}
                <button
                    type="button"
                    onClick={handleAddResource}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                    <Plus size={18} />
                    Agregar Recurso
                </button>
            </div>
        </div>
    );
};

export default ResourceRequirementsForm;
