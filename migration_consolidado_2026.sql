-- ==============================================================================
-- MIGRACIÓN CONSOLIDADO DE COMUNIDADES 2025-2026
-- 38 intervenciones procesadas
-- Generado: 2026-03-09T19:33:53.311Z
-- ==============================================================================
-- REGLAS:
-- 1. Comunidades existentes: ENRIQUECER diagn/concerc existentes, no duplicar
-- 2. Intervención 2025: Crear flujo completo (concerc + diag + OT 2025)
-- 3. APLICA META=SI → is_reintervention=false, NO → is_reintervention=true
-- 4. Sin 2025: Comunidad nueva, solo flujo 2026
-- ==============================================================================

BEGIN;

DO $$
DECLARE
    v_community_id INT;
    v_mill_id INT;
    v_person_id INT;
    v_diag_id INT;
    v_conc_id INT;
    v_role_id INT;
BEGIN

    -- Obtener rol de Autoridad/Técnico
    SELECT role_id INTO v_role_id FROM public.community_role 
    WHERE name ILIKE '%Autoridad%' OR name ILIKE '%Tecnico%' LIMIT 1;
    IF v_role_id IS NULL THEN
        v_role_id := 1;
    END IF;

    -- ================================================================
    -- #1 Barbacoas (Riohacha) [NUEVA]
    -- 2025: SÍ | Reintervención: NO
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('Barbacoas', 'Riohacha', 11.232202, -72.902129)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Barbacoas', v_community_id, 'OPERATIONAL', 11.232202, -72.902129)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.232202),
            longitude = COALESCE(longitude, -72.902129)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: Felix Guerra
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Felix') AND LOWER(last_name) = LOWER('Guerra') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Felix', 'Guerra', 'CC-TEC-63145', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-11'::date, 'Concertación comunitaria para intervención del molino en Barbacoas.')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-001', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Se identificó holgura excesiva en la varilla del sistema de transmisión, comprometiendo la eficiencia del mecanismo de bombeo.', 'Varilla suelta y ruido en las aspas', '2026-02-11'::date, '2026-02-11'::date, '2026-02-11'::timestamptz, '2026-02-11'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 6a. Persona responsable 2025: Felix Guerra
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Felix') AND LOWER(last_name) = LOWER('Guerra') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Felix', 'Guerra', 'CC-TEC-19886', true)
        RETURNING person_id INTO v_person_id;
    END IF;

    -- 6b. Concertación 2025
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2025-10-17'::date, 'Concertación comunitaria previa a primera intervención 2025 en Barbacoas.');

    -- 6c. Diagnóstico 2025
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG25-001', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA',
        'Diagnóstico previo a primera intervención 2025 en Barbacoas. CAMBIO DEL SISTEMA DE BOMBEO, TRABAJOS DE PINTURA, cambio de plataforma, ajuate de freno',
        'CAMBIO DEL SISTEMA DE BOMBEO, TRABAJOS DE PINTURA, cambio de plataforma, ajuate de freno',
        '2025-10-17'::date,
        '2025-10-17'::date,
        '2025-10-17'::timestamptz,
        '2025-10-17'::timestamptz);

    -- 6d. OT 2025 (primera intervención)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención inicial 2025 en Barbacoas: CAMBIO DEL SISTEMA DE BOMBEO, TRABAJOS DE PINTURA, cambio de plataforma, ajuate de freno. Se realizaron trabajos de mantenimiento correctivo incluyendo las actividades reportadas para restablecer el funcionamiento del sistema de bombeo eólico.',
        'Diagnóstico inicial previo a intervención 2025 en Barbacoas',
        '2025-10-24',
        '2025-10-24'::timestamptz,
        '2025-10-24'::timestamptz,
        'Intervención completada satisfactoriamente. Molino restablecido a condiciones operativas tras las actividades de mantenimiento correctivo realizadas.',
        NULL);

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención de seguimiento en el molino de la comunidad Barbacoas, municipio Riohacha. Se inspecciona el molino y de encuentra suelto el fusible del porta fusible y la varilla superior doblada, se extrae tubería, y encontramos que la bomba está pegada, se realiza cambio por otra bomba, la comunidad nos informa de un ruido en la parte superior el cual se presentaba por qué tenía varias aspas dobladas y rosaban con la V dónde se amarra el alambron. Adicional a esto se ajusta el sistema de frenos.',
        'Se identificó holgura excesiva en la varilla del sistema de transmisión, comprometiendo la eficiencia del mecanismo de bombeo.',
        '2026-02-18',
        '2026-02-18'::timestamptz,
        '2026-02-18'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #2 Iyospa (Manaure) [EXISTENTE → lyospa]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Buscar comunidad existente
    SELECT community_id INTO v_community_id FROM public.community 
    WHERE LOWER(name) = LOWER('lyospa') LIMIT 1;
    UPDATE public.community SET 
        latitude = COALESCE(latitude, 11.503387), 
        longitude = COALESCE(longitude, -72.728180),
        municipality = COALESCE(municipality, 'Manaure')
    WHERE community_id = v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Iyospa', v_community_id, 'OPERATIONAL', 11.503387, -72.728180)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.503387),
            longitude = COALESCE(longitude, -72.728180)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: Felix Guerra
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Felix') AND LOWER(last_name) = LOWER('Guerra') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Felix', 'Guerra', 'CC-TEC-38235', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Enriquecer concertación existente
    SELECT concertation_id INTO v_conc_id FROM public.community_concertation 
    WHERE community_id = v_community_id LIMIT 1;
    IF v_conc_id IS NOT NULL THEN
        UPDATE public.community_concertation SET 
            status = 'finalizada',
            meeting_date = COALESCE(meeting_date, '2026-02-12'::date),
            notes = COALESCE(notes, '') || ' | Intervención consolidada 2026: ' || 'Se inspecciona el molino y lo encontramos sin resorte de la cola, varias piezas del sistema de freno sueltos, centrador superior mal instalado y la varilla superior doblada.'
        WHERE concertation_id = v_conc_id;
    ELSE
        INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
        VALUES (v_community_id, 'finalizada', '2026-02-12'::date, 'Concertación comunitaria para intervención de molino.');
    END IF;

    -- 5. Enriquecer diagnóstico existente
    SELECT diagnosis_id INTO v_diag_id FROM public.diagnosis 
    WHERE mill_id = v_mill_id LIMIT 1;
    IF v_diag_id IS NOT NULL THEN
        UPDATE public.diagnosis SET
            status = 'COMPLETED',
            description = 'Sistema de frenado inoperativo. Componentes del freno (vincha, resorte, centrador) presentaban desgaste o ausencia.',
            technical_findings = 'no frena, varilla doblada',
            notes = 'Se inspecciona el molino y lo encontramos sin resorte de la cola, varias piezas del sistema de freno sueltos, centrador superior mal instalado y la varilla superior doblada.',
            diagnosis_type = 'CORRECTIVO',
            diagnosis_date = COALESCE(diagnosis_date, '2026-02-12'::date),
            scheduled_date = COALESCE(scheduled_date, '2026-02-12'::date),
            start_date = COALESCE(start_date, '2026-02-12'::timestamptz),
            completion_date = COALESCE(completion_date, '2026-02-12'::timestamptz)
        WHERE diagnosis_id = v_diag_id;
    ELSE
        INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
        VALUES ('DX-MIG26-002', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Sistema de frenado inoperativo. Componentes del freno (vincha, resorte, centrador) presentaban desgaste o ausencia.', 'no frena, varilla doblada', '2026-02-12'::date, '2026-02-12'::date, '2026-02-12'::timestamptz, '2026-02-12'::timestamptz)
        RETURNING diagnosis_id INTO v_diag_id;
    END IF;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad Iyospa, municipio Manaure. Se inspecciona el molino y lo encontramos sin resorte de la cola, varias piezas del sistema de freno sueltos, centrador superior mal instalado y la varilla superior doblada.',
        'Sistema de frenado inoperativo. Componentes del freno (vincha, resorte, centrador) presentaban desgaste o ausencia.',
        '2026-02-19',
        '2026-02-19'::timestamptz,
        '2026-02-19'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #3 Mocochirramana (Manaure) [NUEVA]
    -- 2025: SÍ | Reintervención: NO
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('Mocochirramana', 'Manaure', 11.551805, -72.622435)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Mocochirramana', v_community_id, 'OPERATIONAL', 11.551805, -72.622435)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.551805),
            longitude = COALESCE(longitude, -72.622435)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: Felix Guerra
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Felix') AND LOWER(last_name) = LOWER('Guerra') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Felix', 'Guerra', 'CC-TEC-44201', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-13'::date, 'Concertación comunitaria para intervención del molino en Mocochirramana.')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-003', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Se reportó falla total en el suministro de agua. El sistema de bombeo presentaba desgaste avanzado requiriendo intervención correctiva.', 'no bota agua', '2026-02-13'::date, '2026-02-13'::date, '2026-02-13'::timestamptz, '2026-02-13'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 6a. Persona responsable 2025: Felix Guerra
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Felix') AND LOWER(last_name) = LOWER('Guerra') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Felix', 'Guerra', 'CC-TEC-83956', true)
        RETURNING person_id INTO v_person_id;
    END IF;

    -- 6b. Concertación 2025
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2025-08-27'::date, 'Concertación comunitaria previa a primera intervención 2025 en Mocochirramana.');

    -- 6c. Diagnóstico 2025
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG25-003', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA',
        'Diagnóstico previo a primera intervención 2025 en Mocochirramana. PINTURA, CAMBIO DE ACEITE, CAMBIO DE TUBERIA, CAMBIO DE TUBERIA PVC, CAMBIO DE SISTEMA DE BOMBEO',
        'PINTURA, CAMBIO DE ACEITE, CAMBIO DE TUBERIA, CAMBIO DE TUBERIA PVC, CAMBIO DE SISTEMA DE BOMBEO',
        '2025-08-27'::date,
        '2025-08-27'::date,
        '2025-08-27'::timestamptz,
        '2025-08-27'::timestamptz);

    -- 6d. OT 2025 (primera intervención)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención inicial 2025 en Mocochirramana: PINTURA, CAMBIO DE ACEITE, CAMBIO DE TUBERIA, CAMBIO DE TUBERIA PVC, CAMBIO DE SISTEMA DE BOMBEO. Se realizaron trabajos de mantenimiento correctivo incluyendo las actividades reportadas para restablecer el funcionamiento del sistema de bombeo eólico.',
        'Diagnóstico inicial previo a intervención 2025 en Mocochirramana',
        '2025-09-03',
        '2025-09-03'::timestamptz,
        '2025-09-03'::timestamptz,
        'Intervención completada satisfactoriamente. Molino restablecido a condiciones operativas tras las actividades de mantenimiento correctivo realizadas.',
        NULL);

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención de seguimiento en el molino de la comunidad Mocochirramana, municipio Manaure. Se inspecciona el molino y de encuentra la varilla del sistema de bombeo conectada pero con mucho ruido, se prodece con la extracción de tubería (8tubos en la parte inferior), se realiza adaptación de varilla roscada de 1/2" en el fusible ya que anteriormente presentas un tornillo de 5/8 con una reducción y este de partió. Y adicional tenía partida la varilla de la bomba',
        'Se reportó falla total en el suministro de agua. El sistema de bombeo presentaba desgaste avanzado requiriendo intervención correctiva.',
        '2026-02-20',
        '2026-02-20'::timestamptz,
        '2026-02-20'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #4 Tigreras (Riohacha) [NUEVA]
    -- 2025: SÍ | Reintervención: SÍ
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('Tigreras', 'Riohacha', 11.285038, -73.098573)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Tigreras', v_community_id, 'OPERATIONAL', 11.285038, -73.098573)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.285038),
            longitude = COALESCE(longitude, -73.098573)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: Felix Guerra
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Felix') AND LOWER(last_name) = LOWER('Guerra') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Felix', 'Guerra', 'CC-TEC-28023', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-14'::date, 'Concertación comunitaria para intervención del molino en Tigreras. Al parecer el pozo esta seco')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-004', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Se reportó falla total en el suministro de agua. El sistema de bombeo presentaba desgaste avanzado requiriendo intervención correctiva.', 'no bota agua', '2026-02-14'::date, '2026-02-14'::date, '2026-02-14'::timestamptz, '2026-02-14'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 6a. Persona responsable 2025: Isaac Castillo
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Isaac') AND LOWER(last_name) = LOWER('Castillo') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Isaac', 'Castillo', 'CC-TEC-47906', true)
        RETURNING person_id INTO v_person_id;
    END IF;

    -- 6b. Concertación 2025
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2025-10-30'::date, 'Concertación comunitaria previa a primera intervención 2025 en Tigreras.');

    -- 6c. Diagnóstico 2025
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG25-004', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA',
        'Diagnóstico previo a primera intervención 2025 en Tigreras. MANTENIMIENTO CORRECTIVO, CAMBIO DE BOMBA, CAMBIO DE ACEITE.',
        'MANTENIMIENTO CORRECTIVO, CAMBIO DE BOMBA, CAMBIO DE ACEITE.',
        '2025-10-30'::date,
        '2025-10-30'::date,
        '2025-10-30'::timestamptz,
        '2025-10-30'::timestamptz);

    -- 6d. OT 2025 (primera intervención)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención inicial 2025 en Tigreras: MANTENIMIENTO CORRECTIVO, CAMBIO DE BOMBA, CAMBIO DE ACEITE.. Se realizaron trabajos de mantenimiento correctivo incluyendo las actividades reportadas para restablecer el funcionamiento del sistema de bombeo eólico.',
        'Diagnóstico inicial previo a intervención 2025 en Tigreras',
        '2025-11-06',
        '2025-11-06'::timestamptz,
        '2025-11-06'::timestamptz,
        'Intervención completada satisfactoriamente. Molino restablecido a condiciones operativas tras las actividades de mantenimiento correctivo realizadas.',
        'Al parecer el pozo esta seco');

    -- 7. OT 2026 (REINTERVENCIÓN)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', true, 'MEDIA',
        'Intervención de seguimiento en el molino de la comunidad Tigreras, municipio Riohacha. Este molino se visitó el día 13 de febrero y de encontraba bombeando agua pero tenía ciertos detalles en su parte superior que requerían de una intervención.
El día 21 de febrero de visita  nuevamente se inspecciona y no bombea, se procede a extraer la tubería (solo tenía agua el primer tubo, se revisa la bomba y se ve con un poco de barro, se procede a revisar el nivel freatico, el cuál nos da 18 metros y se intenta verificar el fondo del pozo y nos da aproximadamente un metro más.
Se procede con la instalación de una bomba nueva, se introduce tubería y se corrigen los detalles de la parte superior, se pone a prueba el molino y este no bombea agua pero si se siente la succión de la bomba, por este motivo llegamos a la.conclusion de que el pozo está seco se le indica a la comunidad que deberían esperar varios días e intentar sacar agua nuevamente esperando que el pozo se llene nuevamente.',
        'Se reportó falla total en el suministro de agua. El sistema de bombeo presentaba desgaste avanzado requiriendo intervención correctiva.',
        '2026-02-21',
        '2026-02-21'::timestamptz,
        '2026-02-21'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas. Observaciones: Al parecer el pozo esta seco',
        'Al parecer el pozo esta seco');

    -- ================================================================
    -- #5 Talaura (Uribia) [NUEVA]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('Talaura', 'Uribia', 11.604497, -72.237972)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Talaura', v_community_id, 'OPERATIONAL', 11.604497, -72.237972)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.604497),
            longitude = COALESCE(longitude, -72.237972)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: Felix Guerra
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Felix') AND LOWER(last_name) = LOWER('Guerra') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Felix', 'Guerra', 'CC-TEC-19895', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-25'::date, 'Concertación comunitaria para intervención del molino en Talaura. N/A')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-005', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Se identificó holgura excesiva en la varilla del sistema de transmisión, comprometiendo la eficiencia del mecanismo de bombeo.', 'varilla suelta y aspas caidas', '2026-02-25'::date, '2026-02-25'::date, '2026-02-25'::timestamptz, '2026-02-25'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad Talaura, municipio Uribia. Se restaura e instala sistma de aspas, se cambia sistema de bombeo (6 tubos inferiores, 1 superior) se instala centrador de tubo en teflon, cambio de flanche, adecuacion de pedestal',
        'Se identificó holgura excesiva en la varilla del sistema de transmisión, comprometiendo la eficiencia del mecanismo de bombeo.',
        '2026-03-04',
        '2026-03-04'::timestamptz,
        '2026-03-04'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas. Observaciones: N/A',
        'N/A');

    -- ================================================================
    -- #6 PULITCHAMANA (Manaure) [NUEVA]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('PULITCHAMANA', 'Manaure', 11.461300, 72.711400)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino PULITCHAMANA', v_community_id, 'OPERATIONAL', 11.461300, 72.711400)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.461300),
            longitude = COALESCE(longitude, 72.711400)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: ANDRÉS RODRIGUEZ
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('ANDRÉS') AND LOWER(last_name) = LOWER('RODRIGUEZ') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('ANDRÉS', 'RODRIGUEZ', 'CC-TEC-99446', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-14'::date, 'Concertación comunitaria para intervención del molino en PULITCHAMANA.')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-006', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Mantenimiento preventivo programado. Inspección general de todos los sistemas: bombeo, estructura, freno y aspas.', 'Mantenimiento Preventivo', '2026-02-14'::date, '2026-02-14'::date, '2026-02-14'::timestamptz, '2026-02-14'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad PULITCHAMANA, municipio Manaure. Se extrajeron 4 tubos interiores con bomba antigua y 2 superiores, se retiró bomba eléctrica dañada (por solicitud de la autoridad), se instalaron 4 tubos nuevos con bomba nueva abajo y 2 arriba, se instaló un centrador nuevo, se ajustó freno, pintura general, plataforma de madera nueva, aceite al convertidor y PVC nuevo.',
        'Mantenimiento preventivo programado. Inspección general de todos los sistemas: bombeo, estructura, freno y aspas.',
        '2026-02-21',
        '2026-02-21'::timestamptz,
        '2026-02-21'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #7 ALTOPINO (Maicao) [EXISTENTE → altopino]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Buscar comunidad existente
    SELECT community_id INTO v_community_id FROM public.community 
    WHERE LOWER(name) = LOWER('altopino') LIMIT 1;
    UPDATE public.community SET 
        latitude = COALESCE(latitude, 11.444500), 
        longitude = COALESCE(longitude, NULL),
        municipality = COALESCE(municipality, 'Maicao')
    WHERE community_id = v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino ALTOPINO', v_community_id, 'OPERATIONAL', 11.444500, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.444500),
            longitude = COALESCE(longitude, NULL)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: ANDRÉS RODRIGUEZ
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('ANDRÉS') AND LOWER(last_name) = LOWER('RODRIGUEZ') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('ANDRÉS', 'RODRIGUEZ', 'CC-TEC-41258', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Enriquecer concertación existente
    SELECT concertation_id INTO v_conc_id FROM public.community_concertation 
    WHERE community_id = v_community_id LIMIT 1;
    IF v_conc_id IS NOT NULL THEN
        UPDATE public.community_concertation SET 
            status = 'finalizada',
            meeting_date = COALESCE(meeting_date, '2026-02-20'::date),
            notes = COALESCE(notes, '') || ' | Intervención consolidada 2026: ' || 'El molino presenta bomba eléctrica y bomba del molino en sistemas independientes. Se extrae la varilla del convertidor debido a que presentaba mucho desgaste y se lleva al Sena para fabricación de la pieza, se extraen 4 tubos en la parte interna y dos en la parte superior, se realiza inserción de 4'
        WHERE concertation_id = v_conc_id;
    ELSE
        INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
        VALUES (v_community_id, 'finalizada', '2026-02-20'::date, 'Concertación comunitaria para intervención de molino.');
    END IF;

    -- 5. Enriquecer diagnóstico existente
    SELECT diagnosis_id INTO v_diag_id FROM public.diagnosis 
    WHERE mill_id = v_mill_id LIMIT 1;
    IF v_diag_id IS NOT NULL THEN
        UPDATE public.diagnosis SET
            status = 'COMPLETED',
            description = 'Mantenimiento preventivo programado. Inspección general de todos los sistemas: bombeo, estructura, freno y aspas.',
            technical_findings = 'Mantenimiento Preventivo',
            notes = 'El molino presenta bomba eléctrica y bomba del molino en sistemas independientes. Se extrae la varilla del convertidor debido a que presentaba mucho desgaste y se lleva al Sena para fabricación de la pieza, se extraen 4 tubos en la parte interna y dos en la parte superior, se realiza inserción de 4 tubos nuevos con su bomba nueva en la parte inferior y dos en la parte superior, se cambia el PVC, se realizan labores de pintura general y ajuste del sistema de freno.',
            diagnosis_type = 'CORRECTIVO',
            diagnosis_date = COALESCE(diagnosis_date, '2026-02-20'::date),
            scheduled_date = COALESCE(scheduled_date, '2026-02-20'::date),
            start_date = COALESCE(start_date, '2026-02-20'::timestamptz),
            completion_date = COALESCE(completion_date, '2026-02-20'::timestamptz)
        WHERE diagnosis_id = v_diag_id;
    ELSE
        INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
        VALUES ('DX-MIG26-007', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Mantenimiento preventivo programado. Inspección general de todos los sistemas: bombeo, estructura, freno y aspas.', 'Mantenimiento Preventivo', '2026-02-20'::date, '2026-02-20'::date, '2026-02-20'::timestamptz, '2026-02-20'::timestamptz)
        RETURNING diagnosis_id INTO v_diag_id;
    END IF;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad ALTOPINO, municipio Maicao. El molino presenta bomba eléctrica y bomba del molino en sistemas independientes. Se extrae la varilla del convertidor debido a que presentaba mucho desgaste y se lleva al Sena para fabricación de la pieza, se extraen 4 tubos en la parte interna y dos en la parte superior, se realiza inserción de 4 tubos nuevos con su bomba nueva en la parte inferior y dos en la parte superior, se cambia el PVC, se realizan labores de pintura general y ajuste del sistema de freno.',
        'Mantenimiento preventivo programado. Inspección general de todos los sistemas: bombeo, estructura, freno y aspas.',
        '2026-02-27',
        '2026-02-27'::timestamptz,
        '2026-02-27'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #8 MARALA (Maicao) [NUEVA]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('MARALA', 'Maicao', 11.428500, -72.484900)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino MARALA', v_community_id, 'OPERATIONAL', 11.428500, -72.484900)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.428500),
            longitude = COALESCE(longitude, -72.484900)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: ANDRÉS RODRIGUEZ
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('ANDRÉS') AND LOWER(last_name) = LOWER('RODRIGUEZ') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('ANDRÉS', 'RODRIGUEZ', 'CC-TEC-72655', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-21'::date, 'Concertación comunitaria para intervención del molino en MARALA.')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-008', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Mantenimiento preventivo programado. Inspección general de todos los sistemas: bombeo, estructura, freno y aspas.', 'Mantenimiento Preventivo', '2026-02-21'::date, '2026-02-21'::date, '2026-02-21'::timestamptz, '2026-02-21'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad MARALA, municipio Maicao. Extracción de 4 tubos en la parte inferior con su bomba antigua y 2 en la parte superior. Se insertan 5 tubos en el interior y 2 en la parte superior con su bomba nueva, se hizo reposición de aceite, cambio de plataforma, cambio de vincha nueva, soldadura en el pivote para mayor ajuste, cambio de materiales de PVC y pintura general de molino.',
        'Mantenimiento preventivo programado. Inspección general de todos los sistemas: bombeo, estructura, freno y aspas.',
        '2026-02-28',
        '2026-02-28'::timestamptz,
        '2026-02-28'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #9 GUAYAKANAL (Maicao) [EXISTENTE → guayacanal]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Buscar comunidad existente
    SELECT community_id INTO v_community_id FROM public.community 
    WHERE LOWER(name) = LOWER('guayacanal') LIMIT 1;
    UPDATE public.community SET 
        latitude = COALESCE(latitude, 11.305400), 
        longitude = COALESCE(longitude, -72.475300),
        municipality = COALESCE(municipality, 'Maicao')
    WHERE community_id = v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino GUAYAKANAL', v_community_id, 'OPERATIONAL', 11.305400, -72.475300)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.305400),
            longitude = COALESCE(longitude, -72.475300)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: ANDRÉS RODRIGUEZ
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('ANDRÉS') AND LOWER(last_name) = LOWER('RODRIGUEZ') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('ANDRÉS', 'RODRIGUEZ', 'CC-TEC-88975', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Enriquecer concertación existente
    SELECT concertation_id INTO v_conc_id FROM public.community_concertation 
    WHERE community_id = v_community_id LIMIT 1;
    IF v_conc_id IS NOT NULL THEN
        UPDATE public.community_concertation SET 
            status = 'finalizada',
            meeting_date = COALESCE(meeting_date, '2026-02-26'::date),
            notes = COALESCE(notes, '') || ' | Intervención consolidada 2026: ' || 'Extracción de la tubería, 6 tubos en el interior con su bomba antigua y 2 en la parte superior, se instala bomba nueva. Se instalan 6 tubos con varillas de 14mm en la parte inferior y 2 en la parte superior, se cambió el flanche, reposición de aceite, cambio de plataforma de madera, cambio del torni'
        WHERE concertation_id = v_conc_id;
    ELSE
        INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
        VALUES (v_community_id, 'finalizada', '2026-02-26'::date, 'Concertación comunitaria para intervención de molino.');
    END IF;

    -- 5. Enriquecer diagnóstico existente
    SELECT diagnosis_id INTO v_diag_id FROM public.diagnosis 
    WHERE mill_id = v_mill_id LIMIT 1;
    IF v_diag_id IS NOT NULL THEN
        UPDATE public.diagnosis SET
            status = 'COMPLETED',
            description = 'Mantenimiento preventivo programado. Inspección general de todos los sistemas: bombeo, estructura, freno y aspas.',
            technical_findings = 'Mantenimiento Preventivo',
            notes = 'Extracción de la tubería, 6 tubos en el interior con su bomba antigua y 2 en la parte superior, se instala bomba nueva. Se instalan 6 tubos con varillas de 14mm en la parte inferior y 2 en la parte superior, se cambió el flanche, reposición de aceite, cambio de plataforma de madera, cambio del tornillo de la varilla del convertidor y por ultimo se realizan labores de pintura.',
            diagnosis_type = 'CORRECTIVO',
            diagnosis_date = COALESCE(diagnosis_date, '2026-02-26'::date),
            scheduled_date = COALESCE(scheduled_date, '2026-02-26'::date),
            start_date = COALESCE(start_date, '2026-02-26'::timestamptz),
            completion_date = COALESCE(completion_date, '2026-02-26'::timestamptz)
        WHERE diagnosis_id = v_diag_id;
    ELSE
        INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
        VALUES ('DX-MIG26-009', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Mantenimiento preventivo programado. Inspección general de todos los sistemas: bombeo, estructura, freno y aspas.', 'Mantenimiento Preventivo', '2026-02-26'::date, '2026-02-26'::date, '2026-02-26'::timestamptz, '2026-02-26'::timestamptz)
        RETURNING diagnosis_id INTO v_diag_id;
    END IF;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad GUAYAKANAL, municipio Maicao. Extracción de la tubería, 6 tubos en el interior con su bomba antigua y 2 en la parte superior, se instala bomba nueva. Se instalan 6 tubos con varillas de 14mm en la parte inferior y 2 en la parte superior, se cambió el flanche, reposición de aceite, cambio de plataforma de madera, cambio del tornillo de la varilla del convertidor y por ultimo se realizan labores de pintura.',
        'Mantenimiento preventivo programado. Inspección general de todos los sistemas: bombeo, estructura, freno y aspas.',
        '2026-03-05',
        '2026-03-05'::timestamptz,
        '2026-03-05'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #10 LA ESTRELLA (Maicao) [NUEVA]
    -- 2025: SÍ | Reintervención: SÍ
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('LA ESTRELLA', 'Maicao', 11.416200, -72.345100)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino LA ESTRELLA', v_community_id, 'OPERATIONAL', 11.416200, -72.345100)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.416200),
            longitude = COALESCE(longitude, -72.345100)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: Andres Rodriguez
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Andres') AND LOWER(last_name) = LOWER('Rodriguez') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Andres', 'Rodriguez', 'CC-TEC-70046', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-11'::date, 'Concertación comunitaria para intervención del molino en LA ESTRELLA.')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-010', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Se reportó falla total en el suministro de agua. El sistema de bombeo presentaba desgaste avanzado requiriendo intervención correctiva.', 'No bota agua', '2026-02-11'::date, '2026-02-11'::date, '2026-02-11'::timestamptz, '2026-02-11'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 6a. Persona responsable 2025: Andres Rodriguez
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Andres') AND LOWER(last_name) = LOWER('Rodriguez') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Andres', 'Rodriguez', 'CC-TEC-96847', true)
        RETURNING person_id INTO v_person_id;
    END IF;

    -- 6b. Concertación 2025
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2025-11-07'::date, 'Concertación comunitaria previa a primera intervención 2025 en LA ESTRELLA.');

    -- 6c. Diagnóstico 2025
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG25-010', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA',
        'Diagnóstico previo a primera intervención 2025 en LA ESTRELLA. MANTENIMIENTO CORRECTIVO, CAMBIO DE BOMBA, FABRICACIÓN DE EJE DEL CONVERTIDOR',
        'MANTENIMIENTO CORRECTIVO, CAMBIO DE BOMBA, FABRICACIÓN DE EJE DEL CONVERTIDOR',
        '2025-11-07'::date,
        '2025-11-07'::date,
        '2025-11-07'::timestamptz,
        '2025-11-07'::timestamptz);

    -- 6d. OT 2025 (primera intervención)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención inicial 2025 en LA ESTRELLA: MANTENIMIENTO CORRECTIVO, CAMBIO DE BOMBA, FABRICACIÓN DE EJE DEL CONVERTIDOR. Se realizaron trabajos de mantenimiento correctivo incluyendo las actividades reportadas para restablecer el funcionamiento del sistema de bombeo eólico.',
        'Diagnóstico inicial previo a intervención 2025 en LA ESTRELLA',
        '2025-11-14',
        '2025-11-14'::timestamptz,
        '2025-11-14'::timestamptz,
        'Intervención completada satisfactoriamente. Molino restablecido a condiciones operativas tras las actividades de mantenimiento correctivo realizadas.',
        NULL);

    -- 7. OT 2026 (REINTERVENCIÓN)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', true, 'MEDIA',
        'Intervención de seguimiento en el molino de la comunidad LA ESTRELLA, municipio Maicao. Se encuentra varilla partida en el tercer tubo, se cambio la varilla y se realiza reconexión.',
        'Se reportó falla total en el suministro de agua. El sistema de bombeo presentaba desgaste avanzado requiriendo intervención correctiva.',
        '2026-02-18',
        '2026-02-18'::timestamptz,
        '2026-02-18'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #11 Perraipa (Manaure) [NUEVA]
    -- 2025: SÍ | Reintervención: SÍ
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('Perraipa', 'Manaure', 11.496600, -72.415700)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Perraipa', v_community_id, 'OPERATIONAL', 11.496600, -72.415700)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.496600),
            longitude = COALESCE(longitude, -72.415700)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: Andres Rodriguez
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Andres') AND LOWER(last_name) = LOWER('Rodriguez') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Andres', 'Rodriguez', 'CC-TEC-1740', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-24'::date, 'Concertación comunitaria para intervención del molino en Perraipa.')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-011', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Se identificó holgura excesiva en la varilla del sistema de transmisión, comprometiendo la eficiencia del mecanismo de bombeo.', 'Varilla suelta del fusible', '2026-02-24'::date, '2026-02-24'::date, '2026-02-24'::timestamptz, '2026-02-24'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 6a. Persona responsable 2025: Andres Rodriguez
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Andres') AND LOWER(last_name) = LOWER('Rodriguez') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Andres', 'Rodriguez', 'CC-TEC-52282', true)
        RETURNING person_id INTO v_person_id;
    END IF;

    -- 6b. Concertación 2025
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2025-10-09'::date, 'Concertación comunitaria previa a primera intervención 2025 en Perraipa.');

    -- 6c. Diagnóstico 2025
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG25-011', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA',
        'Diagnóstico previo a primera intervención 2025 en Perraipa. Se extraen 5 tubos galvanizados en el interior junto con su bomba y 1,5 en la parte superior, se completa el aceite del convertidor, se realizan labores de pintura del molino en general. Se insertan 5 tubos galvanizados, varillas y su bomba reparada, en la parte superior 1,5 tubos galvanizados, se mide recorrido y se conecta varilla al sistema convertidor.  Se realiza reparación de pedestal y se finalizan labores de pintura en la estructura del molino.',
        'Se extraen 5 tubos galvanizados en el interior junto con su bomba y 1,5 en la parte superior, se completa el aceite del convertidor, se realizan labores de pintura del molino en general. Se insertan 5 tubos galvanizados, varillas y su bomba reparada, en la parte superior 1,5 tubos galvanizados, se mide recorrido y se conecta varilla al sistema convertidor.  Se realiza reparación de pedestal y se finalizan labores de pintura en la estructura del molino.',
        '2025-10-09'::date,
        '2025-10-09'::date,
        '2025-10-09'::timestamptz,
        '2025-10-09'::timestamptz);

    -- 6d. OT 2025 (primera intervención)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención inicial 2025 en Perraipa: Se extraen 5 tubos galvanizados en el interior junto con su bomba y 1,5 en la parte superior, se completa el aceite del convertidor, se realizan labores de pintura del molino en general. Se insertan 5 tubos galvanizados, varillas y su bomba reparada, en la parte superior 1,5 tubos galvanizados, se mide recorrido y se conecta varilla al sistema convertidor.  Se realiza reparación de pedestal y se finalizan labores de pintura en la estructura del molino.. Se realizaron trabajos de mantenimiento correctivo incluyendo las actividades reportadas para restablecer el funcionamiento del sistema de bombeo eólico.',
        'Diagnóstico inicial previo a intervención 2025 en Perraipa',
        '2025-10-16',
        '2025-10-16'::timestamptz,
        '2025-10-16'::timestamptz,
        'Intervención completada satisfactoriamente. Molino restablecido a condiciones operativas tras las actividades de mantenimiento correctivo realizadas.',
        NULL);

    -- 7. OT 2026 (REINTERVENCIÓN)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', true, 'MEDIA',
        'Intervención de seguimiento en el molino de la comunidad Perraipa, municipio Manaure. Se encuentra molino en falla, al inspeccionar se observa la varilla suelta del fusible, se ajusta nuevamente la varilla al fusible y se corrige la falla.',
        'Se identificó holgura excesiva en la varilla del sistema de transmisión, comprometiendo la eficiencia del mecanismo de bombeo.',
        '2026-03-03',
        '2026-03-03'::timestamptz,
        '2026-03-03'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #12 Yourepu (Maicao) [NUEVA]
    -- 2025: SÍ | Reintervención: SÍ
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('Yourepu', 'Maicao', 11.401002, -72.405379)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Yourepu', v_community_id, 'OPERATIONAL', 11.401002, -72.405379)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.401002),
            longitude = COALESCE(longitude, -72.405379)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: Andrea Dávila
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Andrea') AND LOWER(last_name) = LOWER('Dávila') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Andrea', 'Dávila', 'CC-TEC-40270', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-11'::date, 'Concertación comunitaria para intervención del molino en Yourepu.')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-012', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Se identificó holgura excesiva en la varilla del sistema de transmisión, comprometiendo la eficiencia del mecanismo de bombeo.', 'Varilla suelta del fusible', '2026-02-11'::date, '2026-02-11'::date, '2026-02-11'::timestamptz, '2026-02-11'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 6a. Persona responsable 2025: Gonzalo Pinedo
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Gonzalo') AND LOWER(last_name) = LOWER('Pinedo') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Gonzalo', 'Pinedo', 'CC-TEC-60778', true)
        RETURNING person_id INTO v_person_id;
    END IF;

    -- 6b. Concertación 2025
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2025-12-02'::date, 'Concertación comunitaria previa a primera intervención 2025 en Yourepu.');

    -- 6c. Diagnóstico 2025
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG25-012', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA',
        'Diagnóstico previo a primera intervención 2025 en Yourepu. CAMBIO DE TUBERIA, CAMBIO DE PLATAFORMA, CAMBIO DE TUBERIA PVC, CAMBIO DE ACEITE, AJUSTE DE SISTEMA DE FRENO',
        'CAMBIO DE TUBERIA, CAMBIO DE PLATAFORMA, CAMBIO DE TUBERIA PVC, CAMBIO DE ACEITE, AJUSTE DE SISTEMA DE FRENO',
        '2025-12-02'::date,
        '2025-12-02'::date,
        '2025-12-02'::timestamptz,
        '2025-12-02'::timestamptz);

    -- 6d. OT 2025 (primera intervención)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención inicial 2025 en Yourepu: CAMBIO DE TUBERIA, CAMBIO DE PLATAFORMA, CAMBIO DE TUBERIA PVC, CAMBIO DE ACEITE, AJUSTE DE SISTEMA DE FRENO. Se realizaron trabajos de mantenimiento correctivo incluyendo las actividades reportadas para restablecer el funcionamiento del sistema de bombeo eólico.',
        'Diagnóstico inicial previo a intervención 2025 en Yourepu',
        '2025-12-09',
        '2025-12-09'::timestamptz,
        '2025-12-09'::timestamptz,
        'Intervención completada satisfactoriamente. Molino restablecido a condiciones operativas tras las actividades de mantenimiento correctivo realizadas.',
        NULL);

    -- 7. OT 2026 (REINTERVENCIÓN)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', true, 'MEDIA',
        'Intervención de seguimiento en el molino de la comunidad Yourepu, municipio Maicao. Se realiza ajuste de recorrido (el cual estaba suelto) y se lubrica el sistema de freno de ls veleta',
        'Se identificó holgura excesiva en la varilla del sistema de transmisión, comprometiendo la eficiencia del mecanismo de bombeo.',
        '2026-02-18',
        '2026-02-18'::timestamptz,
        '2026-02-18'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #13 Juluwawain (Manaure) [NUEVA]
    -- 2025: SÍ | Reintervención: NO
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('Juluwawain', 'Manaure', 11.686137, -72.657483)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Juluwawain', v_community_id, 'OPERATIONAL', 11.686137, -72.657483)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.686137),
            longitude = COALESCE(longitude, -72.657483)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: Andrea Dávila
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Andrea') AND LOWER(last_name) = LOWER('Dávila') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Andrea', 'Dávila', 'CC-TEC-93222', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-13'::date, 'Concertación comunitaria para intervención del molino en Juluwawain. Queda pendiente sistema de freno (Guaya de freno, pieza #585, varilla L, pasador de cola, vincha #12)')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-013', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Hallazgo técnico: Sistema de freno y bomba cilindrica en mal estado. Se procedió con la intervención correctiva correspondiente.', 'Sistema de freno y bomba cilindrica en mal estado', '2026-02-13'::date, '2026-02-13'::date, '2026-02-13'::timestamptz, '2026-02-13'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 6a. Persona responsable 2025: Andrea Dávila
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Andrea') AND LOWER(last_name) = LOWER('Dávila') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Andrea', 'Dávila', 'CC-TEC-57938', true)
        RETURNING person_id INTO v_person_id;
    END IF;

    -- 6b. Concertación 2025
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2025-11-06'::date, 'Concertación comunitaria previa a primera intervención 2025 en Juluwawain.');

    -- 6c. Diagnóstico 2025
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG25-013', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA',
        'Diagnóstico previo a primera intervención 2025 en Juluwawain. Cambio de flanche, pintura, cambio de tuberia galvanizada, cambio de plataforma, restauración de sistema de freno, NF 24 metros',
        'Cambio de flanche, pintura, cambio de tuberia galvanizada, cambio de plataforma, restauración de sistema de freno, NF 24 metros',
        '2025-11-06'::date,
        '2025-11-06'::date,
        '2025-11-06'::timestamptz,
        '2025-11-06'::timestamptz);

    -- 6d. OT 2025 (primera intervención)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención inicial 2025 en Juluwawain: Cambio de flanche, pintura, cambio de tuberia galvanizada, cambio de plataforma, restauración de sistema de freno, NF 24 metros. Se realizaron trabajos de mantenimiento correctivo incluyendo las actividades reportadas para restablecer el funcionamiento del sistema de bombeo eólico.',
        'Diagnóstico inicial previo a intervención 2025 en Juluwawain',
        '2025-11-13',
        '2025-11-13'::timestamptz,
        '2025-11-13'::timestamptz,
        'Intervención completada satisfactoriamente. Molino restablecido a condiciones operativas tras las actividades de mantenimiento correctivo realizadas.',
        'Queda pendiente sistema de freno (Guaya de freno, pieza #585, varilla L, pasador de cola, vincha #12)');

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención de seguimiento en el molino de la comunidad Juluwawain, municipio Manaure. Cambio de bomba de rosca interna restaurada en taller',
        'Hallazgo técnico: Sistema de freno y bomba cilindrica en mal estado. Se procedió con la intervención correctiva correspondiente.',
        '2026-02-20',
        '2026-02-20'::timestamptz,
        '2026-02-20'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas. Observaciones: Queda pendiente sistema de freno (Guaya de freno, pieza #585, varilla L, pasador de cola, vincha #12)',
        'Queda pendiente sistema de freno (Guaya de freno, pieza #585, varilla L, pasador de cola, vincha #12)');

    -- ================================================================
    -- #14 Ceura 1 (Maicao) [EXISTENTE → caura 1]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Buscar comunidad existente
    SELECT community_id INTO v_community_id FROM public.community 
    WHERE LOWER(name) = LOWER('caura 1') LIMIT 1;
    UPDATE public.community SET 
        latitude = COALESCE(latitude, 11.428057), 
        longitude = COALESCE(longitude, -72.499477),
        municipality = COALESCE(municipality, 'Maicao')
    WHERE community_id = v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Ceura 1', v_community_id, 'OPERATIONAL', 11.428057, -72.499477)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.428057),
            longitude = COALESCE(longitude, -72.499477)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: Andrea Dávila
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Andrea') AND LOWER(last_name) = LOWER('Dávila') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Andrea', 'Dávila', 'CC-TEC-14832', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Enriquecer concertación existente
    SELECT concertation_id INTO v_conc_id FROM public.community_concertation 
    WHERE community_id = v_community_id LIMIT 1;
    IF v_conc_id IS NOT NULL THEN
        UPDATE public.community_concertation SET 
            status = 'finalizada',
            meeting_date = COALESCE(meeting_date, '2026-02-19'::date),
            notes = COALESCE(notes, '') || ' | Intervención consolidada 2026: ' || 'Se realiza la extracción de la tubería (6 tramos hacia abajo, 2 hacia arriba), se realiza ajuste y restauración del sistema de freno, cambio de flanche, pintura y cambio de tubería PVC
--- Segunda visita ---
Se realiza la extracción de la tubería (5 tramos hacia abajo, 2 hacia arriba), pero se inclu'
        WHERE concertation_id = v_conc_id;
    ELSE
        INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
        VALUES (v_community_id, 'finalizada', '2026-02-19'::date, 'Concertación comunitaria para intervención de molino. Pendiente acta de entrega. Pendiente acta de entrega');
    END IF;

    -- 5. Enriquecer diagnóstico existente
    SELECT diagnosis_id INTO v_diag_id FROM public.diagnosis 
    WHERE mill_id = v_mill_id LIMIT 1;
    IF v_diag_id IS NOT NULL THEN
        UPDATE public.diagnosis SET
            status = 'COMPLETED',
            description = 'Inspección y mantenimiento general. Se realiza la extracción de la tubería (6 tramos hacia abajo, 2 hacia arriba), se realiza ajuste y restauración del sistema de freno, cambio de flanche, pintura y cambio de tubería PVC
--- Segunda vis',
            technical_findings = 'Inspección general',
            notes = 'Se realiza la extracción de la tubería (6 tramos hacia abajo, 2 hacia arriba), se realiza ajuste y restauración del sistema de freno, cambio de flanche, pintura y cambio de tubería PVC
--- Segunda visita ---
Se realiza la extracción de la tubería (5 tramos hacia abajo, 2 hacia arriba), pero se incluye un tramo más (6 hacia abajo y 2 hacia arriba) se realiza ajuste y restauración del sistema de freno, cambio de flanche, pintura y cambio de tubería PVC',
            diagnosis_type = 'CORRECTIVO',
            diagnosis_date = COALESCE(diagnosis_date, '2026-02-19'::date),
            scheduled_date = COALESCE(scheduled_date, '2026-02-19'::date),
            start_date = COALESCE(start_date, '2026-02-19'::timestamptz),
            completion_date = COALESCE(completion_date, '2026-02-19'::timestamptz)
        WHERE diagnosis_id = v_diag_id;
    ELSE
        INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
        VALUES ('DX-MIG26-014', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Inspección y mantenimiento general. Se realiza la extracción de la tubería (6 tramos hacia abajo, 2 hacia arriba), se realiza ajuste y restauración del sistema de freno, cambio de flanche, pintura y cambio de tubería PVC
--- Segunda vis', 'Inspección general', '2026-02-19'::date, '2026-02-19'::date, '2026-02-19'::timestamptz, '2026-02-19'::timestamptz)
        RETURNING diagnosis_id INTO v_diag_id;
    END IF;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad Ceura 1, municipio Maicao. Se realiza la extracción de la tubería (6 tramos hacia abajo, 2 hacia arriba), se realiza ajuste y restauración del sistema de freno, cambio de flanche, pintura y cambio de tubería PVC
--- Segunda visita ---
Se realiza la extracción de la tubería (5 tramos hacia abajo, 2 hacia arriba), pero se incluye un tramo más (6 hacia abajo y 2 hacia arriba) se realiza ajuste y restauración del sistema de freno, cambio de flanche, pintura y cambio de tubería PVC',
        'Inspección y mantenimiento general. Se realiza la extracción de la tubería (6 tramos hacia abajo, 2 hacia arriba), se realiza ajuste y restauración del sistema de freno, cambio de flanche, pintura y cambio de tubería PVC
--- Segunda vis',
        '2026-02-26',
        '2026-02-26'::timestamptz,
        '2026-02-26'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas. Observaciones: Pendiente acta de entrega. Pendiente acta de entrega',
        'Pendiente acta de entrega. Pendiente acta de entrega');

    -- ================================================================
    -- #16 Juralen (Manaure) [NUEVA]
    -- 2025: SÍ | Reintervención: NO
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('Juralen', 'Manaure', 11.475165, -72.591729)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Juralen', v_community_id, 'OPERATIONAL', 11.475165, -72.591729)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.475165),
            longitude = COALESCE(longitude, -72.591729)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: Andrea Dávila
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Andrea') AND LOWER(last_name) = LOWER('Dávila') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Andrea', 'Dávila', 'CC-TEC-38415', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-25'::date, 'Concertación comunitaria para intervención del molino en Juralen.')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-016', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Hallazgo técnico: Cambio de varilla 1/2" y bomba cilindrica. Se procedió con la intervención correctiva correspondiente.', 'Cambio de varilla 1/2" y bomba cilindrica', '2026-02-25'::date, '2026-02-25'::date, '2026-02-25'::timestamptz, '2026-02-25'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 6a. Persona responsable 2025: Andres Bonivento
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Andres') AND LOWER(last_name) = LOWER('Bonivento') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Andres', 'Bonivento', 'CC-TEC-19360', true)
        RETURNING person_id INTO v_person_id;
    END IF;

    -- 6b. Concertación 2025
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2025-11-14'::date, 'Concertación comunitaria previa a primera intervención 2025 en Juralen.');

    -- 6c. Diagnóstico 2025
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG25-016', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA',
        'Diagnóstico previo a primera intervención 2025 en Juralen. CAMBIO DE SISTEMA DE BOMBEO: BOMBA + TUBOS 5 INF + 2 SUP; NIVEL FREATICO 27 MTS; CAMBIO DE TUBERÍA PVC; CAMBIO DE ACEITE; PINTURA',
        'CAMBIO DE SISTEMA DE BOMBEO: BOMBA + TUBOS 5 INF + 2 SUP; NIVEL FREATICO 27 MTS; CAMBIO DE TUBERÍA PVC; CAMBIO DE ACEITE; PINTURA',
        '2025-11-14'::date,
        '2025-11-14'::date,
        '2025-11-14'::timestamptz,
        '2025-11-14'::timestamptz);

    -- 6d. OT 2025 (primera intervención)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención inicial 2025 en Juralen: CAMBIO DE SISTEMA DE BOMBEO: BOMBA + TUBOS 5 INF + 2 SUP; NIVEL FREATICO 27 MTS; CAMBIO DE TUBERÍA PVC; CAMBIO DE ACEITE; PINTURA. Se realizaron trabajos de mantenimiento correctivo incluyendo las actividades reportadas para restablecer el funcionamiento del sistema de bombeo eólico.',
        'Diagnóstico inicial previo a intervención 2025 en Juralen',
        '2025-11-21',
        '2025-11-21'::timestamptz,
        '2025-11-21'::timestamptz,
        'Intervención completada satisfactoriamente. Molino restablecido a condiciones operativas tras las actividades de mantenimiento correctivo realizadas.',
        NULL);

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención de seguimiento en el molino de la comunidad Juralen, municipio Manaure. Se realiza extracción de tubería galvanizadas, el cual se valida que tiene dos varillas desprendidas y la bomba se encuentra en mal estado. Se incluye una tubería extra (6 tramos hacia abajo, 2 hacia arriba), cambio de bomba y restauración de tubería PVC',
        'Hallazgo técnico: Cambio de varilla 1/2" y bomba cilindrica. Se procedió con la intervención correctiva correspondiente.',
        '2026-03-04',
        '2026-03-04'::timestamptz,
        '2026-03-04'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #17 Kousatchon (RIOHACHA) [EXISTENTE → coushotchon]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Buscar comunidad existente
    SELECT community_id INTO v_community_id FROM public.community 
    WHERE LOWER(name) = LOWER('coushotchon') LIMIT 1;
    UPDATE public.community SET 
        latitude = COALESCE(latitude, 11.406198), 
        longitude = COALESCE(longitude, -72.891708),
        municipality = COALESCE(municipality, 'RIOHACHA')
    WHERE community_id = v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Kousatchon', v_community_id, 'OPERATIONAL', 11.406198, -72.891708)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.406198),
            longitude = COALESCE(longitude, -72.891708)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: ANDRES BONIVENTO
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('ANDRES') AND LOWER(last_name) = LOWER('BONIVENTO') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('ANDRES', 'BONIVENTO', 'CC-TEC-95300', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Enriquecer concertación existente
    SELECT concertation_id INTO v_conc_id FROM public.community_concertation 
    WHERE community_id = v_community_id LIMIT 1;
    IF v_conc_id IS NOT NULL THEN
        UPDATE public.community_concertation SET 
            status = 'finalizada',
            meeting_date = COALESCE(meeting_date, '2026-02-14'::date),
            notes = COALESCE(notes, '') || ' | Intervención consolidada 2026: ' || 'CAMBIO DE SISTEMA DE BOMBEO: BOMBA + TUBOS 7 INF + 2 SUP; NIVEL FREATICO 38 MTS; CAMBIO DE TUBERÍA PVC; CAMBIO DE ACEITE; PINTURA; CAMBIO DE PLATAFORMA; DESINSTALACION E INSTALACIÓN DE BOMBA ELECTRICA SUMERGIBLE.'
        WHERE concertation_id = v_conc_id;
    ELSE
        INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
        VALUES (v_community_id, 'finalizada', '2026-02-14'::date, 'Concertación comunitaria para intervención de molino. Pendiente acta de entrega');
    END IF;

    -- 5. Enriquecer diagnóstico existente
    SELECT diagnosis_id INTO v_diag_id FROM public.diagnosis 
    WHERE mill_id = v_mill_id LIMIT 1;
    IF v_diag_id IS NOT NULL THEN
        UPDATE public.diagnosis SET
            status = 'COMPLETED',
            description = 'Mantenimiento general integral del molino. Revisión completa de sistemas mecánicos, hidráulicos y estructurales.',
            technical_findings = 'Mantenimiento general',
            notes = 'CAMBIO DE SISTEMA DE BOMBEO: BOMBA + TUBOS 7 INF + 2 SUP; NIVEL FREATICO 38 MTS; CAMBIO DE TUBERÍA PVC; CAMBIO DE ACEITE; PINTURA; CAMBIO DE PLATAFORMA; DESINSTALACION E INSTALACIÓN DE BOMBA ELECTRICA SUMERGIBLE.',
            diagnosis_type = 'CORRECTIVO',
            diagnosis_date = COALESCE(diagnosis_date, '2026-02-14'::date),
            scheduled_date = COALESCE(scheduled_date, '2026-02-14'::date),
            start_date = COALESCE(start_date, '2026-02-14'::timestamptz),
            completion_date = COALESCE(completion_date, '2026-02-14'::timestamptz)
        WHERE diagnosis_id = v_diag_id;
    ELSE
        INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
        VALUES ('DX-MIG26-017', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Mantenimiento general integral del molino. Revisión completa de sistemas mecánicos, hidráulicos y estructurales.', 'Mantenimiento general', '2026-02-14'::date, '2026-02-14'::date, '2026-02-14'::timestamptz, '2026-02-14'::timestamptz)
        RETURNING diagnosis_id INTO v_diag_id;
    END IF;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad Kousatchon, municipio RIOHACHA. CAMBIO DE SISTEMA DE BOMBEO: BOMBA + TUBOS 7 INF + 2 SUP; NIVEL FREATICO 38 MTS; CAMBIO DE TUBERÍA PVC; CAMBIO DE ACEITE; PINTURA; CAMBIO DE PLATAFORMA; DESINSTALACION E INSTALACIÓN DE BOMBA ELECTRICA SUMERGIBLE.',
        'Mantenimiento general integral del molino. Revisión completa de sistemas mecánicos, hidráulicos y estructurales.',
        '2026-02-21',
        '2026-02-21'::timestamptz,
        '2026-02-21'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas. Observaciones: Pendiente acta de entrega',
        'Pendiente acta de entrega');

    -- ================================================================
    -- #18 Ceura 2 (Maicao) [EXISTENTE → ceura 2]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Buscar comunidad existente
    SELECT community_id INTO v_community_id FROM public.community 
    WHERE LOWER(name) = LOWER('ceura 2') LIMIT 1;
    UPDATE public.community SET 
        latitude = COALESCE(latitude, 11.429428), 
        longitude = COALESCE(longitude, 72.491752),
        municipality = COALESCE(municipality, 'Maicao')
    WHERE community_id = v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino Ceura 2', v_community_id, 'OPERATIONAL', 11.429428, 72.491752)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.429428),
            longitude = COALESCE(longitude, 72.491752)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: ANDRES BONIVENTO
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('ANDRES') AND LOWER(last_name) = LOWER('BONIVENTO') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('ANDRES', 'BONIVENTO', 'CC-TEC-42393', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Enriquecer concertación existente
    SELECT concertation_id INTO v_conc_id FROM public.community_concertation 
    WHERE community_id = v_community_id LIMIT 1;
    IF v_conc_id IS NOT NULL THEN
        UPDATE public.community_concertation SET 
            status = 'finalizada',
            meeting_date = COALESCE(meeting_date, '2026-02-20'::date),
            notes = COALESCE(notes, '') || ' | Intervención consolidada 2026: ' || 'CAMBIO DE SISTEMA DE BOMBEO: BOMBA + TUBOS 5 INF + 2 SUP; NIVEL FREATICO 28 MTS; CAMBIO DE TUBERÍA PVC; CAMBIO DE ACEITE; PINTURA; CAMBIO DE PLATAFORMA; RECONSTRUCCION DE PEDESTAL.'
        WHERE concertation_id = v_conc_id;
    ELSE
        INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
        VALUES (v_community_id, 'finalizada', '2026-02-20'::date, 'Concertación comunitaria para intervención de molino. Pendiente acta de entrega');
    END IF;

    -- 5. Enriquecer diagnóstico existente
    SELECT diagnosis_id INTO v_diag_id FROM public.diagnosis 
    WHERE mill_id = v_mill_id LIMIT 1;
    IF v_diag_id IS NOT NULL THEN
        UPDATE public.diagnosis SET
            status = 'COMPLETED',
            description = 'Mantenimiento general integral del molino. Revisión completa de sistemas mecánicos, hidráulicos y estructurales.',
            technical_findings = 'Mantenimiento general',
            notes = 'CAMBIO DE SISTEMA DE BOMBEO: BOMBA + TUBOS 5 INF + 2 SUP; NIVEL FREATICO 28 MTS; CAMBIO DE TUBERÍA PVC; CAMBIO DE ACEITE; PINTURA; CAMBIO DE PLATAFORMA; RECONSTRUCCION DE PEDESTAL.',
            diagnosis_type = 'CORRECTIVO',
            diagnosis_date = COALESCE(diagnosis_date, '2026-02-20'::date),
            scheduled_date = COALESCE(scheduled_date, '2026-02-20'::date),
            start_date = COALESCE(start_date, '2026-02-20'::timestamptz),
            completion_date = COALESCE(completion_date, '2026-02-20'::timestamptz)
        WHERE diagnosis_id = v_diag_id;
    ELSE
        INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
        VALUES ('DX-MIG26-018', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Mantenimiento general integral del molino. Revisión completa de sistemas mecánicos, hidráulicos y estructurales.', 'Mantenimiento general', '2026-02-20'::date, '2026-02-20'::date, '2026-02-20'::timestamptz, '2026-02-20'::timestamptz)
        RETURNING diagnosis_id INTO v_diag_id;
    END IF;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad Ceura 2, municipio Maicao. CAMBIO DE SISTEMA DE BOMBEO: BOMBA + TUBOS 5 INF + 2 SUP; NIVEL FREATICO 28 MTS; CAMBIO DE TUBERÍA PVC; CAMBIO DE ACEITE; PINTURA; CAMBIO DE PLATAFORMA; RECONSTRUCCION DE PEDESTAL.',
        'Mantenimiento general integral del molino. Revisión completa de sistemas mecánicos, hidráulicos y estructurales.',
        '2026-02-27',
        '2026-02-27'::timestamptz,
        '2026-02-27'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas. Observaciones: Pendiente acta de entrega',
        'Pendiente acta de entrega');

    -- ================================================================
    -- #19 WAYUPIA (MANAURE) [NUEVA]
    -- 2025: SÍ | Reintervención: NO
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('WAYUPIA', 'MANAURE', 11.611124, -72.409207)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino WAYUPIA', v_community_id, 'OPERATIONAL', 11.611124, -72.409207)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.611124),
            longitude = COALESCE(longitude, -72.409207)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: ANDRES BONIVENTO
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('ANDRES') AND LOWER(last_name) = LOWER('BONIVENTO') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('ANDRES', 'BONIVENTO', 'CC-TEC-61699', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-14'::date, 'Concertación comunitaria para intervención del molino en WAYUPIA.')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-019', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Hallazgo técnico: NO HAY SUMINISTRO DE AGUA. Se procedió con la intervención correctiva correspondiente.', 'NO HAY SUMINISTRO DE AGUA', '2026-02-14'::date, '2026-02-14'::date, '2026-02-14'::timestamptz, '2026-02-14'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 6a. Persona responsable 2025: Jina Rodelo
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Jina') AND LOWER(last_name) = LOWER('Rodelo') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Jina', 'Rodelo', 'CC-TEC-14433', true)
        RETURNING person_id INTO v_person_id;
    END IF;

    -- 6b. Concertación 2025
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2025-09-03'::date, 'Concertación comunitaria previa a primera intervención 2025 en WAYUPIA.');

    -- 6c. Diagnóstico 2025
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG25-019', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA',
        'Diagnóstico previo a primera intervención 2025 en WAYUPIA. CAMBIO DE TUBERIA, CAMBIO DE ACEITE, RESTAURACION DE SISTEMA DE FRENO, CAMBIO DE TUBERIA PVC, CAMBIO DE FLANCHE, PINTURA',
        'CAMBIO DE TUBERIA, CAMBIO DE ACEITE, RESTAURACION DE SISTEMA DE FRENO, CAMBIO DE TUBERIA PVC, CAMBIO DE FLANCHE, PINTURA',
        '2025-09-03'::date,
        '2025-09-03'::date,
        '2025-09-03'::timestamptz,
        '2025-09-03'::timestamptz);

    -- 6d. OT 2025 (primera intervención)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención inicial 2025 en WAYUPIA: CAMBIO DE TUBERIA, CAMBIO DE ACEITE, RESTAURACION DE SISTEMA DE FRENO, CAMBIO DE TUBERIA PVC, CAMBIO DE FLANCHE, PINTURA. Se realizaron trabajos de mantenimiento correctivo incluyendo las actividades reportadas para restablecer el funcionamiento del sistema de bombeo eólico.',
        'Diagnóstico inicial previo a intervención 2025 en WAYUPIA',
        '2025-09-10',
        '2025-09-10'::timestamptz,
        '2025-09-10'::timestamptz,
        'Intervención completada satisfactoriamente. Molino restablecido a condiciones operativas tras las actividades de mantenimiento correctivo realizadas.',
        NULL);

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención de seguimiento en el molino de la comunidad WAYUPIA, municipio MANAURE. CAMBIO BOMBA USANDO MISMOS TUBOS, 5 INF + 2 SUP; NIVEL FREATICO 25 MTS; CAMBIO DE 1 VARILLA POR DESGASTE; INSTALACION DE CENTRADOR DE TUBO; RESTAURACION DE SISTEMA DE FRENO; CAMBIO DE ACEITE.',
        'Hallazgo técnico: NO HAY SUMINISTRO DE AGUA. Se procedió con la intervención correctiva correspondiente.',
        '2026-02-21',
        '2026-02-21'::timestamptz,
        '2026-02-21'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #20 PIOLEKAT (MANAURE) [NUEVA]
    -- 2025: SÍ | Reintervención: SÍ
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('PIOLEKAT', 'MANAURE', 11.548559, -72.419186)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino PIOLEKAT', v_community_id, 'OPERATIONAL', 11.548559, -72.419186)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.548559),
            longitude = COALESCE(longitude, -72.419186)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: ANDRES BONIVENTO
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('ANDRES') AND LOWER(last_name) = LOWER('BONIVENTO') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('ANDRES', 'BONIVENTO', 'CC-TEC-172', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-18'::date, 'Concertación comunitaria para intervención del molino en PIOLEKAT. MOLINO INOPERATIVO HASTA CONSEGUIR REEMPLAZO DE PIEZA (MANZANA DE ROTOR)')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-020', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Hallazgo técnico: SISTEMA ROTOR A PUNTO DE CAERSE. Se procedió con la intervención correctiva correspondiente.', 'SISTEMA ROTOR A PUNTO DE CAERSE', '2026-02-18'::date, '2026-02-18'::date, '2026-02-18'::timestamptz, '2026-02-18'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 6a. Persona responsable 2025: Isaac Castillo
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Isaac') AND LOWER(last_name) = LOWER('Castillo') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Isaac', 'Castillo', 'CC-TEC-49021', true)
        RETURNING person_id INTO v_person_id;
    END IF;

    -- 6b. Concertación 2025
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2025-10-17'::date, 'Concertación comunitaria previa a primera intervención 2025 en PIOLEKAT.');

    -- 6c. Diagnóstico 2025
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG25-020', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA',
        'Diagnóstico previo a primera intervención 2025 en PIOLEKAT. Mantenimiento Correctivo General: Cambio de componentes del sistema de Bombeo. Mantenieminto preventivo al sistema convertidor: Cambio de Aceite. Pintura y mantenimeinto preventivo al sistema de freno',
        'Mantenimiento Correctivo General: Cambio de componentes del sistema de Bombeo. Mantenieminto preventivo al sistema convertidor: Cambio de Aceite. Pintura y mantenimeinto preventivo al sistema de freno',
        '2025-10-17'::date,
        '2025-10-17'::date,
        '2025-10-17'::timestamptz,
        '2025-10-17'::timestamptz);

    -- 6d. OT 2025 (primera intervención)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención inicial 2025 en PIOLEKAT: Mantenimiento Correctivo General: Cambio de componentes del sistema de Bombeo. Mantenieminto preventivo al sistema convertidor: Cambio de Aceite. Pintura y mantenimeinto preventivo al sistema de freno. Se realizaron trabajos de mantenimiento correctivo incluyendo las actividades reportadas para restablecer el funcionamiento del sistema de bombeo eólico.',
        'Diagnóstico inicial previo a intervención 2025 en PIOLEKAT',
        '2025-10-24',
        '2025-10-24'::timestamptz,
        '2025-10-24'::timestamptz,
        'Intervención completada satisfactoriamente. Molino restablecido a condiciones operativas tras las actividades de mantenimiento correctivo realizadas.',
        'MOLINO INOPERATIVO HASTA CONSEGUIR REEMPLAZO DE PIEZA (MANZANA DE ROTOR)');

    -- 7. OT 2026 (REINTERVENCIÓN)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', true, 'MEDIA',
        'Intervención de seguimiento en el molino de la comunidad PIOLEKAT, municipio MANAURE. DESMONTAJE DE SISTEMA ROTOR (JUEGOS DE ASPAS Y RADIOS) QUE ESTABA A PUNTO DE CAER POR FALLA/ROTURA DE LA MANZANA DEL ROTOR.
MOLINO INOPERATIVO HASTA CONSEGUIR MANZANA',
        'Hallazgo técnico: SISTEMA ROTOR A PUNTO DE CAERSE. Se procedió con la intervención correctiva correspondiente.',
        '2026-02-25',
        '2026-02-25'::timestamptz,
        '2026-02-25'::timestamptz,
        'Intervención finalizada. MOLINO INOPERATIVO HASTA CONSEGUIR REEMPLAZO DE PIEZA (MANZANA DE ROTOR)',
        'MOLINO INOPERATIVO HASTA CONSEGUIR REEMPLAZO DE PIEZA (MANZANA DE ROTOR)');

    -- ================================================================
    -- #21 ISASHIMANA (MANAURE) [NUEVA]
    -- 2025: SÍ | Reintervención: NO
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('ISASHIMANA', 'MANAURE', 11.747956, -72.400545)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino ISASHIMANA', v_community_id, 'OPERATIONAL', 11.747956, -72.400545)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.747956),
            longitude = COALESCE(longitude, -72.400545)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: ANDRES BONIVENTO
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('ANDRES') AND LOWER(last_name) = LOWER('BONIVENTO') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('ANDRES', 'BONIVENTO', 'CC-TEC-92918', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-25'::date, 'Concertación comunitaria para intervención del molino en ISASHIMANA.')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-021', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Hallazgo técnico: FALLA EN ROTOR, SE CALLERON 3 ASPAS Y SE DAÑO EL FRENO. Se procedió con la intervención correctiva correspondiente.', 'FALLA EN ROTOR, SE CALLERON 3 ASPAS Y SE DAÑO EL FRENO', '2026-02-25'::date, '2026-02-25'::date, '2026-02-25'::timestamptz, '2026-02-25'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 6a. Persona responsable 2025: ANDREA DAVILA
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('ANDREA') AND LOWER(last_name) = LOWER('DAVILA') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('ANDREA', 'DAVILA', 'CC-TEC-15940', true)
        RETURNING person_id INTO v_person_id;
    END IF;

    -- 6b. Concertación 2025
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2025-10-02'::date, 'Concertación comunitaria previa a primera intervención 2025 en ISASHIMANA.');

    -- 6c. Diagnóstico 2025
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG25-021', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA',
        'Diagnóstico previo a primera intervención 2025 en ISASHIMANA. CAMBIO DE TUBERIA, CAMBIO DE ACEITE, RESTAURACION DE SISTEMA DE FRENO, NF 18 METROS, PINTURA, CAMBIO DE TUBERIA PVC',
        'CAMBIO DE TUBERIA, CAMBIO DE ACEITE, RESTAURACION DE SISTEMA DE FRENO, NF 18 METROS, PINTURA, CAMBIO DE TUBERIA PVC',
        '2025-10-02'::date,
        '2025-10-02'::date,
        '2025-10-02'::timestamptz,
        '2025-10-02'::timestamptz);

    -- 6d. OT 2025 (primera intervención)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención inicial 2025 en ISASHIMANA: CAMBIO DE TUBERIA, CAMBIO DE ACEITE, RESTAURACION DE SISTEMA DE FRENO, NF 18 METROS, PINTURA, CAMBIO DE TUBERIA PVC. Se realizaron trabajos de mantenimiento correctivo incluyendo las actividades reportadas para restablecer el funcionamiento del sistema de bombeo eólico.',
        'Diagnóstico inicial previo a intervención 2025 en ISASHIMANA',
        '2025-10-09',
        '2025-10-09'::timestamptz,
        '2025-10-09'::timestamptz,
        'Intervención completada satisfactoriamente. Molino restablecido a condiciones operativas tras las actividades de mantenimiento correctivo realizadas.',
        NULL);

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención de seguimiento en el molino de la comunidad ISASHIMANA, municipio MANAURE. DESMONTAJE DE ASPAS DAÑADAS Y MONTAJE DE NUEVO JUEGO DE 3 ASPAS; RESTAURACION DE SISTEMA DE FRENO CON NUEVAS PLATINAS Y CAMBIO DE GUAYA. CAMBIO DE PLATAFORMA Y CAMBIO DE ACEITE.',
        'Hallazgo técnico: FALLA EN ROTOR, SE CALLERON 3 ASPAS Y SE DAÑO EL FRENO. Se procedió con la intervención correctiva correspondiente.',
        '2026-03-04',
        '2026-03-04'::timestamptz,
        '2026-03-04'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #22 SAN MARTIN PULOI (MANAURE) [NUEVA]
    -- 2025: SÍ | Reintervención: NO
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('SAN MARTIN PULOI', 'MANAURE', 11.728785, -72.508326)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino SAN MARTIN PULOI', v_community_id, 'OPERATIONAL', 11.728785, -72.508326)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.728785),
            longitude = COALESCE(longitude, -72.508326)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: ANDRES BONIVENTO
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('ANDRES') AND LOWER(last_name) = LOWER('BONIVENTO') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('ANDRES', 'BONIVENTO', 'CC-TEC-30611', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-25'::date, 'Concertación comunitaria para intervención del molino en SAN MARTIN PULOI.')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-022', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Hallazgo técnico: NO HAY SUMINISTRO DE AGUA. Se procedió con la intervención correctiva correspondiente.', 'NO HAY SUMINISTRO DE AGUA', '2026-02-25'::date, '2026-02-25'::date, '2026-02-25'::timestamptz, '2026-02-25'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 6a. Persona responsable 2025: MILLER GOMEZ
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('MILLER') AND LOWER(last_name) = LOWER('GOMEZ') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('MILLER', 'GOMEZ', 'CC-TEC-62285', true)
        RETURNING person_id INTO v_person_id;
    END IF;

    -- 6b. Concertación 2025
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2025-11-08'::date, 'Concertación comunitaria previa a primera intervención 2025 en SAN MARTIN PULOI.');

    -- 6c. Diagnóstico 2025
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG25-022', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA',
        'Diagnóstico previo a primera intervención 2025 en SAN MARTIN PULOI. SUSTITUCION DEL SISREMA DE BOMBEO, CAMBIO DE ACEITE AL CONVERTIDOR, PINTURA DE ASPAS Y  LA ESTRUCTURA,CAMBIO DE TUBERIA PVC',
        'SUSTITUCION DEL SISREMA DE BOMBEO, CAMBIO DE ACEITE AL CONVERTIDOR, PINTURA DE ASPAS Y  LA ESTRUCTURA,CAMBIO DE TUBERIA PVC',
        '2025-11-08'::date,
        '2025-11-08'::date,
        '2025-11-08'::timestamptz,
        '2025-11-08'::timestamptz);

    -- 6d. OT 2025 (primera intervención)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención inicial 2025 en SAN MARTIN PULOI: SUSTITUCION DEL SISREMA DE BOMBEO, CAMBIO DE ACEITE AL CONVERTIDOR, PINTURA DE ASPAS Y  LA ESTRUCTURA,CAMBIO DE TUBERIA PVC. Se realizaron trabajos de mantenimiento correctivo incluyendo las actividades reportadas para restablecer el funcionamiento del sistema de bombeo eólico.',
        'Diagnóstico inicial previo a intervención 2025 en SAN MARTIN PULOI',
        '2025-11-15',
        '2025-11-15'::timestamptz,
        '2025-11-15'::timestamptz,
        'Intervención completada satisfactoriamente. Molino restablecido a condiciones operativas tras las actividades de mantenimiento correctivo realizadas.',
        NULL);

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención de seguimiento en el molino de la comunidad SAN MARTIN PULOI, municipio MANAURE. CAMBIO BOMBA USANDO MISMOS TUBOS, 3 INF + 1 SUP; NIVEL FREATICO 15 MTS; CAMBIO DE 1 VARILLA; REAJUSTE DE SISTEMA DE FRENO.',
        'Hallazgo técnico: NO HAY SUMINISTRO DE AGUA. Se procedió con la intervención correctiva correspondiente.',
        '2026-03-04',
        '2026-03-04'::timestamptz,
        '2026-03-04'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #23 SHIPANA (URIBIA) [NUEVA]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('SHIPANA', 'URIBIA', 11.765705, -72.215127)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino SHIPANA', v_community_id, 'OPERATIONAL', 11.765705, -72.215127)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.765705),
            longitude = COALESCE(longitude, -72.215127)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: GONZALO PINEDO
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('GONZALO') AND LOWER(last_name) = LOWER('PINEDO') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('GONZALO', 'PINEDO', 'CC-TEC-34555', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-12'::date, 'Concertación comunitaria para intervención del molino en SHIPANA.')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-023', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Inspección y mantenimiento general. Se encuentra el molino inoperativo hace tiempo según la autoridad, se inicia la actividad de mantenimiento con  
el retiro de 8 tuberías de 2 pulgadas galvanizado y la bomba dañada bloqueada, se reali', 'Inspección general', '2026-02-12'::date, '2026-02-12'::date, '2026-02-12'::timestamptz, '2026-02-12'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad SHIPANA, municipio URIBIA. Se encuentra el molino inoperativo hace tiempo según la autoridad, se inicia la actividad de mantenimiento con  
el retiro de 8 tuberías de 2 pulgadas galvanizado y la bomba dañada bloqueada, se realiza proceso de pintura en las aspas y tapa del convertidor. Se ingresaron 4 tubos nuevos con sus varillas y la instalación de la bomba nueva.
Se culmina a intervención en el molino de la comunidad shipana, se termina de ingresar la tubería y varillas nuevas, se instalan los centradores de tubería así como los portafusible para conectar la bomba con el convertidor, toma de recorrido y pintura completa a la torre. Se deja molino operativo',
        'Inspección y mantenimiento general. Se encuentra el molino inoperativo hace tiempo según la autoridad, se inicia la actividad de mantenimiento con  
el retiro de 8 tuberías de 2 pulgadas galvanizado y la bomba dañada bloqueada, se reali',
        '2026-02-19',
        '2026-02-19'::timestamptz,
        '2026-02-19'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #24 MAISHIMANA (MANAURE) [NUEVA]
    -- 2025: SÍ | Reintervención: SÍ
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('MAISHIMANA', 'MANAURE', 11.639739, -72.625411)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino MAISHIMANA', v_community_id, 'OPERATIONAL', 11.639739, -72.625411)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.639739),
            longitude = COALESCE(longitude, -72.625411)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: GONZALO PINEDO
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('GONZALO') AND LOWER(last_name) = LOWER('PINEDO') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('GONZALO', 'PINEDO', 'CC-TEC-7260', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-13'::date, 'Concertación comunitaria para intervención del molino en MAISHIMANA.')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-024', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Inspección y mantenimiento general. El molino según la comunidad fallo en el mes de enero pero ellos lo mandaron a reparar, presenta fuga por tubería de descenso del tanque elevado pero eso está fuera de los alcances del proyecto, de re', 'Inspección general', '2026-02-13'::date, '2026-02-13'::date, '2026-02-13'::timestamptz, '2026-02-13'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 6a. Persona responsable 2025: GONZALO PINEDO
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('GONZALO') AND LOWER(last_name) = LOWER('PINEDO') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('GONZALO', 'PINEDO', 'CC-TEC-10084', true)
        RETURNING person_id INTO v_person_id;
    END IF;

    -- 6b. Concertación 2025
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2025-09-21'::date, 'Concertación comunitaria previa a primera intervención 2025 en MAISHIMANA.');

    -- 6c. Diagnóstico 2025
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG25-024', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA',
        'Diagnóstico previo a primera intervención 2025 en MAISHIMANA. MANTENIMIENTO GENERAL',
        'MANTENIMIENTO GENERAL',
        '2025-09-21'::date,
        '2025-09-21'::date,
        '2025-09-21'::timestamptz,
        '2025-09-21'::timestamptz);

    -- 6d. OT 2025 (primera intervención)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención inicial 2025 en MAISHIMANA: MANTENIMIENTO GENERAL. Se realizaron trabajos de mantenimiento correctivo incluyendo las actividades reportadas para restablecer el funcionamiento del sistema de bombeo eólico.',
        'Diagnóstico inicial previo a intervención 2025 en MAISHIMANA',
        '2025-09-28',
        '2025-09-28'::timestamptz,
        '2025-09-28'::timestamptz,
        'Intervención completada satisfactoriamente. Molino restablecido a condiciones operativas tras las actividades de mantenimiento correctivo realizadas.',
        NULL);

    -- 7. OT 2026 (REINTERVENCIÓN)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', true, 'MEDIA',
        'Intervención de seguimiento en el molino de la comunidad MAISHIMANA, municipio MANAURE. El molino según la comunidad fallo en el mes de enero pero ellos lo mandaron a reparar, presenta fuga por tubería de descenso del tanque elevado pero eso está fuera de los alcances del proyecto, de realizó la instalación de la escalera de ascenso a la torre, se reparó el centrador de tubería que estaba flojo, se reparó gotera por tubería PVC y se pintó nuevamente.
Se culminó la instalación del sistema de freno y las varillas L.

Sistema de freno funciona pero la vincha está con el resorte viejo, por lo que más adelante se debería cambiar.',
        'Inspección y mantenimiento general. El molino según la comunidad fallo en el mes de enero pero ellos lo mandaron a reparar, presenta fuga por tubería de descenso del tanque elevado pero eso está fuera de los alcances del proyecto, de re',
        '2026-02-20',
        '2026-02-20'::timestamptz,
        '2026-02-20'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #25 YUTCEMA (MANAURE) [NUEVA]
    -- 2025: SÍ | Reintervención: NO
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('YUTCEMA', 'MANAURE', 11.446844, -72.581931)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino YUTCEMA', v_community_id, 'OPERATIONAL', 11.446844, -72.581931)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.446844),
            longitude = COALESCE(longitude, -72.581931)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: GONZALO PINEDO
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('GONZALO') AND LOWER(last_name) = LOWER('PINEDO') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('GONZALO', 'PINEDO', 'CC-TEC-1065', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-20'::date, 'Concertación comunitaria para intervención del molino en YUTCEMA.')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-025', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Inspección y mantenimiento general. Se informa que la comunidad lleva meses sin agua tras la intervención el año pasado, manifiestan que ellos intentaron repararlo pero la bomba se les cayó y tenían una instalada prestada, queda la duda', 'Inspección general', '2026-02-20'::date, '2026-02-20'::date, '2026-02-20'::timestamptz, '2026-02-20'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 6a. Persona responsable 2025: Isaac Castillo
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Isaac') AND LOWER(last_name) = LOWER('Castillo') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Isaac', 'Castillo', 'CC-TEC-86769', true)
        RETURNING person_id INTO v_person_id;
    END IF;

    -- 6b. Concertación 2025
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2025-10-09'::date, 'Concertación comunitaria previa a primera intervención 2025 en YUTCEMA.');

    -- 6c. Diagnóstico 2025
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG25-025', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA',
        'Diagnóstico previo a primera intervención 2025 en YUTCEMA. Mantenimiento Correctivo General: Cambio de componentes del sistema de Bombeo. Mantenieminto preventivo al sistema convertidor: Cambio de Aceite. Pintura y mantenimeinto preventivo al sistema de freno',
        'Mantenimiento Correctivo General: Cambio de componentes del sistema de Bombeo. Mantenieminto preventivo al sistema convertidor: Cambio de Aceite. Pintura y mantenimeinto preventivo al sistema de freno',
        '2025-10-09'::date,
        '2025-10-09'::date,
        '2025-10-09'::timestamptz,
        '2025-10-09'::timestamptz);

    -- 6d. OT 2025 (primera intervención)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención inicial 2025 en YUTCEMA: Mantenimiento Correctivo General: Cambio de componentes del sistema de Bombeo. Mantenieminto preventivo al sistema convertidor: Cambio de Aceite. Pintura y mantenimeinto preventivo al sistema de freno. Se realizaron trabajos de mantenimiento correctivo incluyendo las actividades reportadas para restablecer el funcionamiento del sistema de bombeo eólico.',
        'Diagnóstico inicial previo a intervención 2025 en YUTCEMA',
        '2025-10-16',
        '2025-10-16'::timestamptz,
        '2025-10-16'::timestamptz,
        'Intervención completada satisfactoriamente. Molino restablecido a condiciones operativas tras las actividades de mantenimiento correctivo realizadas.',
        NULL);

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención de seguimiento en el molino de la comunidad YUTCEMA, municipio MANAURE. Se informa que la comunidad lleva meses sin agua tras la intervención el año pasado, manifiestan que ellos intentaron repararlo pero la bomba se les cayó y tenían una instalada prestada, queda la duda pero se procede a revisar el molino.
Se encuentra la bomba con falla del cheque, se reemplaza la bomba por una nueva y se retira un tubo ya que el nivel freático es de 27m y tenía instalado 7 tubos de 6 metros, solo se instalan 6.',
        'Inspección y mantenimiento general. Se informa que la comunidad lleva meses sin agua tras la intervención el año pasado, manifiestan que ellos intentaron repararlo pero la bomba se les cayó y tenían una instalada prestada, queda la duda',
        '2026-02-27',
        '2026-02-27'::timestamptz,
        '2026-02-27'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #26 PINSKY (ALBANIA) [EXISTENTE → pinski]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Buscar comunidad existente
    SELECT community_id INTO v_community_id FROM public.community 
    WHERE LOWER(name) = LOWER('pinski') LIMIT 1;
    UPDATE public.community SET 
        latitude = COALESCE(latitude, 11.285853), 
        longitude = COALESCE(longitude, -72.476253),
        municipality = COALESCE(municipality, 'ALBANIA')
    WHERE community_id = v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino PINSKY', v_community_id, 'OPERATIONAL', 11.285853, -72.476253)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.285853),
            longitude = COALESCE(longitude, -72.476253)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: GONZALO PINEDO
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('GONZALO') AND LOWER(last_name) = LOWER('PINEDO') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('GONZALO', 'PINEDO', 'CC-TEC-14392', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Enriquecer concertación existente
    SELECT concertation_id INTO v_conc_id FROM public.community_concertation 
    WHERE community_id = v_community_id LIMIT 1;
    IF v_conc_id IS NOT NULL THEN
        UPDATE public.community_concertation SET 
            status = 'finalizada',
            meeting_date = COALESCE(meeting_date, '2026-02-21'::date),
            notes = COALESCE(notes, '') || ' | Intervención consolidada 2026: ' || 'Se encuentra molino fuera de servicio por falla dea bomba y agujeros en la tubería inferior. Se realiza el cambio de plataforma y procedo de pintura en aspas, convertidor y toda la parte superior del molino. Se retiran 10 tubos galvanizados y varillas en mal estado y se reemplazan 8 tubos galvanizad'
        WHERE concertation_id = v_conc_id;
    ELSE
        INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
        VALUES (v_community_id, 'finalizada', '2026-02-21'::date, 'Concertación comunitaria para intervención de molino.');
    END IF;

    -- 5. Enriquecer diagnóstico existente
    SELECT diagnosis_id INTO v_diag_id FROM public.diagnosis 
    WHERE mill_id = v_mill_id LIMIT 1;
    IF v_diag_id IS NOT NULL THEN
        UPDATE public.diagnosis SET
            status = 'COMPLETED',
            description = 'Inspección y mantenimiento general. Se encuentra molino fuera de servicio por falla dea bomba y agujeros en la tubería inferior. Se realiza el cambio de plataforma y procedo de pintura en aspas, convertidor y toda la parte superior del',
            technical_findings = 'Inspección general',
            notes = 'Se encuentra molino fuera de servicio por falla dea bomba y agujeros en la tubería inferior. Se realiza el cambio de plataforma y procedo de pintura en aspas, convertidor y toda la parte superior del molino. Se retiran 10 tubos galvanizados y varillas en mal estado y se reemplazan 8 tubos galvanizados y varillas de media pulgada.
Se culmina la instalación de las 2 varillas faltantes y se realiza la conexión del recorrido de la bomba con el convertidor. Molino queda operativo y acta de entrega fi',
            diagnosis_type = 'CORRECTIVO',
            diagnosis_date = COALESCE(diagnosis_date, '2026-02-21'::date),
            scheduled_date = COALESCE(scheduled_date, '2026-02-21'::date),
            start_date = COALESCE(start_date, '2026-02-21'::timestamptz),
            completion_date = COALESCE(completion_date, '2026-02-21'::timestamptz)
        WHERE diagnosis_id = v_diag_id;
    ELSE
        INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
        VALUES ('DX-MIG26-026', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Inspección y mantenimiento general. Se encuentra molino fuera de servicio por falla dea bomba y agujeros en la tubería inferior. Se realiza el cambio de plataforma y procedo de pintura en aspas, convertidor y toda la parte superior del', 'Inspección general', '2026-02-21'::date, '2026-02-21'::date, '2026-02-21'::timestamptz, '2026-02-21'::timestamptz)
        RETURNING diagnosis_id INTO v_diag_id;
    END IF;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad PINSKY, municipio ALBANIA. Se encuentra molino fuera de servicio por falla dea bomba y agujeros en la tubería inferior. Se realiza el cambio de plataforma y procedo de pintura en aspas, convertidor y toda la parte superior del molino. Se retiran 10 tubos galvanizados y varillas en mal estado y se reemplazan 8 tubos galvanizados y varillas de media pulgada.
Se culmina la instalación de las 2 varillas faltantes y se realiza la conexión del recorrido de la bomba con el convertidor. Molino queda operativo y acta de entrega firmada por parte de la autoridad.',
        'Inspección y mantenimiento general. Se encuentra molino fuera de servicio por falla dea bomba y agujeros en la tubería inferior. Se realiza el cambio de plataforma y procedo de pintura en aspas, convertidor y toda la parte superior del',
        '2026-02-28',
        '2026-02-28'::timestamptz,
        '2026-02-28'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #27 SABANA VERDE (MANAURE) [NUEVA]
    -- 2025: SÍ | Reintervención: SÍ
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('SABANA VERDE', 'MANAURE', 11.640953, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino SABANA VERDE', v_community_id, 'OPERATIONAL', 11.640953, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.640953),
            longitude = COALESCE(longitude, NULL)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: GONZALO PINEDO
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('GONZALO') AND LOWER(last_name) = LOWER('PINEDO') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('GONZALO', 'PINEDO', 'CC-TEC-11396', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-01-27'::date, 'Concertación comunitaria para intervención del molino en SABANA VERDE.')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-027', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Inspección y mantenimiento general. Se manifesto falla del molino pero se encontró operativo pero con falla de freno y PVC, se realizó ajuste de guaya de freno y vincha de freno, se aprietan las conexiones de PVC y el centrador de tubo.', 'Inspección general', '2026-01-27'::date, '2026-01-27'::date, '2026-01-27'::timestamptz, '2026-01-27'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 6a. Persona responsable 2025: GONZALO PINEDO
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('GONZALO') AND LOWER(last_name) = LOWER('PINEDO') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('GONZALO', 'PINEDO', 'CC-TEC-5575', true)
        RETURNING person_id INTO v_person_id;
    END IF;

    -- 6b. Concertación 2025
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2025-10-25'::date, 'Concertación comunitaria previa a primera intervención 2025 en SABANA VERDE.');

    -- 6c. Diagnóstico 2025
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG25-027', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA',
        'Diagnóstico previo a primera intervención 2025 en SABANA VERDE. MANTENIMIENTO GENERAL',
        'MANTENIMIENTO GENERAL',
        '2025-10-25'::date,
        '2025-10-25'::date,
        '2025-10-25'::timestamptz,
        '2025-10-25'::timestamptz);

    -- 6d. OT 2025 (primera intervención)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención inicial 2025 en SABANA VERDE: MANTENIMIENTO GENERAL. Se realizaron trabajos de mantenimiento correctivo incluyendo las actividades reportadas para restablecer el funcionamiento del sistema de bombeo eólico.',
        'Diagnóstico inicial previo a intervención 2025 en SABANA VERDE',
        '2025-11-01',
        '2025-11-01'::timestamptz,
        '2025-11-01'::timestamptz,
        'Intervención completada satisfactoriamente. Molino restablecido a condiciones operativas tras las actividades de mantenimiento correctivo realizadas.',
        NULL);

    -- 7. OT 2026 (REINTERVENCIÓN)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', true, 'MEDIA',
        'Intervención de seguimiento en el molino de la comunidad SABANA VERDE, municipio MANAURE. Se manifesto falla del molino pero se encontró operativo pero con falla de freno y PVC, se realizó ajuste de guaya de freno y vincha de freno, se aprietan las conexiones de PVC y el centrador de tubo.',
        'Inspección y mantenimiento general. Se manifesto falla del molino pero se encontró operativo pero con falla de freno y PVC, se realizó ajuste de guaya de freno y vincha de freno, se aprietan las conexiones de PVC y el centrador de tubo.',
        '2026-02-03',
        '2026-02-03'::timestamptz,
        '2026-02-03'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #28 LAS DELICIAS (MAICAO) [EXISTENTE → las delicias]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Buscar comunidad existente
    SELECT community_id INTO v_community_id FROM public.community 
    WHERE LOWER(name) = LOWER('las delicias') LIMIT 1;
    UPDATE public.community SET 
        latitude = COALESCE(latitude, 11.351338), 
        longitude = COALESCE(longitude, -72.269538),
        municipality = COALESCE(municipality, 'MAICAO')
    WHERE community_id = v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino LAS DELICIAS', v_community_id, 'OPERATIONAL', 11.351338, -72.269538)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.351338),
            longitude = COALESCE(longitude, -72.269538)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: GONZALO PINEDO
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('GONZALO') AND LOWER(last_name) = LOWER('PINEDO') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('GONZALO', 'PINEDO', 'CC-TEC-93028', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Enriquecer concertación existente
    SELECT concertation_id INTO v_conc_id FROM public.community_concertation 
    WHERE community_id = v_community_id LIMIT 1;
    IF v_conc_id IS NOT NULL THEN
        UPDATE public.community_concertation SET 
            status = 'finalizada',
            meeting_date = COALESCE(meeting_date, '2026-02-26'::date),
            notes = COALESCE(notes, '') || ' | Intervención consolidada 2026: ' || 'Se encuentra el molino fuera de servicio y con las tuberías y flanche por fuera, no había bomba y completamente sin sistema de frenos con varilla z y L partidas y la vincha de freno 12 inservible. Se retiraron los tubos y varillas dañadas junto con el flanche y se hizo instalación de las mismas nuev'
        WHERE concertation_id = v_conc_id;
    ELSE
        INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
        VALUES (v_community_id, 'finalizada', '2026-02-26'::date, 'Concertación comunitaria para intervención de molino.');
    END IF;

    -- 5. Enriquecer diagnóstico existente
    SELECT diagnosis_id INTO v_diag_id FROM public.diagnosis 
    WHERE mill_id = v_mill_id LIMIT 1;
    IF v_diag_id IS NOT NULL THEN
        UPDATE public.diagnosis SET
            status = 'COMPLETED',
            description = 'Inspección y mantenimiento general. Se encuentra el molino fuera de servicio y con las tuberías y flanche por fuera, no había bomba y completamente sin sistema de frenos con varilla z y L partidas y la vincha de freno 12 inservible. Se',
            technical_findings = 'Inspección general',
            notes = 'Se encuentra el molino fuera de servicio y con las tuberías y flanche por fuera, no había bomba y completamente sin sistema de frenos con varilla z y L partidas y la vincha de freno 12 inservible. Se retiraron los tubos y varillas dañadas junto con el flanche y se hizo instalación de las mismas nuevas con bomba nueva. Se aplicó la pintura gris a parte de la estructura y las aspas.',
            diagnosis_type = 'CORRECTIVO',
            diagnosis_date = COALESCE(diagnosis_date, '2026-02-26'::date),
            scheduled_date = COALESCE(scheduled_date, '2026-02-26'::date),
            start_date = COALESCE(start_date, '2026-02-26'::timestamptz),
            completion_date = COALESCE(completion_date, '2026-02-26'::timestamptz)
        WHERE diagnosis_id = v_diag_id;
    ELSE
        INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
        VALUES ('DX-MIG26-028', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Inspección y mantenimiento general. Se encuentra el molino fuera de servicio y con las tuberías y flanche por fuera, no había bomba y completamente sin sistema de frenos con varilla z y L partidas y la vincha de freno 12 inservible. Se', 'Inspección general', '2026-02-26'::date, '2026-02-26'::date, '2026-02-26'::timestamptz, '2026-02-26'::timestamptz)
        RETURNING diagnosis_id INTO v_diag_id;
    END IF;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad LAS DELICIAS, municipio MAICAO. Se encuentra el molino fuera de servicio y con las tuberías y flanche por fuera, no había bomba y completamente sin sistema de frenos con varilla z y L partidas y la vincha de freno 12 inservible. Se retiraron los tubos y varillas dañadas junto con el flanche y se hizo instalación de las mismas nuevas con bomba nueva. Se aplicó la pintura gris a parte de la estructura y las aspas.',
        'Inspección y mantenimiento general. Se encuentra el molino fuera de servicio y con las tuberías y flanche por fuera, no había bomba y completamente sin sistema de frenos con varilla z y L partidas y la vincha de freno 12 inservible. Se',
        '2026-03-05',
        '2026-03-05'::timestamptz,
        '2026-03-05'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #29 WAMAYAU (MAICAO) [EXISTENTE → wamayau]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Buscar comunidad existente
    SELECT community_id INTO v_community_id FROM public.community 
    WHERE LOWER(name) = LOWER('wamayau') LIMIT 1;
    UPDATE public.community SET 
        latitude = COALESCE(latitude, 11.457563), 
        longitude = COALESCE(longitude, -72.541878),
        municipality = COALESCE(municipality, 'MAICAO')
    WHERE community_id = v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino WAMAYAU', v_community_id, 'OPERATIONAL', 11.457563, -72.541878)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.457563),
            longitude = COALESCE(longitude, -72.541878)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: JINA RODELO
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('JINA') AND LOWER(last_name) = LOWER('RODELO') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('JINA', 'RODELO', 'CC-TEC-67308', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Enriquecer concertación existente
    SELECT concertation_id INTO v_conc_id FROM public.community_concertation 
    WHERE community_id = v_community_id LIMIT 1;
    IF v_conc_id IS NOT NULL THEN
        UPDATE public.community_concertation SET 
            status = 'finalizada',
            meeting_date = COALESCE(meeting_date, '2026-02-20'::date),
            notes = COALESCE(notes, '') || ' | Intervención consolidada 2026: ' || 'Se  extrae tubería 4 tubos asia abajo y 1.5 hacia arriba.  Nivel freático de 17 metros. Se instalaron 3 tubos hacia abajo y 1.5 hacia arriba. Se realizó trabajo de pintura, aspas y estructura además de el pedestal. Bomba instalada de rosca interna reparada en el Sena. Se cambió PVC.'
        WHERE concertation_id = v_conc_id;
    ELSE
        INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
        VALUES (v_community_id, 'finalizada', '2026-02-20'::date, 'Concertación comunitaria para intervención de molino. Pendiente acta de entrega');
    END IF;

    -- 5. Enriquecer diagnóstico existente
    SELECT diagnosis_id INTO v_diag_id FROM public.diagnosis 
    WHERE mill_id = v_mill_id LIMIT 1;
    IF v_diag_id IS NOT NULL THEN
        UPDATE public.diagnosis SET
            status = 'COMPLETED',
            description = 'Inspección y mantenimiento general. Se  extrae tubería 4 tubos asia abajo y 1.5 hacia arriba.  Nivel freático de 17 metros. Se instalaron 3 tubos hacia abajo y 1.5 hacia arriba. Se realizó trabajo de pintura, aspas y estructura además d',
            technical_findings = 'Inspección general',
            notes = 'Se  extrae tubería 4 tubos asia abajo y 1.5 hacia arriba.  Nivel freático de 17 metros. Se instalaron 3 tubos hacia abajo y 1.5 hacia arriba. Se realizó trabajo de pintura, aspas y estructura además de el pedestal. Bomba instalada de rosca interna reparada en el Sena. Se cambió PVC.',
            diagnosis_type = 'CORRECTIVO',
            diagnosis_date = COALESCE(diagnosis_date, '2026-02-20'::date),
            scheduled_date = COALESCE(scheduled_date, '2026-02-20'::date),
            start_date = COALESCE(start_date, '2026-02-20'::timestamptz),
            completion_date = COALESCE(completion_date, '2026-02-20'::timestamptz)
        WHERE diagnosis_id = v_diag_id;
    ELSE
        INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
        VALUES ('DX-MIG26-029', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Inspección y mantenimiento general. Se  extrae tubería 4 tubos asia abajo y 1.5 hacia arriba.  Nivel freático de 17 metros. Se instalaron 3 tubos hacia abajo y 1.5 hacia arriba. Se realizó trabajo de pintura, aspas y estructura además d', 'Inspección general', '2026-02-20'::date, '2026-02-20'::date, '2026-02-20'::timestamptz, '2026-02-20'::timestamptz)
        RETURNING diagnosis_id INTO v_diag_id;
    END IF;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad WAMAYAU, municipio MAICAO. Se  extrae tubería 4 tubos asia abajo y 1.5 hacia arriba.  Nivel freático de 17 metros. Se instalaron 3 tubos hacia abajo y 1.5 hacia arriba. Se realizó trabajo de pintura, aspas y estructura además de el pedestal. Bomba instalada de rosca interna reparada en el Sena. Se cambió PVC.',
        'Inspección y mantenimiento general. Se  extrae tubería 4 tubos asia abajo y 1.5 hacia arriba.  Nivel freático de 17 metros. Se instalaron 3 tubos hacia abajo y 1.5 hacia arriba. Se realizó trabajo de pintura, aspas y estructura además d',
        '2026-02-27',
        '2026-02-27'::timestamptz,
        '2026-02-27'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas. Observaciones: Pendiente acta de entrega',
        'Pendiente acta de entrega');

    -- ================================================================
    -- #30 JULIAKAT (MANAURE) [NUEVA]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('JULIAKAT', 'MANAURE', NULL, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino JULIAKAT', v_community_id, 'OPERATIONAL', NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, NULL),
            longitude = COALESCE(longitude, NULL)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: JINA RODELO
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('JINA') AND LOWER(last_name) = LOWER('RODELO') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('JINA', 'RODELO', 'CC-TEC-86339', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-14'::date, 'Concertación comunitaria para intervención del molino en JULIAKAT.')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-030', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Inspección y mantenimiento general. Se  extrae tubería 3 tubos asia abajo y 1.5 asia arriba. Nivel freático de 12 metros. Se instalaron 3 tubos asia abajo y 1.5 asia arriba. Se realizó trabajo de pintura, aspas y estructura además de el', 'Inspección general', '2026-02-14'::date, '2026-02-14'::date, '2026-02-14'::timestamptz, '2026-02-14'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad JULIAKAT, municipio MANAURE. Se  extrae tubería 3 tubos asia abajo y 1.5 asia arriba. Nivel freático de 12 metros. Se instalaron 3 tubos asia abajo y 1.5 asia arriba. Se realizó trabajo de pintura, aspas y estructura además de el pedestal. Se cambió PVC.',
        'Inspección y mantenimiento general. Se  extrae tubería 3 tubos asia abajo y 1.5 asia arriba. Nivel freático de 12 metros. Se instalaron 3 tubos asia abajo y 1.5 asia arriba. Se realizó trabajo de pintura, aspas y estructura además de el',
        '2026-02-21',
        '2026-02-21'::timestamptz,
        '2026-02-21'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #31 CEURA 3 (MAICAO) [EXISTENTE → ceura 3]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Buscar comunidad existente
    SELECT community_id INTO v_community_id FROM public.community 
    WHERE LOWER(name) = LOWER('ceura 3') LIMIT 1;
    UPDATE public.community SET 
        latitude = COALESCE(latitude, 11.436003), 
        longitude = COALESCE(longitude, -72.493973),
        municipality = COALESCE(municipality, 'MAICAO')
    WHERE community_id = v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino CEURA 3', v_community_id, 'OPERATIONAL', 11.436003, -72.493973)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.436003),
            longitude = COALESCE(longitude, -72.493973)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: JINA RODELO
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('JINA') AND LOWER(last_name) = LOWER('RODELO') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('JINA', 'RODELO', 'CC-TEC-65165', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Enriquecer concertación existente
    SELECT concertation_id INTO v_conc_id FROM public.community_concertation 
    WHERE community_id = v_community_id LIMIT 1;
    IF v_conc_id IS NOT NULL THEN
        UPDATE public.community_concertation SET 
            status = 'finalizada',
            meeting_date = COALESCE(meeting_date, '2026-02-19'::date),
            notes = COALESCE(notes, '') || ' | Intervención consolidada 2026: ' || 'Se  extrae tubería 5 tubos asia abajo y 1.5 hacia arriba. Nivel freático de 20 metros. Se instalaron 4 tubos hacia abajo y 1.5 hacia arriba. Se realizó trabajo de pintura, aspas y estructura además de el pedestal. Se solda tuerca en dispositivo de freno para mejorar el frenado. Bomba instalada de ro'
        WHERE concertation_id = v_conc_id;
    ELSE
        INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
        VALUES (v_community_id, 'finalizada', '2026-02-19'::date, 'Concertación comunitaria para intervención de molino.');
    END IF;

    -- 5. Enriquecer diagnóstico existente
    SELECT diagnosis_id INTO v_diag_id FROM public.diagnosis 
    WHERE mill_id = v_mill_id LIMIT 1;
    IF v_diag_id IS NOT NULL THEN
        UPDATE public.diagnosis SET
            status = 'COMPLETED',
            description = 'Inspección y mantenimiento general. Se  extrae tubería 5 tubos asia abajo y 1.5 hacia arriba. Nivel freático de 20 metros. Se instalaron 4 tubos hacia abajo y 1.5 hacia arriba. Se realizó trabajo de pintura, aspas y estructura además de',
            technical_findings = 'Inspección general',
            notes = 'Se  extrae tubería 5 tubos asia abajo y 1.5 hacia arriba. Nivel freático de 20 metros. Se instalaron 4 tubos hacia abajo y 1.5 hacia arriba. Se realizó trabajo de pintura, aspas y estructura además de el pedestal. Se solda tuerca en dispositivo de freno para mejorar el frenado. Bomba instalada de rosca interna reparada en el Sena. Se cambió PVC.',
            diagnosis_type = 'CORRECTIVO',
            diagnosis_date = COALESCE(diagnosis_date, '2026-02-19'::date),
            scheduled_date = COALESCE(scheduled_date, '2026-02-19'::date),
            start_date = COALESCE(start_date, '2026-02-19'::timestamptz),
            completion_date = COALESCE(completion_date, '2026-02-19'::timestamptz)
        WHERE diagnosis_id = v_diag_id;
    ELSE
        INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
        VALUES ('DX-MIG26-031', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Inspección y mantenimiento general. Se  extrae tubería 5 tubos asia abajo y 1.5 hacia arriba. Nivel freático de 20 metros. Se instalaron 4 tubos hacia abajo y 1.5 hacia arriba. Se realizó trabajo de pintura, aspas y estructura además de', 'Inspección general', '2026-02-19'::date, '2026-02-19'::date, '2026-02-19'::timestamptz, '2026-02-19'::timestamptz)
        RETURNING diagnosis_id INTO v_diag_id;
    END IF;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad CEURA 3, municipio MAICAO. Se  extrae tubería 5 tubos asia abajo y 1.5 hacia arriba. Nivel freático de 20 metros. Se instalaron 4 tubos hacia abajo y 1.5 hacia arriba. Se realizó trabajo de pintura, aspas y estructura además de el pedestal. Se solda tuerca en dispositivo de freno para mejorar el frenado. Bomba instalada de rosca interna reparada en el Sena. Se cambió PVC.',
        'Inspección y mantenimiento general. Se  extrae tubería 5 tubos asia abajo y 1.5 hacia arriba. Nivel freático de 20 metros. Se instalaron 4 tubos hacia abajo y 1.5 hacia arriba. Se realizó trabajo de pintura, aspas y estructura además de',
        '2026-02-26',
        '2026-02-26'::timestamptz,
        '2026-02-26'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #32 JACHUAIPANA (MAICAO) [EXISTENTE → jachuaipana]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Buscar comunidad existente
    SELECT community_id INTO v_community_id FROM public.community 
    WHERE LOWER(name) = LOWER('jachuaipana') LIMIT 1;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino JACHUAIPANA', v_community_id, 'OPERATIONAL', NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, NULL),
            longitude = COALESCE(longitude, NULL)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: JINA RODELO
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('JINA') AND LOWER(last_name) = LOWER('RODELO') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('JINA', 'RODELO', 'CC-TEC-57265', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Enriquecer concertación existente
    SELECT concertation_id INTO v_conc_id FROM public.community_concertation 
    WHERE community_id = v_community_id LIMIT 1;
    IF v_conc_id IS NOT NULL THEN
        UPDATE public.community_concertation SET 
            status = 'finalizada',
            meeting_date = COALESCE(meeting_date, '2026-02-25'::date),
            notes = COALESCE(notes, '') || ' | Intervención consolidada 2026: ' || 'Se  extrae tubería 5 tubos asia abajo y 1.5 asia arriba. Nivel freático de 21 metros. Se instalaron 4 tubos asia abajo y 1.5 asia arriba. Se realizó trabajo de pintura, aspas y estructura además de el pedestal. Se instala bomba braewin. Se cambió PVC.'
        WHERE concertation_id = v_conc_id;
    ELSE
        INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
        VALUES (v_community_id, 'finalizada', '2026-02-25'::date, 'Concertación comunitaria para intervención de molino.');
    END IF;

    -- 5. Enriquecer diagnóstico existente
    SELECT diagnosis_id INTO v_diag_id FROM public.diagnosis 
    WHERE mill_id = v_mill_id LIMIT 1;
    IF v_diag_id IS NOT NULL THEN
        UPDATE public.diagnosis SET
            status = 'COMPLETED',
            description = 'Inspección y mantenimiento general. Se  extrae tubería 5 tubos asia abajo y 1.5 asia arriba. Nivel freático de 21 metros. Se instalaron 4 tubos asia abajo y 1.5 asia arriba. Se realizó trabajo de pintura, aspas y estructura además de el',
            technical_findings = 'Inspección general',
            notes = 'Se  extrae tubería 5 tubos asia abajo y 1.5 asia arriba. Nivel freático de 21 metros. Se instalaron 4 tubos asia abajo y 1.5 asia arriba. Se realizó trabajo de pintura, aspas y estructura además de el pedestal. Se instala bomba braewin. Se cambió PVC.',
            diagnosis_type = 'CORRECTIVO',
            diagnosis_date = COALESCE(diagnosis_date, '2026-02-25'::date),
            scheduled_date = COALESCE(scheduled_date, '2026-02-25'::date),
            start_date = COALESCE(start_date, '2026-02-25'::timestamptz),
            completion_date = COALESCE(completion_date, '2026-02-25'::timestamptz)
        WHERE diagnosis_id = v_diag_id;
    ELSE
        INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
        VALUES ('DX-MIG26-032', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Inspección y mantenimiento general. Se  extrae tubería 5 tubos asia abajo y 1.5 asia arriba. Nivel freático de 21 metros. Se instalaron 4 tubos asia abajo y 1.5 asia arriba. Se realizó trabajo de pintura, aspas y estructura además de el', 'Inspección general', '2026-02-25'::date, '2026-02-25'::date, '2026-02-25'::timestamptz, '2026-02-25'::timestamptz)
        RETURNING diagnosis_id INTO v_diag_id;
    END IF;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad JACHUAIPANA, municipio MAICAO. Se  extrae tubería 5 tubos asia abajo y 1.5 asia arriba. Nivel freático de 21 metros. Se instalaron 4 tubos asia abajo y 1.5 asia arriba. Se realizó trabajo de pintura, aspas y estructura además de el pedestal. Se instala bomba braewin. Se cambió PVC.',
        'Inspección y mantenimiento general. Se  extrae tubería 5 tubos asia abajo y 1.5 asia arriba. Nivel freático de 21 metros. Se instalaron 4 tubos asia abajo y 1.5 asia arriba. Se realizó trabajo de pintura, aspas y estructura además de el',
        '2026-03-04',
        '2026-03-04'::timestamptz,
        '2026-03-04'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #33 MAICAITO (Maicao) [EXISTENTE → maicaito]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Buscar comunidad existente
    SELECT community_id INTO v_community_id FROM public.community 
    WHERE LOWER(name) = LOWER('maicaito') LIMIT 1;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino MAICAITO', v_community_id, 'OPERATIONAL', NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, NULL),
            longitude = COALESCE(longitude, NULL)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: JOSE DIAZ
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('JOSE') AND LOWER(last_name) = LOWER('DIAZ') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('JOSE', 'DIAZ', 'CC-TEC-64972', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Enriquecer concertación existente
    SELECT concertation_id INTO v_conc_id FROM public.community_concertation 
    WHERE community_id = v_community_id LIMIT 1;
    IF v_conc_id IS NOT NULL THEN
        UPDATE public.community_concertation SET 
            status = 'finalizada',
            meeting_date = COALESCE(meeting_date, '2026-02-27'::date),
            notes = COALESCE(notes, '') || ' | Intervención consolidada 2026: ' || 'Se completa el esquema de recubrimiento anticorrosivo de la estructua, Se instala varilla L faltante y pernos en el sistema de freno. Se prueba y lubrica el sistema de freno y se deja completamente funcional. Se instala varilla de mando en el convertidor. Se realiza prueba de funcionamiento. Molino'
        WHERE concertation_id = v_conc_id;
    ELSE
        INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
        VALUES (v_community_id, 'finalizada', '2026-02-27'::date, 'Concertación comunitaria para intervención de molino. No se reemplazan tubos, por buen estado (cambiados a final de 2024)');
    END IF;

    -- 5. Enriquecer diagnóstico existente
    SELECT diagnosis_id INTO v_diag_id FROM public.diagnosis 
    WHERE mill_id = v_mill_id LIMIT 1;
    IF v_diag_id IS NOT NULL THEN
        UPDATE public.diagnosis SET
            status = 'COMPLETED',
            description = 'Inspección y mantenimiento general. Se completa el esquema de recubrimiento anticorrosivo de la estructua, Se instala varilla L faltante y pernos en el sistema de freno. Se prueba y lubrica el sistema de freno y se deja completamente fu',
            technical_findings = 'Inspección general',
            notes = 'Se completa el esquema de recubrimiento anticorrosivo de la estructua, Se instala varilla L faltante y pernos en el sistema de freno. Se prueba y lubrica el sistema de freno y se deja completamente funcional. Se instala varilla de mando en el convertidor. Se realiza prueba de funcionamiento. Molino 100% operativo y funcional. Se notifica a la autoridad y realiza entrega.',
            diagnosis_type = 'CORRECTIVO',
            diagnosis_date = COALESCE(diagnosis_date, '2026-02-27'::date),
            scheduled_date = COALESCE(scheduled_date, '2026-02-27'::date),
            start_date = COALESCE(start_date, '2026-02-27'::timestamptz),
            completion_date = COALESCE(completion_date, '2026-02-27'::timestamptz)
        WHERE diagnosis_id = v_diag_id;
    ELSE
        INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
        VALUES ('DX-MIG26-033', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Inspección y mantenimiento general. Se completa el esquema de recubrimiento anticorrosivo de la estructua, Se instala varilla L faltante y pernos en el sistema de freno. Se prueba y lubrica el sistema de freno y se deja completamente fu', 'Inspección general', '2026-02-27'::date, '2026-02-27'::date, '2026-02-27'::timestamptz, '2026-02-27'::timestamptz)
        RETURNING diagnosis_id INTO v_diag_id;
    END IF;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad MAICAITO, municipio Maicao. Se completa el esquema de recubrimiento anticorrosivo de la estructua, Se instala varilla L faltante y pernos en el sistema de freno. Se prueba y lubrica el sistema de freno y se deja completamente funcional. Se instala varilla de mando en el convertidor. Se realiza prueba de funcionamiento. Molino 100% operativo y funcional. Se notifica a la autoridad y realiza entrega.',
        'Inspección y mantenimiento general. Se completa el esquema de recubrimiento anticorrosivo de la estructua, Se instala varilla L faltante y pernos en el sistema de freno. Se prueba y lubrica el sistema de freno y se deja completamente fu',
        '2026-03-06',
        '2026-03-06'::timestamptz,
        '2026-03-06'::timestamptz,
        'Intervención finalizada. No se reemplazan tubos, por buen estado (cambiados a final de 2024)',
        'No se reemplazan tubos, por buen estado (cambiados a final de 2024)');

    -- ================================================================
    -- #34 WARRANCA (Maicao) [EXISTENTE → warranka2]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Buscar comunidad existente
    SELECT community_id INTO v_community_id FROM public.community 
    WHERE LOWER(name) = LOWER('warranka2') LIMIT 1;
    UPDATE public.community SET 
        latitude = COALESCE(latitude, 11.480800), 
        longitude = COALESCE(longitude, -72.516300),
        municipality = COALESCE(municipality, 'Maicao')
    WHERE community_id = v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino WARRANCA', v_community_id, 'OPERATIONAL', 11.480800, -72.516300)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.480800),
            longitude = COALESCE(longitude, -72.516300)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: ANDRÉS RODRIGUEZ
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('ANDRÉS') AND LOWER(last_name) = LOWER('RODRIGUEZ') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('ANDRÉS', 'RODRIGUEZ', 'CC-TEC-63574', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Enriquecer concertación existente
    SELECT concertation_id INTO v_conc_id FROM public.community_concertation 
    WHERE community_id = v_community_id LIMIT 1;
    IF v_conc_id IS NOT NULL THEN
        UPDATE public.community_concertation SET 
            status = 'finalizada',
            meeting_date = COALESCE(meeting_date, '2026-02-28'::date),
            notes = COALESCE(notes, '') || ' | Intervención consolidada 2026: ' || 'Extracción de tuberías 4 en la parte interior con su bomba antigua y 2 en la parte superior. Se instalan 4 tubos en la parte inferior con su bomba nueva, se cambia ángulo de la cuadrícula superior de la torre debido a que este se encontraba con mucha deformación, pintura general, cambio de aceite y'
        WHERE concertation_id = v_conc_id;
    ELSE
        INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
        VALUES (v_community_id, 'finalizada', '2026-02-28'::date, 'Concertación comunitaria para intervención de molino. N/A');
    END IF;

    -- 5. Enriquecer diagnóstico existente
    SELECT diagnosis_id INTO v_diag_id FROM public.diagnosis 
    WHERE mill_id = v_mill_id LIMIT 1;
    IF v_diag_id IS NOT NULL THEN
        UPDATE public.diagnosis SET
            status = 'COMPLETED',
            description = 'Mantenimiento preventivo programado. Inspección general de todos los sistemas: bombeo, estructura, freno y aspas.',
            technical_findings = 'Mantenimiento Preventivo',
            notes = 'Extracción de tuberías 4 en la parte interior con su bomba antigua y 2 en la parte superior. Se instalan 4 tubos en la parte inferior con su bomba nueva, se cambia ángulo de la cuadrícula superior de la torre debido a que este se encontraba con mucha deformación, pintura general, cambio de aceite y cambio de PVC.',
            diagnosis_type = 'CORRECTIVO',
            diagnosis_date = COALESCE(diagnosis_date, '2026-02-28'::date),
            scheduled_date = COALESCE(scheduled_date, '2026-02-28'::date),
            start_date = COALESCE(start_date, '2026-02-28'::timestamptz),
            completion_date = COALESCE(completion_date, '2026-02-28'::timestamptz)
        WHERE diagnosis_id = v_diag_id;
    ELSE
        INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
        VALUES ('DX-MIG26-034', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Mantenimiento preventivo programado. Inspección general de todos los sistemas: bombeo, estructura, freno y aspas.', 'Mantenimiento Preventivo', '2026-02-28'::date, '2026-02-28'::date, '2026-02-28'::timestamptz, '2026-02-28'::timestamptz)
        RETURNING diagnosis_id INTO v_diag_id;
    END IF;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad WARRANCA, municipio Maicao. Extracción de tuberías 4 en la parte interior con su bomba antigua y 2 en la parte superior. Se instalan 4 tubos en la parte inferior con su bomba nueva, se cambia ángulo de la cuadrícula superior de la torre debido a que este se encontraba con mucha deformación, pintura general, cambio de aceite y cambio de PVC.',
        'Mantenimiento preventivo programado. Inspección general de todos los sistemas: bombeo, estructura, freno y aspas.',
        '2026-03-07',
        '2026-03-07'::timestamptz,
        '2026-03-07'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas. Observaciones: N/A',
        'N/A');

    -- ================================================================
    -- #35 JATURRUCHON (MANAURE) [NUEVA]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('JATURRUCHON', 'MANAURE', NULL, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino JATURRUCHON', v_community_id, 'OPERATIONAL', NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, NULL),
            longitude = COALESCE(longitude, NULL)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: GONZALO PINEDO
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('GONZALO') AND LOWER(last_name) = LOWER('PINEDO') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('GONZALO', 'PINEDO', 'CC-TEC-19956', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-28'::date, 'Concertación comunitaria para intervención del molino en JATURRUCHON.')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-035', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Inspección y mantenimiento general. Se inicia la jornada de reparación con la identificación de fallas notando tuberías galvanizadas con agujeros, falla total de freno con vincha de freno partida y sin resorte. Pedestal con partes de co', 'Inspección general', '2026-02-28'::date, '2026-02-28'::date, '2026-02-28'::timestamptz, '2026-02-28'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad JATURRUCHON, municipio MANAURE. Se inicia la jornada de reparación con la identificación de fallas notando tuberías galvanizadas con agujeros, falla total de freno con vincha de freno partida y sin resorte. Pedestal con partes de concreto faltantes. Se procedió a realizar el cambio de 6 tuberías galvanizadas y varillas de media pulgada con sus respectivas uniones e instalación de nueva bomba, se pintaron las aspas y la parte superior del molino.
Se culmina la actividad de mantenimiento con la toma del recorrido de la bomba, pintura de la estructura y pedestal, reparación del freno con la instalación de vincha de freno nueva.',
        'Inspección y mantenimiento general. Se inicia la jornada de reparación con la identificación de fallas notando tuberías galvanizadas con agujeros, falla total de freno con vincha de freno partida y sin resorte. Pedestal con partes de co',
        '2026-03-07',
        '2026-03-07'::timestamptz,
        '2026-03-07'::timestamptz,
        'Intervención finalizada. Sin observaciones adicionales.',
        NULL);

    -- ================================================================
    -- #36 CHIMALU (MAICAO) [EXISTENTE → chimalu]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Buscar comunidad existente
    SELECT community_id INTO v_community_id FROM public.community 
    WHERE LOWER(name) = LOWER('chimalu') LIMIT 1;
    UPDATE public.community SET 
        latitude = COALESCE(latitude, 11.343422), 
        longitude = COALESCE(longitude, -72.275947),
        municipality = COALESCE(municipality, 'MAICAO')
    WHERE community_id = v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino CHIMALU', v_community_id, 'OPERATIONAL', 11.343422, -72.275947)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.343422),
            longitude = COALESCE(longitude, -72.275947)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: Felix Guerra
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Felix') AND LOWER(last_name) = LOWER('Guerra') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Felix', 'Guerra', 'CC-TEC-10757', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Enriquecer concertación existente
    SELECT concertation_id INTO v_conc_id FROM public.community_concertation 
    WHERE community_id = v_community_id LIMIT 1;
    IF v_conc_id IS NOT NULL THEN
        UPDATE public.community_concertation SET 
            status = 'finalizada',
            meeting_date = COALESCE(meeting_date, '2026-02-28'::date),
            notes = COALESCE(notes, '') || ' | Intervención consolidada 2026: ' || 'Cambio del sistema de bombeo (bomba nueva), 3,5 tubos parte inferior, 1,7 tubos parte superior, instalacion de plataforma, instalacion de escalones, instalacion de centrador de teflon en la parte superior del tubo, soldadura en tensor inferior de la estructura, pintura de todo el molino.'
        WHERE concertation_id = v_conc_id;
    ELSE
        INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
        VALUES (v_community_id, 'finalizada', '2026-02-28'::date, 'Concertación comunitaria para intervención de molino. El pozo es de poco caudal, algunas veces bombea bien, otras poco caucal y otras veces no bombea');
    END IF;

    -- 5. Enriquecer diagnóstico existente
    SELECT diagnosis_id INTO v_diag_id FROM public.diagnosis 
    WHERE mill_id = v_mill_id LIMIT 1;
    IF v_diag_id IS NOT NULL THEN
        UPDATE public.diagnosis SET
            status = 'COMPLETED',
            description = 'Mantenimiento general integral del molino. Revisión completa de sistemas mecánicos, hidráulicos y estructurales.',
            technical_findings = 'MANTENIMIENTO GENERAL',
            notes = 'Cambio del sistema de bombeo (bomba nueva), 3,5 tubos parte inferior, 1,7 tubos parte superior, instalacion de plataforma, instalacion de escalones, instalacion de centrador de teflon en la parte superior del tubo, soldadura en tensor inferior de la estructura, pintura de todo el molino.',
            diagnosis_type = 'CORRECTIVO',
            diagnosis_date = COALESCE(diagnosis_date, '2026-02-28'::date),
            scheduled_date = COALESCE(scheduled_date, '2026-02-28'::date),
            start_date = COALESCE(start_date, '2026-02-28'::timestamptz),
            completion_date = COALESCE(completion_date, '2026-02-28'::timestamptz)
        WHERE diagnosis_id = v_diag_id;
    ELSE
        INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
        VALUES ('DX-MIG26-036', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Mantenimiento general integral del molino. Revisión completa de sistemas mecánicos, hidráulicos y estructurales.', 'MANTENIMIENTO GENERAL', '2026-02-28'::date, '2026-02-28'::date, '2026-02-28'::timestamptz, '2026-02-28'::timestamptz)
        RETURNING diagnosis_id INTO v_diag_id;
    END IF;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad CHIMALU, municipio MAICAO. Cambio del sistema de bombeo (bomba nueva), 3,5 tubos parte inferior, 1,7 tubos parte superior, instalacion de plataforma, instalacion de escalones, instalacion de centrador de teflon en la parte superior del tubo, soldadura en tensor inferior de la estructura, pintura de todo el molino.',
        'Mantenimiento general integral del molino. Revisión completa de sistemas mecánicos, hidráulicos y estructurales.',
        '2026-03-07',
        '2026-03-07'::timestamptz,
        '2026-03-07'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas. Observaciones: El pozo es de poco caudal, algunas veces bombea bien, otras poco caucal y otras veces no bombea',
        'El pozo es de poco caudal, algunas veces bombea bien, otras poco caucal y otras veces no bombea');

    -- ================================================================
    -- #37 CAPUCHAMANA (MANAURE) [NUEVA]
    -- 2025: NO | Reintervención: SÍ
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('CAPUCHAMANA', 'MANAURE', 11.593820, -72.537285)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino CAPUCHAMANA', v_community_id, 'OPERATIONAL', 11.593820, -72.537285)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, 11.593820),
            longitude = COALESCE(longitude, -72.537285)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: Felix Guerra
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Felix') AND LOWER(last_name) = LOWER('Guerra') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Felix', 'Guerra', 'CC-TEC-35850', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-26'::date, 'Concertación comunitaria para intervención del molino en CAPUCHAMANA.')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-037', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Se detectó el fusible del porta fusible con conexión deficiente, afectando el mecanismo de seguridad del molino.', 'Fusible suelto', '2026-02-26'::date, '2026-02-26'::date, '2026-02-26'::timestamptz, '2026-02-26'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 7. OT 2026 (REINTERVENCIÓN)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', true, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad CAPUCHAMANA, municipio MANAURE. Se aconficiona y modifica el porta fusible, se adecua el  centrador',
        'Se detectó el fusible del porta fusible con conexión deficiente, afectando el mecanismo de seguridad del molino.',
        '2026-03-05',
        '2026-03-05'::timestamptz,
        '2026-03-05'::timestamptz,
        'Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas.',
        NULL);

    -- ================================================================
    -- #38 EL PARAISO (MANAURE) [NUEVA]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('EL PARAISO', 'MANAURE', NULL, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino EL PARAISO', v_community_id, 'OPERATIONAL', NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, NULL),
            longitude = COALESCE(longitude, NULL)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: Andrea Dávila
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('Andrea') AND LOWER(last_name) = LOWER('Dávila') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('Andrea', 'Dávila', 'CC-TEC-32007', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-28'::date, 'Concertación comunitaria para intervención del molino en EL PARAISO.')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-038', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Inspección y mantenimiento general. Se realiza mantenimiento general del molino, incluyendo: cambio de tubería galvanizada (4.5 tubos hacia abajo y 1.5 tubos hacia arriba), cambio de aceite, instalación de bomba nueva, reemplazo de vinc', 'Inspección general', '2026-02-28'::date, '2026-02-28'::date, '2026-02-28'::timestamptz, '2026-02-28'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad EL PARAISO, municipio MANAURE. Se realiza mantenimiento general del molino, incluyendo: cambio de tubería galvanizada (4.5 tubos hacia abajo y 1.5 tubos hacia arriba), cambio de aceite, instalación de bomba nueva, reemplazo de vincha de freno #12, ganchos y U de centrador. Adicionalmente, se realiza cambio de tubería PVC, restauración del flanche y pintura de aspas y pedestal.',
        'Inspección y mantenimiento general. Se realiza mantenimiento general del molino, incluyendo: cambio de tubería galvanizada (4.5 tubos hacia abajo y 1.5 tubos hacia arriba), cambio de aceite, instalación de bomba nueva, reemplazo de vinc',
        '2026-03-07',
        '2026-03-07'::timestamptz,
        '2026-03-07'::timestamptz,
        'Intervención finalizada. Sin observaciones adicionales.',
        NULL);

    -- ================================================================
    -- #39 CHONGOLITO (MANAURE) [NUEVA]
    -- 2025: NO | Reintervención: NO
    -- ================================================================
    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES ('CHONGOLITO', 'MANAURE', NULL, NULL)
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;

    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES ('Molino CHONGOLITO', v_community_id, 'OPERATIONAL', NULL, NULL)
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, NULL),
            longitude = COALESCE(longitude, NULL)
        WHERE mill_id = v_mill_id;
    END IF;

    -- 3. Persona responsable 2026: JINA RODELO
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER('JINA') AND LOWER(last_name) = LOWER('RODELO') LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES ('JINA', 'RODELO', 'CC-TEC-61360', true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;

    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', '2026-02-28'::date, 'Concertación comunitaria para intervención del molino en CHONGOLITO.')
    RETURNING concertation_id INTO v_conc_id;

    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('DX-MIG26-039', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', 'Inspección y mantenimiento general. Se encuentra molino inoperatico con más de un año sin actividad. 
Se  encuentra poso sin tubería. 
Se toma nivel freático de 40.3 metros
Se instalaron 6 tubos y 1 tubo de 4.30m tubos hacia abajo y 1 h', 'Inspección general', '2026-02-28'::date, '2026-02-28'::date, '2026-02-28'::timestamptz, '2026-02-28'::timestamptz)
    RETURNING diagnosis_id INTO v_diag_id;

    -- 7. OT 2026 (meta nueva)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        'Intervención correctiva en el molino de la comunidad CHONGOLITO, municipio MANAURE. Se encuentra molino inoperatico con más de un año sin actividad. 
Se  encuentra poso sin tubería. 
Se toma nivel freático de 40.3 metros
Se instalaron 6 tubos y 1 tubo de 4.30m tubos hacia abajo y 1 hacia arriba. 
Estructura un poco corroida por qué lo que se gratean muchas partes antes de pintar. 
Se realizó trabajo de pintura, aspas y estructura además de el pedestal. 
Se instalo guaya. 
Se reparo el freno.
Se instalo varillas L 
Se instala bomba braewin 
Se cambió PVC.',
        'Inspección y mantenimiento general. Se encuentra molino inoperatico con más de un año sin actividad. 
Se  encuentra poso sin tubería. 
Se toma nivel freático de 40.3 metros
Se instalaron 6 tubos y 1 tubo de 4.30m tubos hacia abajo y 1 h',
        '2026-03-07',
        '2026-03-07'::timestamptz,
        '2026-03-07'::timestamptz,
        'Intervención finalizada. Sin observaciones adicionales.',
        NULL);


END $$;

COMMIT;
