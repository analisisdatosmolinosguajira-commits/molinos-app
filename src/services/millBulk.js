import ExcelJS from 'exceljs';
import { supabase } from './supabase';

// ─────────────────────────────────────────────────────────
// STATIC COLUMNS DEFINITIONS
// ─────────────────────────────────────────────────────────
const MILL_BASE_COLS = [
    { key: 'mill_id',            header: 'ID Molino',           hint: 'NO MODIFICAR. Vacío=Nuevo', width: 12, locked: true },
    { key: 'code',               header: 'Código *',            hint: 'Requerido. Ej: M-001.', width: 12, required: true },
    { key: 'registration_number',header: 'No. Registro',        hint: 'Oficial o contrato.', width: 15 },
    { key: 'name',               header: 'Nombre Molino',       hint: 'Descriptivo.', width: 25 },
    { key: 'community_id',       header: 'ID Comunidad',        hint: 'Ver Comunidades_Validas.', width: 14, intCol: true },
    { key: '_comm_name',         header: 'Comunidad (info)',    hint: 'No modificar.', width: 25, locked: true },
    { key: 'latitude',           header: 'Latitud',             hint: '-90 a 90', width: 12, numFmt: '0.0000' },
    { key: 'longitude',          header: 'Longitud',            hint: '-180 a 180', width: 12, numFmt: '0.0000' },
    { key: 'status',             header: 'Estado Molino',       hint: 'OPERATIONAL | NON_OPERATIONAL', width: 18 },
    { key: 'notes',              header: 'Notas Molino',        hint: 'Observaciones generales.', width: 30 },
];

const PUMP_COLS = [
    { key: '_pump_serial',       header: '[Bomba] Serial',      hint: 'Serial de bomba activa.', width: 18, pumpCol: true },
    { key: '_pump_model',        header: '[Bomba] Modelo',      hint: 'Modelo de la bomba.', width: 18, pumpCol: true },
];

const INFO_COLS = [
    { key: '_recent_failures',   header: '[Historial] Fallas',  hint: 'Últimos 3 reportes (Lectura).', width: 50, locked: true },
];

const STATUS_VALUES = ['OPERATIONAL', 'NON_OPERATIONAL'];
const COMP_STATUS_VALUES = ['FUNCIONAL', 'REQUIERE_REVISION', 'EN_MANTENIMIENTO', 'DANADO', 'REQUIERE_CAMBIO', 'DESGASTADO'];

// ── STYLES ────────────────────────────────────────────────
const BRAND_BLUE  = '2563EB'; // Blue 600
const PUMP_BLUE   = '0284C7'; // Sky 600
const INFO_GRAY   = '475569'; // Slate 600
const COMP_PURPLE = '7C3AED'; // Violet 600

const LOCKED_BG   = 'E8ECF0';
const HINT_BG     = 'EFF6FF'; // Blue 50

function applyHeaderStyle(cell, type = 'base') {
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    let color = BRAND_BLUE;
    if (type === 'pump') color = PUMP_BLUE;
    if (type === 'info') color = INFO_GRAY;
    if (type === 'comp') color = COMP_PURPLE;
    
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + color } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border    = { bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } } };
}

function applyHintStyle(cell) {
    cell.font      = { italic: true, color: { argb: 'FF64748B' }, size: 8 };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + HINT_BG } };
    cell.alignment = { wrapText: true, vertical: 'top' };
}

function applyDataCell(cell, locked = false, required = false, intCol = false, numFmt = null) {
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
    
    if (numFmt && cell.value !== null && cell.value !== undefined && cell.value !== '') {
        cell.numFmt = numFmt;
    } else if (intCol && cell.value !== null && cell.value !== undefined && cell.value !== '') {
        cell.numFmt = '0';
    }
}

function buildInstructionsSheet(wb) {
    const ws = wb.addWorksheet('Instrucciones');
    ws.columns = [{ key: 'A', width: 4 }, { key: 'B', width: 30 }, { key: 'C', width: 70 }];
    ws.addRow([]);
    const titleRow = ws.addRow(['', 'INSTRUCCIONES DE CARGUE AVANZADO - MOLINOS']);
    titleRow.font = { bold: true, size: 14, color: { argb: 'FF2563EB' } };
    ws.addRow([]);

    const steps = [
        ['', '1. AGREGAR / EDITAR MOLINO:', 'Para agregar, deja la columna "ID Molino" vacía e ingresa un "Código" único. Para editar, modifica directamente la fila existente sin alterar el ID.'],
        ['', '2. COLUMNAS DE BOMBA [Bomba]:', 'Si cambias el Serial, el sistema buscará si la bomba existe y la asignará. Si no existe, creará una bomba nueva y la enlazará a este molino.'],
        ['', '3. COLUMNAS DE HISTORIAL [Historial]:', 'Esta columna es SOLO DE LECTURA. Muestra las últimas fallas reportadas para darte contexto técnico. Los cambios aquí serán ignorados.'],
        ['', '4. MATRIZ DE COMPONENTES [Comp]:', 'Cada componente tiene su propia columna (marcadas en morado). Para actualizar el estado de un componente, escribe uno de los valores válidos (ver pestaña "Valores_Validos").'],
        ['', '5. VALORES VÁLIDOS DE COMPONENTES:', 'FUNCIONAL, REQUIERE_REVISION, EN_MANTENIMIENTO, DANADO, REQUIERE_CAMBIO, DESGASTADO.'],
        ['', 'PRECAUCIONES:', 'No cambies el nombre de los encabezados (Fila 1) ni alteres el orden de las columnas dinámicas.']
    ];

    steps.forEach(s => {
        const row = ws.addRow(s);
        row.getCell(2).font = { bold: true };
        row.getCell(3).alignment = { wrapText: true };
    });
}

// ── PUBLIC API ─────────────────────────────────────────────
export const MillBulkService = {

    async downloadTemplate() {
        // 1. Fetch all data needed for the advanced matrix
        const [
            { data: mills },
            { data: communities },
            { data: activePumps },
            { data: allComponents },
            { data: millComps },
            { data: workOrders }
        ] = await Promise.all([
            supabase.from('mill').select('*').order('code'),
            supabase.from('community').select('community_id, name'),
            supabase.from('mill_pump').select('mill_id, pump(serial_number, model)').is('removed_date', null),
            supabase.from('mill_component').select('component_id, name').order('name'),
            supabase.from('mill_has_component').select('mill_id, component_id, status'),
            supabase.from('work_order').select('mill_id, created_at, status, description').eq('type', 'correctivo').order('created_at', { ascending: false })
        ]);

        // 2. Build maps for quick lookup
        const communityMap = new Map((communities || []).map(c => [c.community_id, c.name]));
        const pumpMap = new Map((activePumps || []).map(p => [p.mill_id, p.pump]));
        
        // compMap: mill_id -> { component_id: status }
        const compMap = new Map();
        (millComps || []).forEach(mc => {
            if (!compMap.has(mc.mill_id)) compMap.set(mc.mill_id, {});
            compMap.get(mc.mill_id)[mc.component_id] = mc.status;
        });

        // woMap: mill_id -> concatenated string of last 3 failures
        const woMap = new Map();
        (workOrders || []).forEach(wo => {
            if (!woMap.has(wo.mill_id)) woMap.set(wo.mill_id, []);
            if (woMap.get(wo.mill_id).length < 3) {
                const date = new Date(wo.created_at).toISOString().split('T')[0];
                woMap.get(wo.mill_id).push(`[${date}] ${wo.status}: ${wo.description || 'Sin desc'}`);
            }
        });

        // 3. Dynamic Columns Assembly
        const compCols = (allComponents || []).map(c => ({
            key: `comp_${c.component_id}`,
            header: `[Comp] ${c.name}`,
            hint: 'Estado componente',
            width: 22,
            type: 'comp',
            compId: c.component_id
        }));

        const ALL_COLS = [
            ...MILL_BASE_COLS.map(c => ({...c, type: 'base'})),
            ...PUMP_COLS.map(c => ({...c, type: 'pump'})),
            ...INFO_COLS.map(c => ({...c, type: 'info'})),
            ...compCols
        ];

        // 4. Build Rows
        const rows = (mills || []).map(m => {
            const rowData = {
                mill_id:             m.mill_id,
                code:                m.code || '',
                registration_number: m.registration_number || '',
                name:                m.name || '',
                community_id:        m.community_id || '',
                _comm_name:          communityMap.get(m.community_id) || m.community_name || '',
                latitude:            m.latitude ?? '',
                longitude:           m.longitude ?? '',
                status:              m.status || '',
                notes:               m.notes || '',
                
                _pump_serial:        pumpMap.get(m.mill_id)?.serial_number || '',
                _pump_model:         pumpMap.get(m.mill_id)?.model || '',
                
                _recent_failures:    (woMap.get(m.mill_id) || []).join(' | ') || 'Sin fallas recientes'
            };

            // Inject components
            const mComps = compMap.get(m.mill_id) || {};
            compCols.forEach(c => {
                rowData[c.key] = mComps[c.compId] || '';
            });

            return rowData;
        });

        // 5. Generate Excel
        const wb = new ExcelJS.Workbook();
        buildInstructionsSheet(wb);
        
        const ws = wb.addWorksheet('Molinos');
        ws.columns = ALL_COLS.map((c, i) => ({ key: String.fromCharCode(65 + i), width: c.width }));
        
        const headerRow = ws.addRow(ALL_COLS.map(c => c.header));
        headerRow.height = 32;
        headerRow.eachCell((cell, colNum) => applyHeaderStyle(cell, ALL_COLS[colNum-1].type));

        const hintRow = ws.addRow(ALL_COLS.map(c => c.hint));
        hintRow.height = 44;
        hintRow.eachCell(cell => applyHintStyle(cell));

        rows.forEach(rowData => {
            const values = ALL_COLS.map(c => rowData[c.key] !== undefined && rowData[c.key] !== null ? rowData[c.key] : '');
            const dr = ws.addRow(values);
            dr.height = 20;
            dr.eachCell((cell, colNum) => {
                const col = ALL_COLS[colNum - 1];
                applyDataCell(cell, col.locked, col.required, col.intCol, col.numFmt);
            });
        });

        // Status Validations
        const maxRow = Math.max(rows.length + 2, 500);
        const statusIdx = ALL_COLS.findIndex(c => c.key === 'status');
        if (statusIdx !== -1) {
            const colLetter = String.fromCharCode(65 + statusIdx);
            for (let r = 3; r <= maxRow; r++) {
                ws.getCell(`${colLetter}${r}`).dataValidation = {
                    type: 'list', allowBlank: true, formulae: [`"${STATUS_VALUES.join(',')}"`], showErrorMessage: true
                };
            }
        }
        
        // Component Validations
        compCols.forEach((col) => {
            const idx = ALL_COLS.findIndex(c => c.key === col.key);
            if (idx !== -1) {
                // Determine column letters correctly for >26 columns (A-Z, AA, AB...)
                let dividend = idx + 1;
                let colName = '';
                let modulo;
                while (dividend > 0) {
                    modulo = (dividend - 1) % 26;
                    colName = String.fromCharCode(65 + modulo) + colName;
                    dividend = parseInt((dividend - modulo) / 26);
                }
                
                for (let r = 3; r <= maxRow; r++) {
                    ws.getCell(`${colName}${r}`).dataValidation = {
                        type: 'list', allowBlank: true, formulae: [`"${COMP_STATUS_VALUES.join(',')}"`], showErrorMessage: true
                    };
                }
            }
        });

        ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 2 }];

        // Reference sheets
        const commWs = wb.addWorksheet('Comunidades_Validas');
        commWs.addRow(['ID', 'Nombre']);
        (communities || []).forEach(c => commWs.addRow([c.community_id, c.name]));

        const refWs = wb.addWorksheet('Valores_Validos');
        refWs.addRow(['Estado Molino', 'Estado Componente']);
        const maxLen = Math.max(STATUS_VALUES.length, COMP_STATUS_VALUES.length);
        for(let i=0; i<maxLen; i++){
            refWs.addRow([STATUS_VALUES[i]||'', COMP_STATUS_VALUES[i]||'']);
        }

        const buffer = await wb.xlsx.writeBuffer();
        const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url    = URL.createObjectURL(blob);
        const a      = document.createElement('a');
        a.href       = url;
        a.download   = `Molinos_Matriz_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    async parseAndValidate(file) {
        const errors  = [];
        const preview = { update: [], create: [] };

        const buffer = await file.arrayBuffer();
        const wb     = new ExcelJS.Workbook();
        await wb.xlsx.load(buffer);

        const ws = wb.getWorksheet('Molinos');
        if (!ws) {
            errors.push({ sheet: '-', row: '-', col: '-', message: 'Hoja "Molinos" no encontrada.' });
            return { errors, preview };
        }

        const fileHeaders = ws.getRow(1).values.slice(1);
        
        // Dynamically find component columns from headers
        const compColsMap = new Map(); // headerIndex -> compName
        fileHeaders.forEach((h, i) => {
            if (h && h.toString().startsWith('[Comp]')) {
                compColsMap.set(i, h.toString().replace('[Comp] ', '').trim());
            }
        });

        // Fetch DB state
        const [
            { data: dbMills }, 
            { data: dbComms }, 
            { data: dbComps },
            { data: dbPumps }
        ] = await Promise.all([
            supabase.from('mill').select('mill_id, code'),
            supabase.from('community').select('community_id, name'),
            supabase.from('mill_component').select('component_id, name'),
            supabase.from('pump').select('pump_id, serial_number')
        ]);

        const dbMillIds = new Set((dbMills || []).map(m => m.mill_id));
        const dbMillCodes = new Map((dbMills || []).map(m => [m.code?.toLowerCase(), m.mill_id]));
        const dbCommIds = new Set((dbComms || []).map(c => c.community_id));
        const compNameMap = new Map((dbComps || []).map(c => [c.name, c.component_id]));
        
        const parsedIds = new Set();
        const parsedCodes = new Set();

        // Get fixed indices
        const idIdx = fileHeaders.indexOf('ID Molino');
        const codeIdx = fileHeaders.findIndex(h => typeof h === 'string' && h.startsWith('Código'));
        const regIdx = fileHeaders.indexOf('No. Registro');
        const nameIdx = fileHeaders.indexOf('Nombre Molino');
        const commIdx = fileHeaders.indexOf('ID Comunidad');
        const latIdx = fileHeaders.indexOf('Latitud');
        const lonIdx = fileHeaders.indexOf('Longitud');
        const statusIdx = fileHeaders.indexOf('Estado Molino');
        const notesIdx = fileHeaders.indexOf('Notas Molino');
        const pumpSerIdx = fileHeaders.indexOf('[Bomba] Serial');
        const pumpModIdx = fileHeaders.indexOf('[Bomba] Modelo');

        ws.eachRow((row, rowNum) => {
            if (rowNum <= 2) return;
            const vals = row.values.slice(1);
            if (!vals.some(v => v !== null && v !== undefined && v !== '')) return;

            const millId = vals[idIdx] ? Number(vals[idIdx]) : null;
            const code = (vals[codeIdx] || '').toString().trim();
            const registrationNumber = regIdx >= 0 ? (vals[regIdx] || '').toString().trim() || null : null;
            const name = nameIdx >= 0 ? (vals[nameIdx] || '').toString().trim() || null : null;
            const communityId = commIdx >= 0 && vals[commIdx] ? Number(vals[commIdx]) : null;
            const latitude = latIdx >= 0 && vals[latIdx] !== undefined && vals[latIdx] !== '' ? parseFloat(vals[latIdx]) : null;
            const longitude = lonIdx >= 0 && vals[lonIdx] !== undefined && vals[lonIdx] !== '' ? parseFloat(vals[lonIdx]) : null;
            const status = statusIdx >= 0 ? (vals[statusIdx] || '').toString().trim().toUpperCase() : null;
            const notes = notesIdx >= 0 ? (vals[notesIdx] || '').toString().trim() || null : null;
            
            const pumpSerial = pumpSerIdx >= 0 ? (vals[pumpSerIdx] || '').toString().trim() || null : null;
            const pumpModel = pumpModIdx >= 0 ? (vals[pumpModIdx] || '').toString().trim() || null : null;

            if (!code) {
                errors.push({ sheet: 'Molinos', row: rowNum, col: 'Código', message: 'Requerido.' });
                return;
            }

            if (parsedCodes.has(code.toLowerCase())) {
                errors.push({ sheet: 'Molinos', row: rowNum, col: 'Código', message: 'Duplicado en Excel.' });
                return;
            }
            parsedCodes.add(code.toLowerCase());

            const ownerId = dbMillCodes.get(code.toLowerCase());
            if (ownerId && ownerId !== millId) {
                errors.push({ sheet: 'Molinos', row: rowNum, col: 'Código', message: 'Ya existe en BD.' });
                return;
            }

            if (communityId && !dbCommIds.has(communityId)) {
                errors.push({ sheet: 'Molinos', row: rowNum, col: 'ID Comunidad', message: 'Comunidad no existe.' });
                return;
            }

            if (status && !STATUS_VALUES.includes(status)) {
                errors.push({ sheet: 'Molinos', row: rowNum, col: 'Estado Molino', message: `Usa ${STATUS_VALUES.join(',')}` });
                return;
            }

            // Extract Components
            const componentsToUpsert = [];
            for (const [colIdx, compName] of compColsMap.entries()) {
                const compStatus = (vals[colIdx] || '').toString().trim().toUpperCase();
                if (compStatus) {
                    if (!COMP_STATUS_VALUES.includes(compStatus)) {
                        errors.push({ sheet: 'Molinos', row: rowNum, col: `[Comp] ${compName}`, message: 'Estado de componente inválido.' });
                    } else {
                        const compId = compNameMap.get(compName);
                        if (compId) {
                            componentsToUpsert.push({ component_id: compId, status: compStatus });
                        }
                    }
                }
            }

            const record = {
                code, registration_number: registrationNumber, name, community_id: communityId,
                latitude, longitude, status: status || 'OPERATIONAL', notes,
                _pump: pumpSerial ? { serial_number: pumpSerial, model: pumpModel } : null,
                _components: componentsToUpsert
            };

            if (millId) {
                if (!dbMillIds.has(millId)) {
                    errors.push({ sheet: 'Molinos', row: rowNum, col: 'ID', message: 'No existe en BD.' });
                    return;
                }
                parsedIds.add(millId);
                preview.update.push({ mill_id: millId, ...record });
            } else {
                preview.create.push(record);
            }
        });

        return { errors, preview };
    },

    async applyChanges(preview, onProgress) {
        const results = { success: 0, errors: [] };
        const total = preview.update.length + preview.create.length;
        let done = 0;

        const tick = (label) => { done++; onProgress?.(Math.round((done / total) * 100), label); };

        // ── Hereda lat/lon de la comunidad si el molino no tiene ─────────
        const communityCoordCache = new Map();
        const fillCoords = async (data) => {
            const needsLat = data.latitude  === null || data.latitude  === undefined || data.latitude  === '';
            const needsLon = data.longitude === null || data.longitude === undefined || data.longitude === '';
            if ((needsLat || needsLon) && data.community_id) {
                if (!communityCoordCache.has(data.community_id)) {
                    const { data: comm } = await supabase
                        .from('community').select('latitude, longitude')
                        .eq('community_id', data.community_id).single();
                    communityCoordCache.set(data.community_id, comm || {});
                }
                const comm = communityCoordCache.get(data.community_id);
                if (needsLat  && comm.latitude  !== null && comm.latitude  !== undefined) data.latitude  = comm.latitude;
                if (needsLon && comm.longitude !== null && comm.longitude !== undefined) data.longitude = comm.longitude;
            }
            return data;
        };

        const processPump = async (millId, pumpData) => {
            if (!pumpData) return;
            
            // Get current active pump
            const { data: currentPumps } = await supabase.from('mill_pump').select('id, pump(serial_number)').eq('mill_id', millId).is('removed_date', null);
            const currentActive = currentPumps?.[0];

            if (currentActive && currentActive.pump?.serial_number === pumpData.serial_number) {
                return; // Nothing to change
            }

            // Unlink current
            if (currentActive) {
                await supabase.from('mill_pump').update({ removed_date: new Date().toISOString() }).eq('id', currentActive.id);
            }

            // Find or create pump
            let targetPumpId;
            const { data: existingPump } = await supabase.from('pump').select('pump_id').eq('serial_number', pumpData.serial_number).single();
            
            if (existingPump) {
                targetPumpId = existingPump.pump_id;
            } else {
                const { data: newPump, error: pErr } = await supabase.from('pump').insert({
                    serial_number: pumpData.serial_number, model: pumpData.model || 'N/A', status: 'OPERATIONAL'
                }).select().single();
                if (pErr) throw pErr;
                targetPumpId = newPump.pump_id;
            }

            // Install new
            await supabase.from('mill_pump').insert({ mill_id: millId, pump_id: targetPumpId });
        };

        const processComponents = async (millId, components) => {
            if (!components || components.length === 0) return;

            // Fetch existing links for this mill
            const { data: existingLinks } = await supabase.from('mill_has_component').select('id, component_id, status').eq('mill_id', millId);
            const linkMap = new Map((existingLinks || []).map(l => [l.component_id, l]));

            for (const c of components) {
                const existing = linkMap.get(c.component_id);
                if (existing) {
                    if (existing.status !== c.status) {
                        await supabase.from('mill_has_component').update({ status: c.status }).eq('id', existing.id);
                        // Also log to history
                        await supabase.from('component_history').insert({
                            mill_component_id: existing.id, mill_id: millId, component_id: c.component_id,
                            status: c.status, event_date: new Date().toISOString(), notes: 'Cargue Masivo', source_type: 'bulk_upload'
                        });
                    }
                } else {
                    const { data: newLink } = await supabase.from('mill_has_component').insert({
                        mill_id: millId, component_id: c.component_id, status: c.status, installed_date: new Date().toISOString()
                    }).select().single();
                    if (newLink) {
                        await supabase.from('component_history').insert({
                            mill_component_id: newLink.id, mill_id: millId, component_id: c.component_id,
                            status: c.status, event_date: new Date().toISOString(), notes: 'Instalado via Cargue Masivo', source_type: 'bulk_upload'
                        });
                    }
                }
            }
        };

        // UPDATE
        for (const m of preview.update) {
            try {
                const { mill_id, _pump, _components, ...rawData } = m;
                rawData.updated_at = new Date().toISOString();
                const data = await fillCoords(rawData);

                const { error } = await supabase.from('mill').update(data).eq('mill_id', mill_id);
                if (error) throw error;

                await processPump(mill_id, _pump);
                await processComponents(mill_id, _components);

                results.success++;
                tick(`Actualizado: ${data.code}`);
            } catch (err) {
                results.errors.push(`Molino ${m.code}: ${err.message}`);
                tick(`Error: ${m.code}`);
            }
        }

        // CREATE
        for (const m of preview.create) {
            try {
                const { _pump, _components, ...rawData } = m;
                const data = await fillCoords(rawData);
                const { data: newMill, error } = await supabase.from('mill').insert(data).select().single();
                if (error) throw error;

                await processPump(newMill.mill_id, _pump);
                await processComponents(newMill.mill_id, _components);

                results.success++;
                tick(`Creado: ${data.code}`);
            } catch (err) {
                results.errors.push(`Nuevo molino ${m.code}: ${err.message}`);
                tick(`Error: ${m.code}`);
            }
        }

        return results;
    },

    // ────────────────────────────────────────────────────────────
    // CREACIÓN MASIVA DESDE COMUNIDADES
    // ────────────────────────────────────────────────────────────

    /**
     * Retorna comunidades que NO tienen ningún molino asignado.
     * La detección se hace en JS para evitar limitaciones del cliente Supabase
     * con LEFT JOIN ... WHERE IS NULL.
     */
    async getCommunitiesWithoutMill() {
        const [
            { data: allCommunities },
            { data: millsWithComm }
        ] = await Promise.all([
            supabase
                .from('community')
                .select('community_id, name, municipality, department, latitude, longitude')
                .order('name'),
            supabase
                .from('mill')
                .select('community_id')
                .not('community_id', 'is', null)
        ]);

        const assignedIds = new Set((millsWithComm || []).map(m => m.community_id));
        return (allCommunities || []).filter(c => !assignedIds.has(c.community_id));
    },

    /**
     * Genera un código único para un molino basado en el nombre de la comunidad.
     * Formato: MOL-{ABC}-{YYYY}-{NN} (3 letras + año + secuencial)
     * Verifica en la BD que el código no exista antes de usarlo.
     */
    async _generateUniqueCode(communityName, existingCodes) {
        // Limpiar nombre: quitar tildes, tomar primeras 3 letras uppercase
        const clean = (communityName || 'UNK')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '')
            .toUpperCase()
            .slice(0, 3)
            .padEnd(3, 'X');

        const year = new Date().getFullYear();
        let n = 1;
        let code;
        do {
            code = `MOL-${clean}-${year}-${String(n).padStart(2, '0')}`;
            n++;
        } while (existingCodes.has(code));

        existingCodes.add(code); // Reservar para el siguiente
        return code;
    },

    /**
     * Crea molinos estándar en lote a partir de comunidades seleccionadas.
     * @param {Array<{community_id, name, municipality, department, latitude, longitude}>} communities
     * @param {Function} onProgress  (pct: number, label: string) => void
     */
    async createMillsFromCommunities(communities, onProgress) {
        const results = { success: 0, errors: [], created: [] };
        const total = communities.length;
        let done = 0;

        const tick = (label) => { done++; onProgress?.(Math.round((done / total) * 100), label); };

        // Obtener códigos existentes para evitar duplicados
        const { data: existingMills } = await supabase.from('mill').select('code');
        const existingCodes = new Set((existingMills || []).map(m => m.code));

        for (const comm of communities) {
            try {
                const code = await this._generateUniqueCode(comm.name, existingCodes);

                const millData = {
                    code,
                    name:          `Molino ${comm.name}`,
                    community_id:  comm.community_id,
                    status:        'OPERATIONAL',
                    latitude:      comm.latitude  ?? null,
                    longitude:     comm.longitude ?? null,
                    notes:         `Creado automáticamente desde comunidad: ${comm.name}`,
                };

                const { data: newMill, error } = await supabase
                    .from('mill')
                    .insert(millData)
                    .select()
                    .single();

                if (error) throw error;

                results.success++;
                results.created.push({ mill_id: newMill.mill_id, code, community: comm.name });
                tick(`Creado: ${code} (${comm.name})`);
            } catch (err) {
                results.errors.push(`Comunidad "${comm.name}": ${err.message}`);
                tick(`Error: ${comm.name}`);
            }
        }

        return results;
    }
};
