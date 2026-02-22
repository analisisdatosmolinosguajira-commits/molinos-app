-- 1. Relación Actividad -> Comunidad (Múltiples destinos en un viaje)
CREATE TABLE public.activity_community_delivery (
    delivery_id SERIAL PRIMARY KEY,
    activity_id INTEGER REFERENCES public.planned_activity(activity_id) ON DELETE CASCADE,
    community_id INTEGER REFERENCES public.community(community_id) ON DELETE CASCADE,
    delivery_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, COMPLETED, CANCELLED
    notes TEXT,
    UNIQUE(activity_id, community_id)
);

-- 2. Recursos por Comunidad y Actividad
CREATE TABLE public.delivery_piece (
    id SERIAL PRIMARY KEY,
    delivery_id INTEGER REFERENCES public.activity_community_delivery(delivery_id) ON DELETE CASCADE,
    piece_id INTEGER REFERENCES public.piece(piece_id),
    quantity NUMERIC NOT NULL CHECK (quantity > 0)
);

CREATE TABLE public.delivery_material (
    id SERIAL PRIMARY KEY,
    delivery_id INTEGER REFERENCES public.activity_community_delivery(delivery_id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES public.material(material_id),
    quantity NUMERIC NOT NULL CHECK (quantity > 0)
);

CREATE TABLE public.delivery_tool (
    id SERIAL PRIMARY KEY,
    delivery_id INTEGER REFERENCES public.activity_community_delivery(delivery_id) ON DELETE CASCADE,
    tool_id INTEGER REFERENCES public.tool(tool_id),
    quantity NUMERIC NOT NULL CHECK (quantity > 0)
);

CREATE TABLE public.delivery_ppe (
    id SERIAL PRIMARY KEY,
    delivery_id INTEGER REFERENCES public.activity_community_delivery(delivery_id) ON DELETE CASCADE,
    ppe_id INTEGER REFERENCES public.safety_equipment(safety_id),
    quantity NUMERIC NOT NULL CHECK (quantity > 0)
);

-- Políticas RLS Permisivas para todas las nuevas tablas
ALTER TABLE public.activity_community_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_piece ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_ppe ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.activity_community_delivery TO anon, authenticated;
GRANT ALL ON TABLE public.delivery_piece TO anon, authenticated;
GRANT ALL ON TABLE public.delivery_material TO anon, authenticated;
GRANT ALL ON TABLE public.delivery_tool TO anon, authenticated;
GRANT ALL ON TABLE public.delivery_ppe TO anon, authenticated;

GRANT USAGE, SELECT ON SEQUENCE public.activity_community_delivery_delivery_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.delivery_piece_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.delivery_material_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.delivery_tool_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.delivery_ppe_id_seq TO anon, authenticated;

CREATE POLICY "Enable all for all" ON public.activity_community_delivery FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for all" ON public.delivery_piece FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for all" ON public.delivery_material FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for all" ON public.delivery_tool FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for all" ON public.delivery_ppe FOR ALL USING (true) WITH CHECK (true);

-- 3. Triggers para Deducción de Stock
-- Los triggers replicarán el comportamiento interceptando entregas completadas

CREATE OR REPLACE FUNCTION public.sync_delivery_stock_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_delivery_status VARCHAR;
    v_activity_id INTEGER;
    v_delivery_id INTEGER;
    
    v_resource_id INTEGER;
    v_quantity NUMERIC;
    v_old_quantity NUMERIC;
    v_resource_type VARCHAR;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_delivery_id := OLD.delivery_id;
    ELSE
        v_delivery_id := NEW.delivery_id;
    END IF;

    SELECT delivery_status, activity_id INTO v_delivery_status, v_activity_id FROM public.activity_community_delivery WHERE delivery_id = v_delivery_id;

    -- Solo procesar si la entrega a la comunidad fué completada
    IF v_delivery_status NOT IN ('COMPLETED') THEN
        RETURN NULL;
    END IF;

    IF TG_TABLE_NAME = 'delivery_piece' THEN
        v_resource_type := 'PIECE';
        IF TG_OP = 'DELETE' THEN
            v_resource_id := OLD.piece_id;
            v_quantity := OLD.quantity;
        ELSE
            v_resource_id := NEW.piece_id;
            v_quantity := NEW.quantity;
            IF TG_OP = 'UPDATE' THEN
                v_old_quantity := OLD.quantity;
            END IF;
        END IF;
    ELSIF TG_TABLE_NAME = 'delivery_material' THEN
        v_resource_type := 'MATERIAL';
        IF TG_OP = 'DELETE' THEN
            v_resource_id := OLD.material_id;
            v_quantity := OLD.quantity;
        ELSE
            v_resource_id := NEW.material_id;
            v_quantity := NEW.quantity;
            IF TG_OP = 'UPDATE' THEN
                v_old_quantity := OLD.quantity;
            END IF;
        END IF;
    END IF;

    IF v_resource_type = 'PIECE' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE public.piece_stock SET current_stock = current_stock - v_quantity WHERE piece_id = v_resource_id;
            INSERT INTO public.piece_stock_movement (piece_id, type, quantity, reference_type, reference_id, notes)
            VALUES (v_resource_id, 'USE', v_quantity, 'DELIVERY_ACTIVITY', v_activity_id, 'Entrega a comunidad completada');
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE public.piece_stock SET current_stock = current_stock + v_quantity WHERE piece_id = v_resource_id;
            INSERT INTO public.piece_stock_movement (piece_id, type, quantity, reference_type, reference_id, notes)
            VALUES (v_resource_id, 'RETURN', v_quantity, 'DELIVERY_ACTIVITY', v_activity_id, 'Recurso removido de entrega');
        ELSIF TG_OP = 'UPDATE' THEN
            IF v_quantity > v_old_quantity THEN
                UPDATE public.piece_stock SET current_stock = current_stock - (v_quantity - v_old_quantity) WHERE piece_id = v_resource_id;
                INSERT INTO public.piece_stock_movement (piece_id, type, quantity, reference_type, reference_id, notes)
                VALUES (v_resource_id, 'USE', (v_quantity - v_old_quantity), 'DELIVERY_ACTIVITY', v_activity_id, 'Aumento cantidad de entrega');
            ELSIF v_quantity < v_old_quantity THEN
                UPDATE public.piece_stock SET current_stock = current_stock + (v_old_quantity - v_quantity) WHERE piece_id = v_resource_id;
                INSERT INTO public.piece_stock_movement (piece_id, type, quantity, reference_type, reference_id, notes)
                VALUES (v_resource_id, 'RETURN', (v_old_quantity - v_quantity), 'DELIVERY_ACTIVITY', v_activity_id, 'Disminución cantidad de entrega');
            END IF;
        END IF;
    ELSIF v_resource_type = 'MATERIAL' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE public.material_stock SET quantity_available = quantity_available - v_quantity WHERE material_id = v_resource_id;
            INSERT INTO public.material_stock_movement (material_id, type, quantity, reference_type, reference_id, notes)
            VALUES (v_resource_id, 'USE', v_quantity, 'DELIVERY_ACTIVITY', v_activity_id, 'Entrega a comunidad completada');
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE public.material_stock SET quantity_available = quantity_available + v_quantity WHERE material_id = v_resource_id;
            INSERT INTO public.material_stock_movement (material_id, type, quantity, reference_type, reference_id, notes)
            VALUES (v_resource_id, 'RETURN', v_quantity, 'DELIVERY_ACTIVITY', v_activity_id, 'Recurso removido de entrega');
        ELSIF TG_OP = 'UPDATE' THEN
            IF v_quantity > v_old_quantity THEN
                UPDATE public.material_stock SET quantity_available = quantity_available - (v_quantity - v_old_quantity) WHERE material_id = v_resource_id;
                INSERT INTO public.material_stock_movement (material_id, type, quantity, reference_type, reference_id, notes)
                VALUES (v_resource_id, 'USE', (v_quantity - v_old_quantity), 'DELIVERY_ACTIVITY', v_activity_id, 'Aumento cantidad de entrega');
            ELSIF v_quantity < v_old_quantity THEN
                UPDATE public.material_stock SET quantity_available = quantity_available + (v_old_quantity - v_quantity) WHERE material_id = v_resource_id;
                INSERT INTO public.material_stock_movement (material_id, type, quantity, reference_type, reference_id, notes)
                VALUES (v_resource_id, 'RETURN', (v_old_quantity - v_quantity), 'DELIVERY_ACTIVITY', v_activity_id, 'Disminución cantidad de entrega');
            END IF;
        END IF;
    END IF;

    RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_delivery_piece_stock ON public.delivery_piece;
CREATE TRIGGER trg_sync_delivery_piece_stock
AFTER INSERT OR UPDATE OR DELETE ON public.delivery_piece
FOR EACH ROW EXECUTE FUNCTION public.sync_delivery_stock_changes();

DROP TRIGGER IF EXISTS trg_sync_delivery_material_stock ON public.delivery_material;
CREATE TRIGGER trg_sync_delivery_material_stock
AFTER INSERT OR UPDATE OR DELETE ON public.delivery_material
FOR EACH ROW EXECUTE FUNCTION public.sync_delivery_stock_changes();

-- Función especial para cuando el estado completo de la entrega pasa de PENDING a COMPLETED
-- Ya que el trigger de arriba solo asume que los roles se insertan MIENTRAS está en completed,
-- Si se insertan PENDING (que es lo normal), y LUEGO se pasa a COMPLETED, necesitamos deducirlos todos en masa.

CREATE OR REPLACE FUNCTION public.consume_delivery_resources_on_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_activity_id INTEGER;
    r RECORD;
BEGIN
    v_activity_id := NEW.activity_id;

    IF NEW.delivery_status = 'COMPLETED' AND OLD.delivery_status != 'COMPLETED' THEN
        -- PIECES
        FOR r IN SELECT dp.piece_id, dp.quantity FROM public.delivery_piece dp WHERE dp.delivery_id = NEW.delivery_id LOOP
            UPDATE public.piece_stock SET current_stock = current_stock - r.quantity WHERE piece_id = r.piece_id;
            INSERT INTO public.piece_stock_movement (piece_id, type, quantity, reference_type, reference_id, notes)
            VALUES (r.piece_id, 'USE', r.quantity, 'DELIVERY_ACTIVITY', v_activity_id, 'Entrega a comunidad confirmada');
        END LOOP;
        
        -- MATERIALS
        FOR r IN SELECT dm.material_id, dm.quantity FROM public.delivery_material dm WHERE dm.delivery_id = NEW.delivery_id LOOP
            UPDATE public.material_stock SET quantity_available = quantity_available - r.quantity WHERE material_id = r.material_id;
            INSERT INTO public.material_stock_movement (material_id, type, quantity, reference_type, reference_id, notes)
            VALUES (r.material_id, 'USE', r.quantity, 'DELIVERY_ACTIVITY', v_activity_id, 'Entrega a comunidad confirmada');
        END LOOP;
    END IF;

    -- If reverted or cancelled, logic can be added later if needed.
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_consume_delivery_on_complete ON public.activity_community_delivery;
CREATE TRIGGER trg_consume_delivery_on_complete
AFTER UPDATE OF delivery_status ON public.activity_community_delivery
FOR EACH ROW EXECUTE FUNCTION public.consume_delivery_resources_on_complete();
