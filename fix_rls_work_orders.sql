-- Enable RLS on all related tables
ALTER TABLE work_order_piece ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_tool_reservation ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_safety_requirement ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_component_status ENABLE ROW LEVEL SECURITY;

-- Policy for work_order_piece
DROP POLICY IF EXISTS "Enable all for work_order_piece" ON work_order_piece;
CREATE POLICY "Enable all for work_order_piece" ON work_order_piece
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policy for work_order_tool_reservation
DROP POLICY IF EXISTS "Enable all for work_order_tool_reservation" ON work_order_tool_reservation;
CREATE POLICY "Enable all for work_order_tool_reservation" ON work_order_tool_reservation
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policy for work_order_material
DROP POLICY IF EXISTS "Enable all for work_order_material" ON work_order_material;
CREATE POLICY "Enable all for work_order_material" ON work_order_material
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policy for work_order_safety_requirement
DROP POLICY IF EXISTS "Enable all for work_order_safety_requirement" ON work_order_safety_requirement;
CREATE POLICY "Enable all for work_order_safety_requirement" ON work_order_safety_requirement
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policy for work_order_component_status
DROP POLICY IF EXISTS "Enable all for work_order_component_status" ON work_order_component_status;
CREATE POLICY "Enable all for work_order_component_status" ON work_order_component_status
    FOR ALL
    USING (true)
    WITH CHECK (true);
