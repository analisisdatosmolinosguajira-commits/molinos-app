import { supabase } from './supabase';

export const InventoryService = {
    async getInventory() {
        // Query 1: Piezas/Repuestos
        const { data: pieces, error: pieceError } = await supabase
            .from('piece')
            .select('*')
            .order('name');

        if (pieceError) console.error('Error loading pieces:', pieceError);

        // Query 2: Materiales
        const { data: materials, error: materialError } = await supabase
            .from('material')
            .select('*')
            .order('name');

        if (materialError) console.error('Error loading materials:', materialError);

        // Query 3: Herramientas
        const { data: tools, error: toolError } = await supabase
            .from('tool')
            .select('*')
            .order('name');

        if (toolError) console.error('Error loading tools:', toolError);

        // Query 3: Equipos de protección personal (EPP)
        const { data: safetyEquip, error: safetyError } = await supabase
            .from('safety_equipment')
            .select('*')
            .order('name');

        if (safetyError) console.error('Error loading safety equipment:', safetyError);

        // Normalize and merge all inventory items
        const normalizedPieces = (pieces || []).map(item => ({
            id: `piece-${item.piece_id}`,
            name: item.name,
            code: item.code,
            category: 'piezas',
            stock: item.stock || 0,
            min: item.min_stock || 5,
            unit: item.unit || 'ud',
            description: item.description,
            location: item.location || 'N/A',
            status: item.stock > 0 ? 'disponible' : 'agotado'
        }));

        const normalizedMaterials = (materials || []).map(item => ({
            id: `material-${item.material_id}`,
            name: item.name,
            code: item.code,
            category: 'materiales',
            stock: item.stock || 0,
            min: item.min_stock || 5,
            unit: item.unit || 'ud',
            description: item.description,
            location: item.location || 'N/A',
            status: item.stock > 0 ? 'disponible' : 'agotado'
        }));

        const normalizedTools = (tools || []).map(item => ({
            id: `tool-${item.tool_id}`,
            name: item.name,
            code: item.code,
            category: 'herramientas',
            stock: 1, // Tools are tracked individually, not by stock
            min: 1,
            unit: 'ud',
            description: item.type || 'Herramienta manual',
            location: item.location || 'N/A',
            status: item.status || 'disponible'
        }));

        const normalizedSafety = (safetyEquip || []).map(item => ({
            id: `safety-${item.safety_id}`,
            name: item.name,
            code: item.code,
            category: 'epp',
            stock: 0, // Safety equipment doesn't have stock column
            min: item.min_stock || 5,
            unit: item.unit || 'ud',
            description: item.description,
            location: 'Almacén EPP',
            status: 'disponible'
        }));

        // Merge all categories
        return [...normalizedMaterials, ...normalizedPieces, ...normalizedTools, ...normalizedSafety];
    }
};
