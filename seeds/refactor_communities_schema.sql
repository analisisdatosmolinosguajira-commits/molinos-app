-- Migration: Refactor Communities and Link Mills

-- 1. Create community_role table (Normalization)
CREATE TABLE IF NOT EXISTS public.community_role (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

-- Seed Roles
INSERT INTO public.community_role (name) VALUES 
('Presidente'), ('Lider'), ('Miembro'), ('Secretario'), ('Tesorero'), ('Operador'), ('Contacto Principal')
ON CONFLICT (name) DO NOTHING;

-- 2. Create community_member table
-- Links people to communities with specific roles (FK)
CREATE TABLE IF NOT EXISTS public.community_member (
    id SERIAL PRIMARY KEY,
    community_id INTEGER NOT NULL REFERENCES public.community(community_id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES public.person(person_id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES public.community_role(id),
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    joined_at DATE DEFAULT CURRENT_DATE,
    CONSTRAINT unique_community_member UNIQUE(community_id, person_id)
);

-- 2. Modify Mill table to link with Community
-- Add the foreign key column
ALTER TABLE public.mill ADD COLUMN IF NOT EXISTS community_id INTEGER REFERENCES public.community(community_id);

-- 3. Data Migration: Link Mills to Communities based on name match
-- Tries to match existing text 'community_name' to 'community.name'
UPDATE public.mill m
SET community_id = c.community_id
FROM public.community c
WHERE m.community_name IS NOT NULL 
AND (
    LOWER(TRIM(m.community_name)) = LOWER(TRIM(c.name))
    OR 
    -- Handled some known variations if necessary, simplistic for now
    m.community_name ILIKE '%' || c.name || '%'
);

-- 4. Audit Unlinked Mills
DO $$
DECLARE
    unlinked_count INT;
BEGIN
    SELECT COUNT(*) INTO unlinked_count FROM public.mill WHERE community_id IS NULL AND community_name IS NOT NULL;
    
    IF unlinked_count > 0 THEN
        RAISE NOTICE 'WARNING: % mills could not be linked to a community automatically. Please check table "mill" for NULL community_id.', unlinked_count;
    ELSE
        RAISE NOTICE 'SUCCESS: All mills linked to communities successfully.';
    END IF;
END $$;

-- NOTE: We are NOT dropping 'community_name' yet to prevent breaking the current UI until the code is updated.
-- ALTER TABLE public.mill DROP COLUMN community_name;
