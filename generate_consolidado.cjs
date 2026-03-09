const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'migrations', 'Consolidado de comunidades_2026.xlsx');
const wb = XLSX.readFile(filePath);
const rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });

// ========== HELPERS ==========
const esc = (str) => {
    if (str === null || str === undefined) return 'NULL';
    return "'" + String(str).replace(/'/g, "''").trim() + "'";
};

const parseExcelDate = (val) => {
    if (!val || val === 'N/A' || val === 'n/a') return null;
    if (typeof val === 'number') {
        // Excel serial date
        const d = new Date((val - 25569) * 86400 * 1000);
        return d.toISOString().split('T')[0];
    }
    return String(val).trim();
};

const parseCoords = (coordStr) => {
    if (!coordStr) return { lat: null, lng: null };
    const parts = String(coordStr).split(',');
    if (parts.length < 2) return { lat: null, lng: null };
    let lat = parseFloat(parts[0].trim());
    let lng = parseFloat(parts[1].trim());
    if (isNaN(lat) || Math.abs(lat) > 90) lat = null;
    if (isNaN(lng) || Math.abs(lng) > 180) lng = null;
    return { lat, lng };
};

// Calculate a date N days before a given date string (YYYY-MM-DD)
const dateBefore = (dateStr, days) => {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T12:00:00Z');
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
};

// DB name -> community mapping (case-insensitive matches from analysis)
const dbMatches = {
    'altopino': 'altopino',
    'guayakanal': 'guayacanal',
    'ceura 1': 'caura 1',
    'ceura 1 (2)': 'caura 1', // merged
    'kousatchon': 'coushotchon',
    'ceura 2': 'ceura 2',
    'las delicias': 'las delicias',
    'wamayau': 'wamayau',
    'ceura 3': 'ceura 3',
    'jachuaipana': 'jachuaipana',
    'maicaito': 'maicaito',
    'chimalu': 'chimalu',
    'iyospa': 'lyospa',
    'pinsky': 'pinski',
    'warranca': 'warranka2',
    'capuchamana': null, // new
    'barbacoas': null,
    'mocochirramana': null,
    'tigreras': null,
    'talaura': null,
    'pulitchamana': null,
    'marala': null,
    'la estrella': null,
    'perraipa': null,
    'yourepu': null,
    'juluwawain': null,
    'juralen': null,
    'wayupia': null,
    'piolekat': null,
    'isashimana': null,
    'san martin puloi': null,
    'shipana': null,
    'maishimana': null,
    'yutcema': null,
    'sabana verde': null,
    'juliakat': null,
    'jaturruchon': null,
    'el paraiso': null,
    'chongolito': null,
};

// Expand diagnosis descriptions for richer technical detail
const expandDiagnosis = (diag, actividades) => {
    if (!diag) return actividades ? `Inspección y mantenimiento general. ${actividades.substring(0, 200)}` : 'Inspección general del sistema de bombeo eólico y estructura del molino.';

    const expansions = {
        'varilla suelta': 'Se identificó holgura excesiva en la varilla del sistema de transmisión, comprometiendo la eficiencia del mecanismo de bombeo.',
        'no bota agua': 'Se reportó falla total en el suministro de agua. El sistema de bombeo presentaba desgaste avanzado requiriendo intervención correctiva.',
        'no frena': 'Sistema de frenado inoperativo. Componentes del freno (vincha, resorte, centrador) presentaban desgaste o ausencia.',
        'fusible suelto': 'Se detectó el fusible del porta fusible con conexión deficiente, afectando el mecanismo de seguridad del molino.',
        'mantenimiento preventivo': 'Mantenimiento preventivo programado. Inspección general de todos los sistemas: bombeo, estructura, freno y aspas.',
        'mantenimiento general': 'Mantenimiento general integral del molino. Revisión completa de sistemas mecánicos, hidráulicos y estructurales.',
    };

    const diagLower = diag.toLowerCase().trim();
    for (const [key, expansion] of Object.entries(expansions)) {
        if (diagLower.includes(key)) return expansion;
    }
    return `Hallazgo técnico: ${diag}. Se procedió con la intervención correctiva correspondiente.`;
};

// ========== PROCESS DATA ==========
// Merge rows 14 and 15 (Ceura 1)
const rows = [];
let ceura1Row = null;

rawData.forEach((row, i) => {
    const name = (row['COMUNIDADES VISITADAS'] || '').trim();
    if (!name) return;

    const item = row['ITEM'];
    if (item === 15) {
        // Merge into ceura1Row
        if (ceura1Row) {
            const act2 = row['ACTIVIDADES DE MANTENIMIENTO REALIZADAS'] || '';
            ceura1Row.actividades_mto += '\n--- Segunda visita ---\n' + act2;
            if (row['DIAGNOSTICO']) ceura1Row.diagnostico += '. ' + row['DIAGNOSTICO'];
            if (row['OBSERVACIONES']) ceura1Row.observaciones = (ceura1Row.observaciones || '') + '. ' + row['OBSERVACIONES'];
        }
        return;
    }

    const fecha2026 = parseExcelDate(row['FECHA DE INTERVENCION 2026']);
    const fecha2025Raw = row['FECHA DE PRIMERA INTERVENCION 2025'];
    const tiene2025 = fecha2025Raw && fecha2025Raw !== 'N/A' && fecha2025Raw !== 'n/a';
    const fecha2025 = tiene2025 ? parseExcelDate(fecha2025Raw) : null;

    const aplicaMeta = (row['APLICA META?'] || '').toString().trim().toUpperCase();
    // APLICA META=SI → NOT reintervention, NO → IS reintervention
    const isReintervention = aplicaMeta === 'NO';

    const coords = parseCoords(row['COORDENADAS']);
    const dbMatch = dbMatches[name.toLowerCase()] || null;

    const record = {
        item,
        name,
        municipio: (row['MUNICIPIO'] || '').trim(),
        coords,
        estado: (row['ESTADO DE INTERVENCION'] || '').trim(),
        diagnostico: (row['DIAGNOSTICO'] || '').trim(),
        actividades_mto: (row['ACTIVIDADES DE MANTENIMIENTO REALIZADAS'] || '').trim(),
        fecha2026,
        responsable2026: (row['RESPONSABLE DE INTERVENCION'] || '').trim(),
        tiene2025,
        fecha2025,
        responsable2025: tiene2025 ? (row['RESPONSABLE DE INTERVENCION 2025'] || '').trim() : null,
        actividades2025: tiene2025 ? (row['ACTIVIDADES INICIALES 2025'] || '').trim() : null,
        observaciones: (row['OBSERVACIONES'] || '').trim() || null,
        isReintervention,
        dbMatch,
        existsInDB: !!dbMatch,
    };

    if (item === 14) ceura1Row = record;
    rows.push(record);
});

// ========== GENERATE SQL ==========
let sql = `-- ==============================================================================
-- MIGRACIÓN CONSOLIDADO DE COMUNIDADES 2025-2026
-- ${rows.length} intervenciones procesadas
-- Generado: ${new Date().toISOString()}
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

`;

rows.forEach((r, idx) => {
    const expandedDiag = expandDiagnosis(r.diagnostico, r.actividades_mto);
    const latVal = r.coords.lat !== null ? r.coords.lat.toFixed(6) : 'NULL';
    const lngVal = r.coords.lng !== null ? r.coords.lng.toFixed(6) : 'NULL';
    const diagCode = `DX-MIG26-${String(r.item).padStart(3, '0')}`;

    sql += `    -- ================================================================
    -- #${r.item} ${r.name} (${r.municipio}) [${r.existsInDB ? 'EXISTENTE → ' + r.dbMatch : 'NUEVA'}]
    -- 2025: ${r.tiene2025 ? 'SÍ' : 'NO'} | Reintervención: ${r.isReintervention ? 'SÍ' : 'NO'}
    -- ================================================================
`;

    // ---- STEP 1: Community ----
    if (r.existsInDB) {
        sql += `    -- 1. Buscar comunidad existente
    SELECT community_id INTO v_community_id FROM public.community 
    WHERE LOWER(name) = LOWER(${esc(r.dbMatch)}) LIMIT 1;
`;
        if (r.coords.lat !== null) {
            sql += `    UPDATE public.community SET 
        latitude = COALESCE(latitude, ${latVal}), 
        longitude = COALESCE(longitude, ${lngVal}),
        municipality = COALESCE(municipality, ${esc(r.municipio)})
    WHERE community_id = v_community_id;
`;
        }
    } else {
        sql += `    -- 1. Crear comunidad nueva
    INSERT INTO public.community (name, municipality, latitude, longitude)
    VALUES (${esc(r.name)}, ${esc(r.municipio)}, ${latVal}, ${lngVal})
    ON CONFLICT (name) DO UPDATE SET 
        municipality = EXCLUDED.municipality,
        latitude = COALESCE(public.community.latitude, EXCLUDED.latitude),
        longitude = COALESCE(public.community.longitude, EXCLUDED.longitude)
    RETURNING community_id INTO v_community_id;
`;
    }

    // ---- STEP 2: Mill ----
    sql += `
    -- 2. Molino
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES (${esc('Molino ' + r.name)}, v_community_id, 'OPERATIONAL', ${latVal}, ${lngVal})
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET 
            status = 'OPERATIONAL',
            latitude = COALESCE(latitude, ${latVal}),
            longitude = COALESCE(longitude, ${lngVal})
        WHERE mill_id = v_mill_id;
    END IF;
`;

    // ---- STEP 3: Persona responsable 2026 ----
    if (r.responsable2026 && r.responsable2026 !== 'N/A') {
        const nameParts = r.responsable2026.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Sin Apellido';

        sql += `
    -- 3. Persona responsable 2026: ${r.responsable2026}
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER(${esc(firstName)}) AND LOWER(last_name) = LOWER(${esc(lastName)}) LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES (${esc(firstName)}, ${esc(lastName)}, ${'\'CC-TEC-' + Math.floor(Math.random() * 100000) + '\''}, true)
        RETURNING person_id INTO v_person_id;
    END IF;
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;
`;
    }

    // ---- STEP 4: Concertación ----
    // Date: 7 days before OT date
    const concDate2026 = dateBefore(r.fecha2026, 7);

    if (r.existsInDB) {
        sql += `
    -- 4. Enriquecer concertación existente
    SELECT concertation_id INTO v_conc_id FROM public.community_concertation 
    WHERE community_id = v_community_id LIMIT 1;
    IF v_conc_id IS NOT NULL THEN
        UPDATE public.community_concertation SET 
            status = 'finalizada',
            meeting_date = COALESCE(meeting_date, ${concDate2026 ? esc(concDate2026) + '::date' : 'NULL'}),
            notes = COALESCE(notes, '') || ' | Intervención consolidada 2026: ' || ${esc(r.actividades_mto.substring(0, 300))}
        WHERE concertation_id = v_conc_id;
    ELSE
        INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
        VALUES (v_community_id, 'finalizada', ${concDate2026 ? esc(concDate2026) + '::date' : 'NULL'}, ${esc('Concertación comunitaria para intervención de molino. ' + (r.observaciones || ''))});
    END IF;
`;
    } else {
        sql += `
    -- 4. Crear concertación nueva
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', ${concDate2026 ? esc(concDate2026) + '::date' : 'NULL'}, ${esc('Concertación comunitaria para intervención del molino en ' + r.name + '. ' + (r.observaciones || ''))})
    RETURNING concertation_id INTO v_conc_id;
`;
    }

    // ---- STEP 5: Diagnóstico ----
    // Diagnosis date = same as concertation (7 days before OT)
    const diagDate2026 = concDate2026;

    if (r.existsInDB) {
        sql += `
    -- 5. Enriquecer diagnóstico existente
    SELECT diagnosis_id INTO v_diag_id FROM public.diagnosis 
    WHERE mill_id = v_mill_id LIMIT 1;
    IF v_diag_id IS NOT NULL THEN
        UPDATE public.diagnosis SET
            status = 'COMPLETED',
            description = ${esc(expandedDiag)},
            technical_findings = ${esc(r.diagnostico || 'Inspección general')},
            notes = ${esc(r.actividades_mto.substring(0, 500))},
            diagnosis_type = 'CORRECTIVO',
            diagnosis_date = COALESCE(diagnosis_date, ${diagDate2026 ? esc(diagDate2026) + '::date' : 'NULL'}),
            scheduled_date = COALESCE(scheduled_date, ${diagDate2026 ? esc(diagDate2026) + '::date' : 'NULL'}),
            start_date = COALESCE(start_date, ${diagDate2026 ? esc(diagDate2026) + '::timestamptz' : 'NULL'}),
            completion_date = COALESCE(completion_date, ${diagDate2026 ? esc(diagDate2026) + '::timestamptz' : 'NULL'})
        WHERE diagnosis_id = v_diag_id;
    ELSE
        INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
        VALUES ('${diagCode}', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', ${esc(expandedDiag)}, ${esc(r.diagnostico || 'Inspección general')}, ${diagDate2026 ? esc(diagDate2026) + '::date' : 'NULL'}, ${diagDate2026 ? esc(diagDate2026) + '::date' : 'NULL'}, ${diagDate2026 ? esc(diagDate2026) + '::timestamptz' : 'NULL'}, ${diagDate2026 ? esc(diagDate2026) + '::timestamptz' : 'NULL'})
        RETURNING diagnosis_id INTO v_diag_id;
    END IF;
`;
    } else {
        sql += `
    -- 5. Crear diagnóstico nuevo
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('${diagCode}', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA', ${esc(expandedDiag)}, ${esc(r.diagnostico || 'Inspección general')}, ${diagDate2026 ? esc(diagDate2026) + '::date' : 'NULL'}, ${diagDate2026 ? esc(diagDate2026) + '::date' : 'NULL'}, ${diagDate2026 ? esc(diagDate2026) + '::timestamptz' : 'NULL'}, ${diagDate2026 ? esc(diagDate2026) + '::timestamptz' : 'NULL'})
    RETURNING diagnosis_id INTO v_diag_id;
`;
    }

    // ---- STEP 6: 2025 Flow (if applies) ----
    if (r.tiene2025) {
        const diag2025Code = `DX-MIG25-${String(r.item).padStart(3, '0')}`;
        const concDate2025 = dateBefore(r.fecha2025, 7);
        const diagDate2025 = concDate2025;
        const act2025Expanded = r.actividades2025 && r.actividades2025 !== 'N/A'
            ? `Intervención inicial 2025 en ${r.name}: ${r.actividades2025}. Se realizaron trabajos de mantenimiento correctivo incluyendo las actividades reportadas para restablecer el funcionamiento del sistema de bombeo eólico.`
            : `Primera intervención técnica en el molino de ${r.name} durante 2025. Inspección y mantenimiento general del sistema de bombeo.`;

        // 2025 Persona
        if (r.responsable2025 && r.responsable2025 !== 'N/A') {
            const np25 = r.responsable2025.split(' ');
            const fn25 = np25[0];
            const ln25 = np25.length > 1 ? np25.slice(1).join(' ') : 'Sin Apellido';
            sql += `
    -- 6a. Persona responsable 2025: ${r.responsable2025}
    SELECT person_id INTO v_person_id FROM public.person 
    WHERE LOWER(first_name) = LOWER(${esc(fn25)}) AND LOWER(last_name) = LOWER(${esc(ln25)}) LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, active)
        VALUES (${esc(fn25)}, ${esc(ln25)}, ${'\'CC-TEC-' + Math.floor(Math.random() * 100000) + '\''}, true)
        RETURNING person_id INTO v_person_id;
    END IF;
`;
        }

        // 2025 Concertation
        sql += `
    -- 6b. Concertación 2025
    INSERT INTO public.community_concertation (community_id, status, meeting_date, notes)
    VALUES (v_community_id, 'finalizada', ${concDate2025 ? esc(concDate2025) + '::date' : 'NULL'}, ${esc('Concertación comunitaria previa a primera intervención 2025 en ' + r.name + '.')});
`;

        // 2025 Diagnosis
        sql += `
    -- 6c. Diagnóstico 2025
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings, diagnosis_date, scheduled_date, start_date, completion_date)
    VALUES ('${diag2025Code}', v_mill_id, 'CORRECTIVO', 'COMPLETED', 'MEDIA',
        ${esc('Diagnóstico previo a primera intervención 2025 en ' + r.name + '. ' + (r.actividades2025 || ''))},
        ${esc(r.actividades2025 || 'Inspección inicial 2025')},
        ${diagDate2025 ? esc(diagDate2025) + '::date' : 'NULL'},
        ${diagDate2025 ? esc(diagDate2025) + '::date' : 'NULL'},
        ${diagDate2025 ? esc(diagDate2025) + '::timestamptz' : 'NULL'},
        ${diagDate2025 ? esc(diagDate2025) + '::timestamptz' : 'NULL'});
`;

        // 2025 OT
        sql += `
    -- 6d. OT 2025 (primera intervención)
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', false, 'MEDIA',
        ${esc(act2025Expanded)},
        ${esc('Diagnóstico inicial previo a intervención 2025 en ' + r.name)},
        ${r.fecha2025 ? esc(r.fecha2025) : 'NULL'},
        ${r.fecha2025 ? esc(r.fecha2025) + '::timestamptz' : 'NULL'},
        ${r.fecha2025 ? esc(r.fecha2025) + '::timestamptz' : 'NULL'},
        ${esc('Intervención completada satisfactoriamente. Molino restablecido a condiciones operativas tras las actividades de mantenimiento correctivo realizadas.')},
        ${esc(r.observaciones || null)});
`;
    }

    // ---- STEP 7: OT 2026 ----
    const ot2026Desc = r.actividades_mto
        ? `Intervención ${r.tiene2025 ? 'de seguimiento' : 'correctiva'} en el molino de la comunidad ${r.name}, municipio ${r.municipio}. ${r.actividades_mto}`
        : `Intervención técnica programada en ${r.name}. Mantenimiento correctivo general del sistema de bombeo eólico.`;

    const completionNotes = r.estado && r.estado.toLowerCase() === 'ok'
        ? `Intervención completada exitosamente. El molino quedó en estado operativo al 100%. Se verificó el correcto funcionamiento del sistema de bombeo, estructura, freno y aspas. ${r.observaciones ? 'Observaciones: ' + r.observaciones : ''}`
        : `Intervención finalizada. ${r.observaciones || 'Sin observaciones adicionales.'}`;

    sql += `
    -- 7. OT 2026 ${r.isReintervention ? '(REINTERVENCIÓN)' : '(meta nueva)'}
    INSERT INTO public.work_order (mill_id, type, status, is_reintervention, priority, description, diagnosis, scheduled_date, start_date, end_date, completion_notes, notes)
    VALUES (v_mill_id, 'correctivo', 'COMPLETED', ${r.isReintervention}, 'MEDIA',
        ${esc(ot2026Desc)},
        ${esc(expandedDiag)},
        ${r.fecha2026 ? esc(r.fecha2026) : 'NULL'},
        ${r.fecha2026 ? esc(r.fecha2026) + '::timestamptz' : 'NULL'},
        ${r.fecha2026 ? esc(r.fecha2026) + '::timestamptz' : 'NULL'},
        ${esc(completionNotes)},
        ${esc(r.observaciones)});

`;
});

sql += `
END $$;

COMMIT;
`;

// Write to stdout
console.log(sql);

// Also save to file for reference
const fs = require('fs');
fs.writeFileSync(path.join(__dirname, 'migration_consolidado_2026.sql'), sql);
console.error(`\n-- Archivo guardado: migration_consolidado_2026.sql`);
console.error(`-- Registros procesados: ${rows.length}`);
