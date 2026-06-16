import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

// Helper to load image from URL and convert to Base64
async function getBase64ImageFromUrl(imageUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            try {
                const dataURL = canvas.toDataURL('image/png');
                resolve({ dataURL, width: img.width, height: img.height });
            } catch (e) {
                console.error("Canvas toDataURL failed (CORS?)", e);
                resolve(null);
            }
        };
        img.onerror = () => {
            console.error("Image load failed", imageUrl);
            resolve(null);
        };
        img.src = imageUrl;
    });
}

const formatStatusLabel = (status) => {
    switch(status) {
        case 'FUNCIONAL': return 'Funcional';
        case 'DESGASTADO': return 'Desgastado';
        case 'REQUIERE_REVISION': return 'Req. Revisión';
        case 'DANADO': return 'Dañado';
        case 'FALTANTE': return 'Faltante';
        case 'NO_REVISADO': return 'No Revisado';
        default: return status || '';
    }
};

export const DiagnosisFormatGenerator = {
    async generatePDF(mill, systems, filledData = null) {
        const doc = new jsPDF();
        let currentY = 20;
        const pageWidth = 210;
        const margin = 14;
        const maxContentWidth = pageWidth - margin * 2;

        // --- HEADER ---
        const [senaLogo, appLogo] = await Promise.all([
            getBase64ImageFromUrl('/sena-logo.png'),
            getBase64ImageFromUrl('/favicon.svg')
        ]);

        if (senaLogo && senaLogo.dataURL) {
            doc.addImage(senaLogo.dataURL, 'PNG', margin, 10, 25, 25 * (senaLogo.height / senaLogo.width));
        }
        
        doc.setFontSize(18);
        doc.setTextColor(57, 169, 0); // SENA Green
        doc.text('FORMATO FÍSICO DE DIAGNÓSTICO', pageWidth / 2, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Gestión Comunitaria Molinos', pageWidth / 2, 26, { align: 'center' });

        if (appLogo && appLogo.dataURL) {
            doc.addImage(appLogo.dataURL, 'PNG', pageWidth - margin - 20, 10, 20, 20 * (appLogo.height / appLogo.width));
        }
        
        currentY = 40;

        // --- INFORMACIÓN GENERAL ---
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMACIÓN GENERAL', margin, currentY);
        currentY += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Molino: ${mill?.name || ''} (${mill?.code || ''})`, margin, currentY);
        doc.text(`Comunidad: ${mill?.community_name || ''}`, 105, currentY);
        currentY += 8;
        doc.text(`Fecha de Diagnóstico: ${filledData?.diagnosis_date || '_____________________' }`, margin, currentY);
        doc.text(`Cuadrilla Responsable: ${filledData?.crew_name || '_____________________' }`, 105, currentY);
        currentY += 8;
        if (filledData?.drive_link) {
            doc.text(`Enlace Reporte (Drive): ${filledData.drive_link}`, margin, currentY);
            currentY += 8;
        }
        if (filledData?.notes) {
            const notesLines = doc.splitTextToSize(`Notas Generales: ${filledData.notes}`, maxContentWidth);
            doc.text(notesLines, margin, currentY);
            currentY += (notesLines.length * 4) + 4;
        }
        currentY += 7;

        // --- HALLAZGOS Y BOMBA ---
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('HALLAZGOS TÉCNICOS Y RECOMENDACIONES', margin, currentY);
        currentY += 6;

        if (filledData) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Hallazgos Técnicos:', margin, currentY);
            currentY += 4;
            const textLines1 = doc.splitTextToSize(filledData.technical_findings || 'N/A', maxContentWidth);
            doc.text(textLines1, margin, currentY);
            currentY += (textLines1.length * 4) + 4;
            
            doc.text('Análisis de Causa Raíz:', margin, currentY);
            currentY += 4;
            const textLines2 = doc.splitTextToSize(filledData.root_cause_analysis || 'N/A', maxContentWidth);
            doc.text(textLines2, margin, currentY);
            currentY += (textLines2.length * 4) + 4;

            doc.text('Recomendaciones Técnicas:', margin, currentY);
            currentY += 4;
            const textLines3 = doc.splitTextToSize(filledData.recommendations || 'N/A', maxContentWidth);
            doc.text(textLines3, margin, currentY);
            currentY += (textLines3.length * 4) + 8;
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setDrawColor(200);
            doc.setFillColor(250, 250, 250);
            
            doc.text('Hallazgos Técnicos:', margin, currentY);
            currentY += 4;
            doc.rect(margin, currentY, maxContentWidth, 15, 'S');
            currentY += 20;

            doc.text('Análisis de Causa Raíz:', margin, currentY);
            currentY += 4;
            doc.rect(margin, currentY, maxContentWidth, 15, 'S');
            currentY += 20;

            doc.text('Recomendaciones Técnicas:', margin, currentY);
            currentY += 4;
            doc.rect(margin, currentY, maxContentWidth, 15, 'S');
            currentY += 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('CONDICIÓN DE LA BOMBA', margin, currentY);
        currentY += 6;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        if (filledData) {
            doc.text(`Condición General: ${filledData.pump_condition || 'No evaluada'}`, margin, currentY);
            currentY += 6;
            doc.text(`Bomba Evaluada: ${filledData.pump_name || 'Ninguna'}`, margin, currentY);
            currentY += 6;
            doc.text('Observaciones Detalladas de la Bomba:', margin, currentY);
            currentY += 4;
            const obsLines = doc.splitTextToSize(filledData.pump_observations || 'N/A', maxContentWidth);
            doc.text(obsLines, margin, currentY);
            currentY += (obsLines.length * 4) + 10;
        } else {
            doc.text('Condición General: [  ] BUENO   [  ] REGULAR   [  ] MALO   [  ] CRÍTICO', margin, currentY);
            currentY += 8;
            doc.text('Bomba Evaluada (Referencia): __________________________________________________', margin, currentY);
            currentY += 8;
            doc.text('Observaciones Detalladas de la Bomba:', margin, currentY);
            currentY += 4;
            doc.rect(margin, currentY, maxContentWidth, 25, 'S'); // Box for observations
            currentY += 35;
        }

        let isFirstSystem = true;
        for (const sys of systems) {
            // Force a new page for each system
            doc.addPage();
            currentY = 20;

            if (isFirstSystem) {
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 51, 102);
                doc.text('ESTADO DE COMPONENTES POR SISTEMA', margin, currentY);
                currentY += 10;
                isFirstSystem = false;
            }

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(`SISTEMA: ${sys.code} - ${sys.name}`, margin, currentY);
            currentY += 8;

            // Render Photos large but scaled to fit the current page
            if (sys.photo_urls && sys.photo_urls.length > 0) {
                for (let i = 0; i < sys.photo_urls.length; i++) {
                    const url = sys.photo_urls[i];
                    const imgData = await getBase64ImageFromUrl(url);
                    if (imgData && imgData.dataURL) {
                        let availableHeight = 275 - currentY;
                        
                        // If we don't have enough vertical space, add a new page
                        if (availableHeight < 50) {
                            doc.addPage();
                            currentY = 20;
                            availableHeight = 275 - currentY;
                        }

                        const imgRatio = imgData.height / imgData.width;
                        let renderWidth = maxContentWidth; 
                        let renderHeight = renderWidth * imgRatio;

                        // If the full width image is too tall, scale it down to fit on the page
                        if (renderHeight > availableHeight) {
                            renderHeight = availableHeight;
                            renderWidth = renderHeight / imgRatio;
                        }
                        
                        // Center image horizontally if we had to shrink it
                        const xOffset = margin + (maxContentWidth - renderWidth) / 2;

                        try {
                            doc.addImage(imgData.dataURL, 'JPEG', xOffset, currentY, renderWidth, renderHeight);
                            currentY += renderHeight + 10;
                        } catch (e) {
                            console.error("Failed to add image to PDF", e);
                        }
                    }
                }
            }

            // Create Table for Components
            const tableData = sys.components.map(c => {
                let status = '';
                let obs = '';
                if (filledData && filledData.components) {
                    const compData = filledData.components.find(fc => fc.component_id === c.component_id);
                    if (compData) {
                        status = compData.status || '';
                        obs = compData.observation || '';
                    }
                }
                return [
                    c.code ? `${c.name}\n(${c.code})` : c.name,
                    formatStatusLabel(status), // Estado formateado
                    obs  // Observaciones
                ];
            });

            autoTable(doc, {
                startY: currentY,
                head: [['Componente', 'Estado', 'Observaciones']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 70 },
                    1: { cellWidth: 30 },
                    2: { cellWidth: 'auto' }
                },
                didDrawPage: (data) => {
                    // Update currentY for next elements
                    currentY = data.cursor.y + 10;
                }
            });

            // AutoTable updates currentY internally, but we grabbed it in didDrawPage
            // If the table spans pages, currentY is correct for the last page.
            
            // Render Observación General del Sistema
            if (filledData && filledData.system_observations && filledData.system_observations[sys.component_id]) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(`Observación General del Sistema:`, margin, currentY);
                currentY += 4;
                doc.setFont('helvetica', 'normal');
                const obsLines = doc.splitTextToSize(filledData.system_observations[sys.component_id], maxContentWidth);
                doc.text(obsLines, margin, currentY);
                currentY += (obsLines.length * 4) + 10;
            } else {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(`Observación General del Sistema:`, margin, currentY);
                currentY += 4;
                doc.setDrawColor(200);
                doc.rect(margin, currentY, maxContentWidth, 15, 'S');
                currentY += 25;
            }
        }

        // --- MATERIALES REQUERIDOS ---
        doc.addPage();
        currentY = 20;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 51, 102);
        doc.text('MATERIALES REQUERIDOS PARA MANTENIMIENTO', margin, currentY);
        currentY += 10;

        const materialsData = [];
        if (filledData && filledData.maintenance_materials && filledData.maintenance_materials.length > 0) {
            filledData.maintenance_materials.forEach(mat => {
                materialsData.push([mat.item || '', mat.quantity !== undefined && mat.quantity !== null && mat.quantity !== '' ? String(mat.quantity) : '']);
            });
        } else {
            const PREDEFINED_MATERIALS = [
                "Tubos arriba", "Tubos abajo", "Flanche", "Tubería PVC", "Unión universal", "Llave de paso 2\" PVC"
            ];
            PREDEFINED_MATERIALS.forEach(item => materialsData.push([item, '']));
            for(let i=0; i<3; i++) materialsData.push(['', '']);
        }

        autoTable(doc, {
            startY: currentY,
            head: [['Material / Ítem', 'Cantidad Requerida']],
            body: materialsData,
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 40 } },
            didDrawPage: (data) => {
                currentY = data.cursor.y + 10;
            }
        });

        // --- FIRMAS ---
        const crew = arguments[3] || {}; // Getting crew from 4th argument, since function signature might not declare it

        if (currentY > 240) {
            doc.addPage();
            currentY = 20;
        } else {
            currentY += 15;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('FIRMA RESPONSABLE (CUADRILLA)', margin, currentY);
        currentY += 10;

        if (crew && crew.signature_url) {
            const sigImg = await getBase64ImageFromUrl(crew.signature_url);
            if (sigImg && sigImg.dataURL) {
                const imgWidth = 40;
                const imgHeight = imgWidth * (sigImg.height / sigImg.width);
                doc.addImage(sigImg.dataURL, 'PNG', margin, currentY, imgWidth, imgHeight);
                currentY += imgHeight + 5;
            } else {
                doc.line(margin, currentY + 15, margin + 60, currentY + 15);
                currentY += 20;
            }
        } else {
            doc.line(margin, currentY + 15, margin + 60, currentY + 15);
            currentY += 20;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(crew?.leader_name || 'Nombre no registrado', margin, currentY);
        currentY += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(`CC: ${crew?.leader_document || 'N/A'}`, margin, currentY);
        currentY += 5;
        doc.text(`Cargo: ${crew?.leader_role || 'N/A'}`, margin, currentY);

        doc.save(`Formato_Diagnostico_${mill?.code || 'Molino'}.pdf`);
    },

    async generateExcel(mill, systems, filledData = null) {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Molinos App';

        const ws = workbook.addWorksheet('Diagnóstico');

        // Styles
        const titleStyle = { font: { bold: true, size: 16 }, alignment: { horizontal: 'center' } };
        const headerStyle = { font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } } };

        // Title
        ws.getRow(1).height = 60;
        ws.mergeCells('B1:D1');
        ws.getCell('B1').value = `FORMATO FÍSICO DE DIAGNÓSTICO\nGestión Comunitaria Molinos`;
        ws.getCell('B1').style = { ...titleStyle, wrapText: true, alignment: { vertical: 'middle', horizontal: 'center' } };

        const [senaLogo, appLogo] = await Promise.all([
            getBase64ImageFromUrl('/sena-logo.png'),
            getBase64ImageFromUrl('/favicon.svg')
        ]);

        if (senaLogo && senaLogo.dataURL) {
            try {
                const base64Raw = senaLogo.dataURL.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
                const imageId = workbook.addImage({ base64: base64Raw, extension: 'png' });
                ws.addImage(imageId, {
                    tl: { col: 0.1, row: 0.1 },
                    ext: { width: 60, height: 60 * (senaLogo.height / senaLogo.width) },
                    editAs: 'absolute'
                });
            } catch (e) { console.error('Failed to add SENA logo to Excel', e); }
        }

        if (appLogo && appLogo.dataURL) {
            try {
                const base64Raw = appLogo.dataURL.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
                const imageId = workbook.addImage({ base64: base64Raw, extension: 'png' });
                // Anchored to column E (index 4)
                ws.addImage(imageId, {
                    tl: { col: 4.1, row: 0.1 },
                    ext: { width: 50, height: 50 * (appLogo.height / appLogo.width) },
                    editAs: 'absolute'
                });
            } catch (e) { console.error('Failed to add Favicon to Excel', e); }
        }

        // General Info
        ws.getCell('A3').value = 'MOLINO:';
        ws.getCell('A3').style = { font: { bold: true } };
        ws.getCell('B3').value = `${mill?.name || ''} (${mill?.code || ''})`;

        ws.getCell('A4').value = 'COMUNIDAD:';
        ws.getCell('A4').style = { font: { bold: true } };
        ws.getCell('B4').value = mill?.community_name || '';

        ws.getCell('C3').value = 'FECHA:';
        ws.getCell('C3').style = { font: { bold: true } };
        ws.getCell('D3').value = filledData?.diagnosis_date || '';
        
        ws.getCell('C4').value = 'CUADRILLA:';
        ws.getCell('C4').style = { font: { bold: true } };
        ws.getCell('D4').value = filledData?.crew_name || '';

        let currentRow = 6;
        
        if (filledData?.drive_link) {
            ws.getCell(`A${currentRow}`).value = 'ENLACE REPORTE:';
            ws.getCell(`A${currentRow}`).style = { font: { bold: true } };
            ws.getCell(`B${currentRow}`).value = filledData.drive_link;
            ws.mergeCells(`B${currentRow}:E${currentRow}`);
            currentRow++;
        }
        if (filledData?.notes) {
            ws.getCell(`A${currentRow}`).value = 'NOTAS GENERALES:';
            ws.getCell(`A${currentRow}`).style = { font: { bold: true } };
            ws.getCell(`B${currentRow}`).value = filledData.notes;
            ws.mergeCells(`B${currentRow}:E${currentRow}`);
            currentRow++;
        }
        currentRow++;

        // Hallazgos y Bomba
        ws.getCell(`A${currentRow}`).value = 'HALLAZGOS TÉCNICOS GLOBALES Y CONDICIÓN DE LA BOMBA';
        ws.getCell(`A${currentRow}`).style = { font: { bold: true, size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } } };
        ws.mergeCells(`A${currentRow}:E${currentRow}`);
        currentRow += 2; // Leave space

        if (filledData) {
            ws.getCell(`A${currentRow}`).value = 'Hallazgos Técnicos:';
            ws.getCell(`A${currentRow}`).style = { font: { bold: true } };
            ws.getCell(`B${currentRow}`).value = filledData.technical_findings || 'N/A';
            ws.mergeCells(`B${currentRow}:E${currentRow}`);
            currentRow++;
            ws.getCell(`A${currentRow}`).value = 'Análisis de Causa Raíz:';
            ws.getCell(`A${currentRow}`).style = { font: { bold: true } };
            ws.getCell(`B${currentRow}`).value = filledData.root_cause_analysis || 'N/A';
            ws.mergeCells(`B${currentRow}:E${currentRow}`);
            currentRow++;
            ws.getCell(`A${currentRow}`).value = 'Recomendaciones Técnicas:';
            ws.getCell(`A${currentRow}`).style = { font: { bold: true } };
            ws.getCell(`B${currentRow}`).value = filledData.recommendations || 'N/A';
            ws.mergeCells(`B${currentRow}:E${currentRow}`);
            currentRow += 2;
        } else {
            ws.getCell(`A${currentRow}`).value = 'Hallazgos Técnicos:';
            ws.getCell(`A${currentRow}`).style = { font: { bold: true } };
            ws.mergeCells(`B${currentRow}:E${currentRow+1}`); // Espacio de 2 filas
            currentRow += 2;
            
            ws.getCell(`A${currentRow}`).value = 'Análisis de Causa Raíz:';
            ws.getCell(`A${currentRow}`).style = { font: { bold: true } };
            ws.mergeCells(`B${currentRow}:E${currentRow+1}`);
            currentRow += 2;
            
            ws.getCell(`A${currentRow}`).value = 'Recomendaciones Técnicas:';
            ws.getCell(`A${currentRow}`).style = { font: { bold: true } };
            ws.mergeCells(`B${currentRow}:E${currentRow+1}`);
            currentRow += 2;
        }

        ws.getCell(`A${currentRow}`).value = 'CONDICIÓN DE LA BOMBA';
        ws.getCell(`A${currentRow}`).style = { font: { bold: true } };
        currentRow++;
        if (filledData) {
            ws.getCell(`A${currentRow}`).value = `Condición General: ${filledData.pump_condition || 'No evaluada'}`;
            ws.mergeCells(`A${currentRow}:E${currentRow}`);
            currentRow++;
            ws.getCell(`A${currentRow}`).value = `Bomba Evaluada: ${filledData.pump_name || 'Ninguna'}`;
            ws.mergeCells(`A${currentRow}:E${currentRow}`);
            currentRow++;
            ws.getCell(`A${currentRow}`).value = 'Observaciones Detalladas de la Bomba:';
            ws.getCell(`A${currentRow}`).style = { font: { bold: true } };
            currentRow++;
            ws.getCell(`A${currentRow}`).value = filledData.pump_observations || 'N/A';
            ws.mergeCells(`A${currentRow}:E${currentRow}`);
            currentRow += 2;
        } else {
            ws.getCell(`A${currentRow}`).value = 'Condición General: [  ] BUENO   [  ] REGULAR   [  ] MALO   [  ] CRÍTICO';
            ws.mergeCells(`A${currentRow}:E${currentRow}`);
            currentRow++;
            ws.getCell(`A${currentRow}`).value = 'Bomba Evaluada (Referencia):';
            ws.mergeCells(`A${currentRow}:E${currentRow}`);
            currentRow++;
            ws.getCell(`A${currentRow}`).value = 'Observaciones Detalladas de la Bomba:';
            ws.mergeCells(`A${currentRow}:E${currentRow}`);
            currentRow += 3; // Leave space for writing
        }

        // Systems
        for (const sys of systems) {
            ws.getCell(`A${currentRow}`).value = `SISTEMA: ${sys.code} - ${sys.name}`;
            ws.getCell(`A${currentRow}`).style = { font: { bold: true, size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } } };
            ws.mergeCells(`A${currentRow}:E${currentRow}`);
            currentRow++;

            // Render photos to the right of the table (side by side)
            if (sys.photo_urls && sys.photo_urls.length > 0) {
                let extraRows = 0;
                if ((sys.name && sys.name.toLowerCase().includes('torre')) || (sys.code && sys.code.toLowerCase().includes('torre'))) {
                    extraRows = 8;
                }

                // Table spans: 1 row for title, 1 row for headers, N rows for components, and 5 rows for observations, plus extra
                const tableRowsCount = sys.components.length + 2 + 5 + extraRows;
                const tableHeightPx = tableRowsCount * 20; // Approx 20px per row
                const targetHeight = Math.max(100, tableHeightPx); // Full table height
                
                let currentCol = 5; // Start at Column F (index 5)

                for (let i = 0; i < sys.photo_urls.length; i++) {
                    const url = sys.photo_urls[i];
                    const imgData = await getBase64ImageFromUrl(url);
                    if (imgData && imgData.dataURL) {
                        try {
                            const base64Raw = imgData.dataURL.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
                            const imageId = workbook.addImage({
                                base64: base64Raw,
                                extension: 'jpeg',
                            });
                            
                            const imgRatio = imgData.height / imgData.width;
                            const targetWidth = Math.round(targetHeight / imgRatio);
                            
                            ws.addImage(imageId, {
                                tl: { col: currentCol, row: currentRow - 1 }, // Anchored to system title row
                                ext: { width: targetWidth, height: targetHeight },
                                editAs: 'oneCell'
                            });
                            
                            // Move to the right for the next image. 
                            // Excel default column is ~64px wide. We add a 0.5 column margin.
                            const columnsSpan = Math.ceil(targetWidth / 64);
                            currentCol += columnsSpan + 0.5;
                        } catch (e) {
                            console.error('Failed to add image to Excel', e);
                        }
                    }
                }
            }

            // Headers
            ws.getCell(`A${currentRow}`).value = 'CÓDIGO';
            ws.getCell(`B${currentRow}`).value = 'COMPONENTE';
            ws.getCell(`C${currentRow}`).value = 'ESTADO';
            ws.getCell(`D${currentRow}`).value = 'OBSERVACIONES';
            ws.mergeCells(`D${currentRow}:E${currentRow}`);
            
            ['A', 'B', 'C', 'D', 'E'].forEach(col => {
                ws.getCell(`${col}${currentRow}`).style = headerStyle;
            });
            currentRow++;

            // Components
            for (const comp of sys.components) {
                let status = '';
                let obs = '';
                if (filledData && filledData.components) {
                    const compData = filledData.components.find(fc => fc.component_id === comp.component_id);
                    if (compData) {
                        status = compData.status || '';
                        obs = compData.observation || '';
                    }
                }
                ws.getCell(`A${currentRow}`).value = comp.code || '';
                ws.getCell(`B${currentRow}`).value = comp.name;
                ws.getCell(`C${currentRow}`).value = formatStatusLabel(status);
                ws.getCell(`C${currentRow}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: ['"Funcional,Desgastado,Req. Revisión,Dañado,Faltante,No Revisado"']
                };
                ws.getCell(`D${currentRow}`).value = obs;
                ws.mergeCells(`D${currentRow}:E${currentRow}`);
                currentRow++;
            }
            
            // Observación General del Sistema
            currentRow++;
            ws.getCell(`A${currentRow}`).value = 'OBSERVACIÓN GENERAL DEL SISTEMA:';
            ws.getCell(`A${currentRow}`).style = { font: { bold: true } };
            currentRow++;
            if (filledData && filledData.system_observations && filledData.system_observations[sys.component_id]) {
                ws.getCell(`A${currentRow}`).value = filledData.system_observations[sys.component_id];
            }
            ws.mergeCells(`A${currentRow}:E${currentRow + 1}`);
            
            for(let r=currentRow; r<=currentRow+1; r++) {
                for(let c of ['A','B','C','D','E']) {
                    ws.getCell(`${c}${r}`).border = {
                        top: { style: 'medium', color: { argb: 'FFFF0000' } },
                        left: { style: 'medium', color: { argb: 'FFFF0000' } },
                        bottom: { style: 'medium', color: { argb: 'FFFF0000' } },
                        right: { style: 'medium', color: { argb: 'FFFF0000' } }
                    };
                }
            }

            ws.getCell(`A${currentRow}`).alignment = { vertical: 'top', wrapText: true };
            
            let extraRows = 0;
            if ((sys.name && sys.name.toLowerCase().includes('torre')) || (sys.code && sys.code.toLowerCase().includes('torre'))) {
                extraRows = 8;
            }
            currentRow += 3 + extraRows; // Empty rows between systems + extra space for Torre image
        }

        // --- MATERIALES REQUERIDOS ---
        ws.getCell(`A${currentRow}`).value = 'MATERIALES REQUERIDOS PARA MANTENIMIENTO';
        ws.getCell(`A${currentRow}`).style = { font: { bold: true, size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } } };
        ws.mergeCells(`A${currentRow}:E${currentRow}`);
        currentRow++;
        
        ws.getCell(`A${currentRow}`).value = 'MATERIAL / ÍTEM';
        ws.getCell(`B${currentRow}`).value = 'CANTIDAD REQUERIDA';
        ws.getCell(`A${currentRow}`).style = headerStyle;
        ws.getCell(`B${currentRow}`).style = headerStyle;
        ws.mergeCells(`B${currentRow}:E${currentRow}`);
        currentRow++;

        const materialsData = [];
        if (filledData && filledData.maintenance_materials && filledData.maintenance_materials.length > 0) {
            filledData.maintenance_materials.forEach(mat => {
                materialsData.push([mat.item || '', mat.quantity !== undefined && mat.quantity !== null && mat.quantity !== '' ? String(mat.quantity) : '']);
            });
        } else {
            const PREDEFINED_MATERIALS = [
                "Tubos arriba", "Tubos abajo", "Flanche", "Tubería PVC", "Unión universal", "Llave de paso 2\" PVC"
            ];
            PREDEFINED_MATERIALS.forEach(item => materialsData.push([item, '']));
            for(let i=0; i<3; i++) materialsData.push(['', '']);
        }
        
        for (const mat of materialsData) {
            ws.getCell(`A${currentRow}`).value = mat[0];
            ws.getCell(`B${currentRow}`).value = mat[1];
            ws.mergeCells(`B${currentRow}:E${currentRow}`);
            currentRow++;
        }
        currentRow += 2;

        ws.getColumn('A').width = 15;
        ws.getColumn('B').width = 60;
        ws.getColumn('C').width = 15;
        ws.getColumn('D').width = 45;
        ws.getColumn('E').width = 15;

        // Borders for all populated cells
        ws.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
                if (colNumber <= 5 && cell.value !== null && cell.value !== '') {
                    // Only apply generic thin border if cell doesn't already have a custom border (like the red one)
                    if (!cell.border || !cell.border.top || !cell.border.top.color) {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    }
                    const existingAlignment = cell.alignment || {};
                    // Only wrap text vertically for the Observations column (D / 4) or merged rows 
                    // (so we don't wrap the component names and avoid image distortion on rows)
                    const shouldWrap = colNumber === 4 || rowNumber < 10 || cell.isMerged;
                    cell.alignment = {
                        ...existingAlignment,
                        vertical: 'middle',
                        wrapText: shouldWrap
                    };
                }
            });
        });

        // Generate and Download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Formato_Diagnostico_${mill?.code || 'Molino'}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
    }
};
