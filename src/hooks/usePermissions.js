import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

// Cache permissions per session to avoid re-fetching
let permissionCache = {};
let cacheRole = null;
let cacheSecondaryRole = null;

export function usePermissions(module) {
    const { profile } = useAuth();
    const [permissions, setPermissions] = useState({ canCreate: false, canUpdate: false, canDelete: false, canRead: true, loading: true });

    const role = profile?.app_role || 'operativo';
    const secondaryRole = profile?.secondary_role || null;

    useEffect(() => {
        loadPermissions();
    }, [role, secondaryRole, module]);

    const loadPermissions = async () => {
        // Everyone can read everything except admin_operaciones (non-supervisors)
        if (module === 'admin_operaciones' && role !== 'supervisor') {
            setPermissions({ canCreate: false, canUpdate: false, canDelete: false, canRead: false, loading: false });
            return;
        }

        // Supervisor always has full access
        if (role === 'supervisor') {
            setPermissions({ canCreate: true, canUpdate: true, canDelete: true, canRead: true, loading: false });
            return;
        }

        try {
            // Check if cache is still valid
            if (cacheRole !== role || cacheSecondaryRole !== secondaryRole) {
                permissionCache = {};
                cacheRole = role;
                cacheSecondaryRole = secondaryRole;
            }

            // Return from cache if available
            if (permissionCache[module]) {
                setPermissions({ ...permissionCache[module], loading: false });
                return;
            }

            // Fetch primary role permissions
            const { data: primaryPerms } = await supabase
                .from('app_permission')
                .select('can_create, can_update, can_delete')
                .eq('role', role)
                .eq('module', module)
                .single();

            let perms = {
                canCreate: primaryPerms?.can_create || false,
                canUpdate: primaryPerms?.can_update || false,
                canDelete: primaryPerms?.can_delete || false,
                canRead: true,
            };

            // If secondary role exists, combine permissions (OR logic)
            if (secondaryRole) {
                const { data: secondaryPerms } = await supabase
                    .from('app_permission')
                    .select('can_create, can_update, can_delete')
                    .eq('role', secondaryRole)
                    .eq('module', module)
                    .single();

                if (secondaryPerms) {
                    perms.canCreate = perms.canCreate || secondaryPerms.can_create;
                    perms.canUpdate = perms.canUpdate || secondaryPerms.can_update;
                    perms.canDelete = perms.canDelete || secondaryPerms.can_delete;
                }
            }

            permissionCache[module] = perms;
            setPermissions({ ...perms, loading: false });
        } catch (err) {
            console.warn('[Permissions] Error loading:', err.message);
            setPermissions({ canCreate: false, canUpdate: false, canDelete: false, canRead: true, loading: false });
        }
    };

    return permissions;
}

// Helper hook: preload ALL permissions for the sidebar
export function useAllPermissions() {
    const { profile } = useAuth();
    const [allPerms, setAllPerms] = useState({});
    const [loading, setLoading] = useState(true);

    const role = profile?.app_role || 'operativo';
    const secondaryRole = profile?.secondary_role || null;

    useEffect(() => {
        loadAll();
    }, [role, secondaryRole]);

    const loadAll = async () => {
        if (role === 'supervisor') {
            // Supervisor sees everything
            setAllPerms({});
            setLoading(false);
            return;
        }

        try {
            const { data: perms } = await supabase
                .from('app_permission')
                .select('module, can_create, can_update, can_delete')
                .eq('role', role);

            const result = {};
            (perms || []).forEach(p => {
                result[p.module] = {
                    canCreate: p.can_create,
                    canUpdate: p.can_update,
                    canDelete: p.can_delete,
                    canRead: true,
                };
            });

            // Merge secondary role if exists
            if (secondaryRole) {
                const { data: secPerms } = await supabase
                    .from('app_permission')
                    .select('module, can_create, can_update, can_delete')
                    .eq('role', secondaryRole);

                (secPerms || []).forEach(p => {
                    if (!result[p.module]) {
                        result[p.module] = { canCreate: false, canUpdate: false, canDelete: false, canRead: true };
                    }
                    result[p.module].canCreate = result[p.module].canCreate || p.can_create;
                    result[p.module].canUpdate = result[p.module].canUpdate || p.can_update;
                    result[p.module].canDelete = result[p.module].canDelete || p.can_delete;
                });
            }

            // admin_operaciones is never visible to non-supervisors
            if (result['admin_operaciones']) {
                result['admin_operaciones'].canRead = false;
            }

            setAllPerms(result);
            setLoading(false);
        } catch (err) {
            console.warn('[Permissions] Error loading all:', err.message);
            setLoading(false);
        }
    };

    return { allPerms, loading, isSupervisor: role === 'supervisor' };
}

// Reset cache on logout
export function clearPermissionCache() {
    permissionCache = {};
    cacheRole = null;
    cacheSecondaryRole = null;
}
