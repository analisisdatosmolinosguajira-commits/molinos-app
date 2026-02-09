-- Function to sync Piece/Material changes to Stock when WO is active
CREATE OR REPLACE FUNCTION public.sync_wo_stock_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_wo_status VARCHAR;
    v_mill_id INTEGER; -- Not strictly needed for logic but good for context if logging
    v_work_order_id INTEGER;
    
    -- Variables for generic handling
    v_resource_id INTEGER;
    v_quantity NUMERIC;
    v_old_quantity NUMERIC;
    v_resource_type VARCHAR; -- 'PIECE' or 'MATERIAL'
    
BEGIN
    -- 1. Identify context (Parent WO)
    IF TG_OP = 'DELETE' THEN
        v_work_order_id := OLD.work_order_id;
    ELSE
        v_work_order_id := NEW.work_order_id;
    END IF;

    SELECT status INTO v_wo_status FROM work_order WHERE work_order_id = v_work_order_id;

    -- Only proceed if WO is active (IN_PROGRESS or COMPLETED)
    -- If PENDING, standard logic (consume_wo_resources_on_start) will handle it later.
    IF v_wo_status NOT IN ('IN_PROGRESS', 'COMPLETED') THEN
        RETURN NULL; -- Do nothing
    END IF;

    -- 2. Identify Resource Type & Values
    IF TG_TABLE_NAME = 'work_order_piece' THEN
        v_resource_type := 'PIECE';
        IF TG_OP = 'DELETE' THEN
            v_resource_id := OLD.piece_id;
            v_quantity := OLD.quantity_used;
        ELSE
            v_resource_id := NEW.piece_id;
            v_quantity := NEW.quantity_used;
            IF TG_OP = 'UPDATE' THEN
                v_old_quantity := OLD.quantity_used;
            END IF;
        END IF;
    ELSIF TG_TABLE_NAME = 'work_order_material' THEN
        v_resource_type := 'MATERIAL';
        IF TG_OP = 'DELETE' THEN
            v_resource_id := OLD.material_id;
            v_quantity := OLD.quantity_used;
        ELSE
            v_resource_id := NEW.material_id;
            v_quantity := NEW.quantity_used;
            IF TG_OP = 'UPDATE' THEN
                v_old_quantity := OLD.quantity_used;
            END IF;
        END IF;
    END IF;

    -- 3. Perform Stock Logic
    -- PIECES
    IF v_resource_type = 'PIECE' THEN
        IF TG_OP = 'INSERT' THEN
            -- Reduce Stock
            UPDATE piece_stock 
            SET current_stock = current_stock - v_quantity 
            WHERE piece_id = v_resource_id;

            INSERT INTO piece_stock_movement (piece_id, type, quantity, reference_type, reference_id, notes)
            VALUES (v_resource_id, 'USE', v_quantity, 'WORK_ORDER', v_work_order_id, 'Agregado a OT activa');

        ELSIF TG_OP = 'DELETE' THEN
            -- Return Stock
            UPDATE piece_stock 
            SET current_stock = current_stock + v_quantity 
            WHERE piece_id = v_resource_id;

            INSERT INTO piece_stock_movement (piece_id, type, quantity, reference_type, reference_id, notes)
            VALUES (v_resource_id, 'RETURN', v_quantity, 'WORK_ORDER', v_work_order_id, 'Eliminado de OT activa');

        ELSIF TG_OP = 'UPDATE' THEN
            -- Adjust Stock
            IF v_quantity > v_old_quantity THEN
                -- Consumption Increased -> Reduce Stock
                UPDATE piece_stock SET current_stock = current_stock - (v_quantity - v_old_quantity) WHERE piece_id = v_resource_id;
                INSERT INTO piece_stock_movement (piece_id, type, quantity, reference_type, reference_id, notes)
                VALUES (v_resource_id, 'USE', (v_quantity - v_old_quantity), 'WORK_ORDER', v_work_order_id, 'Aumento cantidad en OT activa');
            ELSIF v_quantity < v_old_quantity THEN
                 -- Consumption Decreased -> Return Stock
                UPDATE piece_stock SET current_stock = current_stock + (v_old_quantity - v_quantity) WHERE piece_id = v_resource_id;
                INSERT INTO piece_stock_movement (piece_id, type, quantity, reference_type, reference_id, notes)
                VALUES (v_resource_id, 'RETURN', (v_old_quantity - v_quantity), 'WORK_ORDER', v_work_order_id, 'Disminución cantidad en OT activa');
            END IF;
        END IF;
    
    -- MATERIALS
    ELSIF v_resource_type = 'MATERIAL' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE material_stock SET quantity_available = quantity_available - v_quantity WHERE material_id = v_resource_id;
            INSERT INTO material_stock_movement (material_id, type, quantity, reference_type, reference_id, notes)
            VALUES (v_resource_id, 'USE', v_quantity, 'WORK_ORDER', v_work_order_id, 'Agregado a OT activa');
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE material_stock SET quantity_available = quantity_available + v_quantity WHERE material_id = v_resource_id;
            INSERT INTO material_stock_movement (material_id, type, quantity, reference_type, reference_id, notes)
            VALUES (v_resource_id, 'RETURN', v_quantity, 'WORK_ORDER', v_work_order_id, 'Eliminado de OT activa');
        ELSIF TG_OP = 'UPDATE' THEN
            IF v_quantity > v_old_quantity THEN
                UPDATE material_stock SET quantity_available = quantity_available - (v_quantity - v_old_quantity) WHERE material_id = v_resource_id;
                INSERT INTO material_stock_movement (material_id, type, quantity, reference_type, reference_id, notes)
                VALUES (v_resource_id, 'USE', (v_quantity - v_old_quantity), 'WORK_ORDER', v_work_order_id, 'Aumento cantidad en OT activa');
            ELSIF v_quantity < v_old_quantity THEN
                UPDATE material_stock SET quantity_available = quantity_available + (v_old_quantity - v_quantity) WHERE material_id = v_resource_id;
                INSERT INTO material_stock_movement (material_id, type, quantity, reference_type, reference_id, notes)
                VALUES (v_resource_id, 'RETURN', (v_old_quantity - v_quantity), 'WORK_ORDER', v_work_order_id, 'Disminución cantidad en OT activa');
            END IF;
        END IF;
    END IF;

    RETURN NULL; -- After trigger, return value doesn't matter much for ROW triggers unless modifying NEW
END;
$function$;

-- Triggers for Pieces/Materials
DROP TRIGGER IF EXISTS trg_sync_wo_piece_stock ON work_order_piece;
CREATE TRIGGER trg_sync_wo_piece_stock
AFTER INSERT OR UPDATE OR DELETE ON work_order_piece
FOR EACH ROW EXECUTE FUNCTION sync_wo_stock_changes();

DROP TRIGGER IF EXISTS trg_sync_wo_material_stock ON work_order_material;
CREATE TRIGGER trg_sync_wo_material_stock
AFTER INSERT OR UPDATE OR DELETE ON work_order_material
FOR EACH ROW EXECUTE FUNCTION sync_wo_stock_changes();


-- Function to sync Tool changes (Reservations -> Assignments) when WO is active
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
    -- 1. Identify Context
    IF TG_OP = 'DELETE' THEN
        v_work_order_id := OLD.work_order_id;
    ELSE
        v_work_order_id := NEW.work_order_id;
    END IF;

    SELECT status, crew_id INTO v_wo_status, v_crew_id 
    FROM work_order WHERE work_order_id = v_work_order_id;

    -- Only proceed if Active
    IF v_wo_status NOT IN ('IN_PROGRESS', 'COMPLETED') THEN
        RETURN NULL;
    END IF;

    -- 2. Handle Logic
    IF TG_OP = 'INSERT' THEN
        -- Add to Crew Assignment
        -- Note: The existing trigger 'trg_reduce_tool_stock' on crew_tool_assignment will handle stock reduction!
        INSERT INTO crew_tool_assignment (crew_id, tool_id, quantity, start_date)
        VALUES (v_crew_id, NEW.tool_id, NEW.quantity, CURRENT_DATE);
        
    ELSIF TG_OP = 'DELETE' THEN
        -- "Return" the tool by setting end_date on the active assignment
        -- We look for an open assignment for this crew/tool
        UPDATE crew_tool_assignment
        SET end_date = CURRENT_DATE
        WHERE crew_id = v_crew_id
          AND tool_id = OLD.tool_id
          AND end_date IS NULL;
        -- The existing trigger 'return_tool_on_assignment_end' (if it triggers on UPDATE) is what we rely on.
        -- OR, we might need to manually return stock if that trigger only handles something else.
        -- I checked 'return_tool_on_assignment_end' earlier, it handles insertion into tool_stock_movement.
        -- We might need to ensure stock is incremented. 'handle_tool_stock_movement' does that.
        -- So closing assignment -> triggers return_tool... -> inserts stock movement -> triggers handle_tool... -> updates stock.
        -- Chain seems solid.
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Tool quantity change? Rare, but possible.
        -- Implementation complexity is high (finding exact assignment row).
        -- For now, we will assume tools are mostly added/removed.
        -- If quantity increases, we add difference.
        IF NEW.quantity > OLD.quantity THEN
             INSERT INTO crew_tool_assignment (crew_id, tool_id, quantity, start_date)
            VALUES (v_crew_id, NEW.tool_id, (NEW.quantity - OLD.quantity), CURRENT_DATE);
        END IF;
        -- Decreasing quantity is hard without splitting assignment rows. Ignored for now.
    END IF;

    RETURN NULL;
END;
$function$;

-- Trigger for Tools
DROP TRIGGER IF EXISTS trg_sync_wo_tool_reservations ON work_order_tool_reservation;
CREATE TRIGGER trg_sync_wo_tool_reservations
AFTER INSERT OR UPDATE OR DELETE ON work_order_tool_reservation
FOR EACH ROW EXECUTE FUNCTION sync_wo_tool_changes();
