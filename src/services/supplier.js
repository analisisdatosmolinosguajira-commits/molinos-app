import { supabase } from './supabase';

export const SupplierService = {
    async getSuppliers() {
        const { data, error } = await supabase
            .from('supplier')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching suppliers:', error);
            throw error;
        }

        return data || [];
    },

    async createSupplier(data) {
        const { data: supplier, error } = await supabase
            .from('supplier')
            .insert([data])
            .select()
            .single();

        if (error) throw error;
        return supplier;
    },

    async updateSupplier(supplierId, data) {
        const { data: supplier, error } = await supabase
            .from('supplier')
            .update(data)
            .eq('supplier_id', supplierId)
            .select()
            .single();

        if (error) throw error;
        return supplier;
    },

    async deleteSupplier(supplierId) {
        const { error } = await supabase
            .from('supplier')
            .delete()
            .eq('supplier_id', supplierId);
        if (error) throw error;
    },

    // --- Supplier Catalog Methods ---

    async getSupplierById(supplierId) {
        const { data, error } = await supabase
            .from('supplier')
            .select('*')
            .eq('supplier_id', supplierId)
            .single();

        if (error) throw error;
        return data;
    },

    async getSupplierCatalog(supplierId) {
        // Fetch raw catalog entries with their polymorphic relations joined
        const { data, error } = await supabase
            .from('supplier_catalog')
            .select(`
                *,
                material:material_id (*),
                piece:piece_id (*),
                tool:tool_id (*),
                safety:safety_id ( safety_id, code, name, description, unit, min_stock, supplier_id )
            `)
            .eq('supplier_id', supplierId)
            .order('catalog_id', { ascending: false });

        if (error) {
            console.error('Error fetching supplier catalog:', error);
            throw error;
        }

        // Normalize the payload to flatten the joined item details
        return (data || []).map(item => {
            let baseItem = null;
            let category = 'Desconocido';

            if (item.material) {
                baseItem = item.material;
                category = 'Material';
            } else if (item.piece) {
                baseItem = item.piece;
                category = 'Pieza';
            } else if (item.tool) {
                baseItem = item.tool;
                category = 'Herramienta';
            } else if (item.safety) {
                baseItem = item.safety;
                category = 'EPP';
            }

            return {
                ...item,
                item_name: baseItem?.name || 'Ítem Eliminado',
                item_code: baseItem?.code || 'N/A',
                item_category: category,
                base_item: baseItem
            };
        });
    },

    async addCatalogItem(catalogData) {
        const { data, error } = await supabase
            .from('supplier_catalog')
            .insert([catalogData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateCatalogItem(catalogId, catalogData) {
        const { data, error } = await supabase
            .from('supplier_catalog')
            .update(catalogData)
            .eq('catalog_id', catalogId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async removeCatalogItem(catalogId) {
        const { error } = await supabase
            .from('supplier_catalog')
            .delete()
            .eq('catalog_id', catalogId);

        if (error) throw error;
    },

    /**
     * Get catalog offerings for a specific item id and category across all suppliers.
     */
    async getCatalogsForItem(category, itemId) {
        let idColumn;
        switch (category) {
            case 'materiales': idColumn = 'material_id'; break;
            case 'piezas': idColumn = 'piece_id'; break;
            case 'herramientas': idColumn = 'tool_id'; break;
            case 'epp': idColumn = 'safety_id'; break;
            default: return [];
        }

        const { data, error } = await supabase
            .from('supplier_catalog')
            .select(`
                *,
                supplier:supplier_id (name)
            `)
            .eq(idColumn, itemId);

        if (error) {
            console.error('Error fetching catalogs for item:', error);
            return [];
        }

        return data || [];
    }
};
