import { supabase } from './supabase';

/**
 * SystemService — Maneja la jerarquía Sistema → Componente
 * 
 * mill_component tiene is_system: true  → Sistema raíz
 *                      is_system: false → Componente hijo (parent_component_id != null)
 *
 * mill_has_component trackea el estado por (mill_id, component_id) solo para hojas
 */
export const SystemService = {

    // ────────────────────────────────────────────────────────────
    // CATÁLOGO GLOBAL (no por molino)
    // ────────────────────────────────────────────────────────────

    /**
     * Devuelve todos los sistemas con sus componentes hijos anidados.
     * @returns {Promise<Array>} [ { ...system, children: [...components] }, ... ]
     */
    async getSystemsWithComponents() {
        const { data, error } = await supabase
            .from('mill_component')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;

        const all = data || [];
        const systems    = all.filter(r => r.is_system);
        const components = all.filter(r => !r.is_system);

        return systems.map(sys => ({
            ...sys,
            children: components
                .filter(c => c.parent_component_id === sys.component_id)
                .sort((a, b) => a.sort_order - b.sort_order)
        }));
    },

    /** Obtiene un sistema por su ID */
    async getSystemById(systemId) {
        const { data, error } = await supabase
            .from('mill_component')
            .select('*')
            .eq('component_id', systemId)
            .single();
        if (error) throw error;
        return data;
    },

    // ────────────────────────────────────────────────────────────
    // CRUD DE SISTEMAS
    // ────────────────────────────────────────────────────────────

    async createSystem({ code, name, description }) {
        const { data, error } = await supabase
            .from('mill_component')
            .insert([{
                code: code.trim().toUpperCase(),
                name: name.trim(),
                description: description?.trim() || null,
                is_system: true,
                sort_order: 99,
                photo_urls: '[]'
            }])
            .select()
            .single();
        if (error) throw error;

        // Poblar mill_has_component no aplica a sistemas (solo a componentes hijos)
        return data;
    },

    async updateSystem(systemId, { code, name, description }) {
        const updates = {};
        if (code)        updates.code        = code.trim().toUpperCase();
        if (name)        updates.name        = name.trim();
        if (description !== undefined) updates.description = description?.trim() || null;

        const { data, error } = await supabase
            .from('mill_component')
            .update(updates)
            .eq('component_id', systemId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteSystem(systemId) {
        // Los componentes hijos se eliminan en cascade (FK mill_component_parent_fkey)
        // Los mill_has_component se eliminan en cascade (FK fk_mhc_component)
        const { error } = await supabase
            .from('mill_component')
            .delete()
            .eq('component_id', systemId);
        if (error) throw error;
        return true;
    },

    // ────────────────────────────────────────────────────────────
    // CRUD DE COMPONENTES (hojas)
    // ────────────────────────────────────────────────────────────

    async createComponent({ code, name, description, parent_component_id }) {
        // 1. Insertar en catálogo
        const { data: comp, error } = await supabase
            .from('mill_component')
            .insert([{
                code: code.trim().toUpperCase(),
                name: name.trim(),
                description: description?.trim() || null,
                is_system: false,
                parent_component_id,
                sort_order: 99,
                photo_urls: '[]'
            }])
            .select()
            .single();
        if (error) throw error;

        // 2. Poblar automáticamente en todos los molinos con estado FUNCIONAL
        const { data: mills } = await supabase.from('mill').select('mill_id');
        if (mills && mills.length > 0) {
            const rows = mills.map(m => ({
                mill_id: m.mill_id,
                component_id: comp.component_id,
                status: 'FUNCIONAL',
                installed_date: new Date().toISOString().split('T')[0]
            }));
            await supabase.from('mill_has_component').insert(rows);
        }

        return comp;
    },

    async updateComponent(componentId, { code, name, description }) {
        const updates = {};
        if (code)        updates.code        = code.trim().toUpperCase();
        if (name)        updates.name        = name.trim();
        if (description !== undefined) updates.description = description?.trim() || null;

        const { data, error } = await supabase
            .from('mill_component')
            .update(updates)
            .eq('component_id', componentId)
            .single();
        if (error) throw error;
        return data;
    },

    async deleteComponent(componentId) {
        // mill_has_component se elimina en cascade
        const { error } = await supabase
            .from('mill_component')
            .delete()
            .eq('component_id', componentId);
        if (error) throw error;
        return true;
    },

    // ────────────────────────────────────────────────────────────
    // FOTOS DE REFERENCIA (por sistema)
    // ────────────────────────────────────────────────────────────

    /**
     * Sube una foto de referencia para un sistema/componente.
     * Guarda la URL en mill_component.photo_urls (JSONB array).
     */
    async uploadPhoto(componentId, file) {
        const ext  = file.name.split('.').pop();
        const path = `systems/${componentId}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('system-photos')
            .upload(path, file, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('system-photos')
            .getPublicUrl(path);

        const publicUrl = urlData.publicUrl;

        // Agregar URL al array en DB
        const { data: current } = await supabase
            .from('mill_component')
            .select('photo_urls')
            .eq('component_id', componentId)
            .single();

        const currentUrls = Array.isArray(current?.photo_urls) ? current.photo_urls : [];
        const newUrls = [...currentUrls, publicUrl];

        const { error: updateError } = await supabase
            .from('mill_component')
            .update({ photo_urls: newUrls })
            .eq('component_id', componentId);

        if (updateError) throw updateError;
        return publicUrl;
    },

    /**
     * Elimina una foto de referencia.
     */
    async deletePhoto(componentId, photoUrl) {
        const { data: current } = await supabase
            .from('mill_component')
            .select('photo_urls')
            .eq('component_id', componentId)
            .single();

        const currentUrls = Array.isArray(current?.photo_urls) ? current.photo_urls : [];
        const newUrls = currentUrls.filter(u => u !== photoUrl);

        const { error } = await supabase
            .from('mill_component')
            .update({ photo_urls: newUrls })
            .eq('component_id', componentId);

        if (error) throw error;

        // Intentar eliminar de storage (best-effort)
        try {
            const urlObj   = new URL(photoUrl);
            const pathPart = urlObj.pathname.split('/system-photos/')[1];
            if (pathPart) {
                await supabase.storage.from('system-photos').remove([pathPart]);
            }
        } catch (_) {}

        return true;
    },

    // ────────────────────────────────────────────────────────────
    // ESTADO POR MOLINO — agrupado por sistema
    // ────────────────────────────────────────────────────────────

    /**
     * Devuelve el estado de todos los componentes de un molino,
     * agrupados por sistema.
     *
     * @param {number} millId
     * @returns {Promise<Array>} sistemas con { ...sys, components: [{...comp, status, installed_date}] }
     */
    async getMillSystemStatus(millId) {
        const { data, error } = await supabase
            .from('mill_has_component')
            .select(`
                id,
                status,
                installed_date,
                mill_component!fk_mhc_component (
                    component_id,
                    code,
                    name,
                    description,
                    sort_order,
                    parent_component_id
                )
            `)
            .eq('mill_id', millId);

        if (error) throw error;

        // Obtener todos los sistemas del catálogo
        const { data: systems } = await supabase
            .from('mill_component')
            .select('*')
            .eq('is_system', true)
            .order('sort_order');

        const mhcList = (data || []).map(row => ({
            mhc_id: row.id,
            status: row.status,
            installed_date: row.installed_date,
            ...row.mill_component
        }));

        return (systems || []).map(sys => {
            const components = mhcList
                .filter(c => c.parent_component_id === sys.component_id)
                .sort((a, b) => a.sort_order - b.sort_order);

            // Health summary
            const total    = components.length;
            const ok       = components.filter(c => c.status === 'FUNCIONAL').length;
            const warn     = components.filter(c => c.status === 'DESGASTADO').length;
            const critical = components.filter(c =>
                ['DANADO', 'REQUIERE_CAMBIO', 'AUSENTE'].includes(c.status)).length;

            const healthPct = total > 0 ? Math.round((ok / total) * 100) : 100;
            const worstStatus = critical > 0 ? 'CRITICO' : warn > 0 ? 'ADVERTENCIA' : 'BIEN';

            return { ...sys, components, health: { total, ok, warn, critical, healthPct, worstStatus } };
        });
    },

    /**
     * Actualiza el estado de un componente en un molino específico.
     */
    async updateMillComponentStatus(mhcId, { status, installed_date }) {
        const updates = {};
        if (status)         updates.status         = status;
        if (installed_date) updates.installed_date = installed_date;

        const { data, error } = await supabase
            .from('mill_has_component')
            .update(updates)
            .eq('id', mhcId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
