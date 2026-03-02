import { supabase } from './supabase';

// Item type → table name and ID column mapping
// Stock lives in separate *_stock tables, not on the main item tables
const ITEM_TABLE_MAP = {
    material: { table: 'material', idCol: 'material_id', stockTable: 'material_stock', stockCol: 'quantity_available', hasUnit: true },
    piece: { table: 'piece', idCol: 'piece_id', stockTable: 'piece_stock', stockCol: 'current_stock', hasUnit: true },
    tool: { table: 'tool', idCol: 'tool_id', stockTable: 'tool_stock', stockCol: 'quantity_available', hasUnit: false },
    epp: { table: 'safety_equipment', idCol: 'safety_id', stockTable: 'safety_equipment_stock', stockCol: 'quantity_available', hasUnit: true }
};

// Stock movement table mapping (for logging to inventory movement history)
const MOVEMENT_TABLE_MAP = {
    material: { movTable: 'material_stock_movement', fkCol: 'material_id' },
    piece: { movTable: 'piece_stock_movement', fkCol: 'piece_id' },
    tool: { movTable: 'tool_stock_movement', fkCol: 'tool_id' },
    epp: { movTable: 'safety_inventory_movement', fkCol: 'safety_id' }
};

// Helper: log a movement to the inventory stock movement tables
// Maps supply box movement types to inventory movement type CHECK values
const STOCK_MOV_TYPE_MAP = {
    entrada: 'OUT',       // Stock goes OUT of inventory into box
    devolucion: 'RETURN', // Stock RETURNS to inventory from box
    gasto: 'CONSUME',     // Consumed
    perdida: 'LOSS'       // Lost
};

async function logStockMovement(itemType, itemRefId, movType, quantity, notes) {
    const mapping = MOVEMENT_TABLE_MAP[itemType];
    if (!mapping) return;
    const type = STOCK_MOV_TYPE_MAP[movType] || 'OUT';
    await supabase.from(mapping.movTable).insert({
        [mapping.fkCol]: itemRefId,
        type,
        quantity,
        reference_type: 'supply_box',
        reference_id: null,
        date: new Date().toISOString(),
        notes: notes || null
    });
}

export const SupplyBoxService = {

    // Get box for a person (creates one if missing)
    async getBoxByPersonId(personId) {
        const { data, error } = await supabase
            .from('supply_box')
            .select('*')
            .eq('person_id', personId)
            .single();

        if (error && error.code === 'PGRST116') return null; // Not found
        if (error) throw error;
        return data;
    },

    // Get all items in a box with resolved names from inventory
    async getBoxItems(boxId) {
        const { data, error } = await supabase
            .from('supply_box_item')
            .select('*')
            .eq('box_id', boxId)
            .gt('quantity', 0)
            .order('item_type')
            .order('assigned_at');

        if (error) throw error;

        // Resolve item names from their respective tables
        const enriched = await Promise.all((data || []).map(async (item) => {
            const mapping = ITEM_TABLE_MAP[item.item_type];
            if (!mapping) return { ...item, item_name: 'Desconocido', item_unit: 'und' };

            const selectCols = mapping.hasUnit ? 'name, unit' : 'name';
            const { data: refData } = await supabase
                .from(mapping.table)
                .select(selectCols)
                .eq(mapping.idCol, item.item_ref_id)
                .single();

            return {
                ...item,
                item_name: refData?.name || `Item #${item.item_ref_id}`,
                item_unit: refData?.unit || 'und'
            };
        }));

        return enriched;
    },

    // Get movement history for a box
    async getBoxMovements(boxId, limit = 50) {
        const { data, error } = await supabase
            .from('supply_box_movement')
            .select('*')
            .eq('box_id', boxId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        // Resolve item names
        const enriched = await Promise.all((data || []).map(async (mov) => {
            const mapping = ITEM_TABLE_MAP[mov.item_type];
            if (!mapping) return { ...mov, item_name: 'Desconocido' };

            const { data: refData } = await supabase
                .from(mapping.table)
                .select('name')
                .eq(mapping.idCol, mov.item_ref_id)
                .single();

            return { ...mov, item_name: refData?.name || `Item #${mov.item_ref_id}` };
        }));

        return enriched;
    },

    // =============================================
    // MOVEMENT OPERATIONS
    // =============================================

    // ENTRADA: Inventory → Box (only inventario_lider)
    async addItemToBox(boxId, itemType, itemRefId, quantity, notes = '') {
        const mapping = ITEM_TABLE_MAP[itemType];
        if (!mapping) throw new Error('Tipo de item inválido');

        const user = (await supabase.auth.getUser()).data.user;

        // 1. Decrease inventory stock (stock lives in separate *_stock table)
        const { data: currentStockRow } = await supabase
            .from(mapping.stockTable)
            .select(mapping.stockCol)
            .eq(mapping.idCol, itemRefId)
            .maybeSingle();

        const currentStock = currentStockRow?.[mapping.stockCol] || 0;
        if (currentStock < quantity) throw new Error(`Stock insuficiente. Disponible: ${currentStock}`);

        await supabase
            .from(mapping.stockTable)
            .update({ [mapping.stockCol]: currentStock - quantity })
            .eq(mapping.idCol, itemRefId);

        // 2. Upsert item in box
        const { data: existing } = await supabase
            .from('supply_box_item')
            .select('item_id, quantity')
            .eq('box_id', boxId)
            .eq('item_type', itemType)
            .eq('item_ref_id', itemRefId)
            .maybeSingle();

        if (existing) {
            await supabase
                .from('supply_box_item')
                .update({ quantity: existing.quantity + quantity })
                .eq('item_id', existing.item_id);
        } else {
            await supabase
                .from('supply_box_item')
                .insert({ box_id: boxId, item_type: itemType, item_ref_id: itemRefId, quantity });
        }

        // 3. Log supply box movement
        await supabase.from('supply_box_movement').insert({
            box_id: boxId, item_type: itemType, item_ref_id: itemRefId,
            movement_type: 'entrada', quantity, notes,
            performed_by: user?.id
        });

        // 4. Log to inventory movement history
        await logStockMovement(itemType, itemRefId, 'entrada', quantity, `Caja suministros: entrada. ${notes || ''}`.trim());

        return true;
    },

    // DEVOLUCION: Box → Inventory (only inventario_lider)
    async returnItem(boxId, itemType, itemRefId, quantity, notes = '') {
        const mapping = ITEM_TABLE_MAP[itemType];
        if (!mapping) throw new Error('Tipo de item inválido');

        const user = (await supabase.auth.getUser()).data.user;

        // 1. Check box has enough quantity
        const { data: boxItem } = await supabase
            .from('supply_box_item')
            .select('item_id, quantity')
            .eq('box_id', boxId)
            .eq('item_type', itemType)
            .eq('item_ref_id', itemRefId)
            .single();

        if (!boxItem || boxItem.quantity < quantity) {
            throw new Error(`Cantidad insuficiente en caja. Disponible: ${boxItem?.quantity || 0}`);
        }

        // 2. Decrease box quantity
        await supabase
            .from('supply_box_item')
            .update({ quantity: boxItem.quantity - quantity })
            .eq('item_id', boxItem.item_id);

        // 3. Increase inventory stock (stock lives in separate *_stock table)
        const { data: currentStockRow } = await supabase
            .from(mapping.stockTable)
            .select(mapping.stockCol)
            .eq(mapping.idCol, itemRefId)
            .maybeSingle();

        await supabase
            .from(mapping.stockTable)
            .update({ [mapping.stockCol]: (currentStockRow?.[mapping.stockCol] || 0) + quantity })
            .eq(mapping.idCol, itemRefId);

        // 4. Log supply box movement
        await supabase.from('supply_box_movement').insert({
            box_id: boxId, item_type: itemType, item_ref_id: itemRefId,
            movement_type: 'devolucion', quantity, notes,
            performed_by: user?.id
        });

        // 5. Log to inventory movement history
        await logStockMovement(itemType, itemRefId, 'devolucion', quantity, `Caja suministros: devolución. ${notes || ''}`.trim());

        return true;
    },

    // GASTO / PERDIDA: Remove from box only (engineer/supervisor reports)
    async reportConsumptionOrLoss(boxId, itemType, itemRefId, quantity, type, notes = '') {
        if (!['gasto', 'perdida'].includes(type)) throw new Error('Tipo inválido');

        const user = (await supabase.auth.getUser()).data.user;

        // 1. Check box has enough
        const { data: boxItem } = await supabase
            .from('supply_box_item')
            .select('item_id, quantity')
            .eq('box_id', boxId)
            .eq('item_type', itemType)
            .eq('item_ref_id', itemRefId)
            .single();

        if (!boxItem || boxItem.quantity < quantity) {
            throw new Error(`Cantidad insuficiente en caja. Disponible: ${boxItem?.quantity || 0}`);
        }

        // 2. Decrease box quantity (NO stock change — it's consumed/lost)
        await supabase
            .from('supply_box_item')
            .update({ quantity: boxItem.quantity - quantity })
            .eq('item_id', boxItem.item_id);

        // 3. Log supply box movement
        await supabase.from('supply_box_movement').insert({
            box_id: boxId, item_type: itemType, item_ref_id: itemRefId,
            movement_type: type, quantity, notes,
            performed_by: user?.id
        });

        // 4. Log to inventory movement history
        await logStockMovement(itemType, itemRefId, type, quantity, `Caja suministros: ${type}. ${notes || ''}`.trim());

        return true;
    },

    // Get all inventory items for selector (used by inventario_lider when adding items)
    async getInventoryItemsByType(itemType) {
        const mapping = ITEM_TABLE_MAP[itemType];
        if (!mapping) return [];

        // Get items from main table
        const selectCols = mapping.hasUnit ? `${mapping.idCol}, name, unit` : `${mapping.idCol}, name`;
        const { data: items, error } = await supabase
            .from(mapping.table)
            .select(selectCols)
            .order('name');

        if (error) throw error;

        // Get stock from stock table
        const { data: stockData } = await supabase
            .from(mapping.stockTable)
            .select(`${mapping.idCol}, ${mapping.stockCol}`);

        const stockMap = {};
        (stockData || []).forEach(s => {
            stockMap[s[mapping.idCol]] = s[mapping.stockCol] || 0;
        });

        return (items || [])
            .map(d => ({
                id: d[mapping.idCol],
                name: d.name,
                stock: stockMap[d[mapping.idCol]] || 0,
                unit: d.unit
            }))
            .filter(d => d.stock > 0);
    },

    // Get all boxes (for inventario_lider management view)
    async getAllBoxes() {
        const { data, error } = await supabase
            .from('supply_box')
            .select(`
                *,
                person:person_id (person_id, first_name, last_name, person_role(name))
            `)
            .order('label');

        if (error) throw error;
        return data || [];
    }
};
