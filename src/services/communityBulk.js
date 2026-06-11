import ExcelJS from 'exceljs';
import { supabase } from './supabase';

// ─────────────────────────────────────────────────────────
// COLUMN DEFINITIONS
// ─────────────────────────────────────────────────────────
const COMMUNITY_COLS = [
    { key: 'community_id',                 header: 'ID Comunidad',              hint: 'NO MODIFICAR – Clave única. Vacío = registro nuevo.', width: 14, locked: true },
    { key: 'name',                         header: 'Nombre *',                  hint: 'Requerido. Nombre principal de la comunidad (max 150 chars).', width: 30, required: true },
    { key: 'municipality',                 header: 'Municipio',                 hint: 'Municipio donde está ubicada.', width: 20 },
    { key: 'department',                   header: 'Departamento',              hint: 'Departamento (ej: La Guajira).', width: 20 },
    { key: 'location_description',         header: 'Descripción Ubicación',     hint: 'Descripción textual de la ubicación.', width: 35 },
    { key: 'latitude',                     header: 'Latitud',                   hint: 'Decimal entre -90 y 90. Ej: 11.5408', width: 14, numFmt: '0.0000' },
    { key: 'longitude',                    header: 'Longitud',                  hint: 'Decimal entre -180 y 180. Ej: -72.9056', width: 14, numFmt: '0.0000' },
    { key: 'notes',                        header: 'Notas',                     hint: 'Observaciones generales.', width: 35 },
    { key: 'geotracker_route',             header: 'Ruta Geotracker',           hint: 'Ruta o trayecto GPS asociado a la comunidad.', width: 25 },
    { key: 'number_of_families',           header: 'Familias',                  hint: 'Número entero ≥ 0.', width: 12, intCol: true },
    { key: 'number_of_inhabitants',        header: 'Habitantes',                hint: 'Número entero ≥ 0.', width: 12, intCol: true },
    { key: 'number_of_children',           header: 'Niños',                     hint: 'Número entero ≥ 0.', width: 12, intCol: true },
    { key: 'uca_school',                   header: 'UCA / Colegio',             hint: 'Ej: UCA, Colegio, UCA+Colegio, No.', width: 20 },
    { key: 'main_productive_activity',     header: 'Actividad Productiva',      hint: 'Ej: Pastoreo y Artesanía, Agricultura.', width: 30 },
    { key: 'benefited_communities_count',  header: 'Com. Beneficiadas',         hint: 'Número entero ≥ 0.', width: 14, intCol: true },
    { key: 'training_communities',         header: 'Com. p/ Formación',         hint: 'Ej: Sí, No, 3 comunidades.', width: 20 },
    { key: '_mill_code',                   header: 'Molino (info)',              hint: 'Solo referencia – no se modifica aquí.', width: 18, locked: true },
];

const MEMBER_COLS = [
    { key: 'member_id',       header: 'ID Membresía',      hint: 'NO MODIFICAR – Vacío = registro nuevo.', width: 14, locked: true },
    { key: 'community_id',   header: 'ID Comunidad *',    hint: 'Requerido. Debe coincidir con un ID de hoja Comunidades.', width: 14, required: true },
    { key: '_comm_name',     header: 'Comunidad (info)',   hint: 'Solo referencia.', width: 28, locked: true },
    { key: 'first_name',     header: 'Primer Nombre *',   hint: 'Requerido.', width: 22, required: true },
    { key: 'last_name',      header: 'Apellido',           hint: 'Opcional.', width: 22 },
    { key: 'document_id',    header: 'Cédula',             hint: 'Debe ser único en el sistema.', width: 18 },
    { key: 'phone',          header: 'Teléfono',           hint: 'Número de contacto.', width: 16 },
    { key: 'role_name',      header: 'Rol Comunidad',      hint: 'Debe ser un rol válido (ver lista en hoja Roles).', width: 22 },
    { key: 'status',         header: 'Estado',             hint: 'ACTIVE o INACTIVE.', width: 12 },
];

// Colors
const DARK_BLUE   = '1E3A5F';
const LOCKED_BG   = 'E8ECF0';
const HINT_BG     = 'F0F4F8';
const REQUIRED_BG = 'FFF3E0';
const ACCENT      = '2563EB';

function applyHeaderStyle(cell, locked = false) {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + DARK_BLUE } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF' + ACCENT } }
    };
}

function applyHintStyle(cell) {
    cell.font = { italic: true, color: { argb: 'FF64748B' }, size: 8 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + HINT_BG } };
    cell.alignment = { wrapText: true, vertical: 'top' };
}

function applyDataCell(cell, locked = false, required = false, intCol = false) {
    if (locked) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LOCKED_BG } };
        cell.font = { color: { argb: 'FF94A3B8' }, size: 10 };
    } else if (required) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
        cell.font = { size: 10 };
    } else {
        cell.font = { size: 10 };
    }
    cell.alignment = { vertical: 'middle' };
    if (intCol && cell.value !== null && cell.value !== undefined && cell.value !== '') {
        cell.numFmt = '0';
    }
}

function buildSheet(wb, sheetName, cols, rows, roles = []) {
    const ws = wb.addWorksheet(sheetName);

    // Column widths
    ws.columns = cols.map((c, i) => ({
        key: String.fromCharCode(65 + i),
        width: c.width
    }));

    // ROW 1 — Headers
    const headerRow = ws.addRow(cols.map(c => c.header));
    headerRow.height = 32;
    headerRow.eachCell((cell, colNum) => {
        applyHeaderStyle(cell, cols[colNum - 1].locked);
    });

    // ROW 2 — Hints
    const hintRow = ws.addRow(cols.map(c => c.hint));
    hintRow.height = 44;
    hintRow.eachCell((cell) => applyHintStyle(cell));

    // DATA ROWS
    rows.forEach(rowData => {
        const values = cols.map(c => {
            const v = rowData[c.key];
            return v !== undefined && v !== null ? v : '';
        });
        const dr = ws.addRow(values);
        dr.height = 20;
        dr.eachCell((cell, colNum) => {
            const col = cols[colNum - 1];
            applyDataCell(cell, col.locked, col.required, col.intCol);
        });
    });

    // STATUS validation (ACTIVE/INACTIVE) for members sheet
    if (sheetName === 'Miembros') {
        const statusColIdx = cols.findIndex(c => c.key === 'status') + 1;
        const roleColIdx   = cols.findIndex(c => c.key === 'role_name') + 1;
        const roleNames    = roles.map(r => r.name).join(',');

        for (let r = 3; r <= Math.max(rows.length + 2, 200); r++) {
            if (statusColIdx > 0) {
                const sc = String.fromCharCode(64 + statusColIdx);
                ws.getCell(`${sc}${r}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: ['"ACTIVE,INACTIVE"'],
                    showErrorMessage: true,
                    errorTitle: 'Estado inválido',
                    error: 'Use ACTIVE o INACTIVE'
                };
            }
            if (roleColIdx > 0 && roleNames) {
                const rc = String.fromCharCode(64 + roleColIdx);
                ws.getCell(`${rc}${r}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: [`"${roleNames}"`],
                    showErrorMessage: true,
                    errorTitle: 'Rol inválido',
                    error: `El rol debe ser uno de: ${roleNames}`
                };
            }
        }
    }

    // Number validation for integer columns
    const intCols = cols
        .map((c, i) => c.intCol ? i + 1 : null)
        .filter(Boolean);

    for (let r = 3; r <= Math.max(rows.length + 2, 200); r++) {
        intCols.forEach(colIdx => {
            const colLetter = String.fromCharCode(64 + colIdx);
            ws.getCell(`${colLetter}${r}`).dataValidation = {
                type: 'whole',
                operator: 'greaterThanOrEqual',
                formulae: [0],
                allowBlank: true,
                showErrorMessage: true,
                errorTitle: 'Número inválido',
                error: 'Ingrese un número entero mayor o igual a 0'
            };
        });
    }

    // Lat/Lon validations for communities
    if (sheetName === 'Comunidades') {
        const latIdx = cols.findIndex(c => c.key === 'latitude') + 1;
        const lonIdx = cols.findIndex(c => c.key === 'longitude') + 1;
        for (let r = 3; r <= Math.max(rows.length + 2, 200); r++) {
            if (latIdx > 0) {
                const l = String.fromCharCode(64 + latIdx);
                ws.getCell(`${l}${r}`).dataValidation = {
                    type: 'decimal', operator: 'between',
                    formulae: [-90, 90], allowBlank: true,
                    showErrorMessage: true,
                    errorTitle: 'Latitud inválida', error: 'Debe estar entre -90 y 90'
                };
            }
            if (lonIdx > 0) {
                const l = String.fromCharCode(64 + lonIdx);
                ws.getCell(`${l}${r}`).dataValidation = {
                    type: 'decimal', operator: 'between',
                    formulae: [-180, 180], allowBlank: true,
                    showErrorMessage: true,
                    errorTitle: 'Longitud inválida', error: 'Debe estar entre -180 y 180'
                };
            }
        }
    }

    // Freeze top 2 rows + first col (or 3 cols for members)
    ws.views = [{ state: 'frozen', xSplit: sheetName === 'Miembros' ? 3 : 1, ySplit: 2 }];

    return ws;
}

// ─────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────
export const CommunityBulkService = {

    // 1. DOWNLOAD TEMPLATE
    async downloadTemplate() {
        // Fetch all data needed
        const [{ data: comms }, { data: members }, { data: roles }] = await Promise.all([
            supabase.from('community').select(`
                *,
                mill!fk_mill_community(code, name)
            `).order('name'),
            supabase.from('community_member').select(`
                id,
                community_id,
                status,
                community_role(name),
                person(first_name, last_name, document_id, phone)
            `).order('community_id'),
            supabase.from('community_role').select('*').order('name')
        ]);

        const communityMap = {};
        (comms || []).forEach(c => { communityMap[c.community_id] = c.name; });

        // Build community rows
        const commRows = (comms || []).map(c => ({
            community_id: c.community_id,
            name: c.name,
            municipality: c.municipality || '',
            department: c.department || '',
            location_description: c.location_description || '',
            latitude: c.latitude || '',
            longitude: c.longitude || '',
            notes: c.notes || '',
            geotracker_route: c.geotracker_route || '',
            number_of_families: c.number_of_families ?? '',
            number_of_inhabitants: c.number_of_inhabitants ?? '',
            number_of_children: c.number_of_children ?? '',
            uca_school: c.uca_school || '',
            main_productive_activity: c.main_productive_activity || '',
            benefited_communities_count: c.benefited_communities_count ?? '',
            training_communities: c.training_communities || '',
            _mill_code: c.mill?.[0]?.code || c.mill?.code || ''
        }));

        // Build member rows
        const memberRows = (members || []).map(m => ({
            member_id: m.id,
            community_id: m.community_id,
            _comm_name: communityMap[m.community_id] || '',
            first_name: m.person?.first_name || '',
            last_name: m.person?.last_name || '',
            document_id: m.person?.document_id || '',
            phone: m.person?.phone || '',
            role_name: m.community_role?.name || '',
            status: m.status || 'ACTIVE'
        }));

        // Build workbook
        const wb = new ExcelJS.Workbook();
        wb.creator = 'Molinos Guajira';
        wb.created = new Date();
        wb.properties.date1904 = false;

        buildSheet(wb, 'Comunidades', COMMUNITY_COLS, commRows, roles || []);
        buildSheet(wb, 'Miembros', MEMBER_COLS, memberRows, roles || []);

        // Roles reference sheet
        const rolesWs = wb.addWorksheet('Roles_Validos');
        rolesWs.addRow(['ID', 'Nombre del Rol']);
        rolesWs.getRow(1).font = { bold: true };
        (roles || []).forEach(r => rolesWs.addRow([r.role_id, r.name]));
        rolesWs.state = 'visible';

        // Download
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Plantilla_Comunidades_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    },

    // 2. PARSE & VALIDATE
    async parseAndValidate(file) {
        const errors = [];
        const preview = { communities: { update: [], create: [] }, members: { update: [], create: [] } };

        // Read file
        const buffer = await file.arrayBuffer();
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buffer);

        const commWs = wb.getWorksheet('Comunidades');
        const membWs = wb.getWorksheet('Miembros');

        if (!commWs) {
            errors.push({ sheet: 'General', row: '-', col: '-', message: 'No se encontró la hoja "Comunidades". Descargue la plantilla correcta.' });
            return { errors, preview };
        }
        if (!membWs) {
            errors.push({ sheet: 'General', row: '-', col: '-', message: 'No se encontró la hoja "Miembros". Descargue la plantilla correcta.' });
            return { errors, preview };
        }

        // Validate headers
        const commHeaders = commWs.getRow(1).values.slice(1);
        const membHeaders = membWs.getRow(1).values.slice(1);

        const expectedCommHeaders = COMMUNITY_COLS.map(c => c.header);
        const expectedMembHeaders = MEMBER_COLS.map(c => c.header);

        const missingComm = expectedCommHeaders.filter((h, i) => !commHeaders[i]?.toString().startsWith(h.replace(' *', '')));
        const missingMemb = expectedMembHeaders.filter((h, i) => !membHeaders[i]?.toString().startsWith(h.replace(' *', '')));

        if (missingComm.length > 0) {
            errors.push({ sheet: 'Comunidades', row: '1', col: '-', message: `Columnas faltantes o fuera de orden: ${missingComm.join(', ')}. Use la plantilla original.` });
            return { errors, preview };
        }
        if (missingMemb.length > 0) {
            errors.push({ sheet: 'Miembros', row: '1', col: '-', message: `Columnas faltantes o fuera de orden: ${missingMemb.join(', ')}. Use la plantilla original.` });
            return { errors, preview };
        }

        // Fetch DB data for cross-validation
        const [{ data: dbComms }, { data: dbMembers }, { data: dbRoles }, { data: dbPersons }] = await Promise.all([
            supabase.from('community').select('community_id, name'),
            supabase.from('community_member').select('id, community_id'),
            supabase.from('community_role').select('role_id, name'),
            supabase.from('person').select('person_id, document_id')
        ]);

        const dbCommIds  = new Set((dbComms  || []).map(c => c.community_id));
        const dbCommNames = new Map((dbComms || []).map(c => [c.name.trim().toLowerCase(), c.community_id]));
        const dbMembIds  = new Set((dbMembers || []).map(m => m.id));
        const dbRoleMap  = new Map((dbRoles  || []).map(r => [r.name.trim().toLowerCase(), r.role_id]));
        const dbDocIds   = new Map((dbPersons || []).map(p => [p.document_id, p.person_id]));

        // ── PARSE COMMUNITIES ──────────────────────────────────────
        const parsedCommIds = new Set(); // track IDs seen in this file
        const parsedCommNames = new Set();

        commWs.eachRow((row, rowNum) => {
            if (rowNum <= 2) return; // skip header + hint
            const vals = row.values.slice(1);

            // Empty row check
            const hasContent = vals.some(v => v !== null && v !== undefined && v !== '');
            if (!hasContent) return;

            const communityId = vals[0] ? Number(vals[0]) : null;
            const name        = (vals[1] || '').toString().trim();
            const colName     = (key) => COMMUNITY_COLS.find(c => c.key === key)?.header || key;

            // Required: name
            if (!name) {
                errors.push({ sheet: 'Comunidades', row: rowNum, col: colName('name'), message: 'El nombre de la comunidad es requerido.' });
                return;
            }

            // Numeric validations
            // Column index map (0-based, after vals.slice(1)):
            // 0=community_id, 1=name, 2=municipality, 3=department,
            // 4=location_description, 5=latitude, 6=longitude, 7=notes,
            // 8=geotracker_route, 9=families, 10=inhabitants, 11=children,
            // 12=uca_school, 13=main_productive_activity, 14=benefited_count,
            // 15=training_communities, 16=_mill_code
            const numericFields = [
                ['number_of_families', vals[9], 'Familias'],
                ['number_of_inhabitants', vals[10], 'Habitantes'],
                ['number_of_children', vals[11], 'Niños'],
                ['benefited_communities_count', vals[14], 'Com. Beneficiadas'],
            ];
            let hasNumericError = false;
            numericFields.forEach(([, v, label]) => {
                if (v !== '' && v !== null && v !== undefined) {
                    const n = Number(v);
                    if (isNaN(n) || !Number.isInteger(n) || n < 0) {
                        errors.push({ sheet: 'Comunidades', row: rowNum, col: label, message: `"${label}" debe ser un número entero ≥ 0. Valor encontrado: "${v}"` });
                        hasNumericError = true;
                    }
                }
            });

            // Lat/Lon (indices 5 and 6)
            const lat = vals[5]; const lon = vals[6];
            if (lat !== '' && lat !== null && lat !== undefined) {
                const latN = Number(lat);
                if (isNaN(latN) || latN < -90 || latN > 90)
                    errors.push({ sheet: 'Comunidades', row: rowNum, col: 'Latitud', message: `Latitud fuera de rango [-90, 90]: ${lat}` });
            }
            if (lon !== '' && lon !== null && lon !== undefined) {
                const lonN = Number(lon);
                if (isNaN(lonN) || lonN < -180 || lonN > 180)
                    errors.push({ sheet: 'Comunidades', row: rowNum, col: 'Longitud', message: `Longitud fuera de rango [-180, 180]: ${lon}` });
            }

            if (hasNumericError) return;

            // Existing ID: must be in DB
            if (communityId) {
                if (!dbCommIds.has(communityId)) {
                    errors.push({ sheet: 'Comunidades', row: rowNum, col: 'ID Comunidad', message: `El ID ${communityId} no existe en la base de datos.` });
                    return;
                }
                if (parsedCommIds.has(communityId)) {
                    errors.push({ sheet: 'Comunidades', row: rowNum, col: 'ID Comunidad', message: `El ID ${communityId} aparece duplicado en la planilla.` });
                    return;
                }
                parsedCommIds.add(communityId);

                preview.communities.update.push({
                    community_id: communityId,
                    name,
                    municipality: (vals[2]||'').toString().trim()||null,
                    department: (vals[3]||'').toString().trim()||null,
                    location_description: (vals[4]||'').toString().trim()||null,
                    latitude: lat !== ''&&lat!=null ? Number(lat) : null,
                    longitude: lon !== ''&&lon!=null ? Number(lon) : null,
                    notes: (vals[7]||'').toString().trim()||null,
                    geotracker_route: (vals[8]||'').toString().trim()||null,
                    number_of_families: vals[9]!==''&&vals[9]!=null ? Number(vals[9]) : null,
                    number_of_inhabitants: vals[10]!==''&&vals[10]!=null ? Number(vals[10]) : null,
                    number_of_children: vals[11]!==''&&vals[11]!=null ? Number(vals[11]) : null,
                    uca_school: (vals[12]||'').toString().trim()||null,
                    main_productive_activity: (vals[13]||'').toString().trim()||null,
                    benefited_communities_count: vals[14]!==''&&vals[14]!=null ? Number(vals[14]) : null,
                    training_communities: (vals[15]||'').toString().trim()||null,
                });
            } else {
                // New community: check name uniqueness in DB and in file
                const nameKey = name.toLowerCase();
                if (dbCommNames.has(nameKey)) {
                    errors.push({ sheet: 'Comunidades', row: rowNum, col: 'Nombre', message: `Ya existe una comunidad con el nombre "${name}" en la base de datos (ID ${dbCommNames.get(nameKey)}).` });
                    return;
                }
                if (parsedCommNames.has(nameKey)) {
                    errors.push({ sheet: 'Comunidades', row: rowNum, col: 'Nombre', message: `El nombre "${name}" aparece duplicado en la planilla.` });
                    return;
                }
                parsedCommNames.add(nameKey);

                preview.communities.create.push({
                    name,
                    municipality: (vals[2]||'').toString().trim()||null,
                    department: (vals[3]||'').toString().trim()||null,
                    location_description: (vals[4]||'').toString().trim()||null,
                    latitude: lat !== ''&&lat!=null ? Number(lat) : null,
                    longitude: lon !== ''&&lon!=null ? Number(lon) : null,
                    notes: (vals[7]||'').toString().trim()||null,
                    geotracker_route: (vals[8]||'').toString().trim()||null,
                    number_of_families: vals[9]!==''&&vals[9]!=null ? Number(vals[9]) : null,
                    number_of_inhabitants: vals[10]!==''&&vals[10]!=null ? Number(vals[10]) : null,
                    number_of_children: vals[11]!==''&&vals[11]!=null ? Number(vals[11]) : null,
                    uca_school: (vals[12]||'').toString().trim()||null,
                    main_productive_activity: (vals[13]||'').toString().trim()||null,
                    benefited_communities_count: vals[14]!==''&&vals[14]!=null ? Number(vals[14]) : null,
                    training_communities: (vals[15]||'').toString().trim()||null,
                });
            }
        });

        // ── PARSE MEMBERS ──────────────────────────────────────────
        // All community_ids valid in this upload (existing + new names pending creation)
        const allFileCommIds = new Set([
            ...parsedCommIds,
            ...(dbComms||[]).map(c=>c.community_id)
        ]);

        membWs.eachRow((row, rowNum) => {
            if (rowNum <= 2) return;
            const vals = row.values.slice(1);
            const hasContent = vals.some(v => v !== null && v !== undefined && v !== '');
            if (!hasContent) return;

            const memberId    = vals[0] ? Number(vals[0]) : null;
            const communityId = vals[1] ? Number(vals[1]) : null;
            const firstName   = (vals[3] || '').toString().trim();
            const lastName    = (vals[4] || '').toString().trim();
            const docId       = (vals[5] || '').toString().trim();
            const phone       = (vals[6] || '').toString().trim();
            const roleName    = (vals[7] || '').toString().trim();
            const status      = (vals[8] || 'ACTIVE').toString().trim().toUpperCase();

            // Required: community_id
            if (!communityId) {
                errors.push({ sheet: 'Miembros', row: rowNum, col: 'ID Comunidad', message: 'El ID de comunidad es requerido para cada miembro.' });
                return;
            }

            // community_id must be valid
            if (!allFileCommIds.has(communityId)) {
                errors.push({ sheet: 'Miembros', row: rowNum, col: 'ID Comunidad', message: `El ID de comunidad ${communityId} no existe en la planilla ni en la base de datos.` });
                return;
            }

            // Required: first_name
            if (!firstName) {
                errors.push({ sheet: 'Miembros', row: rowNum, col: 'Primer Nombre', message: 'El nombre del miembro es requerido.' });
                return;
            }

            // Status validation
            if (!['ACTIVE', 'INACTIVE'].includes(status)) {
                errors.push({ sheet: 'Miembros', row: rowNum, col: 'Estado', message: `Estado inválido: "${status}". Use ACTIVE o INACTIVE.` });
                return;
            }

            // Role validation
            let roleId = null;
            if (roleName) {
                const rk = roleName.toLowerCase();
                if (!dbRoleMap.has(rk)) {
                    errors.push({ sheet: 'Miembros', row: rowNum, col: 'Rol Comunidad', message: `Rol "${roleName}" no encontrado. Roles válidos: ${[...dbRoleMap.keys()].join(', ')}` });
                    return;
                }
                roleId = dbRoleMap.get(rk);
            }

            // Document ID uniqueness (only for new persons)
            if (!memberId && docId) {
                if (dbDocIds.has(docId)) {
                    errors.push({ sheet: 'Miembros', row: rowNum, col: 'Cédula', message: `La cédula "${docId}" ya existe en la base de datos para otra persona.` });
                    return;
                }
            }

            if (memberId) {
                if (!dbMembIds.has(memberId)) {
                    errors.push({ sheet: 'Miembros', row: rowNum, col: 'ID Membresía', message: `El ID de membresía ${memberId} no existe en la base de datos.` });
                    return;
                }
                preview.members.update.push({ member_id: memberId, community_id: communityId, first_name: firstName, last_name: lastName||null, document_id: docId||null, phone: phone||null, role_id: roleId, status });
            } else {
                preview.members.create.push({ community_id: communityId, first_name: firstName, last_name: lastName||null, document_id: docId||null, phone: phone||null, role_id: roleId, status });
            }
        });

        return { errors, preview };
    },

    // 3. APPLY CHANGES
    async applyChanges(preview, onProgress) {
        const results = { success: 0, errors: [] };
        const total =
            preview.communities.update.length +
            preview.communities.create.length +
            preview.members.update.length +
            preview.members.create.length;
        let done = 0;

        const tick = (label) => { done++; onProgress?.(Math.round((done / total) * 100), label); };

        // 1. Update communities
        for (const c of preview.communities.update) {
            const { community_id, ...data } = c;
            const { error } = await supabase.from('community').update(data).eq('community_id', community_id);
            if (error) results.errors.push(`Comunidad ID ${community_id}: ${error.message}`);
            else results.success++;
            tick(`Actualizando comunidad: ${c.name}`);
        }

        // 2. Create communities
        for (const c of preview.communities.create) {
            const { error } = await supabase.from('community').insert(c);
            if (error) results.errors.push(`Nueva comunidad "${c.name}": ${error.message}`);
            else results.success++;
            tick(`Creando comunidad: ${c.name}`);
        }

        // 3. Get person_role_id for 'Miembro de Comunidad'
        const { data: personRoleData } = await supabase.from('person_role').select('role_id').eq('name', 'Miembro de Comunidad').limit(1);
        const personRoleId = personRoleData?.[0]?.role_id;

        // 4. Update members (update community_member role/status; person data separately)
        for (const m of preview.members.update) {
            const updateData = {};
            if (m.role_id) updateData.role_id = m.role_id;
            if (m.status)  updateData.status   = m.status;
            if (Object.keys(updateData).length > 0) {
                const { error } = await supabase.from('community_member').update(updateData).eq('id', m.member_id);
                if (error) results.errors.push(`Membresía ID ${m.member_id}: ${error.message}`);
                else results.success++;
            } else { results.success++; }
            tick(`Actualizando miembro: ${m.first_name} ${m.last_name || ''}`);
        }

        // 5. Create new persons + memberships
        for (const m of preview.members.create) {
            try {
                // Create person
                const { data: newPerson, error: pe } = await supabase.from('person').insert({
                    first_name: m.first_name,
                    last_name: m.last_name,
                    document_id: m.document_id,
                    phone: m.phone,
                    role_id: personRoleId,
                    active: true
                }).select().single();
                if (pe) throw pe;

                // Create membership
                const { error: me } = await supabase.from('community_member').insert({
                    community_id: m.community_id,
                    person_id: newPerson.person_id,
                    role_id: m.role_id,
                    status: m.status
                });
                if (me) throw me;

                results.success++;
            } catch (err) {
                results.errors.push(`Nuevo miembro "${m.first_name} ${m.last_name || ''}": ${err.message}`);
            }
            tick(`Creando miembro: ${m.first_name} ${m.last_name || ''}`);
        }

        return results;
    }
};
