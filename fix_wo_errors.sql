-- 1. Fix Trigger Function Permissions
ALTER FUNCTION manage_wo_requirements() SECURITY DEFINER;
-- Grant execute just in case
GRANT EXECUTE ON FUNCTION manage_wo_requirements() TO authenticated, anon, service_role;

-- 2. Ensure RLS Policies on Resource Tables (Idempotent)
ALTER TABLE work_order_piece ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_tool_reservation ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_safety_requirement ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_component_status ENABLE ROW LEVEL SECURITY;

-- Re-apply policies to be safe
DROP POLICY IF EXISTS "Enable all for work_order_piece" ON work_order_piece;
CREATE POLICY "Enable all for work_order_piece" ON work_order_piece FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for work_order_tool_reservation" ON work_order_tool_reservation;
CREATE POLICY "Enable all for work_order_tool_reservation" ON work_order_tool_reservation FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for work_order_material" ON work_order_material;
CREATE POLICY "Enable all for work_order_material" ON work_order_material FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for work_order_safety_requirement" ON work_order_safety_requirement;
CREATE POLICY "Enable all for work_order_safety_requirement" ON work_order_safety_requirement FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for work_order_component_status" ON work_order_component_status;
CREATE POLICY "Enable all for work_order_component_status" ON work_order_component_status FOR ALL USING (true) WITH CHECK (true);

-- 3. Grant Table Permissions
GRANT ALL ON work_order_piece TO authenticated, anon, service_role;
GRANT ALL ON work_order_tool_reservation TO authenticated, anon, service_role;
GRANT ALL ON work_order_material TO authenticated, anon, service_role;
GRANT ALL ON work_order_safety_requirement TO authenticated, anon, service_role;
GRANT ALL ON work_order_component_status TO authenticated, anon, service_role;

-- 4. Reload Schema Cache (PostgREST)
NOTIFY pgrst, 'reload config';
