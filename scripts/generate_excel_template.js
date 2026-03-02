import ExcelJS from 'exceljs';
import path from 'path';

async function generateTemplate() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Molinos App System';
    workbook.created = new Date();

    // ==========================================
    // ESTILOS GLOBALES
    // ==========================================
    const styleHeader = (cell, bgColor, fgColor = 'FFFFFFFF') => {
        cell.font = { bold: true, color: { argb: fgColor }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    };

    const styleColHeader = (cell, bgColor) => {
        cell.font = { bold: true, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    };

    const createDropdown = (sheet, startRow, endRow, colLetter, values) => {
        for (let i = startRow; i <= endRow; i++) {
            sheet.getCell(`${colLetter}${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`"${values.join(',')}"`]
            };
        }
    };

    // ==========================================
    // HOJA 1: MATRIZ MAESTRA
    // ==========================================
    const sheet1 = workbook.addWorksheet('1. Molinos E Históricos', {
        views: [{ state: 'frozen', xSplit: 7, ySplit: 2 }] // Congelar Comunidad y Molino
    });

    // 1. Columnas Base (Comunidad, Molino, Bomba, Social)
    const baseBlocks = [
        {
            name: 'A_COMUNIDAD', color: 'FF2E7D32', cols: [
                'Comunidad_Nombre*', 'Comunidad_Municipio', 'Comunidad_Departamento',
                'Comunidad_Latitud', 'Comunidad_Longitud', 'Comunidad_Geotracker_URL', 'Comunidad_Observaciones_Contexto'
            ]
        },
        {
            name: 'B_MOLINO', color: 'FF1565C0', cols: [
                'Molino_Codigo*', 'Molino_Registro_Num', 'Molino_Alias_Nombre', 'Molino_Fabricante', 'Molino_Modelo_Tipo',
                'Molino_Fecha_Instalacion', 'Molino_Latitud', 'Molino_Longitud', 'Molino_Estado_Actual',
                'Molino_Ficha_Tecnica_URL', 'Molino_Fecha_Ultimo_Mantenimiento', 'Molino_Observaciones'
            ]
        },
        {
            name: 'C_BOMBA_INSTALADA_OPCIONAL', color: 'FF616161', cols: [
                'Bomba_Serial', 'Bomba_Origen', 'Bomba_Modelo_Ref', 'Bomba_Fecha_Fabricacion', 'Bomba_Estado',
                'Bomba_Ubicacion_Almacenaje', 'Bomba_Observaciones'
            ]
        },
        {
            name: 'D_SITUACION_SOCIAL_ACTUAL', color: 'FFD84315', cols: [
                'Sit_Social_Tipo', 'Sit_Social_Severidad', 'Sit_Social_Estado', 'Sit_Social_Fecha_Inicio',
                'Sit_Social_Titulo', 'Sit_Social_Descripcion', 'Sit_Social_Observaciones_Resolucion'
            ]
        }
    ];

    // 2. Columnas de Intervenciones (Se repetirán)
    const intColumns = [
        // Identificador
        'Responsable_Intervencion_Cedula*', 'Responsable_Nombre_Referencia',
        // Falla
        'Falla_Fecha_Reporte', 'Falla_Reportada_Por_Nombre', 'Falla_Prioridad', 'Falla_Descripcion', 'Falla_Estado',
        // Concertacion
        'Conc_Fecha_Reunion', 'Conc_Estado', 'Conc_Decision_Tomada', 'Conc_Condiciones', 'Conc_Observaciones_Cierre',
        // Diagnostico
        'Diag_Tipo', 'Diag_Fecha_Realizacion', 'Diag_Prioridad', 'Diag_Estado', 'Diag_Condicion_Bomba',
        'Diag_Descripcion_General', 'Diag_Hallazgos_Tecnicos', 'Diag_Causa_Raiz', 'Diag_Recomendaciones',
        // Orden de Trabajo (OT)
        'OT_Tipo', 'OT_Fecha_Inicio_Ejecucion', 'OT_Fecha_Fin_Ejecucion', 'OT_Es_Reintervencion', 'OT_Estado',
        'OT_Descripcion_Inicial', 'OT_Trabajo_Realizado_Final_Notas_Cierre', 'OT_Reporte_Documento_URL'
        // Se removieron los estados detallados de componentes por practicidad de captura.
    ];

    // Construir Fila 1 y Fila 2
    const row1 = [];
    const row2 = [];
    const colStyles = []; // Guardar color por columna

    // Rellenar Base Blocks
    baseBlocks.forEach(block => {
        row1.push(block.name);
        for (let i = 1; i < block.cols.length; i++) row1.push(''); // Merge space
        block.cols.forEach(c => {
            row2.push(c);
            colStyles.push(block.color);
        });
    });

    // Rellenar Intervenciones (INT 1 e INT 2)
    const intColors = ['FFF9A825', 'FF1565C0', 'FF2E7D32', 'FFD84315', 'FF616161'];
    for (let i = 1; i <= 2; i++) { // Cambiar a 5 si quieres 5 bloques
        const color = intColors[i - 1];
        row1.push(`E_INTERVENCION_${i}`);
        for (let j = 1; j < intColumns.length; j++) row1.push(''); // Merge space

        intColumns.forEach(c => {
            row2.push(`INT_${i}_${c}`);
            colStyles.push(color);
        });
    }

    sheet1.getRow(1).values = row1;
    sheet1.getRow(2).values = row2;

    // Aplicar Merge a Fila 1
    let tempCol = 1;
    baseBlocks.forEach(block => {
        sheet1.mergeCells(1, tempCol, 1, tempCol + block.cols.length - 1);
        styleHeader(sheet1.getCell(1, tempCol), block.color, 'FFFFFFFF');
        tempCol += block.cols.length;
    });

    for (let i = 1; i <= 3; i++) {
        sheet1.mergeCells(1, tempCol, 1, tempCol + intColumns.length - 1);
        styleHeader(sheet1.getCell(1, tempCol), intColors[i - 1], i === 1 ? 'FF000000' : 'FFFFFFFF');
        tempCol += intColumns.length;
    }

    // Aplicar colores y anchos a Fila 2
    row2.forEach((val, index) => {
        const cell = sheet1.getCell(2, index + 1);
        // Aclarar un poco el color de fondo para la fila 2 (simulación hexadecimal simple)
        let bg = colStyles[index];
        bg = 'FF' + bg.substring(2); // Keep solid

        cell.font = { bold: true, size: 9 };
        // Excepcion colores claros para lectura
        if (bg === 'FFF9A825') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
        else if (bg === 'FF2E7D32') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
        else if (bg === 'FF1565C0') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
        else if (bg === 'FF616161') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        else if (bg === 'FFD84315') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } };

        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

        sheet1.getColumn(index + 1).width = 20;
    });

    sheet1.getRow(1).height = 25;
    sheet1.getRow(2).height = 40;

    // ==========================================
    // VALIDACIONES (Listas Desplegables Reales de DB)
    // ==========================================
    const estadosMolino = ['OPERATIONAL', 'NON_OPERATIONAL', 'UNDER_MAINTENANCE', 'DECOMMISSIONED'];
    const estadosBomba = ['instalada', 'almacenada', 'en_reparacion', 'descartada'];
    const origenBomba = ['nueva', 'fabricada', 'reparada'];
    const sitSocialTipo = ['conflict', 'strike', 'access_issue', 'weather', 'security', 'other'];
    const sitSocialEstado = ['active', 'monitoring', 'resolved'];
    const sitSocialSeveridad = ['low', 'medium', 'high', 'critical'];

    // Para encontrar la columna exacta dinámicamente:
    const findColLetter = (headerName) => {
        for (let i = 1; i <= row2.length; i++) {
            if (sheet1.getCell(2, i).value === headerName) return sheet1.getColumn(i).letter;
        }
        return null;
    };

    const applyGlobalDropdown = (header, list) => {
        const letter = findColLetter(header);
        if (letter) createDropdown(sheet1, 3, 100, letter, list);
    };

    applyGlobalDropdown('Molino_Estado_Actual', estadosMolino);
    applyGlobalDropdown('Bomba_Origen', origenBomba);
    applyGlobalDropdown('Bomba_Estado', estadosBomba);
    applyGlobalDropdown('Sit_Social_Tipo', sitSocialTipo);
    applyGlobalDropdown('Sit_Social_Severidad', sitSocialSeveridad);
    applyGlobalDropdown('Sit_Social_Estado', sitSocialEstado);

    const dropDownsInt = [
        { suffix: 'Falla_Prioridad', list: ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'] },
        { suffix: 'Falla_Estado', list: ['PENDIENTE', 'REVISADO', 'EN_PROCESO', 'RESUELTO'] },
        { suffix: 'Conc_Estado', list: ['pendiente', 'en_proceso', 'finalizada', 'cancelada'] },
        { suffix: 'Diag_Tipo', list: ['PREVENTIVO', 'CORRECTIVO', 'PREDICTIVO'] },
        { suffix: 'Diag_Prioridad', list: ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'] },
        { suffix: 'Diag_Estado', list: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
        { suffix: 'Diag_Condicion_Bomba', list: ['BUENO', 'REGULAR', 'MALO', 'CRITICO'] },
        { suffix: 'OT_Tipo', list: ['preventivo', 'correctivo', 'emergencia', 'mejora'] },
        { suffix: 'OT_Es_Reintervencion', list: ['SI', 'NO'] },
        { suffix: 'OT_Estado', list: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD'] }
    ];

    for (let i = 1; i <= 3; i++) { // Para INT 1, 2, y 3
        dropDownsInt.forEach(dd => {
            const letter = findColLetter(`INT_${i}_${dd.suffix}`);
            if (letter) createDropdown(sheet1, 3, 100, letter, dd.list);
        });
    }

    // ==========================================
    // HOJA 2: PERSONAS / COMUNIDAD
    // ==========================================
    const sheet2 = workbook.addWorksheet('2. Personas y Contactos', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet2.getRow(1).values = [
        'Comunidad_Nombre_Asociada', 'Persona_Documento_ID*', 'Persona_Nombres', 'Persona_Apellidos',
        'Persona_Telefono', 'Persona_Email', 'Persona_Especialidad_Tecnica', 'Persona_Activa_Booleano', 'Persona_Rol'
    ];
    sheet2.getRow(1).eachCell(cell => styleColHeader(cell, 'FFE8F5E9'));
    sheet2.columns.forEach(col => col.width = 22);

    // ==========================================
    // HOJA 3: VEHÍCULOS
    // ==========================================
    const sheet3 = workbook.addWorksheet('3. Vehículos', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet3.getRow(1).values = [
        'Vehiculo_Placa*', 'Vehiculo_Marca', 'Vehiculo_Modelo_Anio', 'Vehiculo_Tipo',
        'Vehiculo_Pasajeros_Capacidad', 'Vehiculo_Estado_Actual', 'Vehiculo_Observaciones'
    ];
    sheet3.getRow(1).eachCell(cell => styleColHeader(cell, 'FFE3F2FD'));
    sheet3.columns.forEach(col => col.width = 22);
    createDropdown(sheet3, 2, 50, 'F', ['DISPONIBLE', 'EN_USO', 'MANTENIMIENTO', 'FUERA_DE_SERVICIO']);

    // ==========================================
    // HOJA 4: INVENTARIO Y PROVEEDORES
    // ==========================================
    const sheet4 = workbook.addWorksheet('4. Catálogo Inventario', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet4.getRow(1).values = [
        'Item_Categoria*', 'Item_Codigo_Sistema', 'Item_Nombre_Referencia*', 'Item_Descripcion',
        'Item_Unidad_Medida', 'Item_Ubicacion_Fisica', 'Item_Plano_URL_Imagen', 'Item_Origen_Fabricacion',
        'Proveedor_Nombre_Razon', 'Proveedor_Tipo', 'Proveedor_Telefono',
        'Inventario_Stock_Inicial_Fisico', 'Inventario_Stock_Minimo_Alerta'
    ];
    sheet4.getRow(1).eachCell(cell => styleColHeader(cell, 'FFF5F5F5'));
    sheet4.columns.forEach(col => col.width = 22);
    createDropdown(sheet4, 2, 200, 'A', ['PIEZA', 'MATERIAL', 'EPP', 'HERRAMIENTA']);
    createDropdown(sheet4, 2, 200, 'H', ['comprado', 'fabricado', 'recuperado']);

    // ==========================================
    // HOJA 5: PIEZAS SIMPLES (Recetas)
    // ==========================================
    const sheet5 = workbook.addWorksheet('5. Recetas Piezas Pequeñas', { views: [{ state: 'frozen', ySplit: 1 }] });

    // Generar columnas de materiales dinámicamente hasta 10 (Material 1, Cant 1 ... Material 10, Cant 10)
    const recipeCols = ['Pieza_Codigo_Hijo*', 'Pieza_Nombre_Referencia'];
    for (let i = 1; i <= 10; i++) {
        recipeCols.push(`Material_Requerido_${i}_Codigo`);
        recipeCols.push(`Cantidad_Requerida_${i}`);
    }

    sheet5.getRow(1).values = recipeCols;
    sheet5.getRow(1).eachCell(cell => styleColHeader(cell, 'FFF3E5F5'));

    // Anchos alternados para leer mejor (Material más ancho, cantidad más corto)
    sheet5.getColumn(1).width = 20;
    sheet5.getColumn(2).width = 30;
    for (let i = 3; i <= 22; i++) {
        if (i % 2 !== 0) { // Columnas impar (Material_Requerido)
            sheet5.getColumn(i).width = 22;
        } else { // Columnas par (Cantidad)
            sheet5.getColumn(i).width = 12;
        }
    }

    // ==========================================
    // HOJA 7: TRABAJADORES Y CERTIFICACIONES SST (Combinada)
    // ==========================================
    const sheet7 = workbook.addWorksheet('7. Personal y SST', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet7.getRow(1).values = [
        // Datos Base Persona
        'Persona_Documento_ID*', 'Persona_Nombres', 'Persona_Apellidos', 'Persona_Rol_ID_Referencia',
        'Persona_Activa_Booleano', 'Persona_Telefono', 'Persona_Email', 'Persona_Especialidad_Tecnica',
        // Datos SST
        'Cert_Nombre_Modulo*', 'Cert_Tipo', 'Cert_Fecha_Emision', 'Cert_Fecha_Expiracion',
        'Cert_Institucion_Prestadora', 'Cert_URL_Documento', 'Cert_Estado_Actual'
    ];
    sheet7.getRow(1).eachCell(cell => styleColHeader(cell, 'FFFFCC80')); // Naranja Suave
    sheet7.columns.forEach(col => col.width = 25);
    createDropdown(sheet7, 2, 500, 'O', ['vigente', 'vencido', 'en_tramite']);

    // ==========================================
    // GUARDAR
    // ==========================================
    const exportPath = path.join(process.cwd(), 'Plantilla_Datos_Molinos_Guajira_V5.xlsx');
    await workbook.xlsx.writeFile(exportPath);
    console.log(`Archivo MAESTRO generado exitosamente en: ${exportPath}`);
}

generateTemplate().catch(err => console.error(err));
