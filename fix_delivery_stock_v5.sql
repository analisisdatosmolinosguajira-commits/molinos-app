-- ============================================================
-- FIX V5: Eliminación de EPP y Dotación de las entregas
-- ============================================================
-- Se deshabilita el procesamiento de EPP/Dotación en las entregas
-- a comunidad, manteniendo solo Piezas, Materiales y Herramientas.
-- ============================================================

-- Eliminar versión anterior del trigger
DROP TRIGGER IF EXISTS trg_consume_delivery_on_complete ON public.activity_community_delivery;

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
            VALUES (r.piece_id, 'USE', r.quantity, 'DELIVERY_ACTIVITY', v_activity_id, CURRENT_DATE, 'Entrega confirmada');
        END LOOP;
        
        -- B) MATERIALES
        FOR r IN SELECT material_id, quantity FROM public.delivery_material WHERE delivery_id = NEW.delivery_id LOOP
            INSERT INTO public.material_stock_movement (material_id, type, quantity, reference_type, reference_id, date, notes)
            VALUES (r.material_id, 'USE', r.quantity, 'DELIVERY_ACTIVITY', v_activity_id, CURRENT_DATE, 'Entrega confirmada');
        END LOOP;

        -- C) HERRAMIENTAS
        FOR r IN SELECT tool_id, quantity FROM public.delivery_tool WHERE delivery_id = NEW.delivery_id LOOP
            INSERT INTO public.tool_stock_movement (tool_id, type, quantity, reference_type, reference_id, date, notes)
            VALUES (r.tool_id, 'USE', r.quantity, 'DELIVERY_ACTIVITY', v_activity_id, CURRENT_DATE, 'Entrega confirmada');
        END LOOP;

        -- D) EPP / SAFETY (DESHABILITADO POR SOLICITUD DE USUARIO)
        -- No se procesan entregas de dotación personal en esta ruta de entrega comunitaria.

    END IF;
    RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_consume_delivery_on_complete
AFTER UPDATE OF delivery_status ON public.activity_community_delivery
FOR EACH ROW 
EXECUTE FUNCTION public.consume_delivery_resources_on_complete();
