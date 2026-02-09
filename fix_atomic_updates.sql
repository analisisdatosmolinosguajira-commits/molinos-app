-- Fix for Data Loss (Atomic Updates)
-- Goal: Perform Delete + Insert in a single transaction so that failures roll back everything.

BEGIN;

CREATE OR REPLACE FUNCTION public.update_work_order_resources(
    p_work_order_id INTEGER,
    p_pieces JSONB DEFAULT NULL,
    p_materials JSONB DEFAULT NULL,
    p_tools JSONB DEFAULT NULL,
    p_safety JSONB DEFAULT NULL
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_item JSONB;
BEGIN
    -- 1. Pieces
    IF p_pieces IS NOT NULL THEN
        DELETE FROM work_order_piece WHERE work_order_id = p_work_order_id;
        
        IF jsonb_array_length(p_pieces) > 0 THEN
            FOR v_item IN SELECT * FROM jsonb_array_elements(p_pieces) LOOP
                INSERT INTO work_order_piece (work_order_id, piece_id, quantity_used)
                VALUES (p_work_order_id, (v_item->>'piece_id')::INT, (v_item->>'quantity_used')::INT);
            END LOOP;
        END IF;
    END IF;

    -- 2. Materials
    IF p_materials IS NOT NULL THEN
        DELETE FROM work_order_material WHERE work_order_id = p_work_order_id;
        
        IF jsonb_array_length(p_materials) > 0 THEN
            FOR v_item IN SELECT * FROM jsonb_array_elements(p_materials) LOOP
                INSERT INTO work_order_material (work_order_id, material_id, quantity_used)
                VALUES (p_work_order_id, (v_item->>'material_id')::INT, (v_item->>'quantity_used')::INT);
            END LOOP;
        END IF;
    END IF;

    -- 3. Tools
    IF p_tools IS NOT NULL THEN
        DELETE FROM work_order_tool_reservation WHERE work_order_id = p_work_order_id;
        
        IF jsonb_array_length(p_tools) > 0 THEN
            FOR v_item IN SELECT * FROM jsonb_array_elements(p_tools) LOOP
                INSERT INTO work_order_tool_reservation (work_order_id, tool_id, quantity)
                VALUES (p_work_order_id, (v_item->>'tool_id')::INT, (v_item->>'quantity')::INT);
            END LOOP;
        END IF;
    END IF;

    -- 4. Safety
    IF p_safety IS NOT NULL THEN
        DELETE FROM work_order_safety_requirement WHERE work_order_id = p_work_order_id;
        
        IF jsonb_array_length(p_safety) > 0 THEN
            FOR v_item IN SELECT * FROM jsonb_array_elements(p_safety) LOOP
                INSERT INTO work_order_safety_requirement (work_order_id, safety_id, quantity_required)
                VALUES (p_work_order_id, (v_item->>'safety_id')::INT, (v_item->>'quantity_required')::INT);
            END LOOP;
        END IF;
    END IF;

EXCEPTION WHEN OTHERS THEN
    -- Propagate error to roll back transaction
    RAISE;
END;
$function$;

COMMIT;
