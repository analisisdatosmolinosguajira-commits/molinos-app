-- TRANSACTIONAL SEED: Create People and Automatically Link to Community
-- This script performs the "logic" of ensuring a person with role 'Miembro de Comunidad' 
-- is correctly registered in 'community_member' with valid Foreign Keys.

DO $$
DECLARE
    v_community_id INT;
    v_role_member_id INT;
    v_person_id INT;
    v_persons RECORD;
BEGIN
    -- 1. GET CONTEXT: Find a valid Community and the 'Miembro' role ID
    SELECT community_id INTO v_community_id FROM community ORDER BY name LIMIT 1;
    SELECT role_id INTO v_role_member_id FROM community_role WHERE name = 'Miembro' LIMIT 1;

    -- Validate we have necessary FK targets
    IF v_community_id IS NULL THEN
        RAISE EXCEPTION 'No community found to assign members to.';
    END IF;
    IF v_role_member_id IS NULL THEN
        -- Create the role if it doesn't exist
        INSERT INTO community_role (name, description) VALUES ('Miembro', 'Participante regular') RETURNING role_id INTO v_role_member_id;
    END IF;

    -- 2. DEFINE DATA: List of people to insert
    -- Using a temporary table or cursor logic for the batch
    FOR v_persons IN 
        SELECT * FROM (VALUES 
            ('Roberto', 'Gomez', 'V-20001', '0414-0000001'),
            ('Elena', 'Díaz', 'V-20002', '0414-0000002'),
            ('Javier', 'Ruiz', 'V-20003', '0414-0000003'),
            ('Sofia', 'Mendez', 'V-20004', '0414-0000004'),
            ('Miguel', 'Torres', 'V-20005', '0414-0000005')
        ) AS t(first_name, last_name, document_id, phone)
    LOOP
        -- 3. LOGIC STEP A: Insert Person with Global Role tag
        INSERT INTO person (first_name, last_name, document_id, phone, role, active)
        VALUES (v_persons.first_name, v_persons.last_name, v_persons.document_id, v_persons.phone, 'Miembro de Comunidad', true)
        ON CONFLICT (document_id) DO UPDATE 
        SET role = 'Miembro de Comunidad' -- Ensure tag is updated if exists
        RETURNING person_id INTO v_person_id;

        -- 4. LOGIC STEP B: Automatically Register in Community Member Table
        -- This ensures the FK relationship is established
        INSERT INTO community_member (community_id, person_id, role_id, status, joined_at)
        VALUES (v_community_id, v_person_id, v_role_member_id, 'ACTIVE', NOW())
        ON CONFLICT (community_id, person_id) DO UPDATE
        SET role_id = v_role_member_id; -- Ensure they are set as Members
        
    END LOOP;

    RAISE NOTICE 'Se han insertado 5 personas y vinculado automáticamente a la comunidad ID %', v_community_id;
END $$;
