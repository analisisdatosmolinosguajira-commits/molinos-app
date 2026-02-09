-- Fix for Safety Stock Logic (Proactive)
-- Goal: Ensure "OUT" decreases stock, and "IN" increases stock.

BEGIN;

-- 1. Redefine Movement Handler
CREATE OR REPLACE FUNCTION public.handle_safety_inventory_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- 'OUT': Consumption, Loss, Wear -> Decrease Stock
    IF NEW.type IN ('OUT', 'LOSS', 'WEAR') THEN
        UPDATE safety_equipment_stock 
        SET quantity_available = quantity_available - NEW.quantity
        WHERE safety_id = NEW.safety_id;
    
    -- 'IN': Return, Purchase, Adjust(Positive?) -> Increase Stock
    -- Note: ADJUST usually requires delta handling, but for now assuming IN/OUT specific.
    ELSIF NEW.type IN ('IN', 'ADD') THEN
        UPDATE safety_equipment_stock 
        SET quantity_available = quantity_available + NEW.quantity
        WHERE safety_id = NEW.safety_id;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Bind Movement Handler
DROP TRIGGER IF EXISTS trg_handle_safety_inventory_movement ON safety_inventory_movement;
CREATE TRIGGER trg_handle_safety_inventory_movement
AFTER INSERT ON safety_inventory_movement
FOR EACH ROW EXECUTE FUNCTION handle_safety_inventory_movement();

COMMIT;
