-- Fix for Safety Stock Logic (Constraint & NULL Handling)
-- Goal: Prevent crashes (400) when Crew is NULL.

BEGIN;

-- 1. Robust `sync_wo_safety_changes`
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
    
    -- CHECK CREW
    IF v_crew_id IS NULL THEN
        RETURN NULL;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Create Assignment
        INSERT INTO crew_safety_equipment_assignment (crew_id, safety_id, quantity, start_date)
        VALUES (v_crew_id, NEW.safety_id, NEW.quantity_required, CURRENT_DATE)
        ON CONFLICT DO NOTHING;
        
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
            VALUES (v_crew_id, NEW.safety_id, (NEW.quantity_required - OLD.quantity_required), CURRENT_DATE)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    RETURN NULL;
END;
$function$;

-- 2. Ensure Assignment Lifecycle (Same as Revert)
CREATE OR REPLACE FUNCTION public.handle_safety_assignment_lifecycle()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO safety_inventory_movement (safety_id, type, quantity, reference_type, reference_id, notes)
        VALUES (NEW.safety_id, 'OUT', NEW.quantity, 'CREW_ASSIGNMENT', NEW.crew_id, 'Asignación de EPP a cuadrilla');
    
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.end_date IS NULL AND NEW.end_date IS NOT NULL THEN
            INSERT INTO safety_inventory_movement (safety_id, type, quantity, reference_type, reference_id, notes)
            VALUES (NEW.safety_id, 'IN', NEW.quantity, 'CREW_ASSIGNMENT', NEW.crew_id, 'Devolución de EPP (Fin asignación)');
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

COMMIT;
