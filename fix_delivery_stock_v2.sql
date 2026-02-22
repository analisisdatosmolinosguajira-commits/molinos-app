-- ============================================================
-- FIX: Corrección completa de la lógica de descuento de stock
-- para Entrega de Materiales a Comunidades
-- ============================================================
-- PROBLEMAS DETECTADOS:
-- 1. Función consume_delivery_resources_on_complete() actualiza stock
--    Y inserta movimientos, pero usa tipo 'USE' que no está en el CHECK
--    constraint de las tablas de movimiento (solo permiten IN/OUT/ADJUST).
-- 2. El trigger sync_delivery_stock_changes() en delivery_piece/material
--    puede causar doble conteo si se modifican recursos después de completar.
-- 3. No existe lógica para descontar herramientas (tools) ni EPP (safety).
-- ============================================================

-- PASO 1: Eliminar los triggers problemáticos que causan doble conteo
-- Los triggers en delivery_piece y delivery_material (sync_delivery_stock_changes)
-- NO deben existir porque duplican el efecto de consume_delivery_resources_on_complete.
DROP TRIGGER IF EXISTS trg_sync_delivery_piece_stock ON public.delivery_piece;
DROP TRIGGER IF EXISTS trg_sync_delivery_material_stock ON public.delivery_material;
DROP FUNCTION IF EXISTS public.sync_delivery_stock_changes();

-- PASO 2: Eliminar el trigger viejo de completación
DROP TRIGGER IF EXISTS trg_consume_delivery_on_complete ON public.activity_community_delivery;
DROP FUNCTION IF EXISTS public.consume_delivery_resources_on_complete();

-- PASO 3: Crear la función CORRECTA y COMPLETA que maneja TODOS los recursos
-- Esta función se encarga de:
--   a) Descontar Piezas (piece_stock + piece_stock_movement)
--   b) Descontar Materiales (material_stock + material_stock_movement)
--   c) Descontar Herramientas (tool_stock + tool_stock_movement)
--   d) Descontar EPP (safety_equipment_stock + safety_inventory_movement)
-- Solo se ejecuta cuando delivery_status cambia a 'COMPLETED'.

CREATE OR REPLACE FUNCTION public.consume_delivery_resources_on_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_activity_id INTEGER;
    r RECORD;
BEGIN
    -- Solo procesar si la entrega pasa a COMPLETED desde otro estado
    IF NEW.delivery_status = 'COMPLETED' AND (OLD.delivery_status IS NULL OR OLD.delivery_status != 'COMPLETED') THEN
        
        v_activity_id := NEW.activity_id;

        -- =====================
        -- A) PIEZAS
        -- =====================
        FOR r IN 
            SELECT dp.piece_id, dp.quantity 
            FROM public.delivery_piece dp 
            WHERE dp.delivery_id = NEW.delivery_id 
        LOOP
            -- Descontar del stock
            UPDATE public.piece_stock 
            SET current_stock = current_stock - r.quantity 
            WHERE piece_id = r.piece_id;
            
            -- Registrar movimiento en el kardex (tipo 'OUT' que sí está permitido)
            INSERT INTO public.piece_stock_movement 
                (piece_id, type, quantity, reference_type, reference_id, date, notes)
            VALUES 
                (r.piece_id, 'OUT', r.quantity, 'DELIVERY_ACTIVITY', v_activity_id, 
                 CURRENT_DATE, 'Entrega a comunidad confirmada (delivery_id: ' || NEW.delivery_id || ')');
        END LOOP;
        
        -- =====================
        -- B) MATERIALES
        -- =====================
        FOR r IN 
            SELECT dm.material_id, dm.quantity 
            FROM public.delivery_material dm 
            WHERE dm.delivery_id = NEW.delivery_id 
        LOOP
            -- Descontar del stock
            UPDATE public.material_stock 
            SET quantity_available = quantity_available - r.quantity 
            WHERE material_id = r.material_id;
            
            -- Registrar movimiento en el kardex (tipo 'OUT')
            INSERT INTO public.material_stock_movement 
                (material_id, type, quantity, reference_type, reference_id, date, notes)
            VALUES 
                (r.material_id, 'OUT', r.quantity, 'DELIVERY_ACTIVITY', v_activity_id, 
                 CURRENT_DATE, 'Entrega a comunidad confirmada (delivery_id: ' || NEW.delivery_id || ')');
        END LOOP;

        -- =====================
        -- C) HERRAMIENTAS
        -- =====================
        FOR r IN 
            SELECT dt.tool_id, dt.quantity 
            FROM public.delivery_tool dt 
            WHERE dt.delivery_id = NEW.delivery_id 
        LOOP
            -- Descontar del stock
            UPDATE public.tool_stock 
            SET quantity_available = quantity_available - r.quantity 
            WHERE tool_id = r.tool_id;
            
            -- Registrar movimiento en el kardex (tipo 'OUT')
            INSERT INTO public.tool_stock_movement 
                (tool_id, type, quantity, reference_type, reference_id, date, notes)
            VALUES 
                (r.tool_id, 'OUT', r.quantity, 'DELIVERY_ACTIVITY', v_activity_id, 
                 CURRENT_DATE, 'Entrega a comunidad confirmada (delivery_id: ' || NEW.delivery_id || ')');
        END LOOP;

        -- =====================
        -- D) EPP / DOTACIÓN
        -- =====================
        FOR r IN 
            SELECT dp.ppe_id AS safety_id, dp.quantity 
            FROM public.delivery_ppe dp 
            WHERE dp.delivery_id = NEW.delivery_id 
        LOOP
            -- Descontar del stock
            UPDATE public.safety_equipment_stock 
            SET quantity_available = quantity_available - r.quantity 
            WHERE safety_id = r.safety_id;
            
            -- Registrar movimiento en el kardex (tipo 'OUT')
            INSERT INTO public.safety_inventory_movement 
                (safety_id, type, quantity, reference_type, reference_id, date, notes)
            VALUES 
                (r.safety_id, 'OUT', r.quantity, 'DELIVERY_ACTIVITY', v_activity_id, 
                 CURRENT_DATE, 'Entrega a comunidad confirmada (delivery_id: ' || NEW.delivery_id || ')');
        END LOOP;

    END IF;

    RETURN NEW;
END;
$function$;

-- PASO 4: Crear el trigger ÚNICO para la completación de entregas
CREATE TRIGGER trg_consume_delivery_on_complete
AFTER UPDATE OF delivery_status ON public.activity_community_delivery
FOR EACH ROW 
EXECUTE FUNCTION public.consume_delivery_resources_on_complete();
