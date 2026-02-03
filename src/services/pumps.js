import { supabase } from './supabase';

export const PumpService = {
    // Get all pumps with current location/status
    async getPumps() {
        const { data, error } = await supabase
            .from('pump')
            .select('*')
            .order('serial_number');

        if (error) {
            console.error("Supabase Error (getPumps):", error);
            throw error;
        }

        return data.map(pump => ({
            ...pump,
            location: pump.storage_location || 'Almacén' // Simplified location logic for now
        }));
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
            .eq('pump_id', pumpId);

        // 2. Events/Repairs (pump_event) if exists
        const { data: events } = await supabase
            .from('pump_event')
            .select('*')
            .eq('pump_id', pumpId);

        // Merge and sort
        const timeline = [
            ...(installations || []).map(i => ({
                id: `inst-${i.mill_pump_id}`,
                type: 'INSTALLATION',
                date: i.installation_date,
                title: `Instalada en ${i.mill?.name || 'Molino'}`,
                description: i.removal_date ? `Desinstalada el ${new Date(i.removal_date).toLocaleDateString()}` : 'Actualmente instalada'
            })),
            ...(events || []).map(e => ({
                id: `evt-${e.event_id}`,
                type: 'EVENT',
                date: e.event_date,
                title: e.event_type || 'Evento',
                description: e.description
            }))
        ];

        return timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
};
