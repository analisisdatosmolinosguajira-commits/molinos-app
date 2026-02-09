-- Fix for Safety Stock Logic (Revert & Correct)
-- Goal: Match Tool Logic (Assignment-Driven) for Consistency.

BEGIN;

-- 1. Restore `sync_wo_safety_changes` to Simple Assignment Management
CREATE OR REPLACE FUNCTION public.sync_wo_safety_changes()
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
        INSERT INTO crew_safety_equipment_assignment (crew_id, safety_id, quantity, start_date)
        VALUES (v_crew_id, NEW.safety_id, NEW.quantity_required, CURRENT_DATE);
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Close Assignment
        UPDATE crew_safety_equipment_assignment
        SET end_date = CURRENT_DATE
        WHERE crew_id = v_crew_id
          AND safety_id = OLD.safety_id
          AND end_date IS NULL;
          
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.quantity_required > OLD.quantity_required THEN
             INSERT INTO crew_safety_equipment_assignment (crew_id, safety_id, quantity, start_date)
            VALUES (v_crew_id, NEW.safety_id, (NEW.quantity_required - OLD.quantity_required), CURRENT_DATE);
        END IF;
    END IF;

    RETURN NULL;
END;
$function$;


-- 2. Define Correct Assignment Lifecycle Trigger for Safety
CREATE OR REPLACE FUNCTION public.handle_safety_assignment_lifecycle()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- ON INSERT (Start): Stock Decrease (OUT)
    IF TG_OP = 'INSERT' THEN
        INSERT INTO safety_inventory_movement (safety_id, type, quantity, reference_type, reference_id, notes)
        VALUES (NEW.safety_id, 'OUT', NEW.quantity, 'CREW_ASSIGNMENT', NEW.crew_id, 'Asignación de EPP a cuadrilla');
    
    -- ON UPDATE (End): Stock Increase (IN)
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.end_date IS NULL AND NEW.end_date IS NOT NULL THEN
            INSERT INTO safety_inventory_movement (safety_id, type, quantity, reference_type, reference_id, notes)
            VALUES (NEW.safety_id, 'IN', NEW.quantity, 'CREW_ASSIGNMENT', NEW.crew_id, 'Devolución de EPP (Fin asignación)');
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Bind Assignment Trigger
DROP TRIGGER IF EXISTS trg_safety_assignment_lifecycle ON crew_safety_equipment_assignment;
CREATE TRIGGER trg_safety_assignment_lifecycle
AFTER INSERT OR UPDATE OF end_date ON crew_safety_equipment_assignment
FOR EACH ROW EXECUTE FUNCTION handle_safety_assignment_lifecycle();


-- 3. Ensure Movement Handler is Correct (OUT = -, IN = +)
CREATE OR REPLACE FUNCTION public.handle_safety_inventory_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NEW.type IN ('OUT', 'LOSS', 'WEAR') THEN
        UPDATE safety_equipment_stock 
        SET quantity_available = quantity_available - NEW.quantity
        WHERE safety_id = NEW.safety_id;
    
    ELSIF NEW.type IN ('IN', 'ADD') THEN
        UPDATE safety_equipment_stock 
        SET quantity_available = quantity_available + NEW.quantity
        WHERE safety_id = NEW.safety_id;
    END IF;
    RETURN NEW;
END;
$function$;

COMMIT;
