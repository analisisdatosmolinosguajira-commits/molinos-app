import { supabase } from './supabase.js';

export const WorkOrderService = {
    // 1. List View
    async getWorkOrders(filters = {}) {
        let query = supabase
            .from('work_order')
            .select(`
                *,
                mill (code, name),
                crew (name),
                related_activity:planned_activity!work_order_related_activity_id_fkey (
                    activity_id,
                    title,
                    activity_type (name)
                )
            `)
            .order('created_at', { ascending: false });

        if (filters.status) query = query.eq('status', filters.status);
        if (filters.mill_id) query = query.eq('mill_id', filters.mill_id);

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    // 2. Deep Fetch by ID
    async getWorkOrderById(id) {
        // A. Core Order + Direct Relations
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

        // B. Fetch Related Collection Data (Parallel)
        const [
            piecesRes,
            materialsRes,
            toolsRes,
            safetyRes,
            componentsRes,
            requirementsRes,
            pieceStockRes,
            materialStockRes,
            toolStockRes,
            safetyStockRes
        ] = await Promise.all([
            // Pieces
            supabase.from('work_order_piece')
                .select('*, piece(code, name, unit)')
                .eq('work_order_id', id),
            // Materials
            supabase.from('work_order_material')
                .select('*, material(code, name, unit)')
                .eq('work_order_id', id),
            // Tools
            supabase.from('work_order_tool_reservation')
                .select('*, tool(code, name)')
                .eq('work_order_id', id),
            // Safety Requirements
            supabase.from('work_order_safety_requirement')
                .select('*, safety_equipment(name)')
                .eq('work_order_id', id),
            // Component Status (Reported)
            supabase.from('work_order_component_status')
                .select('*, mill_component(name)')
                .eq('work_order_id', id),
            // Resource Requirements (PENDING items)
            supabase.from('resource_requirements')
                .select('*')
                .eq('reference_type', 'WORK_ORDER')
                .eq('reference_id', id),
            // Stock levels for pieces
            supabase.from('piece_stock')
                .select('piece_id, current_stock'),
            // Stock levels for materials
            supabase.from('material_stock')
                .select('material_id, quantity_available'),
            // Stock levels for tools
            supabase.from('tool_stock')
                .select('tool_id, quantity_available'),
            // Stock levels for safety equipment
            supabase.from('safety_equipment_stock')
                .select('safety_id, quantity_available')
        ]);

        // Build stock maps for quick lookup
        const pieceStockMap = {};
        (pieceStockRes.data || []).forEach(s => {
            pieceStockMap[s.piece_id] = s.current_stock;
        });

        const materialStockMap = {};
        (materialStockRes.data || []).forEach(s => {
            materialStockMap[s.material_id] = s.quantity_available;
        });

        const toolStockMap = {};
        (toolStockRes.data || []).forEach(s => {
            toolStockMap[s.tool_id] = s.quantity_available;
        });

        const safetyStockMap = {};
        (safetyStockRes.data || []).forEach(s => {
            safetyStockMap[s.safety_id] = s.quantity_available;
        });

        // Transform Data for UI
        return {
            ...order,
            // diagnosis: diagnosisRes.data, // Removed as table relationship doesn't exist yet
            resources: {
                pieces: (piecesRes.data || []).map(p => ({
                    ...p,
                    available_stock: pieceStockMap[p.piece_id] || 0,
                    stock_sufficient: (pieceStockMap[p.piece_id] || 0) >= p.quantity_used
                })),
                materials: (materialsRes.data || []).map(m => ({
                    ...m,
                    available_stock: materialStockMap[m.material_id] || 0,
                    stock_sufficient: (materialStockMap[m.material_id] || 0) >= m.quantity_used
                })),
                tools: (toolsRes.data || []).map(t => ({
                    ...t,
                    available_stock: toolStockMap[t.tool_id] || 0,
                    stock_sufficient: (toolStockMap[t.tool_id] || 0) >= t.quantity
                }))
            },
            safety: {
                requirements: (safetyRes.data || []).map(s => ({
                    ...s,
                    available_stock: safetyStockMap[s.safety_id] || 0,
                    stock_sufficient: (safetyStockMap[s.safety_id] || 0) >= s.quantity_required
                }))
            },
            components: componentsRes.data || [],
            requirements: requirementsRes.data || [],
            canStart: (requirementsRes.data || []).filter(r => r.status === 'PENDING').length === 0
        };
    },

    // 3. Create Work Order (Transactional-like)
    async createWorkOrder(woData) {
        // woData structure: { basicInfo: {}, pieces: [], materials: [], tools: [], safety: [] }

        // Sanitize Basic Info
        const basicInfo = this._sanitizeBasicInfo({
            ...woData.basicInfo,
            status: 'PENDING' // Always create as PENDING
        });

        // 3.1 Insert Base Work Order
        const { data: order, error: orderError } = await supabase
            .from('work_order')
            .insert(basicInfo)
            .select()
            .single();

        if (orderError) throw orderError;
        const workOrderId = order.work_order_id;

        // 3.2 Insert Related Items (Sequential or Parallel)
        const promises = [];

        // Pieces
        if (woData.pieces?.length > 0) {
            const piecesPayload = woData.pieces.map(p => ({
                work_order_id: workOrderId,
                piece_id: p.piece_id,
                quantity_used: p.quantity_used
            }));
            promises.push(supabase.from('work_order_piece').insert(piecesPayload));
        }

        // Materials
        if (woData.materials?.length > 0) {
            const materialsPayload = woData.materials.map(m => ({
                work_order_id: workOrderId,
                material_id: m.material_id,
                quantity_used: m.quantity_used
            }));
            promises.push(supabase.from('work_order_material').insert(materialsPayload));
        }

        // Tools
        if (woData.tools?.length > 0) {
            const toolsPayload = woData.tools.map(t => ({
                work_order_id: workOrderId,
                tool_id: t.tool_id,
                quantity: t.quantity
            }));
            promises.push(supabase.from('work_order_tool_reservation').insert(toolsPayload));
        }

        // Safety
        if (woData.safety?.length > 0) {
            const safetyPayload = woData.safety.map(s => ({
                work_order_id: workOrderId,
                safety_id: s.safety_id,
                quantity_required: s.quantity_required
            }));
            promises.push(supabase.from('work_order_safety_requirement').insert(safetyPayload));
        }

        await Promise.all(promises);
        return order;
    },

    // 4. Update Work Order
    async updateWorkOrder(id, woData) {
        // NOTE: For related items, we use a "Replace All" strategy for simplicity and integrity

        // 4.1 Update Base Info
        if (woData.basicInfo) {
            const basicInfo = this._sanitizeBasicInfo(woData.basicInfo);
            const { error } = await supabase
                .from('work_order')
                .update(basicInfo)
                .eq('work_order_id', id);
            if (error) throw error;
        }

        // 4.2 Update Collections (Atomic via RPC)
        // We use an RPC function to perform Delete + Insert in a single transaction
        // This prevents data loss if the insert fails (e.g. strict stock constraints).

        if (woData.pieces || woData.materials || woData.tools || woData.safety) {
            const rpcParams = {
                p_work_order_id: id,
                p_pieces: woData.pieces || null,
                p_materials: woData.materials || null,
                p_tools: woData.tools || null,
                p_safety: woData.safety || null
            };

            const { error: rpcError } = await supabase.rpc('update_work_order_resources', rpcParams);
            if (rpcError) throw rpcError;
        }

        // 4.3 Component Status Reporting (Usually only on completion)
        // Kept separate as it's often a distinct step, but could be integrated if needed.
        if (woData.components && woData.components.length > 0) {
            const payload = woData.components.map(c => ({
                work_order_id: id,
                component_id: c.component_id,
                status: c.status,
                observation: c.observation || null,
                damage_description: c.damage_description || null
            }));

            // Upsert to handle existing records
            const { error } = await supabase
                .from('work_order_component_status')
                .upsert(payload, {
                    onConflict: 'work_order_id,component_id'
                });

            if (error) throw error;
        }
    },

    // 5. Delete
    async deleteWorkOrder(id) {
        const { error } = await supabase
            .from('work_order')
            .delete()
            .eq('work_order_id', id);
        if (error) throw error;
    },

    // 6. Helpers
    async getInventoryOptions() {
        // Helper to fetch valid pieces, materials, tools, safety for selection forms
        // Check if we can fetch stock views. If not, return 0.
        // We use Promise.allSettled to avoid failing if one view is missing or inaccessible
        const [piecesRes, materialsRes, toolsRes, safetyRes, pieceStockRes, materialStockRes, toolStockRes, safetyStockRes] = await Promise.all([
            supabase.from('piece').select('piece_id, name, code, unit').order('name'),
            supabase.from('material').select('material_id, name, code, unit').order('name'),
            supabase.from('tool').select('tool_id, name, code').order('name'),
            supabase.from('safety_equipment').select('safety_id, name, code').order('name'),
            // Stock Views
            supabase.from('piece_stock').select('piece_id, current_stock'),
            supabase.from('material_stock').select('material_id, quantity_available'),
            supabase.from('tool_stock').select('tool_id, quantity_available'),
            supabase.from('safety_equipment_stock').select('safety_id, quantity_available')
        ]);

        // Helper to map stock
        const mapStock = (items, stockList, idField, stockField) => {
            const stockMap = {};
            (stockList || []).forEach(s => stockMap[s[idField]] = s[stockField]);
            return (items || []).map(i => ({
                ...i,
                current_stock: stockMap[i[idField]] || 0, // Legacy field name support
                available_stock: stockMap[i[idField]] || 0
            }));
        };

        return {
            pieces: mapStock(piecesRes.data, pieceStockRes.data, 'piece_id', 'current_stock'),
            materials: mapStock(materialsRes.data, materialStockRes.data, 'material_id', 'quantity_available'),
            tools: mapStock(toolsRes.data, toolStockRes.data, 'tool_id', 'quantity_available'),
            safety: mapStock(safetyRes.data, safetyStockRes.data, 'safety_id', 'quantity_available')
        };
    },

    async getMillComponents(millId) {
        // Fetch components associated with a mill (via mill_has_component or just generic list?)
        // Assuming we need to define which components are "on the mill" to report status.
        // If mill_has_component exists, use it. Else fetch all components.
        // Let's check mill_has_component first (it was returned in Step 1282).

        const { data, error } = await supabase
            .from('mill_has_component')
            .select(`
                component_id,
                mill_component ( name, code )
            `)
            .eq('mill_id', millId);

        if (error) {
            // Fallback if table unused or error, maybe fetch all components
            console.warn("Could not fetch mill_has_component, fetching all components", error);
            const { data: all } = await supabase.from('mill_component').select('*');
            return all;
        }

        return data.map(item => ({
            component_id: item.component_id,
            name: item.mill_component?.name,
            code: item.mill_component?.code
        }));
    },

    // 7. State Transitions
    async transitionToInProgress(workOrderId) {
        // Check requirements first
        const { data: requirements } = await supabase
            .from('resource_requirements')
            .select('*')
            .eq('reference_type', 'WORK_ORDER')
            .eq('reference_id', workOrderId)
            .eq('status', 'PENDING');

        if (requirements && requirements.length > 0) {
            throw new Error(`No se puede iniciar la orden: faltan ${requirements.length} recursos por satisfacer.`);
        }

        // Update status
        const { error } = await supabase
            .from('work_order')
            .update({
                status: 'IN_PROGRESS',
                start_date: new Date().toISOString().split('T')[0] // Ensure YYYY-MM-DD
            })
            .eq('work_order_id', workOrderId)
            .eq('status', 'PENDING'); // Only if currently PENDING

        if (error) throw error;
    },

    async transitionToCompleted(workOrderId, componentStatuses) {
        // Validate component statuses are provided
        if (!componentStatuses || componentStatuses.length === 0) {
            throw new Error('Debe reportar el estado de todos los componentes del molino antes de completar la orden.');
        }

        // Update status
        const { error } = await supabase
            .from('work_order')
            .update({
                status: 'COMPLETED',
                end_date: new Date().toISOString().split('T')[0] // Ensure YYYY-MM-DD
            })
            .eq('work_order_id', workOrderId)
            .eq('status', 'IN_PROGRESS'); // Only if currently IN_PROGRESS

        if (error) throw error;

        // Save component statuses if provided
        if (componentStatuses && componentStatuses.length > 0) {
            const payload = componentStatuses.map(c => ({
                work_order_id: workOrderId,
                component_id: c.component_id,
                status: c.status,
                observation: c.observation,
                damage_description: c.damage_description
            }));

            await supabase.from('work_order_component_status').insert(payload);
        }
    },

    // 8. Pump Integration
    async getAvailablePumps(forInstall = true) {
        let query = supabase
            .from('pump')
            .select('pump_id, serial_number, model, status, origin')
            .order('serial_number');

        if (forInstall) {
            // Available for installation: stored or in workshop
            query = query.in('status', ['almacenada', 'en_taller']);
        } else {
            // Currently installed pumps (for removal)
            query = query.eq('status', 'instalada');
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async getMillPumps(millId) {
        const { data, error } = await supabase
            .from('mill_pump')
            .select(`
                *,
                pump (pump_id, serial_number, model, status)
            `)
            .eq('mill_id', millId)
            .is('removed_date', null); // Only active pumps

        if (error) throw error;
        return data;
    },

    // 5. Delete Work Order (removes all traces and reverts stock)
    async deleteWorkOrder(workOrderId) {
        // The database CASCADE deletes will handle:
        // - work_order_piece
        // - work_order_material
        // - work_order_tool_reservation
        // - work_order_safety_requirement
        // - work_order_component_status
        // - crew_tool_assignment (if crew_id matches)
        // - crew_safety_equipment_assignment (if crew_id matches)

        // Get WO details first to release resources if needed
        const { data: wo } = await supabase
            .from('work_order')
            .select('work_order_id, status, crew_id')
            .eq('work_order_id', workOrderId)
            .single();

        if (!wo) {
            throw new Error('Orden de trabajo no encontrada');
        }

        // If WO is IN_PROGRESS, we need to manually release resources
        // because DELETE won't trigger the UPDATE triggers
        if (wo.status === 'IN_PROGRESS') {
            // Release tool assignments
            await supabase
                .from('crew_tool_assignment')
                .update({ end_date: new Date().toISOString().split('T')[0] })
                .eq('crew_id', wo.crew_id)
                .is('end_date', null);

            // Release EPP assignments
            await supabase
                .from('crew_safety_equipment_assignment')
                .update({ end_date: new Date().toISOString().split('T')[0] })
                .eq('crew_id', wo.crew_id)
                .is('end_date', null);
        }

        // Now delete the work order (CASCADE will handle related records)
        const { error } = await supabase
            .from('work_order')
            .delete()
            .eq('work_order_id', workOrderId);

        if (error) throw error;

        return { success: true };
    },

    // 6. Complete Work Order with Notes
    async completeWorkOrder(workOrderId, completionNotes) {
        if (!completionNotes || completionNotes.trim().length === 0) {
            throw new Error('Las notas de finalización son obligatorias');
        }

        const { data, error } = await supabase
            .from('work_order')
            .update({
                status: 'COMPLETED',
                end_date: new Date().toISOString().split('T')[0],
                completion_notes: completionNotes.trim()
            })
            .eq('work_order_id', workOrderId)
            .select()
            .single();

        if (error) throw error;

        // Check for Pump Repair Event (Install == Remove)
        if (data.pump_id_to_install &&
            data.pump_id_to_remove &&
            data.pump_id_to_install === data.pump_id_to_remove) {

            // Log the repair event
            const { error: eventError } = await supabase.from('pump_event').insert([{
                pump_id: data.pump_id_to_install,
                mill_id: data.mill_id,
                work_order_id: workOrderId,
                event_type: 'REPAIR',
                event_date: new Date().toISOString().split('T')[0],
                notes: 'Reparación de misma bomba (Work Order Completion)'
            }]);

            if (eventError) {
                console.error('Error creating pump repair event:', eventError);
                // Non-blocking error, just log it
            }
        }

        return data;
    },

    // Private Helpers
    _sanitizeBasicInfo(info) {
        const sanitized = { ...info };

        // Sanitize UUIDs
        if (sanitized.crew_id === '') sanitized.crew_id = null;
        if (sanitized.mill_id === '') sanitized.mill_id = null; // Should be required but safe to sanitize

        // Sanitize Dates
        if (sanitized.scheduled_date === '') sanitized.scheduled_date = null;
        if (sanitized.start_date === '') sanitized.start_date = null;
        if (sanitized.end_date === '') sanitized.end_date = null;

        return sanitized;
    },

    /**
     * Create work order from planned activity
     * @param {number} activityId - Planned activity ID
     */
    async createWorkOrderFromActivity(activityId) {
        // Get activity details
        const { data: activity, error: actError } = await supabase
            .from('planned_activity')
            .select('*, activity_type(name)')
            .eq('activity_id', activityId)
            .single();

        if (actError) throw actError;

        // Create work order with activity data
        const woData = {
            basicInfo: {
                mill_id: activity.target_mill_id,
                crew_id: activity.assigned_crew_id,
                description: `${activity.activity_type?.name || 'Trabajo'}: ${activity.title}`,
                notes: activity.description,
                scheduled_date: activity.planned_start_week,
                status: 'PENDING',
                related_activity_id: activityId
            },
            pieces: [],
            materials: [],
            tools: [],
            safety: []
        };

        const workOrder = await this.createWorkOrder(woData);

        // Link activity to work order
        await supabase
            .from('planned_activity')
            .update({ related_movement_id: null }) // Work orders don't use movement link
            .eq('activity_id', activityId);

        return workOrder;
    },

    /**
     * Link existing work order to planned activity
     * @param {number} workOrderId - Work Order ID
     * @param {number} activityId - Activity ID
     */
    async linkWorkOrderToActivity(workOrderId, activityId) {
        // Update work order
        const { error: woError } = await supabase
            .from('work_order')
            .update({ related_activity_id: activityId })
            .eq('work_order_id', workOrderId);

        if (woError) throw woError;

        return { success: true };
    }
};
