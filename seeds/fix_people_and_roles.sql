-- 1. FIX PERMISSIONS (RLS)
-- Ensure we can write to these tables
ALTER TABLE person ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_role ENABLE ROW LEVEL SECURITY;

-- Drop restrictive policies to be safe (re-create them permissive)
DROP POLICY IF EXISTS "Enable all for person" ON person;
DROP POLICY IF EXISTS "Enable all for community_member" ON community_member;
DROP POLICY IF EXISTS "Enable all for community_role" ON community_role;

-- Create Permissive Policies (Dev Mode)
CREATE POLICY "Enable all for person" ON person FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for community_member" ON community_member FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for community_role" ON community_role FOR ALL USING (true) WITH CHECK (true);


-- 2. ENSURE ROLES EXIST
-- Insert standard community roles
INSERT INTO public.community_role (name, description) VALUES
('Presidente', 'Cabeza de la comunidad'),
('Líder', 'Líder comunitario'),
('Miembro', 'Miembro regular'),
('Tesorero', 'Encargado de finanzas'),
('Secretario', 'Encargado de actas'),
('Operador', 'Operador de maquinaria local'),
('Contacto Principal', 'Punto de contacto')
ON CONFLICT (name) DO NOTHING;


-- 3. SEED PEOPLE (With Global Role 'Miembro de Comunidad')
-- This creates the people in the global registry
INSERT INTO public.person (first_name, last_name, document_id, role, phone, active) VALUES 
('Carlos', 'Rodriguez', 'V-10001', 'Miembro de Comunidad', '0414-1111111', true),
('Maria', 'Gonzalez', 'V-10002', 'Miembro de Comunidad', '0414-2222222', true),
('Pedro', 'Perez', 'V-10003', 'Miembro de Comunidad', '0414-3333333', true),
('Ana', 'Lopez', 'V-10004', 'Miembro de Comunidad', '0414-4444444', true),
('Luis', 'Martinez', 'V-10005', 'Miembro de Comunidad', '0414-5555555', true)
ON CONFLICT (document_id) 
DO UPDATE SET role = 'Miembro de Comunidad'; -- Ensure they get the tag if they existed


-- 4. LINK PEOPLE TO COMMUNITIES (Optional - for testing "Assignment")
-- We need valid Community IDs and Role IDs to do this.
-- This block attempts to link the seeded people to the FIRST community found in DB.

DO $$
DECLARE
    target_community_id INT;
    role_lider_id INT;
    role_miembro_id INT;
    person_id_1 INT;
    person_id_2 INT;
BEGIN
    -- Get IDs
    SELECT community_id INTO target_community_id FROM community LIMIT 1;
    SELECT role_id INTO role_lider_id FROM community_role WHERE name = 'Líder' LIMIT 1;
    SELECT role_id INTO role_miembro_id FROM community_role WHERE name = 'Miembro' LIMIT 1;
    
    SELECT person_id INTO person_id_1 FROM person WHERE document_id = 'V-10001';
    SELECT person_id INTO person_id_2 FROM person WHERE document_id = 'V-10002';

    -- Only proceed if we have valid references
    IF target_community_id IS NOT NULL AND role_lider_id IS NOT NULL THEN
        
        -- Assign person 1 as Leader
        INSERT INTO community_member (community_id, person_id, role_id, status)
        VALUES (target_community_id, person_id_1, role_lider_id, 'ACTIVE')
        ON CONFLICT DO NOTHING;
        
        -- Assign person 2 as Member
        INSERT INTO community_member (community_id, person_id, role_id, status)
        VALUES (target_community_id, person_id_2, role_miembro_id, 'ACTIVE')
        ON CONFLICT DO NOTHING;
        
    END IF;
END $$;
