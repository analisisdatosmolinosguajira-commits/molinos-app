import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const ConcertationPDF = {
    generate(data) {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // --- HEADER ---
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('ACTA DE CONCERTACIÓN COMUNITARIA', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('MOLINOS - SISTEMA DE GESTIÓN', pageWidth / 2, 26, { align: 'center' });

        let yPos = 40;

        // --- GENERAL INFO TABLE ---
        const info = [
            ['Comunidad:', data.community?.name || '________________________'],
            ['Fecha:', data.meeting_date ? new Date(data.meeting_date).toLocaleDateString() : '____/____/______'],
            ['Diagnóstico:', data.diagnosis?.code || 'N/A'],
            ['Estado:', (data.status || 'PENDIENTE').toUpperCase()]
        ];

        autoTable(doc, {
            startY: yPos,
            body: info,
            theme: 'plain', // minimal
            styles: { fontSize: 10, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
        });

        yPos = doc.lastAutoTable.finalY + 10;

        // --- SECTIONS ---
        const sections = [
            { title: 'Condiciones y Acuerdos', content: data.conditions },
            { title: 'Notas Generales', content: data.notes },
            { title: 'Conclusiones de Cierre', content: data.closing_note }
        ];

        sections.forEach(section => {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setFillColor(240, 240, 240); // Light gray
            doc.rect(14, yPos, pageWidth - 28, 7, 'F');
            doc.text(section.title, 16, yPos + 5);
            yPos += 10;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            const text = section.content || ' \n \n \n '; // Space for manual filling if empty
            // If empty, draw lines? Or just empty space. User asked for "space".
            // Let's draw lines if empty.
            if (!section.content) {
                for (let i = 0; i < 3; i++) {
                    doc.line(14, yPos + (i * 8) + 5, pageWidth - 14, yPos + (i * 8) + 5);
                }
                yPos += 30;
            } else {
                const splitText = doc.splitTextToSize(text, pageWidth - 28);
                doc.text(splitText, 14, yPos);
                yPos += (splitText.length * 5) + 5;
            }
            yPos += 5; // Margin
        });

        // --- PARTICIPANTS & SIGNATURES ---

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 240);
        doc.rect(14, yPos, pageWidth - 28, 7, 'F');
        doc.text('Participantes y Firmas', 16, yPos + 5);
        yPos += 10;

        // Prepare data
        // Community
        const commMembers = (data.concertation_community_member || []).map(m => ({
            name: `${m.community_member?.person?.first_name || ''} ${m.community_member?.person?.last_name || ''}`.trim(),
            role: m.community_member?.community_role?.name || 'Miembro',
            id: m.community_member?.person?.document_id || '' // Assuming document_id on person
        }));

        // Personnel
        const personnel = (data.concertation_person || []).map(p => {
            // Safe role extraction using the logic we just fixed
            let rName = 'Personal';
            const r = p.person?.person_role;
            if (r) {
                if (Array.isArray(r)) rName = r[0]?.name;
                else rName = r.name;
            }

            return {
                name: `${p.person?.first_name || ''} ${p.person?.last_name || ''}`.trim(),
                role: rName || 'Personal',
                id: p.person?.document_id || ''
            };
        });

        const rows = [...commMembers, ...personnel];

        // Ensure at least some blank rows if empty, or just blank rows for manual addition
        // User said "leaves space for signature".
        // Let's render the table with enough height for signatures.

        // If we have rows, render them.
        // If we want "extra" rows for manual additions, we can add them.
        // Let's add 3 empty rows by default for walk-ins.
        for (let i = 0; i < 3; i++) {
            rows.push({ name: '', role: '', id: '' });
        }

        autoTable(doc, {
            startY: yPos,
            head: [['Nombre', 'Rol', 'Firma y Cédula']],
            body: rows.map(r => [
                r.name,
                r.role,
                ` \n \nC.C. ${r.id || '__________________'}` // Pre-fill ID or blank line
            ]),
            theme: 'grid',
            styles: {
                fontSize: 10,
                valign: 'middle',
                minCellHeight: 25 // Enough format for signature
            },
            columnStyles: {
                0: { cellWidth: 60 },
                1: { cellWidth: 50 },
                2: { cellWidth: 'auto' }
            },
            didDrawPage: (d) => {
                // Footer
                doc.setFontSize(8);
                doc.text(`Generado: ${new Date().toLocaleString()}`, 14, pageHeight - 10);
            }
        });

        const filename = `Acta_${data.concertation_id || 'Borrador'}.pdf`;
        doc.save(filename);
    }
};
