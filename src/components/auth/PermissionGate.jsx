import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';

/**
 * PermissionGate – conditionally renders children based on user permissions.
 * 
 * Usage:
 *   <PermissionGate module="inventario" action="create">
 *     <button>Crear Material</button>
 *   </PermissionGate>
 * 
 * Props:
 *   module  - module key (e.g. 'inventario', 'ordenes_trabajo')
 *   action  - 'create' | 'update' | 'delete' | 'read'
 *   fallback - optional JSX to show when denied (default: nothing)
 */
export default function PermissionGate({ module, action = 'read', fallback = null, children }) {
    const { canCreate, canUpdate, canDelete, canRead, loading } = usePermissions(module);

    if (loading) return null;

    const allowed =
        action === 'create' ? canCreate :
            action === 'update' ? canUpdate :
                action === 'delete' ? canDelete :
                    canRead;

    if (!allowed) return fallback;

    return <>{children}</>;
}
