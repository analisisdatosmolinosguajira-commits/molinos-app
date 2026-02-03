import { supabase } from './supabase';

export const PumpService = {
    // Get all pumps with current mill location
    async getAllPumps() {
        const { data, error } = await supabase
            .from('pump')
            .select(`
                *,
                mill_pump!pump_id (
                    removed_date,
                    mill!mill_id (
                        mill_id,
                        code,
                        name
                    )
                )
            `)
            .order('serial_number');

        if (error) {
            console.error("Supabase Error (getAllPumps):", error);
            throw error;
        }

        // Flatten and extract current mill info
        return data.map(pump => {
            // Find active installation (no removed_date)
            const activeInstall = pump.mill_pump?.find(i => !i.removed_date);

            return {
                ...pump,
                current_mill_code: activeInstall?.mill?.code || null,
                current_mill_name: activeInstall?.mill?.name || null,
                current_mill_id: activeInstall?.mill?.mill_id || null,
                location: activeInstall ? activeInstall.mill.name : (pump.storage_location || 'Taller')
            };
        });
    },

    // Legacy function for backwards compatibility
    async getPumps() {
        return this.getAllPumps();
    },

    async getPumpById(id) {
        const { data, error } = await supabase
            .from('pump')
            .select('*')
            .eq('pump_id', id)
            .single();
        if (error) throw error;
        return data;
    },

    // Get full history
    async getPumpHistory(pumpId) {
        // 1. Installations (mill_pump)
        const { data: installations } = await supabase
            .from('mill_pump')
            .select(`
                *,
                mill (name, code)
            `)
            .eq('pump_id', pumpId)
            .order('installation_date', { ascending: false });

        // Normalize and return
        const timeline = [
            ...(installations || []).map(i => ({
                id: `inst-${i.mill_pump_id}`,
                type: 'INSTALLATION',
                date: i.installation_date,
                title: `Instalada en ${i.mill?.name || 'Molino'}`,
                description: i.removed_date ? `Desinstalada el ${new Date(i.removed_date).toLocaleDateString()}` : 'Actualmente instalada',
                subtitle: i.removed_date ? 'Ciclo completado' : 'En operación'
            }))
        ];

        return timeline;
    },

    // CRUD Operations
    async createPump(pumpData) {
        const { data, error } = await supabase
            .from('pump')
            .insert([pumpData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updatePump(pumpId, pumpData) {
        const { data, error } = await supabase
            .from('pump')
            .update(pumpData)
            .eq('pump_id', pumpId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deletePump(pumpId) {
        // Note: Check for active installations before deleting
        // Or use CASCADE in foreign key constraints
        const { error } = await supabase
            .from('pump')
            .delete()
            .eq('pump_id', pumpId);

        if (error) throw error;
        return true;
    }
};
