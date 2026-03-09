const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = path.join(__dirname, 'supabase', 'migrations', 'ComunidadesProyectoMolinos- 2026.xlsx');
const outputPath = path.join(__dirname, 'supabase', 'migrations', 'seed_2026.sql');

try {
    const workbook = XLSX.readFile(excelPath);

    // Get data from both sheets
    const socialSheet = workbook.Sheets['IMPACTO SOCIAL 2026'];
    const generalSheet = workbook.Sheets['REL. GENERAL-COMUNIDADES 2026'];

    // Parse skipping headers row for social sheet if needed, it seems row 0 is header
    const socialData = XLSX.utils.sheet_to_json(socialSheet, { defval: null });
    const generalData = XLSX.utils.sheet_to_json(generalSheet, { defval: null });

    // Map communities by name to merge data
    const communitiesMap = new Map();

    // Normalize string helper
    const cleanString = (str) => {
        if (!str) return null;
        return String(str).trim();
    };

    const escapeSql = (str) => {
        if (str === null || str === undefined) return 'NULL';
        return "'" + String(str).replace(/'/g, "''") + "'";
    };

    // Process REL. GENERAL-COMUNIDADES 2026 first
    generalData.forEach(row => {
        let commName = cleanString(row['COMUNIDADES VISITADAS']);
        if (!commName) return;

        // Handle duplicates
        let uniqueName = commName;
        let counter = 2;
        while (communitiesMap.has(uniqueName)) {
            uniqueName = `${commName} ${counter}`;
            counter++;
        }

        communitiesMap.set(uniqueName, {
            name: uniqueName,
            municipality: cleanString(row['MUNICIPIO']),
            location_description: cleanString(row['DIRECCION UBICACIÓN GEOGRAFICA ']),
            coords: cleanString(row['COORDENADAS']),
            authority_name: cleanString(row['NOMBRE DE LA AUTORIDAD ']),
            contact_number: cleanString(row['NUMERO DE CONTACTO']),
            status: cleanString(row['ESTADO ACTUAL ']),
            has_concertation: cleanString(row['ACTA DE CONCERTACION ']) === 'SI',
            has_diagnosis: cleanString(row['DIAGNOSTICO']) === 'SI',
            notes: cleanString(row['OBSERVACIONES- PARA INTERVENCION']) || cleanString(row['OBSERVACIONES'])
        });
    });

    // Process IMPACTO SOCIAL 2026
    socialData.forEach(row => {
        // The columns are named __EMPTY_2 etc because row 1 had the headers
        // Looking at the sample: __EMPTY_2 is COMUNIDADES VISITADAS
        const commName = cleanString(row['__EMPTY_2'] || row['COMUNIDADES VISITADAS']);
        if (!commName || commName === 'COMUNIDADES VISITADAS') return;

        let comm = communitiesMap.get(commName);
        if (!comm) {
            comm = { name: commName };
            communitiesMap.set(commName, comm);
        }

        comm.municipality = comm.municipality || cleanString(row['__EMPTY_1'] || row['MUNICIPIO']);
        comm.number_of_families = parseInt(row['__EMPTY_3'] || row['NUMERO DE FAMILIAS']) || 0;
        comm.number_of_inhabitants = parseInt(row['__EMPTY_4'] || row['NUMERO DE HABIANTES']) || 0;
        comm.number_of_children = parseInt(row['__EMPTY_5'] || row['NUMERO DE NIÑIOS']) || 0;
        comm.uca_school = cleanString(row['__EMPTY_6'] || row['UCA/ COLEGIO']);
        comm.main_productive_activity = cleanString(row['__EMPTY_7'] || row['ACTIVIDAD PRODUCTIVA PRINCIPAL.']);
        comm.benefited_communities_count = parseInt(row['__EMPTY_8'] || row['NUMERO DE COMUNIDADES BENEFICIADAS']) || 0;
        comm.training_communities = cleanString(row['__EMPTY_9'] || row['COMUNIDADES PARA FORMACION']);
    });

    // Generate SQL
    let sql = `-- ==============================================================================
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

`;

    // Filter out invalid ones if any
    const communities = Array.from(communitiesMap.values()).filter(c => c.name && c.name !== 'COMUNIDADES VISITADAS');

    communities.forEach((c) => {
        // Parse coords and enforce numeric(10,6)
        let lat = 'NULL';
        let lng = 'NULL';
        if (c.coords && c.coords.includes(',')) {
            const parts = c.coords.split(',');
            let parsedLat = parseFloat(parts[0].trim());
            let parsedLng = parseFloat(parts[1].trim());

            // Fix missing decimals (e.g. -72776264 -> -72.776264)
            if (Math.abs(parsedLat) > 90) {
                let strLat = String(parts[0].trim());
                if (!strLat.includes('.')) parsedLat = parsedLat / 1000000;
                // Still invalid? nullify
                if (Math.abs(parsedLat) > 90) parsedLat = NaN;
            }
            if (Math.abs(parsedLng) > 180) {
                let strLng = String(parts[1].trim());
                if (!strLng.includes('.')) parsedLng = parsedLng / 1000000;
                if (Math.abs(parsedLng) > 180) parsedLng = NaN;
            }

            if (!isNaN(parsedLat)) lat = parsedLat.toFixed(6);
            if (!isNaN(parsedLng)) lng = parsedLng.toFixed(6);
        }

        sql += `    -- COMUNIDAD: ${c.name.replace(/'/g, "''")}
    INSERT INTO public.community (name, municipality, location_description, latitude, longitude, number_of_families, number_of_inhabitants, number_of_children, uca_school, main_productive_activity, benefited_communities_count, training_communities)
    VALUES (${escapeSql(c.name)}, ${escapeSql(c.municipality)}, ${escapeSql(c.location_description)}, ${lat}, ${lng}, ${c.number_of_families || 0}, ${c.number_of_inhabitants || 0}, ${c.number_of_children || 0}, ${escapeSql(c.uca_school)}, ${escapeSql(c.main_productive_activity)}, ${c.benefited_communities_count || 0}, ${escapeSql(c.training_communities)})
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

`;

        // Process Persona / Miembro
        if (c.authority_name) {
            // Split name to avoid NOT NULL constraint on last_name
            const nameParts = c.authority_name.split(' ');
            const firstName = nameParts[0] || c.authority_name;
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Sin Apellido';
            const docId = 'CC-' + Math.floor(Math.random() * 100000000); // Dummy document_id

            sql += `    -- AUTORIDAD PARA: ${c.name.replace(/'/g, "''")}
    SELECT person_id INTO v_person_id FROM public.person WHERE first_name ILIKE ${escapeSql(firstName)} AND last_name ILIKE ${escapeSql(lastName)} LIMIT 1;
    IF v_person_id IS NULL THEN
        INSERT INTO public.person (first_name, last_name, document_id, phone, active)
        VALUES (${escapeSql(firstName)}, ${escapeSql(lastName)}, '${docId}', ${escapeSql(c.contact_number)}, true)
        RETURNING person_id INTO v_person_id;
    ELSE
        -- Update phone if it exists
        UPDATE public.person SET phone = COALESCE(phone, ${escapeSql(c.contact_number)}) WHERE person_id = v_person_id;
    END IF;

    -- Asociar persona a comunidad
    INSERT INTO public.community_member (community_id, person_id, role_id, status)
    VALUES (v_community_id, v_person_id, v_role_id, 'ACTIVE')
    ON CONFLICT DO NOTHING; -- Assuming no unique constraint on community_id+person_id, but if there is, do nothing
    
`;
        }

        // Process Mill
        // Determine status
        let millStatus = 'NULL';
        const statusLower = (c.status || '').toLowerCase().trim();
        if (statusLower) {
            if (statusLower.includes('inoperativo') || statusLower.includes('malo') || statusLower.includes('fuera') || statusLower.includes('dañado')) {
                millStatus = "'NON_OPERATIONAL'";
            } else if (statusLower.includes('mantenimiento') || statusLower.includes('reparacion')) {
                millStatus = "'UNDER_MAINTENANCE'";
            } else if (statusLower.includes('operativo') || statusLower.includes('bueno')) {
                millStatus = "'OPERATIONAL'";
            }
        }

        sql += `    -- MOLINO PARA: ${c.name.replace(/'/g, "''")}
    -- Revisar si ya existe molino con este codigo o de esta comunidad
    SELECT mill_id INTO v_mill_id FROM public.mill WHERE community_id = v_community_id LIMIT 1;
    IF v_mill_id IS NULL THEN
        INSERT INTO public.mill (name, community_id, status, latitude, longitude)
        VALUES (${escapeSql('Molino ' + c.name)}, v_community_id, ${millStatus}, ${lat}, ${lng})
        RETURNING mill_id INTO v_mill_id;
    ELSE
        UPDATE public.mill SET status = ${millStatus}, latitude = ${lat}, longitude = ${lng} WHERE mill_id = v_mill_id;
    END IF;

`;

        // Process Concertation
        if (c.has_concertation) {
            sql += `    -- CONCERTACION
    INSERT INTO public.community_concertation (community_id, status, notes)
    VALUES (v_community_id, 'pendiente', ${escapeSql(c.notes)});
`;
        }

        // Process Diagnosis
        if (c.has_diagnosis) {
            const diagType = millStatus === "'OPERATIONAL'" ? 'PREVENTIVO' : 'CORRECTIVO';
            const diagCode = 'DX-' + Math.floor(Math.random() * 100000000);
            sql += `    -- DIAGNOSTICO
    INSERT INTO public.diagnosis (code, mill_id, diagnosis_type, status, priority, description, technical_findings)
    VALUES ('${diagCode}', v_mill_id, '${diagType}', 'PENDING', 'MEDIA', ${escapeSql(c.notes)}, ${escapeSql(c.notes)});
`;
        }

        sql += `\n`;
    });

    sql += `END $$;

COMMIT;
`;

    fs.writeFileSync(outputPath, sql);
    console.log(`Generado exitosamente en: ${outputPath}`);
    console.log(`Comunidades procesadas: ${communities.length}`);
} catch (error) {
    console.error("Error generando SQL:", error);
}
