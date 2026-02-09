-- UPDATE_COMMUNITY_SCHEMA.sql
-- Add municipality and department to community table if they don't exist

ALTER TABLE public.community ADD COLUMN IF NOT EXISTS municipality text;
ALTER TABLE public.community ADD COLUMN IF NOT EXISTS department text;

-- Ensure RLS allows update/delete for authenticated users (was already handled in FIX_COMMUNITIES, but double checking permissive policy)
-- The policy "Enable all access for authenticated users" ON public.community FOR ALL USING (auth.role() = 'authenticated') covers this.
