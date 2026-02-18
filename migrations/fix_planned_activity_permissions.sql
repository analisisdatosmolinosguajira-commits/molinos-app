-- Migration: Fix planned_activity permissions and add missing column
-- Description: Add additional_resources_notes column and enable RLS for anonymous access

-- 1. Add missing column
ALTER TABLE planned_activity 
ADD COLUMN IF NOT EXISTS additional_resources_notes TEXT;

-- 2. Enable RLS on all planning tables
ALTER TABLE planned_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_crew_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comment ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "planned_activity_anon_select" ON planned_activity;
DROP POLICY IF EXISTS "planned_activity_anon_insert" ON planned_activity;
DROP POLICY IF EXISTS "planned_activity_anon_update" ON planned_activity;
DROP POLICY IF EXISTS "planned_activity_anon_delete" ON planned_activity;

DROP POLICY IF EXISTS "activity_type_anon_select" ON activity_type;
DROP POLICY IF EXISTS "weekly_crew_assignment_anon_all" ON weekly_crew_assignment;
DROP POLICY IF EXISTS "activity_comment_anon_all" ON activity_comment;

-- 4. Create RLS policies for planned_activity (full access for anon until auth is implemented)
CREATE POLICY "planned_activity_anon_select"
    ON planned_activity FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "planned_activity_anon_insert"
    ON planned_activity FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "planned_activity_anon_update"
    ON planned_activity FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "planned_activity_anon_delete"
    ON planned_activity FOR DELETE
    TO anon
    USING (true);

-- 5. Create RLS policies for activity_type (read-only for anon)
CREATE POLICY "activity_type_anon_select"
    ON activity_type FOR SELECT
    TO anon
    USING (true);

-- 6. Create RLS policies for weekly_crew_assignment (full access for anon)
CREATE POLICY "weekly_crew_assignment_anon_all"
    ON weekly_crew_assignment FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- 7. Create RLS policies for activity_comment (full access for anon)
CREATE POLICY "activity_comment_anon_all"
    ON activity_comment FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- 8. Grant necessary permissions to anon role
GRANT SELECT, INSERT, UPDATE, DELETE ON planned_activity TO anon;
GRANT SELECT ON activity_type TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON weekly_crew_assignment TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON activity_comment TO anon;

-- 9. Ensure sequence permissions (for auto-increment IDs)
GRANT USAGE, SELECT ON SEQUENCE planned_activity_activity_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE weekly_crew_assignment_assignment_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE activity_comment_comment_id_seq TO anon;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully:';
    RAISE NOTICE '- Added additional_resources_notes column';
    RAISE NOTICE '- Enabled RLS on planning tables';
    RAISE NOTICE '- Created anon access policies';
    RAISE NOTICE '- Granted necessary permissions';
END $$;
