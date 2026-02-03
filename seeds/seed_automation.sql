-- TRANSACTIONAL AUTOMATION: Register Person & Community Member
-- Requirement:
-- 1. Ensure 'Miembro de Comunidad' exists in `person_role`.
-- 2. Create logic (Function) to transactionally register Person + Community Member.
-- 3. Seed 5 people using this logic.

-- A. PRE-REQUISITE: Ensure tables exist as per requirement
-- Confirming person_role
CREATE TABLE IF NOT EXISTS public.person_role (
    role_id integer generated always as identity not null,
    name character varying not null,
    description text null,
    constraint person_role_pkey primary key (role_id),
    constraint person_role_name_key unique (name)
);

-- Confirming community_role (assuming it exists, but ensuring columns)
-- (User provided schema says `role_id` is PK for community_role too)
-- If it doesn't exist, we rely on previous scripts, but let's ensure we can work with it.

-- B. AUTOMATION FUNCTION
CREATE OR REPLACE FUNCTION public.register_community_member_transaction(
    p_first_name TEXT,
    p_last_name TEXT,
    p_doc_id TEXT,
    p_phone TEXT,
    p_community_id INT,
    p_internal_role_id INT
)
RETURNS VOID AS $$
DECLARE
    v_global_role_id INT;
    v_person_id INT;
BEGIN
    -- 1. Get Global Role ID for 'Miembro de Comunidad'
    SELECT role_id INTO v_global_role_id FROM person_role WHERE name = 'Miembro de Comunidad';
    
    -- Auto-create global role if missing (Self-healing)
    IF v_global_role_id IS NULL THEN
        INSERT INTO person_role (name, description) 
        VALUES ('Miembro de Comunidad', 'Rol global para miembros asignados a comunidades')
        RETURNING role_id INTO v_global_role_id;
    END IF;
    
    -- 2. Insert/Update Person
    -- We use the GLOBAL role_id here
    INSERT INTO person (first_name, last_name, document_id, phone, role_id, role, active)
    VALUES (
        p_first_name, 
        p_last_name, 
        p_doc_id, 
        p_phone, 
        v_global_role_id, 
        'Miembro de Comunidad', -- Keep text sync
        true
    )
    ON CONFLICT (document_id) DO UPDATE SET 
        role_id = v_global_role_id,
        role = 'Miembro de Comunidad'
    RETURNING person_id INTO v_person_id;
    
    -- 3. Insert/Update Community Member
    -- Using the specific Internal Role ID passed as argument
    INSERT INTO community_member (community_id, person_id, role_id, status, joined_at)
    VALUES (p_community_id, v_person_id, p_internal_role_id, 'ACTIVE', CURRENT_DATE)
    ON CONFLICT (community_id, person_id) DO UPDATE SET role_id = p_internal_role_id;
    
    -- Debug Notice
    RAISE NOTICE 'Registered % % (Doc: %) as Member of Community %', p_first_name, p_last_name, p_doc_id, p_community_id;
END;
$$ LANGUAGE plpgsql;


-- C. SEED DATA EXECUTION
DO $$
DECLARE
    v_community_id INT;
    v_member_role_id INT;
BEGIN
    -- 1. Context
    SELECT community_id INTO v_community_id FROM community ORDER BY name LIMIT 1;
    
    -- Note: We need the ROLE_ID column from community_role. 
    -- If the table uses 'id' instead of 'role_id', this query needs adjustment.
    -- Based on user's schema provided: "references community_role (role_id)"
    SELECT role_id INTO v_member_role_id FROM community_role WHERE name = 'Miembro' LIMIT 1;
    
    IF v_member_role_id IS NULL THEN
        -- Fallback if not found, assume we might need to create it using 'id' or 'role_id' depending on reality
        -- But let's assume valid ID
        RAISE NOTICE 'Role "Miembro" not found in community_role, skipping seed.';
        RETURN;
    END IF;

    -- 2. Call the Automation Function for 5 Users
    PERFORM public.register_community_member_transaction('Roberto', 'Gomez', 'V-20001', '0414-0000001', v_community_id, v_member_role_id);
    PERFORM public.register_community_member_transaction('Elena', 'Díaz', 'V-20002', '0414-0000002', v_community_id, v_member_role_id);
    PERFORM public.register_community_member_transaction('Javier', 'Ruiz', 'V-20003', '0414-0000003', v_community_id, v_member_role_id);
    PERFORM public.register_community_member_transaction('Sofia', 'Mendez', 'V-20004', '0414-0000004', v_community_id, v_member_role_id);
    PERFORM public.register_community_member_transaction('Miguel', 'Torres', 'V-20005', '0414-0000005', v_community_id, v_member_role_id);

END $$;
