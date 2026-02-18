-- Enable RLS on crew table (if not already enabled)
ALTER TABLE crew ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON crew;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON crew;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON crew;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON crew;

-- Create comprehensive policies
-- For this application context, we'll allow authenticated users full access
CREATE POLICY "Enable read access for all users" ON crew
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON crew
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON crew
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON crew
    FOR DELETE USING (auth.role() = 'authenticated');
