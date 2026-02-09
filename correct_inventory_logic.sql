-- 1. DROP the "Direct Update" Triggers created in previous step
DROP TRIGGER IF EXISTS trg_update_piece_stock ON work_order_piece;
DROP FUNCTION IF EXISTS update_piece_stock_from_wo;

DROP TRIGGER IF EXISTS trg_update_material_stock ON work_order_material;
DROP FUNCTION IF EXISTS update_material_stock_from_wo;

DROP TRIGGER IF EXISTS trg_update_tool_stock ON work_order_tool_reservation;
DROP FUNCTION IF EXISTS update_tool_stock_from_wo;

-- 2. CREATE NEW "Movement Recording" Triggers

-- Function: Record Piece Movement
CREATE OR REPLACE FUNCTION record_piece_movement_from_wo()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO piece_stock_movement (piece_id, type, quantity, reference_type, reference_id, date, notes)
        VALUES (NEW.piece_id, 'USE', NEW.quantity_used, 'WORK_ORDER', NEW.work_order_id, CURRENT_DATE, 'Consumo en Orden de Trabajo');
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        -- Revert consumption -> 'IN' or 'ADJUST' to add back? 
        -- Usually 'ADJUST' or 'IN' with specific note. Let's use 'ADJUST' (positive) to restore stock.
        -- Wait, fn_piece_stock_update handles 'IN', 'ADJUST' as (+).
        INSERT INTO piece_stock_movement (piece_id, type, quantity, reference_type, reference_id, date, notes)
        VALUES (OLD.piece_id, 'ADJUST', OLD.quantity_used, 'WORK_ORDER', OLD.work_order_id, CURRENT_DATE, 'Reversión por eliminación de item en OT');
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Calculate difference. If usage increased, we need more OUT. If usage decreased, we need IN/ADJUST.
        DECLARE 
            diff INTEGER;
        BEGIN
            diff := NEW.quantity_used - OLD.quantity_used;
            IF diff > 0 THEN
                INSERT INTO piece_stock_movement (piece_id, type, quantity, reference_type, reference_id, date, notes)
                VALUES (NEW.piece_id, 'USE', diff, 'WORK_ORDER', NEW.work_order_id, CURRENT_DATE, 'Ajuste de consumo (Aumento) en OT');
            ELSIF diff < 0 THEN
                INSERT INTO piece_stock_movement (piece_id, type, quantity, reference_type, reference_id, date, notes)
                VALUES (NEW.piece_id, 'ADJUST', ABS(diff), 'WORK_ORDER', NEW.work_order_id, CURRENT_DATE, 'Ajuste de consumo (Disminución) en OT');
            END IF;
        END;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function: Record Material Movement
CREATE OR REPLACE FUNCTION record_material_movement_from_wo()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO material_stock_movement (material_id, type, quantity, reference_type, reference_id, date, notes)
        VALUES (NEW.material_id, 'USE', NEW.quantity_used, 'WORK_ORDER', NEW.work_order_id, CURRENT_DATE, 'Consumo en Orden de Trabajo');
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO material_stock_movement (material_id, type, quantity, reference_type, reference_id, date, notes)
        VALUES (OLD.material_id, 'ADJUST', OLD.quantity_used, 'WORK_ORDER', OLD.work_order_id, CURRENT_DATE, 'Reversión por eliminación de item en OT');
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        DECLARE 
            diff NUMERIC;
        BEGIN
            diff := NEW.quantity_used - OLD.quantity_used;
            IF diff > 0 THEN
                INSERT INTO material_stock_movement (material_id, type, quantity, reference_type, reference_id, date, notes)
                VALUES (NEW.material_id, 'USE', diff, 'WORK_ORDER', NEW.work_order_id, CURRENT_DATE, 'Ajuste de consumo en OT');
            ELSIF diff < 0 THEN
                INSERT INTO material_stock_movement (material_id, type, quantity, reference_type, reference_id, date, notes)
                VALUES (NEW.material_id, 'ADJUST', ABS(diff), 'WORK_ORDER', NEW.work_order_id, CURRENT_DATE, 'Ajuste de consumo en OT');
            END IF;
        END;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function: Record Tool Movement (Reservation)
-- NOTE: Tool stock usually tracks "Quantity Available". 
-- 'USE' or 'OUT' reduces available. 'IN' increases.
-- Reservation = 'USE' (Temporary unavailable). Return = 'IN'.
CREATE OR REPLACE FUNCTION record_tool_movement_from_wo()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO tool_stock_movement (tool_id, type, quantity, reference_type, reference_id, date, notes)
        VALUES (NEW.tool_id, 'USE', NEW.quantity, 'WORK_ORDER', NEW.work_order_id, CURRENT_DATE, 'Reserva en Orden de Trabajo');
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO tool_stock_movement (tool_id, type, quantity, reference_type, reference_id, date, notes)
        VALUES (OLD.tool_id, 'IN', OLD.quantity, 'WORK_ORDER', OLD.work_order_id, CURRENT_DATE, 'Liberación por eliminación de reserva');
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        DECLARE 
            diff INTEGER;
        BEGIN
            diff := NEW.quantity - OLD.quantity;
            IF diff > 0 THEN
                INSERT INTO tool_stock_movement (tool_id, type, quantity, reference_type, reference_id, date, notes)
                VALUES (NEW.tool_id, 'USE', diff, 'WORK_ORDER', NEW.work_order_id, CURRENT_DATE, 'Ajuste de reserva (Aumento)');
            ELSIF diff < 0 THEN
                INSERT INTO tool_stock_movement (tool_id, type, quantity, reference_type, reference_id, date, notes)
                VALUES (NEW.tool_id, 'IN', ABS(diff), 'WORK_ORDER', NEW.work_order_id, CURRENT_DATE, 'Ajuste de reserva (Disminución)');
            END IF;
        END;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. RE-BIND Triggers to Tables

CREATE TRIGGER trg_record_piece_movement
AFTER INSERT OR UPDATE OR DELETE ON work_order_piece
FOR EACH ROW EXECUTE FUNCTION record_piece_movement_from_wo();

CREATE TRIGGER trg_record_material_movement
AFTER INSERT OR UPDATE OR DELETE ON work_order_material
FOR EACH ROW EXECUTE FUNCTION record_material_movement_from_wo();

CREATE TRIGGER trg_record_tool_movement
AFTER INSERT OR UPDATE OR DELETE ON work_order_tool_reservation
FOR EACH ROW EXECUTE FUNCTION record_tool_movement_from_wo();
