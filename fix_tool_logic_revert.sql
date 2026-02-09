-- Fix for Tool Stock Logic (Revert & Correct)
-- Goal: Restore "Assignment-Driven" flow (Previous Implementation Style) BUT fix the inverted logic.

BEGIN;

-- 1. Restore `sync_wo_tool_changes` to Simple Assignment Management
-- (Removes the explicit `INSERT tool_stock_movement` which caused complexity/errors)
CREATE OR REPLACE FUNCTION public.sync_wo_tool_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_wo_status VARCHAR;
    v_crew_id INTEGER;
    v_work_order_id INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_work_order_id := OLD.work_order_id;
    ELSE
        v_work_order_id := NEW.work_order_id;
    END IF;

    SELECT status, crew_id INTO v_wo_status, v_crew_id 
    FROM work_order WHERE work_order_id = v_work_order_id;

    IF v_wo_status NOT IN ('IN_PROGRESS', 'COMPLETED') THEN
        RETURN NULL;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Create Assignment
        INSERT INTO crew_tool_assignment (crew_id, tool_id, quantity, start_date)
        VALUES (v_crew_id, NEW.tool_id, NEW.quantity, CURRENT_DATE);
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Close Assignment
        UPDATE crew_tool_assignment
        SET end_date = CURRENT_DATE
        WHERE crew_id = v_crew_id
          AND tool_id = OLD.tool_id
          AND end_date IS NULL;
          
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.quantity > OLD.quantity THEN
             INSERT INTO crew_tool_assignment (crew_id, tool_id, quantity, start_date)
            VALUES (v_crew_id, NEW.tool_id, (NEW.quantity - OLD.quantity), CURRENT_DATE);
        END IF;
    END IF;

    RETURN NULL;
END;
$function$;


-- 2. Define Correct Assignment Lifecycle Trigger (The "Missing Link")
-- This replaces the dropped `trg_reduce_tool_stock` and `trg_return...` logic.
-- AND it fixes the "Inverted Logic".

CREATE OR REPLACE FUNCTION public.handle_tool_assignment_lifecycle()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- ON INSERT (Start): Stock Decrease (OUT)
    IF TG_OP = 'INSERT' THEN
        INSERT INTO tool_stock_movement (tool_id, type, quantity, reference_type, reference_id, notes)
        VALUES (NEW.tool_id, 'OUT', NEW.quantity, 'CREW_ASSIGNMENT', NEW.crew_id, 'Asignación de herramienta a cuadrilla');
    
    -- ON UPDATE (End): Stock Increase (IN)
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.end_date IS NULL AND NEW.end_date IS NOT NULL THEN
            INSERT INTO tool_stock_movement (tool_id, type, quantity, reference_type, reference_id, notes)
            VALUES (NEW.tool_id, 'IN', NEW.quantity, 'CREW_ASSIGNMENT', NEW.crew_id, 'Devolución de herramienta (Fin asignación)');
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Bind Assignment Trigger
DROP TRIGGER IF EXISTS trg_tool_assignment_lifecycle ON crew_tool_assignment;
CREATE TRIGGER trg_tool_assignment_lifecycle
AFTER INSERT OR UPDATE OF end_date ON crew_tool_assignment
FOR EACH ROW EXECUTE FUNCTION handle_tool_assignment_lifecycle();


-- 3. Ensure Movement Handler is Correct (OUT = -, IN = +)
-- (Already fixed in previous step, but re-stating for safety)
CREATE OR REPLACE FUNCTION public.handle_tool_stock_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NEW.type IN ('OUT', 'USE', 'LOAN', 'LOSS') THEN
        UPDATE tool_stock 
        SET quantity_available = quantity_available - NEW.quantity
        WHERE tool_id = NEW.tool_id;
    
    ELSIF NEW.type IN ('IN', 'RETURN', 'ADD', 'FOUND') THEN
        UPDATE tool_stock 
        SET quantity_available = quantity_available + NEW.quantity
        WHERE tool_id = NEW.tool_id;
    END IF;
    RETURN NEW;
END;
$function$;

COMMIT;
