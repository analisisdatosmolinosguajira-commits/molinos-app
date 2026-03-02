-- Fix RLS for project_goal table
-- Run this in Supabase SQL Editor

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow all for authenticated" ON project_goal;

-- Grant table permissions
GRANT ALL ON project_goal TO authenticated;
GRANT ALL ON project_goal TO anon;
GRANT USAGE, SELECT ON SEQUENCE project_goal_goal_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE project_goal_goal_id_seq TO anon;

-- Create permissive policies
CREATE POLICY "Allow all for authenticated" ON project_goal 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON project_goal 
  FOR ALL TO anon USING (true) WITH CHECK (true);
