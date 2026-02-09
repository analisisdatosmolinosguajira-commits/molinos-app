-- Fix for Completion Logic (Constraints & Auto-Release) - Fixed Columns

BEGIN;

-- 1. Add Stock Constraints (Block Negative Stock)
-- Piece Stock (Column: current_stock)
ALTER TABLE piece_stock DROP CONSTRAINT IF EXISTS chk_piece_stock_non_negative;
ALTER TABLE piece_stock ADD CONSTRAINT chk_piece_stock_non_negative CHECK (current_stock >= 0);

-- Material Stock (Column: quantity_available)
ALTER TABLE material_stock DROP CONSTRAINT IF EXISTS chk_material_stock_non_negative;
ALTER TABLE material_stock ADD CONSTRAINT chk_material_stock_non_negative CHECK (quantity_available >= 0);

-- 2. Auto-Release Tools/EPP on Completion
CREATE OR REPLACE FUNCTION public.handle_wo_completion_release()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_crew_id INTEGER;
BEGIN
    -- Only act when moving to COMPLETED
    IF NEW.status = 'COMPLETED' AND OLD.status <> 'COMPLETED' THEN
        -- Get Crew ID (if not present in NEW, though it should be)
        v_crew_id := NEW.crew_id;
        
        IF v_crew_id IS NOT NULL THEN
            -- Release Tools (Close Assignments)
            UPDATE crew_tool_assignment
            SET end_date = CURRENT_DATE
            WHERE crew_id = v_crew_id
              AND end_date IS NULL;
              
            -- Release Safety Equipment (Close Assignments)
            UPDATE crew_safety_equipment_assignment
            SET end_date = CURRENT_DATE
            WHERE crew_id = v_crew_id
              AND end_date IS NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

-- Bind Trigger
DROP TRIGGER IF EXISTS trg_wo_completion_release ON work_order;
CREATE TRIGGER trg_wo_completion_release
AFTER UPDATE OF status ON work_order
FOR EACH ROW EXECUTE FUNCTION handle_wo_completion_release();


-- 3. Cleanup Legacy "Close" Triggers
DROP TRIGGER IF EXISTS trg_close_epp_on_wo_close ON work_order;
DROP TRIGGER IF EXISTS trg_close_ot ON work_order;
DROP FUNCTION IF EXISTS close_assignments_on_ot_close;

COMMIT;
