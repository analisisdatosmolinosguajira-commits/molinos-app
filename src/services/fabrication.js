import { supabase } from './supabase';

export const FabricationService = {
    // Get all manufacturing orders with related data
    async getManufacturingOrders() {
        const { data, error } = await supabase
            .from('manufacturing_order')
            .select(`
                *,
                piece:piece_id (piece_id, name, code),
                work_order:work_order_id (work_order_id, description),
                crew:crew_id (crew_id, name)
            `)
            .order('mo_id', { ascending: false });

        if (error) {
            console.error('Error loading manufacturing orders:', error);
            throw error;
        }

        return (data || []).map(order => ({
            id: order.mo_id,
            pieceId: order.piece_id,
            pieceName: order.piece?.name || 'N/A',
            pieceCode: order.piece?.code || '',
            workOrderId: order.work_order_id,
            workOrderDescription: order.work_order?.description || null,
            quantityPlanned: order.quantity_planned,
            quantityCompleted: order.quantity_completed,
            status: order.status,
            startDate: order.start_date,
            endDate: order.end_date,
            crewId: order.crew_id,
            crewName: order.crew?.name || null,
            notes: order.notes
        }));
    },

    // Get single manufacturing order by ID
    async getManufacturingOrderById(id) {
        const { data, error } = await supabase
            .from('manufacturing_order')
            .select(`
                *,
                piece:piece_id (piece_id, name, code, description),
                work_order:work_order_id (work_order_id, description, status),
                crew:crew_id (crew_id, name, active)
            `)
            .eq('mo_id', id)
            .single();

        if (error) {
            console.error('Error loading manufacturing order:', error);
            throw error;
        }

        return {
            id: data.mo_id,
            pieceId: data.piece_id,
            piece: data.piece,
            workOrderId: data.work_order_id,
            workOrder: data.work_order,
            quantityPlanned: data.quantity_planned,
            quantityCompleted: data.quantity_completed,
            status: data.status,
            startDate: data.start_date,
            endDate: data.end_date,
            crewId: data.crew_id,
            crew: data.crew,
            notes: data.notes
        };
    },

    // Create new manufacturing order
    async createManufacturingOrder(orderData) {
        const { data, error } = await supabase
            .from('manufacturing_order')
            .insert({
                piece_id: orderData.pieceId,
                work_order_id: orderData.workOrderId || null,
                quantity_planned: orderData.quantityPlanned,
                quantity_completed: orderData.quantityCompleted || 0,
                status: orderData.status || 'pendiente',
                start_date: orderData.startDate || null,
                end_date: orderData.endDate || null,
                crew_id: orderData.crewId || null,
                notes: orderData.notes || null
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating manufacturing order:', error);
            throw error;
        }

        return data;
    },

    // Update manufacturing order
    async updateManufacturingOrder(id, orderData) {
        const { data, error } = await supabase
            .from('manufacturing_order')
            .update({
                piece_id: orderData.pieceId,
                work_order_id: orderData.workOrderId,
                quantity_planned: orderData.quantityPlanned,
                quantity_completed: orderData.quantityCompleted,
                status: orderData.status,
                start_date: orderData.startDate,
                end_date: orderData.endDate,
                crew_id: orderData.crewId,
                notes: orderData.notes
            })
            .eq('mo_id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating manufacturing order:', error);
            throw error;
        }

        return data;
    }
};
