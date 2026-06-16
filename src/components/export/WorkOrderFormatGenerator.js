import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export const WorkOrderFormatGenerator = {
    async generatePDF(mill, systems, formData, crew = null) {
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
        doc.text('REPORTE DE ORDEN DE TRABAJO', pageWidth / 2, 20, { align: 'center' });
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
        doc.text(`Comunidad: ${mill?.community?.name || ''}`, 105, currentY);
        currentY += 8;
        doc.text(`Fecha de Fin (Real): ${formData?.end_date || 'N/A' }`, margin, currentY);
        doc.text(`Estado: ${formData?.status || 'N/A' }`, 105, currentY);
        currentY += 8;
        doc.text(`Tipo de OT: ${formData?.type || 'N/A' }`, margin, currentY);
        doc.text(`Prioridad: ${formData?.priority || 'N/A' }`, 105, currentY);
        currentY += 8;
        doc.text(`Es Reintervención: ${formData?.is_reintervention ? 'SÍ' : 'NO'}`, margin, currentY);
        if (crew && crew.name) {
            doc.text(`Cuadrilla Responsable: ${crew.name}`, 105, currentY);
        }
        currentY += 8;

        if (formData?.description) {
            const descLines = doc.splitTextToSize(`Descripción de la Tarea: ${formData.description}`, maxContentWidth);
            doc.text(descLines, margin, currentY);
            currentY += (descLines.length * 4) + 4;
        }

        if (formData?.pumpInfo) {
            doc.setFont('helvetica', 'bold');
            doc.text(`Operación de Bomba: ${formData.pumpInfo.operation}`, margin, currentY);
            currentY += 5;
            doc.setFont('helvetica', 'normal');
            
            if (formData.pumpInfo.install) {
                const pump = formData.pumpInfo.install;
                doc.text(`Instalar: Serial ${pump.serial_number} - Modelo ${pump.model}`, margin + 5, currentY);
                currentY += 5;
            }
            if (formData.pumpInfo.remove && formData.pumpInfo.operation !== 'Reparación de Misma Bomba') {
                const pump = formData.pumpInfo.remove;
                doc.text(`Desinstalar: Serial ${pump.serial_number} - Modelo ${pump.model}`, margin + 5, currentY);
                currentY += 5;
            }
            if (formData.pump_installation_notes) {
                const pumpNotesLines = doc.splitTextToSize(`Notas de Bomba: ${formData.pump_installation_notes}`, maxContentWidth - 5);
                doc.text(pumpNotesLines, margin + 5, currentY);
                currentY += (pumpNotesLines.length * 4) + 4;
            }
            currentY += 2;
        }

        // --- REPORTES FINALES ---
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTES Y OBSERVACIONES', margin, currentY);
        currentY += 6;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Reporte Final:', margin, currentY);
        currentY += 4;
        doc.setFont('helvetica', 'normal');
        const notesLines = doc.splitTextToSize(formData?.notes || 'N/A', maxContentWidth);
        doc.text(notesLines, margin, currentY);
        currentY += (notesLines.length * 4) + 4;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Observaciones Finales:', margin, currentY);
        currentY += 4;
        doc.setFont('helvetica', 'normal');
        const finalObsLines = doc.splitTextToSize(formData?.final_observations || 'N/A', maxContentWidth);
        doc.text(finalObsLines, margin, currentY);
        currentY += (finalObsLines.length * 4) + 8;

        // --- SISTEMAS Y COMPONENTES ---
        let isFirstSystem = true;
        for (const sys of (systems || [])) {
            // Check if we need a new page
            if (currentY > 250) {
                doc.addPage();
                currentY = 20;
            }

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

            // Create Table for Components
            const tableData = (sys.components || []).map(c => {
                let status = '';
                let obs = '';
                if (formData && formData.components) {
                    const compData = formData.components.find(fc => fc.component_id === c.component_id);
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

            // Render Observación General del Sistema
            if (formData && formData.system_observations && formData.system_observations[sys.component_id]) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(`Observación General del Sistema:`, margin, currentY);
                currentY += 4;
                doc.setFont('helvetica', 'normal');
                const obsLines = doc.splitTextToSize(formData.system_observations[sys.component_id], maxContentWidth);
                doc.text(obsLines, margin, currentY);
                currentY += (obsLines.length * 4) + 10;
            } else {
                currentY += 5; // spacing if no system observation
            }
        }

        // --- FIRMAS ---
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

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${i} de ${pageCount} - Sistema de Gestión de Molinos`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        }

        doc.save(`Orden_Trabajo_${mill?.code || 'Molino'}_${new Date().toISOString().split('T')[0]}.pdf`);
    }
};
