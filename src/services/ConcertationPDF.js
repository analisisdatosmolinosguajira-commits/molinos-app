import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDFDocument } from 'pdf-lib';

/**
 * Converts a Google Drive share/view URL to a direct download URL.
 * Handles formats:
 *   https://drive.google.com/file/d/FILE_ID/view
 *   https://drive.google.com/open?id=FILE_ID
 *   https://drive.google.com/uc?id=FILE_ID
 */
function toDriveDownloadUrl(url) {
    if (!url) return null;
    // Already a direct download link
    if (url.includes('uc?') && url.includes('export=download')) return url;

    let fileId = null;

    // /file/d/FILE_ID/...
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) fileId = fileMatch[1];

    // ?id=FILE_ID or &id=FILE_ID
    if (!fileId) {
        const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (idMatch) fileId = idMatch[1];
    }

    if (fileId) {
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }

    return url; // Return as-is and let the fetch attempt handle it
}

/**
 * Generates the 1-page summary PDF bytes using jsPDF.
 */
function buildSummaryPdfBytes(data) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ── HEADER BAND ──────────────────────────────────────────────
    doc.setFillColor(30, 64, 115); // dark blue
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('ACTA DE CONCERTACIÓN COMUNITARIA', pageWidth / 2, 12, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('MOLINOS GUAJIRA — SISTEMA DE GESTIÓN', pageWidth / 2, 20, { align: 'center' });

    // Code badge top-right
    if (data.code) {
        doc.setFontSize(8);
        doc.text(`Código: ${data.code}`, pageWidth - 14, 10, { align: 'right' });
    }

    doc.setTextColor(0, 0, 0);
    let yPos = 38;

    // ── GENERAL INFO TABLE ────────────────────────────────────────
    const decisionMap = {
        approved: 'Aprobada',
        rejected: 'Rechazada',
        pending: 'Aplazada',
        conditional: 'Condicionada',
    };
    const statusMap = {
        pendiente: 'PENDIENTE',
        en_proceso: 'EN PROCESO',
        finalizada: 'FINALIZADA',
    };

    const info = [
        ['Comunidad', data.community?.name || '______________________'],
        ['Fecha de Reunión', data.meeting_date ? new Date(data.meeting_date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : '____/____/______'],
        ['Diagnóstico Relacionado', data.diagnosis?.code ? `${data.diagnosis.code} — ${data.diagnosis.description || ''}` : 'N/A'],
        ['Estado del Acta', statusMap[data.status] || (data.status || 'PENDIENTE').toUpperCase()],
        ['Decisión', decisionMap[data.decision] || 'Sin decisión'],
    ];
    if (data.start_date) info.push(['Inicio Real', new Date(data.start_date).toLocaleString('es-CO')]);
    if (data.end_date)   info.push(['Fin / Cierre', new Date(data.end_date).toLocaleString('es-CO')]);

    autoTable(doc, {
        startY: yPos,
        body: info,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 55, fillColor: [245, 247, 250] },
            1: { cellWidth: 'auto' },
        },
        margin: { left: 14, right: 14 },
    });

    yPos = doc.lastAutoTable.finalY + 8;

    // ── TEXT SECTIONS ─────────────────────────────────────────────
    const sections = [
        { title: 'Condiciones y Acuerdos', content: data.conditions },
        { title: 'Notas / Conclusiones', content: data.notes },
        { title: 'Conclusiones de Cierre', content: data.closing_note },
    ];

    sections.forEach(section => {
        if (!section.content) return; // Skip empty sections to save space

        // Section header bar
        doc.setFillColor(30, 64, 115);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.rect(14, yPos, pageWidth - 28, 6, 'F');
        doc.text(section.title.toUpperCase(), 16, yPos + 4.2);
        yPos += 9;

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(section.content, pageWidth - 28);
        doc.text(lines, 14, yPos);
        yPos += lines.length * 4.5 + 5;
    });

    // ── PARTICIPANTS TABLE ────────────────────────────────────────
    const commMembers = (data.concertation_community_member || []).map(m => ({
        name: `${m.community_member?.person?.first_name || ''} ${m.community_member?.person?.last_name || ''}`.trim(),
        role: m.community_member?.community_role?.name || 'Miembro Comunidad',
        doc: m.community_member?.person?.document_id || '',
    }));

    const personnel = (data.concertation_person || []).map(p => {
        const r = p.person?.person_role;
        const roleName = r ? (Array.isArray(r) ? r[0]?.name : r.name) : 'Personal Operativo';
        return {
            name: `${p.person?.first_name || ''} ${p.person?.last_name || ''}`.trim(),
            role: roleName || 'Personal Operativo',
            doc: p.person?.document_id || '',
        };
    });

    const rows = [...commMembers, ...personnel];
    // Pad with 3 blank rows for walk-ins
    for (let i = 0; i < 3; i++) rows.push({ name: '', role: '', doc: '' });

    if (yPos + 30 > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
    }

    // Section header
    doc.setFillColor(30, 64, 115);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.rect(14, yPos, pageWidth - 28, 6, 'F');
    doc.text('PARTICIPANTES Y FIRMAS', 16, yPos + 4.2);
    yPos += 9;

    doc.setTextColor(0, 0, 0);

    autoTable(doc, {
        startY: yPos,
        head: [['Nombre Completo', 'Rol / Cargo', 'C.C. / Firma']],
        body: rows.map(r => [r.name, r.role, r.doc ? `C.C. ${r.doc}` : '']),
        theme: 'grid',
        styles: { fontSize: 8.5, valign: 'middle', minCellHeight: 18 },
        headStyles: { fillColor: [241, 245, 249], textColor: [30, 64, 115], fontStyle: 'bold', fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 65 },
            1: { cellWidth: 55 },
            2: { cellWidth: 'auto' },
        },
        margin: { left: 14, right: 14 },
    });

    // ── FOOTER ────────────────────────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.text(
            `Generado: ${new Date().toLocaleString('es-CO')}  |  Página ${i} de ${totalPages}  |  Molinos Guajira`,
            pageWidth / 2,
            pageHeight - 6,
            { align: 'center' }
        );
        doc.setDrawColor(200, 200, 200);
        doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
    }

    // Return as Uint8Array
    return doc.output('arraybuffer');
}

export const ConcertationPDF = {
    /**
     * Generates the summary PDF only (no Drive attachment).
     * Used as a fallback when there's no act_url.
     */
    generate(data) {
        const summaryBytes = buildSummaryPdfBytes(data);
        const filename = `Acta_${data.code || data.concertation_id || 'Borrador'}.pdf`;
        const blob = new Blob([summaryBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Main entry point.
     * - Descarga el resumen del acta como PDF.
     * - Si hay un URL de Drive configurado, abre el PDF firmado en una pestaña nueva.
     *
     * NOTE: La fusión de PDFs de Google Drive en el navegador está bloqueada por
     * CORS independientemente de la configuración de compartir del archivo.
     * Google Drive no envía headers Access-Control-Allow-Origin al navegador.
     * El enfoque correcto sin servidor es descargar el resumen + abrir Drive en pestaña.
     */
    async generateCombined(data) {
        const filename = `Acta_Resumen_${data.code || data.concertation_id || 'Borrador'}.pdf`;

        try {
            // 1. Generar y descargar el resumen PDF
            const summaryBytes = buildSummaryPdfBytes(data);
            const blob = new Blob([summaryBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            // 2. Si hay URL de Drive, abrir en pestaña nueva (pequeño delay para que el
            //    navegador no bloquee las dos acciones como popups simultáneos)
            if (data.act_url) {
                setTimeout(() => {
                    window.open(data.act_url, '_blank', 'noopener,noreferrer');
                }, 400);
            }

        } catch (err) {
            console.error('Error generando el acta:', err);
            alert('Ocurrió un error al generar el PDF del acta. Revise la consola para más detalles.');
        }
    }
};
