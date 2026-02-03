import { supabase } from './supabase';

export const WorkOrderService = {
    async getWorkOrders() {
        const { data, error } = await supabase
            .from('work_order')
            .select(`
                *,
                mill (code, name)
            `)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    async getWorkOrderById(id) {
        // 1. Fetch Core Order with Relations
        const { data: order, error } = await supabase
            .from('work_order')
            .select(`
                *,
                mill (*),
                crew (*)
            `)
            .eq('work_order_id', id)
            .single();

        if (error) throw error;

        // 2. Fetch Diagnosis if linked
        const { data: diagnosis } = await supabase
            .from('diagnosis_visit')
            .select('*')
            .eq('work_order_id', id)
            .maybeSingle();

        // 3. Fetch Pieces/Materials Used
        // Using 'work_order_piece' linked to 'piece'
        const { data: pieces } = await supabase
            .from('work_order_piece')
            .select(`
                *,
                piece (
                    name,
                    code
                )
            `)
            .eq('work_order_id', id);

        const materials = (pieces || []).map(p => ({
            name: p.piece?.name || 'Pieza desconocida',
            quantity: p.quantity_used,
            unit: 'unidades', // default
            code: p.piece?.code
        }));

        return {
            ...order,
            diagnosis: diagnosis ? diagnosis.diagnosis : null, // Extract text or object
            diagnosis_details: diagnosis,
            materials
        };
    }
};
