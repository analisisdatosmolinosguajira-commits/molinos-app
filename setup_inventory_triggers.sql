-- Function to handle Piece stock updates
CREATE OR REPLACE FUNCTION update_piece_stock_from_wo()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE piece_stock
        SET current_stock = current_stock - NEW.quantity_used
        WHERE piece_id = NEW.piece_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE piece_stock
        SET current_stock = current_stock + OLD.quantity_used
        WHERE piece_id = OLD.piece_id;
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE piece_stock
        SET current_stock = current_stock + OLD.quantity_used - NEW.quantity_used
        WHERE piece_id = NEW.piece_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to handle Material stock updates
CREATE OR REPLACE FUNCTION update_material_stock_from_wo()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE material_stock
        SET quantity_available = quantity_available - NEW.quantity_used
        WHERE material_id = NEW.material_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE material_stock
        SET quantity_available = quantity_available + OLD.quantity_used
        WHERE material_id = OLD.material_id;
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE material_stock
        SET quantity_available = quantity_available + OLD.quantity_used - NEW.quantity_used
        WHERE material_id = NEW.material_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to handle Tool stock updates (Reservation)
CREATE OR REPLACE FUNCTION update_tool_stock_from_wo()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE tool_stock
        SET quantity_available = quantity_available - NEW.quantity
        WHERE tool_id = NEW.tool_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE tool_stock
        SET quantity_available = quantity_available + OLD.quantity
        WHERE tool_id = OLD.tool_id;
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE tool_stock
        SET quantity_available = quantity_available + OLD.quantity - NEW.quantity
        WHERE tool_id = NEW.tool_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create Triggers

-- Trigger for work_order_piece
DROP TRIGGER IF EXISTS trg_update_piece_stock ON work_order_piece;
CREATE TRIGGER trg_update_piece_stock
AFTER INSERT OR UPDATE OR DELETE ON work_order_piece
FOR EACH ROW EXECUTE FUNCTION update_piece_stock_from_wo();

-- Trigger for work_order_material
DROP TRIGGER IF EXISTS trg_update_material_stock ON work_order_material;
CREATE TRIGGER trg_update_material_stock
AFTER INSERT OR UPDATE OR DELETE ON work_order_material
FOR EACH ROW EXECUTE FUNCTION update_material_stock_from_wo();

-- Trigger for work_order_tool_reservation
DROP TRIGGER IF EXISTS trg_update_tool_stock ON work_order_tool_reservation;
CREATE TRIGGER trg_update_tool_stock
AFTER INSERT OR UPDATE OR DELETE ON work_order_tool_reservation
FOR EACH ROW EXECUTE FUNCTION update_tool_stock_from_wo();
