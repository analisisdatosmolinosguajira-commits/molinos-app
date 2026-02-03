-- Populate 'Nissan Frontier' movement specifically
-- This movement was excluded from previous bulk scripts, so it lacks details.

DO $$
DECLARE
    target_mov_id INT;
BEGIN
    -- Identificar el movimiento
    SELECT movement_id INTO target_mov_id
    FROM movement 
    WHERE vehicle_info LIKE '%Nissan Frontier%' 
    LIMIT 1;

    IF target_mov_id IS NOT NULL THEN
        RAISE NOTICE 'Poblando movimiento ID: %', target_mov_id;

        -- 1. Communities
        INSERT INTO movement_community (movement_id, community_id)
        SELECT target_mov_id, c.community_id
        FROM community c
        WHERE c.name IN ('Comunidad El Viento', 'Comunidad San Jose')
        ON CONFLICT DO NOTHING;

        -- 2. Personnel
        -- Conductor
        INSERT INTO movement_person (movement_id, person_id, role)
        SELECT target_mov_id, p.person_id, 'Conductor'
        FROM person p
        WHERE p.first_name = 'Luis'
        ON CONFLICT DO NOTHING;

        -- Tecnico
        INSERT INTO movement_person (movement_id, person_id, crew_id, role)
        SELECT target_mov_id, p.person_id, cr.crew_id, 'Técnico de Campo'
        FROM person p, crew cr
        WHERE p.first_name = 'Maria' AND cr.name = 'Cuadrilla Alpha'
        ON CONFLICT DO NOTHING;

        -- 3. Work Orders
        INSERT INTO movement_work_order (movement_id, work_order_id)
        SELECT target_mov_id, w.work_order_id
        FROM work_order w
        WHERE w.status = 'PENDING'
        LIMIT 2
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Datos complementarios agregados exitosamente.';
    ELSE
        RAISE NOTICE 'No se encontro el movimiento Nissan Frontier.';
    END IF;
END $$;
