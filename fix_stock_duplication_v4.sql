-- Fix for Duplicate Stock Movements V4 (Architecture Enforcement)
-- Goal: Enforce "Movement-Driven" stock updates.
-- We confirmed `trg_handle_..._movement` exists and updates stock on movement insert.
-- Therefore, we must STOP updating stock directly in other triggers.

BEGIN;

-- 1. Redefine `sync_wo_stock_changes` (Pieces & Materials)
-- Remove direct UPDATE statements, keep only INSERT INTO ..._movement.
CREATE OR REPLACE FUNCTION public.sync_wo_stock_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_wo_status VARCHAR;
    v_work_order_id INTEGER;
    
    -- Variables for generic handling
    v_resource_id INTEGER;
    v_quantity NUMERIC;
    v_old_quantity NUMERIC;
    v_resource_type VARCHAR; -- 'PIECE' or 'MATERIAL'
    
BEGIN
    -- 1. Identify context
    IF TG_OP = 'DELETE' THEN
        v_work_order_id := OLD.work_order_id;
    ELSE
        v_work_order_id := NEW.work_order_id;
    END IF;

    SELECT status INTO v_wo_status FROM work_order WHERE work_order_id = v_work_order_id;

    -- Only proceed if WO is active
    IF v_wo_status NOT IN ('IN_PROGRESS', 'COMPLETED') THEN
        RETURN NULL; 
    END IF;

    -- 2. Identify Resource Type & Values
    IF TG_TABLE_NAME = 'work_order_piece' THEN
        v_resource_type := 'PIECE';
        IF TG_OP = 'DELETE' THEN
            v_resource_id := OLD.piece_id;
            v_quantity := OLD.quantity_used;
        ELSE
            v_resource_id := NEW.piece_id;
            v_quantity := NEW.quantity_used;
            IF TG_OP = 'UPDATE' THEN
                v_old_quantity := OLD.quantity_used;
            END IF;
        END IF;
    ELSIF TG_TABLE_NAME = 'work_order_material' THEN
        v_resource_type := 'MATERIAL';
        IF TG_OP = 'DELETE' THEN
            v_resource_id := OLD.material_id;
            v_quantity := OLD.quantity_used;
        ELSE
            v_resource_id := NEW.material_id;
            v_quantity := NEW.quantity_used;
            IF TG_OP = 'UPDATE' THEN
                v_old_quantity := OLD.quantity_used;
            END IF;
        END IF;
    END IF;

    -- 3. Perform Stock Logic (ONLY INSERT MOVEMENTS)
    -- The `trg_handle_..._movement` trigger will verify the movement and update stock.
    
    -- PIECES
    IF v_resource_type = 'PIECE' THEN
        IF TG_OP = 'INSERT' THEN
            INSERT INTO piece_stock_movement (piece_id, type, quantity, reference_type, reference_id, notes)
            VALUES (v_resource_id, 'USE', v_quantity, 'WORK_ORDER', v_work_order_id, 'Agregado a OT activa');

        ELSIF TG_OP = 'DELETE' THEN
            INSERT INTO piece_stock_movement (piece_id, type, quantity, reference_type, reference_id, notes)
            VALUES (v_resource_id, 'RETURN', v_quantity, 'WORK_ORDER', v_work_order_id, 'Eliminado de OT activa');

        ELSIF TG_OP = 'UPDATE' THEN
            IF v_quantity > v_old_quantity THEN
                INSERT INTO piece_stock_movement (piece_id, type, quantity, reference_type, reference_id, notes)
                VALUES (v_resource_id, 'USE', (v_quantity - v_old_quantity), 'WORK_ORDER', v_work_order_id, 'Aumento cantidad en OT activa');
            ELSIF v_quantity < v_old_quantity THEN
                INSERT INTO piece_stock_movement (piece_id, type, quantity, reference_type, reference_id, notes)
                VALUES (v_resource_id, 'RETURN', (v_old_quantity - v_quantity), 'WORK_ORDER', v_work_order_id, 'Disminución cantidad en OT activa');
            END IF;
        END IF;
    
    -- MATERIALS
    ELSIF v_resource_type = 'MATERIAL' THEN
        IF TG_OP = 'INSERT' THEN
            INSERT INTO material_stock_movement (material_id, type, quantity, reference_type, reference_id, notes)
            VALUES (v_resource_id, 'USE', v_quantity, 'WORK_ORDER', v_work_order_id, 'Agregado a OT activa');
        ELSIF TG_OP = 'DELETE' THEN
            INSERT INTO material_stock_movement (material_id, type, quantity, reference_type, reference_id, notes)
            VALUES (v_resource_id, 'RETURN', v_quantity, 'WORK_ORDER', v_work_order_id, 'Eliminado de OT activa');
        ELSIF TG_OP = 'UPDATE' THEN
            IF v_quantity > v_old_quantity THEN
                INSERT INTO material_stock_movement (material_id, type, quantity, reference_type, reference_id, notes)
                VALUES (v_resource_id, 'USE', (v_quantity - v_old_quantity), 'WORK_ORDER', v_work_order_id, 'Aumento cantidad en OT activa');
            ELSIF v_quantity < v_old_quantity THEN
                INSERT INTO material_stock_movement (material_id, type, quantity, reference_type, reference_id, notes)
                VALUES (v_resource_id, 'RETURN', (v_old_quantity - v_quantity), 'WORK_ORDER', v_work_order_id, 'Disminución cantidad en OT activa');
            END IF;
        END IF;
    END IF;

    RETURN NULL;
END;
$function$;


-- 2. Drop Tool/Safety Reduction Triggers (Conflicting with Movement Logic)
DROP TRIGGER IF EXISTS trg_reduce_tool_stock ON crew_tool_assignment;
DROP FUNCTION IF EXISTS reduce_tool_stock_on_assignment;

DROP TRIGGER IF EXISTS trg_reduce_safety_stock ON crew_safety_equipment_assignment;
DROP FUNCTION IF EXISTS reduce_safety_stock_on_assignment;

COMMIT;
