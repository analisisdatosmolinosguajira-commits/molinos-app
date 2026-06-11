import ExcelJS from 'exceljs';
import { supabase } from './supabase';

// ─────────────────────────────────────────────────────────
// COLUMN DEFINITIONS
// Índices (0-based en vals[]): coinciden exactamente con el orden de columnas
// 0=concertation_id  1=code  2=community_id  3=community_name(info)
// 4=meeting_date  5=status  6=decision  7=conditions
// 8=notes  9=act_url  10=closing_note
// ─────────────────────────────────────────────────────────
const CONCERTATION_COLS = [
    { key: 'concertation_id', header: 'ID Concertación',     hint: 'NO MODIFICAR – Clave única. Vacío = registro nuevo.', width: 16, locked: true },
    { key: 'code',            header: 'Código',               hint: 'NO MODIFICAR – Generado automáticamente.', width: 14, locked: true },
    { key: 'community_id',    header: 'ID Comunidad *',       hint: 'Requerido. Debe ser un ID válido de la tabla de comunidades.', width: 14, required: true },
    { key: '_comm_name',      header: 'Comunidad (info)',     hint: 'Solo referencia – no se modifica aquí.', width: 28, locked: true },
    { key: 'meeting_date',    header: 'Fecha Reunión',        hint: 'Formato: YYYY-MM-DD (ej: 2024-03-15)', width: 18 },
    { key: 'status',          header: 'Estado',               hint: 'Valores: pendiente | en_proceso | finalizada | cancelada', width: 16 },
    { key: 'decision',        header: 'Decisión',             hint: 'Valores: pending | approved | rejected | conditional', width: 16 },
    { key: 'conditions',      header: 'Condiciones',          hint: 'Condiciones o compromisos acordados.', width: 40 },
    { key: 'notes',           header: 'Notas',                hint: 'Observaciones generales de la reunión.', width: 40 },
    { key: 'act_url',         header: 'Link Acta Drive',      hint: 'URL del PDF firmado en Google Drive (opcional).', width: 40 },
    { key: 'closing_note',    header: 'Nota de Cierre',       hint: 'Conclusiones al finalizar el acta.', width: 40 },
];

const STATUS_VALUES   = ['pendiente', 'en_proceso', 'finalizada', 'cancelada'];
const DECISION_VALUES = ['pending', 'approved', 'rejected', 'conditional'];

// ── STYLES ────────────────────────────────────────────────
const DARK_TEAL = '134E4A';
const LOCKED_BG = 'E8ECF0';
const HINT_BG   = 'F0FAF9';
const ACCENT    = '0F766E';

function applyHeaderStyle(cell) {
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + DARK_TEAL } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border    = { bottom: { style: 'medium', color: { argb: 'FF' + ACCENT } } };
}

function applyHintStyle(cell) {
    cell.font      = { italic: true, color: { argb: 'FF64748B' }, size: 8 };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + HINT_BG } };
    cell.alignment = { wrapText: true, vertical: 'top' };
}

function applyDataCell(cell, locked = false, required = false) {
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
}

function buildSheet(wb, rows) {
    const ws = wb.addWorksheet('Concertaciones');

    // Column widths
    ws.columns = CONCERTATION_COLS.map((c, i) => ({
        key: String.fromCharCode(65 + i),
        width: c.width
    }));

    // ROW 1 – Headers
    const headerRow = ws.addRow(CONCERTATION_COLS.map(c => c.header));
    headerRow.height = 32;
    headerRow.eachCell((cell, colNum) => applyHeaderStyle(cell));

    // ROW 2 – Hints
    const hintRow = ws.addRow(CONCERTATION_COLS.map(c => c.hint));
    hintRow.height = 44;
    hintRow.eachCell(cell => applyHintStyle(cell));

    // DATA ROWS
    rows.forEach(rowData => {
        const values = CONCERTATION_COLS.map(c => {
            const v = rowData[c.key];
            return (v !== undefined && v !== null) ? v : '';
        });
        const dr = ws.addRow(values);
        dr.height = 20;
        dr.eachCell((cell, colNum) => {
            const col = CONCERTATION_COLS[colNum - 1];
            applyDataCell(cell, col.locked, col.required);
        });
    });

    // ── VALIDATIONS ──────────────────────────────────────
    const maxRow = Math.max(rows.length + 2, 300);
    const statusColLetter   = String.fromCharCode(65 + CONCERTATION_COLS.findIndex(c => c.key === 'status'));
    const decisionColLetter = String.fromCharCode(65 + CONCERTATION_COLS.findIndex(c => c.key === 'decision'));

    for (let r = 3; r <= maxRow; r++) {
        ws.getCell(`${statusColLetter}${r}`).dataValidation = {
            type: 'list', allowBlank: true,
            formulae: [`"${STATUS_VALUES.join(',')}"`],
            showErrorMessage: true,
            errorTitle: 'Estado inválido',
            error: `Use uno de: ${STATUS_VALUES.join(', ')}`
        };
        ws.getCell(`${decisionColLetter}${r}`).dataValidation = {
            type: 'list', allowBlank: true,
            formulae: [`"${DECISION_VALUES.join(',')}"`],
            showErrorMessage: true,
            errorTitle: 'Decisión inválida',
            error: `Use uno de: ${DECISION_VALUES.join(', ')}`
        };
    }

    // Freeze top 2 rows + first 2 cols (ID + Code)
    ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 2 }];

    return ws;
}

// ── PUBLIC API ─────────────────────────────────────────────
export const ConcertationBulkService = {

    // 1. DOWNLOAD TEMPLATE
    async downloadTemplate() {
        const [{ data: concertations }, { data: communities }] = await Promise.all([
            supabase.from('community_concertation').select(`
                concertation_id, code, community_id, meeting_date,
                status, decision, conditions, notes, act_url, closing_note,
                community(name)
            `).order('meeting_date', { ascending: false }),
            supabase.from('community').select('community_id, name').order('name')
        ]);

        const communityMap = {};
        (communities || []).forEach(c => { communityMap[c.community_id] = c.name; });

        const rows = (concertations || []).map(c => ({
            concertation_id: c.concertation_id,
            code:            c.code || '',
            community_id:    c.community_id,
            _comm_name:      c.community?.name || communityMap[c.community_id] || '',
            meeting_date:    c.meeting_date || '',
            status:          c.status || '',
            decision:        c.decision || '',
            conditions:      c.conditions || '',
            notes:           c.notes || '',
            act_url:         c.act_url || '',
            closing_note:    c.closing_note || '',
        }));

        const wb = new ExcelJS.Workbook();
        wb.creator  = 'Molinos Guajira';
        wb.created  = new Date();

        buildSheet(wb, rows);

        // Reference sheet: Comunidades
        const commWs = wb.addWorksheet('Comunidades_Validas');
        commWs.addRow(['ID Comunidad', 'Nombre']);
        commWs.getRow(1).font = { bold: true };
        (communities || []).forEach(c => commWs.addRow([c.community_id, c.name]));
        commWs.state = 'visible';

        // Reference sheet: Valores válidos
        const refWs = wb.addWorksheet('Valores_Validos');
        refWs.addRow(['Estado (status)', 'Decisión (decision)']);
        refWs.getRow(1).font = { bold: true };
        const maxLen = Math.max(STATUS_VALUES.length, DECISION_VALUES.length);
        for (let i = 0; i < maxLen; i++) {
            refWs.addRow([STATUS_VALUES[i] || '', DECISION_VALUES[i] || '']);
        }
        refWs.state = 'visible';

        const buffer = await wb.xlsx.writeBuffer();
        const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url    = URL.createObjectURL(blob);
        const a      = document.createElement('a');
        a.href       = url;
        a.download   = `Plantilla_Concertaciones_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    // 2. PARSE & VALIDATE
    async parseAndValidate(file) {
        const errors  = [];
        const preview = { update: [], create: [] };

        const buffer = await file.arrayBuffer();
        const wb     = new ExcelJS.Workbook();
        await wb.xlsx.load(buffer);

        const ws = wb.getWorksheet('Concertaciones');
        if (!ws) {
            errors.push({ sheet: 'General', row: '-', col: '-', message: 'No se encontró la hoja "Concertaciones". Descargue la plantilla correcta.' });
            return { errors, preview };
        }

        // Validate headers (row 1)
        const fileHeaders = ws.getRow(1).values.slice(1);
        const expectedHeaders = CONCERTATION_COLS.map(c => c.header);
        const missingHeaders  = expectedHeaders.filter((h, i) =>
            !fileHeaders[i]?.toString().startsWith(h.replace(' *', ''))
        );
        if (missingHeaders.length > 0) {
            errors.push({ sheet: 'Concertaciones', row: '1', col: '-', message: `Columnas faltantes o fuera de orden: ${missingHeaders.join(', ')}. Use la plantilla original.` });
            return { errors, preview };
        }

        // Fetch DB data for cross-validation
        const [{ data: dbConc }, { data: dbComms }] = await Promise.all([
            supabase.from('community_concertation').select('concertation_id, code'),
            supabase.from('community').select('community_id, name')
        ]);

        const dbConcIds  = new Set((dbConc  || []).map(c => c.concertation_id));
        const dbCommIds  = new Set((dbComms || []).map(c => c.community_id));
        const dbCommMap  = new Map((dbComms || []).map(c => [c.community_id, c.name]));
        const parsedIds  = new Set(); // track duplicates within the file

        ws.eachRow((row, rowNum) => {
            if (rowNum <= 2) return; // skip header + hint
            const vals = row.values.slice(1);

            // Empty row guard
            const hasContent = vals.some(v => v !== null && v !== undefined && v !== '');
            if (!hasContent) return;

            // Extract values by column index
            const concertationId = vals[0] ? Number(vals[0]) : null;
            const communityId    = vals[2] ? Number(vals[2]) : null;
            const meetingDate    = (vals[4] || '').toString().trim();
            const status         = (vals[5] || '').toString().trim().toLowerCase();
            const decision       = (vals[6] || '').toString().trim().toLowerCase();
            const conditions     = (vals[7] || '').toString().trim() || null;
            const notes          = (vals[8] || '').toString().trim() || null;
            const actUrl         = (vals[9] || '').toString().trim() || null;
            const closingNote    = (vals[10] || '').toString().trim() || null;

            // Required: community_id
            if (!communityId) {
                errors.push({ sheet: 'Concertaciones', row: rowNum, col: 'ID Comunidad', message: 'El ID de comunidad es requerido.' });
                return;
            }

            // community_id must exist
            if (!dbCommIds.has(communityId)) {
                errors.push({ sheet: 'Concertaciones', row: rowNum, col: 'ID Comunidad', message: `La comunidad con ID ${communityId} no existe en la base de datos.` });
                return;
            }

            // Status validation
            if (status && !STATUS_VALUES.includes(status)) {
                errors.push({ sheet: 'Concertaciones', row: rowNum, col: 'Estado', message: `Estado inválido: "${status}". Valores permitidos: ${STATUS_VALUES.join(', ')}` });
                return;
            }

            // Decision validation
            if (decision && !DECISION_VALUES.includes(decision)) {
                errors.push({ sheet: 'Concertaciones', row: rowNum, col: 'Decisión', message: `Decisión inválida: "${decision}". Valores permitidos: ${DECISION_VALUES.join(', ')}` });
                return;
            }

            // Meeting date format validation
            if (meetingDate && !/^\d{4}-\d{2}-\d{2}$/.test(meetingDate)) {
                errors.push({ sheet: 'Concertaciones', row: rowNum, col: 'Fecha Reunión', message: `Formato de fecha inválido: "${meetingDate}". Use YYYY-MM-DD.` });
                return;
            }

            // Build the record payload (only fields that can be updated)
            const record = {
                community_id:  communityId,
                meeting_date:  meetingDate || null,
                status:        status     || null,
                decision:      decision   || null,
                conditions,
                notes,
                act_url:       actUrl,
                closing_note:  closingNote,
            };

            if (concertationId) {
                // UPDATE: ID must exist in DB
                if (!dbConcIds.has(concertationId)) {
                    errors.push({ sheet: 'Concertaciones', row: rowNum, col: 'ID Concertación', message: `El ID ${concertationId} no existe en la base de datos.` });
                    return;
                }
                if (parsedIds.has(concertationId)) {
                    errors.push({ sheet: 'Concertaciones', row: rowNum, col: 'ID Concertación', message: `El ID ${concertationId} aparece duplicado en la planilla.` });
                    return;
                }
                parsedIds.add(concertationId);
                preview.update.push({ concertation_id: concertationId, ...record, _comm_name: dbCommMap.get(communityId) || '' });
            } else {
                // CREATE: community_id required, status defaults to 'pendiente'
                if (!record.status) record.status = 'pendiente';
                if (!record.decision) record.decision = 'pending';
                preview.create.push({ ...record, _comm_name: dbCommMap.get(communityId) || '' });
            }
        });

        return { errors, preview };
    },

    // 3. APPLY CHANGES
    async applyChanges(preview, onProgress) {
        const results = { success: 0, errors: [] };
        const total   = preview.update.length + preview.create.length;
        let done      = 0;

        const tick = (label) => { done++; onProgress?.(Math.round((done / total) * 100), label); };

        // UPDATE
        for (const c of preview.update) {
            const { concertation_id, _comm_name, ...data } = c;
            const { error } = await supabase
                .from('community_concertation')
                .update(data)
                .eq('concertation_id', concertation_id);
            if (error) results.errors.push(`Concertación ID ${concertation_id}: ${error.message}`);
            else results.success++;
            tick(`Actualizando: ${_comm_name || 'ID ' + concertation_id}`);
        }

        // CREATE
        for (const c of preview.create) {
            const { _comm_name, ...data } = c;
            const { error } = await supabase.from('community_concertation').insert(data);
            if (error) results.errors.push(`Nueva concertación (${_comm_name}): ${error.message}`);
            else results.success++;
            tick(`Creando: ${_comm_name}`);
        }

        return results;
    }
};
