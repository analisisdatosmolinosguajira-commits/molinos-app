-- Fix for Tool Stock Logic (Constraint & NULL Handling)
-- Goal: Prevent crashes (400) when Crew is NULL, and rely on DB Unique Constraint for 409 (which is correct behavior).

BEGIN;

-- 1. Robust `sync_wo_tool_changes` (NULL Crew Handling)
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
    -- Identify Context
    IF TG_OP = 'DELETE' THEN
        v_work_order_id := OLD.work_order_id;
    ELSE
        v_work_order_id := NEW.work_order_id;
    END IF;

    -- Get WO Details
    SELECT status, crew_id INTO v_wo_status, v_crew_id 
    FROM work_order WHERE work_order_id = v_work_order_id;

    -- Exit if status not active
    IF v_wo_status NOT IN ('IN_PROGRESS', 'COMPLETED') THEN
        RETURN NULL;
    END IF;

    -- CRITICAL CHECK: Exit if No Crew assigned
    -- (Cannot assign tool to NULL crew)
    IF v_crew_id IS NULL THEN
        RETURN NULL;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Create Assignment
        INSERT INTO crew_tool_assignment (crew_id, tool_id, quantity, start_date)
        VALUES (v_crew_id, NEW.tool_id, NEW.quantity, CURRENT_DATE)
        ON CONFLICT DO NOTHING; -- Avoid crashing if for some reason logic duplications occur
        
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
            VALUES (v_crew_id, NEW.tool_id, (NEW.quantity - OLD.quantity), CURRENT_DATE)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    RETURN NULL;
END;
$function$;

-- 2. Ensure Assignment Lifecycle is active (Same as Revert script, just redefining to be sure)
CREATE OR REPLACE FUNCTION public.handle_tool_assignment_lifecycle()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO tool_stock_movement (tool_id, type, quantity, reference_type, reference_id, notes)
        VALUES (NEW.tool_id, 'OUT', NEW.quantity, 'CREW_ASSIGNMENT', NEW.crew_id, 'Asignación de herramienta a cuadrilla');
    
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.end_date IS NULL AND NEW.end_date IS NOT NULL THEN
            INSERT INTO tool_stock_movement (tool_id, type, quantity, reference_type, reference_id, notes)
            VALUES (NEW.tool_id, 'IN', NEW.quantity, 'CREW_ASSIGNMENT', NEW.crew_id, 'Devolución de herramienta (Fin asignación)');
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

COMMIT;
