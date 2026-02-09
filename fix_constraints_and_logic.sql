-- Fix for Constraint Violations (The Source of 400 Errors)
-- Goal: Update CHECK constraints to allow new movement types ('OUT', 'IN', etc.)

BEGIN;

-- 1. Update Tool Movement Constraint
ALTER TABLE tool_stock_movement DROP CONSTRAINT IF EXISTS chk_tool_stock_movement_type;
ALTER TABLE tool_stock_movement ADD CONSTRAINT chk_tool_stock_movement_type 
    CHECK (type IN ('ENTRY', 'USE', 'ADJUSTMENT', 'RETURN', 'OUT', 'IN', 'LOAN', 'LOSS', 'ADD', 'FOUND'));

-- 2. Update Safety Movement Constraint (Proactive)
-- Check if it exists first, or just drop/add.
ALTER TABLE safety_inventory_movement DROP CONSTRAINT IF EXISTS chk_safety_inventory_movement_type;
ALTER TABLE safety_inventory_movement ADD CONSTRAINT chk_safety_inventory_movement_type 
    CHECK (type IN ('ENTRY', 'USE', 'ADJUSTMENT', 'RETURN', 'OUT', 'IN', 'LOAN', 'LOSS', 'ADD', 'FOUND', 'WEAR'));


-- 3. Re-Verify Logic (Just to be safe, exact same function as "Robust" fix)
-- No changes needed to the functions if the constraints now allow the values.
-- But we should ensure the "Movement Handler" functions handle the legacy values too if existing data uses them.

CREATE OR REPLACE FUNCTION public.handle_tool_stock_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Decrease Stock
    IF NEW.type IN ('OUT', 'USE', 'LOAN', 'LOSS') THEN
        UPDATE tool_stock 
        SET quantity_available = quantity_available - NEW.quantity
        WHERE tool_id = NEW.tool_id;
    
    -- Increase Stock
    ELSIF NEW.type IN ('IN', 'RETURN', 'ADD', 'FOUND', 'ENTRY') THEN
        UPDATE tool_stock 
        SET quantity_available = quantity_available + NEW.quantity
        WHERE tool_id = NEW.tool_id;
    END IF;
    
    RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.handle_safety_inventory_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Decrease Stock
    IF NEW.type IN ('OUT', 'LOSS', 'WEAR', 'USE') THEN
        UPDATE safety_equipment_stock 
        SET quantity_available = quantity_available - NEW.quantity
        WHERE safety_id = NEW.safety_id;
    
    -- Increase Stock
    ELSIF NEW.type IN ('IN', 'ADD', 'RETURN', 'ENTRY') THEN
        UPDATE safety_equipment_stock 
        SET quantity_available = quantity_available + NEW.quantity
        WHERE safety_id = NEW.safety_id;
    END IF;
    
    RETURN NEW;
END;
$function$;

COMMIT;
