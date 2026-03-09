-- ==============================================================================
-- SCRIPT DE MIGRACIÓN EXCEL 2026
-- Generado automáticamente. Inserta Comunidades, Molinos, Personas, Concertaciones y Diagnósticos
-- ==============================================================================

BEGIN;

-- Variables temporales para IDs
DO $$
DECLARE
    v_community_id INT;
    v_person_id INT;
    v_mill_id INT;
    v_role_id INT;
BEGIN

    -- Obtener el ID del rol de Autoridad
    SELECT role_id INTO v_role_id FROM public.community_role WHERE name ILIKE '%Autoridad%' OR name ILIKE '%Lider%' LIMIT 1;
    IF v_role_id IS NULL THEN
        INSERT INTO public.community_role (name, description) VALUES ('Autoridad Tradicional', 'Autoridad principal de la comunidad') RETURNING role_id INTO v_role_id;
    END IF;

    -- COMUNIDAD: Cousepa
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Cousepa', 'Manaure', 'KM 10 M - Derecho', 11.599924, -72.832853, 60, 115, 44, 'Si', 'Pastoreo artesania', 3, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Cousepa
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Fernando' AND last_name ILIKE 'Sin Apellido' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Fernando', 'Sin Apellido', 'CC-9722553', '3228847453', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3228847453') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Cousepa
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Cousepa', v_community_id, 'OPERATIONAL', 11.599924, -72.832853)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.599924, longitude = -72.832853 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Concertacion realizada 26/02/2026 - German Colina --- Observacion: Le hacen falta 4 escaleras 1 en cada piso, le hace falta un perno al pedestal, se necesitan un par de ganchos para centrador, Porta fusible sin fusible - Autoridad quisiera en lo posible que se le instalara un fusible ( Seria pequeño, menos de 20cm)');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-2089219', v_mill_id, 'PREVENTIVO', 'COMPLETED', 'MEDIA', 'Concertacion realizada 26/02/2026 - German Colina --- Observacion: Le hacen falta 4 escaleras 1 en cada piso, le hace falta un perno al pedestal, se necesitan un par de ganchos para centrador, Porta fusible sin fusible - Autoridad quisiera en lo posible que se le instalara un fusible ( Seria pequeño, menos de 20cm)', 'Concertacion realizada 26/02/2026 - German Colina --- Observacion: Le hacen falta 4 escaleras 1 en cada piso, le hace falta un perno al pedestal, se necesitan un par de ganchos para centrador, Porta fusible sin fusible - Autoridad quisiera en lo posible que se le instalara un fusible ( Seria pequeño, menos de 20cm)');

    -- COMUNIDAD: Huracan la raya
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Huracan la raya', 'Manaure', 'KM 10 Via Mayapo M Izquierdo, Entrada Wayira', 11.595147, -72.856957, 109, 300, 60, 'Si', 'pesca arteasnia', 5, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Huracan la raya
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Jairo' AND last_name ILIKE 'Uriana' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Jairo', 'Uriana', 'CC-32840064', '3117124083', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3117124083') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Huracan la raya
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Huracan la raya', v_community_id, 'OPERATIONAL', 11.595147, -72.856957)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.595147, longitude = -72.856957 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Concertacion realizada 26/02/2026 - German Colina --- Observacion: Torre 14 Con molino 12- Se necesita 1 gancho de centrador');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-59055373', v_mill_id, 'PREVENTIVO', 'COMPLETED', 'MEDIA', 'Concertacion realizada 26/02/2026 - German Colina --- Observacion: Torre 14 Con molino 12- Se necesita 1 gancho de centrador', 'Concertacion realizada 26/02/2026 - German Colina --- Observacion: Torre 14 Con molino 12- Se necesita 1 gancho de centrador');

    -- COMUNIDAD: Yaletshikat
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Yaletshikat', 'Manaure', 'Km 23 + 500 M Derecho Via maicao', 11.483711, -72.699344, 10, 40, 23, 'No', 'Pastoreo artesania', 2, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Yaletshikat
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Luis' AND last_name ILIKE 'Angel' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Luis', 'Angel', 'CC-25970715', '3116021164', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3116021164') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Yaletshikat
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Yaletshikat', v_community_id, 'OPERATIONAL', 11.483711, -72.699344)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.483711, longitude = -72.699344 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'ncertacion realizada 26/02/2026 - German Colina --- Observacion: Vincha necesita ajuste o ser cambiada, Pedesta con un perno roto');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-87508943', v_mill_id, 'PREVENTIVO', 'COMPLETED', 'MEDIA', 'ncertacion realizada 26/02/2026 - German Colina --- Observacion: Vincha necesita ajuste o ser cambiada, Pedesta con un perno roto', 'ncertacion realizada 26/02/2026 - German Colina --- Observacion: Vincha necesita ajuste o ser cambiada, Pedesta con un perno roto');

    -- COMUNIDAD: Urratchikat
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Urratchikat', 'Manaure', 'Via maicao KM 24 M Izquierdo', 11.476288, -72.651473, 20, 50, 18, 'No', 'Pastoreo artesania', 3, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Urratchikat
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Maria' AND last_name ILIKE 'Elena' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Maria', 'Elena', 'CC-19063956', '3204845270', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3204845270') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Urratchikat
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Urratchikat', v_community_id, 'OPERATIONAL', 11.476288, -72.651473)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.476288, longitude = -72.651473 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Concertacion realizada 26/02/2026 - German Colina --- Observacion: Lubricar Brazos de mecanismo de freno (Se pega al soltar el freno) - Pedestal un poco agrietado, proceder con cuidado (Posibilidad de desmoronamiento) - Falta U de centrador');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-13618051', v_mill_id, 'PREVENTIVO', 'COMPLETED', 'MEDIA', 'Concertacion realizada 26/02/2026 - German Colina --- Observacion: Lubricar Brazos de mecanismo de freno (Se pega al soltar el freno) - Pedestal un poco agrietado, proceder con cuidado (Posibilidad de desmoronamiento) - Falta U de centrador', 'Concertacion realizada 26/02/2026 - German Colina --- Observacion: Lubricar Brazos de mecanismo de freno (Se pega al soltar el freno) - Pedestal un poco agrietado, proceder con cuidado (Posibilidad de desmoronamiento) - Falta U de centrador');

    -- COMUNIDAD: Shakat
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Shakat', 'Manaure', 'Via Maicao KM 20 + 500 M Derecho', 11.484742, -72.724957, 23, 70, 36, 'Si', 'Agricultura', 2, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Shakat
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Jorge' AND last_name ILIKE 'Bouriyu' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Jorge', 'Bouriyu', 'CC-50046522', '3216828220', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3216828220') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Shakat
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Shakat', v_community_id, 'OPERATIONAL', 11.484742, -72.724957)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.484742, longitude = -72.724957 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Concertacion realizada 27/02/2026 - German Colina --- Observacion: Tiene Bomba sumergible independiente con manguera, Cambio de palanca de freno (Se encuentra en mal estado, esta agrietada)');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-54783596', v_mill_id, 'PREVENTIVO', 'COMPLETED', 'MEDIA', 'Concertacion realizada 27/02/2026 - German Colina --- Observacion: Tiene Bomba sumergible independiente con manguera, Cambio de palanca de freno (Se encuentra en mal estado, esta agrietada)', 'Concertacion realizada 27/02/2026 - German Colina --- Observacion: Tiene Bomba sumergible independiente con manguera, Cambio de palanca de freno (Se encuentra en mal estado, esta agrietada)');

    -- COMUNIDAD: Amaichon
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Amaichon', 'Riohacha', 'KM 27 Via maicao M- Izquierdo', 11.518157, -72.651331, 30, 80, 40, 'Si', 'Pastoreo artesania', 4, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Amaichon
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Marco' AND last_name ILIKE 'Epieyu' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Marco', 'Epieyu', 'CC-77138039', '3103663373', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3103663373') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Amaichon
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Amaichon', v_community_id, 'OPERATIONAL', 11.518157, -72.651331)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.518157, longitude = -72.651331 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Concertacion realizada 27/02/2026 - German Colina --- Observacion: Piden colaboracion con 4 codos, una llave de paso y un tuvo de PVC (2") y una expacion de 1 a 2 " (para remplazar un sistema defectuoso)');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-13077943', v_mill_id, 'PREVENTIVO', 'COMPLETED', 'MEDIA', 'Concertacion realizada 27/02/2026 - German Colina --- Observacion: Piden colaboracion con 4 codos, una llave de paso y un tuvo de PVC (2") y una expacion de 1 a 2 " (para remplazar un sistema defectuoso)', 'Concertacion realizada 27/02/2026 - German Colina --- Observacion: Piden colaboracion con 4 codos, una llave de paso y un tuvo de PVC (2") y una expacion de 1 a 2 " (para remplazar un sistema defectuoso)');

    -- COMUNIDAD: Tapuwamajairu
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Tapuwamajairu', 'Manaure', 'Via maicao KM 27 M - IZQUIERDA', 11.506411, -72.659787, 40, 85, 33, 'No', 'Pastoreo artesania', 2, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Tapuwamajairu
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Noris' AND last_name ILIKE 'Uriana' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Noris', 'Uriana', 'CC-67741445', '3142166367', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3142166367') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Tapuwamajairu
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Tapuwamajairu', v_community_id, 'OPERATIONAL', 11.506411, -72.659787)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.506411, longitude = -72.659787 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Concertacion realizada 27/02/2026 - German Colina --- Observacion: Le falta 3 escalones, flanche 30x30, pedestal, fisurado Resorte suelto ( se ve en mal estado) Vincha gastada se necesitan 2 ganchos, llevar 2 codos adiconales y metro y medio de tuberia pvc');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-22410687', v_mill_id, 'PREVENTIVO', 'COMPLETED', 'MEDIA', 'Concertacion realizada 27/02/2026 - German Colina --- Observacion: Le falta 3 escalones, flanche 30x30, pedestal, fisurado Resorte suelto ( se ve en mal estado) Vincha gastada se necesitan 2 ganchos, llevar 2 codos adiconales y metro y medio de tuberia pvc', 'Concertacion realizada 27/02/2026 - German Colina --- Observacion: Le falta 3 escalones, flanche 30x30, pedestal, fisurado Resorte suelto ( se ve en mal estado) Vincha gastada se necesitan 2 ganchos, llevar 2 codos adiconales y metro y medio de tuberia pvc');

    -- COMUNIDAD: Mokoloquimana
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Mokoloquimana', 'Manaure', 'KM 4 - Via pajaro antiguo', 11.570473, -72.776264, 26, 60, 30, 'Si', 'Pastoreo artesania', 3, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Mokoloquimana
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Cesilia' AND last_name ILIKE 'Iguaran' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Cesilia', 'Iguaran', 'CC-60866547', NULL, true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, NULL) WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Mokoloquimana
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Mokoloquimana', v_community_id, NULL, 11.570473, -72.776264)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = NULL, latitude = 11.570473, longitude = -72.776264 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Concertacion realizada 27/02/2026 - German Colina --- Observacion: Eje de convertidor (Eje del recorrido) torsido amerita cambio o reparacion, Flanche 40x40- 25.5 entre tornillos, Ranuera de 12 de largo x 10 de ancho. (Imagen anexada en hoja de evidencia) Molino cuenta con bomba sumergible independiente, con tubo de PVC de 1", amarrado junto a al tuberia galvanizada con tairra ( Uniones de 1" de rosca)');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-30231451', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Concertacion realizada 27/02/2026 - German Colina --- Observacion: Eje de convertidor (Eje del recorrido) torsido amerita cambio o reparacion, Flanche 40x40- 25.5 entre tornillos, Ranuera de 12 de largo x 10 de ancho. (Imagen anexada en hoja de evidencia) Molino cuenta con bomba sumergible independiente, con tubo de PVC de 1", amarrado junto a al tuberia galvanizada con tairra ( Uniones de 1" de rosca)', 'Concertacion realizada 27/02/2026 - German Colina --- Observacion: Eje de convertidor (Eje del recorrido) torsido amerita cambio o reparacion, Flanche 40x40- 25.5 entre tornillos, Ranuera de 12 de largo x 10 de ancho. (Imagen anexada en hoja de evidencia) Molino cuenta con bomba sumergible independiente, con tubo de PVC de 1", amarrado junto a al tuberia galvanizada con tairra ( Uniones de 1" de rosca)');

    -- COMUNIDAD: Amaichonkat
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Amaichonkat', 'Manaure', NULL, NULL, NULL, 40, 120, 50, 'Si', 'Pastoreo artesania', 4, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Amaichonkat
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Candida' AND last_name ILIKE 'Aguilar' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Candida', 'Aguilar', 'CC-795493', '3236671553', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3236671553') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Amaichonkat
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Amaichonkat', v_community_id, NULL, NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = NULL, latitude = NULL, longitude = NULL WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', NULL);
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-58237348', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', NULL, NULL);

    -- COMUNIDAD: Palmito
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Palmito', 'Riohacha', 'Via Cucurumana KM 14 M Derecho', 11.474904, -72.832667, 15, 50, 32, 'no', 'Agricultura', 4, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Palmito
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Laura' AND last_name ILIKE 'Epinayu' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Laura', 'Epinayu', 'CC-82758632', '3238885812', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3238885812') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Palmito
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Palmito', v_community_id, 'NON_OPERATIONAL', 11.474904, -72.832667)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'NON_OPERATIONAL', latitude = 11.474904, longitude = -72.832667 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Concertacion realizada 28/02/2026 - German Colina --- Observacion:  Pedestal requiere trabajo de refuerzo, No tiene palanca de freno, Falta centrador del medio, La torre requiere pintura, Resorte oxidado posiblemente se requiera cambio, Escalones debiles Por corrosion');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-38453032', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Concertacion realizada 28/02/2026 - German Colina --- Observacion:  Pedestal requiere trabajo de refuerzo, No tiene palanca de freno, Falta centrador del medio, La torre requiere pintura, Resorte oxidado posiblemente se requiera cambio, Escalones debiles Por corrosion', 'Concertacion realizada 28/02/2026 - German Colina --- Observacion:  Pedestal requiere trabajo de refuerzo, No tiene palanca de freno, Falta centrador del medio, La torre requiere pintura, Resorte oxidado posiblemente se requiera cambio, Escalones debiles Por corrosion');

    -- COMUNIDAD: Jutpunare
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Jutpunare', 'Riohacha', 'Via cucurumana Km 17 M Izquierdo', 11.458949, -72.780128, 30, 90, 55, 'no', 'Pastoreo artesania', 3, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Jutpunare
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Jorge' AND last_name ILIKE 'Bonivento' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Jorge', 'Bonivento', 'CC-70948827', '3216187273', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3216187273') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Jutpunare
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Jutpunare', v_community_id, 'NON_OPERATIONAL', 11.458949, -72.780128)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'NON_OPERATIONAL', latitude = 11.458949, longitude = -72.780128 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Concertacion realizada 28/02/2026 - German Colina --- Observacion: Fallo hace 6 meses, Pedestal necesita refuerzo, se necesita centrador de arriba (Pequeño), La vincha necesita ser ajustada o cambiada, la T esta deteriorada (Imagen Anexada en evidencia)');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-98282482', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Concertacion realizada 28/02/2026 - German Colina --- Observacion: Fallo hace 6 meses, Pedestal necesita refuerzo, se necesita centrador de arriba (Pequeño), La vincha necesita ser ajustada o cambiada, la T esta deteriorada (Imagen Anexada en evidencia)', 'Concertacion realizada 28/02/2026 - German Colina --- Observacion: Fallo hace 6 meses, Pedestal necesita refuerzo, se necesita centrador de arriba (Pequeño), La vincha necesita ser ajustada o cambiada, la T esta deteriorada (Imagen Anexada en evidencia)');

    -- COMUNIDAD: Kachulat
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Kachulat', 'Uribia', 'KM 55 Uribia Margen Derecho', 11.506895, -72.346034, 30, 85, 43, 'No', 'Pastoreo artesania', 4, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Kachulat
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Gaspar' AND last_name ILIKE 'Iguaran' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Gaspar', 'Iguaran', 'CC-90125187', '3113899237', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3113899237') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Kachulat
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Kachulat', v_community_id, 'NON_OPERATIONAL', 11.506895, -72.346034)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'NON_OPERATIONAL', latitude = 11.506895, longitude = -72.346034 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Concertacion realizada 25/02/2026 - German Colina --- Observacion: Se necesitan 4 Ganchos para centrador - En lo posible reforzar base de la estructura del molino, (un poco corroida por el salitre y el oxido)');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-552131', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Concertacion realizada 25/02/2026 - German Colina --- Observacion: Se necesitan 4 Ganchos para centrador - En lo posible reforzar base de la estructura del molino, (un poco corroida por el salitre y el oxido)', 'Concertacion realizada 25/02/2026 - German Colina --- Observacion: Se necesitan 4 Ganchos para centrador - En lo posible reforzar base de la estructura del molino, (un poco corroida por el salitre y el oxido)');

    -- COMUNIDAD: Jawapiakat
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Jawapiakat', 'Uribia', 'KM 55 Uribia Margen Derecho', NULL, NULL, 20, 70, 40, 'No', 'Artesania pastoreo', 3, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Jawapiakat
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Gabriel' AND last_name ILIKE ' Epieyu' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Gabriel', ' Epieyu', 'CC-86580982', '3225360360', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3225360360') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Jawapiakat
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Jawapiakat', v_community_id, 'OPERATIONAL', NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = NULL, longitude = NULL WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Ajuste de vincha de freno o cambio, llevar ganchos para 2 centradores. 2 años desde el ultimo mantenimiento');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-63274496', v_mill_id, 'PREVENTIVO', 'COMPLETED', 'MEDIA', 'Ajuste de vincha de freno o cambio, llevar ganchos para 2 centradores. 2 años desde el ultimo mantenimiento', 'Ajuste de vincha de freno o cambio, llevar ganchos para 2 centradores. 2 años desde el ultimo mantenimiento');

    -- COMUNIDAD: Maishen
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Maishen', 'Uribia', 'Km 59 M Derecho via uribia', 11.536064, -72.338895, 54, 130, 49, 'Si', 'Pastoreo artesania', 5, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Maishen
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Leidi' AND last_name ILIKE 'Pana' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Leidi', 'Pana', 'CC-12821893', '3212011007', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3212011007') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Maishen
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Maishen', v_community_id, 'OPERATIONAL', 11.536064, -72.338895)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.536064, longitude = -72.338895 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Concertacion realizada 25/02/2026 - German Colina --- Observacion: Se necesita 1 centrador y  3 gancho, Posible derrumbamiento del pedestal (Presenta grieta) - La comunidad solicita que se deje el mismo cilindro.');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-20604249', v_mill_id, 'PREVENTIVO', 'COMPLETED', 'MEDIA', 'Concertacion realizada 25/02/2026 - German Colina --- Observacion: Se necesita 1 centrador y  3 gancho, Posible derrumbamiento del pedestal (Presenta grieta) - La comunidad solicita que se deje el mismo cilindro.', 'Concertacion realizada 25/02/2026 - German Colina --- Observacion: Se necesita 1 centrador y  3 gancho, Posible derrumbamiento del pedestal (Presenta grieta) - La comunidad solicita que se deje el mismo cilindro.');

    -- COMUNIDAD: Wirrumana
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Wirrumana', 'Uribia', 'Km 65 M Derecho Via uribia', 11.553064, -72.226458, 25, 70, 34, 'No', 'Pastoreo artesania', 5, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Wirrumana
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Mafrco' AND last_name ILIKE 'Pushaina' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Mafrco', 'Pushaina', 'CC-17066827', '3146969480', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3146969480') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Wirrumana
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Wirrumana', v_community_id, 'NON_OPERATIONAL', 11.553064, -72.226458)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'NON_OPERATIONAL', latitude = 11.553064, longitude = -72.226458 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Concertacion realizada 25/02/2026 - German Colina --- Observacion: Se necesitan 2 ganchos - y ajustar o cambiar vincha de freno');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-84087178', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Concertacion realizada 25/02/2026 - German Colina --- Observacion: Se necesitan 2 ganchos - y ajustar o cambiar vincha de freno', 'Concertacion realizada 25/02/2026 - German Colina --- Observacion: Se necesitan 2 ganchos - y ajustar o cambiar vincha de freno');

    -- COMUNIDAD: wareripa
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('wareripa', 'maicao', NULL, NULL, NULL, 12, 30, 11, 'no', 'artesanias', 3, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: wareripa
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'solfani' AND last_name ILIKE 'Sin Apellido' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('solfani', 'Sin Apellido', 'CC-97310483', '3002182551', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3002182551') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: wareripa
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino wareripa', v_community_id, NULL, NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = NULL, latitude = NULL, longitude = NULL WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', NULL);
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-9965160', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', NULL, NULL);

    -- COMUNIDAD: guayacanal
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('guayacanal', 'maicao', NULL, 11.305332, -72.475393, 20, 80, 20, 'no', 'pastoreo', 5, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: guayacanal
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'jose' AND last_name ILIKE 'sierra marquez' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('jose', 'sierra marquez', 'CC-66999093', '3145853642', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3145853642') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: guayacanal
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino guayacanal', v_community_id, 'NON_OPERATIONAL', 11.305332, -72.475393)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'NON_OPERATIONAL', latitude = 11.305332, longitude = -72.475393 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Se encuentra partida la varilla del portafusible, presenta golpe en el convertidor, requiere cambio de sistema de bombeo, plataforma y aceite');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-6288154', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Se encuentra partida la varilla del portafusible, presenta golpe en el convertidor, requiere cambio de sistema de bombeo, plataforma y aceite', 'Se encuentra partida la varilla del portafusible, presenta golpe en el convertidor, requiere cambio de sistema de bombeo, plataforma y aceite');

    -- COMUNIDAD: pinski
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('pinski', 'maicao', NULL, 11.285853, -72.476253, 30, 120, 50, 'si', 'artesania/pastoreo', 4, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: pinski
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'jose' AND last_name ILIKE 'prudencio pushaina' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('jose', 'prudencio pushaina', 'CC-65660012', '3106710494', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3106710494') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: pinski
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino pinski', v_community_id, 'NON_OPERATIONAL', 11.285853, -72.476253)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'NON_OPERATIONAL', latitude = 11.285853, longitude = -72.476253 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Cambio de sistema de bombeo, realizar trabajo de pedestal (refuerzo), pintura, cambio de plataforma, aceite');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-71716404', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Cambio de sistema de bombeo, realizar trabajo de pedestal (refuerzo), pintura, cambio de plataforma, aceite', 'Cambio de sistema de bombeo, realizar trabajo de pedestal (refuerzo), pintura, cambio de plataforma, aceite');

    -- COMUNIDAD: jurimakal
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('jurimakal', 'maicao', NULL, 11.284082, -72.473253, 40, 400, 80, 'si', 'artesania/pastoreo', 2, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: jurimakal
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'gustavo' AND last_name ILIKE 'lopez' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('gustavo', 'lopez', 'CC-8204341', '3188650725', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3188650725') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: jurimakal
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino jurimakal', v_community_id, 'NON_OPERATIONAL', 11.284082, -72.473253)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'NON_OPERATIONAL', latitude = 11.284082, longitude = -72.473253 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Cambio de sistema de bombeo, realizar trabajo de pedestal (refuerzo), pintura, cambio de plataforma, aceite');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-93686071', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Cambio de sistema de bombeo, realizar trabajo de pedestal (refuerzo), pintura, cambio de plataforma, aceite', 'Cambio de sistema de bombeo, realizar trabajo de pedestal (refuerzo), pintura, cambio de plataforma, aceite');

    -- COMUNIDAD: mi ranchito
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('mi ranchito', 'maicao', NULL, 11.388605, -72.288128, 97, 320, 120, 'si', 'artesania/pastoreo', 4, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: mi ranchito
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'francisco' AND last_name ILIKE 'ramirez' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('francisco', 'ramirez', 'CC-34280260', '3005787601', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3005787601') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: mi ranchito
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino mi ranchito', v_community_id, 'OPERATIONAL', 11.388605, -72.288128)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.388605, longitude = -72.288128 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Molino no frena, revisar vincha, cambio de sistema de bombeo, pintura, cambio de aceite y plataforma');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-74284649', v_mill_id, 'PREVENTIVO', 'COMPLETED', 'MEDIA', 'Molino no frena, revisar vincha, cambio de sistema de bombeo, pintura, cambio de aceite y plataforma', 'Molino no frena, revisar vincha, cambio de sistema de bombeo, pintura, cambio de aceite y plataforma');

    -- COMUNIDAD: jachuaipana
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('jachuaipana', 'maicao', NULL, 11.479533, -72.535582, 36, 120, 60, 'si', 'artesania/pastoreo', 3, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: jachuaipana
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'alexander' AND last_name ILIKE 'barliza' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('alexander', 'barliza', 'CC-8568894', '3015219507', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3015219507') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: jachuaipana
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino jachuaipana', v_community_id, 'NON_OPERATIONAL', 11.479533, -72.535582)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'NON_OPERATIONAL', latitude = 11.479533, longitude = -72.535582 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Requiere cambiar sistema de bombeo, pintura, aceite de convertidor, cambio de ganchos de centrador, presenta bomba sumergible independiente.');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-26121746', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Requiere cambiar sistema de bombeo, pintura, aceite de convertidor, cambio de ganchos de centrador, presenta bomba sumergible independiente.', 'Requiere cambiar sistema de bombeo, pintura, aceite de convertidor, cambio de ganchos de centrador, presenta bomba sumergible independiente.');

    -- COMUNIDAD: maicaito
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('maicaito', 'maicao', NULL, 11.394883, -72.299528, 75, 260, 50, 'si', 'artesania/pastoreo', 8, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: maicaito
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'ramon' AND last_name ILIKE 'cambar' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('ramon', 'cambar', 'CC-35710299', '3043768539', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3043768539') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: maicaito
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino maicaito', v_community_id, 'OPERATIONAL', 11.394883, -72.299528)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.394883, longitude = -72.299528 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Cambio de sistema de bombeo, molino no frena, revisar vincha y ajustar guaya, pintura, cambio de aceite y plataforma');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-80848346', v_mill_id, 'PREVENTIVO', 'COMPLETED', 'MEDIA', 'Cambio de sistema de bombeo, molino no frena, revisar vincha y ajustar guaya, pintura, cambio de aceite y plataforma', 'Cambio de sistema de bombeo, molino no frena, revisar vincha y ajustar guaya, pintura, cambio de aceite y plataforma');

    -- COMUNIDAD: lyospa
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('lyospa', 'manaure', NULL, NULL, NULL, 23, 120, 30, 'si', 'artesania/pastoreo', 2, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: lyospa
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'ligia' AND last_name ILIKE 'martinez aguilar' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('ligia', 'martinez aguilar', 'CC-41914808', '3244121426', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3244121426') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: lyospa
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino lyospa', v_community_id, 'OPERATIONAL', NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = NULL, longitude = NULL WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', NULL);
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-11116370', v_mill_id, 'PREVENTIVO', 'COMPLETED', 'MEDIA', NULL, NULL);

    -- COMUNIDAD: el tablazo
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('el tablazo', 'riohacha', NULL, 11.483408, -72.825073, 47, 130, 30, 'si', 'artesania/pastoreo', 3, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: el tablazo
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'david' AND last_name ILIKE 'ipuana' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('david', 'ipuana', 'CC-38542665', '3104309318', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3104309318') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: el tablazo
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino el tablazo', v_community_id, 'NON_OPERATIONAL', 11.483408, -72.825073)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'NON_OPERATIONAL', latitude = 11.483408, longitude = -72.825073 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Molino frena, pero no abre nuevamente la veleta, revisar guaya, centradores dañados, requiere trabajo de pedestal, cambio de sistema de bombeo, cambio de plataforma y aceite');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-75106498', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Molino frena, pero no abre nuevamente la veleta, revisar guaya, centradores dañados, requiere trabajo de pedestal, cambio de sistema de bombeo, cambio de plataforma y aceite', 'Molino frena, pero no abre nuevamente la veleta, revisar guaya, centradores dañados, requiere trabajo de pedestal, cambio de sistema de bombeo, cambio de plataforma y aceite');

    -- COMUNIDAD: tekia
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('tekia', 'maicao', NULL, 11.298450, -72.465783, 45, 160, 60, 'si', 'siembra/artesania/pastoreo', 5, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: tekia
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'idelfonso' AND last_name ILIKE 'bonivento' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('idelfonso', 'bonivento', 'CC-2771301', '3145856876', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3145856876') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: tekia
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino tekia', v_community_id, 'NON_OPERATIONAL', 11.298450, -72.465783)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'NON_OPERATIONAL', latitude = 11.298450, longitude = -72.465783 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Presenta centradores dañados, revisar vincha y guaya de freno, cambiar flanche, plataforma, aceite y pintura. Cambiar sistema de bombeo');
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-546452', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Presenta centradores dañados, revisar vincha y guaya de freno, cambiar flanche, plataforma, aceite y pintura. Cambiar sistema de bombeo', 'Presenta centradores dañados, revisar vincha y guaya de freno, cambiar flanche, plataforma, aceite y pintura. Cambiar sistema de bombeo');

    -- COMUNIDAD: las delicias
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('las delicias', 'maicao', NULL, NULL, NULL, 34, 120, 30, 'no', 'pastoreo/oficios varios', 4, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: las delicias
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'sonia' AND last_name ILIKE 'ipuana' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('sonia', 'ipuana', 'CC-74933513', '3113865075', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3113865075') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: las delicias
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino las delicias', v_community_id, 'NON_OPERATIONAL', NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'NON_OPERATIONAL', latitude = NULL, longitude = NULL WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', NULL);
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-85348539', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', NULL, NULL);

    -- COMUNIDAD: chimalu
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('chimalu', 'maicao', NULL, NULL, NULL, 20, 80, 25, 'no', 'pastoreo/siembra', 5, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: chimalu
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'jesus' AND last_name ILIKE 'jayariyu' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('jesus', 'jayariyu', 'CC-31152190', '3117957536', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3117957536') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: chimalu
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino chimalu', v_community_id, NULL, NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = NULL, latitude = NULL, longitude = NULL WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', NULL);
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-18892450', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', NULL, NULL);

    -- COMUNIDAD: jasalima
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('jasalima', 'maicao', NULL, NULL, NULL, 36, 230, 80, 'no', 'artesania/pastoreo', 4, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: jasalima
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'yanira' AND last_name ILIKE 'ipuana' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('yanira', 'ipuana', 'CC-90073199', '3237080634', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3237080634') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: jasalima
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino jasalima', v_community_id, NULL, NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = NULL, latitude = NULL, longitude = NULL WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', NULL);
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-45998783', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', NULL, NULL);

    -- COMUNIDAD: usimana
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('usimana', 'riohacha', NULL, NULL, NULL, 31, 150, 56, 'si', 'artesania/pastoreo', 3, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: usimana
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'francisco' AND last_name ILIKE 'bonivento' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('francisco', 'bonivento', 'CC-82603338', '3183220279', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3183220279') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: usimana
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino usimana', v_community_id, NULL, NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = NULL, latitude = NULL, longitude = NULL WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', NULL);
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-54797544', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', NULL, NULL);

    -- COMUNIDAD: kamushain
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('kamushain', 'riohacha', NULL, NULL, NULL, 80, 300, 180, 'si', 'artesania/pastoreo', 5, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: kamushain
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'rogelio' AND last_name ILIKE 'bourigo' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('rogelio', 'bourigo', 'CC-91391941', '3171922093', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3171922093') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: kamushain
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino kamushain', v_community_id, NULL, NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = NULL, latitude = NULL, longitude = NULL WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', NULL);
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-65940806', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', NULL, NULL);

    -- COMUNIDAD: toloponokat
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('toloponokat', 'riohacha', NULL, NULL, NULL, 37, 160, 75, 'si', 'artesania/pastoreo/pescaderia', 4, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: toloponokat
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'vicgor' AND last_name ILIKE 'pushaina' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('vicgor', 'pushaina', 'CC-8267978', '3235697039', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3235697039') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: toloponokat
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino toloponokat', v_community_id, NULL, NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = NULL, latitude = NULL, longitude = NULL WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', NULL);
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-69416452', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', NULL, NULL);

    -- COMUNIDAD: altopino
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('altopino', 'maicao', NULL, NULL, NULL, 54, 150, 95, 'si', 'artesania', 3, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: altopino
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'jose' AND last_name ILIKE 'gonsalez' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('jose', 'gonsalez', 'CC-41642949', '3046321563', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3046321563') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: altopino
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino altopino', v_community_id, NULL, NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = NULL, latitude = NULL, longitude = NULL WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', NULL);
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-33465880', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', NULL, NULL);

    -- COMUNIDAD: warranka2
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('warranka2', 'manaure', NULL, NULL, NULL, 25, 80, 35, 'si', 'artesania/pastoreo', 1, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: warranka2
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'carmen' AND last_name ILIKE 'ipuana' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('carmen', 'ipuana', 'CC-77030663', '3127283932', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3127283932') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: warranka2
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino warranka2', v_community_id, NULL, NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = NULL, latitude = NULL, longitude = NULL WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', NULL);
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-67815622', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', NULL, NULL);

    -- COMUNIDAD: tamasikomana
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('tamasikomana', 'manaure', NULL, NULL, NULL, 40, 130, 80, 'no', 'artesania/pastoreo', 2, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: tamasikomana
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'kevin' AND last_name ILIKE 'arpushana' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('kevin', 'arpushana', 'CC-96354301', '3225279968', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3225279968') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: tamasikomana
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino tamasikomana', v_community_id, NULL, NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = NULL, latitude = NULL, longitude = NULL WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', NULL);
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-22818343', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', NULL, NULL);

    -- COMUNIDAD: samaria11
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('samaria11', 'manaure', NULL, NULL, NULL, 20, 70, 40, 'si', 'artesania/pastoreo', 1, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: samaria11
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'simon' AND last_name ILIKE 'epieyu' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('simon', 'epieyu', 'CC-27965623', '3016051743', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3016051743') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: samaria11
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino samaria11', v_community_id, NULL, NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = NULL, latitude = NULL, longitude = NULL WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', NULL);
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-97808581', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', NULL, NULL);

    -- COMUNIDAD: coushotchon
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('coushotchon', 'uribia', NULL, NULL, NULL, 10, 50, 35, 'si', 'artesania/pastoreo', 1, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: coushotchon
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'remedio' AND last_name ILIKE 'epieyu' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('remedio', 'epieyu', 'CC-48346373', '3216639965', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3216639965') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: coushotchon
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino coushotchon', v_community_id, NULL, NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = NULL, latitude = NULL, longitude = NULL WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', NULL);
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-64239622', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', NULL, NULL);

    -- COMUNIDAD: ceura
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('ceura', 'maicao', NULL, NULL, NULL, 8, 30, 15, 'no', 'artesania/pastoreo', 1, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: ceura
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'geovanni' AND last_name ILIKE 'tiler' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('geovanni', 'tiler', 'CC-94798972', '3135729556', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3135729556') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: ceura
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino ceura', v_community_id, NULL, NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = NULL, latitude = NULL, longitude = NULL WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', NULL);
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-58330890', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', NULL, NULL);

    -- COMUNIDAD: caura 1
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('caura 1', 'maicao', NULL, NULL, NULL, 25, 80, 40, 'si', 'artesania', 1, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: caura 1
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'regulo' AND last_name ILIKE 'inciarte' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('regulo', 'inciarte', 'CC-28715052', '3126011174', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3126011174') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: caura 1
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino caura 1', v_community_id, NULL, NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = NULL, latitude = NULL, longitude = NULL WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', NULL);
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-25388188', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', NULL, NULL);

    -- COMUNIDAD: ceura 2
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('ceura 2', 'maicao', NULL, NULL, NULL, 7, 25, 13, 'no', 'agricultura', 1, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: ceura 2
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'jonatan' AND last_name ILIKE 'suarez' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('jonatan', 'suarez', 'CC-62871368', '3055812774', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3055812774') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: ceura 2
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino ceura 2', v_community_id, NULL, NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = NULL, latitude = NULL, longitude = NULL WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', NULL);
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-43472260', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', NULL, NULL);

    -- COMUNIDAD: ceura 3
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('ceura 3', 'maicao', NULL, NULL, NULL, 22, 70, 44, 'si', 'artesania/pastoreo', 2, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: ceura 3
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'yudermis' AND last_name ILIKE 'uriana' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('yudermis', 'uriana', 'CC-24129664', '3169209386', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3169209386') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: ceura 3
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino ceura 3', v_community_id, NULL, NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = NULL, latitude = NULL, longitude = NULL WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', NULL);
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-66886126', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', NULL, NULL);

    -- COMUNIDAD: wamayau
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('wamayau', 'maicao', NULL, NULL, NULL, 10, 50, 35, 'no', 'artesania/pastoreo', 2, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: wamayau
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'claudio' AND last_name ILIKE 'epieyu' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('claudio', 'epieyu', 'CC-68155517', '3024517667', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3024517667') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: wamayau
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino wamayau', v_community_id, NULL, NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = NULL, latitude = NULL, longitude = NULL WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', NULL);
    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-38259367', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', NULL, NULL);

    -- COMUNIDAD: Polborin
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Polborin', 'Uribia', 'Km 3 + 500 Uribia - Manaure', 11.726660, -72.302086, 0, 0, 0, NULL, NULL, 0, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Polborin
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Hicidro' AND last_name ILIKE 'Uriana' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Hicidro', 'Uriana', 'CC-18926966', '3150555782', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3150555782') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Polborin
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Polborin', v_community_id, 'OPERATIONAL', 11.726660, -72.302086)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.726660, longitude = -72.302086 WHERE mill_id = v_mill_id;
    END IF;

    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('DX-90844115', v_mill_id, 'PREVENTIVO', 'COMPLETED', 'MEDIA', 'Ultimo mantenimiento hace 3 años, se necesitan 2 ganchos, 1U de centrador - La vincha necesita ajuste o ser cambiada - Las 2 Varillas L estan un poco torsidas, pero aun cumplen su funcion (Se recomienda cambiarlas) , Flanche en mal estado (33x33cm-> 25cm entre pernos->5cm desde perno hasta borde)', 'Ultimo mantenimiento hace 3 años, se necesitan 2 ganchos, 1U de centrador - La vincha necesita ajuste o ser cambiada - Las 2 Varillas L estan un poco torsidas, pero aun cumplen su funcion (Se recomienda cambiarlas) , Flanche en mal estado (33x33cm-> 25cm entre pernos->5cm desde perno hasta borde)');

    -- COMUNIDAD: Anaioumana
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Anaioumana', 'Uribia', 'KM 70 M-Derecho Uribia Cuatro via', 11.000000, 0.623710, 0, 0, 0, NULL, NULL, 0, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Anaioumana
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Fernando' AND last_name ILIKE 'Epiayu' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Fernando', 'Epiayu', 'CC-10612473', '3113575136', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3113575136') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Anaioumana
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Anaioumana', v_community_id, 'OPERATIONAL', 11.000000, 0.623710)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.000000, longitude = 0.623710 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Concertacion realizada 03/32/2026 - German Colina --- Observacion: 2 años desde el ultimo mantenimiento, tiene un tubo de PVC (2") de 3m que da hacia una reserva (Jawey), la enrramada se encuentra mas alla del molino, llamar a la autoridad con antelasion');

    -- COMUNIDAD: Ishichonkat
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Ishichonkat', 'Uribia', 'KM 8 M Derecho, Uribia-Manaure', 11.736693, -72.330087, 0, 0, 0, NULL, NULL, 0, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Ishichonkat
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Reyes' AND last_name ILIKE 'Puchaina' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Reyes', 'Puchaina', 'CC-40043420', '3218390554', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3218390554') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Ishichonkat
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Ishichonkat', v_community_id, 'NON_OPERATIONAL', 11.736693, -72.330087)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'NON_OPERATIONAL', latitude = 11.736693, longitude = -72.330087 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Concertacion realizada 03/32/2026 - German Colina --- Observacion: Se necesita 1 gancho y una U de centrador, Se solto el fusible de la parte superior, la enrramada se encuentra lejos se recomienda llamar a la autoridad con anterioridad, Flanche 30x30cm');

    -- COMUNIDAD: Japuapia
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Japuapia', 'Manaure', 'KM 15 M- Derecho Via mayapo', 11.619174, -72.802583, 0, 0, 0, NULL, NULL, 0, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Japuapia
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Bladis' AND last_name ILIKE 'Epiayu' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Bladis', 'Epiayu', 'CC-32852055', '3106239309', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3106239309') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Japuapia
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Japuapia', v_community_id, 'OPERATIONAL', 11.619174, -72.802583)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.619174, longitude = -72.802583 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Concertacion realizada 04/03/2026 - German Colina --- Observacion: Le hacen falta 4 escalones en la planta inferior (Primer Piso) 42x13 cm, Vincha en buen estado, pero necesita un ajuste o en su defecto ser cambiada, El contacto con el resorte de la vincha es casi que nulo (No freno completamente por si solo, y se detuvo con ayuda de una cuerda)');

    -- COMUNIDAD: Molinos
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Molinos', 'Manaure', 'Km 7 via Mayapo- M- Izquierdo', 11.566226, -72.852033, 0, 0, 0, NULL, NULL, 0, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Molinos
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Antonio' AND last_name ILIKE 'Felix Ipuana' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Antonio', 'Felix Ipuana', 'CC-79922735', '3017966654', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3017966654') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Molinos
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Molinos', v_community_id, 'OPERATIONAL', 11.566226, -72.852033)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.566226, longitude = -72.852033 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Concertacion realizada 04/03/2026 - German Colina --- Observacion: No se freno el molino de manera manual debido a las fuertes corrientes de viento constante, se necesita ajuste de vincha y resorte o cambio de ambos, a la altura de 12m en lugar de la union galvanizada comun se encuentra una T conectada a los tubos galvanizados que da salida hacia una tuberia de PVC, y dicha tuberia se encuentra en mal estado en su parte inferior (Adjunto imagenes en evidencias), Flanche fuera de lo comun (de forma obalada y bajo)');

    -- COMUNIDAD: Perrakat
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Perrakat', 'Manaure', 'KM 3 Via Mayapo M- Derecho', 11.539638, -72.848104, 0, 0, 0, NULL, NULL, 0, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Perrakat
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Pedro' AND last_name ILIKE 'Epiayu' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Pedro', 'Epiayu', 'CC-68254139', '3009621908', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3009621908') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Perrakat
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Perrakat', v_community_id, 'OPERATIONAL', 11.539638, -72.848104)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.539638, longitude = -72.848104 WHERE mill_id = v_mill_id;
    END IF;


    -- COMUNIDAD: Amaichon 2
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Amaichon 2', 'Manaure', 'Km 4 via antigua pajaro', 11.574718, -72.761437, 0, 0, 0, NULL, NULL, 0, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Amaichon 2
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Candida' AND last_name ILIKE 'Aguilar' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Candida', 'Aguilar', 'CC-92909795', '3236671553', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3236671553') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Amaichon 2
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Amaichon 2', v_community_id, 'OPERATIONAL', 11.574718, -72.761437)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.574718, longitude = -72.761437 WHERE mill_id = v_mill_id;
    END IF;


    -- COMUNIDAD: Villa Luz
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Villa Luz', 'Manaure', 'KM 24 M- Derecho via Mayapo Manaure', 11.633854, -72.725906, 0, 0, 0, NULL, NULL, 0, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Villa Luz
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Cesar' AND last_name ILIKE 'Sin Apellido' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Cesar', 'Sin Apellido', 'CC-83359033', '3108209710', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3108209710') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Villa Luz
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Villa Luz', v_community_id, 'OPERATIONAL', 11.633854, -72.725906)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.633854, longitude = -72.725906 WHERE mill_id = v_mill_id;
    END IF;


    -- COMUNIDAD: Chuputchi
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Chuputchi', 'Manaure', 'KM 61 M-Derecho 4vias Uribia', 11.636136, -72.762909, 0, 0, 0, NULL, NULL, 0, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Chuputchi
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Maria' AND last_name ILIKE 'Angelica Epiayu' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Maria', 'Angelica Epiayu', 'CC-83090089', '3233483858', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3233483858') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Chuputchi
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Chuputchi', v_community_id, 'NON_OPERATIONAL', 11.636136, -72.762909)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'NON_OPERATIONAL', latitude = 11.636136, longitude = -72.762909 WHERE mill_id = v_mill_id;
    END IF;


    -- COMUNIDAD: Kamileumana-Maicauchon
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Kamileumana-Maicauchon', 'Manaure', 'KM 24 M- Derecho via Mayapo Manaure', 11.617895, -72.709715, 0, 0, 0, NULL, NULL, 0, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Kamileumana-Maicauchon
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Luky' AND last_name ILIKE 'Epiayu' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Luky', 'Epiayu', 'CC-59428305', '3183856572', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3183856572') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Kamileumana-Maicauchon
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Kamileumana-Maicauchon', v_community_id, 'OPERATIONAL', 11.617895, -72.709715)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.617895, longitude = -72.709715 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Concertacion realizada 07/03/2026 - German Colina --- Observacion:  Es un mantenimiento estandar, El molino esta como nuevo.');

    -- COMUNIDAD: Uriakat
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Uriakat', 'Manaure', 'KM 24 M- Derecho via Mayapo Manaure', 11.634669, -72.745845, 0, 0, 0, NULL, NULL, 0, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Uriakat
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Ramiro' AND last_name ILIKE 'Epiayu Uriana' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Ramiro', 'Epiayu Uriana', 'CC-48564817', '3225783456', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3225783456') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Uriakat
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Uriakat', v_community_id, 'OPERATIONAL', 11.634669, -72.745845)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.634669, longitude = -72.745845 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Concertacion realizada 07/03/2026 - German Colina --- Observacion: Le falta un perno al pedestal, Pedestal fisurado pero se ve resistente, la comunidad quiere el mantenimiento pero sin que le hagan cambio de la bomba');

    -- COMUNIDAD: Urrachica
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Urrachica', 'Manaure', 'KM 24 M- Derecho via Mayapo Manaure', 11.656591, -72.744127, 0, 0, 0, NULL, NULL, 0, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Urrachica
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Antonio' AND last_name ILIKE 'gouriyu' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Antonio', 'gouriyu', 'CC-9309231', '3214986493', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3214986493') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Urrachica
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Urrachica', v_community_id, 'NON_OPERATIONAL', 11.656591, -72.744127)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'NON_OPERATIONAL', latitude = 11.656591, longitude = -72.744127 WHERE mill_id = v_mill_id;
    END IF;


    -- COMUNIDAD: Coishimana
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Coishimana', 'Manaure', 'KM 24 M- Derecho via Mayapo Manaure', 11.636622, -72.762802, 0, 0, 0, NULL, NULL, 0, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Coishimana
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Rafael' AND last_name ILIKE 'Ipuana Epinayu' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Rafael', 'Ipuana Epinayu', 'CC-20274679', '3127855438', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3127855438') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Coishimana
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Coishimana', v_community_id, 'OPERATIONAL', 11.636622, -72.762802)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.636622, longitude = -72.762802 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Concertacion realizada 07/03/2026 - German Colina --- Observacion: Comunidad comunica que quiere que le realicen el mantenimiento pero que no le cambien el cilindro, Pieza que cierra la cola no hace contado, debe ser ajustada con alambre dulce o alambron');

    -- COMUNIDAD: Comejenese
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Comejenese', 'Manaure', 'KM 24 M- Derecho via Mayapo Manaure', 11.640004, -72.700291, 0, 0, 0, NULL, NULL, 0, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Comejenese
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Maximo' AND last_name ILIKE 'Mengual' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Maximo', 'Mengual', 'CC-55198534', '3114062511', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3114062511') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Comejenese
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Comejenese', v_community_id, 'OPERATIONAL', 11.640004, -72.700291)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.640004, longitude = -72.700291 WHERE mill_id = v_mill_id;
    END IF;

    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'finalizada', 'Concertacion realizada 07/03/2026 - German Colina --- Observacion: Hace 7 meses, Pareciera que tiene bomba sumergible pero la comunidad comica que ya fue retirada por ellos, Alrededor de la estructura, hay charcos ocacionados por derramamiento de agua, llamar a la autoridad con anterioridad oara confirmar que la zona de trabajo fue adecuada debidamente');

    -- COMUNIDAD: Patamana
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES ('Patamana', 'Manaure', 'KM 24 M- Derecho via Mayapo Manaure', 11.633802, -72.760842, 0, 0, 0, NULL, NULL, 0, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        location_description = EXCLUDED.location_description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        number_of_families = EXCLUDED.number_of_families,
        number_of_inhabitants = EXCLUDED.number_of_inhabitants,
        number_of_children = EXCLUDED.number_of_children,
        uca_school = EXCLUDED.uca_school,
        main_productive_activity = EXCLUDED.main_productive_activity,
        benefited_communities_count = EXCLUDED.benefited_communities_count
    RETURNING community_id INTO v_community_id;

    -- AUTORIDAD PARA: Patamana
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE 'Artipa' AND last_name ILIKE 'Epinayu' LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES ('Artipa', 'Epinayu', 'CC-64215887', '3117307687', true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, '3117307687') WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
    -- MOLINO PARA: Patamana
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Patamana', v_community_id, 'OPERATIONAL', 11.633802, -72.760842)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = 'OPERATIONAL', latitude = 11.633802, longitude = -72.760842 WHERE mill_id = v_mill_id;
    END IF;


END $$;

COMMIT;
