import ExcelJS from 'exceljs';
import { supabase } from './supabase';

const BRAND_BLUE  = '1E3A8A';
const BRAND_LIGHT = 'EFF6FF';
const SYSTEM_COLOR = 'FFE0E0';    // rojo claro para sistemas
const COMP_COLOR = 'E8ECF0';      // gris para componentes

function applyHeaderStyle(cell, bgColor = BRAND_BLUE, textColor = 'FFFFFFFF') {
    cell.font      = { bold: true, color: { argb: textColor }, size: 10 };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgColor } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border    = { bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } } };
}

function applyHintStyle(cell) {
    cell.font      = { italic: true, color: { argb: 'FF64748B' }, size: 8 };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_LIGHT } };
    cell.alignment = { wrapText: true, vertical: 'top' };
}

function applyDataStyle(cell, required, locked, bgColor = null) {
    if (locked) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8ECF0' } };
        cell.font = { color: { argb: 'FF94A3B8' }, size: 10 };
    } else if (required) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
        cell.font = { size: 10 };
    } else if (bgColor) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgColor } };
        cell.font = { size: 10 };
    } else {
        cell.font = { size: 10 };
    }
    cell.alignment = { vertical: 'middle', wrapText: true };
}

const VALID_STATUSES = [
    'FUNCIONAL',
    'DESGASTADO',
    'REQUIERE_REVISION',
    'DANADO',
    'FALTANTE',
    'NO_REVISADO',
    'REQUIERE_CAMBIO',
    'NO_INSTALADO'
];

const MAIN_COLS_BASE = [
    { key: 'work_order_id',     header: 'ID Orden *',          hint: 'NO MODIFICAR. Vacío=Nueva OT, con valor=Actualizar', width: 14, locked: true },
    { key: 'code',              header: 'Código OT',            hint: 'Código auto-generado. NO MODIFICAR', width: 14, locked: true },
    { key: 'mill_code',         header: 'Código/ID Molino *',   hint: 'Requerido para nuevas OT (ID o Código)', width: 16, locked: true }, // locked = gray
    { key: 'crew_name',         header: 'Cuadrilla',            hint: 'Nombre de la cuadrilla (ver hoja Cuadrillas)', width: 22 },
    { key: 'type',              header: 'Tipo *',               hint: 'preventivo | correctivo | emergencia | mejora', width: 14, required: true },
    { key: 'priority',          header: 'Prioridad',            hint: 'LOW, MEDIUM, HIGH, CRITICAL', width: 12 },
    { key: 'status',            header: 'Estado',               hint: 'PENDING, IN_PROGRESS, COMPLETED, CANCELLED', width: 15 },
    { key: 'is_reintervention', header: 'Reintervención',       hint: 'SI o NO', width: 14 },
    { key: 'description',       header: 'Descripción *',        hint: 'Requerido. Título corto de la OT', width: 40, required: true },
    { key: 'diagnosis',         header: 'Diagnóstico Inicial',  hint: 'Diagnóstico previo o razón detallada', width: 35 },
    { key: 'notes',             header: 'Reporte Final',        hint: 'Resumen de labores, hallazgos y conclusiones', width: 60 },
    { key: 'final_observations',header: 'Observaciones Finales',hint: 'Observaciones finales de la OT', width: 60 },
    { key: 'scheduled_date',    header: 'Fecha Programada',     hint: 'YYYY-MM-DD', width: 15 },
    { key: 'start_date',        header: 'Fecha Inicio Real',    hint: 'YYYY-MM-DD', width: 15 },
    { key: 'end_date',          header: 'Fecha Fin Real',       hint: 'YYYY-MM-DD', width: 15 },
    { key: 'pump_id_to_install',header: 'ID Bomba Instalar',    hint: 'ID de la bomba a instalar (opcional)', width: 18 },
    { key: 'pump_id_to_remove', header: 'ID Bomba Remover',     hint: 'ID de la bomba a remover (opcional)', width: 18 },
    { key: 'pump_procedure_type',header:'Procedimiento Bomba',  hint: 'Si no hay bomba asignada: reparacion_bomba | bomba_nueva | bomba_sena', width: 25 },
    { key: 'pump_installation_notes',header:'Notas Bomba',      hint: 'Notas sobre la operación de la bomba', width: 35 },
    { key: 'report_url',        header: 'URL Reporte Externo',  hint: 'https://...', width: 30 },
];

async function getDynamicCols() {
    const { data: allSystemsRaw } = await supabase.from('mill_component').select('*').order('sort_order');
    const systems = (allSystemsRaw || []).filter(s => s.is_system);
    const children = (allSystemsRaw || []).filter(s => !s.is_system);
    
    systems.forEach(s => {
        s.children = children.filter(c => c.parent_component_id === s.component_id).sort((a,b) => a.sort_order - b.sort_order);
    });

    const dynCols = [];
    systems.forEach(sys => {
        dynCols.push({ 
            key: `sys_obs_${sys.component_id}`, 
            header: `[${sys.name}] Obs. Gral`, 
            hint: 'Observación general del sistema', 
            width: 40, 
            isSysObs: true, 
            sysId: sys.component_id,
            bgColor: SYSTEM_COLOR
        });
        sys.children.forEach(comp => {
            dynCols.push({ 
                key: `comp_status_${comp.component_id}`, 
                header: `[${comp.name}] Estado`, 
                hint: VALID_STATUSES.join(', '), 
                width: 20, 
                isCompStatus: true, 
                compId: comp.component_id,
                bgColor: COMP_COLOR
            });
            dynCols.push({ 
                key: `comp_obs_${comp.component_id}`, 
                header: `[${comp.name}] Obs.`, 
                hint: 'Observación del componente', 
                width: 35, 
                isCompObs: true, 
                compId: comp.component_id,
                bgColor: COMP_COLOR
            });
        });
    });
    return dynCols;
}

export const WorkOrderBulkService = {

    async downloadTemplate() {
        const wb = new ExcelJS.Workbook();

        const dynamicCols = await getDynamicCols();
        const ALL_COLS = [...MAIN_COLS_BASE, ...dynamicCols];

        // ── HOJA 1: Órdenes ──
        const wsMain = wb.addWorksheet('OrdenesTrabajo', { views: [{ state: 'frozen', ySplit: 2, xSplit: 3 }] });
        wsMain.columns = ALL_COLS.map(c => ({ key: c.key, width: c.width }));
        
        const headerRowMain = wsMain.addRow(ALL_COLS.map(c => c.header));
        const hintRowMain   = wsMain.addRow(ALL_COLS.map(c => c.hint));
        
        headerRowMain.eachCell((cell, colNumber) => {
            const col = ALL_COLS[colNumber - 1];
            if (col.isSysObs) applyHeaderStyle(cell, 'B91C1C'); // Dark red header for systems
            else if (col.isCompStatus || col.isCompObs) applyHeaderStyle(cell, '334155'); // Slate for components
            else applyHeaderStyle(cell);
        });
        
        hintRowMain.eachCell(c => applyHintStyle(c));
        headerRowMain.height = 30;
        hintRowMain.height   = 50;

        // Fetch existing work orders
        const { data: orders } = await supabase
            .from('work_order')
            .select('*, mill(code), crew(name)')
            .order('created_at', { ascending: false })
            .limit(500);

        // Fetch existing component statuses and system observations
        const orderIds = (orders || []).map(o => o.work_order_id);
        const compStatusMap = {};
        if (orderIds.length > 0) {
            const { data: csData } = await supabase
                .from('work_order_component_status')
                .select('work_order_id, component_id, status, observation')
                .in('work_order_id', orderIds);
            (csData || []).forEach(cs => {
                const key = `${cs.work_order_id}__${cs.component_id}`;
                compStatusMap[key] = cs;
            });
        }

        if (orders && orders.length > 0) {
            orders.forEach(wo => {
                const rowData = {
                    work_order_id: wo.work_order_id,
                    code: wo.code || '',
                    mill_code: wo.mill?.code || wo.mill?.name || wo.mill_id || '',
                    crew_name: wo.crew?.name || '',
                    type: wo.type || 'preventivo',
                    priority: wo.priority || 'MEDIUM',
                    status: wo.status || 'PENDING',
                    is_reintervention: wo.is_reintervention ? 'SI' : 'NO',
                    description: wo.description || '',
                    diagnosis: wo.diagnosis || '',
                    notes: wo.notes || '',
                    final_observations: wo.final_observations || '',
                    scheduled_date: wo.scheduled_date ? wo.scheduled_date.split('T')[0] : '',
                    start_date: wo.start_date ? wo.start_date.split('T')[0] : '',
                    end_date: wo.end_date ? wo.end_date.split('T')[0] : '',
                    pump_id_to_install: wo.pump_id_to_install || '',
                    pump_id_to_remove: wo.pump_id_to_remove || '',
                    pump_procedure_type: wo.pump_procedure_type || '',
                    pump_installation_notes: wo.pump_installation_notes || '',
                    report_url: wo.report_url || '',
                };

                // Add dynamic columns
                const sysObs = wo.system_observations || {};
                dynamicCols.forEach(col => {
                    if (col.isSysObs) {
                        rowData[col.key] = sysObs[col.sysId] || '';
                    } else if (col.isCompStatus) {
                        const csKey = `${wo.work_order_id}__${col.compId}`;
                        rowData[col.key] = compStatusMap[csKey]?.status || '';
                    } else if (col.isCompObs) {
                        const csKey = `${wo.work_order_id}__${col.compId}`;
                        rowData[col.key] = compStatusMap[csKey]?.observation || '';
                    }
                });

                const rowVals = ALL_COLS.map(c => rowData[c.key]);
                wsMain.addRow(rowVals);
            });
        }

        const maxMainRow = Math.max(300, wsMain.rowCount + 100);

        // Dropdowns en hoja Órdenes (Basic info)
        const typeColLetter = wsMain.getColumn(ALL_COLS.findIndex(c => c.key === 'type') + 1).letter;
        const priorityColLetter = wsMain.getColumn(ALL_COLS.findIndex(c => c.key === 'priority') + 1).letter;
        const statusColLetter = wsMain.getColumn(ALL_COLS.findIndex(c => c.key === 'status') + 1).letter;
        const reintColLetter = wsMain.getColumn(ALL_COLS.findIndex(c => c.key === 'is_reintervention') + 1).letter;
        const crewColLetter = wsMain.getColumn(ALL_COLS.findIndex(c => c.key === 'crew_name') + 1).letter;

        for (let r = 3; r <= maxMainRow; r++) {
            const pumpProcColLetter = wsMain.getColumn(ALL_COLS.findIndex(c => c.key === 'pump_procedure_type') + 1).letter;

            wsMain.getCell(`${typeColLetter}${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"preventivo,correctivo,emergencia,mejora"'] };
            wsMain.getCell(`${priorityColLetter}${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"LOW,MEDIUM,HIGH,CRITICAL"'] };
            wsMain.getCell(`${statusColLetter}${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"PENDING,IN_PROGRESS,COMPLETED,CANCELLED"'] };
            wsMain.getCell(`${reintColLetter}${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"SI,NO"'] };
            wsMain.getCell(`${crewColLetter}${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['Cuadrillas!$B$2:$B$1000'] };
            wsMain.getCell(`${pumpProcColLetter}${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"reparacion_bomba,bomba_nueva,bomba_sena"'] };
            
            // Add validation for all comp_status columns
            ALL_COLS.forEach((col, idx) => {
                if (col.isCompStatus) {
                    const colLetter = wsMain.getColumn(idx + 1).letter;
                    wsMain.getCell(`${colLetter}${r}`).dataValidation = { 
                        type: 'list', 
                        allowBlank: true, 
                        formulae: [`"${VALID_STATUSES.join(',')}"`] 
                    };
                }
            });
        }

        // Estilo columnas
        for (let i = 0; i < ALL_COLS.length; i++) {
            for (let r = 3; r <= maxMainRow; r++) {
                applyDataStyle(wsMain.getCell(r, i + 1), ALL_COLS[i].required, ALL_COLS[i].locked, ALL_COLS[i].bgColor);
            }
        }

        // ── Hoja: Molinos ──
        const wsMills = wb.addWorksheet('Molinos');
        wsMills.columns = [{ key: 'mill_id', header: 'ID', width: 12 }, { key: 'code', header: 'Código', width: 15 }, { key: 'name', header: 'Nombre', width: 30 }];
        wsMills.getRow(1).eachCell(c => applyHeaderStyle(c));
        const { data: mills } = await supabase.from('mill').select('mill_id, code, name').order('code');
        (mills || []).forEach(m => wsMills.addRow([m.mill_id, m.code, m.name]));

        // ── Hoja: Cuadrillas ──
        const wsCrews = wb.addWorksheet('Cuadrillas');
        wsCrews.columns = [{ key: 'crew_id', header: 'ID', width: 12 }, { key: 'name', header: 'Nombre', width: 30 }];
        wsCrews.getRow(1).eachCell(c => applyHeaderStyle(c));
        const { data: crews } = await supabase.from('crew').select('crew_id, name').order('name');
        (crews || []).forEach(c => wsCrews.addRow([c.crew_id, c.name]));

        // ── Hoja: Instrucciones ──
        const wsInst = wb.addWorksheet('Instrucciones');
        wsInst.columns = [{ width: 4 }, { width: 28 }, { width: 70 }];
        wsInst.addRow([]);
        const titleRow = wsInst.addRow(['', 'INSTRUCCIONES — CARGUE MASIVO ÓRDENES DE TRABAJO']);
        titleRow.font = { bold: true, size: 13, color: { argb: 'FF1E3A8A' } };
        wsInst.addRow([]);
        const add = (label, text) => {
            const row = wsInst.addRow(['', label, text]);
            row.getCell(2).font = { bold: true };
        };
        add('HOJA OrdenesTrabajo:', 'Llene una fila por cada orden. Deje ID vacío para crear nuevas OTs. Con ID existente se actualiza.');
        add('COMPONENTES:', 'Los estados y observaciones de cada componente están en la misma fila, en columnas coloreadas a la derecha.');
        add('ESTADOS VÁLIDOS:', 'FUNCIONAL | DESGASTADO | REQUIERE_REVISION | DANADO | FALTANTE | NO_REVISADO');
        add('IMPORTANTE:', 'No borre filas ni cambie los IDs en las columnas bloqueadas (fondo gris).');

        // Download
        const buffer = await wb.xlsx.writeBuffer();
        const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url    = URL.createObjectURL(blob);
        const a      = document.createElement('a');
        a.href       = url;
        a.download   = 'Plantilla_Cargue_Masivo_OrdenesTrabajo.xlsx';
        a.click();
        URL.revokeObjectURL(url);
    },

    async parseAndValidate(file) {
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(await file.arrayBuffer());

        const wsMain = wb.getWorksheet('OrdenesTrabajo');
        if (!wsMain) throw new Error("No se encontró la hoja 'OrdenesTrabajo'");

        const dynamicCols = await getDynamicCols();
        const ALL_COLS = [...MAIN_COLS_BASE, ...dynamicCols];

        const errors   = [];
        const toCreate = [];
        const toUpdate = [];

        const { data: mills } = await supabase.from('mill').select('mill_id, code, name');
        const { data: crews } = await supabase.from('crew').select('crew_id, name');

        const millMapByCode = new Map((mills || []).map(m => [m.code?.trim().toUpperCase(), m.mill_id]));
        const millMapByName = new Map((mills || []).map(m => [m.name?.trim().toUpperCase(), m.mill_id]));
        const millMapById   = new Map((mills || []).map(m => [m.mill_id, m.mill_id]));
        
        const crewMap = new Map((crews || []).map(c => [c.name?.trim().toUpperCase(), c.crew_id]));

        // Pre-fetch existing work orders to map work_order_id to mill_id
        // So we don't depend on mill_code for existing orders
        const { data: existingWos } = await supabase.from('work_order').select('work_order_id, mill_id');
        const existingWoMap = new Map((existingWos || []).map(wo => [String(wo.work_order_id).trim(), wo.mill_id]));

        // Parse main orders
        for (let r = 3; r <= wsMain.rowCount; r++) {
            const row = wsMain.getRow(r);
            const vals = [];
            ALL_COLS.forEach((col, idx) => {
                let val = row.getCell(idx + 1).value;
                if (val && typeof val === 'object' && val.text)   val = val.text;
                if (val && typeof val === 'object' && val.result !== undefined) val = val.result;
                vals.push(val !== null && val !== undefined ? String(val).trim() : '');
            });
            if (vals.every(v => v === '')) continue;

            const work_order_id = vals[0];
            const mill_code_raw = vals[2];
            const isUpdate = !!work_order_id;
            let mill_id = null;

            if (isUpdate) {
                mill_id = existingWoMap.get(work_order_id.trim());
                if (!mill_id) {
                    errors.push({ sheet: 'OrdenesTrabajo', row: r, message: `OT a actualizar no existe en la BD: ${work_order_id}` });
                    continue;
                }
            } else {
                if (!mill_code_raw) {
                    errors.push({ sheet: 'OrdenesTrabajo', row: r, message: 'Molino es obligatorio para nuevas OT (ingrese Código, Nombre o ID).' }); 
                    continue; 
                }
                
                mill_id = millMapByCode.get(mill_code_raw.toUpperCase()) || millMapByName.get(mill_code_raw.toUpperCase());
                
                // Fallback a búsqueda parcial para molinos
                if (!mill_id) {
                    const searchMill = mill_code_raw.toUpperCase();
                    for (const [name, id] of millMapByName.entries()) {
                        if (name.includes(searchMill) || searchMill.includes(name)) {
                            mill_id = id;
                            break;
                        }
                    }
                }

                if (!mill_id && !isNaN(parseInt(mill_code_raw))) {
                    if (millMapById.has(parseInt(mill_code_raw))) {
                        mill_id = parseInt(mill_code_raw);
                    }
                }

                if (!mill_id) { 
                    errors.push({ sheet: 'OrdenesTrabajo', row: r, message: `Molino no encontrado por código, nombre ni ID: ${mill_code_raw}` }); 
                    continue; 
                }
            }

            if (!vals[8]) { errors.push({ sheet: 'OrdenesTrabajo', row: r, message: 'Descripción es obligatoria.' }); continue; }

            let crew_id = null;
            if (vals[3]) {
                const searchCrew = vals[3].toUpperCase();
                crew_id = crewMap.get(searchCrew);
                
                // Fallback a búsqueda parcial para cuadrillas
                if (!crew_id) {
                    for (const [name, id] of crewMap.entries()) {
                        if (name.includes(searchCrew) || searchCrew.includes(name)) {
                            crew_id = id;
                            break;
                        }
                    }
                }

                if (!crew_id && !isNaN(parseInt(vals[3]))) crew_id = parseInt(vals[3]);
            }

            const TYPES = ['preventivo', 'correctivo', 'emergencia', 'mejora'];
            let type = vals[4]?.toLowerCase();
            if (!TYPES.includes(type)) type = 'preventivo';

            const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
            let priority = vals[5]?.toUpperCase();
            if (!PRIORITIES.includes(priority)) priority = 'MEDIUM';

            const STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
            let status = vals[6]?.toUpperCase();
            if (!STATUSES.includes(status)) status = 'PENDING';

            const scheduledDate = (vals[12] || '').toString().trim() || null;
            const startDate     = (vals[13] || '').toString().trim() || null;
            const endDate       = (vals[14] || '').toString().trim() || null;
            const pumpInstall   = vals[15] ? Number(vals[15]) : null;
            const pumpRemove    = vals[16] ? Number(vals[16]) : null;
            const pumpProcedure = (vals[17] || '').toString().trim() || null;
            const pumpNotes     = (vals[18] || '').toString().trim() || null;
            const reportUrl     = (vals[19] || '').toString().trim() || null;

            const system_observations = {};
            const componentsMap = {};

            dynamicCols.forEach((col, idx) => {
                const val = vals[MAIN_COLS_BASE.length + idx];
                if (!val) return;

                if (col.isSysObs) {
                    system_observations[col.sysId] = val;
                } else if (col.isCompStatus) {
                    if (!componentsMap[col.compId]) componentsMap[col.compId] = {};
                    let finalStatus = val.toUpperCase();
                    if (!VALID_STATUSES.includes(finalStatus)) finalStatus = 'NO_REVISADO';
                    componentsMap[col.compId].status = finalStatus;
                } else if (col.isCompObs) {
                    if (!componentsMap[col.compId]) componentsMap[col.compId] = {};
                    componentsMap[col.compId].observation = val;
                }
            });

            const components = Object.keys(componentsMap).map(id => ({
                component_id: parseInt(id),
                status: componentsMap[id].status || 'NO_REVISADO',
                observation: componentsMap[id].observation || null
            }));

            const record = {
                mill_id,
                crew_id, 
                type, 
                priority, 
                status,
                is_reintervention: vals[7]?.toUpperCase() === 'SI',
                description: vals[8],
                diagnosis: vals[9] || null,
                notes: vals[10] || null,
                final_observations: vals[11] || null,
                scheduled_date: scheduledDate,
                start_date: startDate,
                end_date: endDate,
                pump_id_to_install: pumpInstall,
                pump_id_to_remove: pumpRemove,
                pump_procedure_type: pumpProcedure,
                pump_installation_notes: pumpNotes,
                report_url: reportUrl,
                system_observations,
                components
            };

            if (isUpdate) {
                toUpdate.push({ work_order_id: work_order_id.trim(), ...record });
            } else {
                toCreate.push(record);
            }
        }

        return { errors, preview: { create: toCreate, update: toUpdate } };
    },

    async applyChanges(preview, progressCallback) {
        let current = 0;
        const total  = preview.create.length + preview.update.length;
        const errors = [];

        // UPDATES
        for (const item of preview.update) {
            try {
                const { mill_code, components, system_observations, work_order_id, ...basicInfo } = item;

                // Update basic info + system_observations
                const { error } = await supabase
                    .from('work_order')
                    .update({ ...basicInfo, system_observations })
                    .eq('work_order_id', work_order_id);
                if (error) throw error;

                // Upsert component statuses
                if (components && components.length > 0) {
                    const payload = components.map(c => ({
                        work_order_id,
                        component_id: c.component_id,
                        status: c.status || 'NO_REVISADO',
                        observation: c.observation || null
                    }));
                    const { error: csErr } = await supabase
                        .from('work_order_component_status')
                        .upsert(payload, { onConflict: 'work_order_id,component_id' });
                    if (csErr) throw csErr;
                }

                current++;
                progressCallback?.(Math.round((current / total) * 100), `Actualizando OT molino ${item.mill_code}...`);
            } catch (e) {
                errors.push(`Actualización Molino ${item.mill_code}: ${e.message}`);
            }
        }

        // CREATES
        for (const item of preview.create) {
            try {
                const { mill_code, components, system_observations, ...basicInfo } = item;
                const { data: newOrder, error } = await supabase
                    .from('work_order')
                    .insert({ ...basicInfo, status: basicInfo.status || 'PENDING', system_observations })
                    .select()
                    .single();
                if (error) throw error;

                if (components && components.length > 0 && newOrder) {
                    const payload = components.map(c => ({
                        work_order_id: newOrder.work_order_id,
                        component_id: c.component_id,
                        status: c.status || 'NO_REVISADO',
                        observation: c.observation || null
                    }));
                    await supabase.from('work_order_component_status').insert(payload);
                }

                current++;
                progressCallback?.(Math.round((current / total) * 100), `Creando OT molino ${item.mill_code}...`);
            } catch (e) {
                errors.push(`Creación Molino ${item.mill_code}: ${e.message}`);
            }
        }

        progressCallback?.(100, '¡Proceso terminado!');
        return { success: current, errors };
    }
};
