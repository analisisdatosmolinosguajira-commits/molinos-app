import { supabase } from './supabase';

export const VehicleService = {
    /**
     * Get all vehicles in the fleet
     * @returns {Promise<Array>} List of vehicles
     */
    async getAllVehicles() {
        const { data, error } = await supabase
            .from('vehicle')
            .select('*')
            .order('status', { ascending: true }) // AVAILABLE first
            .order('plate_number', { ascending: true });

        if (error) throw error;
        return data;
    },

    /**
     * Get vehicle by ID
     * @param {number} id 
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
        // vehicleData: { plate_number, make, model, type, capacity_passengers, status, notes }
        const { data, error } = await supabase
            .from('vehicle')
            .insert([vehicleData])
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
     * Delete (or decommission) a vehicle
     * Note: Prefer changing status to DECOMMISSIONED over hard delete if history exists
     * @param {number} id 
     */
    async deleteVehicle(id) {
        const { error } = await supabase
            .from('vehicle')
            .delete()
            .eq('vehicle_id', id);

        if (error) throw error;
        return true;
    }
};
