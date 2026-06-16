import ExcelJS from 'exceljs';
import { supabase } from './supabase';

const BRAND_BLUE  = '2563EB';
const HINT_BG     = 'EFF6FF';

function applyHeaderStyle(cell) {
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_BLUE } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border    = { bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } } };
}

function applyHintStyle(cell) {
    cell.font      = { italic: true, color: { argb: 'FF64748B' }, size: 8 };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + HINT_BG } };
    cell.alignment = { wrapText: true, vertical: 'top' };
}

function applyDataStyle(cell, required, locked) {
    if (locked) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8ECF0' } };
        cell.font = { color: { argb: 'FF94A3B8' }, size: 10 };
    } else if (required) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
        cell.font = { size: 10 };
    } else {
        cell.font = { size: 10 };
    }
    cell.alignment = { vertical: 'middle' };
}

const COLS = [
    { key: 'diagnosis_id', header: 'ID Diagnóstico', hint: 'NO MODIFICAR. Vacío=Nuevo', width: 36, locked: true },
    { key: 'mill_code', header: 'Código Molino *', hint: 'Requerido. Ej: M-001', width: 15, required: true },
    { key: 'diagnosis_type', header: 'Tipo Diagnóstico', hint: 'PREVENTIVO, CORRECTIVO, PREDICTIVO', width: 20 },
    { key: 'priority', header: 'Prioridad', hint: 'BAJA, MEDIA, ALTA, URGENTE', width: 15 },
    { key: 'severity', header: 'Severidad', hint: 'LEVE, MODERADO, CRÍTICO', width: 15 },
    { key: 'status', header: 'Estado', hint: 'PENDING, IN_PROGRESS, COMPLETED, CANCELLED', width: 15 },
    { key: 'crew_name', header: 'Cuadrilla', hint: 'Nombre exacto o ID de la cuadrilla', width: 20 },
    { key: 'diagnosis_date', header: 'Fecha Diag.', hint: 'YYYY-MM-DD', width: 15 },
    { key: 'scheduled_date', header: 'Fecha Prog.', hint: 'YYYY-MM-DD', width: 15 },
    { key: 'completion_date', header: 'Fecha Fin', hint: 'YYYY-MM-DD', width: 15 },
    { key: 'description', header: 'Descripción', hint: '', width: 35 },
    { key: 'drive_link', header: 'Enlace Drive', hint: 'URL del reporte', width: 30 },
    { key: 'notes', header: 'Notas Generales', hint: '', width: 30 },
    { key: 'technical_findings', header: 'Hallazgos Técnicos', hint: '', width: 35 },
    { key: 'root_cause_analysis', header: 'Causa Raíz', hint: '', width: 35 },
    { key: 'recommendations', header: 'Recomendaciones', hint: '', width: 35 },
    { key: 'pump_condition', header: 'Condición Bomba', hint: 'BUENO, REGULAR, MALO, CRÍTICO', width: 20 },
    { key: 'pump_observations', header: 'Observaciones Bomba', hint: '', width: 30 },
];

export const DiagnosisBulkService = {

    async downloadTemplate() {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Diagnosticos', { views: [{ state: 'frozen', ySplit: 2 }] });

        ws.columns = COLS.map(c => ({ key: c.key, width: c.width }));
        const headerRow = ws.addRow(COLS.map(c => c.header));
        const hintRow   = ws.addRow(COLS.map(c => c.hint));

        headerRow.eachCell(c => applyHeaderStyle(c));
        hintRow.eachCell(c => applyHintStyle(c));
        headerRow.height = 20;
        hintRow.height   = 40;

        // Fetch existing diagnoses and populate
        const { data: existingDiagnoses } = await supabase
            .from('diagnosis')
            .select('*, mill(code), crew(name)')
            .order('created_at', { ascending: false });

        if (existingDiagnoses && existingDiagnoses.length > 0) {
            existingDiagnoses.forEach(diag => {
                const rowData = [
                    diag.diagnosis_id,
                    diag.mill?.code || diag.mill_code || '',
                    diag.diagnosis_type || '',
                    diag.priority || '',
                    diag.severity || '',
                    diag.status || '',
                    diag.crew?.name || '',
                    diag.diagnosis_date ? diag.diagnosis_date.split('T')[0] : '',
                    diag.scheduled_date ? diag.scheduled_date.split('T')[0] : '',
                    diag.completion_date ? diag.completion_date.split('T')[0] : '',
                    diag.description || '',
                    diag.drive_link || '',
                    diag.notes || '',
                    diag.technical_findings || '',
                    diag.root_cause_analysis || '',
                    diag.recommendations || '',
                    diag.pump_condition || '',
                    diag.pump_observations || ''
                ];
                ws.addRow(rowData);
            });
        }

        const maxRow = Math.max(1000, ws.rowCount + 100);

        // Data Validation for Dropdowns
        // C: Tipo Diagnóstico
        // D: Prioridad
        // E: Severidad
        // F: Estado
        // Q: Condición Bomba
        for (let r = 3; r <= maxRow; r++) {
            ws.getCell(`C${r}`).dataValidation = {
                type: 'list', allowBlank: true, formulae: ['"PREVENTIVO,CORRECTIVO,PREDICTIVO"']
            };
            ws.getCell(`D${r}`).dataValidation = {
                type: 'list', allowBlank: true, formulae: ['"BAJA,MEDIA,ALTA,URGENTE"']
            };
            ws.getCell(`E${r}`).dataValidation = {
                type: 'list', allowBlank: true, formulae: ['"LEVE,MODERADO,CRÍTICO"']
            };
            ws.getCell(`F${r}`).dataValidation = {
                type: 'list', allowBlank: true, formulae: ['"PENDING,IN_PROGRESS,COMPLETED,CANCELLED"']
            };
            ws.getCell(`Q${r}`).dataValidation = {
                type: 'list', allowBlank: true, formulae: ['"BUENO,REGULAR,MALO,CRÍTICO"']
            };
        }

        // Color coding required and locked columns
        for(let i=0; i<COLS.length; i++){
            for(let r=3; r<=maxRow; r++){
                applyDataStyle(ws.getCell(r, i+1), COLS[i].required, COLS[i].locked);
            }
        }

        // Add Available Mills worksheet
        const wsMills = wb.addWorksheet('Molinos_Disponibles');
        wsMills.columns = [
            { key: 'id', header: 'ID Sistema', width: 12 },
            { key: 'code', header: 'Código', width: 15 },
            { key: 'name', header: 'Nombre', width: 30 },
            { key: 'community', header: 'Comunidad', width: 30 }
        ];
        wsMills.getRow(1).eachCell(c => applyHeaderStyle(c));
        
        const { data: millsData } = await supabase.from('mill').select('mill_id, code, name, community:community!fk_mill_community(name)').order('code');
        if (millsData) {
            millsData.forEach(m => {
                wsMills.addRow([m.mill_id, m.code, m.name, m.community?.name || '']);
            });
        }

        const wsInstructions = wb.addWorksheet('Instrucciones');
        wsInstructions.columns = [{ key: 'A', width: 4 }, { key: 'B', width: 30 }, { key: 'C', width: 70 }];
        wsInstructions.addRow([]);
        const titleRow = wsInstructions.addRow(['', 'INSTRUCCIONES DE CARGUE - DIAGNÓSTICOS']);
        titleRow.font = { bold: true, size: 14, color: { argb: 'FF2563EB' } };
        wsInstructions.addRow([]);
        
        wsInstructions.addRow(['', '1. CÓDIGO MOLINO:', 'Debe coincidir exactamente con el código del molino en el sistema (Ej. M-001)']).getCell(2).font = { bold: true };
        wsInstructions.addRow(['', '2. CUADRILLA:', 'Nombre de la cuadrilla responsable. Si no se encuentra, se dejará vacía.']).getCell(2).font = { bold: true };
        wsInstructions.addRow(['', '3. ESTADO:', 'Si se deja vacío, asumirá COMPLETED por defecto. Valores válidos: PENDING, IN_PROGRESS, COMPLETED, CANCELLED.']).getCell(2).font = { bold: true };

        const buffer = await wb.xlsx.writeBuffer();
        const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url    = window.URL.createObjectURL(blob);
        const a      = document.createElement('a');
        a.href       = url;
        a.download   = 'Plantilla_Cargue_Masivo_Diagnosticos.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
    },

    async parseAndValidate(file) {
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(file);
        const ws = wb.getWorksheet('Diagnosticos');
        if (!ws) throw new Error("La hoja debe llamarse 'Diagnosticos'");

        const errors = [];
        const toCreate = [];
        const toUpdate = [];

        // Pre-fetch related data
        const { data: mills } = await supabase.from('mill').select('mill_id, code');
        const { data: crews } = await supabase.from('crew').select('crew_id, name');
        const { data: activePumps } = await supabase.from('mill_pump').select('mill_id, pump_id').is('removed_date', null);

        const millMap = new Map((mills || []).map(m => [m.code?.trim().toUpperCase(), m.mill_id]));
        const crewMap = new Map((crews || []).map(c => [c.name?.trim().toUpperCase(), c.crew_id]));
        const pumpMap = new Map((activePumps || []).map(p => [p.mill_id, p.pump_id]));

        let rowCount = ws.rowCount;
        for (let r = 3; r <= rowCount; r++) {
            const row = ws.getRow(r);
            
            // Map row values by column configuration
            const rowData = {};
            COLS.forEach((col, index) => {
                let val = row.getCell(index + 1).value;
                if (val && typeof val === 'object' && val.text) val = val.text; // rich text
                if (val && typeof val === 'object' && val.result !== undefined) val = val.result; // formula
                rowData[col.key] = val !== null && val !== undefined ? String(val).trim() : '';
            });

            // Check if row is entirely empty
            if (Object.values(rowData).every(v => v === '')) continue;

            const code = rowData.mill_code?.toUpperCase();
            if (!code) {
                errors.push({ sheet: 'Diagnosticos', row: r, message: "Código Molino es obligatorio." });
                continue;
            }

            const mill_id = millMap.get(code);
            if (!mill_id) {
                errors.push({ sheet: 'Diagnosticos', row: r, message: `No se encontró molino con código: ${code}` });
                continue;
            }

            // Crew parsing
            let crew_id = null;
            if (rowData.crew_name) {
                crew_id = crewMap.get(rowData.crew_name.toUpperCase());
                // Fallback to numeric ID if possible
                if (!crew_id && !isNaN(parseInt(rowData.crew_name))) {
                    crew_id = parseInt(rowData.crew_name);
                }
            }

            // Basic Validations for Enums
            let diagnosis_type = rowData.diagnosis_type ? rowData.diagnosis_type.toUpperCase() : 'PREDICTIVO';
            if (!['PREVENTIVO', 'CORRECTIVO', 'PREDICTIVO'].includes(diagnosis_type)) diagnosis_type = 'PREDICTIVO';

            let priority = rowData.priority ? rowData.priority.toUpperCase() : 'MEDIA';
            if (!['BAJA', 'MEDIA', 'ALTA', 'URGENTE'].includes(priority)) priority = 'MEDIA';

            let severity = rowData.severity ? rowData.severity.toUpperCase() : 'MODERADO';
            if (!['LEVE', 'MODERADO', 'CRÍTICO'].includes(severity)) severity = 'MODERADO';

            let status = rowData.status ? rowData.status.toUpperCase() : 'COMPLETED';
            if (!['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) status = 'COMPLETED';

            let pump_condition = rowData.pump_condition ? rowData.pump_condition.toUpperCase() : null;
            if (pump_condition && !['BUENO', 'REGULAR', 'MALO', 'CRÍTICO'].includes(pump_condition)) pump_condition = null;

            // Date parsing
            let diagnosis_date = rowData.diagnosis_date || new Date().toISOString().split('T')[0];

            const record = {
                mill_id,
                mill_code: code,
                crew_id,
                diagnosis_type,
                priority,
                severity,
                status,
                diagnosis_date,
                scheduled_date: rowData.scheduled_date || null,
                completion_date: rowData.completion_date || null,
                description: rowData.description || 'Cargue masivo de diagnóstico histórico',
                drive_link: rowData.drive_link || null,
                notes: rowData.notes || null,
                technical_findings: rowData.technical_findings || null,
                root_cause_analysis: rowData.root_cause_analysis || null,
                recommendations: rowData.recommendations || null,
                pump_condition,
                pump_observations: rowData.pump_observations || null,
                pump_id: pumpMap.get(mill_id) || null
            };

            if (rowData.diagnosis_id && rowData.diagnosis_id.trim() !== '') {
                toUpdate.push({ diagnosis_id: rowData.diagnosis_id.trim(), ...record });
            } else {
                toCreate.push(record);
            }
        }

        return { errors, preview: { create: toCreate, update: toUpdate } };
    },

    async applyChanges(preview, progressCallback) {
        let current = 0;
        const total = preview.create.length + preview.update.length;
        const errors = [];

        // UPDATES
        for (const item of preview.update) {
            try {
                const { mill_code, diagnosis_id, ...dbRecord } = item;
                const { error } = await supabase.from('diagnosis').update(dbRecord).eq('diagnosis_id', diagnosis_id);
                if (error) throw error;
                current++;
                if (progressCallback) {
                    const pct = Math.round((current / total) * 100);
                    progressCallback(pct, `Actualizando diagnóstico molino ${item.mill_code}...`);
                }
            } catch (e) {
                errors.push(`Actualización Molino ${item.mill_code}: ${e.message}`);
            }
        }

        // CREATES
        for (const item of preview.create) {
            try {
                const { mill_code, ...dbRecord } = item;
                const { error } = await supabase.from('diagnosis').insert(dbRecord);
                if (error) throw error;
                current++;
                if (progressCallback) {
                    const pct = Math.round((current / total) * 100);
                    progressCallback(pct, `Insertando diagnóstico molino ${item.mill_code}...`);
                }
            } catch (e) {
                errors.push(`Inserción Molino ${item.mill_code}: ${e.message}`);
            }
        }

        if (progressCallback) progressCallback(100, "¡Proceso terminado!");
        return { success: current, errors };
    }
};
