
-- Script Robusto con Manejo de Conflictos
-- Utiliza bloques anónimos PL/pgSQL para intentar inserciones y reportar progreso.
-- Si encuentra duplicados (Conflictos), los ignora (DO NOTHING) y continua con el siguiente paso.

DO $$
DECLARE
    rows_inserted INT;
BEGIN
    RAISE NOTICE 'Inicio del proceso de carga complementaria...';

    -- 1. COMMUNITIES
    -- ----------------------------------------------------------------
    INSERT INTO movement_community (movement_id, community_id)
    SELECT m.movement_id, c.community_id
    FROM movement m, community c
    WHERE m.objective = 'inspeccion'
      AND (m.vehicle_info IS DISTINCT FROM 'Nissan Frontier - Placa CMD-123')
      AND c.name = 'Comunidad El Viento'
    ON CONFLICT DO NOTHING;
    
    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    RAISE NOTICE 'Movement_Community (Inspeccion): Insertadas % filas (Duplicados ignorados).', rows_inserted;


    INSERT INTO movement_community (movement_id, community_id)
    SELECT m.movement_id, c.community_id
    FROM movement m, community c
    WHERE m.objective IN ('diagnostico', 'mixto')
      AND (m.vehicle_info IS DISTINCT FROM 'Nissan Frontier - Placa CMD-123')
      AND c.name = 'Comunidad San Jose'
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    RAISE NOTICE 'Movement_Community (Diagnostico): Insertadas % filas (Duplicados ignorados).', rows_inserted;


    INSERT INTO movement_community (movement_id, community_id)
    SELECT m.movement_id, c.community_id
    FROM movement m, community c
    WHERE m.objective = 'concertacion'
      AND (m.vehicle_info IS DISTINCT FROM 'Nissan Frontier - Placa CMD-123')
      AND c.name = 'Comunidad La Guajira Central'
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    RAISE NOTICE 'Movement_Community (Concertacion): Insertadas % filas (Duplicados ignorados).', rows_inserted;


    -- 2. PERSONNEL
    -- ----------------------------------------------------------------
    INSERT INTO movement_person (movement_id, person_id, role)
    SELECT m.movement_id, p.person_id, 'Conductor'
    FROM movement m, person p
    WHERE (m.vehicle_info IS DISTINCT FROM 'Nissan Frontier - Placa CMD-123')
      AND p.first_name = 'Luis'
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    RAISE NOTICE 'Movement_Person (Conductores): Insertadas % filas (Duplicados ignorados).', rows_inserted;


    INSERT INTO movement_person (movement_id, person_id, crew_id, role)
    SELECT m.movement_id, p.person_id, cr.crew_id, 'Técnico de Campo'
    FROM movement m, person p, crew cr
    WHERE m.objective = 'diagnostico'
      AND (m.vehicle_info IS DISTINCT FROM 'Nissan Frontier - Placa CMD-123')
      AND p.first_name = 'Maria'
      AND cr.name = 'Cuadrilla Alpha'
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    RAISE NOTICE 'Movement_Person (Tecnicos): Insertadas % filas (Duplicados ignorados).', rows_inserted;


    INSERT INTO movement_person (movement_id, person_id, role)
    SELECT m.movement_id, p.person_id, 'Gestor Social'
    FROM movement m, person p
    WHERE m.objective = 'concertacion'
      AND (m.vehicle_info IS DISTINCT FROM 'Nissan Frontier - Placa CMD-123')
      AND p.first_name = 'Juan'
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    RAISE NOTICE 'Movement_Person (Social): Insertadas % filas (Duplicados ignorados).', rows_inserted;


    -- 3. WORK ORDERS
    -- ----------------------------------------------------------------
    INSERT INTO movement_work_order (movement_id, work_order_id)
    SELECT m.movement_id, w.work_order_id
    FROM movement m, work_order w
    WHERE m.objective = 'inspeccion'
      AND (m.vehicle_info IS DISTINCT FROM 'Nissan Frontier - Placa CMD-123')
      AND w.status = 'PENDING'
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    RAISE NOTICE 'Movement_Work_Order: Insertadas % filas (Duplicados ignorados).', rows_inserted;


    -- 4. DIAGNOSES
    -- ----------------------------------------------------------------
    INSERT INTO movement_diagnosis (movement_id, diagnosis_id)
    SELECT m.movement_id, d.diagnosis_id
    FROM movement m, diagnosis_visit d
    WHERE m.objective = 'diagnostico'
      AND (m.vehicle_info IS DISTINCT FROM 'Nissan Frontier - Placa CMD-123')
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    RAISE NOTICE 'Movement_Diagnosis: Insertadas % filas (Duplicados ignorados).', rows_inserted;


    -- 5. GPS POINTS (No tienen constraint unique estricta usualmente, pero usaremos distinct select)
    -- ----------------------------------------------------------------
    INSERT INTO movement_gps_point (movement_id, latitude, longitude, recorded_at)
    SELECT m.movement_id, 11.2000, -72.5000, COALESCE(m.start_date, NOW())
    FROM movement m
    WHERE (m.vehicle_info IS DISTINCT FROM 'Nissan Frontier - Placa CMD-123')
      AND NOT EXISTS (SELECT 1 FROM movement_gps_point mg WHERE mg.movement_id = m.movement_id);

    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    RAISE NOTICE 'Movement_GPS_Point: Insertadas % filas.', rows_inserted;

    RAISE NOTICE 'Proceso completado exitosamente.';
END $$;
