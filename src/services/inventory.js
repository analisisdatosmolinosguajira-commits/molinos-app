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

        // Query 5: Proveedores (Suppliers) without stock mappings
        const { data: suppliersRaw, error: supplierError } = await supabase
            .from('supplier')
            .select('*')
            .order('name');

        if (supplierError) {
            console.error('Error loading suppliers into inventory:', supplierError);
        }

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
            min: item.min_stock || 1,
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

        const normalizedSuppliers = (suppliersRaw || []).map(item => ({
            id: `supplier-${item.supplier_id}`,
            rawId: item.supplier_id,
            name: item.name,
            code: 'N/A', // Suppliers don't have code
            category: 'proveedores',
            stock: '-', // Not applicable for suppliers
            min: '-',
            unit: 'N/A',
            description: item.supplier_type || 'General',
            location: item.contact_name || 'N/A',
            status: item.phone || 'N/A', // repurposing table columns for the Unified grid view
            raw: item
        }));

        // Merge all categories
        return [...normalizedMaterials, ...normalizedPieces, ...normalizedTools, ...normalizedSafety, ...normalizedSuppliers];
    },

    /**
     * Load inventory for a single category with server-side pagination and search.
     * Returns { items: [...], totalCount: number }
     * @param {string} category - 'materiales', 'piezas', 'herramientas', 'epp', 'proveedores'
     * @param {number} page - 1-based page number
     * @param {number} pageSize - items per page (default 25)
     * @param {string} searchTerm - optional search filter
     */
    async getInventoryByCategory(category, page = 1, pageSize = 25, searchTerm = '') {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const categoryConfig = {
            materiales: {
                table: 'material',
                idCol: 'material_id',
                stockTable: 'material_stock',
                stockCol: 'quantity_available',
                normalize: (item, stock) => ({
                    id: `material-${item.material_id}`,
                    rawId: item.material_id,
                    name: item.name,
                    code: item.code,
                    category: 'materiales',
                    stock: stock,
                    min: item.min_stock || 5,
                    unit: item.unit || 'ud',
                    description: item.description,
                    location: item.location || 'N/A',
                    raw: item
                })
            },
            piezas: {
                table: 'piece',
                idCol: 'piece_id',
                stockTable: 'piece_stock',
                stockCol: 'current_stock',
                normalize: (item, stock) => ({
                    id: `piece-${item.piece_id}`,
                    rawId: item.piece_id,
                    name: item.name,
                    code: item.code,
                    category: 'piezas',
                    stock: stock,
                    min: item.min_stock || 5,
                    unit: item.unit || 'ud',
                    description: item.description,
                    raw: item
                })
            },
            herramientas: {
                table: 'tool',
                idCol: 'tool_id',
                stockTable: 'tool_stock',
                stockCol: 'quantity_available',
                normalize: (item, stock) => ({
                    id: `tool-${item.tool_id}`,
                    rawId: item.tool_id,
                    name: item.name,
                    code: item.code,
                    category: 'herramientas',
                    stock: stock,
                    min: item.min_stock || 1,
                    unit: 'ud',
                    description: item.type || 'Herramienta manual',
                    location: item.location || 'N/A',
                    status: item.status || 'DISPONIBLE',
                    raw: item
                })
            },
            epp: {
                table: 'safety_equipment',
                idCol: 'safety_id',
                stockTable: 'safety_equipment_stock',
                stockCol: 'quantity_available',
                normalize: (item, stock) => ({
                    id: `safety-${item.safety_id}`,
                    rawId: item.safety_id,
                    name: item.name,
                    code: item.code,
                    category: 'epp',
                    stock: stock,
                    min: item.min_stock || 5,
                    unit: item.unit || 'ud',
                    description: item.description,
                    raw: item
                })
            },
            proveedores: {
                table: 'supplier',
                idCol: 'supplier_id',
                stockTable: null,
                stockCol: null,
                normalize: (item) => ({
                    id: `supplier-${item.supplier_id}`,
                    rawId: item.supplier_id,
                    name: item.name,
                    code: 'N/A',
                    category: 'proveedores',
                    stock: '-',
                    min: '-',
                    unit: 'N/A',
                    description: item.supplier_type || 'General',
                    location: item.contact_name || 'N/A',
                    status: item.phone || 'N/A',
                    raw: item
                })
            }
        };

        const config = categoryConfig[category];
        if (!config) return { items: [], totalCount: 0 };

        // Build query with search, pagination, and exact count
        let query = supabase
            .from(config.table)
            .select('*', { count: 'exact' })
            .order('name');

        if (searchTerm) {
            query = query.or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);
        }

        query = query.range(from, to);

        const { data: items, error, count } = await query;

        if (error) {
            console.error(`Error loading ${category}:`, error);
            return { items: [], totalCount: 0 };
        }

        // Get stock values for the loaded items (skip for proveedores)
        let stockMap = {};
        if (config.stockTable && items && items.length > 0) {
            const ids = items.map(item => item[config.idCol]);
            const { data: stocks } = await supabase
                .from(config.stockTable)
                .select(`${config.idCol}, ${config.stockCol}`)
                .in(config.idCol, ids);

            stockMap = (stocks || []).reduce((acc, s) => {
                acc[s[config.idCol]] = s[config.stockCol];
                return acc;
            }, {});
        }

        const normalizedItems = (items || []).map(item =>
            config.normalize(item, stockMap[item[config.idCol]] || 0)
        );

        return { items: normalizedItems, totalCount: count || 0 };
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
    async uploadPieceImage(file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `piezas/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('molinos')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('molinos')
            .getPublicUrl(filePath);

        return data.publicUrl;
    },

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
        // Find existing image_url first
        const { data: pieceData, error: fetchError } = await supabase
            .from('piece')
            .select('image_url')
            .eq('piece_id', pieceId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching piece to delete:', fetchError);
        }

        // Output of image_url looks like: https://[project].supabase.co/storage/v1/object/public/molinos/piezas/file.ext
        if (pieceData && pieceData.image_url) {
            try {
                // Parse out the "piezas/file.ext" portion from the bucket URL
                const urlObj = new URL(pieceData.image_url);
                const pathParts = urlObj.pathname.split('/molinos/');
                if (pathParts.length > 1) {
                    const filePath = pathParts[1]; // 'piezas/file.ext'
                    const { error: removeError } = await supabase.storage
                        .from('molinos')
                        .remove([filePath]);

                    if (removeError) {
                        console.error('Error removing piece image from storage:', removeError);
                    }
                }
            } catch (e) {
                console.error('Failed to parse image URL for deletion:', e);
            }
        }

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

        let dbType = movementData.type; // 'IN', 'OUT', 'ADJUST'

        // Map UI movement types to Database enum types based on specific table constraints
        if (category === 'epp') {
            // safety_inventory_movement_type_check allows IN, OUT, ADJUST
            if (dbType === 'ENTRY') dbType = 'IN';
            if (dbType === 'USE') dbType = 'OUT';
            if (dbType === 'ADJUSTMENT') dbType = 'ADJUST';
        } else {
            // material, piece, tool_stock_movement allows ENTRY, USE, ADJUSTMENT
            if (dbType === 'IN') dbType = 'ENTRY';
            if (dbType === 'OUT') dbType = 'USE';
            if (dbType === 'ADJUST') dbType = 'ADJUSTMENT';
        }

        const movement = {
            [idColumn]: itemId,
            type: dbType, // Mapped type
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
            const normalized = (data || []).map(m => {
                const itemData = Array.isArray(m.item) ? m.item[0] : m.item;
                return {
                    ...m,
                    category: cat.category,
                    itemName: itemData?.name || 'Desconocido',
                    itemCode: itemData?.code || 'N/A',
                    itemId: m[cat.idCol]
                };
            });

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
            .select('*')
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
    },

    /**
     * Get items across all categories that are at or below their minimum stock threshold.
     */
    async getLowStockItems() {
        const categories = [
            { category: 'materiales', table: 'material', idCol: 'material_id', stockTable: 'material_stock', stockCol: 'quantity_available' },
            { category: 'piezas', table: 'piece', idCol: 'piece_id', stockTable: 'piece_stock', stockCol: 'current_stock' },
            { category: 'herramientas', table: 'tool', idCol: 'tool_id', stockTable: 'tool_stock', stockCol: 'quantity_available' },
            { category: 'epp', table: 'safety_equipment', idCol: 'safety_id', stockTable: 'safety_equipment_stock', stockCol: 'quantity_available' }
        ];

        let allLowStock = [];

        for (const cat of categories) {
            // Need to join the main table (min_stock) with the stock table (quantity_available/current_stock)
            // doing a pseudo-join by selecting related foreign records using PostgREST syntax
            const { data, error } = await supabase
                .from(cat.table)
                .select(`
                    *,
                    stock:${cat.stockTable}(${cat.stockCol})
                `);

            if (error) {
                console.error(`Error loading low stock for ${cat.category}:`, error);
                continue;
            }

            // Filter locally to match logic
            const lowStockItems = (data || [])
                .filter(item => {
                    const available = Array.isArray(item.stock) ? (item.stock[0]?.[cat.stockCol] || 0) : (item.stock?.[cat.stockCol] || 0);
                    const minStock = item.min_stock || 0;
                    // Trigger if stock is equal or less than minimum
                    return available <= minStock;
                })
                .map(item => {
                    const available = Array.isArray(item.stock) ? (item.stock[0]?.[cat.stockCol] || 0) : (item.stock?.[cat.stockCol] || 0);
                    return {
                        id: item[cat.idCol],
                        rawId: item[cat.idCol],
                        code: item.code || 'N/A',
                        name: item.name,
                        description: item.description,
                        unit: item.unit,
                        category: cat.category,
                        currentStock: available,
                        minStock: item.min_stock || 0,
                        // We attach a placeholder for price that can be filled later by UI or manual input
                        defaultPrice: 0
                    };
                });

            allLowStock.push(...lowStockItems);
        }

        // Sort by how critical the shortage is (current - min)
        allLowStock.sort((a, b) => (a.currentStock - a.minStock) - (b.currentStock - b.minStock));

        return allLowStock;
    },

    /**
     * Get all purchase orders
     */
    async getPurchaseOrders() {
        try {
            const { data, error } = await supabase
                .from('purchase_order')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error fetching purchase orders:', err);
            throw err;
        }
    },

    /**
     * Get details of a specific purchase order including its items
     */
    async getPurchaseOrderDetails(orderId) {
        try {
            // Get header
            const { data: orderData, error: orderError } = await supabase
                .from('purchase_order')
                .select('*')
                .eq('order_id', orderId)
                .single();

            if (orderError) throw orderError;

            // Get items
            const { data: itemsData, error: itemsError } = await supabase
                .from('purchase_order_item')
                .select('*')
                .eq('order_id', orderId)
                .order('item_id', { ascending: true });

            if (itemsError) throw itemsError;

            return {
                ...orderData,
                items: itemsData
            };
        } catch (err) {
            console.error('Error fetching purchase order details:', err);
            throw err;
        }
    },

    /**
     * Update the status of a purchase order
     */
    async updatePurchaseOrderStatus(orderId, status) {
        try {
            const { data, error } = await supabase
                .from('purchase_order')
                .update({ status: status })
                .eq('order_id', orderId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error updating purchase order status:', err);
            throw err;
        }
    },

    /**
     * Save a generated purchase order plan or update an existing one
     */
    async savePurchaseOrder(title, items, totalEstimated, notes = '', orderId = null) {
        try {
            // Get user ID
            const { data: { user } } = await supabase.auth.getUser();

            let orderData;

            if (orderId) {
                // Update existing order
                const { data, error } = await supabase
                    .from('purchase_order')
                    .update({
                        title: title,
                        total_estimated: totalEstimated,
                        notes: notes
                    })
                    .eq('order_id', orderId)
                    .select()
                    .single();

                if (error) throw error;
                orderData = data;

                // Delete old items to replace with new ones
                const { error: deleteError } = await supabase
                    .from('purchase_order_item')
                    .delete()
                    .eq('order_id', orderId);

                if (deleteError) throw deleteError;
            } else {
                // Create new order
                const { data, error } = await supabase
                    .from('purchase_order')
                    .insert([{
                        title: title,
                        status: 'borrador', // default status
                        total_estimated: totalEstimated,
                        notes: notes,
                        created_by: user?.id || null
                    }])
                    .select()
                    .single();

                if (error) throw error;
                orderData = data;
            }

            // 2. Prepare Items Payload
            const orderItems = items.map(item => {
                const payload = {
                    order_id: orderData.order_id,
                    name: item.name,
                    description: item.description || null,
                    unit: item.unit || 'ud',
                    quantity: parseFloat(item.quantity) || 1,
                    unit_price: parseFloat(item.unitPrice) || 0,
                    total_price: parseFloat(item.total) || 0,
                    supplier_notes: item.supplier_notes || null
                };

                // Link to DB entity if it's not a manual item
                if (!item.isManual && item.rawId) {
                    if (item.category === 'materiales') payload.material_id = item.rawId;
                    if (item.category === 'piezas') payload.piece_id = item.rawId;
                    if (item.category === 'herramientas') payload.tool_id = item.rawId;
                    if (item.category === 'epp') payload.safety_id = item.rawId;
                }

                return payload;
            });

            // 3. Insert Items
            if (orderItems.length > 0) {
                const { error: itemsError } = await supabase
                    .from('purchase_order_item')
                    .insert(orderItems);

                if (itemsError) throw itemsError;
            }

            return orderData;

        } catch (err) {
            console.error('Error saving purchase order:', err);
            throw err;
        }
    },

    /**
     * Delete a purchase order and its items
     */
    async deletePurchaseOrder(orderId) {
        try {
            // First delete items to avoid foreign key constraints
            const { error: itemsError } = await supabase
                .from('purchase_order_item')
                .delete()
                .eq('order_id', orderId);

            if (itemsError) throw itemsError;

            // Then delete the order header
            const { error: orderError } = await supabase
                .from('purchase_order')
                .delete()
                .eq('order_id', orderId);

            if (orderError) throw orderError;

            return true;
        } catch (err) {
            console.error('Error deleting purchase order:', err);
            throw err;
        }
    }
};

