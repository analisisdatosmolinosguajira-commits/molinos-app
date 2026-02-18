import { supabase } from './supabase';

export const InventoryService = {
    async getInventory() {
        // For each item type, we need to query the item table and manually join with stock
        // because the embedded syntax might not work if there are missing stock records

        // Query 1: Piezas with stock
        const { data: piecesRaw, error: pieceError } = await supabase
            .from('piece')
            .select('*')
            .order('name');

        if (pieceError) {
            console.error('Error loading pieces:', pieceError);
            return [];
        }

        // Get stock for pieces
        const pieceIds = (piecesRaw || []).map(p => p.piece_id);
        const { data: pieceStocks } = await supabase
            .from('piece_stock')
            .select('piece_id, current_stock')
            .in('piece_id', pieceIds);

        const pieceStockMap = (pieceStocks || []).reduce((acc, s) => {
            acc[s.piece_id] = s.current_stock;
            return acc;
        }, {});

        // Query 2: Materiales with stock
        const { data: materialsRaw, error: materialError } = await supabase
            .from('material')
            .select('*')
            .order('name');

        if (materialError) {
            console.error('Error loading materials:', materialError);
        }

        const materialIds = (materialsRaw || []).map(m => m.material_id);
        const { data: materialStocks } = await supabase
            .from('material_stock')
            .select('material_id, quantity_available')
            .in('material_id', materialIds);

        const materialStockMap = (materialStocks || []).reduce((acc, s) => {
            acc[s.material_id] = s.quantity_available;
            return acc;
        }, {});

        // Query 3: Herramientas with stock
        const { data: toolsRaw, error: toolError } = await supabase
            .from('tool')
            .select('*')
            .order('name');

        if (toolError) {
            console.error('Error loading tools:', toolError);
        }

        const toolIds = (toolsRaw || []).map(t => t.tool_id);
        const { data: toolStocks } = await supabase
            .from('tool_stock')
            .select('tool_id, quantity_available')
            .in('tool_id', toolIds);

        const toolStockMap = (toolStocks || []).reduce((acc, s) => {
            acc[s.tool_id] = s.quantity_available;
            return acc;
        }, {});

        // Query 4: Equipos de protección personal (EPP) with stock
        const { data: safetyRaw, error: safetyError } = await supabase
            .from('safety_equipment')
            .select('*')
            .order('name');

        if (safetyError) {
            console.error('Error loading safety equipment:', safetyError);
        }

        const safetyIds = (safetyRaw || []).map(s => s.safety_id);
        const { data: safetyStocks } = await supabase
            .from('safety_equipment_stock')
            .select('safety_id, quantity_available')
            .in('safety_id', safetyIds);

        const safetyStockMap = (safetyStocks || []).reduce((acc, s) => {
            acc[s.safety_id] = s.quantity_available;
            return acc;
        }, {});

        // Normalize and merge all inventory items
        const normalizedPieces = (piecesRaw || []).map(item => ({
            id: `piece-${item.piece_id}`,
            rawId: item.piece_id,
            name: item.name,
            code: item.code,
            category: 'piezas',
            stock: pieceStockMap[item.piece_id] || 0,
            min: item.min_stock || 5,
            unit: item.unit || 'ud',
            description: item.description,
            raw: item
        }));

        const normalizedMaterials = (materialsRaw || []).map(item => ({
            id: `material-${item.material_id}`,
            rawId: item.material_id,
            name: item.name,
            code: item.code,
            category: 'materiales',
            stock: materialStockMap[item.material_id] || 0,
            min: item.min_stock || 5,
            unit: item.unit || 'ud',
            description: item.description,
            location: item.location || 'N/A',
            raw: item
        }));

        const normalizedTools = (toolsRaw || []).map(item => ({
            id: `tool-${item.tool_id}`,
            rawId: item.tool_id,
            name: item.name,
            code: item.code,
            category: 'herramientas',
            stock: toolStockMap[item.tool_id] || 0,
            min: 1,
            unit: 'ud',
            description: item.type || 'Herramienta manual',
            location: item.location || 'N/A',
            status: item.status || 'DISPONIBLE',
            raw: item
        }));

        const normalizedSafety = (safetyRaw || []).map(item => ({
            id: `safety-${item.safety_id}`,
            rawId: item.safety_id,
            name: item.name,
            code: item.code,
            category: 'epp',
            stock: safetyStockMap[item.safety_id] || 0,
            min: item.min_stock || 5,
            unit: item.unit || 'ud',
            description: item.description,
            raw: item
        }));

        // Merge all categories
        return [...normalizedMaterials, ...normalizedPieces, ...normalizedTools, ...normalizedSafety];
    },

    // ============ MATERIALS CRUD ============
    async createMaterial(data) {
        const { data: material, error } = await supabase
            .from('material')
            .insert([data])
            .select()
            .single();

        if (error) throw error;
        return material;
    },

    async updateMaterial(materialId, data) {
        const { data: material, error } = await supabase
            .from('material')
            .update(data)
            .eq('material_id', materialId)
            .select()
            .single();

        if (error) throw error;
        return material;
    },

    async deleteMaterial(materialId) {
        const { error } = await supabase
            .from('material')
            .delete()
            .eq('material_id', materialId);

        if (error) throw error;
    },

    // ============ PIECES CRUD ============
    async createPiece(data) {
        const { data: piece, error } = await supabase
            .from('piece')
            .insert([data])
            .select()
            .single();

        if (error) throw error;
        return piece;
    },

    async updatePiece(pieceId, data) {
        const { data: piece, error } = await supabase
            .from('piece')
            .update(data)
            .eq('piece_id', pieceId)
            .select()
            .single();

        if (error) throw error;
        return piece;
    },

    async deletePiece(pieceId) {
        const { error } = await supabase
            .from('piece')
            .delete()
            .eq('piece_id', pieceId);

        if (error) throw error;
    },

    // ============ TOOLS CRUD ============
    async createTool(data) {
        const { data: tool, error } = await supabase
            .from('tool')
            .insert([data])
            .select()
            .single();

        if (error) throw error;
        return tool;
    },

    async updateTool(toolId, data) {
        const { data: tool, error } = await supabase
            .from('tool')
            .update(data)
            .eq('tool_id', toolId)
            .select()
            .single();

        if (error) throw error;
        return tool;
    },

    async deleteTool(toolId) {
        const { error } = await supabase
            .from('tool')
            .delete()
            .eq('tool_id', toolId);

        if (error) throw error;
    },

    // ============ SAFETY EQUIPMENT CRUD ============
    async createSafetyEquipment(data) {
        const { data: safetyEquip, error } = await supabase
            .from('safety_equipment')
            .insert([data])
            .select()
            .single();

        if (error) throw error;
        return safetyEquip;
    },

    async updateSafetyEquipment(safetyId, data) {
        const { data: safetyEquip, error } = await supabase
            .from('safety_equipment')
            .update(data)
            .eq('safety_id', safetyId)
            .select()
            .single();

        if (error) throw error;
        return safetyEquip;
    },

    async deleteSafetyEquipment(safetyId) {
        const { error } = await supabase
            .from('safety_equipment')
            .delete()
            .eq('safety_id', safetyId);

        if (error) throw error;
    },

    // ============ STOCK MOVEMENTS / KARDEX ============
    async getStockMovements(category, itemId) {
        let tableName, idColumn;

        switch (category) {
            case 'materiales':
                tableName = 'material_stock_movement';
                idColumn = 'material_id';
                break;
            case 'piezas':
                tableName = 'piece_stock_movement';
                idColumn = 'piece_id';
                break;
            case 'herramientas':
                tableName = 'tool_stock_movement';
                idColumn = 'tool_id';
                break;
            case 'epp':
                tableName = 'safety_inventory_movement';
                idColumn = 'safety_id';
                break;
            default:
                throw new Error('Invalid category');
        }

        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .eq(idColumn, itemId)
            .order('date', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // ============ STOCK MOVEMENTS (NEW - FOR MOVIMIENTOS TAB) ============

    /**
     * Create a manual stock movement
     * @param {string} category - 'materiales', 'piezas', 'herramientas', 'epp'
     * @param {number} itemId - ID of the item
     * @param {object} movementData - { type, quantity, reference_type, reference_id, notes }
     */
    async createStockMovement(category, itemId, movementData) {
        let tableName, idColumn;

        switch (category) {
            case 'materiales':
                tableName = 'material_stock_movement';
                idColumn = 'material_id';
                break;
            case 'piezas':
                tableName = 'piece_stock_movement';
                idColumn = 'piece_id';
                break;
            case 'herramientas':
                tableName = 'tool_stock_movement';
                idColumn = 'tool_id';
                break;
            case 'epp':
                tableName = 'safety_inventory_movement';
                idColumn = 'safety_id';
                break;
            default:
                throw new Error('Invalid category');
        }

        const movement = {
            [idColumn]: itemId,
            type: movementData.type, // 'IN', 'OUT', 'ADJUST'
            quantity: movementData.quantity,
            reference_type: movementData.reference_type || 'MANUAL',
            reference_id: movementData.reference_id || null,
            notes: movementData.notes || '',
            date: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from(tableName)
            .insert([movement])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get all movements across all categories with optional filters
     * @param {object} filters - { startDate, endDate, category, itemId, type }
     */
    async getAllMovements(filters = {}) {
        const categories = [
            { category: 'materiales', table: 'material_stock_movement', idCol: 'material_id', itemTable: 'material' },
            { category: 'piezas', table: 'piece_stock_movement', idCol: 'piece_id', itemTable: 'piece' },
            { category: 'herramientas', table: 'tool_stock_movement', idCol: 'tool_id', itemTable: 'tool' },
            { category: 'epp', table: 'safety_inventory_movement', idCol: 'safety_id', itemTable: 'safety_equipment' }
        ];

        const allMovements = [];

        for (const cat of categories) {
            // Skip if category filter doesn't match
            if (filters.category && filters.category !== cat.category) continue;

            let query = supabase
                .from(cat.table)
                .select(`
                    *,
                    item:${cat.itemTable}(name, code)
                `);

            // Apply filters
            if (filters.itemId) {
                query = query.eq(cat.idCol, filters.itemId);
            }
            if (filters.type) {
                query = query.eq('type', filters.type);
            }
            if (filters.startDate) {
                query = query.gte('date', filters.startDate);
            }
            if (filters.endDate) {
                query = query.lte('date', filters.endDate);
            }

            query = query.order('date', { ascending: false }).limit(500);

            const { data, error } = await query;

            if (error) {
                console.error(`Error loading ${cat.category} movements:`, error);
                continue;
            }

            // Normalize and add category
            const normalized = (data || []).map(m => ({
                ...m,
                category: cat.category,
                itemName: m.item?.[0]?.name || 'Desconocido',
                itemCode: m.item?.[0]?.code || 'N/A',
                itemId: m[cat.idCol]
            }));

            allMovements.push(...normalized);
        }

        // Sort all movements by date
        allMovements.sort((a, b) => new Date(b.date) - new Date(a.date));

        return allMovements;
    },

    /**
     * Create multiple stock movements in a single transaction
     * @param {Array} movements - Array of movement objects
     * Each movement: { category, itemId, type, quantity, reference_type, reference_id, notes, date }
     */
    async createBatchMovements(movements) {
        if (!movements || movements.length === 0) {
            throw new Error('No movements to create');
        }

        // Create all movements in parallel
        const promises = movements.map(movement =>
            this.createStockMovement(movement.category, movement.itemId, {
                type: movement.type,
                quantity: movement.quantity,
                reference_type: movement.reference_type,
                reference_id: movement.reference_id,
                notes: movement.notes
            })
        );

        try {
            const results = await Promise.all(promises);
            return {
                success: true,
                count: results.length,
                movements: results
            };
        } catch (error) {
            console.error('Error creating batch movements:', error);
            throw error;
        }
    },

    /**
     * Get items by category with search term (for autocomplete)
     * @param {string} category - 'materiales', 'piezas', 'herramientas', 'epp'
     * @param {string} searchTerm - Search term for name or code
     */
    async getItemsByCategory(category, searchTerm = '') {
        let tableName, idColumn;

        switch (category) {
            case 'materiales':
                tableName = 'material';
                idColumn = 'material_id';
                break;
            case 'piezas':
                tableName = 'piece';
                idColumn = 'piece_id';
                break;
            case 'herramientas':
                tableName = 'tool';
                idColumn = 'tool_id';
                break;
            case 'epp':
                tableName = 'safety_equipment';
                idColumn = 'safety_id';
                break;
            default:
                throw new Error('Invalid category');
        }

        let query = supabase
            .from(tableName)
            .select(`${idColumn}, name, code, unit`)
            .order('name');

        if (searchTerm) {
            query = query.or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);
        }

        query = query.limit(50);

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map(item => ({
            id: item[idColumn],
            name: item.name,
            code: item.code,
            unit: item.unit || 'ud'
        }));
    }
};

