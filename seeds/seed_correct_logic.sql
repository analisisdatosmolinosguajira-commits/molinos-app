-- TRANSACTIONAL SEED: Strict Person Role Logic
-- Requirement: 
-- 1. 'Miembro de Comunidad' must start in `person_role` table.
-- 2. Person must be inserted with `role_id` pointing to that `person_role`.
-- 3. Then link to Community Context via `community_member` (using `community_role`).

DO $$
DECLARE
    -- IDs for Relationships
    v_community_id INT;
    v_global_role_id INT; -- For person_role
    v_community_role_id INT; -- For community_role (contextual)
    v_person_id INT;

    -- Iteration variable
    v_person_record RECORD;
BEGIN
    ---------------------------------------------------------------------------
    -- 1. SETUP CONTEXT
    ---------------------------------------------------------------------------
    
    -- A. Get Global Role ID from PERSON_ROLE (Create if missing)
    SELECT role_id INTO v_global_role_id FROM person_role WHERE name = 'Miembro de Comunidad';
    
    IF v_global_role_id IS NULL THEN
        INSERT INTO person_role (name, description) 
        VALUES ('Miembro de Comunidad', 'Rol global para personas que pertenecen a una comunidad')
        RETURNING role_id INTO v_global_role_id;
    END IF;

    -- B. Get Community ID
    SELECT community_id INTO v_community_id FROM community ORDER BY name LIMIT 1;
    IF v_community_id IS NULL THEN RAISE EXCEPTION 'No community found.'; END IF;

    -- C. Get Community Context Role ID (e.g. 'Miembro' internal role)
    SELECT id INTO v_community_role_id FROM community_role WHERE name = 'Miembro' LIMIT 1;
    IF v_community_role_id IS NULL THEN
        INSERT INTO community_role (name, description) VALUES ('Miembro', 'Participante regular')
        RETURNING id INTO v_community_role_id;
    END IF;

    ---------------------------------------------------------------------------
    -- 2. INSERT PEOPLE LOOP
    ---------------------------------------------------------------------------
    FOR v_person_record IN 
        SELECT * FROM (VALUES 
            ('Roberto', 'Gomez', 'V-20001', '0414-0000001'),
            ('Elena', 'Díaz', 'V-20002', '0414-0000002'),
            ('Javier', 'Ruiz', 'V-20003', '0414-0000003'),
            ('Sofia', 'Mendez', 'V-20004', '0414-0000004'),
            ('Miguel', 'Torres', 'V-20005', '0414-0000005')
        ) AS t(first_name, last_name, document_id, phone)
    LOOP
        -- A. Insert into PERSON table using ROLE_ID (Global)
        -- We try to set both role text (legacy/display) and role_id (strict FK)
        INSERT INTO person (first_name, last_name, document_id, phone, role_id, role, active)
        VALUES (
            v_person_record.first_name, 
            v_person_record.last_name, 
            v_person_record.document_id, 
            v_person_record.phone, 
            v_global_role_id,         -- Strictly linking to person_role
            'Miembro de Comunidad',   -- Keeping text sync for now
            true
        )
        ON CONFLICT (document_id) 
        DO UPDATE SET 
            role_id = v_global_role_id,
            role = 'Miembro de Comunidad'
        RETURNING person_id INTO v_person_id;

        -- B. Insert into COMMUNITY_MEMBER table
        INSERT INTO community_member (community_id, person_id, role_id, status, joined_at)
        VALUES (
            v_community_id, 
            v_person_id, 
            v_community_role_id, 
            'ACTIVE', 
            CURRENT_DATE
        )
        ON CONFLICT (community_id, person_id) 
        DO UPDATE SET role_id = v_community_role_id;

    END LOOP;

    RAISE NOTICE 'SUCCESS: 5 members created with PersonRole ID % and CommunityRole ID %', v_global_role_id, v_community_role_id;
END $$;
