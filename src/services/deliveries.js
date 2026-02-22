import { supabase } from './supabase.js';

export const DeliveryService = {
    /**
     * Obtiene el plan completo de entregas para una actividad específica.
     * Retorna un arreglo de comunidades con sus respectivos recursos asignados.
     */
    async getDeliveryPlan(activityId) {
        // Obtener las paradas (comunidades) de la ruta
        const { data: deliveries, error: deliveryError } = await supabase
            .from('activity_community_delivery')
            .select(`
                *,
                community (community_id, name, department, municipality)
            `)
            .eq('activity_id', activityId)
            .order('delivery_id', { ascending: true });

        if (deliveryError) throw deliveryError;

        if (!deliveries || deliveries.length === 0) return [];

        // Para cada parada, obtener sus recursos en paralelo
        const deliveriesWithResources = await Promise.all(deliveries.map(async (delivery) => {
            const [piecesRes, materialsRes, toolsRes, ppeRes] = await Promise.all([
                supabase.from('delivery_piece').select('*, piece(code, name, unit)').eq('delivery_id', delivery.delivery_id),
                supabase.from('delivery_material').select('*, material(code, name, unit)').eq('delivery_id', delivery.delivery_id),
                supabase.from('delivery_tool').select('*, tool(code, name)').eq('delivery_id', delivery.delivery_id),
                supabase.from('delivery_ppe').select('*, safety_equipment(code, name)').eq('delivery_id', delivery.delivery_id)
            ]);

            return {
                ...delivery,
                pieces: piecesRes.data || [],
                materials: materialsRes.data || [],
                tools: toolsRes.data || [],
                ppe: ppeRes.data || []
            };
        }));

        return deliveriesWithResources;
    },

    /**
     * Guarda el plan de entrega. Para simplicidad, se eliminarán las entregas
     * pendientes existentes (y sus recursos en cascada) y se reinsertarán.
     * @param {number} activityId ID de la actividad
     * @param {Array} deliveryList Arreglo de objetos { community_id, notes, pieces, materials, tools, ppe }
     */
    async saveDeliveryPlan(activityId, deliveryList) {
        // 1. Obtener entregas actuales para ver cuáles borrar
        // Solo podemos borrar/modificar aquellas que estén PENDING
        const { data: currentDeliveries } = await supabase
            .from('activity_community_delivery')
            .select('delivery_id, delivery_status')
            .eq('activity_id', activityId);

        const pendingDeliveryIds = (currentDeliveries || [])
            .filter(d => d.delivery_status === 'PENDING')
            .map(d => d.delivery_id);

        if (pendingDeliveryIds.length > 0) {
            const { error: deleteError } = await supabase
                .from('activity_community_delivery')
                .delete()
                .in('delivery_id', pendingDeliveryIds);

            if (deleteError) throw deleteError;
        }

        // 2. Insertar la nueva lista provista desde la UI
        // La UI enviará SOLO aquellas que aún están pendientes (o si es nuevo plan, todas).
        for (const stop of deliveryList) {
            // Ignorar si ya estaba completada (la UI debería devolverlas con un flag, o directamente no enviarlas para Upsert)
            // Por seguridad, confiaremos en que el cliente solo envía lo editable.
            if (stop.delivery_status === 'COMPLETED') continue;

            // 2.1 Insertar parada (Comunidad)
            const { data: newDelivery, error: insertDeliveryError } = await supabase
                .from('activity_community_delivery')
                .insert({
                    activity_id: activityId,
                    community_id: stop.community_id,
                    notes: stop.notes || null,
                    delivery_status: 'PENDING'
                })
                .select()
                .single();

            if (insertDeliveryError) throw insertDeliveryError;

            const newDeliveryId = newDelivery.delivery_id;
            const promises = [];

            // 2.2 Insertar recursos
            if (stop.pieces && stop.pieces.length > 0) {
                const payload = stop.pieces.map(p => ({
                    delivery_id: newDeliveryId,
                    piece_id: p.piece_id,
                    quantity: p.quantity || p.quantity_used || p.required_quantity
                }));
                promises.push(supabase.from('delivery_piece').insert(payload));
            }

            if (stop.materials && stop.materials.length > 0) {
                const payload = stop.materials.map(m => ({
                    delivery_id: newDeliveryId,
                    material_id: m.material_id,
                    quantity: m.quantity || m.quantity_used || m.required_quantity
                }));
                promises.push(supabase.from('delivery_material').insert(payload));
            }

            if (stop.tools && stop.tools.length > 0) {
                const payload = stop.tools.map(t => ({
                    delivery_id: newDeliveryId,
                    tool_id: t.tool_id,
                    quantity: t.quantity || t.required_quantity
                }));
                promises.push(supabase.from('delivery_tool').insert(payload));
            }

            if (stop.ppe && stop.ppe.length > 0) {
                const payload = stop.ppe.map(e => ({
                    delivery_id: newDeliveryId,
                    ppe_id: e.ppe_id || e.safety_id,
                    quantity: e.quantity || e.required_quantity || e.quantity_required
                }));
                promises.push(supabase.from('delivery_ppe').insert(payload));
            }

            if (promises.length > 0) {
                await Promise.all(promises);
            }
        }

        return true;
    },

    /**
     * Marca una entrega como completada.
     * Esto disparará internamente el trigger `trg_consume_delivery_on_complete`
     * en la Base de Datos para descontar del stock en masa.
     */
    async completeDelivery(deliveryId, notes = '') {
        const { error } = await supabase
            .from('activity_community_delivery')
            .update({
                delivery_status: 'COMPLETED',
                notes: notes || null
            })
            .eq('delivery_id', deliveryId);

        if (error) throw error;
        return true;
    },

    /**
     * Obtiene todas las entregas realizadas a una comunidad específica.
     */
    async getDeliveriesByCommunity(communityId) {
        // 1. Obtener las entregas completadas para esta comunidad
        const { data: deliveries, error: deliveryError } = await supabase
            .from('activity_community_delivery')
            .select(`
                *,
                activity:activity_id (
                    activity_id,
                    title,
                    actual_start_date,
                    created_at
                )
            `)
            .eq('community_id', communityId)
            .eq('delivery_status', 'COMPLETED')
            .order('delivery_id', { ascending: false });

        if (deliveryError) throw deliveryError;

        if (!deliveries || deliveries.length === 0) return [];

        // 2. Para cada entrega, obtener sus recursos en paralelo
        const deliveriesWithResources = await Promise.all(deliveries.map(async (delivery) => {
            const [piecesRes, materialsRes, toolsRes] = await Promise.all([
                supabase.from('delivery_piece').select('*, piece(code, name, unit)').eq('delivery_id', delivery.delivery_id),
                supabase.from('delivery_material').select('*, material(code, name, unit)').eq('delivery_id', delivery.delivery_id),
                supabase.from('delivery_tool').select('*, tool(code, name)').eq('delivery_id', delivery.delivery_id)
            ]);

            return {
                ...delivery,
                pieces: piecesRes.data || [],
                materials: materialsRes.data || [],
                tools: toolsRes.data || []
            };
        }));

        return deliveriesWithResources;
    }
};
