-- Seed Data for Concertation Demo

DO $$
DECLARE
    new_community_id INT;
    new_mill_id INT;
    person_juan_id INT;
    person_maria_id INT;
    person_pedro_id INT;
    member_juan_id INT;
    member_maria_id INT;
    member_pedro_id INT;
    social_person_id INT;
    tech_person_id INT;
    new_concertation_id INT;
BEGIN
    -- 1. Create Community
    INSERT INTO community (name, municipality, department, location_description)
    VALUES ('Comunidad El Porvenir', 'Riohacha', 'La Guajira', 'Sector Rural Km 15')
    RETURNING community_id INTO new_community_id;

    -- 2. Create Mill
    INSERT INTO mill (code, name, status, location_latitude, location_longitude, deployment_date)
    VALUES ('MIL-DEMO-01', 'Molino El Porvenir', 'active', 11.54, -72.90, NOW())
    RETURNING mill_id INTO new_mill_id;

    -- Link Mill to Community
    INSERT INTO mill_community (mill_id, community_id, relationship_type, assigned_date)
    VALUES (new_mill_id, new_community_id, 'primary', NOW());

    -- 3. Create Persons for Community Members
    INSERT INTO person (first_name, last_name, document_id, phone, role_id)
    VALUES ('Juan', 'Perez', '12345678', '3001234567', 5) -- 5 is Generic Member Role
    RETURNING person_id INTO person_juan_id;

    INSERT INTO person (first_name, last_name, document_id, phone, role_id)
    VALUES ('Maria', 'Gomez', '87654321', '3009876543', 5)
    RETURNING person_id INTO person_maria_id;

    INSERT INTO person (first_name, last_name, document_id, phone, role_id)
    VALUES ('Pedro', 'Rodriguez', '11223344', '3105556677', 5)
    RETURNING person_id INTO person_pedro_id;

    -- 4. Create Community Members (Assign Community Roles)
    -- Role IDs: 3 (Presidente), 6 (Secretario), 1 (Líder/Tecnico? No wait, 1 in community_role is 'Líder')
    -- community_role: 1=Líder, 3=Presidente, 6=Secretario
    INSERT INTO community_member (community_id, person_id, role_id, status)
    VALUES (new_community_id, person_juan_id, 3, 'ACTIVE') -- Presidente
    RETURNING id INTO member_juan_id;

    INSERT INTO community_member (community_id, person_id, role_id, status)
    VALUES (new_community_id, person_maria_id, 6, 'ACTIVE') -- Secretario
    RETURNING id INTO member_maria_id;

    INSERT INTO community_member (community_id, person_id, role_id, status)
    VALUES (new_community_id, person_pedro_id, 1, 'ACTIVE') -- Líder
    RETURNING id INTO member_pedro_id;

    -- 5. Get or Create Operational Staff
    -- Try to find existing Social worker, else create
    SELECT person_id INTO social_person_id FROM person WHERE role_id = 9 LIMIT 1;
    IF social_person_id IS NULL THEN
        INSERT INTO person (first_name, last_name, document_id, role_id)
        VALUES ('Ana', 'Lopez', 'SOC-001', 9)
        RETURNING person_id INTO social_person_id;
    END IF;

    -- Try to find existing Tech, else create
    SELECT person_id INTO tech_person_id FROM person WHERE role_id = 1 LIMIT 1; -- 1 is Tecnico in person_role
    IF tech_person_id IS NULL THEN
        INSERT INTO person (first_name, last_name, document_id, role_id)
        VALUES ('Carlos', 'Tecnico', 'TEC-001', 1)
        RETURNING person_id INTO tech_person_id;
    END IF;

    -- 6. Create Concertation
    INSERT INTO community_concertation (community_id, meeting_date, status, notes, conditions, decision)
    VALUES (new_community_id, NOW(), 'pendiente', 'Reunión inicial de concertación para mantenimiento del molino.', 'La comunidad se compromete a limpiar el área.', 'pending')
    RETURNING concertation_id INTO new_concertation_id;

    -- 7. Add Participants
    -- Community Members
    INSERT INTO concertation_community_member (concertation_id, community_member_id) VALUES (new_concertation_id, member_juan_id);
    INSERT INTO concertation_community_member (concertation_id, community_member_id) VALUES (new_concertation_id, member_maria_id);
    
    -- Personnel
    INSERT INTO concertation_person (concertation_id, person_id) VALUES (new_concertation_id, social_person_id);
    INSERT INTO concertation_person (concertation_id, person_id) VALUES (new_concertation_id, tech_person_id);

END $$;
