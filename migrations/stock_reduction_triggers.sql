-- Function to reduce tool stock on assignment
CREATE OR REPLACE FUNCTION reduce_tool_stock_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tool
    SET status = 'asignada' -- Optional: track status change if needed, though quantity is key
    WHERE tool_id = NEW.tool_id;

    -- If you track quantity for tools (consumables vs assets), update tool_stock
    UPDATE tool_stock
    SET quantity_available = quantity_available - NEW.quantity
    WHERE tool_id = NEW.tool_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reduce_tool_stock
AFTER INSERT ON crew_tool_assignment
FOR EACH ROW
EXECUTE FUNCTION reduce_tool_stock_on_assignment();

-- Function to reduce safety equipment stock on assignment
CREATE OR REPLACE FUNCTION reduce_safety_stock_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE safety_equipment_stock
    SET quantity_available = quantity_available - NEW.quantity
    WHERE safety_id = NEW.safety_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reduce_safety_stock
AFTER INSERT ON crew_safety_equipment_assignment
FOR EACH ROW
EXECUTE FUNCTION reduce_safety_stock_on_assignment();
