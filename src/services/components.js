import { supabase } from './supabase';

/**
 * Service for managing mill components
 * Handles CRUD operations for the mill_component table
 */
export const ComponentService = {
    /**
     * Get all components
     * @returns {Promise<Array>} List of all components
     */
    async getAllComponents() {
        const { data, error } = await supabase
            .from('mill_component')
            .select('*')
            .order('code');

        if (error) {
            console.error('Error fetching components:', error);
            throw error;
        }

        return data || [];
    },

    /**
     * Get component by ID
     * @param {number} componentId - Component ID
     * @returns {Promise<Object>} Component data
     */
    async getComponentById(componentId) {
        const { data, error } = await supabase
            .from('mill_component')
            .select('*')
            .eq('component_id', componentId)
            .single();

        if (error) {
            console.error('Error fetching component:', error);
            throw error;
        }

        return data;
    },

    /**
     * Get component usage count (how many mills use it)
     * @param {number} componentId - Component ID
     * @returns {Promise<number>} Number of mills using this component
     */
    async getComponentUsageCount(componentId) {
        const { data, error, count } = await supabase
            .from('mill_has_component')
            .select('*', { count: 'exact', head: true })
            .eq('component_id', componentId);

        if (error) {
            console.error('Error fetching component usage:', error);
            throw error;
        }

        return count || 0;
    },

    /**
     * Get all components with usage counts
     * @returns {Promise<Array>} Components with usage counts
     */
    async getComponentsWithUsage() {
        // First get all components
        const components = await this.getAllComponents();

        // Then get usage count for each
        const componentsWithUsage = await Promise.all(
            components.map(async (component) => {
                const usageCount = await this.getComponentUsageCount(component.component_id);
                return {
                    ...component,
                    mills_using: usageCount
                };
            })
        );

        return componentsWithUsage;
    },

    /**
     * Create a new component
     * @param {Object} componentData - { name, code }
     * @returns {Promise<Object>} Created component
     */
    async createComponent(componentData) {
        const { data, error } = await supabase
            .from('mill_component')
            .insert([{
                name: componentData.name.trim(),
                code: componentData.code.trim().toUpperCase()
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating component:', error);
            throw error;
        }

        return data;
    },

    /**
     * Update an existing component
     * @param {number} componentId  - Component ID
     * @param {Object} componentData - { name, code }
     * @returns {Promise<Object>} Updated component
     */
    async updateComponent(componentId, componentData) {
        const updateData = {};
        if (componentData.name) updateData.name = componentData.name.trim();
        if (componentData.code) updateData.code = componentData.code.trim().toUpperCase();

        const { data, error } = await supabase
            .from('mill_component')
            .update(updateData)
            .eq('component_id', componentId)
            .select()
            .single();

        if (error) {
            console.error('Error updating component:', error);
            throw error;
        }

        return data;
    },

    /**
     * Delete a component (only if not in use)
     * @param {number} componentId - Component ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteComponent(componentId) {
        // Check if component is in use
        const usageCount = await this.getComponentUsageCount(componentId);
        if (usageCount > 0) {
            throw new Error(`No se puede eliminar. El componente está en uso en ${usageCount} molino(s).`);
        }

        const { error } = await supabase
            .from('mill_component')
            .delete()
            .eq('component_id', componentId);

        if (error) {
            console.error('Error deleting component:', error);
            throw error;
        }

        return true;
    },

    /**
     * Get components for a specific mill
     * @param {number} millId - Mill ID
     * @returns {Promise<Array>} Components installed in this mill
     */
    async getMillComponents(millId) {
        const { data, error } = await supabase
            .from('mill_has_component')
            .select(`
                *,
                mill_component (
                    component_id,
                    name,
                    code
                )
            `)
            .eq('mill_id', millId)
            .order('installed_date', { ascending: false });

        if (error) {
            console.error('Error fetching mill components:', error);
            throw error;
        }

        return data || [];
    },

    /**
     * Add a component to a mill
     * @param {Object} data - { mill_id, component_id, installed_date, status }
     * @returns {Promise<Object>} Created mill_has_component record
     */
    async addComponentToMill(data) {
        const { data: result, error } = await supabase
            .from('mill_has_component')
            .insert([{
                mill_id: data.mill_id,
                component_id: data.component_id,
                installed_date: data.installed_date || null,
                status: data.status || 'FUNCIONAL'
            }])
            .select()
            .single();

        if (error) {
            console.error('Error adding component to mill:', error);
            throw error;
        }

        return result;
    },

    /**
     * Remove a component from a mill
     * @param {number} relationId - mill_has_component.id
     * @returns {Promise<boolean>} Success status
     */
    async removeComponentFromMill(relationId) {
        const { error } = await supabase
            .from('mill_has_component')
            .delete()
            .eq('id', relationId);

        if (error) {
            console.error('Error removing component from mill:', error);
            throw error;
        }

        return true;
    }
};
