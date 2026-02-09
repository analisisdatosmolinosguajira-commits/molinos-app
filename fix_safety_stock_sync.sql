-- Fix for EPP (Safety) Stock Sync
-- Problem: EPP items added to WO were not affecting stock.
-- Solution: Add trigger to log movements to `safety_inventory_movement`.
-- The existing `trg_handle_safety_inventory_movement` will handle the actual stock update.

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_wo_safety_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_wo_status VARCHAR;
    v_work_order_id INTEGER;
    
    v_resource_id INTEGER;
    v_quantity NUMERIC;
    v_old_quantity NUMERIC;
    
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

    -- 2. Identify Values
    IF TG_OP = 'DELETE' THEN
        v_resource_id := OLD.safety_id;
        v_quantity := OLD.quantity_required;
    ELSE
        v_resource_id := NEW.safety_id;
        v_quantity := NEW.quantity_required;
        IF TG_OP = 'UPDATE' THEN
            v_old_quantity := OLD.quantity_required;
        END IF;
    END IF;

    -- 3. Perform Stock Logic (INSERT MOVEMENTS ONLY)
    -- Type 'OUT' is used for consumption/removal from stock.
    -- Type 'IN' is used for return.
    
    IF TG_OP = 'INSERT' THEN
        INSERT INTO safety_inventory_movement (safety_id, type, quantity, reference_type, reference_id, notes)
        VALUES (v_resource_id, 'OUT', v_quantity, 'WORK_ORDER', v_work_order_id, 'EPP asignado a OT activa');

    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO safety_inventory_movement (safety_id, type, quantity, reference_type, reference_id, notes)
        VALUES (v_resource_id, 'IN', v_quantity, 'WORK_ORDER', v_work_order_id, 'EPP removido de OT activa');

    ELSIF TG_OP = 'UPDATE' THEN
        IF v_quantity > v_old_quantity THEN
            INSERT INTO safety_inventory_movement (safety_id, type, quantity, reference_type, reference_id, notes)
            VALUES (v_resource_id, 'OUT', (v_quantity - v_old_quantity), 'WORK_ORDER', v_work_order_id, 'Aumento EPP en OT activa');
        ELSIF v_quantity < v_old_quantity THEN
            INSERT INTO safety_inventory_movement (safety_id, type, quantity, reference_type, reference_id, notes)
            VALUES (v_resource_id, 'IN', (v_old_quantity - v_quantity), 'WORK_ORDER', v_work_order_id, 'Disminución EPP en OT activa');
        END IF;
    END IF;

    RETURN NULL;
END;
$function$;

-- Create Trigger
DROP TRIGGER IF EXISTS trg_sync_wo_safety_stock ON work_order_safety_requirement;
CREATE TRIGGER trg_sync_wo_safety_stock
AFTER INSERT OR UPDATE OR DELETE ON work_order_safety_requirement
FOR EACH ROW EXECUTE FUNCTION sync_wo_safety_changes();

COMMIT;
