import { supabase } from './supabase';

export const FabricationService = {
    // =========================================================================
    // MANUFACTURING ORDERS
    // =========================================================================

    async getManufacturingOrders() {
        const { data, error } = await supabase
            .from('manufacturing_order')
            .select(`
                *,
                piece:piece_id (piece_id, name, code),
                work_order:work_order_id (work_order_id, code, description),
                crew:crew_id (crew_id, name),
                related_activity:planned_activity!manufacturing_order_related_activity_id_fkey (
                    activity_id, title, activity_type (name)
                ),
                processes:mo_process (
                    id, piece_id, quantity_planned, quantity_completed,
                    piece:piece_id (piece_id, name, code, image_url)
                )
            `)
            .order('mo_id', { ascending: false });

        if (error) throw error;

        return (data || []).map(order => ({
            id: order.mo_id,
            code: order.code,
            name: order.name,
            pieceId: order.piece_id,
            pieceName: order.piece?.name || null,
            pieceCode: order.piece?.code || '',
            workOrderId: order.work_order_id,
            workOrderCode: order.work_order?.code || null,
            workOrderDescription: order.work_order?.description || null,
            quantityPlanned: order.quantity_planned,
            quantityCompleted: order.quantity_completed,
            status: order.status,
            startDate: order.start_date,
            endDate: order.end_date,
            crewId: order.crew_id,
            crewName: order.crew?.name || null,
            notes: order.notes,
            relatedActivityId: order.related_activity_id,
            relatedActivity: order.related_activity ? {
                id: order.related_activity.activity_id,
                title: order.related_activity.title,
                typeName: order.related_activity.activity_type?.name
            } : null,
            createdAt: order.created_at,
            processes: (order.processes || []).map(p => ({
                id: p.id,
                pieceId: p.piece_id,
                pieceName: p.piece?.name || 'N/A',
                pieceCode: p.piece?.code || '',
                pieceImage: p.piece?.image_url || null,
                quantityPlanned: p.quantity_planned,
                quantityCompleted: p.quantity_completed
            }))
        }));
    },

    async getManufacturingOrderById(id) {
        const { data, error } = await supabase
            .from('manufacturing_order')
            .select(`
                *,
                piece:piece_id (piece_id, name, code, description, image_url, drawing_code, unit),
                work_order:work_order_id (work_order_id, code, description, status),
                crew:crew_id (crew_id, name),
                related_activity:planned_activity!manufacturing_order_related_activity_id_fkey (
                    activity_id, title, activity_type (name)
                )
            `)
            .eq('mo_id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async createManufacturingOrder(orderData) {
        const { data, error } = await supabase
            .from('manufacturing_order')
            .insert({
                code: orderData.code || null,
                name: orderData.name || null,
                piece_id: orderData.pieceId || null,
                work_order_id: orderData.workOrderId || null,
                quantity_planned: orderData.quantityPlanned || 1,
                quantity_completed: orderData.quantityCompleted || 0,
                status: orderData.status || 'pendiente',
                start_date: orderData.startDate || null,
                end_date: orderData.endDate || null,
                crew_id: orderData.crewId || null,
                notes: orderData.notes || null,
                related_activity_id: orderData.relatedActivityId || null
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateManufacturingOrder(id, orderData) {
        const updatePayload = {};
        if (orderData.code !== undefined) updatePayload.code = orderData.code || null;
        if (orderData.name !== undefined) updatePayload.name = orderData.name || null;
        if (orderData.workOrderId !== undefined) updatePayload.work_order_id = orderData.workOrderId || null;
        if (orderData.quantityPlanned !== undefined) updatePayload.quantity_planned = orderData.quantityPlanned;
        if (orderData.quantityCompleted !== undefined) updatePayload.quantity_completed = orderData.quantityCompleted;
        if (orderData.status !== undefined) updatePayload.status = orderData.status;
        if (orderData.startDate !== undefined) updatePayload.start_date = orderData.startDate || null;
        if (orderData.endDate !== undefined) updatePayload.end_date = orderData.endDate || null;
        if (orderData.crewId !== undefined) updatePayload.crew_id = orderData.crewId || null;
        if (orderData.notes !== undefined) updatePayload.notes = orderData.notes || null;

        const { data, error } = await supabase
            .from('manufacturing_order')
            .update(updatePayload)
            .eq('mo_id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteManufacturingOrder(id) {
        const { error } = await supabase.from('manufacturing_order').delete().eq('mo_id', id);
        if (error) throw error;
        return true;
    },

    async completeManufacturingOrder(id) {
        const { data, error } = await supabase.rpc('complete_manufacturing_order', {
            p_mo_id: parseInt(id, 10)
        });
        if (error) throw error;
        return data;
    },

    // =========================================================================
    // MO PROCESSES (mo_process — multi-piece per order)
    // =========================================================================

    async getProcessesForOrder(moId) {
        const { data, error } = await supabase
            .from('mo_process')
            .select(`
                id, mo_id, piece_id, quantity_planned, quantity_completed, notes,
                piece:piece_id (piece_id, name, code, image_url, drawing_code)
            `)
            .eq('mo_id', moId)
            .order('id');

        if (error) throw error;
        return data || [];
    },

    async addProcess(moId, pieceId, quantityPlanned = 1, notes = '') {
        const { data, error } = await supabase
            .from('mo_process')
            .insert({ mo_id: moId, piece_id: pieceId, quantity_planned: quantityPlanned, notes: notes || null })
            .select(`
                id, mo_id, piece_id, quantity_planned, quantity_completed, notes,
                piece:piece_id (piece_id, name, code, image_url, drawing_code)
            `)
            .single();

        if (error) throw error;
        return data;
    },

    async updateProcess(id, updates) {
        const payload = {};
        if (updates.quantityPlanned !== undefined) payload.quantity_planned = updates.quantityPlanned;
        if (updates.quantityCompleted !== undefined) payload.quantity_completed = updates.quantityCompleted;
        if (updates.notes !== undefined) payload.notes = updates.notes || null;

        const { data, error } = await supabase
            .from('mo_process')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteProcess(id) {
        const { error } = await supabase.from('mo_process').delete().eq('id', id);
        if (error) throw error;
        return true;
    },

    // =========================================================================
    // PIECE RECIPE (piece_material)
    // =========================================================================

    async getRecipeForPiece(pieceId) {
        const { data, error } = await supabase
            .from('piece_material')
            .select(`id, piece_id, material_id, quantity_required, material:material_id (material_id, code, name, unit)`)
            .eq('piece_id', pieceId)
            .order('id');

        if (error) throw error;
        return data || [];
    },

    async getAllRecipes() {
        // Get all pieces that have at least one recipe item
        const { data, error } = await supabase
            .from('piece')
            .select(`
                piece_id, code, name, image_url, drawing_code,
                recipe:piece_material (
                    id, material_id, quantity_required,
                    material:material_id (material_id, code, name, unit)
                )
            `)
            .order('code');

        if (error) throw error;
        return (data || []).filter(p => p.recipe && p.recipe.length > 0);
    },

    async addRecipeItem(pieceId, materialId, quantityRequired) {
        const { data, error } = await supabase
            .from('piece_material')
            .insert({ piece_id: pieceId, material_id: materialId, quantity_required: quantityRequired })
            .select(`id, piece_id, material_id, quantity_required, material:material_id (material_id, code, name, unit)`)
            .single();

        if (error) throw error;
        return data;
    },

    async updateRecipeItem(id, quantityRequired) {
        const { data, error } = await supabase
            .from('piece_material')
            .update({ quantity_required: quantityRequired })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteRecipeItem(id) {
        const { error } = await supabase.from('piece_material').delete().eq('id', id);
        if (error) throw error;
        return true;
    },

    // =========================================================================
    // MATERIAL CONSUMPTION (mo_material_consumption)
    // =========================================================================

    async getMaterialConsumptions(moId) {
        const { data, error } = await supabase
            .from('mo_material_consumption')
            .select(`id, mo_id, material_id, quantity_used, date, material:material_id (material_id, code, name, unit)`)
            .eq('mo_id', moId)
            .order('date');

        if (error) throw error;
        return data || [];
    },

    async addMaterialConsumption(moId, materialId, quantityUsed, date = null) {
        const { data, error } = await supabase
            .from('mo_material_consumption')
            .insert({
                mo_id: moId,
                material_id: materialId,
                quantity_used: quantityUsed,
                date: date || new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteMaterialConsumption(id) {
        const { error } = await supabase.from('mo_material_consumption').delete().eq('id', id);
        if (error) throw error;
        return true;
    },

    // =========================================================================
    // ACTIVITY LINKING
    // =========================================================================

    async linkManufacturingOrderToActivity(moId, activityId) {
        const { error } = await supabase
            .from('manufacturing_order')
            .update({ related_activity_id: activityId })
            .eq('mo_id', moId);

        if (error) throw error;
        return { success: true };
    },

    // =========================================================================
    // PUMP MANUFACTURING ORDERS
    // =========================================================================

    async getPumpManufacturingOrders() {
        const { data, error } = await supabase
            .from('manufacturing_order')
            .select(`
                *,
                pump:pump_id (pump_id, serial_number, model, status, origin),
                crew:crew_id (crew_id, name),
                processes:mo_process (
                    id, piece_id, quantity_planned, quantity_completed,
                    piece:piece_id (piece_id, name, code, image_url)
                )
            `)
            .in('mo_type', ['pump_fabrication', 'pump_repair'])
            .order('mo_id', { ascending: false });

        if (error) throw error;

        return (data || []).map(order => ({
            id: order.mo_id,
            code: order.code,
            name: order.name,
            moType: order.mo_type,
            pumpId: order.pump_id,
            pumpSerial: order.pump?.serial_number || null,
            pumpModel: order.pump?.model || null,
            pumpStatus: order.pump?.status || null,
            pumpOrigin: order.pump?.origin || null,
            quantityPlanned: order.quantity_planned,
            quantityCompleted: order.quantity_completed,
            status: order.status,
            startDate: order.start_date,
            endDate: order.end_date,
            crewId: order.crew_id,
            crewName: order.crew?.name || null,
            notes: order.notes,
            createdAt: order.created_at,
            processes: (order.processes || []).map(p => ({
                id: p.id,
                pieceId: p.piece_id,
                pieceName: p.piece?.name || 'N/A',
                pieceCode: p.piece?.code || '',
                quantityPlanned: p.quantity_planned,
                quantityCompleted: p.quantity_completed
            }))
        }));
    },

    async createPumpManufacturingOrder(orderData) {
        const { data, error } = await supabase
            .from('manufacturing_order')
            .insert({
                code: orderData.code || null,
                name: orderData.name || null,
                mo_type: orderData.moType,
                pump_id: orderData.pumpId || null,
                pump_model_id: orderData.pumpModelId || null,
                quantity_planned: orderData.quantityPlanned || 1,
                quantity_completed: 0,
                status: orderData.status || 'pendiente',
                start_date: orderData.startDate || null,
                end_date: orderData.endDate || null,
                crew_id: orderData.crewId || null,
                notes: orderData.notes || null,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updatePumpManufacturingOrder(id, orderData) {
        const updatePayload = {};
        if (orderData.name !== undefined) updatePayload.name = orderData.name || null;
        if (orderData.pumpId !== undefined) updatePayload.pump_id = orderData.pumpId || null;
        if (orderData.quantityPlanned !== undefined) updatePayload.quantity_planned = orderData.quantityPlanned;
        if (orderData.status !== undefined) updatePayload.status = orderData.status;
        if (orderData.startDate !== undefined) updatePayload.start_date = orderData.startDate || null;
        if (orderData.endDate !== undefined) updatePayload.end_date = orderData.endDate || null;
        if (orderData.crewId !== undefined) updatePayload.crew_id = orderData.crewId || null;
        if (orderData.notes !== undefined) updatePayload.notes = orderData.notes || null;

        const { data, error } = await supabase
            .from('manufacturing_order')
            .update(updatePayload)
            .eq('mo_id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getAvailablePumpsForRepair() {
        const { data, error } = await supabase
            .from('pump')
            .select('pump_id, serial_number, model, status, origin, pump_model_id')
            .in('status', ['en_reparacion', 'descartada', 'almacenada', 'instalada'])
            .order('serial_number');

        if (error) throw error;
        return data || [];
    },

    // =========================================================================
    // PUMP MODELS
    // =========================================================================

    async getPumpModels() {
        const { data, error } = await supabase
            .from('pump_model')
            .select(`
                *,
                materials:pump_model_material (
                    id, material_id, quantity_required,
                    material:material_id (material_id, code, name, unit)
                ),
                pieces:pump_model_piece (
                    id, piece_id, quantity_required,
                    piece:piece_id (piece_id, code, name, unit, image_url)
                )
            `)
            .order('code');

        if (error) throw error;
        return data || [];
    },

    async getPumpModelById(id) {
        const { data, error } = await supabase
            .from('pump_model')
            .select(`
                *,
                materials:pump_model_material (
                    id, material_id, quantity_required,
                    material:material_id (material_id, code, name, unit)
                ),
                pieces:pump_model_piece (
                    id, piece_id, quantity_required,
                    piece:piece_id (piece_id, code, name, unit, image_url)
                )
            `)
            .eq('pump_model_id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async createPumpModel(modelData) {
        const insertPayload = {
            name: modelData.name,
            description: modelData.description || null,
            drawing_code: modelData.drawingCode || null,
            image_url: modelData.imageUrl || null,
            notes: modelData.notes || null,
        };
        if (modelData.code?.trim()) insertPayload.code = modelData.code;
        const { data, error } = await supabase
            .from('pump_model')
            .insert(insertPayload)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updatePumpModel(id, modelData) {
        const payload = {};
        if (modelData.code !== undefined) payload.code = modelData.code;
        if (modelData.name !== undefined) payload.name = modelData.name;
        if (modelData.description !== undefined) payload.description = modelData.description || null;
        if (modelData.drawingCode !== undefined) payload.drawing_code = modelData.drawingCode || null;
        if (modelData.imageUrl !== undefined) payload.image_url = modelData.imageUrl || null;
        if (modelData.notes !== undefined) payload.notes = modelData.notes || null;

        const { data, error } = await supabase
            .from('pump_model')
            .update(payload)
            .eq('pump_model_id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deletePumpModel(id) {
        const { error } = await supabase.from('pump_model').delete().eq('pump_model_id', id);
        if (error) throw error;
        return true;
    },

    // BOM Materials
    async addPumpModelMaterial(pumpModelId, materialId, quantityRequired) {
        const { data, error } = await supabase
            .from('pump_model_material')
            .insert({ pump_model_id: pumpModelId, material_id: materialId, quantity_required: quantityRequired })
            .select('*, material:material_id (material_id, code, name, unit)')
            .single();
        if (error) throw error;
        return data;
    },

    async deletePumpModelMaterial(id) {
        const { error } = await supabase.from('pump_model_material').delete().eq('id', id);
        if (error) throw error;
    },

    // BOM Pieces
    async addPumpModelPiece(pumpModelId, pieceId, quantityRequired) {
        const { data, error } = await supabase
            .from('pump_model_piece')
            .insert({ pump_model_id: pumpModelId, piece_id: pieceId, quantity_required: quantityRequired })
            .select('*, piece:piece_id (piece_id, code, name, unit)')
            .single();
        if (error) throw error;
        return data;
    },

    async deletePumpModelPiece(id) {
        const { error } = await supabase.from('pump_model_piece').delete().eq('id', id);
        if (error) throw error;
    },

    // =========================================================================
    // PUMP MO PIECE CONSUMPTION 
    // =========================================================================

    async getPumpPieceConsumptions(moId) {
        const { data, error } = await supabase
            .from('mo_pump_piece_consumption')
            .select('*, piece:piece_id (piece_id, code, name, unit)')
            .eq('mo_id', moId)
            .order('id');
        if (error) throw error;
        return data || [];
    },

    async addPumpPieceConsumption(moId, pieceId, quantityUsed) {
        const { data, error } = await supabase
            .from('mo_pump_piece_consumption')
            .insert({ mo_id: moId, piece_id: pieceId, quantity_used: quantityUsed })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deletePumpPieceConsumption(id) {
        const { error } = await supabase.from('mo_pump_piece_consumption').delete().eq('id', id);
        if (error) throw error;
    }
};

export const ManufacturingService = FabricationService;
