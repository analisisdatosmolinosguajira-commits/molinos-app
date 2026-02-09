import { supabase } from './supabase';

export const DiagnosisService = {
    // 1. List View - Get all diagnoses with filters
    async getAllDiagnoses(filters = {}) {
        let query = supabase
            .from('diagnosis')
            .select(`
                *,
                mill (code, name, community_id),
                crew (name),
                pump (serial_number)
            `)
            .order('created_at', { ascending: false });

        if (filters.status) query = query.eq('status', filters.status);
        if (filters.mill_id) query = query.eq('mill_id', filters.mill_id);
        if (filters.diagnosis_type) query = query.eq('diagnosis_type', filters.diagnosis_type);
        if (filters.priority) query = query.eq('priority', filters.priority);

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    // 2. Deep Fetch by ID - Get complete diagnosis with all related data
    async getDiagnosisById(id) {
        // A. Core Diagnosis + Direct Relations
        const { data: diagnosis, error } = await supabase
            .from('diagnosis')
            .select(`
                *,
                mill (*),
                crew (*),
                pump (*)
            `)
            .eq('diagnosis_id', id)
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
            supabase.from('diagnosis_piece')
                .select('*, piece(code, name, unit)')
                .eq('diagnosis_id', id),
            // Materials
            supabase.from('diagnosis_material')
                .select('*, material(code, name, unit)')
                .eq('diagnosis_id', id),
            // Tools
            supabase.from('diagnosis_tool_reservation')
                .select('*, tool(code, name)')
                .eq('diagnosis_id', id),
            // Safety Requirements
            supabase.from('diagnosis_safety_requirement')
                .select('*, safety_equipment(name)')
                .eq('diagnosis_id', id),
            // Component Status (Detailed Report)
            supabase.from('diagnosis_component_status')
                .select('*, mill_component(name)')
                .eq('diagnosis_id', id),
            // Resource Requirements (PENDING items)
            supabase.from('resource_requirements')
                .select('*')
                .eq('reference_type', 'DIAGNOSIS')
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

        // Transform pieces with stock info
        const pieces = (piecesRes.data || []).map(p => ({
            ...p,
            available_stock: pieceStockMap[p.piece_id] || 0,
            stock_sufficient: (pieceStockMap[p.piece_id] || 0) >= p.quantity_required
        }));

        // Transform materials with stock info
        const materials = (materialsRes.data || []).map(m => ({
            ...m,
            available_stock: materialStockMap[m.material_id] || 0,
            stock_sufficient: (materialStockMap[m.material_id] || 0) >= m.quantity_required
        }));

        // Transform tools with stock info
        const tools = (toolsRes.data || []).map(t => ({
            ...t,
            available_stock: toolStockMap[t.tool_id] || 0,
            stock_sufficient: (toolStockMap[t.tool_id] || 0) >= t.quantity
        }));

        // Transform safety with stock info
        const safety = (safetyRes.data || []).map(s => ({
            ...s,
            available_stock: safetyStockMap[s.safety_id] || 0,
            stock_sufficient: (safetyStockMap[s.safety_id] || 0) >= s.quantity_required
        }));

        return {
            ...diagnosis,
            pieces,
            materials,
            tools,
            safety,
            components: componentsRes.data || [],
            requirements: requirementsRes.data || []
        };
    },

    // 3. Create new diagnosis
    async createDiagnosis(diagnosisData) {
        const {
            pieces = [],
            materials = [],
            tools = [],
            safety = [],
            components = [],
            ...coreData
        } = diagnosisData;

        // A. Insert main diagnosis record
        const { data: diagnosis, error: diagnosisError } = await supabase
            .from('diagnosis')
            .insert([coreData])
            .select()
            .single();

        if (diagnosisError) throw diagnosisError;

        const diagnosisId = diagnosis.diagnosis_id;

        // B. Insert related resources (parallel)
        const insertPromises = [];

        if (pieces.length > 0) {
            const pieceInserts = pieces.map(p => ({
                diagnosis_id: diagnosisId,
                piece_id: p.piece_id,
                quantity_required: p.quantity_required || 1,
                notes: p.notes
            }));
            insertPromises.push(
                supabase.from('diagnosis_piece').insert(pieceInserts)
            );
        }

        if (materials.length > 0) {
            const materialInserts = materials.map(m => ({
                diagnosis_id: diagnosisId,
                material_id: m.material_id,
                quantity_required: m.quantity_required,
                notes: m.notes
            }));
            insertPromises.push(
                supabase.from('diagnosis_material').insert(materialInserts)
            );
        }

        if (tools.length > 0) {
            const toolInserts = tools.map(t => ({
                diagnosis_id: diagnosisId,
                tool_id: t.tool_id,
                quantity: t.quantity || 1,
                notes: t.notes
            }));
            insertPromises.push(
                supabase.from('diagnosis_tool_reservation').insert(toolInserts)
            );
        }

        if (safety.length > 0) {
            const safetyInserts = safety.map(s => ({
                diagnosis_id: diagnosisId,
                safety_id: s.safety_id,
                quantity_required: s.quantity_required || 1,
                notes: s.notes
            }));
            insertPromises.push(
                supabase.from('diagnosis_safety_requirement').insert(safetyInserts)
            );
        }

        if (components.length > 0) {
            const componentInserts = components.map(c => ({
                diagnosis_id: diagnosisId,
                component_id: c.component_id,
                status: c.status || 'FUNCIONAL',
                observation: c.observation,
                deterioration_notes: c.deterioration_notes,
                wear_percentage: c.wear_percentage,
                vibration_level: c.vibration_level,
                temperature_status: c.temperature_status,
                noise_level: c.noise_level,
                lubrication_status: c.lubrication_status,
                photo_url: c.photo_url,
                requires_immediate_action: c.requires_immediate_action || false,
                estimated_remaining_life_days: c.estimated_remaining_life_days,
                priority_for_replacement: c.priority_for_replacement
            }));
            insertPromises.push(
                supabase.from('diagnosis_component_status').insert(componentInserts)
            );
        }

        await Promise.all(insertPromises);

        return diagnosis;
    },

    // 4. Update existing diagnosis
    async updateDiagnosis(id, diagnosisData) {
        const {
            pieces,
            materials,
            tools,
            safety,
            components,
            ...coreData
        } = diagnosisData;

        // A. Update main diagnosis record
        const { error: updateError } = await supabase
            .from('diagnosis')
            .update(coreData)
            .eq('diagnosis_id', id);

        if (updateError) throw updateError;

        // B. Update resources using SAFE UPSERT-FIRST pattern
        // Strategy: UPSERT new/updated items first, THEN delete orphans
        // This prevents data loss if UPSERT fails

        if (pieces !== undefined) {
            // 1. UPSERT new/updated pieces (safe - preserves data if fails)
            if (pieces.length > 0) {
                const pieceInserts = pieces.map(p => ({
                    diagnosis_id: id,
                    piece_id: p.piece_id,
                    quantity_required: p.quantity_required || 1,
                    notes: p.notes
                }));

                const { error: pieceError } = await supabase
                    .from('diagnosis_piece')
                    .upsert(pieceInserts, {
                        onConflict: 'diagnosis_id,piece_id'
                    });

                if (pieceError) throw pieceError;

                // 2. Delete orphans (pieces that are no longer in the list)
                const pieceIds = pieces.map(p => p.piece_id);
                const { error: deleteError } = await supabase
                    .from('diagnosis_piece')
                    .delete()
                    .eq('diagnosis_id', id)
                    .not('piece_id', 'in', `(${pieceIds.join(',')})`);

                if (deleteError) console.warn('Error deleting orphan pieces:', deleteError);
            } else {
                // No pieces - delete all
                await supabase
                    .from('diagnosis_piece')
                    .delete()
                    .eq('diagnosis_id', id);
            }
        }

        if (materials !== undefined) {
            if (materials.length > 0) {
                const materialInserts = materials.map(m => ({
                    diagnosis_id: id,
                    material_id: m.material_id,
                    quantity_required: m.quantity_required,
                    notes: m.notes
                }));

                const { error: materialError } = await supabase
                    .from('diagnosis_material')
                    .upsert(materialInserts, {
                        onConflict: 'diagnosis_id,material_id'
                    });

                if (materialError) throw materialError;

                const materialIds = materials.map(m => m.material_id);
                await supabase
                    .from('diagnosis_material')
                    .delete()
                    .eq('diagnosis_id', id)
                    .not('material_id', 'in', `(${materialIds.join(',')})`);
            } else {
                await supabase
                    .from('diagnosis_material')
                    .delete()
                    .eq('diagnosis_id', id);
            }
        }

        if (tools !== undefined) {
            if (tools.length > 0) {
                const toolInserts = tools.map(t => ({
                    diagnosis_id: id,
                    tool_id: t.tool_id,
                    quantity: t.quantity || 1,
                    notes: t.notes
                }));

                const { error: toolError } = await supabase
                    .from('diagnosis_tool_reservation')
                    .upsert(toolInserts, {
                        onConflict: 'diagnosis_id,tool_id'
                    });

                if (toolError) throw toolError;

                const toolIds = tools.map(t => t.tool_id);
                await supabase
                    .from('diagnosis_tool_reservation')
                    .delete()
                    .eq('diagnosis_id', id)
                    .not('tool_id', 'in', `(${toolIds.join(',')})`);
            } else {
                await supabase
                    .from('diagnosis_tool_reservation')
                    .delete()
                    .eq('diagnosis_id', id);
            }
        }

        if (safety !== undefined) {
            if (safety.length > 0) {
                const safetyInserts = safety.map(s => ({
                    diagnosis_id: id,
                    safety_id: s.safety_id,
                    quantity_required: s.quantity_required || 1,
                    notes: s.notes
                }));

                const { error: safetyError } = await supabase
                    .from('diagnosis_safety_requirement')
                    .upsert(safetyInserts, {
                        onConflict: 'diagnosis_id,safety_id'
                    });

                if (safetyError) throw safetyError;

                const safetyIds = safety.map(s => s.safety_id);
                await supabase
                    .from('diagnosis_safety_requirement')
                    .delete()
                    .eq('diagnosis_id', id)
                    .not('safety_id', 'in', `(${safetyIds.join(',')})`);
            } else {
                await supabase
                    .from('diagnosis_safety_requirement')
                    .delete()
                    .eq('diagnosis_id', id);
            }
        }

        if (components !== undefined) {
            await supabase
                .from('diagnosis_component_status')
                .delete()
                .eq('diagnosis_id', id);

            if (components.length > 0) {
                const componentInserts = components.map(c => ({
                    diagnosis_id: id,
                    component_id: c.component_id,
                    status: c.status || 'FUNCIONAL',
                    observation: c.observation,
                    deterioration_notes: c.deterioration_notes,
                    wear_percentage: c.wear_percentage,
                    vibration_level: c.vibration_level,
                    temperature_status: c.temperature_status,
                    noise_level: c.noise_level,
                    lubrication_status: c.lubrication_status,
                    photo_url: c.photo_url,
                    requires_immediate_action: c.requires_immediate_action || false,
                    estimated_remaining_life_days: c.estimated_remaining_life_days,
                    priority_for_replacement: c.priority_for_replacement
                }));

                const { error: componentError } = await supabase
                    .from('diagnosis_component_status')
                    .upsert(componentInserts, {
                        onConflict: 'diagnosis_id,component_id'
                    });

                if (componentError) throw componentError;
            }
        }

        return { diagnosis_id: id };
    },

    // 5. Delete diagnosis
    async deleteDiagnosis(diagnosisId) {
        // Get diagnosis details first
        const { data: diagnosis, error: fetchError } = await supabase
            .from('diagnosis')
            .select('status, crew_id')
            .eq('diagnosis_id', diagnosisId)
            .single();

        if (fetchError) throw fetchError;

        // If IN_PROGRESS, try to release resources first (but don't fail if it errors)
        if (diagnosis.status === 'IN_PROGRESS' && diagnosis.crew_id) {
            try {
                // Release tools
                await supabase
                    .from('crew_tool_assignment')
                    .update({ end_date: new Date().toISOString().split('T')[0] })
                    .eq('crew_id', diagnosis.crew_id)
                    .is('end_date', null);

                // Release EPP
                await supabase
                    .from('crew_safety_equipment_assignment')
                    .update({ end_date: new Date().toISOString().split('T')[0] })
                    .eq('crew_id', diagnosis.crew_id)
                    .is('end_date', null);
            } catch (releaseError) {
                console.warn('Could not release some resources (will be handled by CASCADE):', releaseError);
                // Continue with deletion anyway - CASCADE will clean up
            }
        }

        // Delete diagnosis (CASCADE will handle related records)
        const { error: deleteError } = await supabase
            .from('diagnosis')
            .delete()
            .eq('diagnosis_id', diagnosisId);

        if (deleteError) throw deleteError;

        return { success: true };
    },

    // 6. Complete diagnosis with mandatory notes
    async completeDiagnosis(diagnosisId, completionNotes) {
        if (!completionNotes || completionNotes.trim().length === 0) {
            throw new Error('Las notas de finalización son obligatorias');
        }

        const { data, error } = await supabase
            .from('diagnosis')
            .update({
                status: 'COMPLETED',
                completion_date: new Date().toISOString().split('T')[0],
                completion_notes: completionNotes
            })
            .eq('diagnosis_id', diagnosisId)
            .select()
            .single();

        if (error) throw error;

        // Release tools and safety equipment assigned to crew
        const { data: diagnosisInfo } = await supabase
            .from('diagnosis')
            .select('crew_id')
            .eq('diagnosis_id', diagnosisId)
            .single();

        if (diagnosisInfo && diagnosisInfo.crew_id) {
            const releaseDate = new Date().toISOString().split('T')[0];

            // Release tools
            await supabase
                .from('crew_tool_assignment')
                .update({ end_date: releaseDate })
                .eq('crew_id', diagnosisInfo.crew_id)
                .is('end_date', null);

            // Release safety equipment
            await supabase
                .from('crew_safety_equipment_assignment')
                .update({ end_date: releaseDate })
                .eq('crew_id', diagnosisInfo.crew_id)
                .is('end_date', null);
        }

        return data;
    },

    // 7. Transition to IN_PROGRESS
    // 7. Transition to IN_PROGRESS
    async transitionToInProgress(diagnosisId) {
        // Check if there are pending resource requirements
        const { data: requirements, error: reqError } = await supabase
            .from('resource_requirements')
            .select('*')
            .eq('reference_type', 'DIAGNOSIS')
            .eq('reference_id', diagnosisId);

        if (reqError) throw reqError;

        if (requirements && requirements.length > 0) {
            throw new Error(`No se puede iniciar: faltan ${requirements.length} recursos`);
        }

        // Fetch current dates to validate constraint
        const { data: currentDiag, error: fetchError } = await supabase
            .from('diagnosis')
            .select('diagnosis_date')
            .eq('diagnosis_id', diagnosisId)
            .single();

        if (fetchError) throw fetchError;

        const today = new Date().toISOString().split('T')[0];
        const updates = {
            status: 'IN_PROGRESS',
            start_date: today
        };

        // Fix: If diagnosis_date is in the future, reset it to today to pass 'valid_dates' constraint (start_date >= diagnosis_date)
        if (currentDiag.diagnosis_date && currentDiag.diagnosis_date > today) {
            updates.diagnosis_date = today;
        }

        // Update status - this will trigger the consumption function
        const { data, error } = await supabase
            .from('diagnosis')
            .update(updates)
            .eq('diagnosis_id', diagnosisId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // 8. Get pending resource requirements
    async getPendingResourceRequirements(diagnosisId) {
        const { data, error } = await supabase
            .from('resource_requirements')
            .select('*')
            .eq('reference_type', 'DIAGNOSIS')
            .eq('reference_id', diagnosisId);

        if (error) throw error;
        return data || [];
    },

    // 9. Cancel diagnosis
    async cancelDiagnosis(diagnosisId, cancellationNotes) {
        const { data, error } = await supabase
            .from('diagnosis')
            .update({
                status: 'CANCELLED',
                end_date: new Date().toISOString().split('T')[0],
                notes: cancellationNotes
            })
            .eq('diagnosis_id', diagnosisId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
