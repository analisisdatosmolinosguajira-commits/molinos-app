-- 1. Create `resource_requirements` table
CREATE TABLE IF NOT EXISTS resource_requirements (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('PIECE', 'MATERIAL', 'TOOL', 'EPP')),
    resource_id INTEGER NOT NULL,
    quantity_required NUMERIC NOT NULL,
    reference_type VARCHAR(50) NOT NULL CHECK (reference_type IN ('WORK_ORDER', 'DIAGNOSIS', 'MANUFACTURING')),
    reference_id INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SATISFIED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE resource_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON resource_requirements FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON resource_requirements TO authenticated;

-- 2. Prevent Immediate Consumption Triggers (DROP OLD ONES)
DROP TRIGGER IF EXISTS trg_record_piece_movement ON work_order_piece;
DROP FUNCTION IF EXISTS record_piece_movement_from_wo;

DROP TRIGGER IF EXISTS trg_record_material_movement ON work_order_material;
DROP FUNCTION IF EXISTS record_material_movement_from_wo;

DROP TRIGGER IF EXISTS trg_record_tool_movement ON work_order_tool_reservation;
DROP FUNCTION IF EXISTS record_tool_movement_from_wo;


-- 3. Trigger for managing Requirements on INSERT/UPDATE of WO Items

CREATE OR REPLACE FUNCTION manage_wo_requirements()
RETURNS TRIGGER AS $$
DECLARE
    current_qty NUMERIC;
    req_type VARCHAR;
    res_id INTEGER;
    qty_needed NUMERIC;
BEGIN
    -- Determine Type and ID
    IF (TG_TABLE_NAME = 'work_order_piece') THEN
        req_type := 'PIECE';
        res_id := NEW.piece_id;
        qty_needed := NEW.quantity_used;
        SELECT current_stock INTO current_qty FROM piece_stock WHERE piece_id = res_id;
    ELSIF (TG_TABLE_NAME = 'work_order_material') THEN
        req_type := 'MATERIAL';
        res_id := NEW.material_id;
        qty_needed := NEW.quantity_used;
        SELECT quantity_available INTO current_qty FROM material_stock WHERE material_id = res_id;
    -- Add Tool logic if needed, usually tool is reservation (bool)
    END IF;

    -- Check Stock
    IF current_qty < qty_needed THEN
        -- Insert Requirement (Upsert logic to avoid duplicates if updated)
        INSERT INTO resource_requirements (type, resource_id, quantity_required, reference_type, reference_id, status)
        VALUES (req_type, res_id, qty_needed - current_qty, 'WORK_ORDER', NEW.work_order_id, 'PENDING')
        ON CONFLICT DO NOTHING; -- Should define unique constraint if strict upsert needed
    ELSE
        -- If stock is sufficient, ensure no PENDING requirement exists (Auto-Resolve?)
        DELETE FROM resource_requirements 
        WHERE reference_type = 'WORK_ORDER' AND reference_id = NEW.work_order_id 
          AND type = req_type AND resource_id = res_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind to WO Tables
CREATE TRIGGER trg_manage_wo_piece_req
AFTER INSERT OR UPDATE ON work_order_piece
FOR EACH ROW EXECUTE FUNCTION manage_wo_requirements();

CREATE TRIGGER trg_manage_wo_material_req
AFTER INSERT OR UPDATE ON work_order_material
FOR EACH ROW EXECUTE FUNCTION manage_wo_requirements();


-- 4. Trigger for CONSUMPTION on Status Change

CREATE OR REPLACE FUNCTION consume_wo_resources_on_start()
RETURNS TRIGGER AS $$
DECLARE
    r RECORD;
BEGIN
    -- Only run when Status changes to IN_PROGRESS
    IF NEW.status = 'IN_PROGRESS' AND OLD.status != 'IN_PROGRESS' THEN
        
        -- Check for Blocking Requirements
        PERFORM 1 FROM resource_requirements 
        WHERE reference_type = 'WORK_ORDER' AND reference_id = NEW.work_order_id AND status = 'PENDING';
        
        IF FOUND THEN
            RAISE EXCEPTION 'No se puede iniciar la Orden de Trabajo. Faltan recursos requeridos (ver tabla de requerimientos).';
        END IF;

        -- Execute Consumption (Insert Movements)
        
        -- PIECES
        FOR r IN SELECT * FROM work_order_piece WHERE work_order_id = NEW.work_order_id LOOP
            INSERT INTO piece_stock_movement (piece_id, type, quantity, reference_type, reference_id, date, notes)
            VALUES (r.piece_id, 'USE', r.quantity_used, 'WORK_ORDER', NEW.work_order_id, CURRENT_DATE, 'Consumo - Inicio de OT');
        END LOOP;

        -- MATERIALS
        FOR r IN SELECT * FROM work_order_material WHERE work_order_id = NEW.work_order_id LOOP
             INSERT INTO material_stock_movement (material_id, type, quantity, reference_type, reference_id, date, notes)
            VALUES (r.material_id, 'USE', r.quantity_used, 'WORK_ORDER', NEW.work_order_id, CURRENT_DATE, 'Consumo - Inicio de OT');
        END LOOP;
        
        -- TOOLS (Reservations usually happen at creation or start? Let's assume start for consistency)
        FOR r IN SELECT * FROM work_order_tool_reservation WHERE work_order_id = NEW.work_order_id LOOP
             INSERT INTO tool_stock_movement (tool_id, type, quantity, reference_type, reference_id, date, notes)
            VALUES (r.tool_id, 'USE', r.quantity, 'WORK_ORDER', NEW.work_order_id, CURRENT_DATE, 'Reserva - Inicio de OT');
        END LOOP;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind to work_order
CREATE TRIGGER trg_wo_start_consumption
AFTER UPDATE OF status ON work_order
FOR EACH ROW EXECUTE FUNCTION consume_wo_resources_on_start();
