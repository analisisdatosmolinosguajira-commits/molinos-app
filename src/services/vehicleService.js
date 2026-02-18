
import { supabase } from './supabase';

export const VehicleService = {
    /**
     * Get all vehicles
     */
    async getVehicles() {
        const { data, error } = await supabase
            .from('vehicle')
            .select('*')
            .order('plate_number', { ascending: true });

        if (error) throw error;
        return data;
    },

    /**
     * Get a single vehicle by ID
     */
    async getVehicleById(id) {
        const { data, error } = await supabase
            .from('vehicle')
            .select('*')
            .eq('vehicle_id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Create a new vehicle
     * @param {Object} vehicleData 
     */
    async createVehicle(vehicleData) {
        // Remove ID if present to let DB handle sequence
        const { vehicle_id, ...dataToInsert } = vehicleData;

        const { data, error } = await supabase
            .from('vehicle')
            .insert([dataToInsert])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update an existing vehicle
     * @param {number} id 
     * @param {Object} updates 
     */
    async updateVehicle(id, updates) {
        const { data, error } = await supabase
            .from('vehicle')
            .update(updates)
            .eq('vehicle_id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a vehicle
     * @param {number} id 
     */
    async deleteVehicle(id) {
        const { error } = await supabase
            .from('vehicle')
            .delete()
            .eq('vehicle_id', id);

        if (error) throw error;
        return true;
    },

    /**
     * Get generic vehicle types for dropdowns
     */
    getVehicleTypes() {
        return [
            'CAMIONETA',
            'CAMION',
            'MOTO',
            'AUTO',
            'MAQUINARIA',
            'OTRO'
        ];
    },

    /**
     * Get generic vehicle statuses
     */
    getVehicleStatuses() {
        return [
            { value: 'DISPONIBLE', label: 'Disponible', color: 'green' },
            { value: 'MANTENIMIENTO', label: 'En Mantenimiento', color: 'orange' },
            { value: 'EN_USO', label: 'En Uso', color: 'blue' },
            { value: 'FUERA_DE_SERVICIO', label: 'Fuera de Servicio', color: 'red' }
        ];
    }
};
