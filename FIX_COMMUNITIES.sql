-- FIX_COMMUNITIES.sql
-- Purpose: Ensure Communities and People module tables exist and are accessible.

-- 1. Community Roles (Internal Roles)
CREATE TABLE IF NOT EXISTS public.community_role (
    role_id integer GENERATED ALWAYS AS IDENTITY NOT NULL PRIMARY KEY,
    name character varying UNIQUE NOT NULL,
    description text
);

-- Seed Community Roles
INSERT INTO public.community_role (name) VALUES 
('Presidente'), ('Lider'), ('Miembro'), ('Secretario'), ('Tesorero'), ('Operador'), ('Contacto Principal')
ON CONFLICT (name) DO NOTHING;

-- 2. Person Roles (Global Roles)
CREATE TABLE IF NOT EXISTS public.person_role (
    role_id integer GENERATED ALWAYS AS IDENTITY NOT NULL PRIMARY KEY,
    name character varying NOT NULL UNIQUE,
    description text
);

-- Seed Person Roles
INSERT INTO public.person_role (name) VALUES 
('Comunidad'), ('Tecnico'), ('Administrador'), ('Gestor Social')
ON CONFLICT (name) DO NOTHING;

-- 3. Person Table
CREATE TABLE IF NOT EXISTS public.person (
  person_id integer GENERATED ALWAYS AS IDENTITY NOT NULL PRIMARY KEY,
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  document_id character varying NOT NULL UNIQUE,
  specialty character varying,
  phone character varying,
  email character varying,
  active boolean DEFAULT true,
  role_id integer REFERENCES public.person_role(role_id)
);

-- 4. Community Table (Should already exist but ensuring)
CREATE TABLE IF NOT EXISTS public.community (
  community_id integer GENERATED ALWAYS AS IDENTITY NOT NULL PRIMARY KEY,
  name character varying UNIQUE,
  location_description character varying,
  latitude numeric,
  longitude numeric,
  notes text
);

-- 5. Community Member (Relationship)
CREATE TABLE IF NOT EXISTS public.community_member (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL PRIMARY KEY,
  community_id integer NOT NULL REFERENCES public.community(community_id) ON DELETE CASCADE,
  person_id integer NOT NULL REFERENCES public.person(person_id) ON DELETE CASCADE,
  role_id integer REFERENCES public.community_role(role_id),
  status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  joined_at date DEFAULT CURRENT_DATE,
  CONSTRAINT unique_community_member UNIQUE(community_id, person_id)
);

-- 6. RLS Policies (Permissive for Debugging/MVP)

-- Enable RLS
ALTER TABLE public.community ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_role ENABLE ROW LEVEL SECURITY;

-- Drop existing to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.community;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.community;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.community;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.community;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.person;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.person;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.person;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.person;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.community_member;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.community_member;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.community_member;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.community_member;

-- Create Permissive Policies
CREATE POLICY "Enable all access for authenticated users" ON public.community FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON public.person FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON public.community_member FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON public.community_role FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON public.person_role FOR ALL USING (auth.role() = 'authenticated');

-- Also allow Anon for development if needed (Optionally)
-- CREATE POLICY "Enable read access for anon" ON public.community FOR SELECT USING (true);

-- 7. Fix/Backfill 'Miembro de Comunidad' Role
-- Ensure there is a 'Comunidad' role in person_role and assign it to generic people if null
DO $$
DECLARE
    comm_role_id INT;
BEGIN
    SELECT role_id INTO comm_role_id FROM public.person_role WHERE name = 'Comunidad';
    
    -- Update people with null role to 'Comunidad' (safe default)
    UPDATE public.person SET role_id = comm_role_id WHERE role_id IS NULL;
END $$;
