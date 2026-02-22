-- ============================================================
-- ACCURATE TIMESTAMPS FOR OPERATIONAL DATA
-- ============================================================

-- 1. Convert columns from DATE to TIMESTAMPTZ
-- Note: PostgreSQL handles the conversion, setting time to 00:00:00 for existing date records.

-- Planned Activity
ALTER TABLE public.planned_activity 
  ALTER COLUMN actual_start_date TYPE TIMESTAMPTZ USING actual_start_date::TIMESTAMPTZ,
  ALTER COLUMN actual_end_date TYPE TIMESTAMPTZ USING actual_end_date::TIMESTAMPTZ;

-- Work Orders
ALTER TABLE public.work_order 
  ALTER COLUMN start_date TYPE TIMESTAMPTZ USING start_date::TIMESTAMPTZ,
  ALTER COLUMN end_date TYPE TIMESTAMPTZ USING end_date::TIMESTAMPTZ;

-- Diagnosis
ALTER TABLE public.diagnosis 
  ALTER COLUMN start_date TYPE TIMESTAMPTZ USING start_date::TIMESTAMPTZ,
  ALTER COLUMN completion_date TYPE TIMESTAMPTZ USING completion_date::TIMESTAMPTZ;

-- 2. Update Delivery Trigger to use now() instead of CURRENT_DATE
-- This ensures stock movements record the exact second of delivery.

CREATE OR REPLACE FUNCTION public.consume_delivery_resources_on_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_activity_id INTEGER;
    r RECORD;
BEGIN
    -- Solo procesar si la entrega pasa a COMPLETED
    IF NEW.delivery_status = 'COMPLETED' AND (OLD.delivery_status IS NULL OR OLD.delivery_status != 'COMPLETED') THEN
        
        v_activity_id := NEW.activity_id;

        -- A) PIEZAS
        FOR r IN SELECT piece_id, quantity FROM public.delivery_piece WHERE delivery_id = NEW.delivery_id LOOP
            INSERT INTO public.piece_stock_movement (piece_id, type, quantity, reference_type, reference_id, date, notes)
            VALUES (r.piece_id, 'USE', r.quantity, 'DELIVERY_ACTIVITY', v_activity_id, now(), 'Entrega confirmada');
        END LOOP;
        
        -- B) MATERIALES
        FOR r IN SELECT material_id, quantity FROM public.delivery_material WHERE delivery_id = NEW.delivery_id LOOP
            INSERT INTO public.material_stock_movement (material_id, type, quantity, reference_type, reference_id, date, notes)
            VALUES (r.material_id, 'USE', r.quantity, 'DELIVERY_ACTIVITY', v_activity_id, now(), 'Entrega confirmada');
        END LOOP;

        -- C) HERRAMIENTAS
        FOR r IN SELECT tool_id, quantity FROM public.delivery_tool WHERE delivery_id = NEW.delivery_id LOOP
            INSERT INTO public.tool_stock_movement (tool_id, type, quantity, reference_type, reference_id, date, notes)
            VALUES (r.tool_id, 'USE', r.quantity, 'DELIVERY_ACTIVITY', v_activity_id, now(), 'Entrega confirmada');
        END LOOP;

    END IF;
    RETURN NEW;
END;
$function$;
